/* Homepage — editorial menswear: a split opening screen (copy on a solid panel, a tall photograph beside it),
   departments, new arrivals, categories, brands, how importing works, best sellers, sale, trust, help */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);

  const DEPTS = ['clothing', 'shoes', 'accessories'];
  const motion = () => (OL.motion && OL.motion.on ? OL.motion : null);

  // the first product photo of a department (shown on its tile); the newest item of the department
  const deptImage = (d) => {
    const p = OL.PRODUCTS.find((x) => OL.catDept(x.cat) === d && x.isNew) || OL.PRODUCTS.find((x) => OL.catDept(x.cat) === d);
    return p ? p.images[0] : '';
  };

  /* --- the opening screen: copy on a solid panel, a tall photograph beside it (the owner's hero image when set) --- */
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
      return editorialTop() + shared();
    },

    bind(root) {
      if (motion()) motion().hero(root);
      return {};
    },
  };
})();
