/* Catalog page — /shop, /new, /sale, /men, /women, /kids, /brands/<brand>
   Filters + sort live in the URL (/shop?brand=nike&size=42&sort=price-asc). */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);
  const esc = OL.esc;
  const C = OL.catalog;
  const html = document.documentElement;

  const CATS = ['running', 'lifestyle', 'basketball'];
  let S = null; // state of the mounted catalog page

  /* ------------------------------------------------------------ state */
  const brandName = (slug) => {
    const p = OL.PRODUCTS.find((x) => OL.slug(x.brand) === slug);
    return p ? p.brand : slug;
  };
  const titleOf = (ctx) => (ctx.params.collection === 'brand' ? brandName(ctx.params.brand) : t('shop.title.' + ctx.params.collection));

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
      brandSlug: ctx.params.brand || null,
      base: C.base(OL.PRODUCTS, ctx.params.collection, ctx.params.brand),
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

  const groupsA = () => {
    const F = S.facets;
    const out = [];
    const cats = CATS.filter((c) => S.base.some((p) => p.cat === c));
    if (cats.length > 1) {
      out.push(group('cat', t('shop.f.cat'),
        cats.map((c) => check('cat', c, t('cat.' + c), F.cat.get(c) || 0, S.f.cat.includes(c))).join('')));
    }
    if (!['men', 'women', 'kids'].includes(S.collection)) {
      const only = (g) => ({ ...C.emptyFilters(), gender: [g], stock: false });
      const gens = ['men', 'women', 'kids'].filter((g) => S.base.some((p) => C.matches(p, only(g))));
      out.push(group('gender', t('shop.f.gender'),
        gens.map((g) => check('gender', g, t('shop.genders.' + g), F.gender.get(g) || 0, S.f.gender.includes(g))).join('')));
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
          return `<button type="button" class="size${on ? ' is-on' : ''}${!on && !n ? ' is-out' : ''}" data-f-size="${z}" ${!on && !n ? 'disabled' : ''}>${z}</button>`;
        }).join('')}</div>`));
    }
    out.push(group('off', t('shop.f.off'),
      `<div class="fsizes">${C.OFF_STEPS.map((n) =>
        `<button type="button" class="size fo${S.f.off === n ? ' is-on' : ''}" data-off="${n}">${n ? t('shop.offFrom', { n }) : t('shop.anyOff')}</button>`).join('')}</div>`, false));
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
    S.f.cat.forEach((v) => c.push(['cat', v, t('cat.' + v)]));
    S.f.gender.forEach((v) => c.push(['gender', v, t('shop.genders.' + v)]));
    S.f.brand.forEach((v) => c.push(['brand', v, esc(brandName(v))]));
    S.f.size.forEach((v) => c.push(['size', v, `EU ${v}`]));
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
      $('#shopEmpty').innerHTML = S.list.length ? '' : emptyHTML();
      $('#shopMore').innerHTML = moreHTML();
      if (OL.anim && window.gsap && S.list.length) {
        gsap.fromTo(g.children, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.035, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      }
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
      const base = C.base(OL.PRODUCTS, ctx.params.collection, ctx.params.brand);
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
      if (ctx.params.collection !== 'all') crumbs.push(`<a href="/shop">${t('crumbs.shop')}</a>`);
      crumbs.push(`<span>${esc(title)}</span>`);
      return `
      <section class="shop">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb">${crumbs.join('<i>/</i>')}</nav>
          <header class="shop-head">
            <p class="eyebrow" data-reveal="fade"><span class="eyebrow-line"></span>${t('shop.eyebrow')}</p>
            <h1 class="shop-title">${esc(title)}</h1>
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
            <aside class="filters" id="filters" aria-label="${t('shop.filters')}">
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
        if (size) { S.f.size = toggle(S.f.size, Number(size.dataset.fSize)); return commit(page); }
        const off = e.target.closest('[data-off]');
        if (off) { S.f.off = Number(off.dataset.off); return commit(page); }
        const rm = e.target.closest('[data-remove]');
        if (rm) {
          const k = rm.dataset.remove;
          if (['cat', 'gender', 'brand'].includes(k)) S.f[k] = S.f[k].filter((x) => x !== rm.dataset.value);
          else if (k === 'size') S.f.size = S.f.size.filter((x) => String(x) !== rm.dataset.value);
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
          page.querySelector('#shopMore').innerHTML = moreHTML();
          if (OL.anim && window.gsap) {
            const added = [...page.querySelectorAll('#shopGrid > *')].slice(from);
            gsap.fromTo(added, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.03, clearProps: 'transform,opacity,visibility' });
          }
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

    init(root) {
      const q = (s) => root.querySelector(s);
      gsap.from(q('.shop-title'), { y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out' });
      gsap.from(q('.shop-bar'), { y: 20, autoAlpha: 0, duration: 0.8, delay: 0.1, ease: 'expo.out' });
      gsap.from(q('.filters'), { x: -20, autoAlpha: 0, duration: 0.8, delay: 0.15, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
      return {};
    },
  };
})();
