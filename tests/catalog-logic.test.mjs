// node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// load the browser scripts into a sandbox (they only need `window`)
const sandbox = { window: {}, URL, URLSearchParams }; // browser globals the scripts use
vm.createContext(sandbox);
for (const f of ['assets/js/data.js', 'assets/js/catalog-logic.js', 'assets/js/router.js']) {
  vm.runInContext(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), sandbox);
}
const OL = sandbox.window.OL;
const C = OL.catalog;
const P = OL.STATIC_PRODUCTS;
const slugs = (list) => JSON.parse(JSON.stringify(list.map((p) => p.slug)));
// values created inside the vm sandbox have a different Array prototype: compare as plain JSON
const eq = (actual, expected, msg) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected, msg);

const product = (over) => ({
  id: 'x', slug: 'x', brand: 'Nike', name: 'X', cat: 'lifestyle', gender: 'unisex',
  price: 1000000, was: 2000000, images: ['a'], tag: null, isNew: false, featured: false,
  sizes: [{ s: 42, ok: true, stock: 3 }], ...over,
});

test('placeholder catalog has what the tests below rely on', () => {
  assert.equal(P.length, 18);
  assert.ok(P.some((p) => p.gender === 'women') && P.some((p) => p.gender === 'kids'));
});

/* ---------------------------------------------------------- URL state */
test('query string round-trips', () => {
  const f = C.parseQuery('?cat=running,lifestyle&brand=nike&size=41,42&min=500000&max=1500000&off=40&sort=price-asc&stock=0&q=jordan');
  eq(f.cat, ['running', 'lifestyle']);
  eq(f.size, [41, 42]);
  assert.equal(f.min, 500000);
  assert.equal(f.off, 40);
  assert.equal(f.stock, false);
  assert.equal(f.sort, 'price-asc');
  const back = C.parseQuery(C.toQuery(f, 'all'));
  eq(back, JSON.parse(JSON.stringify(f)));
});

test('defaults are not written to the URL; bad values are ignored', () => {
  assert.equal(C.toQuery(C.emptyFilters(), 'all'), '');
  assert.equal(C.toQuery({ ...C.emptyFilters(), sort: 'newest' }, 'all'), '', 'default sort omitted');
  assert.equal(C.toQuery({ ...C.emptyFilters(), sort: 'discount' }, 'sale'), '', 'sale default sort omitted');
  const f = C.parseQuery('?sort=hacked&off=999&min=abc&gender=men,evil&size=x,40');
  assert.equal(f.sort, null);
  assert.equal(f.off, 90);
  assert.equal(f.min, null);
  eq(f.gender, ['men']);
  eq(f.size, [40]);
});

/* ---------------------------------------------------------- collections */
test('collections pick the right base set', () => {
  assert.equal(C.base(P, 'all').length, 18);
  assert.ok(C.base(P, 'new').every((p) => p.isNew));
  assert.ok(C.base(P, 'men').every((p) => p.gender === 'men' || p.gender === 'unisex'));
  assert.ok(C.base(P, 'men').length > 0 && !C.base(P, 'men').some((p) => p.gender === 'women'));
  assert.ok(C.base(P, 'women').some((p) => p.gender === 'women') && C.base(P, 'women').some((p) => p.gender === 'unisex'));
  eq(C.base(P, 'kids').map((p) => p.gender), ['kids']);
  assert.ok(C.base(P, 'brand', 'new-balance').every((p) => p.brand === 'New Balance'));
  assert.equal(C.base(P, 'sale').length, 18, 'every placeholder has an old price');
});

/* ---------------------------------------------------------- filters */
test('category, brand and gender filters', () => {
  const f = { ...C.emptyFilters(), cat: ['basketball'], brand: ['jordan'] };
  assert.ok(C.filter(P, f).every((p) => p.cat === 'basketball' && p.brand === 'Jordan'));
  const women = C.filter(P, { ...C.emptyFilters(), gender: ['women'] });
  assert.ok(women.some((p) => p.gender === 'unisex'), 'unisex shows under women');
  assert.ok(!women.some((p) => p.gender === 'kids'));
});

test('size filter only matches sizes that are in stock', () => {
  const list = [
    product({ slug: 'a', sizes: [{ s: 42, ok: true, stock: 2 }] }),
    product({ slug: 'b', sizes: [{ s: 42, ok: false, stock: 0 }, { s: 41, ok: true, stock: 1 }] }),
  ];
  eq(slugs(C.filter(list, { ...C.emptyFilters(), size: [42] })), ['a']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), size: [41, 42] })), ['a', 'b']);
});

test('sold-out products are hidden unless stock=false', () => {
  const list = [product({ slug: 'in' }), product({ slug: 'out', sizes: [{ s: 42, ok: false, stock: 0 }] })];
  eq(slugs(C.filter(list, C.emptyFilters())), ['in']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), stock: false })), ['in', 'out']);
});

test('price range and discount', () => {
  const list = [product({ slug: 'cheap', price: 500000, was: 1000000 }), product({ slug: 'mid', price: 1000000, was: 1250000 }), product({ slug: 'dear', price: 2000000, was: 2100000 })];
  eq(slugs(C.filter(list, { ...C.emptyFilters(), min: 800000, max: 1500000 })), ['mid']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), off: 40 })), ['cheap']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), off: 20 })), ['cheap', 'mid']);
  eq(C.priceBounds(list), [500000, 2000000]);
});

/* ---------------------------------------------------------- sort + facets */
test('sorting is stable and respects the key', () => {
  const list = [product({ slug: 'a', price: 3 }), product({ slug: 'b', price: 1 }), product({ slug: 'c', price: 1 }), product({ slug: 'd', price: 2, featured: true })];
  eq(slugs(C.sort(list, 'price-asc')), ['b', 'c', 'd', 'a']);
  eq(slugs(C.sort(list, 'price-desc')), ['a', 'd', 'b', 'c']);
  eq(slugs(C.sort(list, 'newest')), ['a', 'b', 'c', 'd']);
  assert.equal(C.sort(list, 'popular')[0].slug, 'd');
});

test('facet counts ignore their own filter but respect the others', () => {
  const list = [
    product({ slug: '1', brand: 'Nike', cat: 'running' }),
    product({ slug: '2', brand: 'Nike', cat: 'lifestyle' }),
    product({ slug: '3', brand: 'Vans', cat: 'lifestyle' }),
  ];
  // brand=nike selected: category counts only count Nike; brand counts ignore the brand filter
  const f = { ...C.emptyFilters(), brand: ['nike'] };
  const facets = C.facets(list, f);
  assert.equal(facets.cat.get('running'), 1);
  assert.equal(facets.cat.get('lifestyle'), 1, 'Vans lifestyle excluded');
  assert.equal(facets.brand.get('nike'), 2);
  assert.equal(facets.brand.get('vans'), 1, 'other brands stay visible');
});

test('activeCount counts removable filters only', () => {
  const bounds = [500000, 2000000];
  assert.equal(C.activeCount(C.emptyFilters(), bounds), 0);
  assert.equal(C.activeCount({ ...C.emptyFilters(), cat: ['a'], size: [41, 42], min: 500000 }, bounds), 3, 'min equal to bound is not a filter');
  assert.equal(C.activeCount({ ...C.emptyFilters(), min: 700000, off: 30 }, bounds), 2);
});

/* ---------------------------------------------------------- router */
test('router resolves URLs to pages', () => {
  const r = (u) => OL.resolve(u, 'https://x.test');
  assert.equal(r('/').name, 'home');
  assert.equal(r('/index.html').name, 'home');
  eq(r('/shop').params, { collection: 'all' });
  assert.equal(r('/shop?cat=running').search, '?cat=running');
  assert.equal(r('/men').params.collection, 'men');
  assert.equal(r('/sale/').params.collection, 'sale');
  eq({ ...r('/brands/new-balance').params }, { collection: 'brand', brand: 'new-balance' });
  eq({ ...r('/product/air-max-1-sunset').params }, { slug: 'air-max-1-sunset' });
  assert.equal(r('/wishlist').name, 'wishlist');
  assert.equal(r('/nope').name, 'notfound');
  assert.equal(r('/product/').name, 'notfound');
  assert.equal(r('/product/Bad_Slug').name, 'notfound', 'slugs are lowercase a-z0-9-');
});
