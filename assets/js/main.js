/* Outlet Lounge — boot */
(function () {
  const OL = window.OL;
  // always start at the top so the intro plays from the hero
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  // some browsers still restore the old position after load — undo that
  addEventListener('load', () => { if (scrollY > 0 && document.getElementById('loader')) window.scrollTo(0, 0); });

  OL.initShell();
  const loader = OL.runLoader();          // brand intro (first visit of the session only)

  // wait for the live catalog — but never longer than 2.5 s; the intro covers the wait
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Promise.race([OL.loadCatalog(), wait(2500)])
    .then(() => {
      const api = OL.mount();
      OL.renderCart();
      OL.renderWish();
      return loader.then(() => api);
    })
    .then((api) => { if (api && api.intro) api.intro.play(); });
})();
