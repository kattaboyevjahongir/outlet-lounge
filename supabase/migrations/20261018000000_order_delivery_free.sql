-- Delivery is free when everything in the order is ordered from abroad: those prices already include
-- delivery to Uzbekistan. Orders with anything from the Tashkent stock pay the normal fee.
-- The switch is settings 'delivery'.order_free (default on).

update public.settings set value = value || '{"order_free": true}'::jsonb
 where key = 'delivery' and not (value ? 'order_free');

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
    -- prices of items ordered from abroad already include delivery: an order with nothing from the
    -- stock here ships free (switch: settings 'delivery'.order_free, on unless set to false)
    if not exists (select 1 from jsonb_array_elements(v_lines) l where l ->> 'fulfilment' = 'stock')
       and coalesce((select (s.value ->> 'order_free')::boolean from public.settings s where s.key = 'delivery'), true) then
      v_fee := 0;
    end if;
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal, 'discount', v_discount, 'delivery_fee', v_fee,
    'total', v_subtotal - v_discount + v_fee,
    'promo_id', v_promo.id, 'promo_code', v_promo.code, 'lines', v_lines);
end $$;

revoke all on function public.price_order(jsonb, boolean) from public, anon, authenticated;
