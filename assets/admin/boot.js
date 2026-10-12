// Runs before the first paint: picks the theme (saved choice, else the system's) so the panel
// never flashes the wrong colours. Kept as a separate file because the admin pages allow no inline script.
(function () {
  var theme = 'dark';
  try {
    theme = localStorage.getItem('ol:admin:theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch (e) { /* private mode: keep dark */ }
  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F6F2EA' : '#0A0A0A');
})();
