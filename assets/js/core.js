/* Outlet Lounge — core: helpers, logo, state, shell (header, mega-menu, cart, wishlist, search, footer,
   theme, language) and the product card. No animation library: motion is CSS only. */
(function () {
  const OL = (window.OL = window.OL || {});
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  OL.$ = $;
  OL.$$ = $$;
  OL.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  OL.touch = matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- storage + state ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ol:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ol:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  OL.store = store;
  // A saved cart line is { id, size: 'M', qty }. Lines of carts from the sneaker shop (numeric sizes) are dropped.
  // Whether the product still exists is only known once the live catalog has loaded, so nothing is
  // pruned at start-up: lines of unknown products are just not shown, and removed for good by pruneSaved().
  const shaped = (i) => i && typeof i.id === 'string' && typeof i.size === 'string' && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 10;
  const validLine = (i) => shaped(i) && OL.P[i.id] && OL.P[i.id].sizes.some((z) => z.s === i.size);
  OL.state = {
    lang: ['en', 'ru', 'uz'].includes(html.lang) ? html.lang : 'ru',
    theme: html.dataset.theme,
    cart: store.get('cart2', []).filter(shaped),
    wish: store.get('wish', []).filter((id) => typeof id === 'string'),
  };
  const state = OL.state;

  /* ---------- i18n + formatting ---------- */
  const lookup = (lang, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), OL.I18N[lang]);
  OL.t = (key, vars) => {
    let v = lookup(state.lang, key);
    if (v == null) v = lookup('en', key);
    if (v == null) return key;
    if (vars && typeof v === 'string') v = v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return v;
  };
  const t = OL.t;
  OL.productUrl = (p) => `/product/${encodeURIComponent(p.slug)}`;
  OL.num = (n) => Math.round(n).toLocaleString('ru-RU');
  OL.price = (n) => `${OL.num(n)} ${t('currency')}`;
  // product text can come from the admin panel: never inject it as raw HTML
  OL.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = OL.esc;
  OL.pad = (n) => String(n).padStart(2, '0');
  // a country's name in the current language ("IT" → Italy / Италия / Italiya)
  OL.country = (code) => {
    try { return new Intl.DisplayNames([state.lang === 'uz' ? 'uz-Latn' : state.lang], { type: 'region' }).of(code) || code; } catch (e) { return code; }
  };
  OL.catUrl = (slug) => `/shop/${encodeURIComponent(slug)}`;

  /* ---------- how an item is served: from the stock here or ordered from abroad ---------- */
  // days as text: the product's own lead time, else the shop's setting
  OL.orderDays = (p) => (p && p.orderLead) || OL.deliveryInfo().order_days || '10–18';
  OL.stockDays = () => OL.deliveryInfo().stock_days || '1–3';
  // 'stock' | 'order' | 'sold' for `qty` pieces of one size
  OL.lineState = (p, size, qty = 1) => {
    const z = p.sizes.find((x) => x.s === size);
    if (!z) return 'sold';
    return z.stock >= qty ? 'stock' : z.order ? 'order' : 'sold';
  };

  /* ---------- cleanup registry (per page mount) ---------- */
  let cleanups = [];
  OL.onCleanup = (fn) => cleanups.push(fn);
  OL.cleanup = () => { cleanups.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } }); cleanups = []; };

  /* ---------- icons ---------- */
  const ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.3s-7.8-4.6-7.8-10.4A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.8 2.6c0 5.8-7.8 10.4-7.8 10.4Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    arrowUR: '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    insta: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6"/></svg>',
    tg: '<svg viewBox="0 0 24 24"><path d="M21 4 3 11.2l5.6 2 2.2 6.3 3.2-3.6 4.8 3.6L21 4Z"/><path d="m8.6 13.2 8.4-5.6"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M21 3.5 3 10.5l6.5 2.5L12 20l2-5.5 4 3.5L21 3.5Z"/><path d="m9.5 13 11-9.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };
  OL.ICON = ICON;

  /* ---------- Logo (vector recreation of the AAA mark + arrow swoosh) ---------- */
  const A = (x) => `M${x + 37} 8L${x + 46} 8L${x + 81} 97L${x + 88} 97L${x + 88} 100L${x + 58} 100L${x + 58} 97L${x + 64} 97L${x + 36} 26L${x + 10} 97L${x + 16} 97L${x + 16} 100L${x - 2} 100L${x - 2} 97L${x + 4} 97Z`;
  const SWOOSH = 'M8 99C70 62 150 37 236 25.5L237 29.5C152 43 74 66 8 99Z';
  const HEAD = 'M232 20.5L259 22.5L235.5 35L239.5 27.5Z';
  OL.logoMark = (cls = '') => `
    <svg class="ol-mark ${cls}" viewBox="0 0 262 104" aria-hidden="true" focusable="false">
      <g fill="url(#olGold)">${[6, 80, 154].map((x) => `<path d="${A(x)}"/>`).join('')}<path d="${SWOOSH}"/><path class="ol-head" d="${HEAD}"/></g>
    </svg>`;

  /* ---------- Scroll reveals (CSS does the motion; this only marks elements that came into view) ---------- */
  let observer = null;
  OL.reveal = (root = document) => {
    if (OL.motion && OL.motion.on) return OL.motion.reveal(root); // the GSAP layer (motion.js)
    const els = $$('[data-reveal]:not(.is-in)', root);
    if (!els.length) return;
    if (OL.reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); observer.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }
    els.forEach((el) => observer.observe(el));
  };

  /* ---------- Shared UI templates ---------- */
  const ui = (OL.ui = {});

  // a row of small colour dots linking the item to its other colours
  ui.colours = (p, { max = 5 } = {}) => {
    const sibs = OL.catalog.otherColours(OL.PRODUCTS, p);
    if (!sibs.length) return '';
    const all = [p, ...sibs];
    const dot = (x) => `<a class="cdot${x === p ? ' is-on' : ''}" href="${OL.productUrl(x)}" title="${esc(x.color || x.name)}" aria-label="${esc(x.color || x.name)}" data-c="${/^#[0-9a-fA-F]{6}$/.test(x.colorHex || '') ? x.colorHex : '#999'}"></a>`;
    return `<div class="pcard-colours">${all.slice(0, max).map(dot).join('')}${all.length > max ? `<small>+${all.length - max}</small>` : ''}</div>`;
  };

  ui.card = (p, o = {}) => {
    const off = OL.off(p);
    const wished = state.wish.includes(p.id);
    const av = OL.catalog.availability(p);
    const img0 = p.images[0];
    const img1 = p.images[1] || p.images[0];
    const tag = av === 'sold' ? 'sold' : av === 'order' ? 'order' : p.tag;
    const colour = p.color ? `<span class="pcard-colour">${esc(p.color)}</span>` : '';
    return `
    <article class="pcard ${o.cls || ''}" data-id="${esc(p.id)}">
      <div class="pcard-media">
        <a class="pcard-link" href="${OL.productUrl(p)}" aria-label="${esc(p.brand)} ${esc(p.name)}${p.color ? `, ${esc(p.color)}` : ''}">
          <img class="pcard-img is-main" src="${OL.pimg(img0, 640, 800)}" alt="${esc(p.brand)} ${esc(p.name)}" loading="lazy" decoding="async">
          ${img1 !== img0 ? `<img class="pcard-img is-alt" src="${OL.pimg(img1, 640, 800)}" alt="" loading="lazy" decoding="async">` : ''}
        </a>
        <div class="pcard-flags">
          ${off ? `<span class="pcard-badge">−${off}%</span>` : ''}
          ${tag ? `<span class="pcard-tag is-${tag}">${t('tag.' + tag)}</span>` : ''}
        </div>
        <button class="pcard-fav${wished ? ' is-on' : ''}" type="button" aria-pressed="${wished}" aria-label="${t('ui.fav')}">${ICON.heart}</button>
      </div>
      <div class="pcard-body">
        <p class="pcard-brand">${esc(p.brand)}</p>
        <h3 class="pcard-name"><a href="${OL.productUrl(p)}">${esc(p.name)}</a></h3>
        ${colour}
        <div class="pcard-price"><span class="pcard-now">${OL.price(p.price)}</span>${p.was > p.price ? `<s class="pcard-was">${OL.price(p.was)}</s>` : ''}</div>
        ${ui.colours(p)}
      </div>
    </article>`;
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  OL.toast = (msg) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
  };

  /* ---------- Theme ---------- */
  const BG = { dark: '#0A0A0A', light: '#F6F2EA' };
  OL.bgFor = (theme) => BG[theme];
  const applyTheme = (theme) => {
    html.dataset.theme = theme;
    state.theme = theme;
    store.set('theme', theme);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = OL.bgFor(theme);
  };
  // with the motion layer, a curtain carrying the logo passes over the page while the colours change
  const M = () => (OL.motion && OL.motion.on ? OL.motion : null);
  OL.toggleTheme = () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (M()) { M().cover(t('toast.' + next)).then(() => { applyTheme(next); return M().uncover(); }); return; }
    applyTheme(next);
    OL.toast(t('toast.' + next));
  };

  /* ---------- Language ---------- */
  const applyI18n = () => {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    $$('[data-lang]').forEach((b) => { b.classList.toggle('is-on', b.dataset.lang === state.lang); b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)); });
  };
  OL.setLang = (lang) => {
    if (lang === state.lang) return;
    if (M() && !OL.setLang.busy) {
      OL.setLang.busy = true;
      M().cover(lang.toUpperCase()).then(() => { applyLang(lang); return M().uncover(); }).then(() => { OL.setLang.busy = false; });
      return;
    }
    applyLang(lang);
  };
  function applyLang(lang) {
    state.lang = lang;
    store.set('lang', lang);
    html.lang = lang;
    applyI18n();
    renderNav();
    renderFooter();
    renderCart();
    renderWish();
    searchIndex = null;
    renderSearch();
    buildMega();
    OL.refreshRoute();
  }

  /* ---------- Page mount ---------- */
  OL.mount = (opts = {}) => {
    const C = OL.pages[opts.page] || OL.pages.notfound;
    const ctx = opts.ctx || {};
    OL.cleanup();
    const app = $('#app');
    OL.mounted = true;
    app.innerHTML = C.render(ctx);
    if (M()) M().scrollTo(opts.keepScroll || 0, { immediate: true });
    else window.scrollTo(0, opts.keepScroll || 0);
    const api = (C.bind && C.bind(app, ctx)) || {};
    OL.reveal(app);
    return api;
  };

  /* ---------- Header navigation (departments come from the categories) ---------- */
  function renderNav() {
    const dept = (d) => `<a href="/${d}" data-mega="${d}">${t('nav.' + d)}</a>`;
    const links = `${dept('clothing')}${dept('shoes')}${dept('accessories')}
      <a href="/new">${t('nav.new')}</a><a href="/shop" data-mega="brands">${t('nav.brands')}</a><a href="/sale" class="nav-deal">${t('nav.sale')}</a>`;
    $('#mainNav').innerHTML = links;
    const mobile = ['clothing', 'shoes', 'accessories'].map((d) => `
      <details class="mm-group"><summary>${t('nav.' + d)}</summary>
        <div class="mm-links"><a href="/${d}">${t('mega.all')}</a>
        ${OL.CATEGORIES.filter((c) => c.dept === d && OL.PRODUCTS.some((p) => p.cat === c.slug)).map((c) => `<a href="${OL.catUrl(c.slug)}">${esc(OL.catName(c.slug))}</a>`).join('')}</div></details>`).join('');
    $('#mobileNav').innerHTML = `${mobile}<a class="mm-plain" href="/new">${t('nav.new')}</a><a class="mm-plain" href="/sale">${t('nav.sale')}</a>
      <a class="mm-plain" href="/shop">${t('shop.title.all')}</a>`;
    markNav(OL.route && OL.route());
  }
  OL.renderNav = renderNav;
  function markNav(route) {
    const path = route ? route.path.replace(/\/$/, '') || '/' : '';
    $$('#mainNav a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('?')[0];
      a.classList.toggle('is-active', href === path && path !== '/');
    });
  }
  OL.markNav = markNav;

  /* ---------- Cart ---------- */
  const saveCart = () => store.set('cart2', state.cart);
  // the cart lines whose product exists (with their position in the saved cart)
  const liveLines = () => state.cart.map((i, k) => ({ i, k })).filter((x) => validLine(x.i));
  OL.cartLines = () => liveLines().map((x) => x.i);
  const cartTotals = () => {
    const l = OL.cartLines();
    const sub = l.reduce((s, i) => s + OL.P[i.id].price * i.qty, 0);
    const save = l.reduce((s, i) => s + Math.max(0, OL.P[i.id].was - OL.P[i.id].price) * i.qty, 0);
    return { sub, save };
  };
  // pieces in the cart that have to be ordered from abroad (the server decides for real; this is the preview)
  OL.abroadCount = () => OL.cartLines().reduce((n, i) => n + (OL.lineState(OL.P[i.id], i.size, i.qty) === 'order' ? i.qty : 0), 0);
  OL.abroadDays = () => {
    const list = OL.cartLines().filter((i) => OL.lineState(OL.P[i.id], i.size, i.qty) === 'order').map((i) => OL.orderDays(OL.P[i.id]));
    return [...new Set(list)].join(', ') || OL.orderDays();
  };
  OL.lineBadge = (p, size, qty) => {
    const s = OL.lineState(p, size, qty);
    return s === 'order' ? `<span class="ful is-order">${ICON.plane}${t('ful.order')} · ${esc(OL.orderDays(p))} ${t('ui.daysShort')}</span>`
      : s === 'stock' ? `<span class="ful is-stock">${t('ful.stock')}</span>` : `<span class="ful is-sold">${t('ui.soldOut')}</span>`;
  };
  function renderCart() {
    const items = liveLines();
    const count = items.reduce((s, x) => s + x.i.qty, 0);
    const badge = $('#cartCount');
    badge.textContent = count;
    badge.classList.toggle('has-items', count > 0);

    if (!items.length) {
      $('#cartItems').innerHTML = `<div class="cart-empty">${OL.logoMark()}<h3>${t('cart.empty')}</h3><p>${t('cart.emptyText')}</p></div>`;
      $('#cartFoot').innerHTML = '';
      return;
    }
    $('#cartItems').innerHTML = items.map(({ i, k }) => {
      const p = OL.P[i.id];
      return `<div class="cart-item" data-key="${k}">
        <a href="${OL.productUrl(p)}"><img src="${OL.pimg(p.images[0], 200, 250)}" alt=""></a>
        <div><h4><a href="${OL.productUrl(p)}">${esc(p.name)}</a></h4><small>${esc(p.brand)}${p.color ? ` · ${esc(p.color)}` : ''}</small>
          <label class="ci-size"><span class="sr-only">${t('cart.size')}</span>${OL.sizeSelect(p, i.size)}</label>
          ${OL.lineBadge(p, i.size, i.qty)}
          <div class="ci-price">${OL.price(p.price * i.qty)}</div></div>
        <div class="ci-side">
          <div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><span>${i.qty}</span><button type="button" data-qty="1" aria-label="+">+</button></div>
          <button type="button" class="ci-remove" data-remove>${t('cart.remove')}</button>
        </div>
      </div>`;
    }).join('');
    const { sub, save } = cartTotals();
    const thr = (OL.SETTINGS && OL.SETTINGS.delivery && OL.SETTINGS.delivery.free_threshold) || 0;
    const prog = OL.orderLogic.freeProgress(sub, thr);
    const abroad = OL.abroadCount();
    $('#cartFoot').innerHTML = `
      ${prog.enabled ? `<div class="free-bar${prog.free ? ' is-free' : ''}"><p>${prog.free ? t('cp.freeDone') : t('cp.freeFrom', { n: OL.price(prog.left) })}</p><div><i data-w="${prog.pct}"></i></div></div>` : ''}
      <div class="cf-row"><span>${t('cart.subtotal')}</span><b>${OL.price(sub)}</b></div>
      ${save > 0 ? `<div class="cf-row cf-save"><span>${t('cart.save')}</span><span>${OL.price(save)}</span></div>` : ''}
      ${abroad ? `<p class="cf-abroad">${ICON.plane}<span>${t('ful.cartNote', { n: abroad, days: esc(OL.abroadDays()) })}</span></p>` : ''}
      <p class="cf-note">${t('cart.note')}</p>
      <a class="btn btn-gold" href="/checkout"><span>${t('cart.checkout')}</span>${ICON.arrow}</a>
      <a class="cf-view" href="/cart">${t('cp.viewCart')}</a>`;
  }
  OL.renderCart = renderCart;
  OL.saveCart = saveCart;

  // Size picker for a cart line (drawer + cart page). Sizes sold out for good stay visible but disabled.
  OL.sizeSelect = (p, current) => `<select data-size-select>${p.sizes.map((z) =>
    `<option value="${esc(z.s)}" ${z.s === current ? 'selected' : ''} ${z.ok || z.s === current ? '' : 'disabled'}>${esc(z.s)}${z.stock > 0 ? '' : z.ok ? ` — ${t('ful.order')}` : ` — ${t('pd.soldOut')}`}</option>`).join('')}</select>`;
  // Change a line's size; if the cart already has that size, the two lines merge.
  OL.setCartSize = (line, size) => {
    const twin = state.cart.find((i) => i !== line && i.id === line.id && i.size === size);
    if (twin) {
      twin.qty = Math.min(10, twin.qty + line.qty);
      state.cart.splice(state.cart.indexOf(line), 1);
    } else line.size = size;
  };

  OL.addToCart = (id, size, { qty = 1, silent = false } = {}) => {
    const ex = state.cart.find((i) => i.id === id && i.size === size);
    if (ex) ex.qty = Math.min(10, ex.qty + qty); else state.cart.push({ id, size, qty });
    saveCart();
    const p = OL.P[id];
    OL.track && OL.track('add_to_cart', { currency: 'UZS', value: p.price, items: [OL.itemOf(p, { quantity: qty, item_variant: size })] });
    renderCart();
    const b = $('.cart-btn');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    if (!silent) OL.toast(`${t('cart.added')} · ${p.name} · ${size}`);
  };

  /* ---------- Overlays + scroll lock ---------- */
  const OVERLAYS = ['cart-open', 'wish-open', 'search-open', 'menu-open', 'filters-open', 'modal-open'];
  const lockScroll = () => html.classList.toggle('is-locked', OVERLAYS.some((c) => html.classList.contains(c)));
  OL.lockScroll = lockScroll;
  const setDrawer = (name) => {
    html.classList.toggle('cart-open', name === 'cart');
    html.classList.toggle('wish-open', name === 'wish');
    $('#cart').setAttribute('aria-hidden', String(name !== 'cart'));
    $('#wish').setAttribute('aria-hidden', String(name !== 'wish'));
    lockScroll();
  };
  const closeAll = () => {
    setDrawer(null);
    setSearch(false);
    html.classList.remove('menu-open', 'filters-open');
    closeMega();
    lockScroll();
  };
  OL.closeAll = closeAll;

  /* ---------- Mega-menu (desktop: Clothing / Shoes / Accessories / Brands) ---------- */
  let megaTimer;
  function closeMega() {
    clearTimeout(megaTimer);
    html.classList.remove('mega-open');
    $$('.mega-panel.is-on').forEach((el) => el.classList.remove('is-on'));
    $$('[data-mega].is-open').forEach((el) => el.classList.remove('is-open'));
  }
  function openMega(key) {
    clearTimeout(megaTimer);
    const panel = $(`.mega-panel[data-mega-panel="${key}"]`);
    if (!panel) return closeMega();
    $$('.mega-panel').forEach((el) => el.classList.toggle('is-on', el === panel));
    $$('[data-mega]').forEach((el) => el.classList.toggle('is-open', el.dataset.mega === key));
    html.classList.add('mega-open');
  }
  function buildMega() {
    const box = $('#mega');
    if (!box) return;
    const deptPanel = (d) => {
      const list = OL.catalog.base(OL.PRODUCTS, 'dept', d);
      if (!list.length) return '';
      const cats = OL.CATEGORIES.filter((c) => c.dept === d).map((c) => [c, list.filter((p) => p.cat === c.slug).length]).filter((x) => x[1] > 0);
      const brands = [...list.reduce((m, p) => m.set(p.brand, (m.get(p.brand) || 0) + 1), new Map())].sort((x, y) => y[1] - x[1]).slice(0, 8);
      const feat = list.find((p) => p.featured) || list[0];
      return `<div class="mega-panel" data-mega-panel="${d}">
        <div class="mega-cols container">
          <div class="mega-col">
            <h4>${t('mega.cats')}</h4>
            ${cats.map(([c, n]) => `<a href="${OL.catUrl(c.slug)}">${esc(OL.catName(c.slug))}<small>${n}</small></a>`).join('')}
            <a class="mega-all" href="/${d}">${t('mega.all')} ${ICON.arrow}</a>
          </div>
          <div class="mega-col">
            <h4>${t('mega.brands')}</h4>
            ${brands.map(([b, n]) => `<a href="/shop?cat=${cats.map(([c]) => c.slug).join(',')}&brand=${OL.slug(b)}">${esc(b)}<small>${n}</small></a>`).join('')}
          </div>
          <a class="mega-feature" href="${OL.productUrl(feat)}">
            <img src="${OL.pimg(feat.images[0], 360, 450)}" alt="" loading="lazy">
            <span><small>${t('mega.featured')}</small><b>${esc(feat.name)}</b><em>${OL.price(feat.price)}</em></span>
          </a>
        </div>
      </div>`;
    };
    const brands = [...OL.PRODUCTS.reduce((m, p) => m.set(p.brand, (m.get(p.brand) || 0) + 1), new Map())].sort((a, b) => a[0].localeCompare(b[0]));
    const brandPanel = brands.length ? `<div class="mega-panel" data-mega-panel="brands"><div class="mega-cols container mega-brands">
        ${brands.map(([b, n]) => `<a href="/brands/${OL.slug(b)}">${esc(b)}<small>${n}</small></a>`).join('')}</div></div>` : '';
    box.innerHTML = ['clothing', 'shoes', 'accessories'].map(deptPanel).join('') + brandPanel;
  }
  OL.buildMega = buildMega;

  /* ---------- Wishlist ---------- */
  const saveWish = () => store.set('wish', state.wish);
  // forget saved items of products that no longer exist — only once the live catalog is the active one
  OL.pruneSaved = () => {
    if (OL.source !== 'live') return;
    state.cart = state.cart.filter(validLine);
    state.wish = state.wish.filter((id) => OL.P[id]);
    saveCart();
    saveWish();
  };
  function renderWish() {
    const ids = state.wish.filter((id) => OL.P[id]);
    const badge = $('#wishCount');
    badge.textContent = ids.length;
    badge.classList.toggle('has-items', ids.length > 0);
    $('#wishItems').innerHTML = ids.length
      ? ids.map((id) => {
        const p = OL.P[id];
        return `<div class="wish-item" data-id="${esc(p.id)}">
          <a href="${OL.productUrl(p)}"><img src="${OL.pimg(p.images[0], 200, 250)}" alt=""></a>
          <div><h4><a href="${OL.productUrl(p)}">${esc(p.name)}</a></h4><small>${esc(p.brand)}${p.color ? ` · ${esc(p.color)}` : ''}</small><div class="ci-price">${OL.price(p.price)}</div></div>
          <div class="ci-side">
            <a class="btn btn-ghost btn-sm" href="${OL.productUrl(p)}"><span>${t('ui.view')}</span></a>
            <button type="button" class="ci-remove" data-unwish>${t('cart.remove')}</button>
          </div>
        </div>`;
      }).join('')
      : `<div class="cart-empty">${ICON.heart}<h3>${t('wish.empty')}</h3><p>${t('wish.emptyText')}</p></div>`;
    if (ids.length) $('#wishItems').insertAdjacentHTML('beforeend', `<a class="btn btn-ghost wish-all" href="/wishlist"><span>${t('ui.viewAll')}</span></a>`);
  }
  OL.renderWish = renderWish;

  OL.toggleWish = (id) => {
    const i = state.wish.indexOf(id);
    const on = i === -1;
    if (on) state.wish.push(id); else state.wish.splice(i, 1);
    saveWish();
    $$('[data-id]').forEach((c) => {
      if (c.dataset.id !== id) return;
      const f = $('.pcard-fav, .pd-fav', c);
      if (!f) return;
      f.classList.toggle('is-on', on);
      f.setAttribute('aria-pressed', String(on));
    });
    renderWish();
    if (on) { const b = $('.wish-btn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    return on;
  };

  /* ---------- Search ---------- */
  // spellings people actually type: brands, and the kinds of item (Cyrillic and Latin variants, three languages)
  const BRAND_ALIASES = {
    lacoste: ['лакост', 'лакоста'], 'polo ralph lauren': ['ральф лорен', 'поло ральф лорен', 'ralph lauren', 'рэлф лорен'],
    'tommy hilfiger': ['томми хилфигер', 'томми', 'tommy', 'hilfiger'], 'calvin klein': ['кельвин кляйн', 'кэлвин кляйн', 'келвин клейн', 'ck'],
    boss: ['босс', 'хуго босс', 'hugo boss'], gant: ['гант'], diesel: ['дизель'], nike: ['найк', 'найки', 'nayk'],
    adidas: ['адидас', 'addidas'], 'new balance': ['нью баланс', 'ню баланс', 'nb'], levis: ['ливайс', 'левайс', 'levi'], puma: ['пума'], zara: ['зара'],
  };
  const TYPE_WORDS = {
    't-shirts': ['футболка', 'футболки', 'майка', 'futbolka', 'tee', 'tshirt', 't shirt'], polos: ['поло', 'polo'],
    shirts: ['рубашка', 'рубашки', 'сорочка', 'koylak', 'shirt'], knitwear: ['свитер', 'джемпер', 'кардиган', 'sviter', 'jemper', 'sweater', 'trikotaj'],
    'hoodies-sweatshirts': ['худи', 'толстовка', 'свитшот', 'xudi', 'hoodie', 'sweatshirt'], 'jackets-coats': ['куртка', 'пальто', 'ветровка', 'kurtka', 'palto', 'jacket', 'coat'],
    'suits-blazers': ['пиджак', 'костюм', 'блейзер', 'pidjak', 'kostyum', 'blazer', 'suit'], trousers: ['брюки', 'штаны', 'чиносы', 'shim', 'trousers', 'pants', 'chinos'],
    jeans: ['джинсы', 'jinsi', 'jeans', 'denim'], shorts: ['шорты', 'short', 'shorts'], 'underwear-socks': ['бельё', 'белье', 'трусы', 'носки', 'ichki kiyim', 'paypoq', 'socks', 'underwear', 'boxer'],
    sneakers: ['кроссовки', 'кеды', 'krossovka', 'krossovkalar', 'sneakers', 'trainers'], 'classic-shoes': ['туфли', 'дерби', 'лоферы', 'tufli', 'derby', 'loafers', 'oxford'],
    boots: ['ботинки', 'сапоги', 'botinka', 'boots'], belts: ['ремень', 'ремни', 'kamar', 'belt'], bags: ['сумка', 'рюкзак', 'sumka', 'ryukzak', 'bag', 'backpack'],
    'caps-hats': ['кепка', 'шапка', 'бейсболка', 'kepka', 'shapka', 'cap', 'hat'], wallets: ['кошелёк', 'кошелек', 'портмоне', 'hamyon', 'wallet'], ties: ['галстук', 'бабочка', 'galstuk', 'tie'],
    sunglasses: ['очки', 'ochki', 'koʻzoynak', 'kozoynak', 'sunglasses'],
  };
  const DEPT_WORDS = { clothing: ['одежда', 'kiyim', 'clothes', 'clothing'], shoes: ['обувь', 'poyabzal', 'shoes', 'footwear'], accessories: ['аксессуары', 'aksessuar', 'accessories'] };
  // words that describe every product of this shop — they don't narrow the search
  const GENERIC = ['мужская', 'мужские', 'мужской', 'мужское', 'erkaklar', 'erkak', 'men', 'mens', 'man', 'original', 'оригинал', 'оригинальная'];
  const norm = (str) => String(str || '').toLowerCase().replace(/ё/g, 'е')
    .replace(/[ʻʼ’‘'`´]/g, '').replace(/[^a-z0-9Ѐ-ӿ]+/g, ' ').trim();

  let searchIndex = null;
  const buildIndex = () => {
    searchIndex = OL.PRODUCTS.map((p) => {
      const brand = norm(p.brand);
      const cat = OL.CAT[p.cat];
      const catNames = cat ? ['ru', 'uz', 'en'].map((l) => cat.name[l]).join(' ') : p.cat;
      const dept = OL.catDept(p.cat);
      const hay = norm([p.brand, p.name, p.color, p.material, p.styleCode, (p.tags || []).join(' '), p.cat, catNames,
        (TYPE_WORDS[p.cat] || []).join(' '), (DEPT_WORDS[dept] || []).join(' '), (BRAND_ALIASES[brand] || []).join(' ')].join(' '));
      return { p, hay, brand, name: norm(p.name) };
    });
  };
  const runSearch = (query) => {
    const words = norm(query).split(' ').filter(Boolean);
    if (!words.length) return null;
    if (!searchIndex) buildIndex();
    const tokens = words.filter((w) => !GENERIC.includes(w));
    return searchIndex
      .map((e, order) => {
        if (!tokens.every((w) => e.hay.includes(w))) return null;
        let score = 0;
        tokens.forEach((w) => {
          if (e.brand.startsWith(w) || (BRAND_ALIASES[e.brand] || []).some((a) => a.startsWith(w))) score += 3;
          if (e.name.startsWith(w) || e.name.includes(' ' + w)) score += 2;
        });
        if (e.p.isNew) score += 1;
        return { p: e.p, score, order };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((r) => r.p);
  };
  OL.search = (q) => runSearch(q) || [];
  // categories whose name (or a word for them) starts with what was typed
  const matchCategories = (query) => {
    const q = norm(query);
    if (q.length < 2) return [];
    return OL.CATEGORIES.filter((c) => {
      const names = [...['ru', 'uz', 'en'].map((l) => norm(c.name[l])), ...(TYPE_WORDS[c.slug] || []).map(norm)];
      return OL.PRODUCTS.some((p) => p.cat === c.slug) && names.some((n) => n.split(' ').some((w) => w.startsWith(q)) || n.startsWith(q));
    }).slice(0, 4);
  };

  const RESULTS_SHOWN = 8;
  function renderSearch() {
    const body = $('#searchBody');
    if (!body) return;
    const q = $('#searchInput').value;
    const found = runSearch(q);
    const recent = store.get('recent', []);
    const chip = (text) => `<button type="button" class="s-chip" data-q="${esc(text)}">${esc(text)}</button>`;

    if (found === null) {
      body.innerHTML = `
        ${recent.length ? `<div class="s-group"><div class="s-head"><span>${t('search.recent')}</span><button type="button" class="s-clear" data-clear-recent>${t('search.clear')}</button></div><div class="s-chips">${recent.map(chip).join('')}</div></div>` : ''}
        <div class="s-group"><div class="s-head"><span>${t('search.popular')}</span></div><div class="s-chips">${OL.BRANDS.slice(0, 8).map(chip).join('')}</div></div>`;
      return;
    }
    const cats = matchCategories(q);
    const catLinks = cats.length ? `<div class="s-cats">${cats.map((c) => `<a href="${OL.catUrl(c.slug)}">${esc(OL.catName(c.slug))}${ICON.arrow}</a>`).join('')}</div>` : '';
    if (!found.length) {
      body.innerHTML = `${catLinks}<div class="s-empty"><h3>${t('search.none')}</h3><p>${t('search.noneText')}</p>
        <div class="s-chips">${OL.BRANDS.slice(0, 4).map(chip).join('')}</div></div>`;
      return;
    }
    const shown = found.slice(0, RESULTS_SHOWN);
    body.innerHTML = `
      ${catLinks}
      <div class="s-head"><span>${found.length} ${t('search.results')}</span></div>
      ${shown.map((p) => `<a class="sr" href="${OL.productUrl(p)}" data-remember>
          <img class="sr-img" src="${OL.pimg(p.images[0], 160, 200)}" alt="" loading="lazy">
          <span class="sr-info">
            <small>${esc(p.brand)}</small>
            <b>${esc(p.name)}</b>
            <small>${esc(p.color || '')}</small>
            <span>${OL.price(p.price)}${p.was > p.price ? ` <s>${OL.price(p.was)}</s>` : ''}</span>
          </span>
        </a>`).join('')}
      ${found.length > RESULTS_SHOWN ? `<a class="s-all" href="/shop?q=${encodeURIComponent(q.trim())}">${t('search.viewAll', { n: found.length })} ${ICON.arrow}</a>` : ''}`;
  }
  const remember = (q) => {
    const text = String(q || '').trim();
    if (text.length < 2) return;
    const list = [text, ...store.get('recent', []).filter((x) => x.toLowerCase() !== text.toLowerCase())].slice(0, 5);
    store.set('recent', list);
  };
  function setSearch(open) {
    html.classList.toggle('search-open', open);
    const box = $('#search');
    if (!box) return;
    box.setAttribute('aria-hidden', String(!open));
    if (open) {
      renderSearch();
      $('#searchInput').focus({ preventScroll: true });
    } else {
      $('#searchInput').blur();
    }
    lockScroll();
  }

  /* ---------- Live catalog ---------- */
  // Fetches /api/catalog. Only applied before the page is first rendered, so
  // the page never mixes two catalogs. Falls back to the built-in placeholders.
  OL.loadCatalog = async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch('/api/catalog', { signal: ctrl.signal, cache: 'no-cache', headers: { Accept: 'application/json' } }); // the edge caches it; the browser must always revalidate
      clearTimeout(timer);
      if (!res.ok) throw new Error('catalog ' + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.products)) throw new Error('bad catalog payload');
      if (!OL.mounted) OL.setCatalog(data.products, data.settings || {}, 'live', data.categories);
    } catch (e) {
      if (!OL.CONFIG.staticFallback && !OL.mounted) OL.setCatalog([], {}, 'unavailable');
      // otherwise keep the built-in placeholder catalog
    }
    OL.pruneSaved();
    searchIndex = null;
    return OL.source;
  };

  /* ---------- Footer + "Ask a manager" button (contacts come from settings) ---------- */
  function renderFooter() {
    const c = OL.contacts();
    const L = OL.orderLogic;
    const tg = L.tgLink(c.telegram);
    const insta = L.instaLink(c.instagram);
    const tel = L.telLink(c.phone);
    const ext = 'target="_blank" rel="noopener"';
    $('#footer').innerHTML = `
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">${OL.logoMark()}<p class="footer-word">OUTLET LOUNGE</p><p class="footer-tag">${t('footer.tagline')}</p></div>
          <div class="footer-col"><h4>${t('footer.shop')}</h4><a href="/clothing">${t('nav.clothing')}</a><a href="/shoes">${t('nav.shoes')}</a><a href="/accessories">${t('nav.accessories')}</a><a href="/new">${t('nav.new')}</a><a href="/sale">${t('nav.sale')}</a></div>
          <div class="footer-col"><h4>${t('footer.help')}</h4><a href="/delivery">${OL.infoTitle('delivery')}</a><a href="/returns">${OL.infoTitle('returns')}</a><a href="/size-guide">${OL.infoTitle('size-guide')}</a><a href="/authenticity">${OL.infoTitle('authenticity')}</a><a href="/faq">${OL.infoTitle('faq')}</a>${tg ? `<a href="${tg}" ${ext}>${t('footer.ask')}</a>` : ''}</div>
          <div class="footer-col footer-contacts"><h4>${t('footer.contact')}</h4>
            ${tel ? `<a href="${tel}">${esc(c.phone)}</a>` : ''}
            ${c.hours ? `<p>${t('footer.hours', { hours: esc(c.hours) })}</p>` : ''}
            ${tg ? `<a href="${tg}" ${ext}>Telegram</a>` : ''}
            ${insta ? `<a href="${insta}" ${ext}>Instagram</a>` : ''}
            <a href="/about">${OL.infoTitle('about')}</a><a href="/contacts">${OL.infoTitle('contacts')}</a><a href="/offer">${OL.infoTitle('offer')}</a><a href="/privacy">${OL.infoTitle('privacy')}</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Outlet Lounge. ${t('footer.rights')}${OL.legal && OL.legal().company ? ` ${esc(OL.legal().company)}${OL.legal().inn ? `, ${t('footer.inn')} ${esc(OL.legal().inn)}` : ''}` : ''}</span>
          <span>${t('footer.currency')}${OL.source === 'live' ? '' : ` · ${t('footer.photos')}`}</span>
          ${insta || tg ? `<div class="footer-social">${insta ? `<a href="${insta}" ${ext} aria-label="Instagram">${ICON.insta}</a>` : ''}${tg ? `<a href="${tg}" ${ext} aria-label="Telegram">${ICON.tg}</a>` : ''}</div>` : ''}
        </div>
      </div>`;

    // floating Telegram button (phones only, via CSS); hidden until a manager username is set
    let fab = $('#tgFab');
    if (!tg) { if (fab) fab.remove(); return; }
    if (!fab) {
      fab = document.createElement('a');
      fab.id = 'tgFab';
      fab.className = 'tg-fab';
      fab.target = '_blank';
      fab.rel = 'noopener';
      document.body.appendChild(fab);
    }
    fab.href = tg;
    fab.setAttribute('aria-label', t('footer.ask'));
    fab.innerHTML = `${ICON.tg}<span>${t('footer.ask')}</span>`;
  }
  OL.renderFooter = renderFooter;

  /* ---------- Header behaviour ---------- */
  function initHeader() {
    const header = $('#header');
    let last = 0;
    const onScroll = () => {
      const y = scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      header.classList.toggle('is-hidden', y > last && y > 360 && !html.classList.contains('menu-open'));
      last = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  OL.scrollTo = (target) => {
    const el = typeof target === 'string' ? (target === '#top' ? 0 : $(target)) : target;
    if (el == null) return;
    const off = -(parseInt(getComputedStyle(html).getPropertyValue('--header-h')) || 68) + 1;
    const top = el === 0 ? 0 : el.getBoundingClientRect().top + scrollY + off;
    if (M()) return M().scrollTo(top);
    window.scrollTo({ top, behavior: OL.reduced ? 'auto' : 'smooth' });
  };

  /* ---------- Global events ---------- */
  function initEvents() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (link && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) &&
          !link.target && !link.hasAttribute('download') && !link.hasAttribute('data-native')) {
        const href = link.getAttribute('href');
        if (href.startsWith('/') && !href.startsWith('//') && !/^\/(api|assets)\//.test(href)) {
          e.preventDefault();
          if (link.hasAttribute('data-remember')) remember($('#searchInput').value);
          closeAll();
          if (OL.navigate) OL.navigate(href);
          return;
        }
        if (href.startsWith('#')) {
          e.preventDefault();
          html.classList.remove('menu-open');
          lockScroll();
          if (href.length > 1) OL.scrollTo(href);
          return;
        }
      }
      const fav = e.target.closest('.pcard-fav');
      if (fav) { OL.toggleWish(fav.closest('[data-id]').dataset.id); return; }
      const unwish = e.target.closest('[data-unwish]');
      if (unwish) return void OL.toggleWish(unwish.closest('[data-id]').dataset.id);
      if (e.target.closest('[data-open-wish]')) return setDrawer('wish');
      if (e.target.closest('[data-open-search]')) { html.classList.remove('menu-open'); return setSearch(true); }
      if (e.target.closest('[data-close-search]')) return setSearch(false);
      const sq = e.target.closest('[data-q]');
      if (sq) {
        const input = $('#searchInput');
        input.value = sq.dataset.q;
        renderSearch();
        input.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('[data-clear-recent]')) { store.set('recent', []); return renderSearch(); }
      if (e.target.closest('[data-theme-toggle]')) return OL.toggleTheme();
      const lang = e.target.closest('[data-lang]');
      if (lang) return OL.setLang(lang.dataset.lang);
      if (e.target.closest('[data-open-cart]')) return setDrawer('cart');
      if (e.target.closest('[data-close-cart]')) return setDrawer(null);
      if (e.target.closest('[data-menu-toggle]')) { html.classList.toggle('menu-open'); return lockScroll(); }

      const item = e.target.closest('.cart-item');
      if (item) {
        const k = Number(item.dataset.key);
        const q = e.target.closest('[data-qty]');
        if (q) {
          state.cart[k].qty = Math.min(10, state.cart[k].qty + Number(q.dataset.qty));
          if (state.cart[k].qty < 1) state.cart.splice(k, 1);
        } else if (e.target.closest('[data-remove]')) {
          state.cart.splice(k, 1);
        } else return;
        saveCart();
        renderCart();
      }
    });
    $('#cartItems').addEventListener('change', (e) => {
      const sel = e.target.closest('[data-size-select]');
      const line = sel && state.cart[Number(sel.closest('.cart-item').dataset.key)];
      if (!line) return;
      OL.setCartSize(line, sel.value);
      saveCart();
      renderCart();
    });

    // mega-menu: hover / keyboard focus on the nav, closes when the pointer leaves the header
    const header = $('#header');
    $('#mainNav').addEventListener('mouseover', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      a.dataset.mega ? openMega(a.dataset.mega) : closeMega();
    });
    $('#mainNav').addEventListener('focusin', (e) => {
      const a = e.target.closest('a');
      if (a) (a.dataset.mega ? openMega(a.dataset.mega) : closeMega());
    });
    header.addEventListener('mouseleave', () => { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 160); });
    header.addEventListener('mouseenter', () => clearTimeout(megaTimer));
    addEventListener('scroll', () => { if (html.classList.contains('mega-open')) closeMega(); }, { passive: true });

    const sInput = $('#searchInput');
    let st;
    sInput.addEventListener('input', () => { clearTimeout(st); st = setTimeout(renderSearch, 70); });
    document.addEventListener('submit', (e) => { if (e.target.closest('.search-bar')) e.preventDefault(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return closeAll();
      const typing = e.target.closest('input, textarea, select');
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setDrawer(null);
        setSearch(true);
      }
      if (e.key === 'Enter' && e.target.id === 'searchInput') {
        const value = e.target.value.trim();
        remember(value);
        if (value) { OL.track && OL.track('search', { search_term: value }); closeAll(); OL.navigate('/shop?q=' + encodeURIComponent(value)); }
      }
    });

    // graceful fallback if a photo fails to load
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (img.tagName !== 'IMG' || img.dataset.fallback) return;
      img.dataset.fallback = '1';
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#1A1714"/><path d="M120 150h160l30 40-30 20v140H120V210l-30-20z" fill="none" stroke="#D4B078" stroke-width="3"/></svg>');
    }, true);
  }

  /* ---------- Shell boot ---------- */
  // The page's CSP forbids style="" attributes, so generated markup carries data-c (a colour) and data-w
  // (a width in %), which are applied through the CSS object model as soon as the elements appear.
  const paintData = (root) => {
    if (root.nodeType !== 1) return;
    const apply = (el) => {
      if (el.dataset.c) el.style.setProperty('--c', el.dataset.c);
      if (el.dataset.w) el.style.width = `${el.dataset.w}%`;
    };
    if (root.matches('[data-c], [data-w]')) apply(root);
    root.querySelectorAll('[data-c], [data-w]').forEach(apply);
  };
  OL.initShell = () => {
    paintData(document.body);
    new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach(paintData))).observe(document.body, { childList: true, subtree: true });
    $('#brandMark').innerHTML = OL.logoMark();
    applyI18n();
    renderNav();
    renderFooter();
    buildMega();
    initHeader();
    initEvents();
    // renderCart() / renderWish() run when the catalog has loaded (main.js)
  };
})();
