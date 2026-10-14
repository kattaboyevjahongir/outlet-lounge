/* Homepage. Two designs while the owner chooses (html[data-home], set by the design switcher):
   - kinetic: oversized type that launches letter by letter, a fanned stack of looks that deals itself,
     the logo's gold arrow drawing across the hero, scroll-speed ribbons, sideways-scrolling new arrivals
     and a category list with a photo that follows the cursor;
   - editorial: a quiet lookbook hero and tiles.
   Both share the lower half: how importing works, best sellers, sale, trust, help. */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);
  const html = document.documentElement;

  const DEPTS = ['clothing', 'shoes', 'accessories'];
  const kinetic = () => html.dataset.home === 'kinetic';
  const motion = () => (OL.motion && OL.motion.on ? OL.motion : null);

  // the first product photo of a department (shown on its tile); the newest item of the department
  const deptImage = (d) => {
    const p = OL.PRODUCTS.find((x) => OL.catDept(x.cat) === d && x.isNew) || OL.PRODUCTS.find((x) => OL.catDept(x.cat) === d);
    return p ? p.images[0] : '';
  };
  // letters wrapped one by one so they can launch separately (the row itself carries the readable text)
  const chars = (s) => [...s].map((c) => (c === ' ' ? '<span class="ch ch-sp"> </span>' : `<span class="ch">${OL.esc(c)}</span>`)).join('');
  const ARROW_HEAD = '<path d="M11 0L-7 -7.5L-2.5 0L-7 7.5Z"/>';

  /* =============================================================== kinetic */
  const kineticTop = () => {
    const esc = OL.esc;
    const L = OL.lists();
    const rows = t('home.k.rows');
    const counts = OL.counts();
    const cats = OL.CATEGORIES.filter((c) => counts.cat[c.slug] > 0);
    const looks = OL.catalog.onePerStyle([...OL.PRODUCTS.filter((p) => p.featured || p.isNew), ...OL.PRODUCTS]).slice(0, 4);
    const tape = (items, cls) => `<div class="k-tape ${cls}"><div class="k-tape-track">${
      [0, 1].map(() => `<div class="k-tape-set">${items.map((w) => `<span>${esc(w)}</span><i>✦</i>`).join('')}</div>`).join('')}</div></div>`;

    return `
      <section class="k-hero">
        <div class="k-mark" aria-hidden="true">${OL.logoMark()}</div>
        <h1 class="k-title" aria-label="${esc(rows.join(' '))}">
          <span class="k-row k-row-1" aria-hidden="true">${chars(rows[0])}</span>
          <span class="k-row k-row-2" aria-hidden="true">${chars(rows[1])}</span>
          <span class="k-row k-row-3" aria-hidden="true"><em>${chars(rows[2])}</em><span class="ch k-arrow">${OL.ICON.arrow}</span></span>
        </h1>

        ${looks.length ? `<div class="k-stack">
          <div class="k-stack-float">
            ${looks.map((p, i) => `<a class="k-card" href="${OL.productUrl(p)}" data-k="${i}" aria-label="${esc(p.brand)} ${esc(p.name)}" ${i ? 'tabindex="-1"' : ''}>
              <img src="${OL.pimg(p.images[0], 560, 700)}" alt=""${i ? '' : ' fetchpriority="high"'}></a>`).join('')}
            <a class="k-tag" href="${OL.productUrl(looks[0])}"><small>${esc(looks[0].brand)}</small><b>${esc(looks[0].name)}</b><em>${OL.price(looks[0].price)}</em></a>
          </div>
        </div>` : ''}

        <svg class="k-swoosh" viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path class="k-swoosh-path" d="M-40 760C260 700 520 600 760 470S1160 200 1380 90"/>
          <g class="k-head">${ARROW_HEAD}</g>
        </svg>

        <div class="k-bottom container">
          <p class="k-lead">${esc(t('home.lead'))}</p>
          <div class="k-cta">
            <a href="/new" class="btn btn-gold"><span>${t('home.cta')}</span>${OL.ICON.arrow}</a>
            <a href="/clothing" class="btn btn-ghost"><span>${t('home.cta2')}</span></a>
          </div>
          <span class="k-scroll" aria-hidden="true"><i></i>${t('home.scroll')}</span>
        </div>
      </section>

      <section class="k-tapes" aria-hidden="true">
        ${tape(OL.BRANDS.map((b) => b.toUpperCase()), 'k-tape-1')}
        ${tape(t('home.k.words'), 'k-tape-2')}
      </section>

      <section class="k-depts container" data-stagger>
        ${DEPTS.map((d, i) => `
        <a class="k-dept" href="/${d}">
          <span class="k-dept-i">${OL.pad(i + 1)}</span>
          <span class="k-dept-media" data-img><img src="${OL.pimg(deptImage(d), 800, 1000)}" alt="" loading="lazy" decoding="async" data-parallax="8"></span>
          <b>${t('dept.' + d)}</b><small>${counts.dept[d]} ${t('home.k.count')}</small>
        </a>`).join('')}
      </section>

      ${L.drops.length ? `<section class="k-new">
        <div class="k-new-pin">
          <div class="k-new-track">
            <div class="k-new-intro">
              <span class="eyebrow"><i class="eyebrow-line"></i>${t('home.newEyebrow')}</span>
              <h2 class="k-h2">${t('home.newTitle')}</h2>
              <p>${t('home.k.newIntro')}</p>
              <span class="k-side">${t('home.k.side')} ${OL.ICON.arrow}</span>
            </div>
            ${L.drops.map((p) => `<div class="k-new-item">${OL.ui.card(p)}</div>`).join('')}
            <a href="/new" class="k-new-end"><span>${t('ui.viewAll')}</span><i>${OL.ICON.arrowUR}</i></a>
          </div>
          <div class="k-new-bar container"><div><i></i></div><span class="k-new-count">01 / ${OL.pad(L.drops.length)}</span></div>
        </div>
      </section>` : ''}

      ${cats.length ? `<section class="k-cats">
        <div class="container">
          <span class="eyebrow"><i class="eyebrow-line"></i>${t('home.catsEyebrow')}</span>
          <h2 class="k-h2" data-split>${t('home.k.catsTitle')}</h2>
          <ul class="k-cat-list">
            ${cats.map((c, i) => {
              const p = OL.PRODUCTS.find((x) => x.cat === c.slug);
              return `<li><a class="k-cat" href="${OL.catUrl(c.slug)}" data-img-src="${OL.pimg(p.images[0], 480, 600)}">
                <span class="k-cat-i">${OL.pad(i + 1)}</span>
                <span class="k-cat-name">${esc(OL.catName(c.slug))}</span>
                <span class="k-cat-n">${counts.cat[c.slug]} ${t('home.k.count')}</span>
                <span class="k-cat-go">${OL.ICON.arrowUR}</span></a></li>`;
            }).join('')}
          </ul>
        </div>
        <div class="k-cat-preview" aria-hidden="true"><img alt=""></div>
      </section>` : ''}`;
  };

  // moves the arrowhead along the swoosh as it draws (p = 0…1)
  const follow = (path, head) => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    return (p) => {
      p = Math.max(0, Math.min(1, p));
      path.style.strokeDashoffset = len * (1 - p);
      const a = path.getPointAtLength(len * p);
      const b = path.getPointAtLength(Math.max(0, len * p - 3));
      head.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${p === 0 ? 0 : (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI})`);
      head.style.opacity = p > 0.01 ? 1 : 0;
    };
  };

  const bindKinetic = (root) => {
    const M = motion();
    const gsap = window.gsap;
    const q = (s) => root.querySelector(s);
    const qa = (s) => [...root.querySelectorAll(s)];
    const hero = q('.k-hero');
    if (!hero) return;
    if (!M) { hero.classList.add('is-static'); return; } // no animation library or reduced motion: everything shows as laid out

    const ST = window.ScrollTrigger;
    const kill = [];
    OL.onCleanup(() => kill.forEach((k) => k && k.kill && k.kill()));

    /* --- the stack of looks: positions by depth; the top card is dealt away every few seconds --- */
    const cards = qa('.k-card');
    const tag = q('.k-tag');
    const looks = cards.map((c) => OL.PRODUCTS.find((p) => OL.productUrl(p) === c.getAttribute('href')));
    const ROT = [-4, 6, -10, 9];
    const place = (c, depth, dur = 0.9) => gsap.to(c, {
      x: depth * -26, y: depth * 18, rotate: ROT[depth % ROT.length], scale: 1 - depth * 0.07,
      zIndex: 10 - depth, autoAlpha: depth > 3 ? 0 : 1, duration: dur, ease: 'expo.out',
    });
    let order = cards.map((_, i) => i);
    cards.forEach((c, i) => place(c, i, 0));
    const setTag = (i) => {
      const p = looks[i];
      if (!p || !tag) return;
      tag.href = OL.productUrl(p);
      tag.innerHTML = `<small>${OL.esc(p.brand)}</small><b>${OL.esc(p.name)}</b><em>${OL.price(p.price)}</em>`;
      gsap.fromTo(tag, { scale: 0.6, rotate: 12, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.8, ease: 'back.out(2)' });
    };
    let dealTimer = null;
    const deal = () => {
      if (cards.length < 2 || document.hidden) return;
      const top = cards[order[0]];
      order = [...order.slice(1), order[0]];
      gsap.timeline()
        .to(top, { x: '+=' + Math.min(innerWidth * 0.5, 520), y: -140, rotate: 32, autoAlpha: 0, duration: 0.75, ease: 'power3.in' })
        .add(() => { place(top, cards.length - 1, 0); gsap.set(top, { autoAlpha: 0 }); });
      order.forEach((ci, depth) => { if (cards[ci] !== top) place(cards[ci], depth); });
      gsap.delayedCall(0.8, () => place(top, cards.length - 1, 0.6));
      cards.forEach((c) => c.setAttribute('tabindex', '-1'));
      cards[order[0]].removeAttribute('tabindex');
      setTag(order[0]);
    };

    /* --- intro: letters launch, the stack is dealt in, the arrow draws --- */
    const path = q('.k-swoosh-path');
    const swoosh = path ? follow(path, q('.k-head')) : () => {};
    swoosh(0);
    const s = { p: 0 };
    gsap.set(qa('.k-row .ch'), { yPercent: 120, rotate: 14 });
    gsap.set(cards, { autoAlpha: 0 });
    gsap.set([q('.k-bottom'), tag, q('.k-mark')].filter(Boolean), { autoAlpha: 0 });

    M.ready().then(() => {
      if (!hero.isConnected) return;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(qa('.k-row .ch'), { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.03 })
        .fromTo(cards.slice().reverse(), { x: () => innerWidth * 0.4, y: 120, rotate: 40, autoAlpha: 0 },
          { autoAlpha: 1, duration: 1.1, stagger: 0.12, ease: 'expo.out', onComplete: () => cards.forEach((c) => place(c, order.indexOf(cards.indexOf(c)), 0.6)) }, 0.15)
        .to(s, { p: 1, duration: 1.8, ease: 'power3.inOut', onUpdate: () => swoosh(s.p) }, 0.4)
        .fromTo(tag, { scale: 0, rotate: 20, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1, ease: 'back.out(2)' }, 1.2)
        .fromTo(q('.k-bottom'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1 }, 0.9)
        .fromTo(q('.k-mark'), { scale: 1.15, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.07, duration: 2 }, 0);
      kill.push(tl);
      kill.push(gsap.to(q('.k-stack-float'), { y: -16, rotate: 2, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
      dealTimer = setInterval(deal, 3200);
      OL.onCleanup(() => clearInterval(dealTimer));

      /* --- scroll: the rows split apart, the stack flies off, the arrow fades --- */
      const heroST = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
      kill.push(gsap.to(q('.k-row-1'), { xPercent: -16, ease: 'none', scrollTrigger: heroST }));
      kill.push(gsap.to(q('.k-row-2'), { xPercent: 14, ease: 'none', scrollTrigger: heroST }));
      kill.push(gsap.to(q('.k-row-3'), { xPercent: -9, ease: 'none', scrollTrigger: heroST }));
      if (q('.k-stack')) kill.push(gsap.to(q('.k-stack'), { x: () => innerWidth * 0.18, y: () => -innerHeight * 0.4, rotate: 18, scale: 0.6, ease: 'power1.in', scrollTrigger: { ...heroST, invalidateOnRefresh: true } }));
      kill.push(gsap.to(q('.k-swoosh'), { autoAlpha: 0, ease: 'none', scrollTrigger: heroST }));
      kill.push(gsap.to(q('.k-mark'), { yPercent: 30, ease: 'none', scrollTrigger: heroST }));
      ST.refresh();
    });

    /* --- mouse: the type and the stack lean against each other --- */
    if (!OL.touch) {
      const rows = qa('.k-row');
      const rx = rows.map((r) => gsap.quickTo(r, 'x', { duration: 1.2, ease: 'power3' }));
      const sx = gsap.quickTo(q('.k-stack') || hero, 'rotationY', { duration: 1, ease: 'power3' });
      const sy = gsap.quickTo(q('.k-stack') || hero, 'rotationX', { duration: 1, ease: 'power3' });
      const move = (e) => {
        const nx = e.clientX / innerWidth - 0.5;
        const ny = e.clientY / innerHeight - 0.5;
        rx.forEach((f, i) => f(nx * (i % 2 ? 30 : -30)));
        if (q('.k-stack')) { sx(nx * 14); sy(ny * -10); }
      };
      hero.addEventListener('pointermove', move);
      hero.addEventListener('pointerleave', () => { rx.forEach((f) => f(0)); sx(0); sy(0); });
    }

    /* --- ribbons: always moving, faster and skewed with the scroll speed --- */
    const runTape = (el, speed, dir) => {
      const track = el && el.querySelector('.k-tape-track');
      if (!track) return null;
      let half = track.scrollWidth / 2;
      let x = dir > 0 ? 0 : -half;
      let boost = 0;
      let skew = 0;
      let skewT = 0;
      const tick = (time, dt) => {
        x -= (speed + boost) * dir * (dt / 1000);
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        skew += (skewT - skew) * 0.12;
        skewT *= 0.9;
        boost *= 0.93;
        track.style.transform = `translate3d(${x}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      };
      const measure = () => { half = track.scrollWidth / 2; };
      gsap.ticker.add(tick);
      addEventListener('resize', measure);
      OL.onCleanup(() => { gsap.ticker.remove(tick); removeEventListener('resize', measure); });
      return { boost: (v) => { boost = v; }, skew: (v) => { skewT = v; } };
    };
    const t1 = runTape(q('.k-tape-1'), 70, 1);
    const t2 = runTape(q('.k-tape-2'), 55, -1);
    if (q('.k-tapes')) {
      kill.push(ST.create({
        trigger: q('.k-tapes'), start: 'top bottom', end: 'bottom top',
        onUpdate: (st) => {
          const v = st.getVelocity();
          const b = Math.min(Math.abs(v) / 4, 900);
          const k = gsap.utils.clamp(-12, 12, v / -160);
          [t1, t2].forEach((m) => { if (m) { m.boost(b); m.skew(k); } });
        },
      }));
    }

    /* --- new arrivals: pinned and scrolled sideways on wide screens --- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const track = q('.k-new-track');
      if (!track) return undefined;
      q('.k-new').classList.add('is-pinned');
      const bar = q('.k-new-bar i');
      const count = q('.k-new-count');
      const n = Math.max(1, qa('.k-new-item').length);
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: q('.k-new'), pin: q('.k-new-pin'), start: 'top top', end: () => '+=' + dist(), scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (st) => {
            bar.style.transform = `scaleX(${st.progress})`;
            count.textContent = `${OL.pad(Math.min(n, 1 + Math.floor(st.progress * n)))} / ${OL.pad(n)}`;
          },
        },
      });
      return () => q('.k-new') && q('.k-new').classList.remove('is-pinned');
    });
    OL.onCleanup(() => mm.revert());

    /* --- categories: a photo follows the cursor over the list --- */
    const preview = q('.k-cat-preview');
    const list = q('.k-cat-list');
    if (preview && list && !OL.touch) {
      const img = preview.querySelector('img');
      const px = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
      const py = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
      const pr = gsap.quickTo(preview, 'rotate', { duration: 0.8, ease: 'power3' });
      let lastX = 0;
      let pointer = null;
      let active = null;
      gsap.set(preview, { autoAlpha: 0, scale: 0.6, xPercent: -50, yPercent: -50 });
      const show = (a) => {
        if (a === active) return;
        active = a;
        if (img.getAttribute('src') !== a.dataset.imgSrc) {
          img.src = a.dataset.imgSrc;
          gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 0.8, ease: 'expo.out', overwrite: true });
        }
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
      };
      const hide = () => {
        if (!active) return;
        active = null;
        gsap.to(preview, { autoAlpha: 0, scale: 0.6, duration: 0.35, overwrite: 'auto' });
      };
      // whatever is under the cursor decides — also after a scroll moved the rows under a still mouse
      const sync = () => {
        const el = pointer && document.elementFromPoint(pointer.x, pointer.y);
        const a = el && el.closest('.k-cat');
        if (a && list.contains(a)) show(a); else hide();
      };
      const move = (e) => {
        pointer = { x: e.clientX, y: e.clientY };
        px(e.clientX); py(e.clientY); pr(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.6)); lastX = e.clientX;
        sync();
      };
      let raf = 0;
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
      const out = (e) => { if (!e.relatedTarget) { pointer = null; hide(); } };
      addEventListener('pointermove', move, { passive: true });
      addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('pointerout', out);
      addEventListener('blur', hide);
      list.addEventListener('pointerleave', hide);
      OL.onCleanup(() => {
        removeEventListener('pointermove', move);
        removeEventListener('scroll', onScroll);
        document.removeEventListener('pointerout', out);
        removeEventListener('blur', hide);
        cancelAnimationFrame(raf);
        gsap.set(preview, { autoAlpha: 0 });
      });
    }
  };

  /* --- the editorial opening screen: three layouts while the owner chooses (html[data-hero]) --- */
  const heroBlock = () => {
    const esc = OL.esc;
    const di = OL.deliveryInfo();
    const own = (OL.SETTINGS.home && OL.SETTINGS.home.hero && OL.SETTINGS.home.hero.image) || '';
    const main = own ? OL.pimg(own, 1400, 1750) : OL.img('look-1', 1400, 1750);
    const copy = (cls = '') => `
      <div class="h2-copy ${cls}">
        <span class="eyebrow" data-reveal><i class="eyebrow-line"></i>${t('home.eyebrow')}</span>
        <h1 class="h2-title" data-split data-delay="1">${esc(t('home.title'))}</h1>
        <p class="h2-lead" data-reveal data-delay="3">${esc(t('home.lead'))}</p>
        <div class="h2-cta" data-reveal data-delay="4">
          <a href="/new" class="btn btn-gold"><span>${t('home.cta')}</span>${OL.ICON.arrow}</a>
          <a href="/clothing" class="btn btn-ghost"><span>${t('home.cta2')}</span></a>
        </div>
        <ul class="h2-facts" data-stagger>
          <li><b>${esc(di.stock_days || '1–3')}</b><span>${t('home.stockTitle')}</span></li>
          <li><b>${esc(di.order_days || '10–18')}</b><span>${t('home.orderTitle')}</span></li>
          <li><b>100%</b><span>${esc(t('home.trust')[0].t.replace(/^100%\s*/, ''))}</span></li>
        </ul>
      </div>`;
    const kind = html.dataset.hero || 'split';
    if (kind === 'triptych') {
      const pics = [['look-1', '01'], ['suit-1', '02'], ['blazer-1', '03']];
      return `<section class="h2 is-tri">
        <div class="h2-tri">${pics.map(([k, n], i) => `<figure class="h2-fig" data-img><img src="${OL.img(k, 900, 1200)}" alt="" ${i ? '' : 'fetchpriority="high"'}><figcaption>${n}</figcaption></figure>`).join('')}</div>
        ${copy('is-center')}
      </section>`;
    }
    if (kind === 'full') {
      return `<section class="h2 is-full">
        <figure class="h2-bg"><img src="${own ? OL.pimg(own, 2000, 1300) : OL.img('suit-1', 2000, 1300)}" alt="" fetchpriority="high"></figure>
        <div class="container h2-full-inner">${copy('is-plate')}</div>
      </section>`;
    }
    return `<section class="h2 is-split">
      ${copy()}
      <figure class="h2-media" data-img><img src="${main}" alt="" fetchpriority="high" data-parallax="5"><figcaption>01 — ${t('home.eyebrow')}</figcaption></figure>
    </section>`;
  };

  /* ============================================================= editorial */
  const editorialTop = () => {
    const esc = OL.esc;
    const L = OL.lists();
    const hero = OL.hero();
    const counts = OL.counts();
    const cats = OL.CATEGORIES.filter((c) => counts.cat[c.slug] > 0);
    const brands = OL.BRANDS.slice(0, 12);
    return `
      ${heroBlock()}

      <section class="h-depts container" data-stagger>
        ${DEPTS.map((d) => `
        <a class="h-dept" href="/${d}">
          <span class="h-dept-media" data-img><img src="${OL.pimg(deptImage(d), 800, 1000)}" alt="" loading="lazy" decoding="async" data-parallax="7"></span>
          <span class="h-dept-body"><b class="h-serif">${t('dept.' + d)}</b><small>${t('dept.' + d + 'Text')}</small>
            <em>${t('ui.shopNow')}${OL.ICON.arrow}</em></span>
        </a>`).join('')}
      </section>

      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.newEyebrow')}</span>
          <h2 class="h-serif" data-split>${t('home.newTitle')}</h2><p>${t('home.newText')}</p></div>
          <a class="h-more" href="/new">${t('ui.viewAll')}${OL.ICON.arrow}</a>
        </header>
        <div class="h-rail">${L.drops.map((p) => OL.ui.card(p)).join('')}</div>
      </section>

      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.catsEyebrow')}</span>
          <h2 class="h-serif" data-split>${t('home.catsTitle')}</h2></div>
        </header>
        <div class="h-cats">
          ${cats.map((cat) => {
            const p = OL.PRODUCTS.find((x) => x.cat === cat.slug);
            return `<a class="h-cat" href="${OL.catUrl(cat.slug)}"><span class="h-cat-media" data-img><img src="${OL.pimg(p.images[0], 480, 600)}" alt="" loading="lazy" decoding="async"></span>
              <b>${esc(OL.catName(cat.slug))}</b><small>${counts.cat[cat.slug]}</small></a>`;
          }).join('')}
        </div>
      </section>

      ${brands.length ? `
      <section class="h-brands">
        <h2 class="h-serif container" data-split>${t('home.brandsTitle')}</h2>
        <div class="h-marquee" data-reveal>
          <div class="h-marquee-track">${[0, 1].map((k) => `<div class="h-marquee-set"${k ? ' aria-hidden="true"' : ''}>${brands.map((b) => `<a href="/brands/${OL.slug(b)}"${k ? ' tabindex="-1"' : ''}>${esc(b)}</a><i>✦</i>`).join('')}</div>`).join('')}</div>
        </div>
      </section>` : ''}`;
  };

  /* ================================================== shared lower half */
  const shared = () => {
    const esc = OL.esc;
    const L = OL.lists();
    const di = OL.deliveryInfo();
    const sale = OL.PRODUCTS.filter((p) => OL.off(p) > 0).sort((a, b) => OL.off(b) - OL.off(a)).slice(0, 4);
    const tg = OL.orderLogic.tgLink(OL.contacts().telegram);
    const steps = t('home.steps');
    return `
      <section class="h-abroad">
        <div class="container h-abroad-grid">
          <div class="h-abroad-copy" data-reveal>
            <span class="eyebrow"><i class="eyebrow-line"></i>${t('home.abroadEyebrow')}</span>
            <h2 class="h-serif" data-split>${t('home.abroadTitle')}</h2>
            <p>${t('home.abroadLead')}</p>
            <ol class="h-steps" data-stagger>${steps.map((s, i) => `<li><i>${OL.pad(i + 1)}</i><span>${esc(s)}</span></li>`).join('')}</ol>
          </div>
          <div class="h-ways" data-stagger>
            <div class="h-way"><b class="h-serif">${t('home.stockTitle')}</b><p>${t('home.stockText', { days: esc(di.stock_days || '1–3') })}</p></div>
            <div class="h-way is-order">${OL.ICON.plane}<b class="h-serif">${t('home.orderTitle')}</b><p>${t('home.orderText', { days: esc(di.order_days || '10–18') })}</p></div>
          </div>
        </div>
      </section>

      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.bestEyebrow')}</span>
          <h2 class="h-serif" data-split>${t('home.bestTitle')}</h2></div>
          <a class="h-more" href="/shop">${t('ui.viewAll')}${OL.ICON.arrow}</a>
        </header>
        <div class="pgrid">${L.best.slice(0, 8).map((p) => OL.ui.card(p)).join('')}</div>
      </section>

      ${sale.length ? `
      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.saleEyebrow')}</span>
          <h2 class="h-serif" data-split>${t('home.saleTitle')}</h2><p>${t('home.saleText')}</p></div>
          <a class="h-more" href="/sale">${t('ui.viewAll')}${OL.ICON.arrow}</a>
        </header>
        <div class="pgrid">${sale.map((p) => OL.ui.card(p)).join('')}</div>
      </section>` : ''}

      <section class="h-trust container" data-stagger>
        ${t('home.trust').map((x) => `<div><b>${esc(x.t)}</b><p>${esc(x.d)}</p></div>`).join('')}
      </section>

      ${tg ? `
      <section class="h-help container" data-reveal>
        <div><h2 class="h-serif" data-split>${t('home.tgTitle')}</h2><p>${t('home.tgText')}</p></div>
        <a class="btn btn-gold" href="${tg}" target="_blank" rel="noopener"><span>${t('home.tgBtn')}</span>${OL.ICON.arrow}</a>
      </section>` : ''}`;
  };

  OL.pages.home = {
    meta: () => ({ path: '/' }),

    render() {
      return (kinetic() ? kineticTop() : editorialTop()) + shared();
    },

    bind(root) {
      if (kinetic()) bindKinetic(root);
      else if (motion()) motion().hero(root);
      return {};
    },
  };
})();
