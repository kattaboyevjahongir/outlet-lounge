-- Outlet Lounge — from a sneaker shop to a men's clothing, shoes and accessories store.
--   • categories are a table the owner edits (department + names in RU/UZ/EN + size system)
--   • products: colour, style code (links colours of one item), origin, material, fit, model info; no gender
--   • sizes are text labels (S, M, 48, W32, EU 42, ONE SIZE) with a display order, and each size can be
--     ordered from abroad when nothing is left here
--   • order lines remember how they are fulfilled: from the stock in Tashkent ('stock') or ordered abroad ('order');
--     cancelling returns stock only for the first kind
--   • the 18 placeholder sneakers from the first seed are removed (the new seed adds menswear placeholders)

-- ------------------------------------------------------------ categories
create table public.categories (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  department  text not null check (department in ('clothing', 'shoes', 'accessories')),
  name_ru     text not null,
  name_uz     text not null,
  name_en     text not null,
  size_system text not null default 'letter' check (size_system in ('letter', 'ru', 'waist', 'shoes', 'belt', 'one')),
  image_path  text,
  sort        int  not null default 0,
  is_active   boolean not null default true
);
alter table public.categories enable row level security;
create policy categories_read on public.categories for select using (is_active or public.is_staff());
create policy categories_write on public.categories for all
  using (public.is_owner()) with check (public.is_owner());

insert into public.categories (slug, department, name_ru, name_uz, name_en, size_system, sort) values
  ('t-shirts',           'clothing',    'Футболки',             'Futbolkalar',              'T-shirts',               'letter', 1),
  ('polos',              'clothing',    'Поло',                 'Polo',                     'Polos',                  'letter', 2),
  ('shirts',             'clothing',    'Рубашки',              'Koʻylaklar',               'Shirts',                 'letter', 3),
  ('knitwear',           'clothing',    'Трикотаж',             'Trikotaj',                 'Knitwear',               'letter', 4),
  ('hoodies-sweatshirts','clothing',    'Худи и свитшоты',      'Xudi va svitshotlar',      'Hoodies & sweatshirts',  'letter', 5),
  ('jackets-coats',      'clothing',    'Куртки и пальто',      'Kurtka va paltolar',       'Jackets & coats',        'letter', 6),
  ('suits-blazers',      'clothing',    'Костюмы и пиджаки',    'Kostyum va pidjaklar',     'Suits & blazers',        'ru',     7),
  ('trousers',           'clothing',    'Брюки',                'Shimlar',                  'Trousers',               'waist',  8),
  ('jeans',              'clothing',    'Джинсы',               'Jinsilar',                 'Jeans',                  'waist',  9),
  ('shorts',             'clothing',    'Шорты',                'Shortilar',                'Shorts',                 'letter', 10),
  ('underwear-socks',    'clothing',    'Бельё и носки',        'Ichki kiyim va paypoqlar', 'Underwear & socks',      'letter', 11),
  ('sneakers',           'shoes',       'Кроссовки',            'Krossovkalar',             'Sneakers',               'shoes',  12),
  ('classic-shoes',      'shoes',       'Классическая обувь',   'Klassik poyabzal',         'Classic shoes',          'shoes',  13),
  ('boots',              'shoes',       'Ботинки',              'Botinkalar',               'Boots',                  'shoes',  14),
  ('belts',              'accessories', 'Ремни',                'Kamarlar',                 'Belts',                  'belt',   15),
  ('bags',               'accessories', 'Сумки и рюкзаки',      'Sumka va ryukzaklar',      'Bags & backpacks',       'one',    16),
  ('caps-hats',          'accessories', 'Кепки и шапки',        'Kepka va shapkalar',       'Caps & hats',            'one',    17),
  ('wallets',            'accessories', 'Кошельки',             'Hamyonlar',                'Wallets',                'one',    18),
  ('ties',               'accessories', 'Галстуки',             'Galstuklar',               'Ties',                   'one',    19),
  ('sunglasses',         'accessories', 'Очки',                 'Koʻzoynaklar',             'Sunglasses',             'one',    20);

-- ---------------------------------------------------------------- products
-- products that already exist (if any) were sneakers: keep them, in the sneakers category
update public.products set category = 'sneakers'
  where category not in (select slug from public.categories);

alter table public.products
  add constraint products_category_fk foreign key (category)
    references public.categories (slug) on update cascade;

alter table public.products rename column colorway to color;
alter table public.products drop column gender;
alter table public.products
  add column color_hex   text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  add column color_group text check (color_group is null or color_group in
    ('black', 'white', 'grey', 'navy', 'blue', 'green', 'beige', 'brown', 'red', 'other')),
  add column style_code  text check (style_code is null or style_code ~ '^[A-Za-z0-9._-]{1,40}$'),
  add column origin      text check (origin is null or origin ~ '^[A-Z]{2}$'),
  add column material    text check (material is null or char_length(material) <= 160),
  add column fit         text check (fit is null or fit in ('slim', 'regular', 'relaxed', 'oversized')),
  add column model_info  text check (model_info is null or char_length(model_info) <= 160),
  add column order_lead  text check (order_lead is null or order_lead ~ '^[0-9]{1,3}([–-][0-9]{1,3})?$');
create index products_style_idx on public.products (style_code) where style_code is not null;
create index products_category_idx on public.products (category) where is_active;

-- ------------------------------------------------------------------- sizes
alter table public.product_sizes
  add column label     text,
  add column sort      int     not null default 0,
  add column orderable boolean not null default true;
update public.product_sizes set label = trim_scale(eu)::text,
                                orderable = false;          -- sizes that existed before could not be ordered
alter table public.product_sizes alter column label set not null;
alter table public.product_sizes
  add constraint product_sizes_label_format check (label ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,11}$');
alter table public.product_sizes drop column eu, drop column us, drop column cm;   -- also drops unique (product_id, eu)
alter table public.product_sizes add constraint product_sizes_label_unique unique (product_id, label);

-- ------------------------------------------------------------------ orders
alter table public.order_items rename column size_eu to size_label;
alter table public.order_items alter column size_label type text using trim_scale(size_label)::text;
alter table public.order_items
  add column fulfilment text not null default 'stock' check (fulfilment in ('stock', 'order'));

-- -------------------------------------------------- remove the sneaker placeholders
delete from public.products where slug in (
  'air-max-1-sunset', 'air-force-1-07-triple-white', 'air-jordan-1-mid-chicago-toe', 'air-jordan-1-low-shattered',
  '247-olive-suede', 'x-90-pink-haze', 'chuck-70-hi-cherry', 'old-skool-burgundy', 'kyrie-7-onyx',
  'air-force-1-react-court', 'air-jordan-12-retro-gym-red', 'free-rn-flyknit-crimson', 'superrep-go-volt',
  'air-max-90-hyper-blue', 'prophere-aqua-pulse', 'af1-shadow-pastel', 'court-classic-pure-white',
  'dunk-high-coral-cream');
delete from public.brands where id not in (select brand_id from public.products);

-- ---------------------------------------------------------------- settings
-- delivery times for both kinds of lines + an optional note (per language) about ordering from abroad;
-- the hero product of the old home page is gone, so the home setting starts clean
update public.settings
   set value = jsonb_build_object('stock_days', '1–3', 'order_days', '10–18', 'order_note', '{}'::jsonb) || value
 where key = 'delivery';
update public.settings set value = jsonb_set(value, '{hero}', '{}'::jsonb) where key = 'home';

-- ------------------------------------------------------------ price_order()
create or replace function public.price_order(p_payload jsonb, p_take boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items     jsonb := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_phone     text  := nullif(btrim(p_payload -> 'customer' ->> 'phone'), '');
  v_method    text  := nullif(btrim(p_payload -> 'delivery' ->> 'method'), '');
  v_promo_in  text  := upper(nullif(btrim(p_payload ->> 'promo_code'), ''));
  v_prod      public.products%rowtype;
  v_size      public.product_sizes%rowtype;
  v_qty       integer;
  v_label     text;
  v_key       text;
  v_item      jsonb;
  v_merged    jsonb := '{}'::jsonb;
  v_row       record;
  v_fulfil    text;
  v_lines     jsonb := '[]'::jsonb;
  v_subtotal  integer := 0;
  v_discount  integer := 0;
  v_fee       integer := 0;
  v_free_from integer;
  v_promo     public.promo_codes%rowtype;
begin
  if v_method is null then raise exception 'invalid:delivery'; end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) not between 1 and 20 then
    raise exception 'invalid:items';
  end if;

  -- merge duplicate slug+size lines
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := coalesce((v_item ->> 'qty')::integer, 0);
    if v_qty < 1 or v_qty > 10 then raise exception 'invalid:qty'; end if;
    v_label := btrim(v_item ->> 'size');
    if v_label is null or v_label !~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,11}$' or nullif(v_item ->> 'slug', '') is null then
      raise exception 'invalid:items';
    end if;
    v_key := (v_item ->> 'slug') || '|' || v_label;
    v_merged := jsonb_set(
      v_merged, array[v_key],
      to_jsonb(coalesce((v_merged ->> v_key)::integer, 0) + v_qty));
  end loop;

  -- price every line from the database. A line is fulfilled from the stock here when enough is left
  -- ('stock', and the stock is taken when placing); otherwise it is ordered from abroad ('order') if that
  -- size allows it, else the whole order is refused.
  for v_row in select key as k, value::integer as qty from jsonb_each_text(v_merged) loop
    select * into v_prod from public.products
      where slug = split_part(v_row.k, '|', 1) and is_active;
    if not found then raise exception 'unavailable:%', split_part(v_row.k, '|', 1); end if;

    select * into v_size from public.product_sizes
      where product_id = v_prod.id and label = split_part(v_row.k, '|', 2);
    if not found then
      raise exception 'unavailable:%:%', v_prod.slug, split_part(v_row.k, '|', 2);
    end if;

    v_fulfil := null;
    if p_take then
      -- atomic: only succeeds if enough stock is left (the row lock serialises buyers)
      update public.product_sizes set stock = stock - v_row.qty
        where id = v_size.id and stock >= v_row.qty;
      if found then v_fulfil := 'stock'; end if;
    elsif v_size.stock >= v_row.qty then
      v_fulfil := 'stock';
    end if;
    if v_fulfil is null then
      if v_size.orderable then
        v_fulfil := 'order';
      else
        raise exception 'out_of_stock:%:%', v_prod.slug, v_size.label;
      end if;
    end if;

    v_subtotal := v_subtotal + v_prod.price * v_row.qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'size_id', v_size.id, 'slug', v_prod.slug,
      'brand', (select name from public.brands where id = v_prod.brand_id),
      'name', v_prod.name, 'size_label', v_size.label, 'fulfilment', v_fulfil,
      'qty', v_row.qty, 'unit_price', v_prod.price));
  end loop;

  -- promo code
  if v_promo_in is not null then
    select * into v_promo from public.promo_codes
      where code = v_promo_in and is_active
        and (starts_at is null or starts_at <= now())
        and (ends_at   is null or ends_at   >= now())
      for update;
    if not found
       or v_subtotal < v_promo.min_order
       or (v_promo.usage_limit is not null and v_promo.used_count >= v_promo.usage_limit)
       or (v_promo.per_phone_limit is not null and v_phone is not null and
           (select count(*) from public.orders o
             where o.phone = v_phone and o.promo_code_id = v_promo.id
               and o.status <> 'cancelled') >= v_promo.per_phone_limit)
    then
      raise exception 'invalid:promo';
    end if;
    v_discount := case v_promo.type
      when 'percent' then floor(v_subtotal * least(v_promo.value, 100) / 100.0)::integer
      else least(v_promo.value, v_subtotal) end;
    if p_take then
      update public.promo_codes set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  -- delivery fee (methods + free threshold live in settings 'delivery')
  if v_method <> 'callback' then
    select (m ->> 'fee')::integer into v_fee
      from public.settings s, jsonb_array_elements(s.value -> 'methods') m
      where s.key = 'delivery' and m ->> 'id' = v_method;
    if not found then raise exception 'invalid:delivery'; end if;
    select nullif(s.value ->> 'free_threshold', '')::integer into v_free_from
      from public.settings s where s.key = 'delivery';
    if v_free_from is not null and (v_subtotal - v_discount) >= v_free_from then v_fee := 0; end if;
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal, 'discount', v_discount, 'delivery_fee', v_fee,
    'total', v_subtotal - v_discount + v_fee,
    'promo_id', v_promo.id, 'promo_code', v_promo.code, 'lines', v_lines);
end $$;

-- ------------------------------------------------------------ place_order()
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer  jsonb := coalesce(p_payload -> 'customer', '{}'::jsonb);
  v_delivery  jsonb := coalesce(p_payload -> 'delivery', '{}'::jsonb);
  v_name      text  := nullif(btrim(v_customer ->> 'name'), '');
  v_phone     text  := nullif(btrim(v_customer ->> 'phone'), '');
  v_method    text  := nullif(btrim(v_delivery ->> 'method'), '');
  v_payment   text  := nullif(btrim(p_payload ->> 'payment'), '');
  v_pref      text  := coalesce(nullif(v_customer ->> 'contact_pref', ''), 'call');
  v_price     jsonb;
  v_order_id  uuid;
  v_number    text;
  v_tries     integer := 0;
begin
  if v_name is null or length(v_name) > 120 then raise exception 'invalid:name'; end if;
  if v_phone is null or v_phone !~ '^\+?[0-9]{9,15}$' then raise exception 'invalid:phone'; end if;
  if v_method is null then raise exception 'invalid:delivery'; end if;
  if v_payment is null then raise exception 'invalid:payment'; end if;
  if v_pref not in ('call', 'telegram') then raise exception 'invalid:contact_pref'; end if;

  -- prices from the database; takes stock + the promo use inside this transaction
  v_price := public.price_order(p_payload, true);

  -- order number OL-YYMMDD-NNNN (random suffix, retried on collision)
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
    (v_price ->> 'subtotal')::integer, (v_price ->> 'discount')::integer,
    (v_price ->> 'delivery_fee')::integer, (v_price ->> 'total')::integer,
    (v_price ->> 'promo_id')::uuid, left(p_payload ->> 'lang', 5), p_payload -> 'utm')
  returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, size_id, brand_snapshot, name_snapshot, size_label, fulfilment, qty, unit_price)
  select v_order_id, (l ->> 'product_id')::uuid, (l ->> 'size_id')::uuid,
         l ->> 'brand', l ->> 'name', l ->> 'size_label', l ->> 'fulfilment',
         (l ->> 'qty')::integer, (l ->> 'unit_price')::integer
    from jsonb_array_elements(v_price -> 'lines') l;

  insert into public.order_events (order_id, from_status, to_status, note, actor)
  values (v_order_id, null, 'new', 'Order placed on the website', 'system');

  return jsonb_build_object(
    'order_id', v_order_id, 'number', v_number,
    'subtotal', (v_price ->> 'subtotal')::integer, 'discount', (v_price ->> 'discount')::integer,
    'delivery_fee', (v_price ->> 'delivery_fee')::integer, 'total', (v_price ->> 'total')::integer,
    'promo_code', v_price ->> 'promo_code', 'items', v_price -> 'lines');
end $$;

-- ------------------------------------------------------- set_order_status()
-- Cancelling returns the stock of lines taken from the stock here (not the ones ordered from abroad)
-- and one promo use; cancelled orders are final.
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
      where oi.order_id = v_order.id and oi.size_id = ps.id and oi.fulfilment = 'stock';
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

-- ------------------------------------------------------------ activity log
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
      if v_key not in ('updated_at', 'updated_by', 'last_login')
         and v_old -> v_key is distinct from v_new -> v_key then
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
    coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'user_id', v_row ->> 'slug'),
    jsonb_build_object(
      'changes', case when tg_op = 'UPDATE' then v_diff else '{}'::jsonb end,
      'label', coalesce(v_row ->> 'name', v_row ->> 'slug', v_row ->> 'code', v_row ->> 'key',
                        v_row ->> 'username', 'Size ' || (v_row ->> 'label')),
      'product_id', v_row ->> 'product_id',
      'size', v_row ->> 'label',
      'stock', v_row ->> 'stock'));
  return coalesce(new, old);
end $$;

create trigger categories_log after insert or update or delete on public.categories
  for each row execute function public.log_change();

-- ------------------------------------------------------------ dashboard
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := timezone('Asia/Tashkent', now())::date;
  v_day   timestamptz := (timezone('Asia/Tashkent', now())::date)::timestamp at time zone 'Asia/Tashkent';
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
    -- sizes that are nearly or fully sold out here (on-order sizes can still be sold, so they are flagged)
    'low_stock', coalesce((select jsonb_agg(x) from (
        select p.id as product_id, p.slug, p.name, s.label, s.stock, s.orderable
          from public.product_sizes s join public.products p on p.id = s.product_id
         where p.is_active and s.stock <= 1
         order by s.stock, p.name, s.sort, s.label
         limit 30) x), '[]'::jsonb),
    -- order lines that still have to be bought abroad (open orders only)
    'to_source', (select coalesce(sum(i.qty), 0)::int
                    from public.order_items i join public.orders o on o.id = i.order_id
                   where i.fulfilment = 'order' and o.status in ('new', 'confirmed', 'no_answer')),
    -- last 30 days, one entry per day (days without orders are zero)
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
          'day', d.day, 'orders', coalesce(c.orders, 0), 'revenue', coalesce(c.revenue, 0)) order by d.day)
        from (select v_today - n as day from generate_series(0, 29) n) d
        left join (select timezone('Asia/Tashkent', created_at)::date as day, count(*) as orders, sum(total) as revenue
                     from public.orders
                    where status <> 'cancelled' and created_at >= v_day - interval '29 days'
                    group by 1) c on c.day = d.day), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(x) from (
        select i.name_snapshot as name, sum(i.qty)::int as qty, sum(i.qty * i.unit_price)::bigint as revenue
          from public.order_items i join public.orders o on o.id = i.order_id
         where o.status <> 'cancelled' and o.created_at >= v_day - interval '29 days'
         group by i.name_snapshot
         order by sum(i.qty) desc, sum(i.qty * i.unit_price) desc
         limit 5) x), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

-- ---------------------------------------------------------- save product
-- p: { id?, slug, brand_id | brand_name, name, color, color_hex, color_group, style_code, sku, category,
--      price, old_price, origin, material, fit, model_info, order_lead,
--      description_ru/uz/en, tags[], is_new, is_featured, is_active, seo_title, seo_description,
--      sizes: [{ label, stock?, orderable? }],   -- list order = display order; stock omitted/null = keep
--      images: [{ path }] }                      -- order = display order, first = main photo
-- Sizes and photos missing from the lists are removed (the browser deletes the files afterwards).
-- Returns { id, slug }.
create or replace function public.admin_save_product(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := nullif(p ->> 'id', '')::uuid;
  v_brand    uuid := nullif(p ->> 'brand_id', '')::uuid;
  v_bname    text := nullif(btrim(p ->> 'brand_name'), '');
  v_slug     text := lower(btrim(p ->> 'slug'));
  v_name     text := nullif(btrim(p ->> 'name'), '');
  v_cat      text := nullif(btrim(p ->> 'category'), '');
  v_price    integer := (p ->> 'price')::integer;
  v_old      integer := nullif(p ->> 'old_price', '')::integer;
  v_color    text := nullif(btrim(p ->> 'color'), '');
  v_hex      text := nullif(btrim(p ->> 'color_hex'), '');
  v_cgroup   text := nullif(btrim(p ->> 'color_group'), '');
  v_style    text := nullif(btrim(p ->> 'style_code'), '');
  v_sku      text := nullif(btrim(p ->> 'sku'), '');
  v_origin   text := nullif(upper(btrim(p ->> 'origin')), '');
  v_material text := nullif(btrim(p ->> 'material'), '');
  v_fit      text := nullif(btrim(p ->> 'fit'), '');
  v_model    text := nullif(btrim(p ->> 'model_info'), '');
  v_lead     text := nullif(btrim(p ->> 'order_lead'), '');
  v_tags     text[];
  v_size     jsonb;
  v_label    text;
  v_sz       integer := 0;
  v_i        integer := 0;
  v_img      jsonb;
  v_keep_lbl text[]   := '{}';
  v_keep_img text[]   := '{}';
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if v_name is null or length(v_name) > 160 then raise exception 'invalid:name'; end if;
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 120 then
    raise exception 'invalid:slug';
  end if;
  if v_price is null or v_price < 0 then raise exception 'invalid:price'; end if;
  if v_old is not null and v_old < v_price then raise exception 'invalid:old_price'; end if;
  if v_cat is null or not exists (select 1 from public.categories where slug = v_cat) then
    raise exception 'invalid:category';
  end if;
  if v_hex is not null and v_hex !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid:color_hex'; end if;
  if v_cgroup is not null and v_cgroup not in
     ('black', 'white', 'grey', 'navy', 'blue', 'green', 'beige', 'brown', 'red', 'other') then
    raise exception 'invalid:color_group';
  end if;
  if v_style is not null and v_style !~ '^[A-Za-z0-9._-]{1,40}$' then raise exception 'invalid:style_code'; end if;
  if v_origin is not null and v_origin !~ '^[A-Z]{2}$' then raise exception 'invalid:origin'; end if;
  if v_fit is not null and v_fit not in ('slim', 'regular', 'relaxed', 'oversized') then raise exception 'invalid:fit'; end if;
  if v_lead is not null and v_lead !~ '^[0-9]{1,3}([–-][0-9]{1,3})?$' then raise exception 'invalid:order_lead'; end if;
  if char_length(coalesce(v_material, '')) > 160 or char_length(coalesce(v_model, '')) > 160 then
    raise exception 'invalid:text';
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
    insert into public.products (id, slug, brand_id, name, color, color_hex, color_group, style_code, sku,
        category, price, old_price, origin, material, fit, model_info, order_lead,
        description_ru, description_uz, description_en, tags, is_new, is_featured, is_active,
        seo_title, seo_description)
    values (coalesce(v_id, gen_random_uuid()), v_slug, v_brand, v_name, v_color, v_hex, v_cgroup, v_style, v_sku,
        v_cat, v_price, v_old, v_origin, v_material, v_fit, v_model, v_lead,
        nullif(p ->> 'description_ru', ''), nullif(p ->> 'description_uz', ''), nullif(p ->> 'description_en', ''),
        v_tags, coalesce((p ->> 'is_new')::boolean, false), coalesce((p ->> 'is_featured')::boolean, false),
        coalesce((p ->> 'is_active')::boolean, true),
        nullif(btrim(p ->> 'seo_title'), ''), nullif(btrim(p ->> 'seo_description'), ''))
    returning id into v_id;
  else
    update public.products set
        slug = v_slug, brand_id = v_brand, name = v_name, color = v_color, color_hex = v_hex,
        color_group = v_cgroup, style_code = v_style, sku = v_sku, category = v_cat,
        price = v_price, old_price = v_old, origin = v_origin, material = v_material, fit = v_fit,
        model_info = v_model, order_lead = v_lead,
        description_ru = nullif(p ->> 'description_ru', ''), description_uz = nullif(p ->> 'description_uz', ''),
        description_en = nullif(p ->> 'description_en', ''), tags = v_tags,
        is_new = coalesce((p ->> 'is_new')::boolean, false), is_featured = coalesce((p ->> 'is_featured')::boolean, false),
        is_active = coalesce((p ->> 'is_active')::boolean, true),
        seo_title = nullif(btrim(p ->> 'seo_title'), ''), seo_description = nullif(btrim(p ->> 'seo_description'), '')
      where id = v_id;
  end if;

  -- sizes: update in place (order history keeps pointing at them), add new, drop removed;
  -- the position in the list is the display order
  for v_size in select * from jsonb_array_elements(coalesce(p -> 'sizes', '[]'::jsonb)) loop
    v_label := btrim(v_size ->> 'label');
    if v_label is null or v_label !~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,11}$' or v_label = any (v_keep_lbl) then
      raise exception 'invalid:size';
    end if;
    if nullif(v_size ->> 'stock', '') is not null and (v_size ->> 'stock')::integer < 0 then
      raise exception 'invalid:stock';
    end if;
    v_keep_lbl := v_keep_lbl || v_label;
    insert into public.product_sizes (product_id, label, sort, orderable, stock)
    values (v_id, v_label, v_sz, coalesce((v_size ->> 'orderable')::boolean, true),
            coalesce(nullif(v_size ->> 'stock', '')::integer, 0))
    on conflict (product_id, label) do update set
      sort = excluded.sort, orderable = excluded.orderable,
      stock = case when nullif(v_size ->> 'stock', '') is null then public.product_sizes.stock else excluded.stock end;
    v_sz := v_sz + 1;
  end loop;
  delete from public.product_sizes where product_id = v_id and not (label = any (v_keep_lbl));

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

-- function privileges (create or replace keeps them; stated again so this file is self-contained)
revoke all on function public.price_order(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;
