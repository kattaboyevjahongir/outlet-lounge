/* Small pages: /wishlist and the 404 */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);

  /* ------------------------------------------------------------ wishlist */
  const savedProducts = () => OL.state.wish.map((id) => OL.P[id]).filter(Boolean);
  const emptyHTML = () => `<div class="shop-empty">
      ${OL.ICON.heart}
      <h3>${t('wish.empty')}</h3><p>${t('wish.emptyText')}</p>
      <a class="btn btn-gold" href="/shop"><span>${t('wl.browse')}</span>${OL.ICON.arrow}</a></div>`;

  OL.pages.wishlist = {
    meta: () => ({ title: t('wl.title'), path: '/wishlist', robots: 'noindex' }),

    render() {
      const items = savedProducts();
      return `
      <section class="shop wl">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${t('crumbs.home')}</a><i>/</i><span>${t('wl.title')}</span></nav>
          <header class="shop-head">
            <p class="eyebrow" data-reveal="fade"><span class="eyebrow-line"></span>${t('wl.title')}</p>
            <h1 class="shop-title">${t('wl.title')}</h1>
            <p class="shop-count" id="wlCount">${items.length ? t('wl.count', { n: items.length }) : ''}</p>
          </header>
          <div id="wlBody">
            ${items.length ? `<div class="shop-grid pgrid" id="wlGrid">${items.map((p) => OL.ui.card(p)).join('')}</div>` : emptyHTML()}
          </div>
        </div>
      </section>`;
    },

    bind(root) {
      const page = root.querySelector('.wl');
      // the global handler toggles the saved state; afterwards drop cards that are no longer saved
      page.addEventListener('click', (e) => {
        if (!e.target.closest('.pcard-fav')) return;
        setTimeout(() => {
          const keep = new Set(OL.state.wish);
          page.querySelectorAll('.pcard').forEach((c) => { if (!keep.has(c.dataset.id)) c.remove(); });
          const left = page.querySelectorAll('.pcard').length;
          page.querySelector('#wlCount').textContent = left ? t('wl.count', { n: left }) : '';
          if (!left) page.querySelector('#wlBody').innerHTML = emptyHTML();
        }, 0);
      });
      return {};
    },
  };

  /* ------------------------------------------------------------ 404 */
  OL.pages.notfound = {
    meta: () => ({ title: t('nf.title'), robots: 'noindex' }),
    render() {
      return `
      <section class="nf">
        <div class="container">
          <p class="nf-code" aria-hidden="true">404</p>
          <h1 class="nf-title">${t('nf.title')}</h1>
          <p class="nf-text">${t('nf.text')}</p>
          <div class="nf-actions">
            <a class="btn btn-gold" href="/shop"><span>${t('nf.shop')}</span>${OL.ICON.arrow}</a>
            <a class="btn btn-ghost" href="/"><span>${t('nf.home')}</span></a>
          </div>
        </div>
      </section>`;
    },  };
})();
