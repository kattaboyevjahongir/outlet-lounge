/* Outlet Lounge — design switcher, used while the owner picks an intro style and a light palette.
   Shown only on a local preview or with ?design in the address; visitors never see it.
   Choices live in localStorage (ol:design) and are applied before first paint by the script in index.html. */
(function () {
  const OL = window.OL;
  const html = document.documentElement;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let wanted = false;
  try {
    if (new URLSearchParams(location.search).has('design')) sessionStorage.setItem('ol:designer', '1');
    wanted = sessionStorage.getItem('ol:designer') === '1';
  } catch (e) { /* private mode */ }
  if (!local && !wanted) return;

  const INTROS = [['draw', 'Logo draw'], ['shutter', 'A · Shutter'], ['film', 'B · Lookbook'], ['slash', 'C · Gold slash']];
  const LIGHTS = [['current', 'Current'], ['gallery', '1 · Gallery'], ['stone', '2 · Stone'], ['ivory', '3 · Ivory']];
  const read = () => { try { return JSON.parse(localStorage.getItem('ol:design')) || {}; } catch (e) { return {}; } };
  const save = (d) => { try { localStorage.setItem('ol:design', JSON.stringify(d)); } catch (e) { /* noop */ } };

  const box = document.createElement('div');
  box.className = 'dp';
  box.setAttribute('data-lenis-prevent', '');
  const opts = (key, list, cur) => `<div class="dp-opts">${list.map(([v, l]) => `<button type="button" data-${key}="${v}" class="${v === cur ? 'is-on' : ''}">${l}</button>`).join('')}</div>`;
  const paint = () => {
    const d = read();
    const intro = d.intro || 'draw';
    const light = d.light || 'current';
    box.innerHTML = `<div class="dp-head"><span>Design options</span><button type="button" data-min aria-label="Minimise">${box.classList.contains('is-min') ? '+' : '–'}</button></div>
      <div class="dp-body">
        <h5>Intro</h5>${opts('intro', INTROS, intro)}
        <button type="button" class="dp-play" data-play>Play intro</button>
        <h5>Light mode</h5>${opts('light', LIGHTS, light)}
        <p class="dp-note">Theme now: ${html.dataset.theme}. Picking a light option switches to light mode.</p>
      </div>`;
  };
  paint();
  document.body.appendChild(box);

  box.addEventListener('click', (e) => {
    const d = read();
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-min')) { box.classList.toggle('is-min'); return paint(); }
    if (b.dataset.intro) {
      d.intro = b.dataset.intro;
      save(d);
      html.dataset.intro = d.intro;
      return paint();
    }
    if (b.hasAttribute('data-play')) {
      // the intro plays once per visit: forget that it was seen and load the home page again
      try { sessionStorage.removeItem('ol:seen'); } catch (err) { /* noop */ }
      location.href = '/';
      return;
    }
    if (b.dataset.light) {
      d.light = b.dataset.light;
      save(d);
      html.dataset.light = d.light;
      if (html.dataset.theme !== 'light') {
        html.dataset.theme = 'light';
        OL.state.theme = 'light';
        OL.store.set('theme', 'light');
      }
      paint();
    }
  });
  // the theme button elsewhere on the page: keep the note in sync
  new MutationObserver(paint).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
})();
