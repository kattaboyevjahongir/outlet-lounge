// node --test tests/*.test.mjs — the same facts live in several places (the database migration, the
// storefront's offline fallback, the admin panel, the seed). These tests keep them identical.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import * as AL from '../assets/admin/logic.js';
import { createMock } from '../assets/admin/mock.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('../assets/js/data.js'), sandbox);
const OL = sandbox.window.OL;
const plain = (v) => JSON.parse(JSON.stringify(v));

// the categories inserted by the migration: (slug, department, ru, uz, en, size system, sort)
const migration = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((n) => n.includes('menswear'))[0];
const sql = read(`../supabase/migrations/${migration}`);
const rows = [...sql.matchAll(/\('([a-z0-9-]+)',\s*'(clothing|shoes|accessories)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([a-z]+)',\s*(\d+)\)/g)]
  .map((m) => ({ slug: m[1], dept: m[2], name: { ru: m[3], uz: m[4], en: m[5] }, sizes: m[6], sort: Number(m[7]) }));

test('migration: 20 categories parsed', () => {
  assert.equal(rows.length, 20);
  assert.deepEqual(new Set(rows.map((r) => r.dept)), new Set(['clothing', 'shoes', 'accessories']));
});

test('the storefront fallback categories are exactly the migration\'s', () => {
  const fallback = OL.STATIC_CATEGORIES.map((c) => ({ slug: c.slug, dept: c.dept, name: c.name, sizes: c.sizes, sort: c.sort }));
  assert.deepEqual(plain(fallback), rows);
});

test('the admin demo categories are the migration\'s too', async () => {
  globalThis.location = { search: '' }; // the demo layer reads the address bar
  const mock = createMock();
  const cats = await mock.listCategories();
  assert.deepEqual(cats.map((c) => [c.slug, c.department, c.name_ru, c.name_uz, c.name_en, c.size_system, c.sort]),
    rows.map((r) => [r.slug, r.dept, r.name.ru, r.name.uz, r.name.en, r.sizes, r.sort]));
});

test('size systems: storefront and admin offer the same labels in the same order', () => {
  assert.deepEqual(plain(OL.SIZE_SYSTEMS), plain(AL.SIZE_SYSTEMS));
  for (const r of rows) assert.ok(AL.SIZE_SYSTEM_IDS.includes(r.sizes), `${r.slug}: ${r.sizes}`);
});

test('every size system named by the migration check constraint exists', () => {
  const m = sql.match(/size_system in \(([^)]+)\)/);
  const ids = [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
  assert.deepEqual(ids.sort(), [...AL.SIZE_SYSTEM_IDS].sort());
});

test('placeholder catalog: valid categories, labels from the right size system, colour pairs share a code', () => {
  const cat = Object.fromEntries(OL.STATIC_CATEGORIES.map((c) => [c.slug, c]));
  assert.ok(OL.STATIC_PRODUCTS.length >= 24);
  const byStyle = new Map();
  for (const p of OL.STATIC_PRODUCTS) {
    assert.ok(cat[p.cat], `${p.slug}: category ${p.cat}`);
    assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) && p.slug.length <= 120, p.slug);
    assert.ok(p.images.length >= 1 && p.price > 0 && p.was >= p.price, p.slug);
    assert.ok(p.styleCode && /^#[0-9A-Fa-f]{6}$/.test(p.colorHex) && AL.COLOR_GROUPS.includes(p.colorGroup), p.slug);
    assert.ok(/^[A-Z]{2}$/.test(p.origin), p.slug);
    const system = AL.SIZE_SYSTEMS[cat[p.cat].sizes];
    assert.ok(p.sizes.length > 0, p.slug);
    for (const z of p.sizes) {
      assert.ok(system.includes(z.s), `${p.slug}: size ${z.s} is not in ${cat[p.cat].sizes}`);
      assert.equal(z.ok, z.stock > 0 || z.order, `${p.slug} ${z.s}: ok = in stock or orderable`);
    }
    byStyle.set(p.styleCode, [...(byStyle.get(p.styleCode) || []), p.color]);
  }
  const pairs = [...byStyle.values()].filter((c) => c.length > 1);
  assert.ok(pairs.length >= 5, 'several items come in more than one colour');
  for (const colours of pairs) assert.equal(new Set(colours).size, colours.length, 'colours of one item differ');
  // the catalog shows every case the storefront has to handle
  const all = OL.STATIC_PRODUCTS.flatMap((p) => p.sizes);
  assert.ok(all.some((z) => z.stock > 0), 'in stock');
  assert.ok(all.some((z) => z.stock === 0 && z.order), 'on order');
  assert.ok(all.some((z) => z.stock === 0 && !z.order), 'sold out for good');
  assert.ok(OL.STATIC_PRODUCTS.some((p) => p.was > p.price) && OL.STATIC_PRODUCTS.some((p) => p.was === p.price), 'with and without an old price');
  assert.ok(OL.STATIC_PRODUCTS.some((p) => p.sizes.every((z) => z.stock === 0 && z.order)), 'an item that can only be ordered');
});

test('seed.sql is up to date with the placeholder catalog (run: npm run seed)', () => {
  const seed = read('../supabase/seed.sql');
  for (const p of OL.STATIC_PRODUCTS) assert.ok(seed.includes(`'${p.slug}'`), `seed is missing ${p.slug}`);
  const slugs = [...seed.matchAll(/^\s+\('([a-z0-9-]+)', \(select id from public\.brands/gm)].map((m) => m[1]);
  assert.deepEqual(slugs, plain(OL.STATIC_PRODUCTS.map((p) => p.slug)), 'same products in the same order');
  assert.ok(!/sneaker|air-max|jordan/i.test(seed.replace(/'sneakers'|nike-air-force-1-low-white|Air Force 1 Low|adidas-stan-smith/gi, '')), 'no leftovers of the old catalog');
});

test('catalog helpers: brands with products, category names in the current language, counts per department', () => {
  assert.ok(OL.BRANDS.length >= 6 && OL.BRANDS.includes('Lacoste'));
  assert.equal(OL.catName('polos', 'ru'), 'Поло');
  assert.equal(OL.catName('polos', 'uz'), 'Polo');
  assert.equal(OL.catName('polos', 'en'), 'Polos');
  assert.equal(OL.catName('nope', 'en'), 'nope', 'unknown slug → the slug');
  assert.equal(OL.catDept('belts'), 'accessories');
  const n = OL.counts();
  assert.equal(n.dept.clothing + n.dept.shoes + n.dept.accessories, OL.STATIC_PRODUCTS.length);
  assert.ok(n.cat.polos === 2 && n.dept.shoes >= 4);
  // live categories from the API replace the built-in list
  OL.setCatalog(OL.STATIC_PRODUCTS.slice(0, 2), {}, 'live', [{ slug: 'z', dept: 'shoes', name: { ru: 'я', uz: 'z', en: 'Z' }, sizes: 'shoes', sort: 1 }]);
  assert.deepEqual(plain(OL.CATEGORIES.map((c) => c.slug)), ['z']);
  assert.equal(OL.catName('z', 'ru'), 'я');
  assert.deepEqual(plain(OL.BRANDS), ['Lacoste']);
  OL.setCatalog(OL.STATIC_PRODUCTS, OL.STATIC_SETTINGS, 'static');
  assert.equal(OL.CATEGORIES.length, 20, 'no categories from the API → the built-in ones');
});

test('delivery defaults carry the lead times shown on the storefront', () => {
  const d = OL.deliveryInfo();
  assert.equal(d.stock_days, '1–3');
  assert.equal(d.order_days, '10–18');
  OL.setCatalog(OL.PRODUCTS, { delivery: { order_days: '7–10' } }, 'live');
  assert.equal(OL.deliveryInfo().order_days, '7–10', 'the live setting wins');
  assert.equal(OL.deliveryInfo().stock_days, '1–3', 'the rest falls back to the defaults');
  OL.setCatalog(OL.STATIC_PRODUCTS, OL.STATIC_SETTINGS, 'static');
});
