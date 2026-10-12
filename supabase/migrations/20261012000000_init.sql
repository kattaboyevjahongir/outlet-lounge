-- Outlet Lounge — initial schema
-- Tables, row level security, order functions, storage bucket.
-- Apply with:  npx supabase db push   (after `supabase link`)

-- ---------------------------------------------------------------- types
create type public.order_status as enum
  ('new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'no_answer');
create type public.staff_role as enum ('owner', 'manager');

-- ------------------------------------------------------- shared helpers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- staff
create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       public.staff_role not null default 'manager',
  is_active  boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- security definer so policies can read `staff` without recursing into its own RLS
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and is_active)
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff
                 where user_id = auth.uid() and is_active and role = 'owner')
$$;

-- ------------------------------------------------------------- catalog
create table public.brands (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  slug      text not null unique,
  logo_path text,
  sort      int  not null default 0
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  brand_id        uuid not null references public.brands (id),
  name            text not null,
  colorway        text,
  sku             text,
  category        text not null,
  gender          text not null default 'unisex'
                  check (gender in ('men', 'women', 'kids', 'unisex')),
  price           integer not null check (price >= 0),
  old_price       integer check (old_price is null or old_price >= price),
  description_ru  text,
  description_uz  text,
  description_en  text,
  tags            text[] not null default '{}',
  is_new          boolean not null default false,
  is_featured     boolean not null default false,
  is_active       boolean not null default true,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index products_active_idx on public.products (is_active, created_at desc);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null,          -- storage path, or a full https URL for placeholders
  sort       int  not null default 0,
  is_main    boolean not null default false
);
create index product_images_product_idx on public.product_images (product_id, sort);

create table public.product_sizes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  eu         numeric(4, 1) not null,
  us         numeric(4, 1),
  cm         numeric(4, 1),
  stock      integer not null default 0 check (stock >= 0),
  unique (product_id, eu)
);

-- -------------------------------------------------------------- promos
create table public.promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  type            text not null check (type in ('percent', 'fixed')),
  value           integer not null check (value > 0),
  min_order       integer not null default 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  usage_limit     integer,
  per_phone_limit integer,
  used_count      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- -------------------------------------------------------------- orders
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  status          public.order_status not null default 'new',
  customer_name   text not null,
  phone           text not null,
  telegram        text,
  contact_pref    text not null default 'call' check (contact_pref in ('call', 'telegram')),
  delivery_method text not null,
  region          text,
  city            text,
  address         text,
  landmark        text,
  payment_method  text not null,
  comment         text,
  subtotal        integer not null,
  discount        integer not null default 0,
  delivery_fee    integer not null default 0,
  total           integer not null,
  promo_code_id   uuid references public.promo_codes (id),
  lang            text,
  utm             jsonb,
  tg_chat_id      bigint,
  tg_message_id   bigint,
  tracking_no     text,
  staff_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_phone_idx   on public.orders (phone);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  size_id       uuid references public.product_sizes (id) on delete set null,
  brand_snapshot text,
  name_snapshot  text not null,
  size_eu        numeric(4, 1) not null,
  qty            integer not null check (qty > 0),
  unit_price     integer not null
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  note        text,
  actor       text,                   -- staff name, "telegram:<user>" or "system"
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- ------------------------------------------------------- misc tables
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table public.notify_requests (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  size_id    uuid references public.product_sizes (id) on delete set null,
  phone      text,
  telegram   text,
  status     text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text,
  action     text not null,
  entity     text,
  entity_id  text,
  diff       jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ RLS
alter table public.staff           enable row level security;
alter table public.brands          enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.product_sizes   enable row level security;
alter table public.promo_codes     enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.order_events    enable row level security;
alter table public.settings        enable row level security;
alter table public.notify_requests enable row level security;
alter table public.activity_log    enable row level security;

-- staff: see yourself, owners see and manage everyone
create policy staff_select on public.staff for select
  using (user_id = auth.uid() or public.is_owner());
create policy staff_write on public.staff for all
  using (public.is_owner()) with check (public.is_owner());

-- brands: public read, staff write
create policy brands_read  on public.brands for select using (true);
create policy brands_write on public.brands for all
  using (public.is_staff()) with check (public.is_staff());

-- products: visitors see active ones, staff see all; owners delete
create policy products_read on public.products for select
  using (is_active or public.is_staff());
create policy products_insert on public.products for insert with check (public.is_staff());
create policy products_update on public.products for update
  using (public.is_staff()) with check (public.is_staff());
create policy products_delete on public.products for delete using (public.is_owner());

-- images / sizes follow product visibility (the subquery is filtered by products RLS)
create policy images_read on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy images_write on public.product_images for all
  using (public.is_staff()) with check (public.is_staff());
create policy sizes_read on public.product_sizes for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy sizes_write on public.product_sizes for all
  using (public.is_staff()) with check (public.is_staff());

-- promo codes: owner only (visitors never read them; the server checks codes)
create policy promo_owner on public.promo_codes for all
  using (public.is_owner()) with check (public.is_owner());

-- orders: staff read/update; inserts happen only through place_order() (service role)
create policy orders_read   on public.orders for select using (public.is_staff());
create policy orders_update on public.orders for update
  using (public.is_staff()) with check (public.is_staff());
create policy order_items_read  on public.order_items  for select using (public.is_staff());
create policy order_events_read on public.order_events for select using (public.is_staff());

-- settings: public keys readable by all; private ones by owner; owner writes
create policy settings_read on public.settings for select
  using (is_public or public.is_owner());
create policy settings_write on public.settings for all
  using (public.is_owner()) with check (public.is_owner());

create policy notify_read   on public.notify_requests for select using (public.is_staff());
create policy notify_update on public.notify_requests for update
  using (public.is_staff()) with check (public.is_staff());

create policy activity_read on public.activity_log for select using (public.is_owner());

-- ------------------------------------------------------- place_order()
-- Called only by the server (service role). One transaction: price from the
-- database, stock check + decrease, promo, order + items + first event.
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer  jsonb := coalesce(p_payload -> 'customer', '{}'::jsonb);
  v_delivery  jsonb := coalesce(p_payload -> 'delivery', '{}'::jsonb);
  v_items     jsonb := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_name      text  := nullif(btrim(v_customer ->> 'name'), '');
  v_phone     text  := nullif(btrim(v_customer ->> 'phone'), '');
  v_method    text  := nullif(btrim(v_delivery ->> 'method'), '');
  v_payment   text  := nullif(btrim(p_payload ->> 'payment'), '');
  v_pref      text  := coalesce(nullif(v_customer ->> 'contact_pref', ''), 'call');
  v_item      jsonb;
  v_prod      public.products%rowtype;
  v_size      public.product_sizes%rowtype;
  v_qty       integer;
  v_subtotal  integer := 0;
  v_discount  integer := 0;
  v_fee       integer := 0;
  v_total     integer;
  v_free_from integer;
  v_promo     public.promo_codes%rowtype;
  v_promo_in  text := upper(nullif(btrim(p_payload ->> 'promo_code'), ''));
  v_order_id  uuid;
  v_number    text;
  v_tries     integer := 0;
  v_lines     jsonb := '[]'::jsonb;
  v_merged    jsonb := '{}'::jsonb;
  v_key       text;
  v_row       record;
begin
  -- ---- basic validation (the API validates too; this is the last line of defence)
  if v_name is null or length(v_name) > 120 then raise exception 'invalid:name'; end if;
  if v_phone is null or v_phone !~ '^\+?[0-9]{9,15}$' then raise exception 'invalid:phone'; end if;
  if v_method is null then raise exception 'invalid:delivery'; end if;
  if v_payment is null then raise exception 'invalid:payment'; end if;
  if v_pref not in ('call', 'telegram') then raise exception 'invalid:contact_pref'; end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) not between 1 and 20 then
    raise exception 'invalid:items';
  end if;

  -- ---- merge duplicate slug+size lines
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := coalesce((v_item ->> 'qty')::integer, 0);
    if v_qty < 1 or v_qty > 10 then raise exception 'invalid:qty'; end if;
    v_key := (v_item ->> 'slug') || '|' || (v_item ->> 'size');
    v_merged := jsonb_set(
      v_merged, array[v_key],
      to_jsonb(coalesce((v_merged ->> v_key)::integer, 0) + v_qty));
  end loop;

  -- ---- price every line from the database and take stock
  for v_row in select key as k, value::integer as qty from jsonb_each_text(v_merged) loop
    select * into v_prod from public.products
      where slug = split_part(v_row.k, '|', 1) and is_active;
    if not found then raise exception 'unavailable:%', split_part(v_row.k, '|', 1); end if;

    select * into v_size from public.product_sizes
      where product_id = v_prod.id and eu = split_part(v_row.k, '|', 2)::numeric;
    if not found then
      raise exception 'unavailable:%:%', v_prod.slug, split_part(v_row.k, '|', 2);
    end if;

    -- atomic: only succeeds if enough stock is left (row lock serialises buyers)
    update public.product_sizes set stock = stock - v_row.qty
      where id = v_size.id and stock >= v_row.qty;
    if not found then
      raise exception 'out_of_stock:%:%', v_prod.slug, v_size.eu;
    end if;

    v_subtotal := v_subtotal + v_prod.price * v_row.qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'size_id', v_size.id,
      'brand', (select name from public.brands where id = v_prod.brand_id),
      'name', v_prod.name, 'size_eu', v_size.eu,
      'qty', v_row.qty, 'unit_price', v_prod.price));
  end loop;

  -- ---- promo code
  if v_promo_in is not null then
    select * into v_promo from public.promo_codes
      where code = v_promo_in and is_active
        and (starts_at is null or starts_at <= now())
        and (ends_at   is null or ends_at   >= now())
      for update;
    if not found
       or v_subtotal < v_promo.min_order
       or (v_promo.usage_limit is not null and v_promo.used_count >= v_promo.usage_limit)
       or (v_promo.per_phone_limit is not null and
           (select count(*) from public.orders o
             where o.phone = v_phone and o.promo_code_id = v_promo.id
               and o.status <> 'cancelled') >= v_promo.per_phone_limit)
    then
      raise exception 'invalid:promo';
    end if;
    v_discount := case v_promo.type
      when 'percent' then floor(v_subtotal * least(v_promo.value, 100) / 100.0)::integer
      else least(v_promo.value, v_subtotal) end;
    update public.promo_codes set used_count = used_count + 1 where id = v_promo.id;
  end if;

  -- ---- delivery fee (methods + free threshold live in settings 'delivery')
  select (m ->> 'fee')::integer into v_fee
    from public.settings s, jsonb_array_elements(s.value -> 'methods') m
    where s.key = 'delivery' and m ->> 'id' = v_method;
  if not found then raise exception 'invalid:delivery'; end if;
  select nullif(s.value ->> 'free_threshold', '')::integer into v_free_from
    from public.settings s where s.key = 'delivery';
  if v_free_from is not null and (v_subtotal - v_discount) >= v_free_from then v_fee := 0; end if;

  v_total := v_subtotal - v_discount + v_fee;

  -- ---- order number OL-YYMMDD-NNNN (random suffix, retried on collision)
  loop
    v_number := 'OL-' || to_char(timezone('Asia/Tashkent', now()), 'YYMMDD')
                || '-' || lpad(floor(random() * 10000)::integer::text, 4, '0');
    exit when not exists (select 1 from public.orders where number = v_number);
    v_tries := v_tries + 1;
    if v_tries > 10 then raise exception 'order_number_failed'; end if;
  end loop;

  insert into public.orders (
    number, customer_name, phone, telegram, contact_pref,
    delivery_method, region, city, address, landmark,
    payment_method, comment, subtotal, discount, delivery_fee, total,
    promo_code_id, lang, utm)
  values (
    v_number, v_name, v_phone, nullif(btrim(v_customer ->> 'telegram'), ''), v_pref,
    v_method, nullif(btrim(v_delivery ->> 'region'), ''), nullif(btrim(v_delivery ->> 'city'), ''),
    nullif(btrim(v_delivery ->> 'address'), ''), nullif(btrim(v_delivery ->> 'landmark'), ''),
    v_payment, left(nullif(btrim(p_payload ->> 'comment'), ''), 500),
    v_subtotal, v_discount, v_fee, v_total,
    case when v_promo_in is not null then v_promo.id end,
    left(p_payload ->> 'lang', 5), p_payload -> 'utm')
  returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, size_id, brand_snapshot, name_snapshot, size_eu, qty, unit_price)
  select v_order_id, (l ->> 'product_id')::uuid, (l ->> 'size_id')::uuid,
         l ->> 'brand', l ->> 'name', (l ->> 'size_eu')::numeric,
         (l ->> 'qty')::integer, (l ->> 'unit_price')::integer
    from jsonb_array_elements(v_lines) l;

  insert into public.order_events (order_id, from_status, to_status, note, actor)
  values (v_order_id, null, 'new', 'Order placed on the website', 'system');

  return jsonb_build_object(
    'order_id', v_order_id, 'number', v_number,
    'subtotal', v_subtotal, 'discount', v_discount,
    'delivery_fee', v_fee, 'total', v_total, 'items', v_lines);
end $$;

-- ---------------------------------------------------- set_order_status()
-- Staff (via the admin panel) or the server (Telegram webhook, service role).
-- Cancelling returns the stock and one promo use; cancelled orders are final.
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status   public.order_status,
  p_note     text default null,
  p_actor    text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_by_server boolean := coalesce(auth.role(), '') = 'service_role';
  v_actor text;
begin
  if not v_by_server and not public.is_staff() then
    raise exception 'forbidden';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_order.status = 'cancelled' then raise exception 'order_cancelled'; end if;
  if v_order.status = p_status then
    return jsonb_build_object('order_id', v_order.id, 'number', v_order.number, 'status', v_order.status);
  end if;

  v_actor := coalesce(
    p_actor,
    (select name from public.staff where user_id = auth.uid()),
    'system');

  if p_status = 'cancelled' then
    update public.product_sizes ps set stock = ps.stock + oi.qty
      from public.order_items oi
      where oi.order_id = v_order.id and oi.size_id = ps.id;
    if v_order.promo_code_id is not null then
      update public.promo_codes set used_count = greatest(used_count - 1, 0)
        where id = v_order.promo_code_id;
    end if;
  end if;

  update public.orders set status = p_status where id = v_order.id;
  insert into public.order_events (order_id, from_status, to_status, note, actor)
  values (v_order.id, v_order.status, p_status, p_note, v_actor);

  return jsonb_build_object('order_id', v_order.id, 'number', v_order.number, 'status', p_status);
end $$;

-- function privileges: nothing is callable by visitors unless stated
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;

revoke all on function public.set_order_status(uuid, public.order_status, text, text)
  from public, anon;
grant execute on function public.set_order_status(uuid, public.order_status, text, text)
  to authenticated, service_role;

-- ------------------------------------------------------ storage bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are public"
  on storage.objects for select using (bucket_id = 'product-images');
create policy "staff upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());
create policy "staff update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff());
create policy "staff delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());
