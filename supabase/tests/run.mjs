// Database tests: applies the real migrations + seed to an in-memory Postgres
// (PGlite) with small stand-ins for Supabase's `auth` and `storage` schemas,
// then checks stock safety, on-order lines, pricing, promo rules, categories and who can see/do what.
//
//   cd supabase/tests && npm install && npm test
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const migrations = readdirSync(new URL('../migrations/', import.meta.url)).filter((n) => n.endsWith('.sql')).sort();

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
const standIns = (db) => db.exec(`
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
const defaultPrivileges = (db) => db.exec(`
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

const db = new PGlite();
await standIns(db);
await defaultPrivileges(db);
// every migration, in order — exactly what `supabase db push` applies
for (const f of migrations) await db.exec(read(`../migrations/${f}`));
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
const stockOf = async (slug, label) =>
  (await one(
    `select s.stock from product_sizes s join products p on p.id = s.product_id
     where p.slug = $1 and s.label = $2`, [slug, label])).stock;

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

// products used below (see supabase/seed.sql)
const POLO = 'lacoste-classic-fit-polo-black';          // 1 290 000 · S M L 3 · XL 1 · XXL sold out here, can be ordered
const POLO_GREY = 'lacoste-classic-fit-polo-grey';      // 1 290 000
const TEE = 'tommy-hilfiger-logo-crew-t-shirt-white';   //   590 000 · every size 3
const TEE_BLACK = 'tommy-hilfiger-logo-crew-t-shirt-black';
const DENIM = 'gant-denim-jacket-blue';                 // 2 290 000 · XXL sold out for good (cannot be ordered)
const JACKET = 'diesel-leather-biker-jacket-black';     // 5 900 000 · every size only on order
const JEANS = 'diesel-slim-tapered-jeans-black';        // 1 590 000
const BELT = 'boss-leather-belt-black';                 //   890 000 · 90 sold out for good, others 3
const BELT_BROWN = 'boss-leather-belt-brown';
const CAP = 'lacoste-cotton-twill-cap-white';           //   590 000 · ONE SIZE 3
const BACKPACK = 'tommy-hilfiger-commuter-backpack-black'; // 1 290 000 · ONE SIZE 1
const TIE = 'boss-silk-tie-navy';

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
await test('seed loaded 27 products / 118 sizes / 20 categories', async () => {
  await asSuper();
  assert.equal((await one('select count(*)::int c from products')).c, 27);
  assert.equal((await one('select count(*)::int c from product_sizes')).c, 118);
  assert.equal((await one('select count(*)::int c from categories')).c, 20);
  assert.equal((await one('select count(distinct style_code)::int c from products where style_code is not null')).c, 21,
    'colours of one item share a style code');
});
await test('seed is idempotent', async () => {
  await db.exec(read('../seed.sql'));
  assert.equal((await one('select count(*)::int c from products')).c, 27);
  assert.equal((await one('select count(*)::int c from product_images')).c, 50);
  assert.equal((await one('select count(*)::int c from product_sizes')).c, 118);
});
await test('every product is in a category that exists and every category has a valid size system', async () => {
  await asSuper();
  assert.equal((await one(`select count(*)::int c from products p left join categories c on c.slug = p.category where c.slug is null`)).c, 0);
  assert.equal((await one(`select count(*)::int c from categories where department not in ('clothing','shoes','accessories')`)).c, 0);
});

console.log('\nVisitors (anon)');
await test('can read active products, sizes, images, categories and public settings', async () => {
  await as('anon');
  assert.equal((await one('select count(*)::int c from products')).c, 27);
  assert.equal((await one('select count(*)::int c from product_sizes')).c, 118);
  assert.equal((await one('select count(*)::int c from categories')).c, 20);
  assert.equal((await one('select count(*)::int c from settings')).c, 2);
});
await test('cannot see hidden products or hidden categories', async () => {
  await asSuper();
  await db.exec(`update products set is_active = false where slug = '${TIE}'`);
  await db.exec(`update categories set is_active = false where slug = 'sunglasses'`);
  await as('anon');
  assert.equal((await one(`select count(*)::int c from products where slug = '${TIE}'`)).c, 0);
  assert.equal((await one(`select count(*)::int c from product_sizes s join products p on p.id=s.product_id`)).c, 117);
  assert.equal((await one(`select count(*)::int c from categories`)).c, 19);
  await as('authenticated', MANAGER);
  assert.equal((await one(`select count(*)::int c from categories`)).c, 20, 'staff still see hidden categories');
  await asSuper();
  await db.exec(`update products set is_active = true where slug = '${TIE}'`);
  await db.exec(`update categories set is_active = true where slug = 'sunglasses'`);
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
await test('cannot write products, categories, orders or stock directly', async () => {
  await asSuper();
  const before = (await one('select sum(stock)::int s from product_sizes')).s;
  await as('anon');
  await db.exec(`update products set price = 1`); // RLS: matches no rows, changes nothing
  await db.exec(`update categories set name_en = 'hacked'`);
  await asSuper();
  assert.equal((await one(`select count(*)::int c from products where price = 1`)).c, 0);
  assert.equal((await one(`select count(*)::int c from categories where name_en = 'hacked'`)).c, 0);
  await as('anon');
  await rejects(
    db.exec(`insert into orders (number, customer_name, phone, delivery_method, payment_method, subtotal, total)
             values ('X', 'a', '1', 'x', 'x', 1, 1)`),
    /row-level security|permission denied/, 'insert order');
  await rejects(db.exec(`insert into categories (slug, department, name_ru, name_uz, name_en) values ('x', 'shoes', 'x', 'x', 'x')`),
    /row-level security|permission denied/, 'insert category');
  await asSuper();
  assert.equal((await one('select sum(stock)::int s from product_sizes')).s, before, 'stock untouched');
});
await test('cannot call place_order or set_order_status', async () => {
  await as('anon');
  await rejects(
    one(`select public.place_order('{}'::jsonb)`), /permission denied/, 'place_order');
  await rejects(
    one(`select public.set_order_status(gen_random_uuid(), 'confirmed')`), /permission denied/, 'set_order_status');
});

console.log('\nTable rules');
await test('size labels, colours and the other product fields are checked by the database', async () => {
  await asSuper();
  const pid = (await one(`select id from products where slug = '${TIE}'`)).id;
  for (const bad of ['', 'bad label!', 'WAY TOO LONG LABEL', '-1', 'a|b']) {
    await rejects(db.exec(`insert into product_sizes (product_id, label) values ('${pid}', '${bad}')`), /product_sizes_label_format|check/, `label "${bad}"`);
  }
  await rejects(db.exec(`insert into product_sizes (product_id, label) values ('${pid}', 'ONE SIZE')`), /duplicate key|unique/, 'same label twice');
  await db.exec(`insert into product_sizes (product_id, label) values ('${pid}', 'W32/L34'), ('${pid}', '42.5')`);
  await db.exec(`delete from product_sizes where product_id = '${pid}' and label in ('W32/L34', '42.5')`);
  for (const col of [`color_hex = 'blue'`, `color_group = 'pink'`, `fit = 'tight'`, `origin = 'France'`, `style_code = 'a b'`,
                     `order_lead = 'soon'`, `category = 'running'`]) {
    await rejects(db.exec(`update products set ${col} where id = '${pid}'`), /check|foreign key/, col);
  }
});

console.log('\nPlacing orders (server / service role)');
let first;
await test('prices come from the database; stock decreases', async () => {
  await as('service_role');
  first = await place(order([{ slug: POLO, size: 'M', qty: 2, price: 1 }]));
  assert.match(first.number, /^OL-\d{6}-\d{4}$/);
  assert.equal(first.subtotal, 2 * 1290000, 'client price must be ignored');
  assert.equal(first.delivery_fee, 0, '2.58M is above the free-delivery threshold');
  assert.equal(first.total, 2 * 1290000);
  assert.equal(first.items[0].fulfilment, 'stock');
  assert.equal(first.items[0].size_label, 'M');
  await asSuper();
  assert.equal(await stockOf(POLO, 'M'), 1);
  const ev = await all('select * from order_events where order_id = $1', [first.order_id]);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].to_status, 'new');
  const items = await all('select * from order_items where order_id = $1', [first.order_id]);
  assert.equal(items[0].name_snapshot, 'Classic Fit Polo');
  assert.equal(items[0].brand_snapshot, 'Lacoste');
  assert.equal(items[0].size_label, 'M');
  assert.equal(items[0].fulfilment, 'stock');
});
await test('not enough here: the line is ordered from abroad and the stock stays untouched', async () => {
  await as('service_role');
  // XL has 1 left; asking for 2 cannot be served from the stock here
  const r = await place(order([{ slug: POLO, size: 'XL', qty: 2 }], { customer: { name: 'Ord', phone: '+998901110001' } }));
  assert.equal(r.items[0].fulfilment, 'order');
  // XXL is sold out here but can be ordered
  const r2 = await place(order([{ slug: POLO, size: 'XXL', qty: 1 }], { customer: { name: 'Ord', phone: '+998901110002' } }));
  assert.equal(r2.items[0].fulfilment, 'order');
  assert.equal(r2.total, 1290000 + 30000, 'ordered lines cost the same');
  await asSuper();
  assert.equal(await stockOf(POLO, 'XL'), 1, 'stock is not taken for a line ordered from abroad');
  assert.equal(await stockOf(POLO, 'XXL'), 0);
});
await test('the last piece goes to the first buyer, the second one orders it from abroad', async () => {
  await as('service_role');
  const a = await place(order([{ slug: BACKPACK, size: 'ONE SIZE', qty: 1 }], { customer: { name: 'A', phone: '+998901110003' } }));
  const b = await place(order([{ slug: BACKPACK, size: 'ONE SIZE', qty: 1 }], { customer: { name: 'B', phone: '+998901110004' } }));
  assert.equal(a.items[0].fulfilment, 'stock');
  assert.equal(b.items[0].fulfilment, 'order');
  await asSuper();
  assert.equal(await stockOf(BACKPACK, 'ONE SIZE'), 0, 'never negative');
});
await test('a size that cannot be ordered is refused when nothing is left, and nothing changes', async () => {
  await asSuper();
  await db.exec(`update product_sizes set stock = 1, orderable = false
                 where label = 'ONE SIZE' and product_id = (select id from products where slug = '${CAP}')`);
  await as('service_role');
  await place(order([{ slug: CAP, size: 'ONE SIZE', qty: 1 }], { customer: { name: 'C', phone: '+998901110005' } }));
  await rejects(place(order([{ slug: CAP, size: 'ONE SIZE', qty: 1 }])), /out_of_stock:lacoste-cotton-twill-cap-white:ONE SIZE/);
  await rejects(place(order([{ slug: DENIM, size: 'XXL', qty: 1 }])), /out_of_stock:gant-denim-jacket-blue:XXL/);
  await asSuper();
  assert.equal(await stockOf(CAP, 'ONE SIZE'), 0);
  await db.exec(`update product_sizes set stock = 3, orderable = true
                 where label = 'ONE SIZE' and product_id = (select id from products where slug = '${CAP}')`);
});
await test('one refused line rolls back the whole order (no partial stock loss)', async () => {
  await asSuper();
  await db.exec(`update product_sizes set orderable = false where label = '90' and product_id = (select id from products where slug = '${BELT}')`);
  await as('service_role');
  await rejects(
    place(order([{ slug: TEE, size: 'M', qty: 1 }, { slug: BELT, size: '90', qty: 1 }])), /out_of_stock/);
  await asSuper();
  assert.equal(await stockOf(TEE, 'M'), 3);
});
await test('unknown product / size / hidden product are refused', async () => {
  await as('service_role');
  await rejects(place(order([{ slug: 'nope', size: 'M', qty: 1 }])), /unavailable:nope/);
  await rejects(place(order([{ slug: TEE, size: '3XL', qty: 1 }])), /unavailable:tommy-hilfiger-logo-crew-t-shirt-white:3XL/);
  await asSuper();
  await db.exec(`update products set is_active = false where slug = '${TEE}'`);
  await as('service_role');
  await rejects(place(order([{ slug: TEE, size: 'M', qty: 1 }])), /unavailable:tommy-hilfiger-logo-crew-t-shirt-white/);
  await asSuper();
  await db.exec(`update products set is_active = true where slug = '${TEE}'`);
});
await test('validation: phone, name, qty, items, size label, delivery method', async () => {
  await as('service_role');
  const item = [{ slug: TEE, size: 'M', qty: 1 }];
  await rejects(place(order(item, { customer: { name: 'A', phone: 'abc' } })), /invalid:phone/);
  await rejects(place(order(item, { customer: { name: '', phone: '+998901234567' } })), /invalid:name/);
  await rejects(place(order([{ slug: TEE, size: 'M', qty: 0 }])), /invalid:qty/);
  await rejects(place(order([{ slug: TEE, size: 'M', qty: 99 }])), /invalid:qty/);
  await rejects(place(order([])), /invalid:items/);
  await rejects(place(order([{ slug: TEE, size: 'M!', qty: 1 }])), /invalid:items/);
  await rejects(place(order([{ slug: TEE, qty: 1 }])), /invalid:items/);
  await rejects(place(order([{ size: 'M', qty: 1 }])), /invalid:items/);
  await rejects(place(order(item, { delivery: { method: 'teleport' } })), /invalid:delivery/);
});
await test('free delivery above the threshold; pickup is free', async () => {
  await as('service_role');
  const big = await place(order([{ slug: JEANS, size: '32', qty: 1 }]));          // 1 590 000 ≥ 1 500 000
  assert.equal(big.delivery_fee, 0);
  const pick = await place(order([{ slug: TEE, size: 'L', qty: 1 }], { delivery: { method: 'pickup' } }));
  assert.equal(pick.delivery_fee, 0);
  const regions = await place(order([{ slug: TEE, size: 'XL', qty: 1 }], { delivery: { method: 'regions' } }));
  assert.equal(regions.delivery_fee, 50000);
  const courier = await place(order([{ slug: TEE, size: 'XXL', qty: 1 }]));
  assert.equal(courier.delivery_fee, 30000);
  assert.equal(courier.total, 590000 + 30000);
});
await test('duplicate lines are merged before the stock check', async () => {
  await as('service_role');
  const r = await place(order([{ slug: TEE_BLACK, size: 'S', qty: 2 }, { slug: TEE_BLACK, size: 'S', qty: 2 }],
    { customer: { name: 'M', phone: '+998901110006' } }));
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].qty, 4);
  assert.equal(r.items[0].fulfilment, 'order', '4 is more than the 3 in stock');
  assert.equal(r.subtotal, 4 * 590000);
  await asSuper();
  assert.equal(await stockOf(TEE_BLACK, 'S'), 3);
});

console.log('\nPromo codes');
await test('percent code applies, counts usage, respects min order', async () => {
  await asSuper();
  await db.exec(`insert into promo_codes (code, type, value, min_order, usage_limit, per_phone_limit)
                 values ('LOUNGE10', 'percent', 10, 500000, 2, 1)`);
  await as('service_role');
  const r = await place(order([{ slug: TEE, size: 'S', qty: 1 }], { promo_code: 'lounge10' }));
  assert.equal(r.discount, 59000);
  assert.equal(r.total, 590000 - 59000 + 30000);
  await asSuper();
  assert.equal((await one(`select used_count from promo_codes where code = 'LOUNGE10'`)).used_count, 1);
});
await test('per-phone limit, unknown code and min order are refused', async () => {
  await as('service_role');
  await rejects(place(order([{ slug: TEE, size: 'S', qty: 1 }], { promo_code: 'LOUNGE10' })), /invalid:promo/, 'same phone twice');
  await rejects(place(order([{ slug: TEE, size: 'M', qty: 1 }], { promo_code: 'NOPE' })), /invalid:promo/, 'unknown');
  await asSuper();
  await db.exec(`update promo_codes set min_order = 5000000 where code = 'LOUNGE10'`);
  await as('service_role');
  await rejects(place(order([{ slug: TEE, size: 'M', qty: 1 }],
    { customer: { name: 'B', phone: '+998909999999' }, promo_code: 'LOUNGE10' })), /invalid:promo/, 'min order');
});

console.log('\nQuote + quick order (cart preview)');
const quote = async (payload) => (await one('select public.quote_order($1::jsonb) as r', [JSON.stringify(payload)])).r;
await test('quote never changes stock and matches what place_order charges', async () => {
  await asSuper();
  const before = await stockOf(POLO_GREY, 'M');
  await as('service_role');
  const items = [{ slug: POLO_GREY, size: 'M', qty: 2 }];
  const q = await quote({ items, delivery: { method: 'courier_tashkent' } });
  await asSuper();
  assert.equal(await stockOf(POLO_GREY, 'M'), before, 'quote must not take stock');
  await as('service_role');
  const placed = await place(order(items, { customer: { name: 'Q', phone: '+998901110000' } }));
  for (const k of ['subtotal', 'discount', 'delivery_fee', 'total']) assert.equal(q[k], placed[k], k);
  assert.equal(q.lines[0].unit_price, 1290000);
  assert.equal(q.lines[0].fulfilment, 'stock');
});
await test('quote defaults to courier delivery and reports promo problems', async () => {
  await asSuper();
  await db.exec(`insert into promo_codes (code, type, value, min_order) values ('FIX50', 'fixed', 50000, 0)`);
  await as('service_role');
  const q = await quote({ items: [{ slug: TEE, size: 'M', qty: 1 }], promo_code: 'fix50' });
  assert.equal(q.discount, 50000);
  assert.equal(q.delivery_fee, 30000);
  assert.equal(q.promo_code, 'FIX50');
  await rejects(quote({ items: [{ slug: TEE, size: 'M', qty: 1 }], promo_code: 'WRONG' }), /invalid:promo/);
  await rejects(quote({ items: [{ slug: TEE, size: 'M', qty: 50 }] }), /invalid:qty/);
});
await test('quote tells which lines are ordered from abroad, and reports sizes that cannot be bought', async () => {
  await as('service_role');
  const q = await quote({ items: [{ slug: JACKET, size: 'M', qty: 1 }, { slug: TEE, size: 'M', qty: 1 }] });
  assert.deepEqual(q.lines.map((l) => l.fulfilment).sort(), ['order', 'stock']);
  await rejects(quote({ items: [{ slug: DENIM, size: 'XXL', qty: 1 }] }), /out_of_stock:gant-denim-jacket-blue:XXL/);
});
await test('quote does not use up a promo code', async () => {
  await asSuper();
  const before = (await one(`select used_count from promo_codes where code = 'FIX50'`)).used_count;
  await as('service_role');
  await quote({ items: [{ slug: TEE, size: 'M', qty: 1 }], promo_code: 'FIX50' });
  await asSuper();
  assert.equal((await one(`select used_count from promo_codes where code = 'FIX50'`)).used_count, before);
});
await test('quick order: "callback" delivery has no fee and needs no address', async () => {
  await as('service_role');
  const r = await place({
    customer: { name: 'Quick', phone: '+998905550000', contact_pref: 'call' },
    delivery: { method: 'callback' },
    payment: 'tbd',
    items: [{ slug: BELT_BROWN, size: '100', qty: 1 }],
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
  target = await place(order([{ slug: BELT, size: '95', qty: 2 }],
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
  assert.equal(await stockOf(BELT, '95'), 1);
  await as('authenticated', OWNER);
  await one(`select public.set_order_status($1, 'cancelled')`, [target.order_id]);
  await asSuper();
  assert.equal(await stockOf(BELT, '95'), 3);
  await as('authenticated', OWNER);
  await rejects(one(`select public.set_order_status($1, 'confirmed')`, [target.order_id]), /order_cancelled/);
});
await test('cancelling a mixed order returns only the stock that was taken here', async () => {
  await as('service_role');
  const mixed = await place(order([{ slug: BELT, size: '100', qty: 1 }, { slug: JACKET, size: 'M', qty: 1 }],
    { customer: { name: 'Mix', phone: '+998901110007' } }));
  assert.deepEqual(mixed.items.map((l) => l.fulfilment).sort(), ['order', 'stock']);
  await asSuper();
  assert.equal(await stockOf(BELT, '100'), 2);
  assert.equal(await stockOf(JACKET, 'M'), 0);
  await as('authenticated', OWNER);
  await one(`select public.set_order_status($1, 'cancelled')`, [mixed.order_id]);
  await asSuper();
  assert.equal(await stockOf(BELT, '100'), 3, 'the stock line is returned');
  assert.equal(await stockOf(JACKET, 'M'), 0, 'the ordered line never had stock, so none appears');
});
await test('cancelling an order that used a promo gives the use back', async () => {
  await asSuper();
  await db.exec(`update promo_codes set min_order = 0, per_phone_limit = null, usage_limit = 5 where code = 'LOUNGE10'`);
  await as('service_role');
  const o = await place(order([{ slug: TEE, size: 'L', qty: 1 }],
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
  await db.exec(`update products set price = 1234567 where slug = 'no-such-product'`); // no row, no error
  await db.exec(`update products set is_new = true where slug = '${BELT_BROWN}'`);
  assert.equal((await one(`select is_new from products where slug='${BELT_BROWN}'`)).is_new, true);
  await db.exec(`delete from products where slug = '${BELT_BROWN}'`);
  assert.equal((await one(`select count(*)::int c from products where slug='${BELT_BROWN}'`)).c, 1, 'manager delete must do nothing');
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
                 select 'temp-product', id, 'Temp', 'polos', 1 from brands limit 1`);
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

console.log('\nCategories (owner-managed)');
await test('only the owner can add, rename, hide, reorder and delete categories', async () => {
  await as('authenticated', MANAGER);
  await rejects(db.exec(`insert into categories (slug, department, name_ru, name_uz, name_en) values ('scarves', 'accessories', 'Шарфы', 'Sharflar', 'Scarves')`),
    /row-level security/, 'manager insert');
  await db.exec(`update categories set name_en = 'Hacked' where slug = 'belts'`);   // matches no rows
  await db.exec(`delete from categories where slug = 'sunglasses'`);                // matches no rows
  await asSuper();
  assert.equal((await one(`select name_en from categories where slug = 'belts'`)).name_en, 'Belts');
  assert.equal((await one(`select count(*)::int c from categories where slug = 'sunglasses'`)).c, 1);
  await as('authenticated', OWNER);
  await db.exec(`insert into categories (slug, department, name_ru, name_uz, name_en, size_system, sort)
                 values ('scarves', 'accessories', 'Шарфы', 'Sharflar', 'Scarves', 'one', 21)`);
  await db.exec(`update categories set sort = 5, is_active = false where slug = 'scarves'`);
  await rejects(db.exec(`insert into categories (slug, department, name_ru, name_uz, name_en) values ('Bad Slug', 'shoes', 'x', 'x', 'x')`), /check/, 'slug format');
  await rejects(db.exec(`insert into categories (slug, department, name_ru, name_uz, name_en) values ('hats', 'toys', 'x', 'x', 'x')`), /check/, 'department');
  await rejects(db.exec(`insert into categories (slug, department, name_ru, name_uz, name_en, size_system) values ('hats', 'accessories', 'x', 'x', 'x', 'huge')`), /check/, 'size system');
  await db.exec(`delete from categories where slug = 'scarves'`);
  assert.equal((await one(`select count(*)::int c from categories where slug = 'scarves'`)).c, 0);
});
await test('a category that still has products cannot be deleted; renaming its slug moves the products along', async () => {
  await as('authenticated', OWNER);
  await rejects(db.exec(`delete from categories where slug = 'polos'`), /foreign key|violates/);
  await db.exec(`update categories set slug = 'polo-shirts' where slug = 'polos'`);
  assert.equal((await one(`select count(*)::int c from products where category = 'polo-shirts'`)).c, 2);
  await db.exec(`update categories set slug = 'polos' where slug = 'polo-shirts'`);
  assert.equal((await one(`select count(*)::int c from products where category = 'polos'`)).c, 2);
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
  slug: 'lacoste-classic-fit-polo-navy', brand_name: 'lacoste', name: 'Classic Fit Polo', color: 'Navy',
  color_hex: '#1F2A44', color_group: 'navy', style_code: 'LC-L1212', sku: 'L1212-166',
  category: 'polos', price: 1290000, old_price: 1590000,
  origin: 'fr', material: '100% cotton petit piqué', fit: 'regular', model_info: 'Model is 186 cm and wears M', order_lead: '10–18',
  description_ru: 'Классика', tags: ['lacoste', ' polo ', ''], is_new: true, is_active: true,
  sizes: [{ label: 'M', stock: 3 }, { label: 'L', stock: 2, orderable: false }],
  images: [{ path: 'products/a/one-1600.webp' }, { path: 'products/a/two-1600.webp' }],
  ...extra,
});
await test('manager creates a product: brand reused, fields normalised, sizes and ordered photos saved', async () => {
  saved = await save(MANAGER, baseProduct());
  await asSuper();
  const p = await one(`select p.*, b.name brand from products p join brands b on b.id = p.brand_id where p.id = $1`, [saved.id]);
  assert.equal(p.brand, 'Lacoste');
  assert.equal((await one(`select count(*)::int c from brands where lower(name) = 'lacoste'`)).c, 1, 'no duplicate brand');
  assert.deepEqual(p.tags, ['lacoste', 'polo']);
  assert.equal(p.old_price, 1590000);
  assert.deepEqual([p.color, p.color_hex, p.color_group, p.style_code, p.origin, p.fit, p.order_lead],
    ['Navy', '#1F2A44', 'navy', 'LC-L1212', 'FR', 'regular', '10–18']);
  const imgs = await all('select path, sort, is_main from product_images where product_id = $1 order by sort', [saved.id]);
  assert.deepEqual(imgs.map((i) => [i.path, i.is_main]), [['products/a/one-1600.webp', true], ['products/a/two-1600.webp', false]]);
  const sizes = await all('select label, sort, stock, orderable from product_sizes where product_id = $1 order by sort', [saved.id]);
  assert.deepEqual(sizes, [{ label: 'M', sort: 0, stock: 3, orderable: true }, { label: 'L', sort: 1, stock: 2, orderable: false }]);
  assert.equal((await one(`select count(*)::int c from products where style_code = 'LC-L1212'`)).c, 3, 'three colours of one polo share the style code');
});
await test('a new brand is created on the fly with a clean slug', async () => {
  const r = await save(MANAGER, baseProduct({ slug: 'brunello-cucinelli-cashmere-polo', brand_name: 'Brunello Cucinelli', name: 'Cashmere Polo', style_code: null }));
  await asSuper();
  assert.equal((await one(`select b.slug from brands b join products p on p.brand_id = b.id where p.id = $1`, [r.id])).slug, 'brunello-cucinelli');
});
await test('editing keeps size rows (and stock unless one is given); removed sizes and photos go away; the list order is the display order', async () => {
  await asSuper();
  const before = await all('select id, label from product_sizes where product_id = $1 order by sort', [saved.id]);
  const r = await save(MANAGER, baseProduct({
    id: saved.id, price: 1190000,
    sizes: [{ label: 'XL', stock: 5 }, { label: 'M', stock: null }],                         // L removed, XL added first
    images: [{ path: 'products/a/two-1600.webp' }, { path: 'products/a/three-1600.webp' }], // order changed, one gone, one new
  }));
  assert.equal(r.id, saved.id);
  await asSuper();
  const sizes = await all('select id, label, sort, stock from product_sizes where product_id = $1 order by sort', [saved.id]);
  assert.deepEqual(sizes.map((s) => [s.label, s.sort, s.stock]), [['XL', 0, 5], ['M', 1, 3]], 'stock kept when null');
  assert.equal(sizes[1].id, before.find((s) => s.label === 'M').id, 'same row — order history still points at it');
  const imgs = await all('select path, is_main from product_images where product_id = $1 order by sort', [saved.id]);
  assert.deepEqual(imgs.map((i) => [i.path, i.is_main]), [['products/a/two-1600.webp', true], ['products/a/three-1600.webp', false]]);
  assert.equal((await one('select price from products where id = $1', [saved.id])).price, 1190000);
});
await test('save is validated: slug, price, old price, size label, stock, brand, category and the product fields', async () => {
  const bad = (extra) => baseProduct({ slug: 'ok-slug', ...extra });
  await rejects(save(MANAGER, baseProduct({ slug: 'Bad Slug!' })), /invalid:slug/);
  await rejects(save(MANAGER, bad({ price: -1 })), /invalid:price/);
  await rejects(save(MANAGER, bad({ price: 100, old_price: 50 })), /invalid:old_price/);
  await rejects(save(MANAGER, bad({ sizes: [{ label: 'M!', stock: 1 }] })), /invalid:size/);
  await rejects(save(MANAGER, bad({ sizes: [{ label: '', stock: 1 }] })), /invalid:size/);
  await rejects(save(MANAGER, bad({ sizes: [{ label: 'M' }, { label: 'M' }] })), /invalid:size/);
  await rejects(save(MANAGER, bad({ sizes: [{ label: 'M', stock: -2 }] })), /invalid:stock/);
  await rejects(save(MANAGER, bad({ brand_name: '', brand_id: null })), /invalid:brand/);
  await rejects(save(MANAGER, bad({ category: 'running' })), /invalid:category/);
  await rejects(save(MANAGER, bad({ category: null })), /invalid:category/);
  await rejects(save(MANAGER, bad({ color_hex: 'navy' })), /invalid:color_hex/);
  await rejects(save(MANAGER, bad({ color_group: 'pink' })), /invalid:color_group/);
  await rejects(save(MANAGER, bad({ style_code: 'a b' })), /invalid:style_code/);
  await rejects(save(MANAGER, bad({ origin: 'FRA' })), /invalid:origin/);
  await rejects(save(MANAGER, bad({ fit: 'tight' })), /invalid:fit/);
  await rejects(save(MANAGER, bad({ order_lead: 'soon' })), /invalid:order_lead/);
  await rejects(save(MANAGER, bad({ material: 'x'.repeat(161) })), /invalid:text/);
  await rejects(save(MANAGER, baseProduct({ slug: TIE })), /duplicate key|unique/);
  await asSuper();
  assert.equal((await one(`select count(*)::int c from products where slug = 'ok-slug'`)).c, 0, 'failed saves leave nothing behind');
});
await test('strangers and anonymous visitors cannot save products or read the overview', async () => {
  await rejects(save(STRANGER, baseProduct({ slug: 'sneaky' })), /forbidden/);
  await as('anon');
  await rejects(one(`select public.admin_save_product('{}'::jsonb)`), /permission denied/);
  await rejects(one(`select public.admin_overview()`), /permission denied/);
});
await test('admin_overview: counts, revenue (cancelled excluded), low stock and lines still to buy abroad', async () => {
  await as('authenticated', MANAGER);
  const o = (await one('select public.admin_overview() as r')).r;
  assert.ok(o.by_status.new >= 1);
  assert.ok(o.by_status.cancelled >= 1);
  assert.ok(o.today_orders >= 1);
  assert.ok(o.low_stock.every((x) => x.stock <= 1));
  const bp = o.low_stock.find((x) => x.slug === BACKPACK);
  assert.ok(bp && bp.label === 'ONE SIZE' && bp.stock === 0 && bp.orderable === true, 'sold-out sizes show their label and whether they can be ordered');
  assert.ok(o.to_source >= 4, 'open orders with lines ordered from abroad are counted (the merged tee order alone has 4 pieces)');
  await asSuper();
  const real = await one(`select coalesce(sum(total),0)::int s from orders where status <> 'cancelled'`);
  assert.ok(o.today_revenue > 0 && o.today_revenue <= real.s);
});
await test('activity log: staff edits are recorded with their name, server stock changes are not', async () => {
  await asSuper();
  await db.exec(`delete from activity_log`);
  await as('authenticated', MANAGER);
  await db.exec(`update products set price = 1250000 where id = '${saved.id}'`);
  await db.exec(`update product_sizes set stock = 9 where product_id = '${saved.id}' and label = 'M'`);
  const spare = await one(`select p.slug, s.label from product_sizes s join products p on p.id = s.product_id where s.stock >= 2 and p.is_active limit 1`);
  await as('service_role');
  await place(order([{ slug: spare.slug, size: spare.label, qty: 1 }], { customer: { name: 'L', phone: '+998906660000' } }));
  await asSuper();
  const log = await all('select * from activity_log order by created_at, id');
  const price = log.find((l) => l.entity === 'products');
  assert.equal(price.actor, 'Manager');
  assert.equal(price.action, 'update');
  assert.deepEqual(price.diff.changes.price, ['1190000', '1250000']);
  const stock = log.find((l) => l.entity === 'product_sizes');
  assert.deepEqual(stock.diff.changes.stock, ['3', '9']);
  assert.equal(stock.diff.size, 'M');
  assert.equal(stock.diff.label, 'Size M');
  assert.equal(log.length, 2, 'placing an order must not add log noise');
});
await test('category edits are recorded for the owner', async () => {
  await asSuper();
  await db.exec(`delete from activity_log`);
  await as('authenticated', OWNER);
  await db.exec(`update categories set name_en = 'Neckties' where slug = 'ties'`);
  await asSuper();
  const c = await one(`select * from activity_log where entity = 'categories'`);
  assert.equal(c.actor, 'Owner');
  assert.equal(c.entity_id, 'ties');
  assert.deepEqual(c.diff.changes.name_en, ['Ties', 'Neckties']);
  await db.exec(`update categories set name_en = 'Ties' where slug = 'ties'`);
});
await test('only the owner can read the activity log', async () => {
  await as('authenticated', MANAGER);
  assert.equal((await one('select count(*)::int c from activity_log')).c, 0);
  await as('authenticated', OWNER);
  assert.ok((await one('select count(*)::int c from activity_log')).c > 0);
});
await test('owner deletes a product: sizes and photos go with it, order history keeps its snapshot', async () => {
  await asSuper();
  const used = await one(`select p.id, i.id as item_id from products p join order_items i on i.product_id = p.id limit 1`);
  await as('authenticated', OWNER);
  await db.exec(`delete from products where id = '${used.id}'`);
  await asSuper();
  assert.equal((await one(`select count(*)::int c from product_sizes where product_id = '${used.id}'`)).c, 0);
  const item = await one(`select product_id from order_items where id = $1`, [used.item_id]);
  assert.equal(item.product_id, null, 'order line is kept, only the link is cleared');
});

console.log('\nAdmin panel phase 5: usernames, owner guard, reports');
await test('usernames are validated and unique', async () => {
  await asSuper();
  await db.exec(`update staff set username = 'malika' where user_id = '${MANAGER}'`);
  await rejects(db.exec(`update staff set username = 'malika' where user_id = '${OWNER}'`), /duplicate key|unique/);
  await rejects(db.exec(`update staff set username = 'Bad Name' where user_id = '${OWNER}'`), /staff_username_format|check/);
  await rejects(db.exec(`update staff set username = 'ab' where user_id = '${OWNER}'`), /staff_username_format|check/);
  await db.exec(`update staff set username = 'owner' where user_id = '${OWNER}'`);
});
await test('the last active owner cannot be demoted, deactivated or deleted', async () => {
  await asSuper();
  await db.exec(`update staff set is_active = false where user_id = '${NEW_OWNER}'`); // another owner remains: fine
  await rejects(db.exec(`update staff set is_active = false where user_id = '${OWNER}'`), /last_owner/);
  await rejects(db.exec(`update staff set role = 'manager' where user_id = '${OWNER}'`), /last_owner/);
  await rejects(db.exec(`delete from staff where user_id = '${OWNER}'`), /last_owner/);
  await db.exec(`update staff set is_active = true where user_id = '${NEW_OWNER}'`);
  await db.exec(`update staff set role = 'manager' where user_id = '${NEW_OWNER}'`); // allowed again: OWNER stays
  await db.exec(`update staff set role = 'owner' where user_id = '${NEW_OWNER}'`);
});
await test('touch_login records the sign-in for staff only and is not logged as a change', async () => {
  await asSuper();
  await db.exec(`delete from activity_log`);
  await as('authenticated', MANAGER);
  await db.exec(`select public.touch_login()`);
  await asSuper();
  assert.ok((await one(`select last_login from staff where user_id = '${MANAGER}'`)).last_login);
  assert.equal((await one(`select count(*)::int c from activity_log`)).c, 0, 'sign-ins are not activity');
  await as('anon');
  await rejects(one(`select public.touch_login()`), /permission denied/);
});
await test('promo, settings and staff changes are recorded with the actor', async () => {
  await asSuper();
  await db.exec(`delete from activity_log`);
  await as('authenticated', OWNER);
  await db.exec(`update promo_codes set value = 15 where code = 'FIX50'`);
  await db.exec(`update settings set value = jsonb_set(value, '{free_threshold}', '1200000') where key = 'delivery'`);
  await db.exec(`update staff set is_active = false where user_id = '${MANAGER}'`);
  await db.exec(`update staff set is_active = true where user_id = '${MANAGER}'`);
  await asSuper();
  const log = await all(`select * from activity_log order by created_at, id`);
  const promo = log.find((l) => l.entity === 'promo_codes');
  assert.equal(promo.actor, 'Owner');
  assert.equal(promo.diff.label, 'FIX50');
  assert.deepEqual(promo.diff.changes.value, ['50000', '15']);
  const setting = log.find((l) => l.entity === 'settings');
  assert.equal(setting.entity_id, 'delivery');
  assert.ok('value' in setting.diff.changes);
  assert.equal(log.filter((l) => l.entity === 'staff').length, 2);
  await db.exec(`update settings set value = jsonb_set(value, '{free_threshold}', '1500000') where key = 'delivery'`);
});

await test('overview: 30 days to today, best sellers, and a manager can read it', async () => {
  await as('authenticated', MANAGER);
  const o = (await one('select public.admin_overview() as r')).r;
  assert.equal(o.daily.length, 30);
  const days = o.daily.map((d) => d.day);
  assert.deepEqual([...days].sort(), days, 'oldest first');
  await asSuper();
  const today = (await one(`select (timezone('Asia/Tashkent', now()))::date::text as d`)).d;
  assert.equal(days.at(-1), today);
  assert.ok(o.daily.at(-1).orders >= 1);
  assert.ok(o.top_products.length >= 1 && o.top_products.length <= 5);
  const qty = o.top_products.map((p) => p.qty);
  assert.deepEqual([...qty].sort((a, b) => b - a), qty, 'best seller first');
});
await test('report: owner only; totals add up; cancelled orders are excluded from revenue', async () => {
  const range = [`now() - interval '2 days'`, `now() + interval '1 day'`];
  await as('authenticated', MANAGER);
  await rejects(one(`select public.admin_report(${range[0]}, ${range[1]})`), /forbidden/);
  await as('authenticated', OWNER);
  const r = (await one(`select public.admin_report(${range[0]}, ${range[1]}) as r`)).r;
  await asSuper();
  const real = await one(`select count(*) filter (where status <> 'cancelled')::int n,
                                 coalesce(sum(total) filter (where status <> 'cancelled'), 0)::int rev,
                                 count(*) filter (where status = 'cancelled')::int canc
                            from orders where created_at >= now() - interval '2 days'`);
  assert.equal(r.totals.orders, real.n);
  assert.equal(r.totals.revenue, real.rev);
  assert.equal(r.totals.cancelled, real.canc);
  assert.equal(r.by_day.reduce((a, d) => a + d.revenue, 0), real.rev);
  const items = await one(`select coalesce(sum(i.qty * i.unit_price), 0)::int s from order_items i join orders o on o.id = i.order_id
                            where o.status <> 'cancelled' and o.created_at >= now() - interval '2 days'`);
  assert.equal(r.by_brand.reduce((a, x) => a + x.revenue, 0), items.s, 'brands add up to the items sold');
  assert.ok(r.by_region.length >= 1);
  assert.ok(r.by_source.some((s) => s.source === 'direct'));
  assert.ok(real.n > 0 && real.canc > 0, 'fixture has live and cancelled orders');
});
await test('report rejects a missing, reversed or huge range', async () => {
  await as('authenticated', OWNER);
  await rejects(one(`select public.admin_report(now(), now() - interval '1 day')`), /invalid:range/);
  await rejects(one(`select public.admin_report(now() - interval '900 days', now())`), /invalid:range/);
  await rejects(one(`select public.admin_report(null, now())`), /invalid:range/);
  await as('anon');
  await rejects(one(`select public.admin_report(now() - interval '1 day', now())`), /permission denied/);
});

console.log('\nShared rate limits');
await test('rate limit: counts per key, blocks over the max, resets after the window', async () => {
  await as('service_role');
  const hit = async (key, max = 3, secs = 600) => (await one('select public.rate_limit_hit($1, $2, $3) as r', [key, max, secs])).r;
  assert.deepEqual([await hit('k1'), await hit('k1'), await hit('k1'), await hit('k1')], [false, false, false, true]);
  assert.equal(await hit('k2'), false, 'other keys are counted separately');
  await asSuper();
  await db.exec(`update public.rate_limits set window_start = now() - interval '11 minutes' where key = 'k1'`);
  await as('service_role');
  assert.equal(await hit('k1'), false, 'a new window starts after the old one ends');
  await rejects(one('select public.rate_limit_hit($1, 0, 60)', ['k3']), /invalid:rate_limit/);
});
await test('rate limit: visitors and staff can neither call it nor read the counters', async () => {
  for (const [role, id] of [['anon'], ['authenticated', OWNER]]) {
    await as(role, id);
    await rejects(one(`select public.rate_limit_hit('x', 5, 60)`), /permission denied/, `${role} call`);
    await rejects(all('select * from public.rate_limits'), /permission denied/, `${role} read`);
  }
});


console.log('\nUpgrade from the sneaker shop (the menswear migration on top of existing data)');
await test('existing sneakers, sizes and orders survive; the placeholders and unused brands go; new rules work afterwards', async () => {
  const old = new PGlite();
  await standIns(old);
  await defaultPrivileges(old);
  for (const f of migrations.filter((n) => n < '20261017')) await old.exec(read(`../migrations/${f}`));
  await old.exec(`
    insert into brands (name, slug) values ('Nike', 'nike'), ('Adidas', 'adidas');
    insert into products (slug, brand_id, name, colorway, category, gender, price, old_price) values
      ('nike-pegasus-40', (select id from brands where slug = 'nike'), 'Pegasus 40', 'Black', 'running', 'men', 1900000, 2300000),
      ('air-max-1-sunset', (select id from brands where slug = 'nike'), 'Air Max 1', null, 'running', 'unisex', 1390000, 2190000);
    insert into product_sizes (product_id, eu, us, cm, stock) select id, 42, 8.5, 26.5, 2 from products;
    insert into product_sizes (product_id, eu, stock) select id, 42.5, 0 from products where slug = 'nike-pegasus-40';
    insert into settings (key, value, is_public) values
      ('delivery', '{"methods":[{"id":"courier_tashkent","fee":30000}],"free_threshold":1500000}', true),
      ('home', '{"hero":{"product":"air-max-1-sunset"},"deal_ends":null}', true);
  `);
  const oldOrder = (slug) => JSON.stringify({
    customer: { name: 'Old', phone: '+998901234567' }, delivery: { method: 'courier_tashkent' }, payment: 'cash',
    items: [{ slug, size: 42, qty: 1 }],
  });
  await old.query('select public.place_order($1::jsonb)', [oldOrder('nike-pegasus-40')]);
  await old.query('select public.place_order($1::jsonb)', [oldOrder('air-max-1-sunset')]);

  await old.exec(read('../migrations/20261017000000_menswear.sql'));

  const q = async (sql, params) => (await old.query(sql, params)).rows;
  const products = await q(`select slug, category, color from products order by slug`);
  assert.deepEqual(products, [{ slug: 'nike-pegasus-40', category: 'sneakers', color: 'Black' }], 'real sneaker kept (colorway → color), placeholder removed');
  assert.deepEqual((await q(`select slug from brands`)).map((b) => b.slug), ['nike'], 'unused brand removed');
  assert.equal((await q(`select count(*)::int c from information_schema.columns where table_name = 'products' and column_name = 'gender'`))[0].c, 0);
  assert.deepEqual(await q(`select label, sort, stock, orderable from product_sizes order by label`),
    [{ label: '42', sort: 0, stock: 1, orderable: false }, { label: '42.5', sort: 0, stock: 0, orderable: false }],
    'numeric EU sizes became text labels and stay un-orderable, as they were before');
  assert.deepEqual(await q(`select size_label, fulfilment, product_id is null as gone from order_items order by gone`),
    [{ size_label: '42', fulfilment: 'stock', gone: false }, { size_label: '42', fulfilment: 'stock', gone: true }],
    'old order lines keep their size and stay "from stock"; the one for the removed placeholder keeps its snapshot');
  const delivery = (await q(`select value from settings where key = 'delivery'`))[0].value;
  assert.deepEqual([delivery.stock_days, delivery.order_days, delivery.free_threshold], ['1–3', '10–18', 1500000]);
  assert.deepEqual((await q(`select value from settings where key = 'home'`))[0].value.hero, {}, 'the hero pointed at a removed product');
  assert.equal((await q(`select count(*)::int c from categories`))[0].c, 20);

  // the new rules work on the migrated data
  const placed = await q(`select public.place_order($1::jsonb) as r`, [JSON.stringify({
    customer: { name: 'New', phone: '+998901234568' }, delivery: { method: 'courier_tashkent' }, payment: 'cash',
    items: [{ slug: 'nike-pegasus-40', size: '42', qty: 1 }] })]);
  assert.equal(placed[0].r.items[0].fulfilment, 'stock');
  await rejects(old.query(`select public.place_order($1::jsonb)`, [JSON.stringify({
    customer: { name: 'New', phone: '+998901234568' }, delivery: { method: 'courier_tashkent' }, payment: 'cash',
    items: [{ slug: 'nike-pegasus-40', size: '42.5', qty: 1 }] })]), /out_of_stock/, 'old sizes are not orderable unless the owner allows it');
});

console.log(`\n${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ''}\n`);
