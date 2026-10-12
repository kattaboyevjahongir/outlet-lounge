// node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { shapeCatalog, imageUrl } from '../api/catalog.js';

const BASE = 'https://abc.supabase.co';

const row = (over = {}) => ({
  slug: 'air-max-1-sunset', name: 'Air Max 1 “Sunset”', colorway: null, sku: 'AM1-001',
  category: 'running', gender: 'unisex', price: 1390000, old_price: 2190000,
  description_ru: 'Описание', description_uz: null, description_en: null, tags: ['найк'],
  is_new: false, is_featured: false, created_at: '2026-10-12T10:00:00Z',
  brands: { name: 'Nike' },
  product_images: [
    { path: 'b.webp', sort: 1, is_main: false },
    { path: 'a.webp', sort: 0, is_main: true },
  ],
  product_sizes: [
    { eu: '42', us: '8.5', cm: '26.5', stock: 2 },
    { eu: '41', us: '8', cm: '26', stock: 0 },
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
  assert.equal(p.id, 'air-max-1-sunset');
  assert.equal(p.brand, 'Nike');
  assert.equal(p.cat, 'running');
  assert.equal(p.sku, 'AM1-001');
  assert.equal(p.was, 2190000);
  assert.deepEqual(p.images, [
    `${BASE}/storage/v1/object/public/product-images/a.webp`,
    `${BASE}/storage/v1/object/public/product-images/b.webp`,
  ], 'main image first');
  assert.deepEqual(p.sizes.map((z) => [z.s, z.ok, z.stock]), [[41, false, 0], [42, true, 2]], 'sorted, numeric');
  assert.equal(p.tag, 'last', 'low stock → last pairs');
  assert.equal(c.settings.home.deal_ends, null);
});

test('shapeCatalog: tag precedence new > hot > last', () => {
  const t = (over) => shapeCatalog([row(over)], [], BASE).products[0].tag;
  assert.equal(t({ is_new: true, is_featured: true }), 'new');
  assert.equal(t({ is_featured: true }), 'hot');
  assert.equal(t({ product_sizes: [{ eu: '42', stock: 50 }] }), null);
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
    const body = url.includes('/products?') ? [row()] : [{ key: 'home', value: {} }];
    return { ok: true, status: 200, json: async () => body };
  };
  try {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.products.length, 1);
    assert.match(res.headers['Cache-Control'], /s-maxage=60/);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.includes('is_active=eq.true'));
    assert.ok(calls[1].url.includes('is_public=eq.true'), 'only public settings');
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
