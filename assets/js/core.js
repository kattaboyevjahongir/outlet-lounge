/* Outlet Lounge — core: helpers, logo, shell (header, theme, language, cart, dock), motion utilities */
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
    concept: html.dataset.concept,
    cart: store.get('cart', []).filter((i) => OL.P[i.id]),
  };
  const state = OL.state;

  /* ---------- i18n + formatting ---------- */
  const lookup = (lang, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), OL.I18N[lang]);
  OL.t = (key) => { const v = lookup(state.lang, key); return v == null ? (lookup('en', key) ?? key) : v; };
  const t = OL.t;
  OL.num = (n) => Math.round(n).toLocaleString('ru-RU');
  OL.price = (n) => `${OL.num(n)} ${t('currency')}`;

  /* ---------- cleanup registry (per concept mount) ---------- */
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
    return `
    <article class="pcard ${o.cls || ''}" data-id="${p.id}" ${o.tilt === false ? '' : 'data-tilt'}>
      <div class="pcard-media" data-cursor="${t('ui.view')}">
        <img class="pcard-img is-main" src="${OL.img(p.img, 720, 900)}" alt="${p.brand} ${p.name}" loading="lazy" data-fly>
        <img class="pcard-img is-alt" src="${OL.img(p.alt, 720, 900)}" alt="" loading="lazy">
        <span class="pcard-sheen"></span>
        <div class="pcard-flags">
          <span class="pcard-badge">−${OL.off(p)}%</span>
          ${p.tag ? `<span class="pcard-tag">${t('tag.' + p.tag)}</span>` : ''}
        </div>
        <button class="pcard-fav" type="button" aria-label="${t('ui.fav')}">${ICON.heart}</button>
        ${o.index ? `<span class="pcard-index">${OL.pad(o.index)}</span>` : ''}
      </div>
      <div class="pcard-body">
        <div class="pcard-meta"><span class="pcard-brand">${p.brand}</span><span>${t('cat.' + p.cat)}</span></div>
        <h3 class="pcard-name">${p.name}</h3>
        <div class="pcard-price"><span class="pcard-now">${OL.price(p.price)}</span><s class="pcard-was">${OL.price(p.was)}</s></div>
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

  // Countdown to the end of the current week (Sunday 23:59:59)
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
      const end = endOfWeek();
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

  // Particle field of soft gold dust (used by Gilded + Vault)
  OL.dust = (canvas, { count = 70, rise = 0.25 } = {}) => {
    if (!canvas || OL.reduced) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const parts = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4,
      s: Math.random() * rise + .08, a: Math.random() * Math.PI * 2, tw: Math.random() * .03 + .01,
    }));
    let scaled = false;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ow = w, oh = h;
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // particles start as 0–1 fractions; map them to pixels on first real size, then rescale
      parts.forEach((p) => {
        if (!scaled) { p.x *= w; p.y *= h; } else { p.x *= w / ow; p.y *= h / oh; }
      });
      scaled = true;
    };
    resize();
    const color = () => getComputedStyle(html).getPropertyValue('--gold-1').trim() || '#F4E2B8';
    let c = color();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!scaled) resize();
      if (!visible || !scaled) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = c;
      for (const p of parts) {
        p.y -= p.s; p.a += p.tw; p.x += Math.sin(p.a) * .25;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        ctx.globalAlpha = (Math.sin(p.a * 2) + 1) / 2 * .7 + .1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    loop();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const mo = new MutationObserver(() => { c = color(); });
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('resize', resize);
    OL.onCleanup(() => { cancelAnimationFrame(raf); io.disconnect(); mo.disconnect(); removeEventListener('resize', resize); });
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
  const BG = { dark: '#0B0A09', light: '#F7F2E9' };
  const BG_CONCEPT = { vault: { dark: '#060504', light: '#F3EEE5' }, flight: { dark: '#0A0A0A', light: '#F6F2EA' } };
  OL.bgFor = (theme, concept) => (BG_CONCEPT[concept] && BG_CONCEPT[concept][theme]) || BG[theme];

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
    if (meta) meta.content = OL.bgFor(theme, state.concept);
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  };
  OL.toggleTheme = () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (!OL.anim) { applyTheme(next); OL.toast(t('toast.' + next)); return; }
    OL.curtain({ bg: OL.bgFor(next, state.concept), ink: next === 'dark' ? '#D4B078' : '#86622A', label: t('toast.' + next) }, () => applyTheme(next));
  };

  /* ---------- Language ---------- */
  const applyI18n = () => {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
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
    // re-render the current design in place, keeping the scroll position
    const y = scrollY;
    const app = $('#app');
    const swap = () => {
      const api = OL.mount(state.concept, { keepScroll: y });
      api.intro && api.intro.progress(1);
      if (hasGsap) gsap.fromTo(app, { autoAlpha: 0 }, { autoAlpha: 1, duration: .45, ease: 'power2.out' });
    };
    if (hasGsap) gsap.to(app, { autoAlpha: 0, duration: .2, onComplete: swap });
    else swap();
  };

  /* ---------- Pills (language + dock) ---------- */
  function placePills() {
    const on = $('.lang-switch button.is-on');
    if (on) $('.lang-pill').style.transform = `translateX(${on.offsetLeft - 3}px)`;
    const btn = $(`[data-concept-btn="${state.concept}"]`);
    const pill = $('.dock-pill');
    $$('[data-concept-btn]').forEach((b) => b.classList.toggle('is-on', b === btn));
    if (btn && pill) { pill.style.width = btn.offsetWidth + 'px'; pill.style.transform = `translateX(${btn.offsetLeft}px)`; }
  }
  OL.placePills = placePills;

  /* ---------- Concept switching ---------- */
  OL.concepts = OL.concepts || {};
  OL.ctx = null;
  OL.mount = (name, opts = {}) => {
    const C = OL.concepts[name] || OL.concepts.gilded;
    OL.cleanup();
    if (OL.ctx) { OL.ctx.revert(); OL.ctx = null; }
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.getAll().forEach((s) => s.kill());

    state.concept = name;
    html.dataset.concept = name;
    store.set('concept', name);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = OL.bgFor(state.theme, name);

    const app = $('#app');
    app.innerHTML = C.render();
    const y = opts.keepScroll || 0;
    if (OL.lenis) OL.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);

    let api = {};
    if (OL.anim) {
      OL.ctx = gsap.context(() => { api = C.init(app) || {}; OL.reveal(app); }, app);
    } else if (C.initStatic) {
      C.initStatic(app);
    }
    OL.runCountdown(app);
    placePills();
    if (hasGsap && window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
    return api;
  };

  OL.switchConcept = (name) => {
    if (name === state.concept || OL.switching) return;
    OL.switching = true;
    history.replaceState(null, '', '#' + name);
    let api = {};
    // move the pill immediately for feedback
    const prev = state.concept;
    state.concept = name; placePills(); state.concept = prev;
    OL.curtain(
      { bg: OL.bgFor(state.theme, name), ink: state.theme === 'dark' ? '#D4B078' : '#86622A', label: t('concept.' + name) },
      () => { api = OL.mount(name); },
      () => { api.intro && api.intro.play(); },
    ).then(() => { OL.switching = false; });
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
        <img src="${OL.img(p.img, 200, 230)}" alt="">
        <div><h4>${p.name}</h4><small>${p.brand} · ${t('cart.size')} ${i.size}</small><div class="ci-price">${OL.price(p.price * i.qty)}</div></div>
        <div class="ci-side">
          <div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><span>${i.qty}</span><button type="button" data-qty="1" aria-label="+">+</button></div>
          <button type="button" class="ci-remove" data-remove>${t('cart.remove')}</button>
        </div>
      </div>`;
    }).join('');
    const sub = items.reduce((s, i) => s + OL.P[i.id].price * i.qty, 0);
    const save = items.reduce((s, i) => s + (OL.P[i.id].was - OL.P[i.id].price) * i.qty, 0);
    $('#cartFoot').innerHTML = `
      <div class="cf-row"><span>${t('cart.subtotal')}</span><b>${OL.price(sub)}</b></div>
      <div class="cf-row cf-save"><span>${t('cart.save')}</span><span>${OL.price(save)}</span></div>
      <p class="cf-note">${t('cart.note')}</p>
      <button type="button" class="btn btn-gold" data-checkout>${t('cart.checkout')} ${ICON.arrow}</button>`;
  }
  OL.renderCart = renderCart;

  const openCart = (open) => {
    html.classList.toggle('cart-open', open);
    $('#cart').setAttribute('aria-hidden', String(!open));
    if (OL.lenis) open ? OL.lenis.stop() : OL.lenis.start();
  };

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

    // Flight Path draws the arrow trail behind the flying shoe
    let trail = null, len = 0;
    if (state.concept === 'flight') {
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

  /* ---------- Footer ---------- */
  function renderFooter() {
    $('#footer').innerHTML = `
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">${OL.logoMark()}<p class="footer-word">OUTLET LOUNGE</p><p class="footer-tag">${t('footer.tagline')}</p></div>
          <div class="footer-col"><h4>${t('footer.shop')}</h4><a href="#new">${t('nav.new')}</a><a href="#cats">${t('nav.men')}</a><a href="#cats">${t('nav.women')}</a><a href="#cats">${t('nav.kids')}</a><a href="#deals">${t('nav.deals')}</a></div>
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
    if (!OL.anim) { L.remove(); resolve(); return; }
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
      const a = e.target.closest('a[href^="#"]');
      if (a) {
        e.preventDefault();
        const href = a.getAttribute('href');
        html.classList.remove('menu-open');
        if (href.length > 1) OL.scrollTo(href);
        return;
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
        OL.addToCart(card.dataset.id, on ? Number(on.dataset.size) : fallback, $('[data-fly]', card), add);
        return;
      }
      const fav = e.target.closest('.pcard-fav');
      if (fav) {
        fav.classList.toggle('is-on');
        if (hasGsap) gsap.fromTo(fav, { scale: .6 }, { scale: 1, duration: .7, ease: 'elastic.out(1, .35)' });
        return;
      }
      if (e.target.closest('[data-theme-toggle]')) return OL.toggleTheme();
      const lang = e.target.closest('[data-lang]');
      if (lang) return OL.setLang(lang.dataset.lang);
      const cb = e.target.closest('[data-concept-btn]');
      if (cb) return OL.switchConcept(cb.dataset.conceptBtn);
      if (e.target.closest('[data-open-cart]')) return openCart(true);
      if (e.target.closest('[data-close-cart]')) return openCart(false);
      if (e.target.closest('[data-menu-toggle]')) return html.classList.toggle('menu-open');
      if (e.target.closest('[data-checkout]')) return OL.toast(t('cart.demo'));

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

    document.addEventListener('submit', (e) => {
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
      if (e.key === 'Escape') { openCart(false); html.classList.remove('menu-open'); }
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const map = { 1: 'gilded', 2: 'flight', 3: 'vault' };
      if (map[e.key]) OL.switchConcept(map[e.key]);
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
    applyI18n();
    renderFooter();
    renderCart();
    initLenis();
    initHeader();
    initCursor();
    initPointerFx();
    initEvents();
  };
})();
