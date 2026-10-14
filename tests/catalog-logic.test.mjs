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

// a size is { s: label, ok: buyable, stock: pieces here, order: can be ordered from abroad }
const z = (s, stock, order = true) => ({ s, ok: stock > 0 || order, stock, order });
const product = (over) => ({
  id: 'x', slug: 'x', brand: 'Gant', name: 'X', cat: 'polos', colorGroup: 'navy', styleCode: null, origin: 'IT',
  price: 1000000, was: 2000000, images: ['a'], tag: null, isNew: false, featured: false,
  sizes: [z('M', 3)], ...over,
});

test('placeholder catalog has what the tests below rely on', () => {
  assert.equal(P.length, 27);
  assert.ok(P.every((p) => OL.CAT[p.cat]), 'every product is in a known category');
  assert.ok(P.some((p) => OL.catDept(p.cat) === 'clothing') && P.some((p) => OL.catDept(p.cat) === 'shoes') && P.some((p) => OL.catDept(p.cat) === 'accessories'));
  assert.ok(P.some((p) => C.availability(p) === 'order'), 'a product that can only be ordered');
});

/* ---------------------------------------------------------- URL state */
test('query string round-trips', () => {
  const f = C.parseQuery('?cat=polos,jeans&brand=gant&size=M,32&color=navy,black&origin=it&avail=order&min=500000&max=1500000&off=40&sort=price-asc&stock=0&q=polo');
  eq(f.cat, ['polos', 'jeans']);
  eq(f.size, ['M', '32']);
  eq(f.color, ['navy', 'black']);
  eq(f.origin, ['IT']);
  eq(f.avail, ['order']);
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
  const f = C.parseQuery('?sort=hacked&off=999&min=abc&color=pink,navy&avail=x,stock&size=<b>,XL&origin=ITALY,fr');
  assert.equal(f.sort, null);
  assert.equal(f.off, 90);
  assert.equal(f.min, null);
  eq(f.color, ['navy']);
  eq(f.avail, ['stock']);
  eq(f.size, ['XL']);
  eq(f.origin, ['FR']);
});

/* ---------------------------------------------------------- collections */
test('collections pick the right base set', () => {
  assert.equal(C.base(P, 'all').length, 27);
  assert.ok(C.base(P, 'new').every((p) => p.isNew));
  const shoes = C.base(P, 'dept', 'shoes');
  assert.ok(shoes.length > 0 && shoes.every((p) => OL.catDept(p.cat) === 'shoes'));
  const polos = C.base(P, 'category', 'polos');
  assert.ok(polos.length > 0 && polos.every((p) => p.cat === 'polos'));
  assert.ok(C.base(P, 'brand', 'gant').every((p) => p.brand === 'Gant'));
  assert.ok(C.base(P, 'sale').every((p) => OL.off(p) > 0));
});

/* ---------------------------------------------------------- availability */
test('a product is in stock, on order or sold out', () => {
  assert.equal(C.availability(product({ sizes: [z('M', 2), z('L', 0)] })), 'stock');
  assert.equal(C.availability(product({ sizes: [z('M', 0), z('L', 0)] })), 'order', 'nothing here but orderable');
  assert.equal(C.availability(product({ sizes: [z('M', 0, false), z('L', 0, false)] })), 'sold');
  assert.equal(C.sizeState(z('M', 1)), 'stock');
  assert.equal(C.sizeState(z('M', 0)), 'order');
  assert.equal(C.sizeState(z('M', 0, false)), 'sold');
});

/* ---------------------------------------------------------- filters */
test('category and brand filters', () => {
  const f = { ...C.emptyFilters(), cat: ['jeans'], brand: ['gant'] };
  assert.ok(C.filter(P, f).every((p) => p.cat === 'jeans' && p.brand === 'Gant'));
});

test('size filter matches labels that can be bought (stock or order), not sold-out ones', () => {
  const list = [
    product({ slug: 'a', sizes: [z('M', 2)] }),
    product({ slug: 'b', sizes: [z('M', 0, false), z('L', 1)] }),
    product({ slug: 'c', sizes: [z('M', 0)] }),
  ];
  eq(slugs(C.filter(list, { ...C.emptyFilters(), size: ['M'] })), ['a', 'c']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), size: ['L'] })), ['b']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), size: ['M', 'L'] })), ['a', 'b', 'c']);
});

test('colour, origin and availability filters', () => {
  const list = [
    product({ slug: 'navy-it', colorGroup: 'navy', origin: 'IT', sizes: [z('M', 2)] }),
    product({ slug: 'black-fr', colorGroup: 'black', origin: 'FR', sizes: [z('M', 0)] }),
    product({ slug: 'none', colorGroup: null, origin: null, sizes: [z('M', 1), z('L', 0)] }),
  ];
  eq(slugs(C.filter(list, { ...C.emptyFilters(), color: ['black'] })), ['black-fr']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), color: ['other'] })), ['none'], 'no colour group counts as other');
  eq(slugs(C.filter(list, { ...C.emptyFilters(), origin: ['IT'] })), ['navy-it']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), avail: ['stock'] })), ['navy-it', 'none']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), avail: ['order'] })), ['black-fr', 'none'], 'some size can be ordered');
});

test('sold-out products are hidden unless stock=false', () => {
  const list = [product({ slug: 'in' }), product({ slug: 'out', sizes: [z('M', 0, false)] }), product({ slug: 'order', sizes: [z('M', 0)] })];
  eq(slugs(C.filter(list, C.emptyFilters())), ['in', 'order'], 'on-order items stay visible');
  eq(slugs(C.filter(list, { ...C.emptyFilters(), stock: false })), ['in', 'out', 'order']);
});

test('price range and discount', () => {
  const list = [product({ slug: 'cheap', price: 500000, was: 1000000 }), product({ slug: 'mid', price: 1000000, was: 1250000 }), product({ slug: 'dear', price: 2000000, was: 2100000 })];
  eq(slugs(C.filter(list, { ...C.emptyFilters(), min: 800000, max: 1500000 })), ['mid']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), off: 40 })), ['cheap']);
  eq(slugs(C.filter(list, { ...C.emptyFilters(), off: 20 })), ['cheap', 'mid']);
  eq(C.priceBounds(list), [500000, 2000000]);
});

/* ---------------------------------------------------------- sizes, sort, facets */
test('size labels sort letters first, then numbers, then the rest', () => {
  eq(C.sortSizes(['XL', '42', 'S', '30', 'ONE SIZE', 'M', '30']), ['S', 'M', 'XL', '30', '42', 'ONE SIZE']);
});

test('sorting is stable and respects the key', () => {
  const list = [product({ slug: 'a', price: 3 }), product({ slug: 'b', price: 1 }), product({ slug: 'c', price: 1 }), product({ slug: 'd', price: 2, featured: true })];
  eq(slugs(C.sort(list, 'price-asc')), ['b', 'c', 'd', 'a']);
  eq(slugs(C.sort(list, 'price-desc')), ['a', 'd', 'b', 'c']);
  eq(slugs(C.sort(list, 'newest')), ['a', 'b', 'c', 'd']);
  assert.equal(C.sort(list, 'popular')[0].slug, 'd');
});

test('facet counts ignore their own filter but respect the others', () => {
  const list = [
    product({ slug: '1', brand: 'Gant', cat: 'polos' }),
    product({ slug: '2', brand: 'Gant', cat: 'jeans' }),
    product({ slug: '3', brand: 'Boss', cat: 'jeans' }),
  ];
  // brand=gant selected: category counts only count Gant; brand counts ignore the brand filter
  const f = { ...C.emptyFilters(), brand: ['gant'] };
  const facets = C.facets(list, f);
  assert.equal(facets.cat.get('polos'), 1);
  assert.equal(facets.cat.get('jeans'), 1, 'Boss jeans excluded');
  assert.equal(facets.brand.get('gant'), 2);
  assert.equal(facets.brand.get('boss'), 1, 'other brands stay visible');
  eq(facets.colors, ['navy']);
  eq(facets.origins, ['IT']);
});

test('activeCount counts removable filters only', () => {
  const bounds = [500000, 2000000];
  assert.equal(C.activeCount(C.emptyFilters(), bounds), 0);
  assert.equal(C.activeCount({ ...C.emptyFilters(), cat: ['a'], size: ['M', 'L'], min: 500000 }, bounds), 3, 'min equal to bound is not a filter');
  assert.equal(C.activeCount({ ...C.emptyFilters(), min: 700000, off: 30, color: ['navy'], avail: ['order'] }, bounds), 4);
});

/* ---------------------------------------------------------- colours + related */
test('other colours share a style code and never include the product itself', () => {
  const a = product({ slug: 'a', styleCode: 'POLO-1' });
  const b = product({ slug: 'b', styleCode: 'polo-1' });
  const c = product({ slug: 'c', styleCode: 'POLO-2' });
  const d = product({ slug: 'd', styleCode: null });
  eq(slugs(C.otherColours([a, b, c, d], a)), ['b']);
  eq(slugs(C.otherColours([a, b, c, d], d)), [], 'no style code, no siblings');
  eq(slugs(C.onePerStyle([a, b, c, d])), ['a', 'c', 'd'], 'one card per style');
});

test('related items skip the own colours; the look comes from other departments', () => {
  const polo = P.find((p) => p.slug === 'lacoste-classic-fit-polo-black');
  const rel = C.related(P, polo, 4);
  assert.ok(rel.length > 0 && !rel.includes(polo));
  assert.ok(!rel.some((p) => p.styleCode && p.styleCode === polo.styleCode), 'not the same item in another colour');
  const look = C.completeLook(P, polo, 4);
  assert.ok(look.length > 0 && look.every((p) => OL.catDept(p.cat) !== 'clothing'));
});

/* ---------------------------------------------------------- router */
test('router resolves URLs to pages', () => {
  const r = (u) => OL.resolve(u, 'https://x.test');
  assert.equal(r('/').name, 'home');
  assert.equal(r('/index.html').name, 'home');
  eq(r('/shop').params, { collection: 'all' });
  assert.equal(r('/shop?cat=polos').search, '?cat=polos');
  eq({ ...r('/shop/polos').params }, { collection: 'category', key: 'polos' });
  eq({ ...r('/clothing').params }, { collection: 'dept', key: 'clothing' });
  eq({ ...r('/accessories/').params }, { collection: 'dept', key: 'accessories' });
  assert.equal(r('/sale/').params.collection, 'sale');
  assert.equal(r('/new').params.collection, 'new');
  eq({ ...r('/brands/hugo-boss').params }, { collection: 'brand', key: 'hugo-boss' });
  eq({ ...r('/product/gant-denim-jacket-blue').params }, { slug: 'gant-denim-jacket-blue' });
  assert.equal(r('/wishlist').name, 'wishlist');
  assert.equal(r('/size-guide').name, 'info');
  assert.equal(r('/nope').name, 'notfound');
  assert.equal(r('/men').name, 'notfound', 'the sneaker shop’s gender pages are gone');
  assert.equal(r('/product/').name, 'notfound');
  assert.equal(r('/product/Bad_Slug').name, 'notfound', 'slugs are lowercase a-z0-9-');
});
