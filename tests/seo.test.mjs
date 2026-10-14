// node --test tests/*.test.mjs  — server-rendered meta, JSON-LD, sitemap, robots
import test from 'node:test';
import assert from 'node:assert/strict';
import pageHandler from '../api/page.js';
import sitemapHandler from '../api/sitemap.js';
import robotsHandler from '../api/robots.js';
import { injectHead, jsonLd, esc, robotsTxt, sitemapXml, productJsonLd, productMeta } from '../api/_lib/seo.js';

const res = () => {
  const r = { code: 200, body: '', headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.send = (b) => { r.body = b; return r; };
  return r;
};
const call = async (handler, query = {}) => {
  const r = res();
  await handler({ method: 'GET', query, url: '/x', headers: {} }, r);
  return r;
};
const ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SITE_URL'];
const configure = (extra = {}) => Object.assign(process.env, { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', ...extra });
const reset = () => ENV.forEach((k) => delete process.env[k]);

const ROW = (over = {}) => ({
  slug: 'lacoste-classic-fit-polo-black', name: 'Classic Fit Polo', color: 'Black', color_hex: '#141414', color_group: 'black',
  style_code: 'LC-L1212', sku: 'L1212', category: 'polos', origin: 'FR', material: '100% хлопок', fit: 'regular', model_info: null, order_lead: null,
  price: 1290000, old_price: 1590000, description_ru: 'Классика.', description_uz: null, description_en: null, tags: [],
  is_new: true, is_featured: false, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-10T08:00:00Z',
  brands: { name: 'Lacoste' },
  product_images: [{ path: 'https://images.unsplash.com/a', sort: 0, is_main: true }],
  product_sizes: [{ label: 'M', sort: 0, stock: 2, orderable: true }, { label: 'L', sort: 1, stock: 0, orderable: false }],
  ...over,
});
const OPEN = [{ key: 'site', value: { indexing: true } }];
const CATS = [
  { slug: 'polos', department: 'clothing', name_ru: 'Поло', name_uz: 'Polo', name_en: 'Polos', size_system: 'letter', image_path: null, sort: 2 },
  { slug: 'belts', department: 'accessories', name_ru: 'Ремни', name_uz: 'Kamarlar', name_en: 'Belts', size_system: 'belt', image_path: null, sort: 15 },
  { slug: 'boots', department: 'shoes', name_ru: 'Ботинки', name_uz: 'Botinkalar', name_en: 'Boots', size_system: 'shoes', image_path: null, sort: 14 },
];
const mockDb = (rows, brands = [{ name: 'Lacoste', slug: 'lacoste' }], settings = OPEN, cats = CATS) => {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    let body = [];
    if (u.includes('/rest/v1/products')) {
      const m = decodeURIComponent(u).match(/slug=eq\.([a-z0-9-]+)/);
      body = m ? rows.filter((r) => r.slug === m[1]) : rows;
    } else if (u.includes('/rest/v1/brands')) {
      const m = decodeURIComponent(u).match(/slug=eq\.([a-z0-9-]+)/);
      body = m ? brands.filter((b) => b.slug === m[1]) : brands;
    } else if (u.includes('/rest/v1/categories')) {
      body = cats;
    } else if (u.includes('/rest/v1/settings')) body = settings;
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
};
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('product page: own title, description, canonical, Open Graph, Product + Offer', async () => {
  configure();
  const db = mockDb([ROW()]);
  try {
    const r = await call(pageHandler, { type: 'product', slug: 'lacoste-classic-fit-polo-black' });
    assert.equal(r.code, 200);
    const h = r.body;
    assert.match(h, /<title>Lacoste Classic Fit Polo Black купить — Outlet Lounge<\/title>/);
    assert.equal((h.match(/<title>/g) || []).length, 1, 'the shell\'s generic title is replaced, not duplicated');
    assert.equal((h.match(/name="description"/g) || []).length, 1);
    assert.match(h, /<link rel="canonical" href="https:\/\/outletlounge\.uz\/product\/lacoste-classic-fit-polo-black" \/>/);
    assert.match(h, /<meta property="og:image" content="https:\/\/images\.unsplash\.com\/a" \/>/);
    assert.match(h, /<meta property="og:type" content="product" \/>/);
    assert.match(h, /<html lang="ru"/);
    assert.match(h, /1 290 000 сум вместо 1 590 000 сум/);
    const [product, crumbs] = ldBlocks(h);
    assert.equal(product['@type'], 'Product');
    assert.equal(product.offers.priceCurrency, 'UZS');
    assert.equal(product.offers.price, '1290000');
    assert.equal(product.offers.availability, 'https://schema.org/InStock');
    assert.equal(product.brand.name, 'Lacoste');
    assert.equal(product.color, 'Black');
    assert.equal(product.material, '100% хлопок');
    assert.equal(product.countryOfOrigin, 'FR');
    assert.equal(crumbs['@type'], 'BreadcrumbList');
    assert.equal(crumbs.itemListElement.length, 3);
    assert.match(h, /<noscript><section><h1>Lacoste Classic Fit Polo/);
    assert.match(h, /Размеры: M/);
    assert.match(r.headers['Cache-Control'], /s-maxage=300/);
    assert.match(r.headers['Content-Type'], /text\/html/);
  } finally { db.restore(); reset(); }
});

test('availability: InStock when on the shelf here, PreOrder when it can only be ordered from abroad, else OutOfStock', async () => {
  configure();
  const availability = async (sizes) => {
    const db = mockDb([ROW({ product_sizes: sizes })]);
    try {
      const r = await call(pageHandler, { type: 'product', slug: 'lacoste-classic-fit-polo-black' });
      return { schema: ldBlocks(r.body)[0].offers.availability, body: r.body };
    } finally { db.restore(); }
  };
  try {
    assert.equal((await availability([{ label: 'M', sort: 0, stock: 2, orderable: true }])).schema, 'https://schema.org/InStock');
    const pre = await availability([{ label: 'M', sort: 0, stock: 0, orderable: true }, { label: 'L', sort: 1, stock: 0, orderable: false }]);
    assert.equal(pre.schema, 'https://schema.org/PreOrder');
    assert.match(pre.body, /Размеры: M\./, 'only sizes that can be bought are listed');
    const out = await availability([{ label: 'M', sort: 0, stock: 0, orderable: false }]);
    assert.equal(out.schema, 'https://schema.org/OutOfStock');
    assert.match(out.body, /нет в наличии/);
  } finally { reset(); }
});

test('markup injection through product data is neutralised', async () => {
  configure();
  const evil = '</script><script>alert(1)</script><img src=x onerror=alert(2)>"\'';
  const db = mockDb([ROW({ name: evil, color: evil, material: evil, description_ru: evil, brands: { name: evil } })]);
  try {
    const r = await call(pageHandler, { type: 'product', slug: 'lacoste-classic-fit-polo-black' });
    assert.ok(!r.body.includes('<script>alert(1)'), 'no live script from data');
    assert.ok(!/<img src=x/.test(r.body), 'no live tag from data');
    for (const block of ldBlocks(r.body)) assert.ok(block); // JSON-LD still parses
    assert.ok(r.body.includes('&lt;/script&gt;'), 'escaped in attributes and text');
  } finally { db.restore(); reset(); }
});

test('unknown, hidden or photo-less products are a real 404 with noindex', async () => {
  configure();
  const db = mockDb([ROW({ product_images: [] })]);
  try {
    for (const slug of ['lacoste-classic-fit-polo-black', 'nope', 'Bad Slug!']) {
      const r = await call(pageHandler, { type: 'product', slug });
      assert.equal(r.code, 404, slug);
      assert.match(r.body, /name="robots" content="noindex,follow"/);
      assert.match(r.body, /id="app"/, 'the shell is still served so the shop can show its own 404');
    }
  } finally { db.restore(); reset(); }
});

test('departments, categories, collections and brands list products for crawlers; unknown ones are 404', async () => {
  configure();
  const rows = [
    ROW(),
    ROW({ slug: 'boss-belt-black', name: 'Leather Belt', category: 'belts', brands: { name: 'BOSS' }, is_new: false, old_price: null }),
    ROW({ slug: 'gant-boots-brown', name: 'Boots', category: 'boots', brands: { name: 'Gant' }, is_new: false, old_price: 3000000, price: 2600000 }),
  ];
  const db = mockDb(rows, [{ name: 'Lacoste', slug: 'lacoste' }, { name: 'BOSS', slug: 'boss' }]);
  const links = (html) => [...html.matchAll(/href="\/product\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  try {
    let r = await call(pageHandler, { type: 'collection', slug: 'accessories' });
    assert.match(r.body, /<title>Мужские аксессуары — Outlet Lounge<\/title>/);
    assert.deepEqual(links(r.body), ['boss-belt-black'], 'only the department\'s products');
    r = await call(pageHandler, { type: 'collection', slug: 'shoes' });
    assert.deepEqual(links(r.body), ['gant-boots-brown']);
    r = await call(pageHandler, { type: 'collection', slug: 'new' });
    assert.deepEqual(links(r.body), ['lacoste-classic-fit-polo-black']);
    r = await call(pageHandler, { type: 'collection', slug: 'sale' });
    assert.deepEqual(links(r.body).sort(), ['gant-boots-brown', 'lacoste-classic-fit-polo-black']);
    r = await call(pageHandler, { type: 'collection', slug: 'men' });
    assert.equal(r.code, 200, 'the old gender pages are gone: plain shell, no special meta');
    assert.ok(!/<title>Мужские/.test(r.body));

    r = await call(pageHandler, { type: 'category', slug: 'belts' });
    assert.equal(r.code, 200);
    assert.match(r.body, /<title>Ремни — купить оригинал — Outlet Lounge<\/title>/);
    assert.match(r.body, /rel="canonical" href="https:\/\/outletlounge\.uz\/shop\/belts"/);
    assert.deepEqual(links(r.body), ['boss-belt-black']);
    const crumbs = ldBlocks(r.body)[0].itemListElement.map((x) => x.item);
    assert.deepEqual(crumbs, ['https://outletlounge.uz/', 'https://outletlounge.uz/accessories', 'https://outletlounge.uz/shop/belts']);
    r = await call(pageHandler, { type: 'category', slug: 'scarves' });
    assert.equal(r.code, 404);
    assert.match(r.body, /name="robots" content="noindex,follow"/);
    r = await call(pageHandler, { type: 'category', slug: 'Bad Slug!' });
    assert.equal(r.code, 404);

    r = await call(pageHandler, { type: 'brand', slug: 'boss' });
    assert.equal(r.code, 200);
    assert.match(r.body, /<title>BOSS — оригинальная мужская одежда и обувь — Outlet Lounge<\/title>/);
    assert.match(r.body, /rel="canonical" href="https:\/\/outletlounge\.uz\/brands\/boss"/);
    r = await call(pageHandler, { type: 'brand', slug: 'ghost' });
    assert.equal(r.code, 404);
    r = await call(pageHandler, { type: 'collection', slug: 'admin' });
    assert.equal(r.code, 200, 'an unknown collection falls back to the plain shell');
  } finally { db.restore(); reset(); }
});

test('info pages and home carry their own meta; home gets Store JSON-LD from the settings', async () => {
  configure();
  const db = mockDb([], [], [
    ...OPEN,
    { key: 'contacts', value: { phone: '+998901234567', instagram: 'outlet.lounge', telegram: 'outlet_manager', address: 'Ташкент, ул. Навои 1' } },
    { key: 'home', value: { hero: { image: 'https://images.unsplash.com/hero' } } },
    { key: 'legal', value: { company: 'ООО Outlet' } },
  ]);
  try {
    let r = await call(pageHandler, { type: 'info', slug: 'delivery' });
    assert.match(r.body, /<title>Доставка и оплата — Outlet Lounge<\/title>/);
    assert.match(r.body, /rel="canonical" href="https:\/\/outletlounge\.uz\/delivery"/);
    r = await call(pageHandler, { type: 'home' });
    assert.match(r.body, /<title>Outlet Lounge — мужская одежда, обувь и аксессуары, оригинал<\/title>/);
    assert.match(r.body, /og:image" content="https:\/\/images\.unsplash\.com\/hero"/);
    const org = ldBlocks(r.body)[0];
    assert.equal(org['@type'], 'Store');
    assert.equal(org.telephone, '+998901234567');
    assert.equal(org.address.streetAddress, 'Ташкент, ул. Навои 1');
    assert.deepEqual(org.sameAs, ['https://instagram.com/outlet.lounge', 'https://t.me/outlet_manager']);
    assert.equal(org.legalName, 'ООО Outlet');
  } finally { db.restore(); reset(); }
});

test('the database being down still serves the shell', async () => {
  configure();
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('down'); };
  try {
    const r = await call(pageHandler, { type: 'product', slug: 'lacoste-classic-fit-polo-black' });
    assert.equal(r.code, 200);
    assert.match(r.body, /id="app"/);
  } finally { globalThis.fetch = real; reset(); }
  const none = await call(pageHandler, { type: 'info', slug: 'faq' }); // no Supabase configured at all
  assert.match(none.body, /<title>Вопросы и ответы — Outlet Lounge<\/title>/);
});

test('sitemap: static pages, products with images and lastmod, brands; SITE_URL is respected', async () => {
  configure({ SITE_URL: 'https://shop.example/' });
  const db = mockDb([ROW(), ROW({ slug: 'no-photo', product_images: [] })]);
  try {
    const r = await call(sitemapHandler);
    assert.match(r.headers['Content-Type'], /application\/xml/);
    const x = r.body;
    assert.match(x, /<loc>https:\/\/shop\.example\/<\/loc>/);
    assert.match(x, /<loc>https:\/\/shop\.example\/product\/lacoste-classic-fit-polo-black<\/loc><lastmod>2026-10-10<\/lastmod>/);
    assert.match(x, /<image:loc>https:\/\/images\.unsplash\.com\/a<\/image:loc>/);
    assert.match(x, /<loc>https:\/\/shop\.example\/brands\/lacoste<\/loc>/);
    for (const page of ['clothing', 'shoes', 'accessories', 'new', 'sale', 'shop/polos', 'shop/belts']) {
      assert.ok(x.includes(`<loc>https://shop.example/${page}</loc>`), page);
    }
    for (const gone of ['men', 'women', 'kids']) assert.ok(!x.includes(`https://shop.example/${gone}<`), gone);
    assert.match(x, /<loc>https:\/\/shop\.example\/delivery<\/loc>/);
    assert.ok(!x.includes('no-photo'), 'products that cannot be shown are not listed');
    assert.ok(!x.includes('/admin') && !x.includes('/checkout'));
  } finally { db.restore(); reset(); }
});

test('robots.txt (open shop) blocks admin, api and private pages and names the sitemap', async () => {
  configure();
  const db = mockDb([]);
  try {
    const r = await call(robotsHandler);
    assert.match(r.body, /Allow: \//);
    assert.match(r.body, /Disallow: \/admin/);
    assert.match(r.body, /Disallow: \/api\//);
    assert.match(r.body, /Disallow: \/checkout/);
    assert.match(r.body, /Sitemap: https:\/\/outletlounge\.uz\/sitemap\.xml/);
  } finally { db.restore(); reset(); }
});

test('until the owner opens the shop: robots disallow everything, sitemap is empty, pages are noindex', async () => {
  configure();
  const db = mockDb([ROW()], [{ name: 'Lacoste', slug: 'lacoste' }], []); // no `site` setting at all
  try {
    const robots = await call(robotsHandler);
    assert.equal(robots.body, 'User-agent: *\nDisallow: /\n');
    const map = await call(sitemapHandler);
    assert.ok(!map.body.includes('<url>'), 'no urls listed');
    assert.match(map.body, /<urlset/);
    const page = await call(pageHandler, { type: 'product', slug: 'lacoste-classic-fit-polo-black' });
    assert.equal(page.code, 200);
    assert.match(page.body, /name="robots" content="noindex,nofollow"/);
    // switched on explicitly
    db.restore();
    const open = mockDb([ROW()], undefined, [{ key: 'site', value: { indexing: true } }]);
    const page2 = await call(pageHandler, { type: 'product', slug: 'lacoste-classic-fit-polo-black' });
    assert.match(page2.body, /name="robots" content="index,follow,max-image-preview:large"/);
    open.restore();
  } finally { db.restore(); reset(); }
});

test('robots.txt answers 503 when the setting cannot be read (crawlers retry instead of caching a guess)', async () => {
  configure();
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('down'); };
  try {
    const r = await call(robotsHandler);
    assert.equal(r.code, 503);
  } finally { globalThis.fetch = real; reset(); }
});

test('helpers: injectHead is idempotent per tag, jsonLd is script-safe, productMeta shape', () => {
  const shell = '<html lang="en"><head><title>x</title><meta name="description" content="old"><meta property="og:title" content="old"></head><body><div id="app"></div></body></html>';
  const out = injectHead(shell, { title: 'T & "Q"', description: 'D', path: '/p' }, 'https://s.test');
  assert.equal((out.match(/og:title/g) || []).length, 1);
  assert.match(out, /<title>T &amp; &quot;Q&quot;<\/title>/);
  assert.match(out, /lang="ru"/);
  assert.equal(jsonLd({ a: '</script>' }).includes('</script>'), false);
  assert.equal(esc('<&>"\''), '&lt;&amp;&gt;&quot;&#39;');
  const m = productMeta({ slug: 's', brand: 'Nike', name: 'Dunk', color: '', price: 1000, was: 1000, images: ['i'], desc: { ru: '' } }, 'https://s.test');
  assert.equal(m.path, '/product/s');
  assert.match(m.title, /^Nike Dunk купить — Outlet Lounge$/);
  assert.ok(productJsonLd({ slug: 's', brand: '', name: 'Dunk', price: 1, images: [], sizes: [], desc: {} }, 'https://s.test').offers);
  assert.match(robotsTxt('https://s.test'), /Sitemap: https:\/\/s\.test\/sitemap\.xml/);
  assert.match(sitemapXml('https://s.test', [{ path: '/a', priority: 0.5 }]), /<priority>0.5<\/priority>/);
});
