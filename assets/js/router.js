/* Outlet Lounge — router: real URLs (/shop, /product/<slug> …) on one shared shell.
   The server rewrites every non-file path to index.html (vercel.json); this picks the page. */
(function () {
  const OL = (window.OL = window.OL || {});
  OL.pages = OL.pages || {};

  const ROUTES = [
    { re: /^\/(index\.html)?$/, name: 'home' },
    { re: /^\/shop\/?$/, name: 'shop', params: () => ({ collection: 'all' }) },
    { re: /^\/(new|sale|men|women|kids)\/?$/, name: 'shop', params: (m) => ({ collection: m[1] }) },
    { re: /^\/brands\/([a-z0-9-]+)\/?$/, name: 'shop', params: (m) => ({ collection: 'brand', brand: m[1] }) },
    { re: /^\/product\/([a-z0-9-]+)\/?$/, name: 'product', params: (m) => ({ slug: m[1] }) },
    { re: /^\/(delivery|returns|size-guide|authenticity|about|contacts|faq|offer|privacy)\/?$/, name: 'info', params: (m) => ({ slug: m[1] }) },
    { re: /^\/wishlist\/?$/, name: 'wishlist' },
    { re: /^\/cart\/?$/, name: 'cart' },
    { re: /^\/checkout\/?$/, name: 'checkout' },
    { re: /^\/order\/success\/?$/, name: 'success' },
  ];

  // Pure: URL → { name, params, path, search, hash }
  OL.resolve = (href, origin) => {
    const u = new URL(href, origin || 'http://localhost');
    for (const r of ROUTES) {
      const m = u.pathname.match(r.re);
      if (m) return { name: r.name, params: r.params ? r.params(m) : {}, path: u.pathname, search: u.search, hash: u.hash };
    }
    return { name: 'notfound', params: {}, path: u.pathname, search: u.search, hash: u.hash };
  };

  // Browser-side only from here on --------------------------------------
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const hasGsap = !!window.gsap;
  let current = null;
  let busy = false;
  let pending = null; // the latest navigation requested while a transition runs

  OL.route = () => current;

  // A product URL whose product doesn't exist (any more) is a 404
  const finalize = (route) => {
    if (route.name === 'product' && !OL.P[route.params.slug]) return { ...route, name: 'notfound' };
    if (route.params.collection === 'brand' && !OL.PRODUCTS.some((p) => OL.slug(p.brand) === route.params.brand)) {
      return { ...route, name: 'notfound' };
    }
    return route;
  };

  OL.setMeta = ({ title, description, image, path, robots } = {}) => {
    const full = title ? `${title} — Outlet Lounge` : OL.t('meta.title');
    document.title = full;
    const desc = description || OL.t('meta.description');
    const set = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) {
        el = document.createElement(sel.startsWith('link') ? 'link' : 'meta');
        const m = sel.match(/\[(\w+)="([^"]+)"\]/);
        if (m) el.setAttribute(m[1], m[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };
    set('meta[name="description"]', 'content', desc);
    set('meta[property="og:title"]', 'content', full);
    set('meta[property="og:description"]', 'content', desc);
    set('meta[property="og:type"]', 'content', 'website');
    set('meta[name="robots"]', 'content', robots || 'index,follow');
    if (image) set('meta[property="og:image"]', 'content', image);
    set('link[rel="canonical"]', 'href', location.origin + (path || location.pathname));
  };

  const markNav = (route) => {
    const path = route.path.replace(/\/$/, '') || '/';
    OL.$$('.main-nav a, .mobile-menu nav a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('?')[0];
      a.classList.toggle('is-active', href === path && path !== '/');
    });
  };

  const mountRoute = (route, { keepScroll = 0 } = {}) => {
    const page = OL.pages[route.name] || OL.pages.notfound;
    const api = OL.mount({ page: route.name in OL.pages ? route.name : 'notfound', ctx: route, keepScroll });
    OL.setMeta(page.meta ? page.meta(route) : {});
    if (OL.trackPage) OL.trackPage(route.path);
    markNav(route);
    document.body.dataset.page = route.name;
    return api;
  };

  const fade = (to, duration) =>
    new Promise((resolve) => {
      if (!OL.anim || !hasGsap) return resolve();
      gsap.to(['#app', '#footer'], { autoAlpha: to, duration, ease: 'power2.out', onComplete: resolve });
    });

  async function swap(route, { push = false, restoreY = 0, first = false } = {}) {
    route = finalize(route);
    if (busy && !first) { pending = [route, { push, restoreY }]; return null; }
    busy = true;
    try {
      if (OL.closeAll) OL.closeAll();
      const page = OL.pages[route.name] || OL.pages.notfound;
      const samePath = current && current.path === route.path && current.name === route.name;

      if (push) {
        history.replaceState({ ...(history.state || {}), y: window.scrollY }, '');
        history.pushState({}, '', route.path + route.search + route.hash);
      }

      // same page, only the query string changed → the page updates itself in place
      if (samePath && page.update) {
        current = route;
        page.update(route);
        OL.setMeta(page.meta ? page.meta(route) : {});
        return null;
      }

      if (!first) await fade(0, 0.22);
      current = route;
      const api = mountRoute(route, { keepScroll: restoreY });
      if (!first) {
        if (OL.anim && hasGsap) gsap.fromTo(['#app', '#footer'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out', clearProps: 'opacity,visibility' });
        if (api && api.intro) api.intro.play();
        const header = OL.$('#header');
        if (header) header.classList.remove('is-hidden');
      }
      // honour #hash on landing (home anchors)
      if (route.hash && route.name === 'home') setTimeout(() => OL.scrollTo(route.hash), 80);
      return api;
    } finally {
      busy = false;
      if (pending) {
        const [r, o] = pending;
        pending = null;
        swap(r, o);
      }
    }
  }

  OL.navigate = (href, { replace = false } = {}) => {
    const next = OL.resolve(href, location.origin);
    const same = current && next.path === current.path && next.search === current.search && next.hash === current.hash;
    if (same) { window.scrollTo({ top: 0, behavior: OL.reduced ? 'auto' : 'smooth' }); return null; }
    return swap(next, { push: !replace });
  };

  // Re-render the current page (language change) keeping the scroll position
  OL.refreshRoute = () => {
    if (!current) return null;
    const y = window.scrollY;
    return Promise.resolve(fade(0, 0.18)).then(() => {
      const api = mountRoute(current, { keepScroll: y });
      if (api && api.intro) api.intro.progress(1);
      if (OL.anim && hasGsap) gsap.fromTo(['#app', '#footer'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,visibility' });
      return api;
    });
  };

  OL.startRouter = () => {
    window.addEventListener('popstate', (e) => {
      swap(OL.resolve(location.href, location.origin), { push: false, restoreY: (e.state && e.state.y) || 0 });
    });
    return swap(OL.resolve(location.href, location.origin), { first: true });
  };
})();
