-- Outlet Lounge — admin panel (phase 4)
--   • staff invitations: the owner's email is pre-registered, the account is linked on first sign-in
--   • orders: staff may only edit the note and tracking number directly; status goes through set_order_status()
--   • activity log: products and stock changes are recorded by triggers (who, what, when)
--   • admin_overview(): the dashboard numbers in one call
--   • admin_save_product(): product + sizes + photos saved in one transaction

-- ------------------------------------------------------- staff invitations
-- An invite is a row (email → name + role). When an auth user with that email appears
-- (Supabase "Invite user" or the admin panel), the trigger creates the matching staff row.
create table public.staff_invites (
  email      text primary key check (email = lower(email)),
  name       text not null,
  role       public.staff_role not null default 'manager',
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;
create policy staff_invites_owner on public.staff_invites for all
  using (public.is_owner()) with check (public.is_owner());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invite public.staff_invites%rowtype;
begin
  select * into v_invite from public.staff_invites where email = lower(new.email);
  if found then
    insert into public.staff (user_id, name, role) values (new.id, v_invite.name, v_invite.role)
      on conflict (user_id) do nothing;
    delete from public.staff_invites where email = v_invite.email;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------ orders: narrow direct edits
-- A row-level policy cannot limit columns, so privileges do: staff can write the internal
-- note and the tracking number; status changes (stock return, history, Telegram) only
-- through set_order_status(). Totals, items and customer data are never editable by hand.
revoke update on public.orders from anon, authenticated;
grant update (staff_note, tracking_no) on public.orders to authenticated;

-- --------------------------------------------------------- activity log
create or replace function public.log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old   jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new   jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_row   jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_diff  jsonb := '{}'::jsonb;
  v_key   text;
  v_actor text;
begin
  -- changes made by the server itself (placing an order takes stock) are not staff actions
  if auth.uid() is null then return coalesce(new, old); end if;
  select name into v_actor from public.staff where user_id = auth.uid();

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and v_old -> v_key is distinct from v_new -> v_key then
        v_diff := v_diff || jsonb_build_object(
          v_key, jsonb_build_array(left(v_old ->> v_key, 200), left(v_new ->> v_key, 200)));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then return new; end if;
  end if;

  insert into public.activity_log (actor, action, entity, entity_id, diff)
  values (
    coalesce(v_actor, 'staff'),
    lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    jsonb_build_object(
      'changes', case when tg_op = 'UPDATE' then v_diff else '{}'::jsonb end,
      'label', coalesce(v_row ->> 'name', v_row ->> 'slug', 'EU ' || (v_row ->> 'eu')),
      'product_id', v_row ->> 'product_id',
      'eu', v_row ->> 'eu',
      'stock', v_row ->> 'stock'));
  return coalesce(new, old);
end $$;

create trigger products_log after insert or update or delete on public.products
  for each row execute function public.log_change();
create trigger product_sizes_log after insert or update or delete on public.product_sizes
  for each row execute function public.log_change();

-- ------------------------------------------------------------ dashboard
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_day   timestamptz := date_trunc('day', timezone('Asia/Tashkent', now())) at time zone 'Asia/Tashkent';
  v_out   jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'by_status', coalesce((select jsonb_object_agg(status, c) from
        (select status, count(*) c from public.orders group by status) s), '{}'::jsonb),
    'today_orders',  (select count(*) from public.orders where created_at >= v_day and status <> 'cancelled'),
    'today_revenue', (select coalesce(sum(total), 0) from public.orders where created_at >= v_day and status <> 'cancelled'),
    'week_orders',   (select count(*) from public.orders where created_at >= v_day - interval '6 days' and status <> 'cancelled'),
    'week_revenue',  (select coalesce(sum(total), 0) from public.orders where created_at >= v_day - interval '6 days' and status <> 'cancelled'),
    'notify_waiting', (select count(*) from public.notify_requests where status = 'new'),
    'low_stock', coalesce((select jsonb_agg(x) from (
        select p.id as product_id, p.slug, p.name, s.eu, s.stock
          from public.product_sizes s join public.products p on p.id = s.product_id
         where p.is_active and s.stock <= 1
         order by s.stock, p.name, s.eu
         limit 30) x), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

-- ---------------------------------------------------------- save product
-- p: { id?, slug, brand_id | brand_name, name, colorway, sku, category, gender, price, old_price,
--      description_ru/uz/en, tags[], is_new, is_featured, is_active, seo_title, seo_description,
--      sizes: [{ eu, us, cm, stock? }],      -- stock omitted/null = keep the current quantity
--      images: [{ path }] }                  -- order = display order, first = main photo
-- Sizes missing from the list are removed, photos missing from the list are removed (the browser
-- deletes the files afterwards). Returns { id, slug }.
create or replace function public.admin_save_product(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := nullif(p ->> 'id', '')::uuid;
  v_brand    uuid := nullif(p ->> 'brand_id', '')::uuid;
  v_bname    text := nullif(btrim(p ->> 'brand_name'), '');
  v_slug     text := lower(btrim(p ->> 'slug'));
  v_name     text := nullif(btrim(p ->> 'name'), '');
  v_price    integer := (p ->> 'price')::integer;
  v_old      integer := nullif(p ->> 'old_price', '')::integer;
  v_tags     text[];
  v_size     jsonb;
  v_eu       numeric;
  v_i        integer := 0;
  v_img      jsonb;
  v_keep_eu  numeric[] := '{}';
  v_keep_img text[]   := '{}';
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if v_name is null or length(v_name) > 160 then raise exception 'invalid:name'; end if;
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 120 then
    raise exception 'invalid:slug';
  end if;
  if v_price is null or v_price < 0 then raise exception 'invalid:price'; end if;
  if v_old is not null and v_old < v_price then raise exception 'invalid:old_price'; end if;
  if nullif(btrim(p ->> 'category'), '') is null then raise exception 'invalid:category'; end if;
  if coalesce(p ->> 'gender', 'unisex') not in ('men', 'women', 'kids', 'unisex') then
    raise exception 'invalid:gender';
  end if;

  if v_brand is null and v_bname is not null then
    select id into v_brand from public.brands where lower(name) = lower(v_bname);
    if v_brand is null then
      insert into public.brands (name, slug, sort)
      values (v_bname, regexp_replace(lower(v_bname), '[^a-z0-9]+', '-', 'g'),
              (select coalesce(max(sort), 0) + 1 from public.brands))
      returning id into v_brand;
    end if;
  end if;
  if v_brand is null then raise exception 'invalid:brand'; end if;

  select coalesce(array_agg(btrim(t)) filter (where btrim(t) <> ''), '{}')
    into v_tags from jsonb_array_elements_text(coalesce(p -> 'tags', '[]'::jsonb)) t;

  if v_id is null or not exists (select 1 from public.products where id = v_id) then
    insert into public.products (id, slug, brand_id, name, colorway, sku, category, gender, price, old_price,
        description_ru, description_uz, description_en, tags, is_new, is_featured, is_active,
        seo_title, seo_description)
    values (coalesce(v_id, gen_random_uuid()), v_slug, v_brand, v_name,
        nullif(btrim(p ->> 'colorway'), ''), nullif(btrim(p ->> 'sku'), ''),
        btrim(p ->> 'category'), coalesce(p ->> 'gender', 'unisex'), v_price, v_old,
        nullif(p ->> 'description_ru', ''), nullif(p ->> 'description_uz', ''), nullif(p ->> 'description_en', ''),
        v_tags, coalesce((p ->> 'is_new')::boolean, false), coalesce((p ->> 'is_featured')::boolean, false),
        coalesce((p ->> 'is_active')::boolean, true),
        nullif(btrim(p ->> 'seo_title'), ''), nullif(btrim(p ->> 'seo_description'), ''))
    returning id into v_id;
  else
    update public.products set
        slug = v_slug, brand_id = v_brand, name = v_name,
        colorway = nullif(btrim(p ->> 'colorway'), ''), sku = nullif(btrim(p ->> 'sku'), ''),
        category = btrim(p ->> 'category'), gender = coalesce(p ->> 'gender', 'unisex'),
        price = v_price, old_price = v_old,
        description_ru = nullif(p ->> 'description_ru', ''), description_uz = nullif(p ->> 'description_uz', ''),
        description_en = nullif(p ->> 'description_en', ''), tags = v_tags,
        is_new = coalesce((p ->> 'is_new')::boolean, false), is_featured = coalesce((p ->> 'is_featured')::boolean, false),
        is_active = coalesce((p ->> 'is_active')::boolean, true),
        seo_title = nullif(btrim(p ->> 'seo_title'), ''), seo_description = nullif(btrim(p ->> 'seo_description'), '')
      where id = v_id;
  end if;

  -- sizes: update in place (order history keeps pointing at them), add new, drop removed
  for v_size in select * from jsonb_array_elements(coalesce(p -> 'sizes', '[]'::jsonb)) loop
    v_eu := (v_size ->> 'eu')::numeric;
    if v_eu is null or v_eu < 16 or v_eu > 60 then raise exception 'invalid:size'; end if;
    if nullif(v_size ->> 'stock', '') is not null and (v_size ->> 'stock')::integer < 0 then
      raise exception 'invalid:stock';
    end if;
    v_keep_eu := v_keep_eu || v_eu;
    insert into public.product_sizes (product_id, eu, us, cm, stock)
    values (v_id, v_eu, nullif(v_size ->> 'us', '')::numeric, nullif(v_size ->> 'cm', '')::numeric,
            coalesce(nullif(v_size ->> 'stock', '')::integer, 0))
    on conflict (product_id, eu) do update set
      us = excluded.us, cm = excluded.cm,
      stock = case when nullif(v_size ->> 'stock', '') is null then public.product_sizes.stock else excluded.stock end;
  end loop;
  delete from public.product_sizes where product_id = v_id and not (eu = any (v_keep_eu));

  -- photos: the given order is the display order, the first one is the main photo
  for v_img in select * from jsonb_array_elements(coalesce(p -> 'images', '[]'::jsonb)) loop
    if nullif(btrim(v_img ->> 'path'), '') is null then continue; end if;
    v_keep_img := v_keep_img || (v_img ->> 'path');
    if exists (select 1 from public.product_images where product_id = v_id and path = v_img ->> 'path') then
      update public.product_images set sort = v_i, is_main = (v_i = 0)
        where product_id = v_id and path = v_img ->> 'path';
    else
      insert into public.product_images (product_id, path, sort, is_main)
      values (v_id, v_img ->> 'path', v_i, v_i = 0);
    end if;
    v_i := v_i + 1;
  end loop;
  delete from public.product_images where product_id = v_id and not (path = any (v_keep_img));

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end $$;

-- function privileges
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;
