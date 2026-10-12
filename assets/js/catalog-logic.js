/* Outlet Lounge — catalog logic: collections, filters, sorting, URL state.
   Pure functions (no DOM) so they can be unit-tested in Node (tests/catalog-logic.test.mjs). */
(function () {
  const OL = (window.OL = window.OL || {});
  const C = (OL.catalog = {});

  OL.slug = (s) => String(s || '').toLowerCase().replace(/[“”"’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const isMen = (p) => p.gender === 'men' || p.gender === 'unisex';
  const isWomen = (p) => p.gender === 'women' || p.gender === 'unisex';
  const hasStock = (p) => p.sizes.some((z) => z.ok);

  C.SORTS = ['newest', 'price-asc', 'price-desc', 'discount', 'popular'];
  C.OFF_STEPS = [0, 30, 40, 50];
  C.PAGE_SIZE = 24;

  // The pre-filtered pages (/new, /sale, /men …) are the same catalog with a base set + default sort.
  C.COLLECTIONS = {
    all: { test: () => true, sort: 'newest' },
    new: { test: (p) => p.isNew, sort: 'newest' },
    sale: { test: (p) => OL.off(p) > 0, sort: 'discount' },
    men: { test: isMen, sort: 'newest' },
    women: { test: isWomen, sort: 'newest' },
    kids: { test: (p) => p.gender === 'kids', sort: 'newest' },
  };

  C.base = (products, collection, brandSlug) => {
    if (collection === 'brand') return products.filter((p) => OL.slug(p.brand) === brandSlug);
    return products.filter((C.COLLECTIONS[collection] || C.COLLECTIONS.all).test);
  };
  C.defaultSort = (collection) => (C.COLLECTIONS[collection] || C.COLLECTIONS.all).sort;

  // ---------------------------------------------------------------- URL state
  const csv = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
  const num = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  C.emptyFilters = () => ({ cat: [], gender: [], brand: [], size: [], min: null, max: null, off: 0, stock: true, sort: null, q: '' });

  C.parseQuery = (search) => {
    const q = new URLSearchParams(search || '');
    const sort = q.get('sort');
    return {
      cat: csv(q.get('cat')),
      gender: csv(q.get('gender')).filter((g) => ['men', 'women', 'kids'].includes(g)),
      brand: csv(q.get('brand')),
      size: csv(q.get('size')).map(Number).filter(Number.isFinite),
      min: num(q.get('min')),
      max: num(q.get('max')),
      off: Math.max(0, Math.min(90, num(q.get('off')) || 0)),
      stock: q.get('stock') !== '0',
      sort: C.SORTS.includes(sort) ? sort : null,
      q: (q.get('q') || '').trim().slice(0, 80),
    };
  };

  C.toQuery = (f, collection) => {
    const q = new URLSearchParams();
    if (f.cat.length) q.set('cat', f.cat.join(','));
    if (f.gender.length) q.set('gender', f.gender.join(','));
    if (f.brand.length) q.set('brand', f.brand.join(','));
    if (f.size.length) q.set('size', [...f.size].sort((a, b) => a - b).join(','));
    if (f.min != null) q.set('min', String(f.min));
    if (f.max != null) q.set('max', String(f.max));
    if (f.off) q.set('off', String(f.off));
    if (!f.stock) q.set('stock', '0');
    if (f.sort && f.sort !== C.defaultSort(collection)) q.set('sort', f.sort);
    if (f.q) q.set('q', f.q);
    const s = q.toString().replace(/%2C/g, ',');
    return s ? `?${s}` : '';
  };

  // ---------------------------------------------------------------- filtering
  const genderOk = (p, wanted) =>
    wanted.some((g) => g === p.gender || (p.gender === 'unisex' && (g === 'men' || g === 'women')));

  // `skip` leaves one facet out — used to compute "what would I get if I picked X" counts
  C.matches = (p, f, skip) => {
    if (skip !== 'cat' && f.cat.length && !f.cat.includes(p.cat)) return false;
    if (skip !== 'gender' && f.gender.length && !genderOk(p, f.gender)) return false;
    if (skip !== 'brand' && f.brand.length && !f.brand.includes(OL.slug(p.brand))) return false;
    if (skip !== 'size' && f.size.length && !f.size.some((s) => p.sizes.some((z) => z.s === s && z.ok))) return false;
    if (skip !== 'price') {
      if (f.min != null && p.price < f.min) return false;
      if (f.max != null && p.price > f.max) return false;
    }
    if (skip !== 'off' && f.off && OL.off(p) < f.off) return false;
    if (skip !== 'stock' && f.stock && !hasStock(p)) return false;
    return true;
  };

  C.filter = (list, f, skip) => {
    const found = f.q && skip !== 'q' && typeof OL.search === 'function' ? new Set(OL.search(f.q)) : null;
    return list.filter((p) => C.matches(p, f, skip) && (!found || found.has(p)));
  };

  C.sort = (list, key) => {
    const order = new Map(list.map((p, i) => [p, i]));
    const cmp = {
      newest: () => 0,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      discount: (a, b) => OL.off(b) - OL.off(a),
      popular: (a, b) => Number(b.featured) - Number(a.featured) || Number(b.isNew) - Number(a.isNew),
    }[key] || (() => 0);
    return [...list].sort((a, b) => cmp(a, b) || order.get(a) - order.get(b));
  };

  // Option lists with counts, each computed against every OTHER active filter
  C.facets = (base, f) => {
    const tally = (skip, valuesOf) => {
      const map = new Map();
      C.filter(base, f, skip).forEach((p) => valuesOf(p).forEach((v) => map.set(v, (map.get(v) || 0) + 1)));
      return map;
    };
    const allSizes = new Set();
    base.forEach((p) => p.sizes.forEach((z) => z.ok && allSizes.add(z.s)));
    return {
      cat: tally('cat', (p) => [p.cat]),
      brand: tally('brand', (p) => [OL.slug(p.brand)]),
      size: tally('size', (p) => p.sizes.filter((z) => z.ok).map((z) => z.s)),
      gender: tally('gender', (p) => (p.gender === 'unisex' ? ['men', 'women'] : [p.gender])),
      sizes: [...allSizes].sort((a, b) => a - b),
    };
  };

  C.priceBounds = (list, step = 10000) => {
    if (!list.length) return [0, 0];
    const prices = list.map((p) => p.price);
    return [Math.floor(Math.min(...prices) / step) * step, Math.ceil(Math.max(...prices) / step) * step];
  };

  // Number of active (removable) filters
  C.activeCount = (f, bounds) =>
    f.cat.length + f.gender.length + f.brand.length + f.size.length +
    (f.min != null && f.min > bounds[0] ? 1 : 0) + (f.max != null && f.max < bounds[1] ? 1 : 0) +
    (f.off ? 1 : 0) + (f.stock ? 0 : 1) + (f.q ? 1 : 0);
})();
