/* Concept 1 — "The Gilded Lounge": quiet luxury, editorial serif, arched frames, gold dust */
(function () {
  const OL = window.OL;
  const t = (k) => OL.t(k);
  const $$ = OL.$$;

  const head = (num, eyebrow, title, link) => `
    <div class="g-head">
      <div>
        <p class="eyebrow" data-reveal="fade"><span class="g-num">${num}</span><span class="eyebrow-line"></span>${eyebrow}</p>
        <h2 class="g-h2" data-reveal="lines"><span class="line"><span class="line-in">${title}</span></span></h2>
      </div>
      ${link ? `<a href="${link}" class="g-link" data-reveal="fade"><span>${t('ui.viewAll')}</span>${OL.ICON.arrow}</a>` : ''}
    </div>`;

  OL.concepts.gilded = {
    render() {
      const P = OL.P, L = OL.LISTS;
      const deal = P.p4;
      const title = t('g.title');
      return `
      <section class="g-hero" id="top">
        <canvas class="g-dust" aria-hidden="true"></canvas>
        <div class="g-hero-grid container">
          <div class="g-hero-copy">
            <p class="eyebrow"><span class="eyebrow-line"></span>${t('g.eyebrow')}</p>
            <h1 class="g-title">
              ${title.map((l, i) => `<span class="line"><span class="line-in">${i === title.length - 1 ? `<em class="gold-text">${l}</em>` : l}</span></span>`).join('')}
            </h1>
            <p class="g-lead">${t('g.lead')}</p>
            <div class="g-ctas">
              <a href="#new" class="btn btn-gold magnetic"><span>${t('g.cta1')}</span>${OL.ICON.arrow}</a>
              <a href="#deals" class="btn btn-ghost magnetic">${t('g.cta2')}</a>
            </div>
            <ul class="g-stats">
              <li><b data-count="100" data-suffix="%">100%</b><span>${t('g.stat1')}</span></li>
              <li><b data-count="60" data-prefix="−" data-suffix="%">−60%</b><span>${t('g.stat2')}</span></li>
              <li><b data-count="40" data-suffix="+">40+</b><span>${t('g.stat3')}</span></li>
            </ul>
          </div>

          <div class="g-hero-visual">
            <div class="g-ring" data-depth="12"></div>
            <div class="g-arch" data-depth="24">
              <div class="g-arch-clip">
                <div class="g-arch-inner">
                  ${[2, 21, 31].map((i, k) => `<img class="g-slide${k === 0 ? ' is-on' : ''}" src="${OL.img(i, 1100, 1400)}" alt="" ${k ? 'loading="lazy"' : ''}>`).join('')}
                </div>
              </div>
            </div>
            <svg class="g-orbit" viewBox="0 0 620 720" aria-hidden="true" data-depth="40">
              <path class="g-orbit-path" d="M10 690C120 600 230 520 330 420S520 170 600 60"/>
              <g class="g-orbit-head">${OL.ARROW_HEAD}</g>
            </svg>
            <div class="g-seal" data-depth="50">
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <defs><path id="gSealPath" d="M100 100m-80 0a80 80 0 1 1 160 0a80 80 0 1 1-160 0"/></defs>
                <text textLength="500" lengthAdjust="spacing"><textPath href="#gSealPath">${t('g.seal')}</textPath></text>
              </svg>
              <div class="g-seal-center"><b>−60%</b><span>${t('g.badge')}</span></div>
            </div>
            <a href="#new" class="g-mini" data-depth="34">
              <img src="${OL.img(P.p1.img, 160, 160)}" alt="">
              <span><small>${P.p1.brand}</small><b>${P.p1.name}</b><em>${OL.price(P.p1.price)}</em></span>
            </a>
          </div>
        </div>
        <a href="#new" class="scroll-cue"><span>${t('ui.scroll')}</span><i></i></a>
      </section>

      <section class="g-brands">${OL.ui.marquee(OL.BRANDS, 'g-marquee')}</section>

      <section class="g-sec" id="new">
        <div class="container">
          ${head('01', t('sec.newEyebrow'), t('sec.new'), '#best')}
          <div class="g-grid pgrid" data-stagger>${L.gildedNew.map((id) => OL.ui.card(P[id])).join('')}</div>
        </div>
      </section>

      <section class="g-sec g-cats" id="cats">
        <div class="container">
          ${head('02', t('sec.catsEyebrow'), t('sec.cats'))}
          <div class="g-cat-grid">
            ${['running', 'lifestyle', 'basketball'].map((c, i) => `
              <a href="#best" class="g-cat" data-cursor="${t('ui.shopNow')}">
                <div class="g-cat-media"><img src="${OL.img(OL.CAT_IMG[c], 800, 1100)}" alt="" loading="lazy"></div>
                <div class="g-cat-info">
                  <span class="g-cat-num">0${i + 1}</span>
                  <h3>${t('cat.' + c)}</h3>
                  <span class="g-cat-count">${OL.CAT_COUNT[c]} ${t('ui.models')}</span>
                </div>
                <span class="g-cat-go">${OL.ICON.arrowUR}</span>
              </a>`).join('')}
          </div>
          <div class="g-pills" data-stagger>
            ${['men', 'women', 'kids'].map((c) => `<a href="#best" class="g-pill"><img src="${OL.img(OL.CAT_IMG[c], 120, 120)}" alt="" loading="lazy"><span>${t('cat.' + c)}</span><small>${OL.CAT_COUNT[c]}</small></a>`).join('')}
          </div>
        </div>
      </section>

      <section class="g-deal" id="deals">
        <div class="container">
          <div class="g-deal-panel" data-id="${deal.id}">
            <canvas class="g-dust g-dust-deal" aria-hidden="true"></canvas>
            <div class="g-deal-visual">
              <div class="g-deal-arch"><img data-fly src="${OL.img(deal.img, 900, 1100)}" alt="${deal.name}" loading="lazy"></div>
              <span class="g-deal-stamp"><b>−${OL.off(deal)}%</b></span>
            </div>
            <div class="g-deal-copy">
              <p class="eyebrow"><span class="g-num">03</span><span class="eyebrow-line"></span>${t('sec.dealsEyebrow')}</p>
              <h2 class="g-h2" data-reveal="lines"><span class="line"><span class="line-in">${t('sec.deals')}</span></span></h2>
              <p class="g-deal-text">${t('sec.dealsText')}</p>
              <p class="g-deal-ends">${t('cd.ends')}</p>
              ${OL.ui.countdown()}
              <div class="g-deal-product">
                <div>
                  <small>${deal.brand}</small>
                  <h3>${deal.name}</h3>
                  <div class="g-deal-price"><span class="g-deal-now" data-from="${deal.was}" data-to="${deal.price}">${OL.price(deal.price)}</span><span class="g-strike">${OL.price(deal.was)}</span></div>
                  <div class="pcard-sizes">${deal.sizes.map((z, k) => `<button type="button" class="size${z.ok ? '' : ' is-out'}${k === 1 ? ' is-on' : ''}" data-size="${z.s}" ${z.ok ? '' : 'disabled'}>${z.s}</button>`).join('')}</div>
                </div>
                <button type="button" class="btn btn-gold magnetic" data-add><span>${t('ui.add')}</span>${OL.ICON.arrow}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="g-story" id="story">
        <div class="container g-story-grid">
          <div class="g-story-media">
            <div class="g-story-arch"><img src="${OL.img(32, 900, 1200)}" alt="" loading="lazy"></div>
            <div class="g-story-small"><img src="${OL.img(18, 500, 600)}" alt="" loading="lazy"></div>
          </div>
          <div class="g-story-copy">
            <p class="eyebrow"><span class="g-num">04</span><span class="eyebrow-line"></span>${t('story.eyebrow')}</p>
            <p class="g-story-text">${OL.words(t('story.text'))}</p>
            <p class="g-sign">— ${t('story.sign')}</p>
          </div>
        </div>
      </section>

      <section class="g-sec" id="best">
        <div class="container">
          ${head('05', t('sec.bestEyebrow'), t('sec.best'), '#new')}
          <div class="g-grid pgrid" data-stagger>${L.gildedBest.map((id) => OL.ui.card(P[id])).join('')}</div>
        </div>
      </section>

      ${OL.ui.reviews('g-reviews')}
      ${OL.ui.news('g-news')}`;
    },

    init(root) {
      const q = (s) => root.querySelector(s);
      const qa = (s) => [...root.querySelectorAll(s)];

      /* --- hero slideshow --- */
      const slides = qa('.g-slide');
      gsap.set(slides.slice(1), { autoAlpha: 0 });
      let cur = 0;
      const id = setInterval(() => {
        const a = slides[cur];
        cur = (cur + 1) % slides.length;
        const b = slides[cur];
        gsap.to(a, { autoAlpha: 0, scale: 1.05, duration: 1.6, ease: 'power2.inOut' });
        gsap.fromTo(b, { autoAlpha: 0, scale: 1.18 }, { autoAlpha: 1, scale: 1, duration: 2.4, ease: 'power2.out' });
      }, 5000);
      OL.onCleanup(() => clearInterval(id));

      /* --- intro timeline --- */
      const orbit = OL.follow(q('.g-orbit-path'), q('.g-orbit-head'));
      orbit(0);
      const o = { p: 0 };
      const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      intro
        .from('.g-arch-clip', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
        .from('.g-slide.is-on', { scale: 1.45, duration: 2.4 }, '<.1')
        .from('.g-title .line-in', { yPercent: 118, rotate: 4, duration: 1.4, stagger: .12 }, .35)
        .from(['.g-hero .eyebrow', '.g-lead', '.g-ctas > *', '.g-stats li'], { y: 30, autoAlpha: 0, duration: 1.1, stagger: .07 }, .75)
        .from('.g-ring', { autoAlpha: 0, scale: .92, duration: 1.6 }, .9)
        .to(o, { p: 1, duration: 2, ease: 'power2.inOut', onUpdate: () => orbit(o.p) }, 1)
        .from('.g-seal', { scale: 0, rotate: -140, duration: 1.4, ease: 'back.out(1.5)' }, 1.3)
        .from('.g-mini', { x: -40, autoAlpha: 0, duration: 1.2 }, 1.6)
        .from('.scroll-cue', { autoAlpha: 0, duration: 1 }, 2)
        .add(() => {
          qa('.g-stats b').forEach((b) => {
            const d = b.dataset;
            OL.countUp(b, 0, Number(d.count), { duration: 2, fmt: (v) => `${d.prefix || ''}${Math.round(v)}${d.suffix || ''}` });
          });
        }, 1.1);

      /* --- ambient + pointer parallax --- */
      gsap.to('.g-seal svg', { rotate: 360, duration: 40, repeat: -1, ease: 'none' });
      OL.dust(q('.g-hero .g-dust'), { count: 70 });
      OL.dust(q('.g-dust-deal'), { count: 40, rise: .18 });

      const hero = q('.g-hero');
      const layers = qa('.g-hero [data-depth]').map((el) => ({
        d: Number(el.dataset.depth),
        x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }),
      }));
      const onMove = (e) => {
        const px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
        layers.forEach((l) => { l.x(px * l.d); l.y(py * l.d); });
      };
      if (!OL.touch) { hero.addEventListener('pointermove', onMove); OL.onCleanup(() => hero.removeEventListener('pointermove', onMove)); }

      /* --- scroll: hero --- */
      const heroST = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.g-arch-inner', { yPercent: 12, ease: 'none', scrollTrigger: heroST });
      gsap.to('.g-hero-copy', { y: -90, autoAlpha: .2, ease: 'none', scrollTrigger: heroST });
      gsap.to('.g-orbit', { yPercent: -18, ease: 'none', scrollTrigger: heroST });

      /* --- categories: staggered arch reveals --- */
      qa('.g-cat').forEach((c, i) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.g-cat-grid', start: 'top 82%', once: true } });
        tl.from(c.querySelector('.g-cat-media'), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', delay: i * .14 })
          .from(c.querySelector('img'), { scale: 1.4, duration: 2, ease: 'expo.out' }, '<.2')
          .from(c.querySelectorAll('.g-cat-info > *'), { y: 30, autoAlpha: 0, stagger: .06, duration: 1, ease: 'expo.out' }, '<.5');
        gsap.to(c.querySelector('img'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      /* --- deal panel --- */
      const dealTl = gsap.timeline({ scrollTrigger: { trigger: '.g-deal-panel', start: 'top 75%', once: true } });
      dealTl
        .from('.g-deal-panel', { clipPath: 'inset(8% 6% 8% 6% round 40px)', duration: 1.6, ease: 'expo.inOut' })
        .from('.g-deal-arch', { yPercent: 30, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, '-=.9')
        .from('.g-deal-stamp', { scale: 0, rotate: -180, duration: 1.2, ease: 'back.out(1.6)' }, '-=.8')
        .from(['.g-deal-copy .eyebrow', '.g-deal-text', '.g-deal-ends', '.g-deal .cd-unit', '.g-deal-product'], { y: 30, autoAlpha: 0, stagger: .07, duration: 1, ease: 'expo.out' }, '-=1.1')
        .add(() => {
          const now = q('.g-deal-now');
          OL.countUp(now, Number(now.dataset.from), Number(now.dataset.to), { duration: 2.2, fmt: (v) => OL.price(Math.round(v / 1000) * 1000) });
          q('.g-strike').classList.add('is-struck');
        }, '-=.6');
      gsap.to('.g-deal-arch img', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.g-deal', start: 'top bottom', end: 'bottom top', scrub: true } });

      /* --- story: words light up as you read --- */
      const words = qa('.g-story-text .wd');
      gsap.set(words, { opacity: .14 });
      gsap.to(words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '.g-story-text', start: 'top 80%', end: 'bottom 45%', scrub: true } });
      gsap.from('.g-story-arch', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.g-story', start: 'top 75%', once: true } });
      gsap.fromTo('.g-story-arch img', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.g-story', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo('.g-story-small', { yPercent: 40 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.g-story', start: 'top bottom', end: 'bottom top', scrub: true } });

      /* --- marquee --- */
      const mq = OL.runMarquee(q('.g-marquee'), { speed: 40 });
      ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', onUpdate: (s) => mq && mq.boost(Math.min(Math.abs(s.getVelocity()) / 8, 400)) });

      return { intro };
    },

    initStatic(root) {
      root.querySelectorAll('.g-strike').forEach((s) => s.classList.add('is-struck'));
    },
  };
})();
