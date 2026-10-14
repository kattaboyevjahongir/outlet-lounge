// node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { shapeCatalog, imageUrl } from '../api/catalog.js';

const BASE = 'https://abc.supabase.co';

const row = (over = {}) => ({
  slug: 'lacoste-classic-fit-polo-black', name: 'Classic Fit Polo', color: 'Black', color_hex: '#141414', color_group: 'black',
  style_code: 'LC-L1212', sku: 'L1212-031', category: 'polos', price: 1290000, old_price: 1590000,
  origin: 'FR', material: '100% cotton', fit: 'regular', model_info: 'Model is 186 cm and wears M', order_lead: null,
  description_ru: 'Описание', description_uz: null, description_en: null, tags: ['лакост'],
  is_new: false, is_featured: false, created_at: '2026-10-12T10:00:00Z',
  brands: { name: 'Lacoste' },
  product_images: [
    { path: 'b.webp', sort: 1, is_main: false },
    { path: 'a.webp', sort: 0, is_main: true },
  ],
  product_sizes: [
    { label: 'L', sort: 2, stock: 2, orderable: true },
    { label: 'M', sort: 1, stock: 0, orderable: false },
    { label: 'XL', sort: 3, stock: 0, orderable: true },
  ],
  ...over,
});

const mockRes = () => {
  const r = { headers: {}, code: 200, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

test('imageUrl: full URLs pass through, storage paths are expanded', () => {
  assert.equal(imageUrl('https://x/y.jpg', BASE), 'https://x/y.jpg');
  assert.equal(imageUrl('nike/a.webp', BASE), `${BASE}/storage/v1/object/public/product-images/nike/a.webp`);
});

test('shapeCatalog: shapes products like the storefront expects', () => {
  const c = shapeCatalog([row()], [{ key: 'home', value: { deal_ends: null } }], BASE);
  const p = c.products[0];
  assert.equal(c.source, 'live');
  assert.equal(p.id, 'lacoste-classic-fit-polo-black');
  assert.equal(p.brand, 'Lacoste');
  assert.equal(p.cat, 'polos');
  assert.equal(p.sku, 'L1212-031');
  assert.equal(p.was, 1590000);
  assert.deepEqual(
    [p.color, p.colorHex, p.colorGroup, p.styleCode, p.origin, p.material, p.fit, p.model, p.orderLead],
    ['Black', '#141414', 'black', 'LC-L1212', 'FR', '100% cotton', 'regular', 'Model is 186 cm and wears M', null]);
  assert.ok(!('gender' in p) && !('colorway' in p), 'sneaker-era fields are gone');
  assert.deepEqual(p.images, [
    `${BASE}/storage/v1/object/public/product-images/a.webp`,
    `${BASE}/storage/v1/object/public/product-images/b.webp`,
  ], 'main image first');
  assert.deepEqual(p.sizes.map((z) => [z.s, z.ok, z.stock, z.order]),
    [['M', false, 0, false], ['L', true, 2, true], ['XL', true, 0, true]],
    'display order; ok = in stock here or orderable from abroad; M is sold out for good');
  assert.equal(p.tag, 'last', 'low stock → last pieces');
  assert.equal(c.settings.home.deal_ends, null);
});

test('shapeCatalog: tag precedence new > hot > last', () => {
  const t = (over) => shapeCatalog([row(over)], [], BASE).products[0].tag;
  assert.equal(t({ is_new: true, is_featured: true }), 'new');
  assert.equal(t({ is_featured: true }), 'hot');
  assert.equal(t({ product_sizes: [{ label: 'M', sort: 0, stock: 50, orderable: true }] }), null);
});

test('sizes are ordered by the saved position, then naturally (2XL after XL, 9 before 10)', () => {
  const sizes = (list) => shapeCatalog([row({ product_sizes: list.map((label) => ({ label, sort: 0, stock: 1, orderable: true })) })], [], BASE)
    .products[0].sizes.map((z) => z.s);
  assert.deepEqual(sizes(['10', '9', '8']), ['8', '9', '10']);
  assert.deepEqual(sizes(['W32', 'W30']), ['W30', 'W32']);
  const saved = shapeCatalog([row({ product_sizes: [
    { label: 'XL', sort: 0, stock: 1, orderable: true }, { label: 'S', sort: 1, stock: 1, orderable: true }] })], [], BASE);
  assert.deepEqual(saved.products[0].sizes.map((z) => z.s), ['XL', 'S'], 'the saved order wins');
});

test('shapeCatalog: categories come with names in three languages, their department and size system', () => {
  const c = shapeCatalog([row()], [], BASE, [
    { slug: 'polos', department: 'clothing', name_ru: 'Поло', name_uz: 'Polo', name_en: 'Polos', size_system: 'letter', image_path: 'cats/polos.webp', sort: 2 },
    { slug: 'belts', department: 'accessories', name_ru: 'Ремни', name_uz: 'Kamarlar', name_en: 'Belts', size_system: 'belt', image_path: null, sort: 15 },
  ]);
  assert.deepEqual(c.categories[0], {
    slug: 'polos', dept: 'clothing', name: { ru: 'Поло', uz: 'Polo', en: 'Polos' }, sizes: 'letter',
    image: `${BASE}/storage/v1/object/public/product-images/cats/polos.webp`, sort: 2,
  });
  assert.equal(c.categories[1].image, null);
  assert.deepEqual(shapeCatalog([row()], [], BASE).categories, [], 'no categories given → empty list (the storefront uses its built-in ones)');
});

test('shapeCatalog: drops products with no image or no price; no old price → was = price', () => {
  const c = shapeCatalog([row({ product_images: [] }), row({ slug: 'b', price: 0 }), row({ slug: 'c', old_price: null })], [], BASE);
  assert.deepEqual(c.products.map((p) => p.slug), ['c']);
  assert.equal(c.products[0].was, c.products[0].price);
});

test('handler: 503 when Supabase is not configured', async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY;
  const res = mockRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.error, 'not_configured');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('handler: only GET/HEAD', async () => {
  const res = mockRes();
  await handler({ method: 'POST' }, res);
  assert.equal(res.code, 405);
});

test('handler: queries Supabase with the anon key and caches the response', async () => {
  process.env.SUPABASE_URL = BASE;
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const body = url.includes('/products?') ? [row()] : url.includes('/categories?') ? [] : [{ key: 'home', value: {} }];
    return { ok: true, status: 200, json: async () => body };
  };
  try {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.products.length, 1);
    assert.match(res.headers['Cache-Control'], /s-maxage=60/);
    assert.equal(calls.length, 3);
    assert.ok(calls[0].url.includes('is_active=eq.true'));
    assert.ok(calls[1].url.includes('is_public=eq.true'), 'only public settings');
    assert.ok(calls[2].url.includes('/categories?') && calls[2].url.includes('is_active=eq.true'), 'only visible categories');
    assert.equal(calls[0].init.headers.apikey, 'anon-key');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('handler: upstream failure → 502 without leaking details', async () => {
  process.env.SUPABASE_URL = BASE;
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  const realFetch = globalThis.fetch;
  const realError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ secret: 'db password' }) });
  try {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    assert.equal(res.code, 502);
    assert.deepEqual(res.body, { error: 'upstream_unavailable' });
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
  }
});
