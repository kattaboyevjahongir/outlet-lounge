/* Concept 3 — "The Vault": a dark showroom, spotlit exhibits, museum labels */
(function () {
  const OL = window.OL;
  const t = (k) => OL.t(k);

  const vhead = (num, eyebrow, title, text) => `
    <div class="v-head" data-reveal="up">
      <p class="eyebrow"><span class="eyebrow-line"></span>${num} · ${eyebrow}<span class="eyebrow-line"></span></p>
      <h2 class="v-h2">${title}</h2>
      ${text ? `<p class="v-head-text">${text}</p>` : ''}
    </div>`;

  OL.concepts.vault = {
    render() {
      const P = OL.P, L = OL.LISTS;
      const hero = P.p19;
      return `
      <section class="v-hero" id="top">
        <div class="v-spot" aria-hidden="true"></div>
        <canvas class="v-dust" aria-hidden="true"></canvas>
        <div class="v-hero-inner container">
          <p class="eyebrow v-eyebrow"><span class="eyebrow-line"></span>${t('v.eyebrow')}<span class="eyebrow-line"></span></p>
          <h1 class="v-title" aria-label="${t('v.title')}"><span aria-hidden="true">${OL.chars(t('v.title'), 'vch')}</span></h1>

          <div class="v-case">
            <div class="v-case-beam" aria-hidden="true"></div>
            <div class="v-case-glass" data-cursor="${t('ui.view')}">
              <img src="${OL.img(hero.img, 1200, 900)}" alt="${hero.brand} ${hero.name}">
              <span class="v-glare" aria-hidden="true"></span>
            </div>
            <i class="v-corner tl"></i><i class="v-corner tr"></i><i class="v-corner bl"></i><i class="v-corner br"></i>
            <div class="v-plaque">
              <span>${t('v.exhibit')} 00</span>
              <b>${hero.brand} ${hero.name}</b>
              <span class="v-plaque-price">${OL.price(hero.price)}</span>
            </div>
          </div>

          <div class="v-hero-foot">
            <p class="v-lead">${t('v.lead')}</p>
            <a href="#new" class="btn btn-ghost magnetic"><span>${t('v.cta')}</span>${OL.ICON.arrow}</a>
          </div>
        </div>
        <div class="v-dark" aria-hidden="true"></div>
      </section>

      <section class="v-exhibits" id="new">
        <div class="v-ex-index" aria-hidden="true"><span class="v-ex-cur">01</span><i></i><span>0${L.vaultExhibits.length}</span></div>
        ${L.vaultExhibits.map((id, i) => {
          const p = P[id];
          return `
          <article class="v-ex${i % 2 ? ' is-flip' : ''}" data-id="${p.id}" data-i="${i}">
            <div class="v-ex-visual">
              <div class="v-ex-light" aria-hidden="true"></div>
              <div class="v-ex-frame"><img data-fly src="${OL.img(p.img, 1000, 1000)}" alt="${p.brand} ${p.name}" loading="lazy"></div>
              <div class="v-ex-pedestal" aria-hidden="true"></div>
            </div>
            <div class="v-ex-copy">
              <span class="v-ex-num" aria-hidden="true">0${i + 1}</span>
              <p class="eyebrow">${t('v.exhibit')} 0${i + 1} · ${p.brand}</p>
              <h2 class="v-ex-name">${p.name}</h2>
              <p class="v-ex-desc">${t('desc.' + p.cat)}</p>
              <dl class="v-ex-price">
                <div><dt>${t('ui.was')}</dt><dd class="v-was"><span>${OL.price(p.was)}</span></dd></div>
                <div><dt>${t('ui.now')}</dt><dd class="v-now" data-from="${p.was}" data-to="${p.price}">${OL.price(p.price)}</dd></div>
                <div class="v-off">−${OL.off(p)}%</div>
              </dl>
              <div class="v-ex-buy">
                <div class="pcard-sizes">${p.sizes.map((z, k) => `<button type="button" class="size${z.ok ? '' : ' is-out'}${k === p.sizes.findIndex((x) => x.ok) ? ' is-on' : ''}" data-size="${z.s}" ${z.ok ? '' : 'disabled'}>${z.s}</button>`).join('')}</div>
                <button type="button" class="btn btn-gold magnetic" data-add><span>${t('ui.add')}</span>${OL.ICON.arrow}</button>
              </div>
            </div>
          </article>`;
        }).join('')}
      </section>

      <section class="v-archive" id="best">
        <div class="container">
          ${vhead('II', t('sec.bestEyebrow'), t('v.archive'), t('v.archiveText'))}
          <div class="v-grid pgrid" data-stagger>${L.vaultArchive.map((id) => OL.ui.card(P[id], { tilt: false, cls: 'v-card' })).join('')}</div>
        </div>
      </section>

      <section class="v-wings" id="cats">
        <div class="container">
          ${vhead('III', t('sec.catsEyebrow'), t('v.wings'))}
          <div class="v-wing-grid">
            ${['running', 'lifestyle', 'basketball'].map((c, i) => `
              <a href="#best" class="v-wing">
                <div class="v-wing-room"><img src="${OL.img(OL.CAT_IMG[c], 800, 1000)}" alt="" loading="lazy"></div>
                <div class="v-door v-door-l"><span>${['I', 'II', 'III'][i]}</span></div>
                <div class="v-door v-door-r"></div>
                <div class="v-wing-label"><h3>${t('cat.' + c)}</h3><span>${OL.CAT_COUNT[c]} ${t('ui.models')}</span></div>
              </a>`).join('')}
          </div>
        </div>
      </section>

      <section class="v-deal" id="deals">
        <div class="container">
          <div class="v-deal-box">
            <div class="v-deal-moon" aria-hidden="true"></div>
            <p class="eyebrow"><span class="eyebrow-line"></span>IV · ${t('sec.dealsEyebrow')}<span class="eyebrow-line"></span></p>
            <h2 class="v-h2">${t('v.deal')}</h2>
            <p class="v-head-text">${t('v.dealText')}</p>
            ${OL.ui.countdown('v-cd')}
            <a href="#best" class="btn btn-gold magnetic"><span>${t('ui.shopNow')}</span>${OL.ICON.arrow}</a>
          </div>
        </div>
      </section>

      ${OL.ui.reviews('v-reviews')}
      ${OL.ui.news('v-news')}`;
    },

    init(root) {
      const q = (s) => root.querySelector(s);
      const qa = (s) => [...root.querySelectorAll(s)];
      const hero = q('.v-hero');

      /* --- intro: lights come on --- */
      const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      gsap.set(hero, { '--r': '0%' });
      intro
        .to(hero, { '--r': '160%', duration: 2.6, ease: 'power2.inOut' })
        .from('.v-case-beam', { scaleY: 0, autoAlpha: 0, transformOrigin: '50% 0%', duration: 1.6, ease: 'power3.inOut' }, .2)
        .from('.vch', { autoAlpha: 0, filter: 'blur(14px)', y: 30, duration: 1.6, stagger: .06 }, .5)
        .from('.v-eyebrow', { autoAlpha: 0, letterSpacing: '.6em', duration: 1.6 }, .6)
        .from('.v-case-glass', { scale: .86, autoAlpha: 0, duration: 1.8 }, .8)
        .from('.v-corner', { scale: 0, duration: .8, stagger: .08, ease: 'back.out(2)' }, 1.4)
        .from('.v-plaque', { y: 30, autoAlpha: 0, duration: 1.1 }, 1.6)
        .from('.v-hero-foot > *', { y: 30, autoAlpha: 0, duration: 1.1, stagger: .1 }, 1.7)
        .fromTo('.v-glare', { xPercent: -160 }, { xPercent: 260, duration: 1.8, ease: 'power2.inOut' }, 1.8);

      /* --- spotlight follows the pointer --- */
      const setX = gsap.quickTo(hero, '--mx', { duration: .9, ease: 'power3' });
      const setY = gsap.quickTo(hero, '--my', { duration: .9, ease: 'power3' });
      gsap.set(hero, { '--mx': innerWidth / 2, '--my': innerHeight * .45 });
      const move = (e) => { const r = hero.getBoundingClientRect(); setX(e.clientX - r.left); setY(e.clientY - r.top); };
      if (!OL.touch) { hero.addEventListener('pointermove', move); OL.onCleanup(() => hero.removeEventListener('pointermove', move)); }
      OL.dust(q('.v-dust'), { count: 46, rise: .12 });

      // case drifts back as you scroll into the vault
      const heroST = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.v-case', { scale: .9, yPercent: 10, ease: 'none', scrollTrigger: heroST });
      gsap.to('.v-title', { yPercent: -40, autoAlpha: .2, ease: 'none', scrollTrigger: heroST });

      /* --- exhibits: each one lights up as it arrives --- */
      const cur = q('.v-ex-cur');
      qa('.v-ex').forEach((ex, i) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ex, start: 'top 68%', once: true } });
        tl.from(ex.querySelector('.v-ex-light'), { autoAlpha: 0, scaleY: .2, transformOrigin: '50% 0%', duration: 1.4, ease: 'power3.inOut' })
          .from(ex.querySelector('.v-ex-frame'), { y: 120, autoAlpha: 0, rotate: i % 2 ? 6 : -6, duration: 1.6, ease: 'expo.out' }, '-=.9')
          .from(ex.querySelector('.v-ex-pedestal'), { scaleX: 0, duration: 1.2, ease: 'expo.out' }, '<')
          .from(ex.querySelector('.v-ex-num'), { yPercent: 50, autoAlpha: 0, duration: 1.6 }, '<')
          .from(ex.querySelectorAll('.v-ex-copy > :not(.v-ex-num)'), { y: 40, autoAlpha: 0, stagger: .08, duration: 1.1, ease: 'expo.out' }, '<.2')
          .add(() => {
            const now = ex.querySelector('.v-now');
            OL.countUp(now, Number(now.dataset.from), Number(now.dataset.to), { duration: 1.8, fmt: (v) => OL.price(Math.round(v / 1000) * 1000) });
            ex.querySelector('.v-was').classList.add('is-struck');
          }, '-=.7')
          .from(ex.querySelector('.v-off'), { scale: 0, rotate: -30, duration: .9, ease: 'back.out(2)' }, '-=.2');

        gsap.fromTo(ex.querySelector('.v-ex-frame img'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: ex, start: 'top bottom', end: 'bottom top', scrub: true } });
        ScrollTrigger.create({ trigger: ex, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) cur.textContent = OL.pad(i + 1); } });
      });
      gsap.from('.v-ex-index', { autoAlpha: 0, duration: .6, scrollTrigger: { trigger: '.v-exhibits', start: 'top 60%', end: 'bottom 40%', toggleActions: 'play reverse play reverse' } });

      /* --- archive: per-card spotlight --- */
      const grid = q('.v-grid');
      const spot = (e) => {
        const card = e.target.closest('.v-card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--sx', `${e.clientX - r.left}px`);
        card.style.setProperty('--sy', `${e.clientY - r.top}px`);
      };
      grid.addEventListener('pointermove', spot);

      /* --- wings: doors open on scroll --- */
      qa('.v-wing').forEach((w, i) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: w, start: 'top 75%', once: true } });
        tl.from(w, { y: 60, autoAlpha: 0, duration: 1.2, delay: i * .12, ease: 'expo.out' })
          .to(w.querySelector('.v-door-l'), { xPercent: -84, duration: 1.4, ease: 'power3.inOut' }, '-=.4')
          .to(w.querySelector('.v-door-r'), { xPercent: 84, duration: 1.4, ease: 'power3.inOut' }, '<')
          .from(w.querySelector('.v-wing-room img'), { scale: 1.3, duration: 1.8, ease: 'expo.out' }, '<');
      });

      /* --- night sale --- */
      gsap.from('.v-deal-box', { clipPath: 'inset(50% 50% 50% 50% round 300px)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.v-deal', start: 'top 75%', once: true } });
      gsap.from('.v-deal-box > *:not(.v-deal-moon)', { y: 40, autoAlpha: 0, stagger: .08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.v-deal', start: 'top 60%', once: true } });
      gsap.fromTo('.v-deal-moon', { yPercent: 40 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.v-deal', start: 'top bottom', end: 'bottom top', scrub: true } });

      return { intro };
    },

    initStatic(root) {
      root.querySelector('.v-hero').style.setProperty('--r', '160%');
      root.querySelectorAll('.v-was').forEach((s) => s.classList.add('is-struck'));
      root.querySelectorAll('.v-door-l').forEach((d) => (d.style.transform = 'translateX(-84%)'));
      root.querySelectorAll('.v-door-r').forEach((d) => (d.style.transform = 'translateX(84%)'));
    },
  };
})();
