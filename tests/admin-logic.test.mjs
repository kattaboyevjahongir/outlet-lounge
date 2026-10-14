// node --test tests/*.test.mjs  — admin panel pure logic
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../assets/admin/logic.js';

test('status flow matches the Telegram buttons; cancelled and delivered are final', () => {
  assert.deepEqual(L.nextStatuses('new'), ['confirmed', 'no_answer', 'cancelled']);
  assert.deepEqual(L.nextStatuses('confirmed'), ['shipped', 'cancelled']);
  assert.deepEqual(L.nextStatuses('shipped'), ['delivered', 'cancelled']);
  assert.deepEqual(L.nextStatuses('no_answer'), ['confirmed', 'cancelled']);
  assert.deepEqual(L.nextStatuses('cancelled'), []);
  assert.deepEqual(L.nextStatuses('delivered'), []);
  assert.deepEqual(L.nextStatuses('???'), []);
  // every status the panel can offer is a real one
  for (const s of L.STATUSES) for (const n of L.nextStatuses(s)) assert.ok(L.STATUSES.includes(n));
});

test('money: parsing typed prices, formatting with thin spaces, discount', () => {
  assert.equal(L.parseMoney('1 290 000'), 1290000);
  assert.equal(L.parseMoney('1,290,000 сум'), 1290000);
  assert.equal(L.parseMoney(''), null);
  assert.equal(L.parseMoney('abc'), null);
  assert.equal(L.fmtMoney(1290000), '1 290 000');
  assert.equal(L.fmtMoney(0), '0');
  assert.equal(L.fmtMoney(999), '999');
  assert.equal(L.discountPct(1190000, 1790000), 34);
  assert.equal(L.discountPct(1000, 1000), 0);
  assert.equal(L.discountPct(1000, null), 0);
});

test('slugs: latin, cyrillic, quotes and symbols', () => {
  assert.equal(L.slugify('Air Max 1 “Sunset”'), 'air-max-1-sunset');
  assert.equal(L.slugify('Air Force 1 ’07 “Triple White”'), 'air-force-1-07-triple-white');
  assert.equal(L.slugify('Кроссовки «Чёрные» 42'), 'krossovki-chernye-42');
  assert.equal(L.slugify('  --Chuck 70 Hi!!  '), 'chuck-70-hi');
  assert.equal(L.slugify('Oʻzbekiston'), 'ozbekiston');
  assert.equal(L.slugify('???'), '');
  assert.ok(L.slugify('a'.repeat(300)).length <= 100);
  for (const s of ['air-max-1', 'a', 'x-90-pink-haze']) assert.ok(L.SLUG_RE.test(s));
  for (const s of ['Air-Max', 'a--b', '-a', 'a b', '']) assert.ok(!L.SLUG_RE.test(s));
});

const good = () => ({
  ...L.emptyProduct(), name: 'Classic Fit Polo', brand_id: 'b1', slug: 'classic-fit-polo', category: 'polos', price: '1 290 000', old_price: '1 890 000',
  sizes: [{ id: 's1', label: 'M', stock: '3', orderable: true }, { label: 'L', stock: '2', orderable: false }],
});

test('product validation', () => {
  assert.deepEqual(L.validateProduct(good()), { ok: true, errors: {} });
  const bad = (over) => L.validateProduct({ ...good(), ...over }).errors;
  assert.equal(bad({ name: '  ' }).name, 'required');
  assert.equal(bad({ brand_id: '', brand_name: '' }).brand, 'required');
  assert.equal(bad({ brand_id: '', brand_name: 'HOKA' }).brand, undefined, 'a new brand name is fine');
  assert.equal(bad({ price: '' }).price, 'required');
  assert.equal(bad({ price: '0' }).price, 'positive');
  assert.equal(bad({ old_price: '1 000 000' }).old_price, 'above_price');
  assert.equal(bad({ old_price: '1 290 000' }).old_price, 'above_price', 'equal is not a discount');
  assert.equal(bad({ slug: 'Not A Slug' }).slug, 'slug');
  assert.equal(bad({ category: '' }).category, 'required');
  assert.equal(bad({ sizes: [{ label: '', stock: '1' }] })['size.0.label'], 'size');
  assert.equal(bad({ sizes: [{ label: 'M!', stock: '1' }] })['size.0.label'], 'size');
  assert.equal(bad({ sizes: [{ label: 'WAY TOO LONG!!', stock: '1' }] })['size.0.label'], 'size');
  assert.equal(bad({ sizes: [{ label: 'M', stock: '1' }, { label: 'M', stock: '2' }] })['size.1.label'], 'duplicate');
  assert.equal(bad({ sizes: [{ label: 'M', stock: '-1' }] })['size.0.stock'], 'stock');
  assert.equal(bad({ sizes: [{ label: 'M', stock: '1.5' }] })['size.0.stock'], 'stock');
  assert.equal(bad({ sizes: [{ label: 'M', stock: '' }] })['size.0.stock'], 'stock', 'new size needs a quantity');
  assert.equal(bad({ sizes: [{ id: 's1', label: 'M', stock: '' }] })['size.0.stock'], undefined, 'existing size may stay untouched');
  for (const ok of ['XXL', '48', 'W32/L34', '42.5', 'ONE SIZE', '3XL']) {
    assert.equal(bad({ sizes: [{ label: ok, stock: '0' }] })['size.0.label'], undefined, ok);
  }
});

test('product validation: colour, style code, origin, fit, lead time, long texts', () => {
  const bad = (over) => L.validateProduct({ ...good(), ...over }).errors;
  assert.equal(bad({ color_hex: '#1F2A44' }).color_hex, undefined);
  assert.equal(bad({ color_hex: 'navy' }).color_hex, 'hex');
  assert.equal(bad({ color_hex: '#12345' }).color_hex, 'hex');
  assert.equal(bad({ color_group: 'navy' }).color_group, undefined);
  assert.equal(bad({ color_group: 'pink' }).color_group, 'invalid');
  assert.equal(bad({ style_code: 'LC-L1212.2' }).style_code, undefined);
  assert.equal(bad({ style_code: 'has space' }).style_code, 'style');
  assert.equal(bad({ origin: 'fr' }).origin, undefined, 'any case; stored upper-case');
  assert.equal(bad({ origin: 'France' }).origin, 'origin');
  assert.equal(bad({ fit: 'slim' }).fit, undefined);
  assert.equal(bad({ fit: 'tight' }).fit, 'invalid');
  for (const lead of ['10', '10–18', '10-18']) assert.equal(bad({ order_lead: lead }).order_lead, undefined, lead);
  for (const lead of ['soon', '10–', '1000']) assert.equal(bad({ order_lead: lead }).order_lead, 'lead', lead);
  assert.equal(bad({ material: 'x'.repeat(161) }).material, 'long');
  assert.equal(bad({ model_info: 'x'.repeat(161) }).model_info, 'long');
  assert.deepEqual(L.validateProduct(good()).errors, {}, 'all the new fields are optional');
});

test('payload: tags cleaned, prices numeric, untouched stock sent as null', () => {
  const f = { ...good(), tags: 'Jordan, джордан ;  jordan\n', color: ' ', sku: '', origin: ' fr ', fit: '', description_en: 'x' };
  f.sizes[0].dirty = false;
  f.sizes[1].dirty = true;
  const p = L.toPayload(f);
  assert.deepEqual(p.tags, ['jordan', 'джордан']);
  assert.equal(p.price, 1290000);
  assert.equal(p.old_price, 1890000);
  assert.equal(p.color, null);
  assert.equal(p.sku, null);
  assert.equal(p.origin, 'FR', 'country codes are sent in upper case');
  assert.equal(p.fit, null);
  assert.ok(!('gender' in p) && !('colorway' in p), 'sneaker-era fields are gone');
  assert.equal(p.brand_name, null, 'brand_name is only for brand-new brands');
  assert.equal(p.sizes[0].stock, null, 'untouched existing size keeps whatever the database has now');
  assert.equal(p.sizes[1].stock, 2);
  assert.deepEqual(p.sizes[1], { label: 'L', orderable: false, stock: 2 });
  assert.deepEqual(p.sizes.map((s) => s.label), ['M', 'L'], 'the row order is the display order');
  assert.equal(p.sizes[0].orderable, true);
  f.sizes[0].dirty = true;
  assert.equal(L.toPayload(f).sizes[0].stock, 3);
  assert.equal(L.toPayload({ ...good(), id: null }).id, undefined);
});

test('stock state and product filtering', () => {
  const mk = (over, stocks) => ({ id: over.name, is_active: true, brand_id: 'b1', brand_name: 'Nike', category: 'sneakers',
    sizes: stocks.map((stock) => ({ stock })), tags: [], ...over });
  const a = mk({ name: 'Air Max', sku: 'AM1' }, [5, 0]);
  const b = mk({ name: 'Dunk', brand_id: 'b2', brand_name: 'Nike', category: 'belts', tags: ['sb'], color: 'Navy', style_code: 'ZZ-9' }, [0, 0]);
  const c = mk({ name: 'Old Skool', is_active: false }, [4]);
  const d = mk({ name: 'Last Pair' }, [1]);
  assert.equal(L.stockState(a).state, 'ok');
  assert.equal(L.stockState(b).state, 'sold_out');
  assert.equal(L.stockState(c).state, 'hidden');
  assert.equal(L.stockState(d).state, 'low');
  assert.equal(L.stockState(a).total, 5);
  const all = [a, b, c, d];
  const names = (o) => L.filterProducts(all, o).map((p) => p.name);
  assert.deepEqual(names({}), ['Air Max', 'Dunk', 'Old Skool', 'Last Pair']);
  assert.deepEqual(names({ q: 'am1' }), ['Air Max']);
  assert.deepEqual(names({ q: ' SB ' }), ['Dunk']);
  assert.deepEqual(names({ brand: 'b2' }), ['Dunk']);
  assert.deepEqual(names({ category: 'belts' }), ['Dunk']);
  assert.deepEqual(names({ q: 'navy' }), ['Dunk'], 'colour is searchable');
  assert.deepEqual(names({ q: 'zz-9' }), ['Dunk'], 'so is the style code');
  const depts = { sneakers: 'shoes', belts: 'accessories' };
  assert.deepEqual(names({ dept: 'accessories', depts }), ['Dunk']);
  assert.deepEqual(names({ dept: 'shoes', depts }), ['Air Max', 'Old Skool', 'Last Pair']);
  assert.deepEqual(names({ state: 'sold_out' }), ['Dunk']);
  assert.deepEqual(names({ state: 'hidden' }), ['Old Skool']);
  assert.deepEqual(names({ state: 'active' }), ['Air Max', 'Dunk', 'Last Pair']);
  assert.deepEqual(names({ state: 'low' }), ['Last Pair']);
});

test('order search builds a safe filter', () => {
  assert.equal(L.orderSearch(''), null);
  assert.equal(L.orderSearch('  '), null);
  assert.equal(L.orderSearch('OL-261013'), 'number.ilike.*OL-261013*,customer_name.ilike.*OL-261013*,phone.ilike.*261013*');
  assert.equal(L.orderSearch('+998 90 123'), 'number.ilike.*+998 90 123*,customer_name.ilike.*+998 90 123*,phone.ilike.*99890123*');
  const evil = L.orderSearch('a),status.eq.new,(b');
  assert.ok(!/[()]/.test(evil.replace(/\.ilike\./g, '')), evil);
  assert.equal(evil.split(',').length, 2, 'cannot add filters by injecting commas');
  assert.equal(L.orderSearch('Aziz'), 'number.ilike.*Aziz*,customer_name.ilike.*Aziz*');
});

test('date ranges start at midnight Tashkent time', () => {
  const now = new Date('2026-10-13T22:30:00Z'); // already 03:30 on the 14th in Tashkent
  assert.equal(L.rangeStart('today', now), '2026-10-13T19:00:00.000Z');
  assert.equal(L.rangeStart('7d', now), '2026-10-07T19:00:00.000Z');
  assert.equal(L.rangeStart('30d', now), '2026-09-14T19:00:00.000Z');
  assert.equal(L.rangeStart('all', now), null);
  assert.equal(L.rangeStart(undefined, now), null);
  const noon = new Date('2026-10-13T07:00:00Z');
  assert.equal(L.rangeStart('today', noon), '2026-10-12T19:00:00.000Z');
});

test('courier text lists everything a courier needs', () => {
  const text = L.courierText({
    number: 'OL-261013-0042', customer_name: 'Азиз', phone: '+998901234567', telegram: '@aziz', region: 'Ташкент',
    city: 'Юнусабад', address: 'ул. Навои 12', landmark: 'Mega Planet', total: 1520000, comment: 'после 18:00',
    items: [{ brand: 'Jordan', name: 'AJ1', size_label: 'XL', fulfilment: 'stock', qty: 2, unit_price: 760000 },
      { brand: 'Diesel', name: 'Jacket', size_label: 'M', fulfilment: 'order', qty: 1, unit_price: 5900000 }],
  }, { onOrder: 'под заказ', order: 'Заказ', customer: 'Клиент', delivery: 'Доставка', deliveryName: 'курьер', landmark: 'Ориентир',
    total: 'К оплате', paymentName: 'наличными', comment: 'Комментарий' });
  assert.match(text, /^Заказ OL-261013-0042\n/);
  assert.match(text, /Клиент: Азиз, \+998901234567, @aziz/);
  assert.match(text, /Доставка: курьер — Ташкент, Юнусабад, ул\. Навои 12/);
  assert.match(text, /1\) Jordan AJ1 — XL × 2 — 1\u00A0520\u00A0000\n/);
  assert.match(text, /2\) Diesel Jacket — M × 1 — 5\u00A0900\u00A0000 \(под заказ\)/);
  assert.match(text, /К оплате: 1 520 000 \(наличными\)/);
  assert.match(text, /Комментарий: после 18:00/);
});

test('photo sizes: never enlarge, keep proportions; variant paths', () => {
  assert.deepEqual(L.fitSize(4000, 3000, 1600), { w: 1600, h: 1200 });
  assert.deepEqual(L.fitSize(3000, 4000, 800), { w: 600, h: 800 });
  assert.deepEqual(L.fitSize(500, 400, 1600), { w: 500, h: 400 });
  assert.equal(L.variantPath('products/ab/c1-1600.webp', 400), 'products/ab/c1-400.webp');
  assert.equal(L.variantPath('products/ab/c1-1600.jpg', 800), 'products/ab/c1-800.jpg');
  assert.deepEqual(L.photoVariants('p/x-1600.webp'), ['p/x-1600.webp', 'p/x-800.webp', 'p/x-400.webp']);
  assert.equal(L.isUploadedPath('https://images.unsplash.com/a'), false);
  assert.equal(L.isUploadedPath('products/a/b-1600.webp'), true);
});

test('reordering photos', () => {
  assert.deepEqual(L.moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(L.moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(L.moveItem(['a', 'b'], 0, 5), ['a', 'b'], 'out of range is ignored');
  const src = ['a', 'b'];
  L.moveItem(src, 0, 1);
  assert.deepEqual(src, ['a', 'b'], 'does not mutate');
});

test('relative time', () => {
  const now = Date.parse('2026-10-13T12:00:00Z');
  assert.deepEqual(L.ago('2026-10-13T11:59:40Z', now), { unit: 'now', n: 0 });
  assert.deepEqual(L.ago('2026-10-13T11:15:00Z', now), { unit: 'min', n: 45 });
  assert.deepEqual(L.ago('2026-10-13T07:00:00Z', now), { unit: 'h', n: 5 });
  assert.deepEqual(L.ago('2026-10-10T12:00:00Z', now), { unit: 'd', n: 3 });
});
