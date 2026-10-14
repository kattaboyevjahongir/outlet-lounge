/* Homepage — editorial menswear: lookbook hero, departments, new arrivals, categories, how importing works, brands */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);

  const DEPTS = ['clothing', 'shoes', 'accessories'];

  // the first product photo of a department (shown on its tile); the newest item of the department
  const deptImage = (d) => {
    const p = OL.PRODUCTS.find((x) => OL.catDept(x.cat) === d && x.isNew) || OL.PRODUCTS.find((x) => OL.catDept(x.cat) === d);
    return p ? p.images[0] : '';
  };

  OL.pages.home = {
    meta: () => ({ path: '/' }),

    render() {
      const esc = OL.esc;
      const L = OL.lists();
      const hero = OL.hero();
      const counts = OL.counts();
      const cats = OL.CATEGORIES.filter((c) => counts.cat[c.slug] > 0);
      const di = OL.deliveryInfo();
      const sale = OL.PRODUCTS.filter((p) => OL.off(p) > 0).sort((a, b) => OL.off(b) - OL.off(a)).slice(0, 4);
      const brands = OL.BRANDS.slice(0, 12);
      const tg = OL.orderLogic.tgLink(OL.contacts().telegram);
      const steps = t('home.steps');

      return `
      <section class="h-hero">
        <div class="h-hero-media">${hero.image ? `<img src="${OL.pimg(hero.image, 1600, 1200)}" alt="${esc(hero.product ? `${hero.product.brand} ${hero.product.name}` : '')}" fetchpriority="high">` : ''}</div>
        <div class="container h-hero-inner">
          <div class="h-hero-copy">
            <span class="eyebrow"><i class="eyebrow-line"></i>${t('home.eyebrow')}</span>
            <h1 class="h-serif h-hero-title">${esc(t('home.title'))}</h1>
            <p class="h-hero-lead">${esc(t('home.lead'))}</p>
            <div class="h-hero-cta">
              <a href="/new" class="btn btn-gold"><span>${t('home.cta')}</span>${OL.ICON.arrow}</a>
              <a href="/clothing" class="btn btn-ghost"><span>${t('home.cta2')}</span></a>
            </div>
          </div>
        </div>
      </section>

      <section class="h-depts container" data-reveal>
        ${DEPTS.map((d) => `
        <a class="h-dept" href="/${d}">
          <span class="h-dept-media"><img src="${OL.pimg(deptImage(d), 800, 1000)}" alt="" loading="lazy" decoding="async"></span>
          <span class="h-dept-body"><b class="h-serif">${t('dept.' + d)}</b><small>${t('dept.' + d + 'Text')}</small>
            <em>${t('ui.shopNow')}${OL.ICON.arrow}</em></span>
        </a>`).join('')}
      </section>

      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.newEyebrow')}</span>
          <h2 class="h-serif">${t('home.newTitle')}</h2><p>${t('home.newText')}</p></div>
          <a class="h-more" href="/new">${t('ui.viewAll')}${OL.ICON.arrow}</a>
        </header>
        <div class="h-rail" data-reveal>${L.drops.map((p) => OL.ui.card(p)).join('')}</div>
      </section>

      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.catsEyebrow')}</span>
          <h2 class="h-serif">${t('home.catsTitle')}</h2></div>
        </header>
        <div class="h-cats" data-reveal>
          ${cats.map((cat) => {
            const p = OL.PRODUCTS.find((x) => x.cat === cat.slug);
            return `<a class="h-cat" href="${OL.catUrl(cat.slug)}"><span class="h-cat-media"><img src="${OL.pimg(p.images[0], 480, 600)}" alt="" loading="lazy" decoding="async"></span>
              <b>${esc(OL.catName(cat.slug))}</b><small>${counts.cat[cat.slug]}</small></a>`;
          }).join('')}
        </div>
      </section>

      <section class="h-abroad">
        <div class="container h-abroad-grid">
          <div class="h-abroad-copy" data-reveal>
            <span class="eyebrow"><i class="eyebrow-line"></i>${t('home.abroadEyebrow')}</span>
            <h2 class="h-serif">${t('home.abroadTitle')}</h2>
            <p>${t('home.abroadLead')}</p>
            <ol class="h-steps">${steps.map((s, i) => `<li><i>${OL.pad(i + 1)}</i><span>${esc(s)}</span></li>`).join('')}</ol>
          </div>
          <div class="h-ways" data-reveal data-delay="1">
            <div class="h-way"><b class="h-serif">${t('home.stockTitle')}</b><p>${t('home.stockText', { days: esc(di.stock_days || '1–3') })}</p></div>
            <div class="h-way is-order">${OL.ICON.plane}<b class="h-serif">${t('home.orderTitle')}</b><p>${t('home.orderText', { days: esc(di.order_days || '10–18') })}</p></div>
          </div>
        </div>
      </section>

      ${brands.length ? `
      <section class="h-brands container" data-reveal>
        <h2 class="h-serif">${t('home.brandsTitle')}</h2>
        <div class="h-brand-list">${brands.map((b) => `<a href="/brands/${OL.slug(b)}">${esc(b)}</a>`).join('')}</div>
      </section>` : ''}

      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.bestEyebrow')}</span>
          <h2 class="h-serif">${t('home.bestTitle')}</h2></div>
          <a class="h-more" href="/shop">${t('ui.viewAll')}${OL.ICON.arrow}</a>
        </header>
        <div class="pgrid" data-reveal>${L.best.slice(0, 8).map((p) => OL.ui.card(p)).join('')}</div>
      </section>

      ${sale.length ? `
      <section class="h-sec container">
        <header class="h-head" data-reveal>
          <div><span class="eyebrow"><i class="eyebrow-line"></i>${t('home.saleEyebrow')}</span>
          <h2 class="h-serif">${t('home.saleTitle')}</h2><p>${t('home.saleText')}</p></div>
          <a class="h-more" href="/sale">${t('ui.viewAll')}${OL.ICON.arrow}</a>
        </header>
        <div class="pgrid" data-reveal>${sale.map((p) => OL.ui.card(p)).join('')}</div>
      </section>` : ''}

      <section class="h-trust container" data-reveal>
        ${t('home.trust').map((x) => `<div><b>${esc(x.t)}</b><p>${esc(x.d)}</p></div>`).join('')}
      </section>

      ${tg ? `
      <section class="h-help container" data-reveal>
        <div><h2 class="h-serif">${t('home.tgTitle')}</h2><p>${t('home.tgText')}</p></div>
        <a class="btn btn-gold" href="${tg}" target="_blank" rel="noopener"><span>${t('home.tgBtn')}</span>${OL.ICON.arrow}</a>
      </section>` : ''}`;
    },
  };
})();
