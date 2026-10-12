/* Outlet Lounge — core: helpers, logo, shell (header, theme, language, cart), motion utilities */
(function () {
  const OL = (window.OL = window.OL || {});
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  OL.$ = $;
  OL.$$ = $$;

  const hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  OL.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  OL.touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  OL.anim = hasGsap && !!window.ScrollTrigger && !OL.reduced;

  /* ---------- storage + state ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ol:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ol:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  OL.store = store;
  OL.state = {
    lang: ['en', 'ru', 'uz'].includes(html.lang) ? html.lang : 'en',
    theme: html.dataset.theme,
    cart: store.get('cart', []).filter((i) => i && OL.P[i.id]),
    wish: store.get('wish', []).filter((id) => OL.P[id]),
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
  OL.productUrl = (p) => `/product/${encodeURIComponent(p.slug)}`;
  const t = OL.t;
  OL.num = (n) => Math.round(n).toLocaleString('ru-RU');
  OL.price = (n) => `${OL.num(n)} ${t('currency')}`;
  // product text can come from the admin panel: never inject it as raw HTML
  OL.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = OL.esc;

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
    star: '<svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8L12 2.8Z"/></svg>',
    insta: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6"/></svg>',
    tg: '<svg viewBox="0 0 24 24"><path d="M21 4 3 11.2l5.6 2 2.2 6.3 3.2-3.6 4.8 3.6L21 4Z"/><path d="m8.6 13.2 8.4-5.6"/></svg>',
  };
  OL.ICON = ICON;

  /* ---------- Logo (vector recreation of the AAA mark + arrow swoosh) ---------- */
  const A = (x) => `M${x + 37} 8L${x + 46} 8L${x + 81} 97L${x + 88} 97L${x + 88} 100L${x + 58} 100L${x + 58} 97L${x + 64} 97L${x + 36} 26L${x + 10} 97L${x + 16} 97L${x + 16} 100L${x - 2} 100L${x - 2} 97L${x + 4} 97Z`;
  const SWOOSH = 'M8 99C70 62 150 37 236 25.5L237 29.5C152 43 74 66 8 99Z';
  const HEAD = 'M232 20.5L259 22.5L235.5 35L239.5 27.5Z';
  OL.logoMark = (cls = '', clipId = '') => `
    <svg class="ol-mark ${cls}" viewBox="0 0 262 104" aria-hidden="true" focusable="false">
      ${clipId ? `<defs><clipPath id="${clipId}"><rect class="ol-clip" x="0" y="0" width="262" height="104"/></clipPath></defs>` : ''}
      <g class="ol-as" fill="url(#olGold)">${[6, 80, 154].map((x) => `<path class="ol-a" d="${A(x)}"/>`).join('')}</g>
      <g ${clipId ? `clip-path="url(#${clipId})"` : ''}>
        <path class="ol-gap" d="${SWOOSH}"/>
        <path class="ol-sw" d="${SWOOSH}" fill="url(#olGold)"/>
      </g>
      <path class="ol-head" d="${HEAD}" fill="url(#olGold)"/>
    </svg>`;

  /* ---------- Small text helpers ---------- */
  OL.chars = (str, cls = 'ch') => [...str].map((c) => `<span class="${cls}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  OL.words = (str, cls = 'wd') => str.split(' ').map((w) => `<span class="${cls}">${w}</span>`).join(' ');
  OL.pad = (n) => String(n).padStart(2, '0');

  /* ---------- Shared UI templates ---------- */
  const ui = (OL.ui = {});

  ui.card = (p, o = {}) => {
    const sizes = p.sizes;
    const firstOk = sizes.find((s) => s.ok);
    const off = OL.off(p);
    const wished = state.wish.includes(p.id);
    const img0 = p.images[0], img1 = p.images[1] || p.images[0];
    return `
    <article class="pcard ${o.cls || ''}" data-id="${esc(p.id)}" ${o.tilt === false ? '' : 'data-tilt'}>
      <div class="pcard-media" data-cursor="${t('ui.view')}">
        <img class="pcard-img is-main" src="${OL.pimg(img0, 720, 900)}" alt="${esc(p.brand)} ${esc(p.name)}" loading="lazy" data-fly>
        <img class="pcard-img is-alt" src="${OL.pimg(img1, 720, 900)}" alt="" loading="lazy">
        <span class="pcard-sheen"></span>
        <a class="pcard-link" href="${OL.productUrl(p)}" aria-label="${esc(p.brand)} ${esc(p.name)}" tabindex="-1"></a>
        <div class="pcard-flags">
          ${off ? `<span class="pcard-badge">−${off}%</span>` : ''}
          ${p.tag ? `<span class="pcard-tag">${t('tag.' + p.tag)}</span>` : ''}
        </div>
        <button class="pcard-fav${wished ? ' is-on' : ''}" type="button" aria-pressed="${wished}" aria-label="${t('ui.fav')}">${ICON.heart}</button>
        ${o.index ? `<span class="pcard-index">${OL.pad(o.index)}</span>` : ''}
      </div>
      <div class="pcard-body">
        <div class="pcard-meta"><span class="pcard-brand">${esc(p.brand)}</span><span>${t('cat.' + p.cat)}</span></div>
        <h3 class="pcard-name"><a href="${OL.productUrl(p)}">${esc(p.name)}</a></h3>
        <div class="pcard-price"><span class="pcard-now">${OL.price(p.price)}</span>${p.was > p.price ? `<s class="pcard-was">${OL.price(p.was)}</s>` : ''}</div>
        <div class="pcard-buy">
          <div class="pcard-sizes" role="group" aria-label="Size">
            ${sizes.map((s) => `<button type="button" class="size${s.ok ? '' : ' is-out'}${s === firstOk ? ' is-on' : ''}" data-size="${s.s}" ${s.ok ? '' : 'disabled'}>${s.s}</button>`).join('')}
          </div>
          <button type="button" class="pcard-add" data-add aria-label="${t('ui.add')}">${ICON.plus}<span>${t('ui.add')}</span></button>
        </div>
      </div>
    </article>`;
  };

  ui.marquee = (items, cls = '', copies = 4) => {
    const group = items.map((it) => `<span class="marquee-item">${it}</span><span class="marquee-sep"></span>`).join('');
    return `<div class="marquee ${cls}" aria-hidden="true"><div class="marquee-track">${group.repeat(copies)}</div></div>`;
  };

  ui.countdown = (cls = '') => `
    <div class="countdown ${cls}" data-countdown>
      ${['d', 'h', 'm', 's'].map((k) => `<div class="cd-unit"><span class="cd-num" data-cd="${k}"><span>00</span></span><span class="cd-lbl">${t('cd.' + k)}</span></div>`).join('')}
    </div>`;

  ui.reviews = (cls = '') => `
    <section class="reviews ${cls}">
      <div class="container">
        <div class="reviews-head" data-reveal="up">
          <p class="eyebrow"><span class="eyebrow-line"></span>${t('sec.reviewsEyebrow')}</p>
          <h2 class="reviews-title">${t('sec.reviews')}</h2>
        </div>
        <div class="reviews-grid" data-stagger>
          ${t('reviews').map((r) => `
            <figure class="review">
              <div class="review-stars">${ICON.star.repeat(5)}</div>
              <blockquote class="review-text">“${r.t}”</blockquote>
              <figcaption class="review-who"><span class="review-avatar">${r.n[0]}</span><span><b>${r.n}</b>${r.c}</span></figcaption>
            </figure>`).join('')}
        </div>
      </div>
    </section>`;

  ui.news = (cls = '') => `
    <section class="news ${cls}">
      <div class="container">
        <div class="news-box" data-reveal="up">
          <div class="news-mark">${OL.logoMark()}</div>
          <div>
            <h2 class="news-title">${t('news.title')}</h2>
            <p class="news-text">${t('news.text')}</p>
          </div>
          <form class="news-form" data-news novalidate>
            <input type="email" required placeholder="${t('news.ph')}" aria-label="${t('news.ph')}">
            <button class="btn btn-gold magnetic" type="submit">${t('news.btn')}</button>
            <span class="news-ok">${t('news.ok')}</span>
          </form>
        </div>
      </div>
    </section>`;

  /* ---------- Motion utilities ---------- */
  OL.countUp = (el, from, to, opts = {}) => {
    const fmt = opts.fmt || ((v) => Math.round(v));
    if (!OL.anim) { el.textContent = fmt(to); return null; }
    const o = { v: from };
    el.textContent = fmt(from);
    return gsap.to(o, { v: to, duration: opts.duration || 1.6, ease: opts.ease || 'power3.out', delay: opts.delay || 0, onUpdate: () => (el.textContent = fmt(o.v)) });
  };

  // Draw an SVG path and carry an arrowhead along it (the logo's swoosh motif)
  OL.follow = (path, head) => {
    const L = path.getTotalLength();
    path.style.strokeDasharray = L;
    path.style.strokeDashoffset = L;
    return (p) => {
      p = Math.max(0, Math.min(1, p));
      path.style.strokeDashoffset = L * (1 - p);
      if (!head) return;
      const a = path.getPointAtLength(L * p);
      const b = path.getPointAtLength(Math.max(0, L * p - 3));
      const ang = (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI;
      head.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${p === 0 ? 0 : ang})`);
      head.style.opacity = p > 0.01 ? 1 : 0;
    };
  };
  OL.ARROW_HEAD = '<path d="M11 0L-7 -7.5L-2.5 0L-7 7.5Z"/>';

  // Generic scroll reveals driven by data attributes
  OL.reveal = (root) => {
    if (!OL.anim) return;
    const st = (el, start = 'top 88%') => ({ trigger: el, start, once: true });
    $$('[data-reveal="up"]', root).forEach((el) =>
      gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: st(el) }));
    $$('[data-reveal="fade"]', root).forEach((el) =>
      gsap.from(el, { autoAlpha: 0, duration: 1.4, ease: 'power2.out', scrollTrigger: st(el) }));
    $$('[data-reveal="lines"]', root).forEach((el) =>
      gsap.from($$('.line-in', el), { yPercent: 115, rotate: 3, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: st(el) }));
    $$('[data-reveal="clip"]', root).forEach((el) => {
      const tl = gsap.timeline({ scrollTrigger: st(el, 'top 85%') });
      tl.from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
      const img = el.querySelector('img');
      if (img) tl.from(img, { scale: 1.35, duration: 1.8, ease: 'expo.out' }, 0.1);
    });
    $$('[data-stagger]', root).forEach((el) =>
      gsap.from(el.children, { y: 70, autoAlpha: 0, duration: 1.1, stagger: .1, ease: 'expo.out', scrollTrigger: st(el, 'top 86%') }));
  };

  // Infinite marquee with optional velocity boost
  OL.runMarquee = (el, { speed = 50, dir = 1 } = {}) => {
    if (!el || !hasGsap) return null;
    const track = el.querySelector('.marquee-track');
    let half = track.scrollWidth / 2;
    let x = dir > 0 ? 0 : -half;
    let boost = 0, skew = 0, skewT = 0;
    const measure = () => { half = track.scrollWidth / 2; };
    const tick = (time, dt) => {
      const v = (speed + boost) * (OL.reduced ? 0 : 1);
      x -= v * dir * (dt / 1000);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      skew += (skewT - skew) * .12;
      skewT *= .9;
      track.style.transform = `translate3d(${x}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      boost *= 0.93;
    };
    gsap.ticker.add(tick);
    addEventListener('resize', measure);
    OL.onCleanup(() => { gsap.ticker.remove(tick); removeEventListener('resize', measure); });
    return { boost: (v) => { boost = v; }, skew: (v) => { skewT = v; }, measure };
  };

  // Countdown: the deadline set in the admin panel, else the end of the week
  const dealEnd = () => {
    const cfg = OL.SETTINGS && OL.SETTINGS.home && OL.SETTINGS.home.deal_ends;
    const at = cfg ? Date.parse(cfg) : NaN;
    return at > Date.now() ? at : endOfWeek();
  };
  const endOfWeek = () => {
    const d = new Date();
    const add = (7 - d.getDay()) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add, 23, 59, 59).getTime();
  };
  const flip = (box, str) => {
    const old = box.firstElementChild;
    if (old && old.textContent === str) return;
    if (!OL.anim || !old) { box.innerHTML = `<span>${str}</span>`; return; }
    const nw = document.createElement('span');
    nw.textContent = str;
    box.appendChild(nw);
    gsap.fromTo(nw, { yPercent: 100 }, { yPercent: 0, duration: .55, ease: 'power3.out' });
    gsap.to(old, { yPercent: -100, duration: .55, ease: 'power3.out', onComplete: () => old.remove() });
  };
  OL.runCountdown = (root) => {
    $$('[data-countdown]', root).forEach((el) => {
      const end = dealEnd();
      const boxes = Object.fromEntries($$('[data-cd]', el).map((b) => [b.dataset.cd, b]));
      const tick = () => {
        const diff = Math.max(0, end - Date.now());
        const v = { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 };
        Object.keys(v).forEach((k) => boxes[k] && flip(boxes[k], OL.pad(v[k])));
      };
      tick();
      const id = setInterval(tick, 1000);
      OL.onCleanup(() => clearInterval(id));
    });
  };


  /* ---------- Toast ---------- */
  let toastTimer;
  OL.toast = (msg) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
  };

  /* ---------- Curtain transition ---------- */
  const BG = { dark: '#0A0A0A', light: '#F6F2EA' };
  OL.bgFor = (theme) => BG[theme];

  OL.curtain = ({ bg, ink, label = '' }, onCover, onReveal) => new Promise((resolve) => {
    const c = $('#curtain');
    const panel = $('.curtain-panel', c);
    if (!OL.anim) { onCover && onCover(); onReveal && onReveal(); resolve(); return; }
    c.style.setProperty('--curtain-bg', bg);
    c.style.setProperty('--curtain-ink', ink || '#D4B078');
    $('.curtain-mark', c).innerHTML = OL.logoMark();
    $('.curtain-label', c).textContent = label;
    c.classList.add('is-active');
    OL.lenis && OL.lenis.stop();
    const inner = $$('.curtain-content > *', c);
    gsap.timeline({ onComplete: () => { c.classList.remove('is-active'); OL.lenis && OL.lenis.start(); resolve(); } })
      .set(panel, { skewX: -12 })
      .fromTo(panel, { xPercent: -110 }, { xPercent: 0, duration: .7, ease: 'power3.inOut' })
      .fromTo(inner, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .07, duration: .45, ease: 'power3.out' }, '-=.25')
      .add(() => onCover && onCover())
      .to(inner, { y: -24, autoAlpha: 0, stagger: .05, duration: .35, ease: 'power2.in' }, '+=.35')
      .add(() => onReveal && onReveal(), '-=.05')
      .to(panel, { xPercent: 110, duration: .8, ease: 'power3.inOut' }, '-=.1');
  });

  /* ---------- Theme ---------- */
  const applyTheme = (theme) => {
    html.dataset.theme = theme;
    state.theme = theme;
    store.set('theme', theme);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = OL.bgFor(theme);
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  };
  OL.toggleTheme = () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (!OL.anim) { applyTheme(next); OL.toast(t('toast.' + next)); return; }
    OL.curtain({ bg: OL.bgFor(next), ink: next === 'dark' ? '#D4B078' : '#86622A', label: t('toast.' + next) }, () => applyTheme(next));
  };

  /* ---------- Language ---------- */
  const applyI18n = () => {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    $$('[data-lang]').forEach((b) => b.classList.toggle('is-on', b.dataset.lang === state.lang));
    placePills();
  };
  OL.setLang = (lang) => {
    if (lang === state.lang) return;
    state.lang = lang;
    store.set('lang', lang);
    html.lang = lang;
    applyI18n();
    renderFooter();
    renderCart();
    renderWish();
    searchIndex = null;
    renderSearch();
    buildMega();
    OL.refreshRoute();
  };

  /* ---------- Language pill (header + mobile menu) ---------- */
  function placePills() {
    $$('.lang-switch').forEach((sw) => {
      const on = $('button.is-on', sw);
      const pill = $('.lang-pill', sw);
      if (on && pill) pill.style.transform = `translateX(${on.offsetLeft - 3}px)`;
    });
  }
  OL.placePills = placePills;

  /* ---------- Page mount (render + animations) ---------- */
  OL.ctx = null;
  OL.mount = (opts = {}) => {
    const C = OL.pages[opts.page] || OL.pages.notfound;
    const ctx = opts.ctx || {};
    OL.cleanup();
    if (OL.ctx) { OL.ctx.revert(); OL.ctx = null; }
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.getAll().forEach((s) => s.kill());

    const app = $('#app');
    OL.mounted = true;
    app.innerHTML = C.render(ctx);
    const y = opts.keepScroll || 0;
    if (OL.lenis) OL.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);

    // bind() = behaviour (always); init() = animation (only when motion is allowed)
    let api = (C.bind && C.bind(app, ctx)) || {};
    if (OL.anim) {
      OL.ctx = gsap.context(() => {
        if (C.init) Object.assign(api, C.init(app, ctx) || {});
        OL.reveal(app);
      }, app);
    } else if (C.initStatic) {
      C.initStatic(app, ctx);
    }
    OL.runCountdown(app);
    placePills();
    if (hasGsap && window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
    return api;
  };


  /* ---------- Cart ---------- */
  const saveCart = () => store.set('cart', state.cart);
  function renderCart() {
    const items = state.cart;
    const count = items.reduce((s, i) => s + i.qty, 0);
    const badge = $('#cartCount');
    badge.textContent = count;
    badge.classList.toggle('has-items', count > 0);

    if (!items.length) {
      $('#cartItems').innerHTML = `<div class="cart-empty">${OL.logoMark()}<h3>${t('cart.empty')}</h3><p>${t('cart.emptyText')}</p></div>`;
      $('#cartFoot').innerHTML = '';
      return;
    }
    $('#cartItems').innerHTML = items.map((i, k) => {
      const p = OL.P[i.id];
      return `<div class="cart-item" data-key="${k}">
        <img src="${OL.pimg(p.images[0], 200, 230)}" alt="">
        <div><h4>${esc(p.name)}</h4><small>${esc(p.brand)} · ${t('cart.size')} ${i.size}</small><div class="ci-price">${OL.price(p.price * i.qty)}</div></div>
        <div class="ci-side">
          <div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><span>${i.qty}</span><button type="button" data-qty="1" aria-label="+">+</button></div>
          <button type="button" class="ci-remove" data-remove>${t('cart.remove')}</button>
        </div>
      </div>`;
    }).join('');
    const sub = items.reduce((s, i) => s + OL.P[i.id].price * i.qty, 0);
    const save = items.reduce((s, i) => s + Math.max(0, OL.P[i.id].was - OL.P[i.id].price) * i.qty, 0);
    const thr = (OL.SETTINGS && OL.SETTINGS.delivery && OL.SETTINGS.delivery.free_threshold) || 0;
    const prog = OL.orderLogic.freeProgress(sub, thr);
    $('#cartFoot').innerHTML = `
      ${prog.enabled ? `<div class="free-bar${prog.free ? ' is-free' : ''}"><p>${prog.free ? t('cp.freeDone') : t('cp.freeFrom', { n: OL.price(prog.left) })}</p><div><i style="width:${prog.pct}%"></i></div></div>` : ''}
      <div class="cf-row"><span>${t('cart.subtotal')}</span><b>${OL.price(sub)}</b></div>
      <div class="cf-row cf-save"><span>${t('cart.save')}</span><span>${OL.price(save)}</span></div>
      <p class="cf-note">${t('cart.note')}</p>
      <a class="btn btn-gold" href="/checkout"><span>${t('cart.checkout')}</span>${ICON.arrow}</a>
      <a class="cf-view" href="/cart">${t('cp.viewCart')}</a>`;
  }
  OL.renderCart = renderCart;
  OL.saveCart = saveCart;

  /* ---------- Drawers (cart / wishlist) + scroll lock ---------- */
  const lockScroll = () => {
    const locked = ['cart-open', 'wish-open', 'search-open', 'menu-open', 'filters-open', 'modal-open'].some((c) => html.classList.contains(c));
    if (OL.lenis) locked ? OL.lenis.stop() : OL.lenis.start();
  };
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

  /* ---------- Mega-menu (desktop: Men / Women / Kids) ---------- */
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
    box.innerHTML = ['men', 'women', 'kids'].map((g) => {
      const list = OL.catalog.base(OL.PRODUCTS, g);
      if (!list.length) return '';
      const cats = ['running', 'lifestyle', 'basketball']
        .map((c) => [c, list.filter((p) => p.cat === c).length]).filter((x) => x[1] > 0);
      const brands = [...list.reduce((m, p) => m.set(p.brand, (m.get(p.brand) || 0) + 1), new Map())]
        .sort((x, y) => y[1] - x[1]).slice(0, 6);
      const feat = list.find((p) => p.featured) || list[0];
      return `<div class="mega-panel" data-mega-panel="${g}">
        <div class="mega-cols container">
          <div class="mega-col">
            <h4>${t('mega.cats')}</h4>
            ${cats.map(([c, n]) => `<a href="/shop?gender=${g}&cat=${c}">${t('cat.' + c)}<small>${n}</small></a>`).join('')}
            <a class="mega-all" href="/${g}">${t('mega.all')} ${ICON.arrow}</a>
          </div>
          <div class="mega-col">
            <h4>${t('mega.brands')}</h4>
            ${brands.map(([b, n]) => `<a href="/shop?gender=${g}&brand=${OL.slug(b)}">${esc(b)}<small>${n}</small></a>`).join('')}
          </div>
          <a class="mega-feature" href="${OL.productUrl(feat)}">
            <img src="${OL.pimg(feat.images[0], 360, 420)}" alt="" loading="lazy">
            <span><small>${t('mega.featured')}</small><b>${esc(feat.name)}</b><em>${OL.price(feat.price)}</em></span>
          </a>
        </div>
      </div>`;
    }).join('');
  }
  OL.buildMega = buildMega;

  /* ---------- Wishlist ---------- */
  const saveWish = () => store.set('wish', state.wish);
  function renderWish() {
    const ids = state.wish.filter((id) => OL.P[id]);
    const badge = $('#wishCount');
    badge.textContent = ids.length;
    badge.classList.toggle('has-items', ids.length > 0);
    $('#wishItems').innerHTML = ids.length
      ? ids.map((id) => {
        const p = OL.P[id];
        const inStock = p.sizes.some((z) => z.ok);
        return `<div class="wish-item" data-id="${esc(p.id)}">
          <img data-fly src="${OL.pimg(p.images[0], 200, 230)}" alt="">
          <div><h4>${esc(p.name)}</h4><small>${esc(p.brand)}</small><div class="ci-price">${OL.price(p.price)}</div></div>
          <div class="ci-side">
            ${inStock
    ? `<button type="button" class="pcard-add" data-add>${ICON.plus}<span>${t('ui.add')}</span></button>`
    : `<span class="wish-sold">${t('ui.soldOut')}</span>`}
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
      const f = $('.pcard-fav', c);
      if (!f) return;
      f.classList.toggle('is-on', on);
      f.setAttribute('aria-pressed', String(on));
    });
    renderWish();
    if (hasGsap && on) gsap.fromTo('.wish-btn', { scale: 1 }, { scale: 1.2, duration: .18, yoyo: true, repeat: 1, ease: 'power2.out' });
    return on;
  };

  /* ---------- Search ---------- */
  // brand spellings people actually type (Cyrillic, Latin variants)
  const ALIASES = {
    nike: ['найк', 'найки', 'nayk'],
    jordan: ['джордан', 'джорданы', 'jordan', 'air jordan', 'aj'],
    adidas: ['адидас', 'adidas', 'addidas'],
    'new balance': ['нью баланс', 'ню баланс', 'нью беланс', 'nb', 'nyu balans'],
    converse: ['конверс', 'конверсы', 'converse', 'all star', 'олл стар'],
    vans: ['ванс', 'вансы', 'vans'],
    puma: ['пума', 'puma'],
    asics: ['асикс', 'asics'],
    reebok: ['рибок', 'reebok'],
    saucony: ['саукони', 'saucony'],
  };
  // words that describe every product — they don't narrow the search
  const GENERIC = ['кроссовки', 'кроссовок', 'кросовки', 'кеды', 'обувь', 'krossovka', 'krossovki', 'sneakers', 'shoes', 'sneaker'];
  const norm = (str) => String(str || '').toLowerCase().replace(/ё/g, 'е')
    .replace(/[ʻʼ’‘'`´]/g, '').replace(/[^a-z0-9\u0400-\u04ff]+/g, ' ').trim();

  let searchIndex = null;
  const buildIndex = () => {
    searchIndex = OL.PRODUCTS.map((p) => {
      const brand = norm(p.brand);
      const catNames = ['ru', 'uz', 'en'].map((l) => lookup(l, 'cat.' + p.cat) || '').join(' ');
      const hay = norm([p.brand, p.name, p.colorway, (p.tags || []).join(' '), p.cat, catNames, p.gender,
        (ALIASES[brand] || []).join(' ')].join(' '));
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
          if (e.brand.startsWith(w) || (ALIASES[e.brand] || []).some((a) => a.startsWith(w))) score += 3;
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

  const RESULTS_SHOWN = 8;
  function renderSearch() {
    const body = $('#searchBody');
    if (!body) return;
    const input = $('#searchInput');
    const q = input.value;
    const found = runSearch(q);
    const recent = store.get('recent', []);
    const chip = (text) => `<button type="button" class="s-chip" data-q="${esc(text)}">${esc(text)}</button>`;

    if (found === null) {
      body.innerHTML = `
        ${recent.length ? `<div class="s-group"><div class="s-head"><span>${t('search.recent')}</span><button type="button" class="s-clear" data-clear-recent>${t('search.clear')}</button></div><div class="s-chips">${recent.map(chip).join('')}</div></div>` : ''}
        <div class="s-group"><div class="s-head"><span>${t('search.popular')}</span></div><div class="s-chips">${OL.BRANDS.slice(0, 6).map(chip).join('')}</div></div>`;
      return;
    }
    if (!found.length) {
      body.innerHTML = `<div class="s-empty"><h3>${t('search.none')}</h3><p>${t('search.noneText')}</p>
        <div class="s-chips">${OL.BRANDS.slice(0, 4).map(chip).join('')}</div></div>`;
      return;
    }
    const shown = found.slice(0, RESULTS_SHOWN);
    body.innerHTML = `
      <div class="s-head"><span>${found.length} ${t('search.results')}</span></div>
      ${shown.map((p) => {
    const firstOk = p.sizes.find((z) => z.ok);
    return `<article class="sr" data-id="${esc(p.id)}">
          <a href="${OL.productUrl(p)}" tabindex="-1"><img class="sr-img" data-fly src="${OL.pimg(p.images[0], 160, 200)}" alt="" loading="lazy"></a>
          <div class="sr-info">
            <small>${esc(p.brand)}</small>
            <b><a href="${OL.productUrl(p)}">${esc(p.name)}</a></b>
            <span>${OL.price(p.price)}${p.was > p.price ? ` <s>${OL.price(p.was)}</s>` : ''}</span>
          </div>
          <div class="sr-buy">
            ${firstOk ? `<div class="pcard-sizes">${p.sizes.map((z) => `<button type="button" class="size${z.ok ? '' : ' is-out'}${z === firstOk ? ' is-on' : ''}" data-size="${z.s}" ${z.ok ? '' : 'disabled'}>${z.s}</button>`).join('')}</div>
            <button type="button" class="pcard-add" data-add data-remember>${ICON.plus}<span>${t('ui.add')}</span></button>`
    : `<span class="wish-sold">${t('ui.soldOut')}</span>`}
          </div>
        </article>`;
  }).join('')}
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

  function flyToCart(img) {
    const btn = $('.cart-btn');
    if (!OL.anim || !img) { bumpCart(); return; }
    const r = img.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const size = Math.min(r.width, 150);
    const clone = document.createElement('img');
    clone.src = img.currentSrc || img.src;
    clone.className = 'fly-thumb';
    clone.style.width = size + 'px';
    clone.style.height = size * 1.2 + 'px';
    document.body.appendChild(clone);

    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
    const cx = sx + (ex - sx) * .25, cy = Math.min(sy, ey) - Math.max(160, Math.abs(ex - sx) * .35);
    const pt = (p) => { const q = 1 - p; return [q * q * sx + 2 * q * p * cx + p * p * ex, q * q * sy + 2 * q * p * cy + p * p * ey]; };

    // draw the logo's arrow trail behind the flying shoe
    let trail = null, len = 0;
    {
      trail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      trail.setAttribute('class', 'fly-trail');
      trail.innerHTML = `<path d="M${sx} ${sy}Q${cx} ${cy} ${ex} ${ey}"/>`;
      document.body.appendChild(trail);
      const path = trail.firstChild;
      len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
    }

    const o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: 1.05, ease: 'power2.inOut',
      onUpdate() {
        const [x, y] = pt(o.p);
        gsap.set(clone, { x: x - size / 2, y: y - size * .6, scale: 1 - .82 * o.p, rotate: -28 * o.p, autoAlpha: o.p > .9 ? (1 - o.p) * 10 : 1 });
        if (trail) trail.firstChild.style.strokeDashoffset = len * (1 - o.p);
      },
      onComplete() {
        clone.remove();
        if (trail) gsap.to(trail, { autoAlpha: 0, duration: .4, onComplete: () => trail.remove() });
        bumpCart();
      },
    });
  }
  function bumpCart() {
    renderCart();
    if (!hasGsap) return;
    gsap.fromTo('.cart-btn', { scale: 1 }, { scale: 1.2, duration: .18, yoyo: true, repeat: 1, ease: 'power2.out' });
    gsap.fromTo('#cartCount', { scale: .4 }, { scale: 1, duration: .6, ease: 'elastic.out(1, .4)', clearProps: 'transform' });
  }
  OL.addToCart = (id, size, img, btn) => {
    const ex = state.cart.find((i) => i.id === id && i.size === size);
    if (ex) ex.qty += 1; else state.cart.push({ id, size, qty: 1 });
    saveCart();
    flyToCart(img);
    OL.toast(`${t('cart.added')} · ${OL.P[id].name} · ${size}`);
    if (btn) {
      btn.classList.add('is-done');
      const label = btn.querySelector('span');
      if (label) label.textContent = t('ui.added');
      setTimeout(() => { btn.classList.remove('is-done'); if (label) label.textContent = t('ui.add'); }, 1600);
    }
  };

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
      if (!OL.mounted) OL.setCatalog(data.products, data.settings || {}, 'live');
    } catch (e) {
      if (!OL.CONFIG.staticFallback && !OL.mounted) OL.setCatalog([], {}, 'unavailable');
      // otherwise keep the built-in placeholder catalog
    }
    // forget saved items that no longer exist
    state.cart = state.cart.filter((i) => OL.P[i.id]);
    state.wish = state.wish.filter((id) => OL.P[id]);
    saveCart();
    saveWish();
    searchIndex = null;
    return OL.source;
  };

  /* ---------- Footer ---------- */
  function renderFooter() {
    $('#footer').innerHTML = `
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">${OL.logoMark()}<p class="footer-word">OUTLET LOUNGE</p><p class="footer-tag">${t('footer.tagline')}</p></div>
          <div class="footer-col"><h4>${t('footer.shop')}</h4><a href="/new">${t('nav.new')}</a><a href="/men">${t('nav.men')}</a><a href="/women">${t('nav.women')}</a><a href="/kids">${t('nav.kids')}</a><a href="/sale">${t('nav.deals')}</a></div>
          <div class="footer-col"><h4>${t('footer.help')}</h4><a href="#">${t('footer.delivery')}</a><a href="#">${t('footer.returns')}</a><a href="#">${t('footer.sizes')}</a><a href="#">${t('footer.contact')}</a></div>
          <div class="footer-col"><h4>${t('footer.about')}</h4><a href="#">${t('footer.story')}</a><a href="#">${t('footer.auth')}</a><a href="#">${t('footer.stores')}</a></div>
        </div>
        <div class="footer-big gold-text" aria-hidden="true">OUTLET LOUNGE</div>
        <div class="footer-bottom">
          <span>© 2026 Outlet Lounge. ${t('footer.rights')}</span>
          <span>${t('footer.currency')} · ${t('footer.photos')}</span>
          <div class="footer-social"><a href="#" aria-label="Instagram">${ICON.insta}</a><a href="#" aria-label="Telegram">${ICON.tg}</a></div>
        </div>
      </div>`;
  }

  /* ---------- Loader (logo draws itself) ---------- */
  OL.runLoader = () => new Promise((resolve) => {
    const L = $('#loader');
    let seen = false;
    try { seen = sessionStorage.getItem('ol:seen') === '1'; sessionStorage.setItem('ol:seen', '1'); } catch (e) { /* private mode */ }
    if (!OL.anim || seen) { L.remove(); resolve(); return; }
    $('#loaderMark').innerHTML = OL.logoMark('is-loader', 'olLoaderClip');
    const svg = $('#loaderMark svg');
    const as = $$('.ol-a', svg);
    as.forEach((p) => {
      const l = p.getTotalLength();
      Object.assign(p.style, { stroke: 'url(#olGold)', strokeWidth: 1, strokeDasharray: l, strokeDashoffset: l, fillOpacity: 0 });
    });
    let done = false;
    const finish = () => { if (done) return; done = true; resolve(); };
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    tl.to(as, { strokeDashoffset: 0, duration: 1.1, stagger: .14 })
      .to(as, { fillOpacity: 1, duration: .6, stagger: .08, ease: 'power2.out' }, '-=.45')
      .fromTo($('.ol-clip', svg), { attr: { width: 0 } }, { attr: { width: 262 }, duration: .85, ease: 'power2.inOut' }, '-=.4')
      .from($('.ol-head', svg), { x: -26, y: 6, autoAlpha: 0, duration: .5, ease: 'back.out(2)' }, '-=.2')
      .from('.loader-word span', { letterSpacing: '1.2em', autoAlpha: 0, duration: 1, ease: 'expo.out' }, '-=.8')
      .to('.loader-bar i', { scaleX: 1, duration: tl.duration() + .2, ease: 'none' }, 0)
      .to('.loader-inner', { y: -30, autoAlpha: 0, duration: .5, ease: 'power2.in' }, '+=.2')
      .add(finish, '-=.1')
      .to(L, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=.1')
      .add(() => L.remove());
    L.addEventListener('click', () => { tl.progress(1); finish(); }, { once: true });
  });

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (OL.touch || !OL.anim) return;
    html.classList.add('has-cursor');
    const cur = $('.cursor');
    const dot = $('.cursor-dot', cur), ring = $('.cursor-ring', cur), label = $('.cursor-label', cur);
    const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
    const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const hover = e.target.closest('a, button, input, [data-cursor], .size');
      const lbl = e.target.closest('[data-cursor]');
      const inner = lbl && e.target.closest('button, a');
      cur.classList.toggle('is-hover', !!hover);
      cur.classList.toggle('is-label', !!lbl && !inner);
      if (lbl) label.textContent = lbl.dataset.cursor;
    });
    document.addEventListener('pointerleave', () => cur.style.opacity = 0);
    document.addEventListener('pointerenter', () => cur.style.opacity = 1);
  }

  /* ---------- Magnetic buttons + 3D tilt cards (delegated) ---------- */
  function initPointerFx() {
    if (OL.touch || !OL.anim) return;
    let mag = null, tilt = null;
    const resetMag = () => { if (mag) gsap.to(mag, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .35)' }); mag = null; };
    const resetTilt = () => { if (tilt) gsap.to(tilt, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' }); tilt = null; };
    document.addEventListener('pointermove', (e) => {
      const m = e.target.closest('.magnetic');
      if (m !== mag) resetMag();
      if (m) {
        mag = m;
        const r = m.getBoundingClientRect();
        gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .5, ease: 'power3.out' });
      }
      const card = e.target.closest('[data-tilt]');
      const media = card && card.querySelector('.pcard-media');
      if (media !== tilt) resetTilt();
      if (media) {
        tilt = media;
        const r = media.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        gsap.to(media, { rotateY: px * 9, rotateX: -py * 9, transformPerspective: 900, duration: .6, ease: 'power3.out' });
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { resetMag(); resetTilt(); });
  }

  /* ---------- Header behaviour ---------- */
  function initHeader() {
    const header = $('#header');
    let last = 0;
    const onScroll = () => {
      const y = scrollY;
      header.classList.toggle('is-scrolled', y > 30);
      const hide = y > last && y > 320 && !html.classList.contains('menu-open');
      header.classList.toggle('is-hidden', hide);
      last = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Smooth scroll ---------- */
  function initLenis() {
    if (!OL.anim || !window.Lenis || OL.touch) return;
    OL.lenis = new Lenis({ lerp: .09, smoothWheel: true });
    OL.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => OL.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  OL.scrollTo = (target) => {
    const el = typeof target === 'string' ? (target === '#top' ? 0 : $(target)) : target;
    if (el == null) return;
    const off = -(parseInt(getComputedStyle(html).getPropertyValue('--header-h')) || 70) + 1;
    if (OL.lenis) OL.lenis.scrollTo(el, { offset: el === 0 ? 0 : off, duration: 1.6 });
    else window.scrollTo({ top: el === 0 ? 0 : el.getBoundingClientRect().top + scrollY + off, behavior: OL.reduced ? 'auto' : 'smooth' });
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
          html.classList.remove('menu-open');
          lockScroll();
          if (OL.navigate) OL.navigate(href);
          return;
        }
        if (href.startsWith('#')) {
          e.preventDefault();
          html.classList.remove('menu-open');
          lockScroll();
          const route = OL.route && OL.route();
          if (href.length > 1 && route && route.name === 'home') OL.scrollTo(href);
          return;
        }
      }
      const sizeBtn = e.target.closest('[data-size]');
      if (sizeBtn && !sizeBtn.disabled) {
        $$('[data-size]', sizeBtn.parentElement).forEach((b) => b.classList.toggle('is-on', b === sizeBtn));
        if (hasGsap) gsap.fromTo(sizeBtn, { scale: .82 }, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' });
        return;
      }
      const add = e.target.closest('[data-add]');
      if (add) {
        const card = add.closest('[data-id]');
        const on = $('[data-size].is-on', card) || $('[data-size]:not([disabled])', card);
        const fallback = (OL.P[card.dataset.id].sizes.find((z) => z.ok) || {}).s;
        if (add.hasAttribute('data-remember')) remember($('#searchInput').value);
        OL.addToCart(card.dataset.id, on ? Number(on.dataset.size) : fallback, $('[data-fly]', card), add);
        return;
      }
      const fav = e.target.closest('.pcard-fav');
      if (fav) {
        const on = OL.toggleWish(fav.closest('[data-id]').dataset.id);
        if (hasGsap && on) gsap.fromTo(fav, { scale: .6 }, { scale: 1, duration: .7, ease: 'elastic.out(1, .35)' });
        return;
      }
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
          state.cart[k].qty += Number(q.dataset.qty);
          if (state.cart[k].qty < 1) state.cart.splice(k, 1);
        } else if (e.target.closest('[data-remove]')) {
          state.cart.splice(k, 1);
        } else return;
        saveCart();
        renderCart();
      }
    });

    // mega-menu: hover / keyboard focus on the nav, closes when the pointer leaves the header
    const header = $('#header');
    $$('.main-nav a').forEach((a) => {
      const key = a.dataset.mega;
      a.addEventListener('mouseenter', () => (key ? openMega(key) : closeMega()));
      a.addEventListener('focus', () => (key ? openMega(key) : closeMega()));
    });
    header.addEventListener('mouseleave', () => { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 160); });
    header.addEventListener('mouseenter', () => clearTimeout(megaTimer));
    addEventListener('scroll', () => { if (html.classList.contains('mega-open')) closeMega(); }, { passive: true });

    const sInput = $('#searchInput');
    let st;
    sInput.addEventListener('input', () => { clearTimeout(st); st = setTimeout(renderSearch, 70); });

    document.addEventListener('submit', (e) => {
      if (e.target.closest('.search-bar')) return e.preventDefault();
      const form = e.target.closest('[data-news]');
      if (!form) return;
      e.preventDefault();
      const input = $('input', form);
      if (!/^\S+@\S+\.\S+$/.test(input.value)) {
        if (hasGsap) gsap.fromTo(form, { x: -10 }, { x: 0, duration: .6, ease: 'elastic.out(1, .3)' });
        input.focus();
        return;
      }
      form.classList.add('is-done');
    });

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
        if (value) { closeAll(); OL.navigate('/shop?q=' + encodeURIComponent(value)); }
      }
    });

    // keep scroll measurements honest while images stream in
    let rt;
    $('#app').addEventListener('load', () => {
      clearTimeout(rt);
      rt = setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 200);
    }, true);

    // graceful fallback if a placeholder photo fails to load
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (img.tagName !== 'IMG' || img.dataset.fallback) return;
      img.dataset.fallback = '1';
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#1A1714"/><path d="M80 330c60-4 110-30 150-70l40 20c20 10 50 14 70 14v36H80z" fill="none" stroke="#D4B078" stroke-width="3"/></svg>');
    }, true);

    addEventListener('resize', placePills);
    if (document.fonts) document.fonts.ready.then(() => { placePills(); window.ScrollTrigger && ScrollTrigger.refresh(); });
  }

  /* ---------- Shell boot ---------- */
  OL.initShell = () => {
    $('#brandMark').innerHTML = OL.logoMark();
    $('#cart').setAttribute('data-lenis-prevent', '');
    $('#wish').setAttribute('data-lenis-prevent', '');
    $('#search').setAttribute('data-lenis-prevent', '');
    applyI18n();
    renderFooter();
    renderCart();
    renderWish();
    buildMega();
    initLenis();
    initHeader();
    initCursor();
    initPointerFx();
    initEvents();
  };
})();
