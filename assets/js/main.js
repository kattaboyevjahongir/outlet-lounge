/* Outlet Lounge — boot */
(function () {
  const OL = window.OL;
  // we manage scroll ourselves (router restores it on Back/Forward)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  OL.initShell();

  // wait for the live catalog — but never longer than 2.5 s; the page then uses the built-in one
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Promise.race([OL.loadCatalog(), wait(2500)])
    .then(() => {
      OL.pruneSaved();
      OL.renderNav();
      OL.buildMega();
      OL.renderCart();
      OL.renderWish();
      OL.renderFooter(); // live contact details
      if (OL.initAnalytics) OL.initAnalytics(); // only when an id is set in the admin panel
      document.body.classList.add('is-ready');
      return OL.startRouter();
    });
})();
