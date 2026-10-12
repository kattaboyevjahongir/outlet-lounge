/* Outlet Lounge — boot */
(function () {
  const OL = window.OL;
  // always start at the top so the intro plays from the hero
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  // some browsers still restore the old position after load — undo that
  addEventListener('load', () => { if (scrollY > 0 && document.getElementById('loader')) window.scrollTo(0, 0); });

  OL.initShell();
  const api = OL.mount(OL.state.concept);
  OL.runLoader().then(() => {
    if (api.intro) api.intro.play();
  });
})();
