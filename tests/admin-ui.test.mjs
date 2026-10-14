// node --test tests/*.test.mjs  — admin panel: HTML escaping, translations, error mapping
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, esc } from '../assets/admin/dom.js';
import { DICT, LANGS, setLang, t } from '../assets/admin/i18n.js';
import { mapError, AdminError, normalizeProduct } from '../assets/admin/data.js';

test('html`` escapes everything interpolated, including attributes', () => {
  const evil = '<img src=x onerror=alert(1)> "quoted" \'single\' & more';
  const out = String(html`<p title="${evil}">${evil}</p>`);
  assert.ok(!out.includes('<img'), out);
  assert.ok(!/title="[^"]*"[^>]*"/.test(out.replace(/&quot;/g, '')), 'attribute value stays inside its quotes');
  assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(out, /&quot;quoted&quot;/);
  assert.match(out, /&#39;single&#39;/);
});

test('html`` keeps trusted markup, joins lists and drops false / null', () => {
  const items = ['a', '<b>'].map((x) => html`<li>${x}</li>`);
  assert.equal(String(html`<ul>${items}</ul>`), '<ul><li>a</li><li>&lt;b&gt;</li></ul>');
  assert.equal(String(html`${false}|${null}|${undefined}|${0}`), '|||0');
  assert.equal(String(html`${raw('<i>ok</i>')}`), '<i>ok</i>');
  assert.equal(esc(null), '');
  assert.equal(esc(5), '5');
});

test('RU / UZ / EN have exactly the same keys and every text is filled', () => {
  const keys = (o) => Object.keys(o).sort();
  assert.deepEqual(LANGS, ['ru', 'uz', 'en']);
  assert.deepEqual(keys(DICT.uz), keys(DICT.ru), 'uz keys');
  assert.deepEqual(keys(DICT.en), keys(DICT.ru), 'en keys');
  for (const l of LANGS) for (const [k, v] of Object.entries(DICT[l])) assert.ok(String(v).trim(), `${l}:${k}`);
});

test('placeholders match across languages', () => {
  const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of Object.keys(DICT.ru)) {
    assert.equal(vars(DICT.uz[k]), vars(DICT.ru[k]), `uz ${k}`);
    assert.equal(vars(DICT.en[k]), vars(DICT.ru[k]), `en ${k}`);
  }
});

test('Uzbek uses oʻ / gʻ (U+02BB), never plain or curly apostrophes inside words', () => {
  for (const [k, v] of Object.entries(DICT.uz)) {
    assert.ok(!/[A-Za-z][’'‘`´][A-Za-z]/.test(v), `${k}: ${v}`);
  }
});

test('t() falls back to Russian, then to the key, and fills variables', () => {
  setLang('en');
  assert.equal(t('nav.orders'), 'Orders');
  assert.equal(t('order.title', { no: 'OL-1' }), 'Order OL-1');
  assert.equal(t('does.not.exist'), 'does.not.exist');
  setLang('ru');
  assert.equal(t('nav.orders'), 'Заказы');
  setLang('xx');
  assert.equal(t('nav.orders'), 'Заказы', 'unknown language keeps the current one');
});

test('database / network errors become stable codes', () => {
  assert.equal(mapError({ code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' }).code, 'slug_taken');
  assert.equal(mapError({ code: '42501', message: 'permission denied for table orders' }).code, 'denied');
  assert.equal(mapError({ message: 'new row violates row-level security policy' }).code, 'denied');
  assert.equal(mapError({ message: 'forbidden' }).code, 'denied');
  assert.equal(mapError({ code: 'PGRST301', message: 'JWT expired' }).code, 'auth');
  assert.equal(mapError({ message: 'invalid:slug' }).code, 'invalid');
  assert.equal(mapError({ message: 'order_cancelled' }).code, 'order_cancelled');
  assert.equal(mapError(new TypeError('Failed to fetch')).code, 'offline');
  assert.equal(mapError({ message: 'something odd' }).code, 'unknown');
  const e = new AdminError('denied');
  assert.equal(mapError(e), e);
});

test('normalizeProduct orders sizes and photos and flattens the brand', () => {
  const p = normalizeProduct({
    id: 'p1', slug: 'x', name: 'X', color: 'Navy', color_hex: '#1F2A44', color_group: 'navy', style_code: 'ZZ-1', sku: null,
    category: 'polos', origin: 'IT', material: null, fit: 'slim', model_info: null, order_lead: '10–18', price: 100, old_price: null,
    is_active: true, is_new: false, is_featured: true, created_at: '2026-01-01', tags: null, brand_id: 'b', brands: { name: 'Nike' },
    product_images: [{ path: 'b', sort: 1, is_main: false }, { path: 'a', sort: 0, is_main: true }],
    product_sizes: [
      { id: 's3', label: '10', sort: 2, stock: 1, orderable: true }, { id: 's2', label: 'XL', sort: 1, stock: 2, orderable: false },
      { id: 's1', label: 'M', sort: 0, stock: 0, orderable: true }, { id: 's4', label: '9', sort: 2, stock: 1, orderable: true },
    ],
  });
  assert.equal(p.brand_name, 'Nike');
  assert.deepEqual(p.images, [{ path: 'a' }, { path: 'b' }]);
  assert.deepEqual(p.sizes.map((s) => s.label), ['M', 'XL', '9', '10'], 'saved order first, then natural (9 before 10)');
  assert.deepEqual(p.sizes.map((s) => s.orderable), [true, false, true, true]);
  assert.deepEqual(p.tags, []);
  assert.deepEqual([p.color, p.color_hex, p.color_group, p.style_code, p.origin, p.fit, p.order_lead, p.material, p.model_info],
    ['Navy', '#1F2A44', 'navy', 'ZZ-1', 'IT', 'slim', '10–18', '', '']);
  assert.ok(!('colorway' in p) && !('gender' in p));
});
