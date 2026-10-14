/* Outlet Lounge — motion: the editorial animation layer.
   Smooth scrolling (Lenis), an intro where the logo draws itself, a curtain between pages,
   headlines that rise line by line, photographs revealed like a print being pulled,
   gentle parallax, magnetic buttons, a "View" cursor over photographs and a fly-to-bag on add.

   Everything here is optional: without GSAP (blocked CDN) or with "reduce motion" switched on,
   OL.motion.on stays false and the pages fall back to the CSS fade-ups in base.css. */
(function () {
  const OL = (window.OL = window.OL || {});
  const html = document.documentElement;
  const M = (OL.motion = { on: false });
  const gsap = window.gsap;
  if (!gsap || !window.ScrollTrigger || OL.reduced) return;

  const ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  M.on = true;
  html.classList.add('has-motion');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EASE = 'expo.out';

  /* ---------- smooth scrolling ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)), smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // overlays lock the page (html.is-locked): stop the smooth scroller while they are open
    new MutationObserver(() => (html.classList.contains('is-locked') ? lenis.stop() : lenis.start()))
      .observe(html, { attributes: true, attributeFilter: ['class'] });
  }
  M.scrollTo = (y, { immediate = false, offset = 0 } = {}) => {
    if (lenis) lenis.scrollTo(y, { immediate, force: true, offset });
    else if (typeof y === 'number') window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    else y.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  };

  /* ---------- gate: page intros wait until the loader / curtain has lifted ---------- */
  let open;
  let gate = new Promise((r) => { open = r; });
  const closeGate = () => { gate = new Promise((r) => { open = r; }); };

  /* ---------- split headlines into words that rise from behind a mask ---------- */
  const split = (el) => {
    if (el.dataset.splitDone) return $$('.sw-i', el);
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map((w) => `<span class="sw" aria-hidden="true"><span class="sw-i">${OL.esc(w)}</span></span>`).join(' ');
    el.dataset.splitDone = '1';
    return $$('.sw-i', el);
  };

  /* ---------- reveals (called after every page mount and after the catalog grid repaints) ---------- */
  const track = (st) => { if (st) OL.onCleanup(() => [].concat(st).forEach((x) => x && x.kill())); return st; };
  const once = (el, fn, start = 'top 88%') => track(ST.create({ trigger: el, start, once: true, onEnter: fn }));

  M.reveal = (root = document) => {
    // initial states are set right away (no flash), the animations start when the gate opens
    const heads = $$('[data-split]:not([data-split-done])', root);
    const words = heads.map((h) => { const w = split(h); gsap.set(w, { yPercent: 115 }); return [h, w]; });
    const fades = $$('[data-reveal]:not(.is-in)', root);
    gsap.set(fades, { autoAlpha: 0, y: 34 });
    const groups = $$('[data-stagger]:not(.is-in)', root);
    groups.forEach((g) => gsap.set(g.children, { autoAlpha: 0, y: 26 }));
    const pics = $$('[data-img]:not(.is-in)', root);
    pics.forEach((p) => { gsap.set(p, { clipPath: 'inset(0 0 100% 0)' }); gsap.set($$('img', p), { scale: 1.25 }); });
    const cards = $$('.pcard:not(.is-in)', root);
    gsap.set(cards, { autoAlpha: 0, y: 40 });

    gate.then(() => {
      // the page may have been replaced while the gate was closed (language change, quick clicks)
      const live = (el) => el.isConnected;
      if (!live(root) || (root !== document && !root.firstElementChild)) return;
      [words, fades, groups, pics, cards].forEach((list) => list.splice(0, list.length, ...list.filter((x) => live(Array.isArray(x) ? x[0] : x))));
      words.forEach(([h, w]) => once(h, () => gsap.to(w, { yPercent: 0, duration: 1.25, stagger: 0.05, ease: EASE, delay: Number(h.dataset.delay || 0) * 0.1 }), 'top 92%'));
      fades.forEach((el) => once(el, () => {
        el.classList.add('is-in');
        gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE, delay: Number(el.dataset.delay || 0) * 0.12, clearProps: 'transform' });
      }));
      groups.forEach((g) => once(g, () => {
        g.classList.add('is-in');
        gsap.to(g.children, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.09, ease: EASE, clearProps: 'transform' });
      }));
      pics.forEach((p) => once(p, () => {
        p.classList.add('is-in');
        gsap.to(p, { clipPath: 'inset(0 0 0% 0)', duration: 1.35, ease: 'expo.inOut' });
        gsap.to($$('img', p), { scale: 1, duration: 1.8, ease: EASE, clearProps: 'transform' });
      }, 'top 90%'));
      // product cards arrive in small waves as they scroll in
      if (cards.length) {
        track(ST.batch(cards, {
          start: 'top 92%',
          once: true,
          onEnter: (b) => {
            b.forEach((c) => c.classList.add('is-in'));
            gsap.to(b, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: EASE, clearProps: 'transform' });
          },
        }));
      }
      // parallax: the photo drifts slower than the page
      $$('[data-parallax]', root).forEach((el) => {
        const amount = Number(el.dataset.parallax) || 10;
        track(gsap.fromTo(el, { yPercent: -amount }, { yPercent: amount, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }).scrollTrigger);
      });
      ST.refresh();
    });
  };

  /* ---------- home hero: the photograph settles, the copy fades as you scroll away ---------- */
  M.hero = (root) => {
    const media = $('.h-hero-media img', root);
    const copy = $('.h-hero-copy', root);
    if (!media) return;
    gsap.set(media, { scale: 1.22, autoAlpha: 0 });
    gate.then(() => {
      gsap.to(media, { scale: 1.06, autoAlpha: 1, duration: 2.4, ease: 'expo.out' });
      track(gsap.to(media, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.h-hero', start: 'top top', end: 'bottom top', scrub: true } }).scrollTrigger);
      if (copy) track(gsap.to(copy, { y: -60, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.h-hero', start: '35% top', end: 'bottom top', scrub: true } }).scrollTrigger);
    });
  };

  /* ---------- intro (once per visit). Four styles; the design switcher sets html[data-intro] ---------- */
  // each builder fills the loader, returns its timeline and calls `reveal` when the page should start appearing
  const INTROS = {
    // the gold logo draws itself stroke by stroke, the screen lifts
    draw(L, reveal) {
      L.className = 'loader is-draw';
      L.innerHTML = `<div class="loader-inner"><div class="loader-mark">${OL.logoMark()}</div>
        <p class="loader-word"><span>OUTLET LOUNGE</span></p><div class="loader-line"><i></i></div></div>`;
      const paths = $$('.loader-mark path', L);
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { stroke: 'url(#olGold)', strokeWidth: 1, strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
      });
      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
      tl.to(paths, { strokeDashoffset: 0, duration: 1.2, stagger: 0.12 })
        .to(paths, { fillOpacity: 1, strokeWidth: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out' }, '-=0.5')
        .fromTo($('.loader-word span', L), { letterSpacing: '1.1em', autoAlpha: 0 }, { letterSpacing: '0.42em', autoAlpha: 1, duration: 1.1, ease: EASE }, '-=0.9')
        .to($('.loader-line i', L), { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0)
        .to($('.loader-inner', L), { y: -24, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, '+=0.15')
        .add(reveal, '-=0.05')
        .to(L, { yPercent: -100, duration: 1.05, ease: 'expo.inOut' }, '-=0.1');
      return tl;
    },

    // the name appears, then six vertical blinds snap open over the hero
    shutter(L, reveal) {
      L.className = 'loader is-shutter';
      L.innerHTML = `<div class="ld-slats">${'<i></i>'.repeat(OL.touch ? 4 : 6)}</div>
        <div class="ld-center"><div class="loader-mark">${OL.logoMark()}</div><p class="ld-word">OUTLET LOUNGE</p></div>`;
      const tl = gsap.timeline();
      tl.from($('.loader-mark', L), { autoAlpha: 0, scale: 0.85, duration: 0.8, ease: EASE })
        .fromTo($('.ld-word', L), { letterSpacing: '1.4em', autoAlpha: 0 }, { letterSpacing: '0.42em', autoAlpha: 1, duration: 0.9, ease: EASE }, '-=0.6')
        .to($('.ld-center', L), { autoAlpha: 0, y: -18, duration: 0.35, ease: 'power2.in' }, '+=0.15')
        .add(reveal, '-=0.1')
        .to($$('.ld-slats i', L), { yPercent: -101, duration: 0.9, stagger: 0.07, ease: 'power4.inOut' }, '-=0.15');
      return tl;
    },

    // a fast cut through the products with a 00→100 counter; the last frame grows to full screen
    film(L, reveal) {
      L.className = 'loader is-film';
      const pics = OL.PRODUCTS.filter((p) => p.images[0]).slice(0, OL.touch ? 4 : 6).map((p) => p.images[0]);
      const last = OL.hero().image || pics[pics.length - 1];
      const urls = [...pics, last].filter(Boolean).map((u, i, all) => OL.pimg(u, i === all.length - 1 ? 1600 : 480, i === all.length - 1 ? 1000 : 600));
      urls.forEach((u) => { const im = new Image(); im.src = u; }); // warm the cache
      L.innerHTML = `<div class="ld-frames">${urls.map((u) => `<img src="${u}" alt="">`).join('')}</div>
        <span class="ld-count">00</span><p class="ld-word">OUTLET LOUNGE</p>`;
      const frames = $$('.ld-frames img', L);
      const count = $('.ld-count', L);
      const step = 0.2;
      const n = { v: 0 };
      const tl = gsap.timeline();
      gsap.set(frames, { autoAlpha: 0 });
      tl.from($('.ld-word', L), { autoAlpha: 0, y: 12, duration: 0.5, ease: EASE }, 0);
      frames.forEach((f, i) => {
        tl.set(f, { autoAlpha: 1 }, 0.2 + i * step);
        if (i < frames.length - 1) tl.set(f, { autoAlpha: 0 }, 0.2 + (i + 1) * step);
      });
      tl.to(n, { v: 100, duration: 0.2 + frames.length * step, ease: 'power1.in', onUpdate: () => { count.textContent = String(Math.round(n.v)).padStart(2, '0'); } }, 0)
        .to([count, $('.ld-word', L)], { autoAlpha: 0, duration: 0.3 }, '+=0.05')
        .to(frames[frames.length - 1], { width: '100vw', height: '100svh', duration: 1, ease: 'expo.inOut' }, '<')
        .add(reveal, '-=0.35')
        .to(L, { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, '-=0.15');
      return tl;
    },

    // the logo's arrow cuts the screen diagonally, the halves slide apart, giant words cross
    slash(L, reveal) {
      L.className = 'loader is-slash';
      L.innerHTML = `<div class="ld-half ld-top"></div><div class="ld-half ld-bot"></div>
        <svg class="ld-cut" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M-2 79 L102 29" pathLength="1"/></svg>
        <div class="ld-words"><b>OUTLET</b><b><em>Lounge</em></b></div>`;
      const [w1, w2] = $$('.ld-words b', L);
      const cut = $('.ld-cut path', L);
      gsap.set(cut, { strokeDasharray: 1, strokeDashoffset: 1 });
      const tl = gsap.timeline();
      tl.fromTo(w1, { xPercent: -120 }, { xPercent: 0, duration: 1.1, ease: EASE }, 0.1)
        .fromTo(w2, { xPercent: 120 }, { xPercent: 0, duration: 1.1, ease: EASE }, 0.2)
        .to(cut, { strokeDashoffset: 0, duration: 0.55, ease: 'power3.inOut' }, 0.75)
        .add(reveal, 1.3)
        .to($('.ld-top', L), { xPercent: -14, yPercent: -105, duration: 1, ease: 'power4.inOut' }, 1.3)
        .to($('.ld-bot', L), { xPercent: 14, yPercent: 105, duration: 1, ease: 'power4.inOut' }, 1.3)
        .to(cut, { autoAlpha: 0, duration: 0.3 }, 1.4)
        .to(w1, { xPercent: 40, autoAlpha: 0, duration: 1, ease: 'power2.in' }, 1.35)
        .to(w2, { xPercent: -40, autoAlpha: 0, duration: 1, ease: 'power2.in' }, 1.35);
      return tl;
    },
  };
  M.INTROS = Object.keys(INTROS);

  M.intro = () => new Promise((resolve) => {
    const L = $('#loader');
    let seen = false;
    try { seen = sessionStorage.getItem('ol:seen') === '1'; sessionStorage.setItem('ol:seen', '1'); } catch (e) { /* private mode */ }
    if (!L) { resolve(); return; }
    if (seen) { L.remove(); resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const build = INTROS[html.dataset.intro] || INTROS.draw;
    const tl = build(L, finish).add(() => L.remove());
    // a tap skips it
    L.addEventListener('click', () => { tl.progress(1); finish(); }, { once: true });
    // a stalled tab (hidden window) must never keep the shop covered
    setTimeout(() => { if (!done) { tl.progress(1); finish(); } }, 6000);
  });

  /* ---------- curtain between pages and for the theme switch ---------- */
  const curtain = () => $('#curtain');
  M.cover = (label = '') => new Promise((resolve) => {
    const c = curtain();
    if (!c) { resolve(); return; }
    closeGate();
    $('.curtain-mark', c).innerHTML = OL.logoMark();
    $('.curtain-label', c).textContent = label;
    gsap.killTweensOf(c);
    gsap.set(c, { visibility: 'visible', yPercent: 100 });
    gsap.set('.curtain-line i', { scaleX: 0 });
    gsap.timeline({ onComplete: resolve })
      .to(c, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' })
      .fromTo('.curtain-inner', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '-=0.2')
      .to('.curtain-line i', { scaleX: 1, duration: 0.35, ease: 'power2.inOut' }, '<');
  });
  M.uncover = () => new Promise((resolve) => {
    const c = curtain();
    if (!c || getComputedStyle(c).visibility === 'hidden') { open(); resolve(); return; }
    gsap.timeline({ onComplete: () => { gsap.set(c, { visibility: 'hidden' }); resolve(); } })
      .to('.curtain-inner', { autoAlpha: 0, y: -14, duration: 0.25, ease: 'power2.in' })
      .add(() => open(), '+=0.05')
      .to(c, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, '<');
  });
  // the first page: open the gate once the intro is done
  M.start = () => M.intro().then(() => open());

  /* ---------- magnetic buttons + the "View" cursor (mouse only) ---------- */
  if (!OL.touch) {
    document.addEventListener('pointerover', (e) => {
      const b = e.target.closest('.btn-gold, .btn-ghost, .icon-btn');
      if (!b || b.dataset.mag) return;
      b.dataset.mag = '1';
      const xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
      const k = b.classList.contains('icon-btn') ? 0.3 : 0.18;
      b.addEventListener('pointermove', (ev) => {
        const r = b.getBoundingClientRect();
        xTo((ev.clientX - r.left - r.width / 2) * k);
        yTo((ev.clientY - r.top - r.height / 2) * k);
      });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="cursor-ring"><b></b></span>';
    document.body.appendChild(cur);
    const ring = $('.cursor-ring', cur);
    const label = $('b', cur);
    const cx = gsap.quickTo(cur, 'x', { duration: 0.5, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.5, ease: 'power3' });
    let shown = false;
    const VIEW = '.pcard-media, .h-dept, .h-cat-media, .pd-slide, .mega-feature img';
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) { gsap.set(cur, { x: e.clientX, y: e.clientY }); shown = true; }
      cx(e.clientX); cy(e.clientY);
      const over = e.target.closest && e.target.closest(VIEW);
      if (over) label.textContent = over.closest('.pd-slide') ? OL.t('pd.zoom') : OL.t('ui.view');
      cur.classList.toggle('is-view', !!over);
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-view'));
    document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) { cur.classList.remove('is-view'); gsap.set(ring, { autoAlpha: 0 }); } });
    document.addEventListener('pointerover', () => gsap.set(ring, { autoAlpha: 1 }));
    // a click anywhere: drop the label so it can never stay stuck after a page change
    addEventListener('pointerdown', () => setTimeout(() => cur.classList.remove('is-view'), 120));
  }

  /* ---------- add to bag: a small copy of the photo glides into the bag icon ---------- */
  M.fly = (img) => {
    const bag = $('.cart-btn');
    if (!img || !bag) return Promise.resolve();
    const a = img.getBoundingClientRect();
    const b = bag.getBoundingClientRect();
    if (!a.width) return Promise.resolve();
    const ghost = img.cloneNode();
    ghost.className = 'fly-ghost';
    ghost.removeAttribute('loading');
    document.body.appendChild(ghost);
    const size = Math.min(a.width, 220);
    gsap.set(ghost, { left: a.left + (a.width - size) / 2, top: a.top + (a.height - size * 1.25) / 2, width: size, height: size * 1.25 });
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => { ghost.remove(); resolve(); } })
        .to(ghost, { x: dx, duration: 0.9, ease: 'power2.inOut' }, 0)
        .to(ghost, { y: dy, duration: 0.9, ease: 'back.in(1.1)' }, 0)
        .to(ghost, { scale: 0.12, borderRadius: '50%', duration: 0.9, ease: 'power3.in' }, 0)
        .to(ghost, { autoAlpha: 0, duration: 0.2 }, 0.75);
    });
  };

  // refresh trigger positions once fonts and photos have settled
  addEventListener('load', () => ST.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
})();
