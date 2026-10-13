/* Outlet Lounge — analytics. Nothing is loaded until the owner enters an id in the admin panel
   (Settings → Analytics): a Yandex Metrica counter number and/or a Google Analytics 4 id (G-XXXX).
   Events: view_item, add_to_cart, begin_checkout, purchase, search, click_telegram, plus a page view
   for every route change (the shop is a single-page app). */
(function () {
  const OL = window.OL;
  let ym = null; // Yandex Metrica counter id
  let ga = null; // GA4 measurement id
  let lastPath = null;

  const cfg = () => (OL.SETTINGS && OL.SETTINGS.analytics) || {};

  // a product, in the shape both services expect
  OL.itemOf = (p, extra = {}) => ({
    item_id: p.slug || p.id, item_name: [p.brand, p.name].filter(Boolean).join(' '), item_brand: p.brand, item_category: p.cat,
    price: p.price, currency: 'UZS', ...extra,
  });

  function load(src, attrs = {}) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    document.head.appendChild(s);
  }

  OL.initAnalytics = () => {
    const c = cfg();
    if (/^\d{5,12}$/.test(String(c.yandex_metrica || '')) && !ym) {
      ym = Number(c.yandex_metrica);
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = Date.now();
      load('https://mc.yandex.ru/metrika/tag.js');
      // `defer`: the first page view is sent by trackPage, like every later one
      window.ym(ym, 'init', { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    }
    if (/^G-[A-Z0-9]{4,14}$/.test(String(c.ga4 || '')) && !ga) {
      ga = String(c.ga4);
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', ga, { send_page_view: false });
      load(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`);
    }
  };

  OL.trackPage = (path) => {
    if (path === lastPath) return; // a language switch re-renders the same page
    lastPath = path;
    const url = location.origin + path;
    if (ym) window.ym(ym, 'hit', url, { title: document.title });
    if (ga) window.gtag('event', 'page_view', { page_location: url, page_title: document.title });
  };

  // name: view_item | add_to_cart | begin_checkout | purchase | search | click_telegram
  OL.track = (name, params = {}) => {
    try {
      if (ym) {
        const goal = { ...params };
        delete goal.items;
        window.ym(ym, 'reachGoal', name, goal);
      }
      if (ga) window.gtag('event', name, params);
    } catch (e) { /* analytics must never break the shop */ }
  };

  // links to Telegram (manager, bot, "ask a manager" button, order tracking)
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href*="t.me/"]');
    if (a) OL.track('click_telegram', { place: a.closest('footer') ? 'footer' : a.classList.contains('tg-fab') ? 'button' : 'page' });
  });
})();
