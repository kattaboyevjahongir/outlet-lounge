-- Outlet Lounge — admin panel, phase 5
--   • staff sign in with a username (stored on the staff row); the last owner can't be removed
--   • activity log also records promo codes, settings and staff changes
--   • admin_overview(): adds the last 30 days and the best sellers
--   • admin_report(): sales report for a date range (owner only)

-- ----------------------------------------------------------- usernames
alter table public.staff add column username text;
alter table public.staff add constraint staff_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
create unique index staff_username_key on public.staff (username) where username is not null;

-- the shop must always have an active owner
create or replace function public.guard_last_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'owner' or not new.is_active) then
    if not exists (select 1 from public.staff
                   where role = 'owner' and is_active and user_id <> old.user_id) then
      raise exception 'last_owner';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger staff_guard_last_owner before update or delete on public.staff
  for each row execute function public.guard_last_owner();

-- remember when someone last signed in (called by the panel after sign-in)
create or replace function public.touch_login()
returns void language sql security definer set search_path = public as $$
  update public.staff set last_login = now() where user_id = auth.uid() and is_active;
$$;
revoke all on function public.touch_login() from public, anon;
grant execute on function public.touch_login() to authenticated;

-- --------------------------------------------------------- activity log
-- same function as before, now for any table: id from id / key / user_id, a readable label,
-- and sign-in timestamps do not count as a change.
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
    coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'user_id'),
    jsonb_build_object(
      'changes', case when tg_op = 'UPDATE' then v_diff else '{}'::jsonb end,
      'label', coalesce(v_row ->> 'name', v_row ->> 'slug', v_row ->> 'code', v_row ->> 'key',
                        v_row ->> 'username', 'EU ' || (v_row ->> 'eu')),
      'product_id', v_row ->> 'product_id',
      'eu', v_row ->> 'eu',
      'stock', v_row ->> 'stock'));
  return coalesce(new, old);
end $$;

create trigger promo_codes_log after insert or update or delete on public.promo_codes
  for each row execute function public.log_change();
create trigger settings_log after insert or update or delete on public.settings
  for each row execute function public.log_change();
create trigger staff_log after insert or update or delete on public.staff
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
    'low_stock', coalesce((select jsonb_agg(x) from (
        select p.id as product_id, p.slug, p.name, s.eu, s.stock
          from public.product_sizes s join public.products p on p.id = s.product_id
         where p.is_active and s.stock <= 1
         order by s.stock, p.name, s.eu
         limit 30) x), '[]'::jsonb),
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

-- --------------------------------------------------------------- report
-- Owner only. p_to is exclusive. Cancelled orders are counted separately and excluded from revenue.
create or replace function public.admin_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_out jsonb;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '800 days' then
    raise exception 'invalid:range';
  end if;

  with o as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ), live as (
    select * from o where status <> 'cancelled'
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'orders',      (select count(*) from live),
      'revenue',     (select coalesce(sum(total), 0) from live),
      'avg_order',   (select coalesce(round(avg(total)), 0) from live),
      'cancelled',   (select count(*) from o where status = 'cancelled'),
      'all_orders',  (select count(*) from o),
      'discounts',   (select coalesce(sum(discount), 0) from live)),
    'by_status', coalesce((select jsonb_object_agg(status, c) from
        (select status, count(*) c from o group by status) s), '{}'::jsonb),
    'by_day', coalesce((select jsonb_agg(x order by x.day) from (
        select timezone('Asia/Tashkent', created_at)::date as day, count(*) as orders, sum(total)::bigint as revenue
          from live group by 1) x), '[]'::jsonb),
    'by_brand', coalesce((select jsonb_agg(x) from (
        select coalesce(i.brand_snapshot, '—') as brand, sum(i.qty)::int as qty, sum(i.qty * i.unit_price)::bigint as revenue
          from public.order_items i join live l on l.id = i.order_id
         group by 1 order by 3 desc limit 30) x), '[]'::jsonb),
    'by_product', coalesce((select jsonb_agg(x) from (
        select i.name_snapshot as name, sum(i.qty)::int as qty, sum(i.qty * i.unit_price)::bigint as revenue
          from public.order_items i join live l on l.id = i.order_id
         group by 1 order by 3 desc limit 30) x), '[]'::jsonb),
    'by_region', coalesce((select jsonb_agg(x) from (
        select coalesce(nullif(region, ''), delivery_method) as region, count(*)::int as orders, sum(total)::bigint as revenue
          from live group by 1 order by 3 desc) x), '[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(x) from (
        select coalesce(nullif(utm ->> 'utm_source', ''), nullif(utm ->> 'source', ''), 'direct') as source,
               count(*)::int as orders, sum(total)::bigint as revenue
          from live group by 1 order by 3 desc) x), '[]'::jsonb),
    'promo', coalesce((select jsonb_agg(x) from (
        select p.code, count(*)::int as orders, sum(l.discount)::bigint as discount, sum(l.total)::bigint as revenue
          from live l join public.promo_codes p on p.id = l.promo_code_id
         group by p.code order by 3 desc) x), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
revoke all on function public.admin_report(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_report(timestamptz, timestamptz) to authenticated;
