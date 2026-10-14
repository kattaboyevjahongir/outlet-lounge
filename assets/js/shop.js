/* Catalog page — /shop, /new, /sale, /clothing|shoes|accessories, /shop/<category>, /brands/<brand>
   Filters + sort live in the URL (/shop?brand=gant&size=M&color=navy&sort=price-asc). */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);
  const esc = OL.esc;
  const C = OL.catalog;
  const html = document.documentElement;

  let S = null; // state of the mounted catalog page

  /* ------------------------------------------------------------ state */
  const brandName = (slug) => {
    const p = OL.PRODUCTS.find((x) => OL.slug(x.brand) === slug);
    return p ? p.brand : slug;
  };
  const titleOf = (ctx) => {
    const { collection, key } = ctx.params;
    if (collection === 'brand') return brandName(key);
    if (collection === 'category') return OL.catName(key);
    if (collection === 'dept') return t('dept.' + key);
    return t('shop.title.' + collection);
  };

  const compute = () => {
    S.bounds = C.priceBounds(S.base);
    S.sort = S.f.sort || C.defaultSort(S.collection);
    S.list = C.sort(C.filter(S.base, S.f), S.sort);
    S.facets = C.facets(S.base, S.f);
  };
  const init = (ctx) => {
    S = {
      ctx,
      collection: ctx.params.collection,
      base: C.base(OL.PRODUCTS, ctx.params.collection, ctx.params.key),
      f: C.parseQuery(ctx.search),
      shown: C.PAGE_SIZE,
      open: S && S.ctx.path === ctx.path ? S.open : {},
    };
    compute();
  };

  /* ------------------------------------------------------------ views */
  const group = (key, title, body, openByDefault = true) => {
    const open = key in S.open ? S.open[key] : openByDefault;
    return `<details class="fg" data-group="${key}" ${open ? 'open' : ''}><summary>${title}</summary><div class="fg-body">${body}</div></details>`;
  };
  const check = (name, value, label, count, checked) => {
    const off = !checked && count === 0;
    return `<label class="fc${off ? ' is-off' : ''}"><input type="checkbox" data-f="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} ${off ? 'disabled' : ''}>` +
      `<span class="fc-box"></span><span class="fc-label">${label}</span><small>${count}</small></label>`;
  };

  const swatch = (c) => {
    const p = S.base.find((x) => (x.colorGroup || 'other') === c && /^#[0-9a-fA-F]{6}$/.test(x.colorHex || ''));
    return p ? p.colorHex : '#999';
  };
  const groupsA = () => {
    const F = S.facets;
    const out = [];
    const cats = OL.CATEGORIES.filter((c) => S.base.some((p) => p.cat === c.slug));
    if (cats.length > 1) {
      out.push(group('cat', t('shop.f.cat'),
        cats.map((c) => check('cat', c.slug, esc(OL.catName(c.slug)), F.cat.get(c.slug) || 0, S.f.cat.includes(c.slug))).join('')));
    }
    return out.join('');
  };
  const groupsB = () => {
    const F = S.facets;
    const out = [];
    const brands = [...S.base.reduce((m, p) => m.set(OL.slug(p.brand), p.brand), new Map())];
    if (brands.length > 1 && S.collection !== 'brand') {
      const sorted = brands.sort((a, b) => (F.brand.get(b[0]) || 0) - (F.brand.get(a[0]) || 0));
      out.push(group('brand', t('shop.f.brand'),
        sorted.map(([slug, name]) => check('brand', slug, esc(name), F.brand.get(slug) || 0, S.f.brand.includes(slug))).join('')));
    }
    if (F.sizes.length) {
      out.push(group('size', t('shop.f.size'),
        `<div class="fsizes">${F.sizes.map((z) => {
          const n = F.size.get(z) || 0;
          const on = S.f.size.includes(z);
          return `<button type="button" class="fsize${on ? ' is-on' : ''}${!on && !n ? ' is-out' : ''}" data-f-size="${esc(z)}" ${!on && !n ? 'disabled' : ''}>${esc(z)}</button>`;
        }).join('')}</div>`));
    }
    if (F.colors.length > 1) {
      out.push(group('color', t('shop.f.color'),
        `<div class="fcolors">${F.colors.map((c) => {
          const n = F.color.get(c) || 0;
          const on = S.f.color.includes(c);
          return `<button type="button" class="fcolor${on ? ' is-on' : ''}" data-f-color="${c}" ${!on && !n ? 'disabled' : ''} title="${t('color.' + c)}" aria-label="${t('color.' + c)}" aria-pressed="${on}"><i data-c="${swatch(c)}"></i><span>${t('color.' + c)}</span></button>`;
        }).join('')}</div>`));
    }
    if (F.origins.length > 1) {
      out.push(group('origin', t('shop.f.origin'),
        F.origins.map((o) => check('origin', o, esc(OL.country(o)), F.origin.get(o) || 0, S.f.origin.includes(o))).join(''), false));
    }
    if (S.base.some((p) => C.inStock(p)) && S.base.some((p) => C.availability(p) === 'order' || p.sizes.some((z) => z.order && z.stock === 0))) {
      out.push(group('avail', t('shop.f.avail'),
        C.AVAIL.map((a) => check('avail', a, t('shop.avail.' + a), F.avail.get(a) || 0, S.f.avail.includes(a))).join(''), false));
    }
    if (S.base.some((p) => OL.off(p) > 0)) {
      out.push(group('off', t('shop.f.off'),
        `<div class="fsizes">${C.OFF_STEPS.map((n) =>
          `<button type="button" class="fsize fo${S.f.off === n ? ' is-on' : ''}" data-off="${n}">${n ? t('shop.offFrom', { n }) : t('shop.anyOff')}</button>`).join('')}</div>`, false));
    }
    out.push(`<label class="fc fc-stock"><input type="checkbox" data-f="stock" ${S.f.stock ? 'checked' : ''}><span class="fc-box"></span><span class="fc-label">${t('shop.f.stock')}</span></label>`);
    return out.join('');
  };
  const priceGroup = () => {
    const [lo, hi] = S.bounds;
    if (hi - lo < 20000) return '';
    const min = S.f.min != null ? Math.max(S.f.min, lo) : lo;
    const max = S.f.max != null ? Math.min(S.f.max, hi) : hi;
    return `<details class="fg" data-group="price" ${S.open.price === false ? '' : 'open'}><summary>${t('shop.f.price')}</summary><div class="fg-body">
      <div class="price-vals"><span><small>${t('shop.priceFrom')}</small> <b data-price="min">${OL.num(min)}</b></span><span><small>${t('shop.priceTo')}</small> <b data-price="max">${OL.num(max)}</b></span></div>
      <div class="range">
        <input type="range" data-range="min" min="${lo}" max="${hi}" step="10000" value="${min}" aria-label="${t('shop.priceFrom')}">
        <input type="range" data-range="max" min="${lo}" max="${hi}" step="10000" value="${max}" aria-label="${t('shop.priceTo')}">
      </div></div></details>`;
  };

  const chips = () => {
    const [lo, hi] = S.bounds;
    const c = [];
    S.f.cat.forEach((v) => c.push(['cat', v, esc(OL.catName(v))]));
    S.f.brand.forEach((v) => c.push(['brand', v, esc(brandName(v))]));
    S.f.size.forEach((v) => c.push(['size', v, esc(v)]));
    S.f.color.forEach((v) => c.push(['color', v, t('color.' + v)]));
    S.f.origin.forEach((v) => c.push(['origin', v, esc(OL.country(v))]));
    S.f.avail.forEach((v) => c.push(['avail', v, t('shop.avail.' + v)]));
    if (S.f.min != null && S.f.min > lo) c.push(['min', '', `${t('shop.priceFrom')} ${OL.num(S.f.min)}`]);
    if (S.f.max != null && S.f.max < hi) c.push(['max', '', `${t('shop.priceTo')} ${OL.num(S.f.max)}`]);
    if (S.f.off) c.push(['off', '', t('shop.offFrom', { n: S.f.off })]);
    if (S.f.q) c.push(['q', '', esc(t('shop.query', { q: S.f.q }))]);
    return c;
  };
  const chipsHTML = () => {
    const list = chips();
    if (!list.length) return '';
    return list.map(([k, v, label]) =>
      `<button type="button" class="chip" data-remove="${k}" data-value="${esc(v)}">${label}<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`).join('') +
      `<button type="button" class="chip-clear" data-clear>${t('shop.clear')}</button>`;
  };

  const cards = (from, to) => S.list.slice(from, to).map((p) => OL.ui.card(p)).join('');
  const emptyHTML = () => `<div class="shop-empty">
      <h3>${t('shop.emptyTitle')}</h3><p>${t('shop.emptyText')}</p>
      <button type="button" class="btn btn-gold" data-clear><span>${t('shop.clear')}</span></button></div>`;
  const moreHTML = () => {
    if (S.list.length <= S.shown) return '';
    return `<p class="shop-shown">${t('shop.shown', { a: Math.min(S.shown, S.list.length), b: S.list.length })}</p>
      <button type="button" class="btn btn-ghost" data-more><span>${t('shop.more')}</span></button>`;
  };

  /* ------------------------------------------------------------ page */
  const OPEN = () => [...document.querySelectorAll('.shop .fg')].forEach((d) => { S.open[d.dataset.group] = d.open; });

  const paint = (root, { grid = true } = {}) => {
    const $ = (s) => root.querySelector(s);
    OPEN();
    $('#fgA').innerHTML = groupsA();
    $('#fgB').innerHTML = groupsB();
    $('#fgPrice').innerHTML = priceGroup();
    $('#shopChips').innerHTML = chipsHTML();
    $('#shopCount').textContent = `${S.list.length} ${t('shop.models')}`;
    $('#shopSort').value = S.sort;
    const n = C.activeCount(S.f, S.bounds);
    const badge = $('#filtersBadge');
    badge.textContent = n;
    badge.hidden = n === 0;
    $('#filtersShow').textContent = t('shop.show', { n: S.list.length });
    if (grid) {
      const g = $('#shopGrid');
      g.innerHTML = S.list.length ? cards(0, S.shown) : '';
      if (S.painted) OL.reveal(g); // the first paint is revealed by the page mount
      S.painted = true;
      $('#shopEmpty').innerHTML = S.list.length ? '' : emptyHTML();
      $('#shopMore').innerHTML = moreHTML();
    }
  };

  const syncUrl = () => {
    const search = C.toQuery(S.f, S.collection);
    history.replaceState(history.state, '', S.ctx.path + search + (S.ctx.hash || ''));
    S.ctx.search = search; // the router's current route object — keeps "same page" checks honest
  };
  const commit = (root, opts) => {
    S.shown = C.PAGE_SIZE;
    compute();
    syncUrl();
    paint(root, opts);
  };

  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  OL.pages.shop = {
    meta(ctx) {
      const base = C.base(OL.PRODUCTS, ctx.params.collection, ctx.params.key);
      return {
        title: titleOf(ctx),
        description: `${titleOf(ctx)} — ${base.length} ${t('shop.models')}. ${t('meta.description')}`,
        path: ctx.path,
      };
    },

    render(ctx) {
      init(ctx);
      const title = titleOf(ctx);
      const crumbs = [`<a href="/">${t('crumbs.home')}</a>`];
      if (ctx.params.collection === 'category') {
        const d = OL.catDept(ctx.params.key);
        if (d) crumbs.push(`<a href="/${d}">${t('dept.' + d)}</a>`);
      } else if (ctx.params.collection !== 'all' && ctx.params.collection !== 'dept') crumbs.push(`<a href="/shop">${t('crumbs.shop')}</a>`);
      crumbs.push(`<span>${esc(title)}</span>`);
      return `
      <section class="shop">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb">${crumbs.join('<i>/</i>')}</nav>
          <header class="shop-head">
            <p class="eyebrow"><span class="eyebrow-line"></span>${t('shop.eyebrow')}</p>
            <h1 class="shop-title" data-split>${esc(title)}</h1>
            <p class="shop-count" id="shopCount"></p>
          </header>

          <div class="shop-bar">
            <button type="button" class="btn btn-ghost shop-filter-btn" data-open-filters>
              <svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
              <span>${t('shop.filters')}</span><i class="badge" id="filtersBadge" hidden>0</i>
            </button>
            <div class="chips" id="shopChips"></div>
            <label class="sort">
              <span>${t('shop.sort')}</span>
              <select id="shopSort" data-sort>
                ${C.SORTS.map((k) => `<option value="${k}">${t('shop.sortBy.' + k)}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="shop-layout">
            <div class="filters-overlay" data-close-filters></div>
            <aside class="filters" id="filters" data-lenis-prevent aria-label="${t('shop.filters')}">
              <div class="filters-head">
                <h2>${t('shop.filters')}</h2>
                <button type="button" class="icon-btn" data-close-filters aria-label="${t('pd.close')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              </div>
              <div class="filters-body">
                <div id="fgA"></div>
                <div id="fgPrice"></div>
                <div id="fgB"></div>
              </div>
              <div class="filters-foot">
                <button type="button" class="btn btn-ghost" data-clear><span>${t('shop.clear')}</span></button>
                <button type="button" class="btn btn-gold" data-close-filters><span id="filtersShow"></span></button>
              </div>
            </aside>
            <div class="shop-main">
              <div class="shop-grid pgrid" id="shopGrid"></div>
              <div id="shopEmpty"></div>
              <div class="shop-more" id="shopMore"></div>
            </div>
          </div>
        </div>
      </section>`;
    },

    bind(root) {
      const page = root.querySelector('.shop');
      paint(page);

      page.addEventListener('change', (e) => {
        const cb = e.target.closest('input[data-f]');
        if (cb) {
          const name = cb.dataset.f;
          if (name === 'stock') S.f.stock = cb.checked;
          else S.f[name] = toggle(S.f[name], cb.value);
          return commit(page);
        }
        if (e.target.matches('[data-sort]')) {
          S.f.sort = e.target.value === C.defaultSort(S.collection) ? null : e.target.value;
          return commit(page);
        }
        const r = e.target.closest('input[data-range]');
        if (r) {
          const [lo, hi] = S.bounds;
          let a = Number(page.querySelector('[data-range="min"]').value);
          let b = Number(page.querySelector('[data-range="max"]').value);
          if (a > b) [a, b] = [b, a];
          S.f.min = a <= lo ? null : a;
          S.f.max = b >= hi ? null : b;
          commit(page);
        }
      });

      page.addEventListener('input', (e) => {
        const r = e.target.closest('input[data-range]');
        if (!r) return;
        let a = Number(page.querySelector('[data-range="min"]').value);
        let b = Number(page.querySelector('[data-range="max"]').value);
        if (a > b) [a, b] = [b, a];
        page.querySelector('[data-price="min"]').textContent = OL.num(a);
        page.querySelector('[data-price="max"]').textContent = OL.num(b);
      });

      page.addEventListener('click', (e) => {
        const size = e.target.closest('[data-f-size]');
        if (size) { S.f.size = toggle(S.f.size, size.dataset.fSize); return commit(page); }
        const col = e.target.closest('[data-f-color]');
        if (col) { S.f.color = toggle(S.f.color, col.dataset.fColor); return commit(page); }
        const off = e.target.closest('[data-off]');
        if (off) { S.f.off = Number(off.dataset.off); return commit(page); }
        const rm = e.target.closest('[data-remove]');
        if (rm) {
          const k = rm.dataset.remove;
          if (['cat', 'brand', 'size', 'color', 'origin', 'avail'].includes(k)) S.f[k] = S.f[k].filter((x) => x !== rm.dataset.value);
          else if (k === 'q') S.f.q = '';
          else S.f[k] = k === 'off' ? 0 : null;
          return commit(page);
        }
        if (e.target.closest('[data-clear]')) {
          S.f = { ...C.emptyFilters(), sort: S.f.sort };
          return commit(page);
        }
        if (e.target.closest('[data-more]')) {
          const from = S.shown;
          S.shown += C.PAGE_SIZE;
          page.querySelector('#shopGrid').insertAdjacentHTML('beforeend', cards(from, S.shown));
          OL.reveal(page.querySelector('#shopGrid'));
          page.querySelector('#shopMore').innerHTML = moreHTML();
          return;
        }
        if (e.target.closest('[data-open-filters]')) { html.classList.add('filters-open'); return OL.lockScroll && OL.lockScroll(); }
        if (e.target.closest('[data-close-filters]')) { html.classList.remove('filters-open'); return OL.lockScroll && OL.lockScroll(); }
      });

      OL.onCleanup(() => html.classList.remove('filters-open'));
      return {};
    },

    // same page, new query (e.g. mega-menu link clicked while on /shop)
    update(ctx) {
      init(ctx);
      const page = document.querySelector('.shop');
      if (!page) return;
      const title = titleOf(ctx);
      page.querySelector('.shop-title').textContent = title;
      paint(page);
    },
  };
})();
