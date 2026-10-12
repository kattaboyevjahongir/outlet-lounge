/* Homepage — "Flight Path": energetic, the logo's arrow drives the motion */
(function () {
  const OL = window.OL;
  const t = (k) => OL.t(k);

  const catUrl = (c) => (['men', 'women', 'kids'].includes(c) ? `/${c}` : `/shop?cat=${c}`);

  OL.pages.home = {
    meta: () => ({ path: '/' }),

    render() {
      const L = OL.lists();
      const hero = OL.hero();
      const counts = OL.counts();
      const esc = OL.esc;
      const catRows = ['running', 'lifestyle', 'basketball', 'men', 'women', 'kids'].filter((c) => counts[c] > 0);
      const [r1, r2, r3] = t('f.title');
      return `
      <div class="f-progress" aria-hidden="true">
        <svg viewBox="0 0 40 600">
          <path class="f-prog-track" d="M20 4C36 80 4 150 20 230S36 380 20 460S8 560 20 596"/>
          <path class="f-prog-line" d="M20 4C36 80 4 150 20 230S36 380 20 460S8 560 20 596"/>
          <g class="f-prog-head">${OL.ARROW_HEAD}</g>
        </svg>
        <span class="f-prog-pct">00</span>
      </div>

      <section class="f-hero" id="top">
        <div class="f-hero-mark" aria-hidden="true">${OL.logoMark()}</div>
        <div class="f-hero-inner container">
          <div class="f-hero-top">
            <span class="f-chip"><i></i>${t('f.live')}</span>
            <span class="f-meta">DROP № 07 — 2026</span>
          </div>

          <h1 class="f-title" aria-label="${r1} ${r2} ${r3}">
            <span class="f-row f-row-1" aria-hidden="true">${OL.chars(r1)}</span>
            <span class="f-row f-row-2 is-outline" aria-hidden="true">${OL.chars(r2)}</span>
            <span class="f-row f-row-3" aria-hidden="true">${OL.chars(r3)}<span class="ch f-arrow">${OL.ICON.arrow}</span></span>
          </h1>

          <div class="f-shoe">
            <div class="f-shoe-float">
              <div class="f-disc">${hero.image ? `<img class="f-shoe-img" src="${OL.pimg(hero.image, 1000, 1000)}" alt="${esc(hero.product ? hero.product.name : '')}">` : ''}</div>
              <div class="f-disc-ring"></div>
              ${hero.product ? `<span class="f-price-tag"><small>${esc(hero.product.name)}</small><b>${OL.price(hero.product.price)}</b></span>` : ''}
            </div>
          </div>

          <svg class="f-swoosh" viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path class="f-swoosh-path" d="M-40 760C260 700 520 600 760 470S1160 200 1380 90"/>
            <g class="f-swoosh-head">${OL.ARROW_HEAD}</g>
          </svg>

          <div class="f-hero-bottom">
            <p class="f-lead">${t('f.lead')}</p>
            <a href="#new" class="btn btn-gold magnetic"><span>${t('f.cta')}</span>${OL.ICON.arrow}</a>
          </div>
        </div>
      </section>

      <section class="f-tapes" aria-hidden="true">
        ${OL.ui.marquee(OL.BRANDS.map((b) => b.toUpperCase()), 'f-tape f-tape-1')}
        ${OL.ui.marquee(t('f.words').map((w) => w.toUpperCase()), 'f-tape f-tape-2')}
      </section>

      ${L.drops.length ? `<section class="f-drops" id="new">
        <div class="f-drops-pin">
          <div class="f-drops-track">
            <div class="f-drops-intro">
              <p class="eyebrow">01 / ${t('sec.newEyebrow')}</p>
              <h2 class="f-h2">${t('f.drops')}</h2>
              <p class="f-drops-text">${t('f.dropsText')}</p>
              <span class="f-side">${t('f.side')} ${OL.ICON.arrow}</span>
            </div>
            ${L.drops.map((p, i) => `<div class="f-drop">${OL.ui.card(p, { index: i + 1 })}</div>`).join('')}
            <a href="/new" class="f-drops-end">
              <span>${t('ui.viewAll')}</span>
              <i>${OL.ICON.arrowUR}</i>
            </a>
          </div>
          <div class="f-drops-bar container"><div><i></i></div><span class="f-drops-count">01 / 0${L.drops.length}</span></div>
        </div>
      </section>` : ''}

      ${catRows.length ? `<section class="f-cats" id="cats">
        <div class="container">
          <p class="eyebrow">02 / ${t('sec.catsEyebrow')}</p>
          <ul class="f-cat-list">
            ${catRows.map((c, i) => `
              <li>
                <a href="${catUrl(c)}" class="f-cat" data-img="${OL.img(OL.CAT_IMG[c], 640, 800)}">
                  <span class="f-cat-i">0${i + 1}</span>
                  <span class="f-cat-name"><span>${t('cat.' + c)}</span><span class="f-cat-dup" aria-hidden="true">${t('cat.' + c)}</span></span>
                  <span class="f-cat-n">${counts[c]} ${t('ui.models')}</span>
                  <span class="f-cat-go">${OL.ICON.arrowUR}</span>
                </a>
              </li>`).join('')}
          </ul>
        </div>
        <div class="f-cat-preview" aria-hidden="true"><img alt=""></div>
      </section>` : ''}

      <section class="f-deal" id="deals">
        <div class="f-deal-band">
          <div class="f-deal-big" aria-hidden="true"><span>${t('f.dealBig')}</span><span>${t('f.dealBig')}</span><span>${t('f.dealBig')}</span></div>
          <div class="f-deal-inner container">
            <div>
              <p class="eyebrow">03 / ${t('sec.dealsEyebrow')}</p>
              <h2 class="f-h2">${t('sec.deals')}</h2>
              <p class="f-deal-text">${t('sec.dealsText')}</p>
            </div>
            <div class="f-deal-right">
              <p class="f-deal-ends">${t('cd.ends')}</p>
              ${OL.ui.countdown()}
              <a href="/sale" class="btn f-btn-dark magnetic"><span>${t('ui.shopNow')}</span>${OL.ICON.arrow}</a>
            </div>
          </div>
        </div>
      </section>

      ${L.best.length ? `<section class="f-best" id="best">
        <div class="container">
          <div class="f-head">
            <p class="eyebrow">04 / ${t('sec.bestEyebrow')}</p>
            <h2 class="f-h2" data-reveal="up">${t('sec.best')}</h2>
            <a class="f-viewall" href="/shop"><span>${t('ui.viewAll')}</span>${OL.ICON.arrow}</a>
          </div>
          <div class="f-grid pgrid" data-stagger>${L.best.map((p, i) => OL.ui.card(p, { index: i + 1 })).join('')}</div>
        </div>
      </section>` : ''}

      ${OL.ui.reviews('f-reviews')}
      ${OL.ui.news('f-news')}`;
    },

    init(root) {
      const q = (s) => root.querySelector(s);
      const qa = (s) => [...root.querySelectorAll(s)];

      /* --- intro: letters launch, shoe lands, swoosh draws --- */
      const swoosh = OL.follow(q('.f-swoosh-path'), q('.f-swoosh-head'));
      swoosh(0);
      const s = { p: 0 };
      const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      intro
        .from('.f-row .ch', { yPercent: 120, rotate: 14, duration: 1.2, stagger: .035 })
        .from('.f-disc', { scale: 0, rotate: -60, duration: 1.4, ease: 'back.out(1.3)' }, .3)
        .from('.f-disc-ring', { scale: .4, autoAlpha: 0, duration: 1.6 }, .5)
        .from('.f-shoe-img', { xPercent: -90, yPercent: 60, rotate: -40, duration: 1.6, ease: 'expo.out' }, .55)
        .to(s, { p: 1, duration: 1.8, ease: 'power3.inOut', onUpdate: () => swoosh(s.p) }, .6)
        .from('.f-price-tag', { scale: 0, rotate: 20, duration: 1, ease: 'back.out(2)' }, 1.4)
        .from(['.f-hero-top > *', '.f-hero-bottom > *'], { y: 30, autoAlpha: 0, duration: 1, stagger: .08 }, .9)
        .from('.f-hero-mark', { autoAlpha: 0, scale: 1.1, duration: 2 }, 0)
        .from('.f-progress', { autoAlpha: 0, x: 20, duration: 1 }, 1.2);

      gsap.to('.f-shoe-float', { y: -16, rotate: 2.5, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('.f-disc-ring', { rotate: 360, duration: 26, repeat: -1, ease: 'none' });

      /* --- hero scroll: rows split apart, the shoe takes off --- */
      const heroST = { trigger: '.f-hero', start: 'top top', end: 'bottom top', scrub: .6 };
      gsap.to('.f-row-1', { xPercent: -14, ease: 'none', scrollTrigger: heroST });
      gsap.to('.f-row-2', { xPercent: 12, ease: 'none', scrollTrigger: heroST });
      gsap.to('.f-row-3', { xPercent: -8, ease: 'none', scrollTrigger: heroST });
      gsap.to('.f-shoe', { x: () => innerWidth * .22, y: () => -innerHeight * .45, rotate: 24, scale: .55, ease: 'power1.in', scrollTrigger: { ...heroST, invalidateOnRefresh: true } });
      gsap.to('.f-hero-mark', { yPercent: 30, ease: 'none', scrollTrigger: heroST });

      /* --- page progress arrow --- */
      const prog = OL.follow(q('.f-prog-line'), q('.f-prog-head'));
      const pct = q('.f-prog-pct');
      prog(0);
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (st) => { prog(st.progress); pct.textContent = OL.pad(Math.round(st.progress * 100)); },
      });

      /* --- tapes: velocity-reactive marquees --- */
      const m1 = OL.runMarquee(q('.f-tape-1'), { speed: 70, dir: 1 });
      const m2 = OL.runMarquee(q('.f-tape-2'), { speed: 60, dir: -1 });
      ScrollTrigger.create({
        trigger: '.f-tapes', start: 'top bottom', end: 'bottom top',
        onUpdate: (st) => {
          const v = st.getVelocity();
          const b = Math.min(Math.abs(v) / 4, 900);
          m1 && m1.boost(b); m2 && m2.boost(b);
          const k = gsap.utils.clamp(-12, 12, v / -160);
          m1 && m1.skew(k); m2 && m2.skew(k);
        },
      });

      /* --- drops: pinned horizontal flight on desktop --- */
      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', () => {
        const track = q('.f-drops-track');
        if (!track) return;
        const bar = q('.f-drops-bar i');
        const count = q('.f-drops-count');
        const n = Math.max(1, qa('.f-drop').length);
        const dist = () => track.scrollWidth - innerWidth;
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.f-drops',
            pin: '.f-drops-pin',
            start: 'top top',
            end: () => '+=' + dist(),
            scrub: .8,
            invalidateOnRefresh: true,
            onUpdate: (st) => {
              bar.style.transform = `scaleX(${st.progress})`;
              count.textContent = `0${Math.min(n, 1 + Math.floor(st.progress * n))} / 0${n}`;
            },
          },
        });
        // cards rise and tilt as they fly into view
        qa('.f-drop').forEach((d) => {
          gsap.from(d, {
            yPercent: 18, rotate: 6, autoAlpha: 0, ease: 'power2.out',
            scrollTrigger: { trigger: d, containerAnimation: tween, start: 'left 105%', end: 'left 60%', scrub: true },
          });
        });
      });
      OL.onCleanup(() => mm.revert());

      /* --- categories: preview follows the cursor --- */
      const preview = q('.f-cat-preview');
      const pimg = preview && preview.querySelector('img');
      const list = q('.f-cat-list');
      if (preview && !OL.touch) {
        const px = gsap.quickTo(preview, 'x', { duration: .6, ease: 'power3' });
        const py = gsap.quickTo(preview, 'y', { duration: .6, ease: 'power3' });
        const rot = gsap.quickTo(preview, 'rotate', { duration: .8, ease: 'power3' });
        let lastX = 0;
        const move = (e) => { px(e.clientX); py(e.clientY); rot(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * .6)); lastX = e.clientX; };
        const enter = (e) => {
          const a = e.target.closest('.f-cat');
          if (!a) return;
          if (pimg.getAttribute('src') !== a.dataset.img) {
            pimg.src = a.dataset.img;
            gsap.fromTo(pimg, { scale: 1.3 }, { scale: 1, duration: .8, ease: 'expo.out' });
          }
          gsap.to(preview, { autoAlpha: 1, scale: 1, duration: .5, ease: 'expo.out' });
        };
        const leave = () => gsap.to(preview, { autoAlpha: 0, scale: .6, duration: .4 });
        gsap.set(preview, { autoAlpha: 0, scale: .6, xPercent: -50, yPercent: -50 });
        addEventListener('pointermove', move, { passive: true });
        list.addEventListener('pointerover', enter);
        list.addEventListener('pointerleave', leave);
        OL.onCleanup(() => { removeEventListener('pointermove', move); });
      }
      qa('.f-cat-list li').forEach((li) =>
        gsap.from(li, { yPercent: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 92%', once: true } }));

      /* --- deal band --- */
      gsap.fromTo('.f-deal-big', { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.f-deal', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.f-deal-band', { clipPath: 'polygon(0 30%, 100% 10%, 100% 70%, 0 90%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.f-deal', start: 'top 80%', once: true } });
      gsap.from('.f-deal-inner > * > *, .f-deal .cd-unit', { y: 40, autoAlpha: 0, stagger: .06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.f-deal', start: 'top 70%', once: true } });

      /* --- headings --- */
      qa('.f-drops-intro > *').forEach((el, i) =>
        gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.1, delay: i * .08, ease: 'expo.out', scrollTrigger: { trigger: '.f-drops', start: 'top 75%', once: true } }));

      return { intro };
    },
  };
})();
