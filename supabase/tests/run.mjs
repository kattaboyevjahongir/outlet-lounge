// Database tests: applies the real migration + seed to an in-memory Postgres
// (PGlite) with small stand-ins for Supabase's `auth` and `storage` schemas,
// then checks stock safety, pricing, promo rules and who can see/do what.
//
//   cd supabase/tests && npm install && npm test
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const db = new PGlite();

let passed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
};
const rejects = async (promise, re, label) => {
  try {
    await promise;
  } catch (e) {
    assert.match(e.message, re, label);
    return;
  }
  assert.fail(`${label || 'expected an error'} — but it succeeded`);
};

// ---------------------------------------------------------- Supabase stand-ins
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
`);

// like Supabase: tables created by migrations are open to the API roles by default;
// row level security and the migrations' own revokes/grants narrow that down
await db.exec(`
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

// every migration, in order — exactly what `supabase db push` applies
for (const f of readdirSync(new URL('../migrations/', import.meta.url)).filter((n) => n.endsWith('.sql')).sort()) {
  await db.exec(read(`../migrations/${f}`));
}
await db.exec(read('../seed.sql'));

// --------------------------------------------------------------- helpers
const as = async (role, userId = null) => {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId || '']);
  await db.query(`select set_config('request.jwt.claim.role', $1, false)`, [role]);
  await db.exec(`set role ${role}`);
};
const asSuper = async () => {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await db.query(`select set_config('request.jwt.claim.role', '', false)`);
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const all = async (sql, params) => (await db.query(sql, params)).rows;
const stockOf = async (slug, eu) =>
  (await one(
    `select s.stock from product_sizes s join products p on p.id = s.product_id
     where p.slug = $1 and s.eu = $2`, [slug, eu])).stock;

const order = (items, extra = {}) => ({
  customer: { name: 'Aziz R.', phone: '+998901234567', telegram: '@aziz', contact_pref: 'call' },
  delivery: { method: 'courier_tashkent', region: 'Tashkent', city: 'Tashkent', address: 'Street 1' },
  payment: 'cash',
  lang: 'ru',
  items,
  ...extra,
});
const place = async (payload) =>
  (await one('select public.place_order($1::jsonb) as r', [JSON.stringify(payload)])).r;

// users
const OWNER = '00000000-0000-0000-0000-0000000000a1';
const MANAGER = '00000000-0000-0000-0000-0000000000a2';
const STRANGER = '00000000-0000-0000-0000-0000000000a3';
await db.exec(`
  insert into auth.users (id, email) values
    ('${OWNER}', 'owner@example.com'), ('${MANAGER}', 'manager@example.com'), ('${STRANGER}', 'x@example.com');
  insert into public.staff (user_id, name, role) values
    ('${OWNER}', 'Owner', 'owner'), ('${MANAGER}', 'Manager', 'manager');
`);

console.log('\nSeed');
await test('seed loaded 18 products / 90 sizes', async () => {
  await asSuper();
  assert.equal((await one('select count(*)::int c from products')).c, 18);
  assert.equal((await one('select count(*)::int c from product_sizes')).c, 90);
});
await test('seed is idempotent', async () => {
  await db.exec(read('../seed.sql'));
  assert.equal((await one('select count(*)::int c from products')).c, 18);
  assert.equal((await one('select count(*)::int c from product_images')).c, 36);
});

console.log('\nVisitors (anon)');
await test('can read active products, sizes, images, public settings', async () => {
  await as('anon');
  assert.equal((await one('select count(*)::int c from products')).c, 18);
  assert.equal((await one('select count(*)::int c from product_sizes')).c, 90);
  assert.equal((await one('select count(*)::int c from settings')).c, 2);
});
await test('cannot see hidden products', async () => {
  await asSuper();
  await db.exec(`update products set is_active = false where slug = 'kyrie-7-onyx'`);
  await as('anon');
  assert.equal((await one(`select count(*)::int c from products where slug = 'kyrie-7-onyx'`)).c, 0);
  assert.equal((await one(`select count(*)::int c from product_sizes s join products p on p.id=s.product_id`)).c, 85);
  await asSuper();
  await db.exec(`update products set is_active = true where slug = 'kyrie-7-onyx'`);
});
await test('cannot read orders, staff, promo codes or private settings', async () => {
  await asSuper();
  await db.exec(`insert into settings (key, value, is_public) values ('telegram', '{"chat":1}', false)
                 on conflict do nothing`);
  await as('anon');
  for (const t of ['orders', 'order_items', 'order_events', 'staff', 'promo_codes', 'activity_log', 'notify_requests']) {
    assert.equal((await one(`select count(*)::int c from ${t}`)).c, 0, t);
  }
  assert.equal((await one(`select count(*)::int c from settings where key = 'telegram'`)).c, 0);
});
await test('cannot write products, orders or stock directly', async () => {
  await as('anon');
  await db.exec(`update products set price = 1`); // RLS: matches no rows, changes nothing
  await asSuper();
  assert.equal((await one(`select count(*)::int c from products where price = 1`)).c, 0);
  await as('anon');
  await rejects(
    db.exec(`insert into orders (number, customer_name, phone, delivery_method, payment_method, subtotal, total)
             values ('X', 'a', '1', 'x', 'x', 1, 1)`),
    /row-level security|permission denied/, 'insert order');
  await asSuper();
  assert.equal((await one(`select count(*)::int c from product_sizes where stock <> 3 and stock <> 0`)).c, 0);
});
await test('cannot call place_order or set_order_status', async () => {
  await as('anon');
  await rejects(
    one(`select public.place_order('{}'::jsonb)`), /permission denied/, 'place_order');
  await rejects(
    one(`select public.set_order_status(gen_random_uuid(), 'confirmed')`), /permission denied/, 'set_order_status');
});

console.log('\nPlacing orders (server / service role)');
let first;
await test('prices come from the database; stock decreases', async () => {
  await as('service_role');
  first = await place(order([{ slug: 'air-max-1-sunset', size: 41, qty: 2, price: 1 }]));
  assert.match(first.number, /^OL-\d{6}-\d{4}$/);
  assert.equal(first.subtotal, 2 * 1390000, 'client price must be ignored');
  assert.equal(first.delivery_fee, 0, '2.78M is above the free-delivery threshold');
  assert.equal(first.total, 2 * 1390000);
  await asSuper();
  assert.equal(await stockOf('air-max-1-sunset', 41), 1);
  const ev = await all('select * from order_events where order_id = $1', [first.order_id]);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].to_status, 'new');
  const items = await all('select * from order_items where order_id = $1', [first.order_id]);
  assert.equal(items[0].name_snapshot, 'Air Max 1 “Sunset”');
  assert.equal(items[0].brand_snapshot, 'Nike');
});
await test('last pair: second buyer is rejected and nothing changes', async () => {
  await as('service_role');
  await rejects(place(order([{ slug: 'air-max-1-sunset', size: 41, qty: 2 }])), /out_of_stock:air-max-1-sunset:41/);
  await asSuper();
  assert.equal(await stockOf('air-max-1-sunset', 41), 1);
  await as('service_role');
  await place(order([{ slug: 'air-max-1-sunset', size: 41, qty: 1 }]));
  await rejects(place(order([{ slug: 'air-max-1-sunset', size: 41, qty: 1 }])), /out_of_stock/);
  await asSuper();
  assert.equal(await stockOf('air-max-1-sunset', 41), 0);
});
await test('one bad line rolls back the whole order (no partial stock loss)', async () => {
  await as('service_role');
  await rejects(
    place(order([{ slug: 'old-skool-burgundy', size: 40, qty: 1 }, { slug: 'air-max-1-sunset', size: 41, qty: 1 }])),
    /out_of_stock/);
  await asSuper();
  assert.equal(await stockOf('old-skool-burgundy', 40), 3);
});
await test('unknown product / size / hidden product are refused', async () => {
  await as('service_role');
  await rejects(place(order([{ slug: 'nope', size: 41, qty: 1 }])), /unavailable:nope/);
  await rejects(place(order([{ slug: 'old-skool-burgundy', size: 50, qty: 1 }])), /unavailable:old-skool-burgundy:50/);
  await asSuper();
  await db.exec(`update products set is_active = false where slug = 'old-skool-burgundy'`);
  await as('service_role');
  await rejects(place(order([{ slug: 'old-skool-burgundy', size: 40, qty: 1 }])), /unavailable:old-skool-burgundy/);
  await asSuper();
  await db.exec(`update products set is_active = true where slug = 'old-skool-burgundy'`);
});
await test('validation: phone, name, qty, items, delivery method', async () => {
  await as('service_role');
  const item = [{ slug: 'old-skool-burgundy', size: 40, qty: 1 }];
  await rejects(place(order(item, { customer: { name: 'A', phone: 'abc' } })), /invalid:phone/);
  await rejects(place(order(item, { customer: { name: '', phone: '+998901234567' } })), /invalid:name/);
  await rejects(place(order([{ slug: 'old-skool-burgundy', size: 40, qty: 0 }])), /invalid:qty/);
  await rejects(place(order([{ slug: 'old-skool-burgundy', size: 40, qty: 99 }])), /invalid:qty/);
  await rejects(place(order([])), /invalid:items/);
  await rejects(place(order(item, { delivery: { method: 'teleport' } })), /invalid:delivery/);
});
await test('free delivery above the threshold; pickup is free', async () => {
  await as('service_role');
  const big = await place(order([
    { slug: 'air-jordan-12-retro-gym-red', size: 41, qty: 1 }]));          // 1 890 000 ≥ 1 500 000
  assert.equal(big.delivery_fee, 0);
  const pick = await place(order([{ slug: 'old-skool-burgundy', size: 40, qty: 1 }],
    { delivery: { method: 'pickup' } }));
  assert.equal(pick.delivery_fee, 0);
  const regions = await place(order([{ slug: 'old-skool-burgundy', size: 41, qty: 1 }],
    { delivery: { method: 'regions' } }));
  assert.equal(regions.delivery_fee, 50000);
  const courier = await place(order([{ slug: 'old-skool-burgundy', size: 42, qty: 1 }]));
  assert.equal(courier.delivery_fee, 30000);
  assert.equal(courier.total, 590000 + 30000);
});
await test('duplicate lines are merged before the stock check', async () => {
  await as('service_role');
  await rejects(place(order([
    { slug: 'x-90-pink-haze', size: 38, qty: 2 }, { slug: 'x-90-pink-haze', size: 38, qty: 2 }])), /out_of_stock/);
});

console.log('\nPromo codes');
await test('percent code applies, counts usage, respects min order', async () => {
  await asSuper();
  await db.exec(`insert into promo_codes (code, type, value, min_order, usage_limit, per_phone_limit)
                 values ('LOUNGE10', 'percent', 10, 500000, 2, 1)`);
  await as('service_role');
  const r = await place(order([{ slug: 'chuck-70-hi-cherry', size: 38, qty: 1 }], { promo_code: 'lounge10' }));
  assert.equal(r.discount, 69000);
  assert.equal(r.total, 690000 - 69000 + 30000);
  await asSuper();
  assert.equal((await one(`select used_count from promo_codes where code = 'LOUNGE10'`)).used_count, 1);
});
await test('per-phone limit, unknown code and min order are refused', async () => {
  await as('service_role');
  await rejects(place(order([{ slug: 'chuck-70-hi-cherry', size: 38, qty: 1 }], { promo_code: 'LOUNGE10' })), /invalid:promo/, 'same phone twice');
  await rejects(place(order([{ slug: 'chuck-70-hi-cherry', size: 39, qty: 1 }], { promo_code: 'NOPE' })), /invalid:promo/, 'unknown');
  await asSuper();
  await db.exec(`update promo_codes set min_order = 5000000 where code = 'LOUNGE10'`);
  await as('service_role');
  await rejects(place(order([{ slug: 'chuck-70-hi-cherry', size: 39, qty: 1 }],
    { customer: { name: 'B', phone: '+998909999999' }, promo_code: 'LOUNGE10' })), /invalid:promo/, 'min order');
});


console.log('\nQuote + quick order (cart preview)');
const quote = async (payload) => (await one('select public.quote_order($1::jsonb) as r', [JSON.stringify(payload)])).r;
await test('quote never changes stock and matches what place_order charges', async () => {
  await asSuper();
  const before = await stockOf('old-skool-burgundy', 41);
  await as('service_role');
  const items = [{ slug: 'old-skool-burgundy', size: 41, qty: 2 }];
  const q = await quote({ items, delivery: { method: 'courier_tashkent' } });
  await asSuper();
  assert.equal(await stockOf('old-skool-burgundy', 41), before, 'quote must not take stock');
  await as('service_role');
  const placed = await place(order(items, { customer: { name: 'Q', phone: '+998901110000' } }));
  for (const k of ['subtotal', 'discount', 'delivery_fee', 'total']) assert.equal(q[k], placed[k], k);
  assert.equal(q.lines[0].unit_price, 590000);
});
await test('quote defaults to courier delivery and reports promo problems', async () => {
  await asSuper();
  await db.exec(`insert into promo_codes (code, type, value, min_order) values ('FIX50', 'fixed', 50000, 0)`);
  await as('service_role');
  const q = await quote({ items: [{ slug: 'chuck-70-hi-cherry', size: 39, qty: 1 }], promo_code: 'fix50' });
  assert.equal(q.discount, 50000);
  assert.equal(q.delivery_fee, 30000);
  assert.equal(q.promo_code, 'FIX50');
  await rejects(quote({ items: [{ slug: 'chuck-70-hi-cherry', size: 39, qty: 1 }], promo_code: 'WRONG' }), /invalid:promo/);
  await rejects(quote({ items: [{ slug: 'chuck-70-hi-cherry', size: 39, qty: 50 }] }), /invalid:qty/);
});
await test('quote reports sold-out lines', async () => {
  await as('service_role');
  await rejects(quote({ items: [{ slug: 'air-max-1-sunset', size: 41, qty: 1 }] }), /out_of_stock:air-max-1-sunset:41/);
});
await test('quote does not use up a promo code', async () => {
  await asSuper();
  const before = (await one(`select used_count from promo_codes where code = 'FIX50'`)).used_count;
  await as('service_role');
  await quote({ items: [{ slug: 'chuck-70-hi-cherry', size: 39, qty: 1 }], promo_code: 'FIX50' });
  await asSuper();
  assert.equal((await one(`select used_count from promo_codes where code = 'FIX50'`)).used_count, before);
});
await test('quick order: "callback" delivery has no fee and needs no address', async () => {
  await as('service_role');
  const r = await place({
    customer: { name: 'Quick', phone: '+998905550000', contact_pref: 'call' },
    delivery: { method: 'callback' },
    payment: 'tbd',
    items: [{ slug: 'x-90-pink-haze', size: 38, qty: 1 }],
  });
  assert.equal(r.delivery_fee, 0);
  assert.equal(r.total, 890000);
  await asSuper();
  const o = await one('select delivery_method, address from orders where id = $1', [r.order_id]);
  assert.equal(o.delivery_method, 'callback');
  assert.equal(o.address, null);
});
await test('visitors and managers cannot price or quote', async () => {
  await as('anon');
  await rejects(one(`select public.quote_order('{}'::jsonb)`), /permission denied/);
  await rejects(one(`select public.price_order('{}'::jsonb, false)`), /permission denied/);
  await as('authenticated', MANAGER);
  await rejects(one(`select public.quote_order('{}'::jsonb)`), /permission denied/);
});

console.log('\nOrder status');
let target;
await test('manager can confirm; event records the actor', async () => {
  await as('service_role');
  target = await place(order([{ slug: 'prophere-aqua-pulse', size: 41, qty: 2 }],
    { customer: { name: 'C', phone: '+998907777777' }, promo_code: null }));
  await as('authenticated', MANAGER);
  const r = (await one(`select public.set_order_status($1, 'confirmed', 'called') as r`, [target.order_id])).r;
  assert.equal(r.status, 'confirmed');
  await asSuper();
  const ev = await all('select * from order_events where order_id=$1 order by created_at, id', [target.order_id]);
  assert.equal(ev.at(-1).actor, 'Manager');
  assert.equal(ev.at(-1).from_status, 'new');
});
await test('non-staff users are forbidden', async () => {
  await as('authenticated', STRANGER);
  await rejects(one(`select public.set_order_status($1, 'shipped')`, [target.order_id]), /forbidden/);
});
await test('cancelling returns stock; cancelled orders are final', async () => {
  await asSuper();
  assert.equal(await stockOf('prophere-aqua-pulse', 41), 1);
  await as('authenticated', OWNER);
  await one(`select public.set_order_status($1, 'cancelled')`, [target.order_id]);
  await asSuper();
  assert.equal(await stockOf('prophere-aqua-pulse', 41), 3);
  await as('authenticated', OWNER);
  await rejects(one(`select public.set_order_status($1, 'confirmed')`, [target.order_id]), /order_cancelled/);
});
await test('cancelling an order that used a promo gives the use back', async () => {
  await asSuper();
  await db.exec(`update promo_codes set min_order = 0, per_phone_limit = null, usage_limit = 5 where code = 'LOUNGE10'`);
  await as('service_role');
  const o = await place(order([{ slug: 'chuck-70-hi-cherry', size: 40, qty: 1 }],
    { customer: { name: 'D', phone: '+998908888888' }, promo_code: 'LOUNGE10' }));
  await asSuper();
  const before = (await one(`select used_count from promo_codes where code='LOUNGE10'`)).used_count;
  await as('service_role');
  await one(`select public.set_order_status($1, 'cancelled', 'by telegram', 'telegram:malika') as r`, [o.order_id]);
  await asSuper();
  assert.equal((await one(`select used_count from promo_codes where code='LOUNGE10'`)).used_count, before - 1);
  const ev = await one(`select actor from order_events where order_id=$1 and to_status='cancelled'`, [o.order_id]);
  assert.equal(ev.actor, 'telegram:malika');
});

console.log('\nStaff permissions (RLS)');
await test('manager reads orders, updates products, cannot delete or touch promo/settings/staff', async () => {
  await as('authenticated', MANAGER);
  assert.ok((await one('select count(*)::int c from orders')).c > 0);
  await db.exec(`update products set price = 1234567 where slug = 'vans-none'`); // no row, no error
  await db.exec(`update products set is_new = true where slug = 'old-skool-burgundy'`);
  assert.equal((await one(`select is_new from products where slug='old-skool-burgundy'`)).is_new, true);
  await db.exec(`delete from products where slug = 'old-skool-burgundy'`);
  assert.equal((await one(`select count(*)::int c from products where slug='old-skool-burgundy'`)).c, 1, 'manager delete must do nothing');
  assert.equal((await one('select count(*)::int c from promo_codes')).c, 0);
  assert.equal((await one(`select count(*)::int c from settings where key='telegram'`)).c, 0);
  assert.equal((await one('select count(*)::int c from staff')).c, 1, 'manager sees only their own staff row');
  await rejects(db.exec(`insert into promo_codes (code, type, value) values ('HACK', 'percent', 90)`), /row-level security/);
  await db.exec(`update settings set value = '{}' where key = 'delivery'`); // matches no rows
  assert.ok((await one(`select value from settings where key = 'delivery'`)).value.methods, 'settings must be unchanged');
});
await test('owner can do everything', async () => {
  await as('authenticated', OWNER);
  assert.equal((await one('select count(*)::int c from staff')).c, 2);
  assert.equal((await one(`select count(*)::int c from settings where key='telegram'`)).c, 1);
  assert.ok((await one('select count(*)::int c from promo_codes')).c > 0);
  await db.exec(`insert into products (slug, brand_id, name, category, price)
                 select 'temp-product', id, 'Temp', 'lifestyle', 1 from brands limit 1`);
  await db.exec(`delete from products where slug = 'temp-product'`);
  assert.equal((await one(`select count(*)::int c from products where slug='temp-product'`)).c, 0);
});
await test('deactivated staff lose access', async () => {
  await asSuper();
  await db.exec(`update staff set is_active = false where user_id = '${MANAGER}'`);
  await as('authenticated', MANAGER);
  assert.equal((await one('select count(*)::int c from orders')).c, 0);
  await rejects(one(`select public.set_order_status(gen_random_uuid(), 'confirmed')`), /forbidden/);
  await asSuper();
  await db.exec(`update staff set is_active = true where user_id = '${MANAGER}'`);
});


console.log('\nAdmin panel: invites, columns, product save, activity log');
const NEW_OWNER = '00000000-0000-0000-0000-0000000000b1';
await test('an invited email becomes staff with the invited role when the account is created', async () => {
  await asSuper();
  await db.exec(`insert into staff_invites (email, name, role) values ('boss@example.com', 'Boss', 'owner')`);
  await db.exec(`insert into auth.users (id, email) values ('${NEW_OWNER}', 'Boss@Example.com')`);
  const s = await one(`select name, role, is_active from staff where user_id = '${NEW_OWNER}'`);
  assert.deepEqual(s, { name: 'Boss', role: 'owner', is_active: true });
  assert.equal((await one(`select count(*)::int c from staff_invites`)).c, 0, 'invite is used up');
});
await test('an uninvited sign-up gets no staff row and no access', async () => {
  await asSuper();
  const id = '00000000-0000-0000-0000-0000000000b2';
  await db.exec(`insert into auth.users (id, email) values ('${id}', 'stranger@example.com')`);
  assert.equal((await one(`select count(*)::int c from staff where user_id = '${id}'`)).c, 0);
  await as('authenticated', id);
  assert.equal((await one('select count(*)::int c from orders')).c, 0);
  await rejects(one(`select public.admin_overview()`), /forbidden/);
});
await test('managers cannot read or create invites', async () => {
  await as('authenticated', MANAGER);
  assert.equal((await one('select count(*)::int c from staff_invites')).c, 0);
  await rejects(db.exec(`insert into staff_invites (email, name) values ('x@example.com', 'X')`), /row-level security/);
});
await test('staff can edit only the note and tracking number of an order', async () => {
  await asSuper();
  const o = await one(`select id, status, total from orders where status = 'new' limit 1`);
  await as('authenticated', MANAGER);
  await db.exec(`update orders set staff_note = 'called twice', tracking_no = 'BTS-1' where id = '${o.id}'`);
  await rejects(db.exec(`update orders set status = 'cancelled' where id = '${o.id}'`), /permission denied/);
  await rejects(db.exec(`update orders set total = 1 where id = '${o.id}'`), /permission denied/);
  await rejects(db.exec(`update orders set phone = '+998000000000' where id = '${o.id}'`), /permission denied/);
  await asSuper();
  const after = await one(`select status, total, staff_note, tracking_no from orders where id = '${o.id}'`);
  assert.equal(after.status, 'new');
  assert.equal(after.total, o.total);
  assert.equal(after.staff_note, 'called twice');
});
await test('order items and history cannot be edited from the browser', async () => {
  await as('authenticated', OWNER);
  await db.exec(`update order_items set qty = 99`);   // no update policy: matches no rows
  await db.exec(`delete from order_items`);
  await db.exec(`delete from order_events`);
  await asSuper();
  assert.ok((await one('select count(*)::int c from order_items')).c > 0, 'rows must still be there');
  assert.equal((await one('select count(*)::int c from order_items where qty = 99')).c, 0);
  assert.ok((await one('select count(*)::int c from order_events')).c > 0);
});

let saved;
const save = async (userId, payload) => {
  await as('authenticated', userId);
  return (await one('select public.admin_save_product($1::jsonb) as r', [JSON.stringify(payload)])).r;
};
const baseProduct = (extra = {}) => ({
  slug: 'new-balance-550-white-green', brand_name: 'New Balance', name: '550 “White Green”', colorway: 'White / Green',
  sku: 'BB550WT1', category: 'lifestyle', gender: 'unisex', price: 1290000, old_price: 1890000,
  description_ru: 'Классика', tags: ['nb', ' 550 ', ''], is_new: true, is_active: true,
  sizes: [{ eu: 40, us: 7, cm: 25, stock: 3 }, { eu: 41, us: 8, cm: 26, stock: 2 }],
  images: [{ path: 'products/a/one-1600.webp' }, { path: 'products/a/two-1600.webp' }],
  ...extra,
});
await test('manager creates a product: brand reused, sizes and ordered photos saved', async () => {
  saved = await save(MANAGER, baseProduct());
  await asSuper();
  const p = await one(`select p.*, b.name brand from products p join brands b on b.id = p.brand_id where p.id = $1`, [saved.id]);
  assert.equal(p.brand, 'New Balance');
  assert.equal((await one(`select count(*)::int c from brands where lower(name) = 'new balance'`)).c, 1, 'no duplicate brand');
  assert.deepEqual(p.tags, ['nb', '550']);
  assert.equal(p.old_price, 1890000);
  const imgs = await all('select path, sort, is_main from product_images where product_id = $1 order by sort', [saved.id]);
  assert.deepEqual(imgs.map((i) => [i.path, i.is_main]), [['products/a/one-1600.webp', true], ['products/a/two-1600.webp', false]]);
  assert.equal((await one('select count(*)::int c from product_sizes where product_id = $1', [saved.id])).c, 2);
});
await test('a new brand is created on the fly with a clean slug', async () => {
  const r = await save(MANAGER, baseProduct({ slug: 'hoka-clifton-9', brand_name: 'HOKA One One', name: 'Clifton 9' }));
  await asSuper();
  assert.equal((await one(`select b.slug from brands b join products p on p.brand_id = b.id where p.id = $1`, [r.id])).slug, 'hoka-one-one');
});
await test('editing keeps size rows (and stock unless one is given); removed sizes and photos go away', async () => {
  await asSuper();
  const before = await all('select id, eu from product_sizes where product_id = $1 order by eu', [saved.id]);
  const r = await save(MANAGER, baseProduct({
    id: saved.id, price: 1190000,
    sizes: [{ eu: 40, us: 7, cm: 25, stock: null }, { eu: 42, us: 9, cm: 27, stock: 5 }],   // 41 removed, 42 added
    images: [{ path: 'products/a/two-1600.webp' }, { path: 'products/a/three-1600.webp' }], // order changed, one gone, one new
  }));
  assert.equal(r.id, saved.id);
  await asSuper();
  const sizes = await all('select id, eu, stock from product_sizes where product_id = $1 order by eu', [saved.id]);
  assert.deepEqual(sizes.map((s) => [Number(s.eu), s.stock]), [[40, 3], [42, 5]], 'stock kept when null');
  assert.equal(sizes[0].id, before[0].id, 'same row — order history still points at it');
  const imgs = await all('select path, is_main from product_images where product_id = $1 order by sort', [saved.id]);
  assert.deepEqual(imgs.map((i) => [i.path, i.is_main]), [['products/a/two-1600.webp', true], ['products/a/three-1600.webp', false]]);
  assert.equal((await one('select price from products where id = $1', [saved.id])).price, 1190000);
});
await test('save is validated: slug, price, old price, size, stock, brand', async () => {
  await rejects(save(MANAGER, baseProduct({ slug: 'Bad Slug!' })), /invalid:slug/);
  await rejects(save(MANAGER, baseProduct({ slug: 'ok-slug', price: -1 })), /invalid:price/);
  await rejects(save(MANAGER, baseProduct({ slug: 'ok-slug', price: 100, old_price: 50 })), /invalid:old_price/);
  await rejects(save(MANAGER, baseProduct({ slug: 'ok-slug', sizes: [{ eu: 5, stock: 1 }] })), /invalid:size/);
  await rejects(save(MANAGER, baseProduct({ slug: 'ok-slug', sizes: [{ eu: 40, stock: -2 }] })), /invalid:stock/);
  await rejects(save(MANAGER, baseProduct({ slug: 'ok-slug', brand_name: '', brand_id: null })), /invalid:brand/);
  await rejects(save(MANAGER, baseProduct({ slug: 'ok-slug', gender: 'robots' })), /invalid:gender/);
  await rejects(save(MANAGER, baseProduct({ slug: 'old-skool-burgundy' })), /duplicate key|unique/);
  await asSuper();
  assert.equal((await one(`select count(*)::int c from products where slug = 'ok-slug'`)).c, 0, 'failed saves leave nothing behind');
});
await test('strangers and anonymous visitors cannot save products or read the overview', async () => {
  await rejects(save(STRANGER, baseProduct({ slug: 'sneaky' })), /forbidden/);
  await as('anon');
  await rejects(one(`select public.admin_save_product('{}'::jsonb)`), /permission denied/);
  await rejects(one(`select public.admin_overview()`), /permission denied/);
});
await test('admin_overview: counts, revenue (cancelled excluded) and low stock', async () => {
  await as('authenticated', MANAGER);
  const o = (await one('select public.admin_overview() as r')).r;
  assert.ok(o.by_status.new >= 1);
  assert.ok(o.by_status.cancelled >= 1);
  assert.ok(o.today_orders >= 1);
  assert.ok(o.low_stock.every((x) => x.stock <= 1));
  assert.ok(o.low_stock.some((x) => x.slug === 'air-max-1-sunset' && Number(x.eu) === 41 && x.stock === 0));
  await asSuper();
  const real = await one(`select coalesce(sum(total),0)::int s from orders where status <> 'cancelled'`);
  assert.ok(o.today_revenue > 0 && o.today_revenue <= real.s);
});
await test('activity log: staff edits are recorded with their name, server stock changes are not', async () => {
  await asSuper();
  await db.exec(`delete from activity_log`);
  await as('authenticated', MANAGER);
  await db.exec(`update products set price = 1250000 where id = '${saved.id}'`);
  await db.exec(`update product_sizes set stock = 9 where product_id = '${saved.id}' and eu = 40`);
  const spare = await one(`select p.slug, s.eu from product_sizes s join products p on p.id = s.product_id where s.stock >= 2 and p.is_active limit 1`);
  await as('service_role');
  await place(order([{ slug: spare.slug, size: Number(spare.eu), qty: 1 }], { customer: { name: 'L', phone: '+998906660000' } }));
  await asSuper();
  const log = await all('select * from activity_log order by created_at, id');
  const price = log.find((l) => l.entity === 'products');
  assert.equal(price.actor, 'Manager');
  assert.equal(price.action, 'update');
  assert.deepEqual(price.diff.changes.price, ['1190000', '1250000']);
  const stock = log.find((l) => l.entity === 'product_sizes');
  assert.deepEqual(stock.diff.changes.stock, ['3', '9']);
  assert.equal(Number(stock.diff.eu), 40);
  assert.equal(log.length, 2, 'placing an order must not add log noise');
});
await test('only the owner can read the activity log', async () => {
  await as('authenticated', MANAGER);
  assert.equal((await one('select count(*)::int c from activity_log')).c, 0);
  await as('authenticated', OWNER);
  assert.ok((await one('select count(*)::int c from activity_log')).c > 0);
});
await test('owner deletes a product: sizes and photos go with it, order history keeps its snapshot', async () => {
  await asSuper();
  const used = await one(`select p.id, i.name_snapshot from products p join order_items i on i.product_id = p.id limit 1`);
  await as('authenticated', OWNER);
  await db.exec(`delete from products where id = '${used.id}'`);
  await asSuper();
  assert.equal((await one(`select count(*)::int c from product_sizes where product_id = '${used.id}'`)).c, 0);
  const item = await one(`select product_id from order_items where name_snapshot = $1 limit 1`, [used.name_snapshot]);
  assert.equal(item.product_id, null, 'order line is kept, only the link is cleared');
});

console.log(`\n${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ''}\n`);
