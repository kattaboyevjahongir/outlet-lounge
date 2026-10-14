// node --test tests/*.test.mjs — menswear parts of the admin logic: size labels and their order,
// other colours of an item, categories, on-order stock state, delivery lead times.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../assets/admin/logic.js';

test('size systems: every system has labels the database accepts, no duplicates', () => {
  assert.deepEqual(Object.keys(L.SIZE_SYSTEMS).sort(), [...L.SIZE_SYSTEM_IDS].sort());
  for (const [id, labels] of Object.entries(L.SIZE_SYSTEMS)) {
    assert.ok(labels.length > 0, id);
    assert.equal(new Set(labels).size, labels.length, `${id}: no duplicates`);
    for (const l of labels) assert.ok(L.SIZE_LABEL_RE.test(l), `${id}: ${l}`);
  }
  assert.deepEqual(L.SIZE_SYSTEMS.one, ['ONE SIZE']);
});

test('sizeRows: one row per label, sold out until a quantity is typed, can be ordered by default', () => {
  const rows = L.sizeRows('waist');
  assert.deepEqual(rows.map((r) => r.label), L.SIZE_SYSTEMS.waist);
  assert.ok(rows.every((r) => r.stock === '' && r.orderable === true));
  assert.deepEqual(L.sizeRows('nonsense').map((r) => r.label), L.SIZE_SYSTEMS.letter, 'unknown system falls back to letters');
  rows[0].label = 'changed';
  assert.notEqual(L.sizeRows('waist')[0].label, 'changed', 'rows are fresh objects each time');
});

test('sortLabels: the system order first, anything else after it in natural order', () => {
  assert.deepEqual(L.sortLabels(['XL', 'S', 'M', 'L'], 'letter'), ['S', 'M', 'L', 'XL']);
  assert.deepEqual(L.sortLabels(['XXL', 'S', 'ONE', 'XS', 'Custom'], 'letter'), ['XS', 'S', 'XXL', 'Custom', 'ONE']);
  assert.deepEqual(L.sortLabels(['10', '9', '42', '8'], 'nonsense'), ['8', '9', '10', '42'], 'natural order, so 9 comes before 10');
  assert.deepEqual(L.sortLabels(['M', 'M', 'S'], 'letter'), ['S', 'M'], 'duplicates collapse');
});

test('placeLabel: a new size goes where it belongs in the product\'s own list', () => {
  assert.deepEqual(L.placeLabel(['S', 'L', 'XL'], 'M', 'letter'), ['S', 'M', 'L', 'XL']);
  assert.deepEqual(L.placeLabel(['M', 'L'], 'XS', 'letter'), ['XS', 'M', 'L']);
  assert.deepEqual(L.placeLabel(['S', 'M'], 'XXL', 'letter'), ['S', 'M', 'XXL']);
  assert.deepEqual(L.placeLabel(['S', 'M'], 'Tall', 'letter'), ['S', 'M', 'Tall'], 'a label the system does not know goes last');
  assert.deepEqual(L.placeLabel([], 'M', 'letter'), ['M']);
  assert.deepEqual(L.placeLabel(['40', '42'], '41', 'shoes'), ['40', '41', '42']);
  const own = ['XL', 'S'];                         // the owner's own order is kept around the new label
  assert.deepEqual(L.placeLabel(own, 'M', 'letter'), ['XL', 'S', 'M']);
  assert.deepEqual(own, ['XL', 'S'], 'the input is not changed');
});

test('categories: suggested size system and department of a category', () => {
  const cats = [{ slug: 'jeans', department: 'clothing', size_system: 'waist' }, { slug: 'belts', department: 'accessories', size_system: 'belt' }];
  assert.equal(L.systemOfCategory(cats, 'jeans'), 'waist');
  assert.equal(L.systemOfCategory(cats, 'belts'), 'belt');
  assert.equal(L.systemOfCategory(cats, 'unknown'), 'letter');
  assert.equal(L.systemOfCategory(cats, ''), 'letter');
  assert.equal(L.categoryDepartment(cats, 'belts'), 'accessories');
  assert.equal(L.categoryDepartment(cats, 'unknown'), '');
});

test('category validation and row: slug, department, three names, size system, order', () => {
  const ok = { isNew: true, slug: 'scarves', department: 'accessories', name_ru: 'Шарфы', name_uz: 'Sharflar', name_en: 'Scarves', size_system: 'one', sort: '21', is_active: true };
  assert.deepEqual(L.validateCategory(ok, ['belts']), { ok: true, errors: {} });
  const bad = (over, taken = ['belts']) => L.validateCategory({ ...ok, ...over }, taken).errors;
  assert.equal(bad({ slug: 'Bad Slug' }).slug, 'slug');
  assert.equal(bad({ slug: '' }).slug, 'slug');
  assert.equal(bad({ slug: 'belts' }).slug, 'taken');
  assert.equal(bad({ slug: 'belts', isNew: false }).slug, undefined, 'editing keeps its own slug');
  assert.equal(bad({ department: 'toys' }).department, 'invalid');
  for (const k of ['name_ru', 'name_uz', 'name_en']) {
    assert.equal(bad({ [k]: '  ' })[k], 'required', k);
    assert.equal(bad({ [k]: 'x'.repeat(61) })[k], 'long', k);
  }
  assert.equal(bad({ size_system: 'huge' }).size_system, 'invalid');
  assert.equal(bad({ sort: '-1' }).sort, 'number');
  assert.equal(bad({ sort: '1.5' }).sort, 'number');
  assert.equal(bad({ sort: '' }).sort, undefined, 'order is optional');
  const row = L.categoryToRow({ ...ok, slug: ' scarves ', name_en: ' Scarves ', sort: '', image_path: '' });
  assert.deepEqual(row, { slug: 'scarves', department: 'accessories', name_ru: 'Шарфы', name_uz: 'Sharflar', name_en: 'Scarves', size_system: 'one', sort: 0, is_active: true, image_path: null });
});

test('other colours: products sharing a style code, case-insensitive, never the product itself', () => {
  const list = [
    { id: 'a', style_code: 'LC-L1212', color: 'Black' }, { id: 'b', style_code: 'lc-l1212', color: 'Grey' },
    { id: 'c', style_code: 'RL-OX1', color: 'Blue' }, { id: 'd', style_code: '', color: 'Red' }, { id: 'e', style_code: ' ', color: 'Pink' },
  ];
  assert.deepEqual(L.colourSiblings(list, list[0]).map((p) => p.id), ['b']);
  assert.deepEqual(L.colourSiblings(list, list[1]).map((p) => p.id), ['a']);
  assert.deepEqual(L.colourSiblings(list, list[2]), []);
  assert.deepEqual(L.colourSiblings(list, list[3]), [], 'no code → nothing is linked');
  assert.deepEqual(L.colourSiblings(list, list[4]), []);
  assert.deepEqual(L.colourSiblings(list, null), []);
});

test('style code from brand and name', () => {
  assert.equal(L.styleCodeFor('Lacoste', 'Classic Fit Polo'), 'LACOSTE-CLASSIC-FIT-POLO');
  assert.equal(L.styleCodeFor('Polo Ralph Lauren', 'Slim Fit Oxford Shirt'), 'POLO-RALPH-LAUREN-SLIM-FIT-OXF', 'cut at 30 characters');
  assert.ok(L.STYLE_RE.test(L.styleCodeFor('Brunello Cucinelli', 'Cashmere crew neck sweater in extra-fine yarn')));
  assert.ok(L.styleCodeFor('x'.repeat(100), 'y').length <= 30);
  assert.equal(L.styleCodeFor('', ''), '');
});

test('duplicate as another colour: same texts and sizes, no photos, no stock, no colour, hidden, linked by the style code', () => {
  const src = {
    ...L.emptyProduct(), id: 'p1', slug: 'lacoste-polo-black', brand_id: 'b1', brand_name: 'Lacoste', name: 'Classic Fit Polo', category: 'polos',
    color: 'Black', color_hex: '#141414', color_group: 'black', style_code: 'LC-L1212', sku: 'L1212', price: '1 290 000', old_price: '1 590 000',
    origin: 'FR', material: 'cotton', fit: 'regular', description_ru: 'Классика', is_new: true, is_featured: true, is_active: true,
    images: [{ path: 'a' }, { path: 'b' }],
    sizes: [{ id: 's1', label: 'M', stock: '3', orderable: true, dirty: false }, { id: 's2', label: 'L', stock: '0', orderable: false, dirty: false }],
  };
  const copy = L.duplicateAsColour(src);
  assert.equal(copy.id, null);
  assert.equal(copy.slug, '');
  assert.equal(copy.slugTouched, false, 'the address is suggested again from brand + name + the new colour');
  assert.deepEqual([copy.color, copy.color_hex, copy.color_group, copy.sku], ['', '', '', '']);
  assert.equal(copy.style_code, 'LC-L1212', 'same code keeps the colours together');
  assert.deepEqual(copy.images, []);
  assert.equal(copy.is_active, false);
  assert.deepEqual([copy.name, copy.category, copy.price, copy.old_price, copy.origin, copy.material, copy.fit, copy.description_ru],
    ['Classic Fit Polo', 'polos', '1 290 000', '1 590 000', 'FR', 'cotton', 'regular', 'Классика']);
  assert.deepEqual(copy.sizes, [{ label: 'M', stock: '', orderable: true }, { label: 'L', stock: '', orderable: false }],
    'size rows are new rows (no id, no stock) but keep their order and "orderable"');
  assert.ok(copy.sizes.every((s) => !('id' in s)), 'new rows, so the database creates them');
  assert.equal(src.images.length, 2, 'the original is untouched');
  assert.equal(src.sizes[0].id, 's1');
  // no style code yet → one is made up, the page then also gives it to the original
  assert.equal(L.duplicateAsColour({ ...src, style_code: '' }).style_code, 'LACOSTE-CLASSIC-FIT-POLO');
});

test('stock state: sold out here but orderable from abroad is "on_order"', () => {
  const p = (sizes, over = {}) => ({ is_active: true, sizes, ...over });
  assert.equal(L.stockState(p([{ stock: 0, orderable: true }, { stock: 0, orderable: false }])).state, 'on_order');
  assert.equal(L.stockState(p([{ stock: 0, orderable: false }])).state, 'sold_out');
  assert.equal(L.stockState(p([{ stock: 0 }])).state, 'sold_out', 'a size without the flag counts as not orderable');
  assert.equal(L.stockState(p([{ stock: 2, orderable: true }])).state, 'low');
  assert.equal(L.stockState(p([{ stock: 9, orderable: true }])).state, 'ok');
  assert.equal(L.stockState(p([{ stock: 0, orderable: true }], { is_active: false })).state, 'hidden');
});

test('delivery settings: lead times are optional but must look like 3 or 3–5', () => {
  const base = { courier_tashkent: '30 000', regions: '50 000', pickup: '0', free_threshold: '1 500 000' };
  assert.deepEqual(L.validateDelivery(base), { ok: true, errors: {} });
  assert.deepEqual(L.validateDelivery({ ...base, stock_days: '1–3', order_days: '10-18', order_note_ru: 'ok' }).errors, {});
  assert.equal(L.validateDelivery({ ...base, stock_days: 'soon' }).errors.stock_days, 'days');
  assert.equal(L.validateDelivery({ ...base, order_days: '10–' }).errors.order_days, 'days');
  assert.equal(L.validateDelivery({ ...base, order_note_uz: 'x'.repeat(301) }).errors.order_note_uz, 'long');
});

test('activity view shows the size label of a stock change', () => {
  const v = L.activityView({ entity: 'product_sizes', action: 'update', diff: { label: 'Size M', size: 'M', changes: { stock: ['3', '9'] } } });
  assert.equal(v.size, 'M');
  assert.deepEqual(v.changes, [{ field: 'stock', from: '3', to: '9' }]);
  assert.equal(L.activityView({ entity: 'products', action: 'insert', diff: { label: 'X' } }).size, null);
});
