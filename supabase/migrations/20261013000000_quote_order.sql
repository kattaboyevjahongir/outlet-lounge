-- Orders, part 2: one pricing function shared by "quote" (cart preview) and
-- "place" (real order), so what the cart shows is exactly what gets charged.
--
--   price_order(payload, take_stock)  internal — prices lines, checks/takes stock, applies promo + delivery
--   quote_order(payload)              server only — preview, never changes stock
--   place_order(payload)              server only — validates the customer, prices (taking stock), inserts the order
--
-- Delivery method 'callback' (Buy in 1 click) has no fee: the manager arranges the address by phone.

-- ----------------------------------------------------------- price_order()
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
  v_key       text;
  v_item      jsonb;
  v_merged    jsonb := '{}'::jsonb;
  v_row       record;
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
    v_key := (v_item ->> 'slug') || '|' || (v_item ->> 'size');
    v_merged := jsonb_set(
      v_merged, array[v_key],
      to_jsonb(coalesce((v_merged ->> v_key)::integer, 0) + v_qty));
  end loop;

  -- price every line from the database; check stock (and take it when placing)
  for v_row in select key as k, value::integer as qty from jsonb_each_text(v_merged) loop
    select * into v_prod from public.products
      where slug = split_part(v_row.k, '|', 1) and is_active;
    if not found then raise exception 'unavailable:%', split_part(v_row.k, '|', 1); end if;

    select * into v_size from public.product_sizes
      where product_id = v_prod.id and eu = split_part(v_row.k, '|', 2)::numeric;
    if not found then
      raise exception 'unavailable:%:%', v_prod.slug, split_part(v_row.k, '|', 2);
    end if;

    if p_take then
      -- atomic: only succeeds if enough stock is left (the row lock serialises buyers)
      update public.product_sizes set stock = stock - v_row.qty
        where id = v_size.id and stock >= v_row.qty;
      if not found then
        raise exception 'out_of_stock:%:%', v_prod.slug, v_size.eu;
      end if;
    elsif v_size.stock < v_row.qty then
      raise exception 'out_of_stock:%:%', v_prod.slug, v_size.eu;
    end if;

    v_subtotal := v_subtotal + v_prod.price * v_row.qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'size_id', v_size.id, 'slug', v_prod.slug,
      'brand', (select name from public.brands where id = v_prod.brand_id),
      'name', v_prod.name, 'size_eu', v_size.eu,
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

-- ----------------------------------------------------------- quote_order()
create or replace function public.quote_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := p_payload;
  v_price   jsonb;
begin
  if nullif(btrim(v_payload -> 'delivery' ->> 'method'), '') is null then
    v_payload := jsonb_set(v_payload, '{delivery}', jsonb_build_object('method', 'courier_tashkent'));
  end if;
  v_price := public.price_order(v_payload, false);
  return v_price - 'promo_id';
end $$;

-- ----------------------------------------------------------- place_order()
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
    (order_id, product_id, size_id, brand_snapshot, name_snapshot, size_eu, qty, unit_price)
  select v_order_id, (l ->> 'product_id')::uuid, (l ->> 'size_id')::uuid,
         l ->> 'brand', l ->> 'name', (l ->> 'size_eu')::numeric,
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

-- privileges: only the server (service role) may price or place orders
revoke all on function public.price_order(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.quote_order(jsonb) from public, anon, authenticated;
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.quote_order(jsonb) to service_role;
grant execute on function public.place_order(jsonb) to service_role;
