/* Outlet Lounge — catalog logic: collections, filters, sorting, URL state.
   Pure functions (no DOM) so they can be unit-tested in Node (tests/catalog-logic.test.mjs).

   A product is "in stock" when some size has stock here, "on order" when sizes can still be ordered
   from abroad (stock 0, order true), and "sold out" when neither. Sizes carry { s, ok, stock, order }. */
(function () {
  const OL = (window.OL = window.OL || {});
  const C = (OL.catalog = {});

  OL.slug = (s) => String(s || '').toLowerCase().replace(/[“”"’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  C.SORTS = ['newest', 'price-asc', 'price-desc', 'discount', 'popular'];
  C.OFF_STEPS = [0, 20, 30, 50];
  C.PAGE_SIZE = 24;
  C.COLOR_GROUPS = ['black', 'white', 'grey', 'navy', 'blue', 'green', 'beige', 'brown', 'red', 'other'];
  C.AVAIL = ['stock', 'order'];
  const SIZE_RE = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,11}$/;

  /* ------------------------------------------------------- availability */
  const inStock = (p) => p.sizes.some((z) => z.stock > 0);
  const onOrder = (p) => p.sizes.some((z) => z.order && z.stock === 0);
  const buyable = (p) => p.sizes.some((z) => z.ok);
  C.inStock = inStock;
  C.buyable = buyable;
  // 'stock' = something on the shelf here, 'order' = only orderable from abroad, 'sold' = neither
  C.availability = (p) => (inStock(p) ? 'stock' : buyable(p) ? 'order' : 'sold');
  // how one size is served: 'stock' (stock here), 'order' (from abroad), 'sold'
  C.sizeState = (z) => (z.stock > 0 ? 'stock' : z.ok ? 'order' : 'sold');

  /* ---------------------------------------------------------------- sizes */
  // display order of mixed size labels: letters (XS…4XL), then numbers, then anything else
  C.sortSizes = (labels) => {
    const letters = OL.SIZE_SYSTEMS ? OL.SIZE_SYSTEMS.letter : [];
    const num = (l) => (/^\d+(\.\d+)?$/.test(l) ? Number(l) : null);
    const rank = (l) => (letters.includes(l) ? 0 : num(l) != null ? 1 : 2);
    return [...new Set(labels)].sort((a, b) => rank(a) - rank(b)
      || (rank(a) === 0 ? letters.indexOf(a) - letters.indexOf(b) : rank(a) === 1 ? num(a) - num(b) : String(a).localeCompare(String(b))));
  };

  /* ---------------------------------------------------------- collections */
  // collection: all | new | sale | dept (key = clothing|shoes|accessories) | category (key = slug) | brand (key = brand slug)
  const BASES = {
    all: () => true,
    new: (p) => p.isNew,
    sale: (p) => OL.off(p) > 0,
  };
  C.base = (products, collection, key) => {
    if (collection === 'brand') return products.filter((p) => OL.slug(p.brand) === key);
    if (collection === 'dept') return products.filter((p) => OL.catDept(p.cat) === key);
    if (collection === 'category') return products.filter((p) => p.cat === key);
    return products.filter(BASES[collection] || BASES.all);
  };
  C.defaultSort = (collection) => (collection === 'sale' ? 'discount' : 'newest');

  /* ------------------------------------------------------------- URL state */
  const csv = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
  const num = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  C.emptyFilters = () => ({ cat: [], brand: [], size: [], color: [], origin: [], avail: [], min: null, max: null, off: 0, stock: true, sort: null, q: '' });

  C.parseQuery = (search) => {
    const q = new URLSearchParams(search || '');
    const sort = q.get('sort');
    return {
      cat: csv(q.get('cat')).filter((s) => /^[a-z0-9-]{1,60}$/.test(s)),
      brand: csv(q.get('brand')).filter((s) => /^[a-z0-9-]{1,60}$/.test(s)),
      size: csv(q.get('size')).filter((s) => SIZE_RE.test(s)),
      color: csv(q.get('color')).filter((s) => C.COLOR_GROUPS.includes(s)),
      origin: csv(q.get('origin')).map((s) => s.toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s)),
      avail: csv(q.get('avail')).filter((s) => C.AVAIL.includes(s)),
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
    ['cat', 'brand', 'size', 'color', 'origin', 'avail'].forEach((k) => { if (f[k].length) q.set(k, f[k].join(',')); });
    if (f.min != null) q.set('min', String(f.min));
    if (f.max != null) q.set('max', String(f.max));
    if (f.off) q.set('off', String(f.off));
    if (!f.stock) q.set('stock', '0');
    if (f.sort && f.sort !== C.defaultSort(collection)) q.set('sort', f.sort);
    if (f.q) q.set('q', f.q);
    const s = q.toString().replace(/%2C/g, ',');
    return s ? `?${s}` : '';
  };

  /* ------------------------------------------------------------- filtering */
  // `skip` leaves one facet out — used to compute "what would I get if I picked X" counts
  C.matches = (p, f, skip) => {
    if (skip !== 'cat' && f.cat.length && !f.cat.includes(p.cat)) return false;
    if (skip !== 'brand' && f.brand.length && !f.brand.includes(OL.slug(p.brand))) return false;
    if (skip !== 'size' && f.size.length && !f.size.some((s) => p.sizes.some((z) => z.s === s && z.ok))) return false;
    if (skip !== 'color' && f.color.length && !f.color.includes(p.colorGroup || 'other')) return false;
    if (skip !== 'origin' && f.origin.length && !f.origin.includes(p.origin)) return false;
    if (skip !== 'avail' && f.avail.length && !f.avail.some((a) => (a === 'stock' ? inStock(p) : onOrder(p)))) return false;
    if (skip !== 'price') {
      if (f.min != null && p.price < f.min) return false;
      if (f.max != null && p.price > f.max) return false;
    }
    if (skip !== 'off' && f.off && OL.off(p) < f.off) return false;
    if (skip !== 'stock' && f.stock && !buyable(p)) return false;
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
    const allSizes = [];
    const colors = new Set();
    const origins = new Set();
    base.forEach((p) => {
      p.sizes.forEach((z) => z.ok && allSizes.push(z.s));
      colors.add(p.colorGroup || 'other');
      if (p.origin) origins.add(p.origin);
    });
    return {
      cat: tally('cat', (p) => [p.cat]),
      brand: tally('brand', (p) => [OL.slug(p.brand)]),
      size: tally('size', (p) => p.sizes.filter((z) => z.ok).map((z) => z.s)),
      color: tally('color', (p) => [p.colorGroup || 'other']),
      origin: tally('origin', (p) => (p.origin ? [p.origin] : [])),
      avail: tally('avail', (p) => [inStock(p) ? 'stock' : null, onOrder(p) ? 'order' : null].filter(Boolean)),
      sizes: C.sortSizes(allSizes),
      colors: C.COLOR_GROUPS.filter((c) => colors.has(c)),
      origins: [...origins].sort(),
    };
  };

  C.priceBounds = (list, step = 10000) => {
    if (!list.length) return [0, 0];
    const prices = list.map((p) => p.price);
    return [Math.floor(Math.min(...prices) / step) * step, Math.ceil(Math.max(...prices) / step) * step];
  };

  // Number of active (removable) filters
  C.activeCount = (f, bounds) =>
    f.cat.length + f.brand.length + f.size.length + f.color.length + f.origin.length + f.avail.length +
    (f.min != null && f.min > bounds[0] ? 1 : 0) + (f.max != null && f.max < bounds[1] ? 1 : 0) +
    (f.off ? 1 : 0) + (f.stock ? 0 : 1) + (f.q ? 1 : 0);

  /* ------------------------------------------------- product relationships */
  // the other colours of the same item (same style code), the product itself excluded
  C.otherColours = (products, p) => {
    const code = String(p.styleCode || '').toLowerCase();
    return code ? products.filter((x) => x !== p && String(x.styleCode || '').toLowerCase() === code) : [];
  };
  // Only one product per style code (the first), so a rail does not repeat the same item in three colours
  C.onePerStyle = (list) => {
    const seen = new Set();
    return list.filter((p) => {
      const k = p.styleCode ? `s:${String(p.styleCode).toLowerCase()}` : `p:${p.slug}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  // "You may also like": same category first, then same brand; never the item's own colours
  C.related = (products, p, n = 4) => {
    const own = new Set([p, ...C.otherColours(products, p)]);
    const score = (x) => (x.cat === p.cat ? 2 : 0) + (x.brand === p.brand ? 1 : 0) + (OL.catDept(x.cat) === OL.catDept(p.cat) ? 0.5 : 0);
    return C.onePerStyle(products.filter((x) => !own.has(x) && buyable(x))
      .map((x, i) => ({ x, i, s: score(x) })).sort((a, b) => b.s - a.s || a.i - b.i).map((r) => r.x)).slice(0, n);
  };
  // "Complete the look": other departments, same brand first, then anything popular
  C.completeLook = (products, p, n = 4) => {
    const dept = OL.catDept(p.cat);
    const score = (x) => (x.brand === p.brand ? 2 : 0) + (x.featured ? 1 : 0) + (x.isNew ? 0.5 : 0);
    return C.onePerStyle(products.filter((x) => x !== p && OL.catDept(x.cat) !== dept && buyable(x))
      .map((x, i) => ({ x, i, s: score(x) })).sort((a, b) => b.s - a.s || a.i - b.i).map((r) => r.x)).slice(0, n);
  };
})();
