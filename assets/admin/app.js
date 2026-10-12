// Admin panel — boot, sign-in, layout and routing.
// Pages live in ./pages/*.js and are loaded on demand. Everything the person may do is enforced by
// the database; this file only decides what to show.

import { html, raw, esc, $, $$ } from './dom.js';
import { t, setLang, getLang, LANGS } from './i18n.js';
import { ICON, logo, toast, errorText } from './ui.js';
import { usernameProblem, passwordProblem } from './logic.js';
import { createData, AdminError } from './data.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';
const IDLE_MS = 60 * 60 * 1000;
const POLL_MS = 30 * 1000;

const store = {
  get(k, d) { try { return localStorage.getItem(`ol:admin:${k}`) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`ol:admin:${k}`, v); } catch { /* private mode */ } },
};

const state = {
  data: null, me: null, session: null, newCount: 0, route: null, token: 0, guard: null,
  stopPoll: null, idleTimer: null, lastOverview: null, screen: 'login',
};

const root = $('#app');
const NAV = [
  { id: 'dashboard', path: '/admin', icon: ICON.dashboard },
  { id: 'orders', path: '/admin/orders', icon: ICON.orders },
  { id: 'products', path: '/admin/products', icon: ICON.products },
  { id: 'stock', path: '/admin/stock', icon: ICON.stock },
];
// owner-only screens (the database refuses managers anyway; this just keeps the menu short for them)
const NAV_OWNER = [
  { id: 'promo', path: '/admin/promo', icon: ICON.tag },
  { id: 'reports', path: '/admin/reports', icon: ICON.chart },
  { id: 'settings', path: '/admin/settings', icon: ICON.cog },
  { id: 'staff', path: '/admin/staff', icon: ICON.users },
  { id: 'activity', path: '/admin/activity', icon: ICON.list },
];
const MORE_IDS = new Set(['more', 'account', ...NAV_OWNER.map((n) => n.id)]); // all live under "More" on a phone
const PAGES = {
  dashboard: () => import('./pages/dashboard.js'),
  orders: () => import('./pages/orders.js'),
  order: () => import('./pages/order.js'),
  products: () => import('./pages/products.js'),
  product: () => import('./pages/product.js'),
  stock: () => import('./pages/stock.js'),
  promo: () => import('./pages/promo.js'),
  reports: () => import('./pages/reports.js'),
  settings: () => import('./pages/settings.js'),
  staff: () => import('./pages/staff.js'),
  activity: () => import('./pages/activity.js'),
  account: () => import('./pages/account.js'),
  more: () => import('./pages/more.js'),
};

/* ------------------------------------------------------------- theme/lang */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  store.set('theme', theme);
}
const currentTheme = () => document.documentElement.dataset.theme || 'dark';
function applyLang(lang) {
  setLang(lang);
  document.documentElement.lang = getLang();
  store.set('lang', getLang());
  document.title = t('app.name');
}

/* ----------------------------------------------------------------- routes */
function resolve(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  let m;
  if (p === '/admin') return { name: 'dashboard', nav: 'dashboard', params: {} };
  if (p === '/admin/orders') return { name: 'orders', nav: 'orders', params: {} };
  if ((m = p.match(/^\/admin\/orders\/([A-Za-z0-9-]+)$/))) return { name: 'order', nav: 'orders', params: { number: m[1] } };
  if (p === '/admin/products') return { name: 'products', nav: 'products', params: {} };
  if (p === '/admin/products/new') return { name: 'product', nav: 'products', params: { id: null } };
  if ((m = p.match(/^\/admin\/products\/([0-9a-zA-Z-]+)$/))) return { name: 'product', nav: 'products', params: { id: m[1] } };
  if (p === '/admin/stock') return { name: 'stock', nav: 'stock', params: {} };
  if ((m = p.match(/^\/admin\/(promo|reports|settings|staff|activity|account|more)$/))) return { name: m[1], nav: m[1], params: {} };
  return null;
}

async function go(path, { replace = false, force = false } = {}) {
  if (!force && state.guard && !(await state.guard())) return false;
  const url = new URL(path, location.origin);
  if (url.pathname + url.search === location.pathname + location.search) {
    await show();
    return true;
  }
  history[replace ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search);
  await show();
  return true;
}

async function show() {
  const route = resolve(location.pathname);
  if (!route) return go('/admin', { replace: true, force: true });
  const token = (state.token += 1);
  if (state.cleanup) {
    try { state.cleanup(); } catch (e) { console.error(e); }
    state.cleanup = null;
  }
  state.route = route;
  state.guard = null;
  highlightNav(route.nav);
  const view = $('#view');
  if (!view) return;
  view.setAttribute('aria-busy', 'true');
  view.innerHTML = '<div class="skeleton" aria-hidden="true"><i></i><i></i><i></i></div>';
  window.scrollTo(0, 0);
  let cleanup;
  try {
    const mod = await PAGES[route.name]();
    const ctx = pageContext(route);
    const page = await mod.default(ctx);
    if (token !== state.token) return; // another navigation won
    document.title = `${page.title} · ${t('app.name')}`;
    view.innerHTML = String(page.body);
    view.removeAttribute('aria-busy');
    state.guard = page.canLeave || null;
    cleanup = page.mount ? page.mount(view) : null;
    state.cleanup = cleanup;
  } catch (e) {
    if (token !== state.token) return;
    view.removeAttribute('aria-busy');
    handleFatal(e, view);
  }
}

function handleFatal(e, view) {
  const err = e instanceof AdminError ? e : null;
  if (err && err.code === 'auth') return signedOut('auth.idle');
  console.error(e);
  view.innerHTML = String(html`<div class="empty-state">
    <p>${err ? errorText(err) : t('common.error')}</p>
    <button class="btn btn-ghost" data-act="retry">${t('common.retry')}</button></div>`);
}

function pageContext(route) {
  return {
    data: state.data, me: state.me, params: route.params, query: new URLSearchParams(location.search),
    go, toast, state, requestOverview: pollOnce, lang: getLang(),
  };
}

/* ------------------------------------------------------------------ shell */
function renderShell() {
  const owner = state.me.role === 'owner';
  const item = (n, cls) => html`
    <a class="${cls}" href="${n.path}" data-nav="${n.id}">
      ${n.icon}<span>${t(`nav.${n.id}`)}</span>${n.id === 'orders' ? html`<b class="count" data-new-count ${state.newCount ? '' : 'hidden'}>${state.newCount}</b>` : ''}
    </a>`;
  const langs = LANGS.map((l) => html`<button type="button" class="seg ${l === getLang() ? 'is-on' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`);
  root.innerHTML = String(html`
    <div class="shell">
      <aside class="side">
        <a class="brand" href="/admin" aria-label="Outlet Lounge">${logo()}<span>OUTLET LOUNGE<small>Admin</small></span></a>
        <nav class="side-nav" aria-label="Main">
          ${NAV.map((n) => item(n, 'nav-link'))}
          ${owner ? html`<p class="side-label">${t('nav.manage')}</p>${NAV_OWNER.map((n) => item(n, 'nav-link'))}` : ''}
        </nav>
        <div class="side-foot">
          <a class="nav-link ghost" href="/" target="_blank" rel="noopener">${ICON.external}<span>${t('nav.shop')}</span></a>
          <div class="tools">
            <div class="segs" role="group" aria-label="${t('nav.language')}">${langs}</div>
            <button type="button" class="icon-btn" data-act="theme" aria-label="${t('nav.theme')}">${currentTheme() === 'dark' ? ICON.sun : ICON.moon}</button>
          </div>
          <div class="who">
            <a class="who-name" href="/admin/account" data-nav="account" title="${t('nav.account')}"><b>${state.me.name}</b><small>${t(`role.${state.me.role}`)}</small></a>
            <button type="button" class="icon-btn" data-act="signout" aria-label="${t('nav.signOut')}">${ICON.signOut}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <a class="brand" href="/admin" aria-label="Outlet Lounge">${logo()}<span>OUTLET LOUNGE</span></a>
          <div class="tools">
            <div class="segs" role="group" aria-label="${t('nav.language')}">${langs}</div>
            <button type="button" class="icon-btn" data-act="theme" aria-label="${t('nav.theme')}">${currentTheme() === 'dark' ? ICON.sun : ICON.moon}</button>
            <button type="button" class="icon-btn" data-act="signout" aria-label="${t('nav.signOut')}">${ICON.signOut}</button>
          </div>
        </header>
        <main id="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar" aria-label="Main">
        ${NAV.map((n) => item(n, 'tab'))}
        <a class="tab" href="/admin/more" data-nav="more">${ICON.more}<span>${t('nav.more')}</span></a>
      </nav>
      <div id="toasts" aria-live="polite"></div>
    </div>`);
  highlightNav(state.route && state.route.nav);
}

function highlightNav(id) {
  $$('[data-nav]').forEach((a) => {
    const n = a.dataset.nav;
    // on a phone every owner screen sits under "More"; in the sidebar each has its own item
    const on = n === id || (n === 'more' && MORE_IDS.has(id));
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function setNewCount(n) {
  state.newCount = n;
  $$('[data-new-count]').forEach((b) => { b.textContent = n; b.hidden = !n; });
  const base = document.title.replace(/^\(\d+\)\s*/, '');
  document.title = n ? `(${n}) ${base}` : base;
}

/* ---------------------------------------------------------- new orders */
let audio;
function beep() {
  if (store.get('sound', '0') !== '1') return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.45);
    o.start(); o.stop(audio.currentTime + 0.5);
  } catch { /* no audio */ }
}

async function pollOnce() {
  if (!state.data || !state.me) return null;
  try {
    const ov = await state.data.overview();
    const n = (ov.by_status && ov.by_status.new) || 0;
    const prev = state.lastOverview ? (state.lastOverview.by_status.new || 0) : null;
    state.lastOverview = ov;
    setNewCount(n);
    if (prev != null && n > prev) {
      toast(`${t('dash.newOrders')}: +${n - prev}`, 'ok');
      beep();
    }
    window.dispatchEvent(new CustomEvent('admin:overview', { detail: { overview: ov, grew: prev != null && n > prev } }));
    return ov;
  } catch (e) {
    if (e instanceof AdminError && e.code === 'auth') signedOut('auth.idle');
    return null;
  }
}
function startPolling() {
  stopPolling();
  pollOnce();
  const id = setInterval(() => { if (!document.hidden) pollOnce(); }, POLL_MS);
  const onVis = () => { if (!document.hidden) pollOnce(); };
  document.addEventListener('visibilitychange', onVis);
  state.stopPoll = () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
}
function stopPolling() {
  if (state.stopPoll) state.stopPoll();
  state.stopPoll = null;
}

/* ------------------------------------------------------------- inactivity */
function armIdle() {
  const bump = () => {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => signedOut('auth.idle', true), IDLE_MS);
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, bump, { passive: true }));
  bump();
}

/* ---------------------------------------------------------------- screens */
function screen(inner) {
  root.innerHTML = String(html`<div class="auth"><div class="auth-card">
    <div class="auth-logo">${logo()}</div>${inner}
    <div class="auth-tools"><div class="segs">${LANGS.map((l) => html`<button type="button" class="seg ${l === getLang() ? 'is-on' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`)}</div></div>
  </div><div id="toasts" aria-live="polite"></div></div>`);
}

function loginScreen(message = '', kind = 'err') {
  state.screen = 'login';
  screen(html`
    <h1>${t('auth.title')}</h1><p class="muted">${t('auth.text')}</p>
    <form id="loginForm" class="stack" novalidate>
      <label class="field"><span>${t('auth.username')}</span>
        <input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></label>
      <label class="field"><span>${t('auth.password')}</span><input type="password" name="password" autocomplete="current-password" required></label>
      <p class="form-msg ${kind}" role="alert" ${message ? '' : 'hidden'}>${message}</p>
      <button class="btn btn-gold" type="submit">${t('auth.signIn')}</button>
      <p class="muted small">${t('auth.forgotHint')}</p>
      <button class="link" type="button" data-setup hidden>${t('auth.firstSetup')}</button>
    </form>`);
  const form = $('#loginForm');
  const msg = (text, k = 'err') => {
    const p = $('.form-msg', form);
    p.textContent = text; p.className = `form-msg ${k}`; p.hidden = !text;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!username || !password) return msg(t('auth.invalid'));
    const btn = $('button[type=submit]', form);
    btn.disabled = true; btn.textContent = t('auth.signingIn');
    try {
      await state.data.signIn(username, password);
      await enter();
    } catch (err) {
      msg(err.code === 'too_many' ? t('auth.tooMany') : err.code === 'invalid_login' ? t('auth.invalid') : errorText(err));
      btn.disabled = false; btn.textContent = t('auth.signIn');
    }
  });
  // "first run" link: only while the shop has no owner yet
  const setupLink = $('[data-setup]', form);
  setupLink.addEventListener('click', () => setupScreen());
  state.data.setupStatus().then((s) => { if (s && s.open && state.screen === 'login') setupLink.hidden = false; }).catch(() => {});
}

// First run: a code goes to the managers' Telegram group; whoever can read it creates the owner.
function setupScreen() {
  state.screen = 'setup';
  screen(html`
    <h1>${t('setup.title')}</h1><p class="muted">${t('setup.text')}</p>
    <div class="stack" id="setupStep1">
      <button class="btn btn-gold" type="button" id="sendCode">${t('setup.send')}</button>
    </div>
    <form id="setupForm" class="stack" hidden novalidate>
      <label class="field"><span>${t('setup.code')}</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></label>
      <label class="field"><span>${t('setup.name')}</span><input name="name" autocomplete="name" maxlength="60"></label>
      <label class="field"><span>${t('setup.username')}</span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32"></label>
      <label class="field"><span>${t('setup.password')}</span><input type="password" name="password" autocomplete="new-password"></label>
      <button class="btn btn-gold" type="submit">${t('setup.create')}</button>
    </form>
    <p class="form-msg err" id="setupMsg" role="alert" hidden></p>
    <button class="link" type="button" data-back>${t('setup.back')}</button>`);
  const msg = $('#setupMsg');
  const say = (text, k = 'err') => { msg.textContent = text; msg.className = `form-msg ${k}`; msg.hidden = !text; };
  const form = $('#setupForm');
  $('[data-back]').addEventListener('click', () => loginScreen());

  $('#sendCode').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    say('');
    try {
      await state.data.setupSend();
      say(t('setup.sent'), 'ok');
      form.hidden = false;
      form.code.focus();
    } catch (err) {
      say({ wait: t('setup.wait'), telegram_off: t('setup.telegramOff'), closed: t('setup.closed'), too_many_requests: t('auth.tooMany') }[err.code]
        || errorText(err));
    } finally { btn.disabled = false; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    say('');
    const v = { code: form.code.value.replace(/\D/g, ''), name: form.name.value.trim(), username: form.username.value.trim().toLowerCase(), password: form.password.value };
    if (v.code.length !== 8) return say(t('pf.err.required'));
    if (v.name.length < 2) return say(t('pf.err.required'));
    if (usernameProblem(v.username)) return say(t('auth.badUsername'));
    const pw = passwordProblem(v.password);
    if (pw) return say(pw === 'short' ? t('auth.tooShort') : t('auth.weak'));
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      await state.data.setupClaim(v);
      say(t('setup.done'), 'ok');
      await state.data.signIn(v.username, v.password);
      await enter();
    } catch (err) {
      btn.disabled = false;
      if (err.code === 'invalid_code') {
        const left = err.info && err.info.attempts_left;
        say(left === undefined ? t('setup.expired') : t('setup.invalidCode', { n: left }));
      } else if (err.code === 'locked') say(t('setup.locked'));
      else if (err.code === 'username_taken') say(t('setup.taken'));
      else if (err.code === 'closed') say(t('setup.closed'));
      else if (err.code === 'invalid') say(err.info && err.info.field === 'username' ? t('auth.badUsername') : t('auth.weak'));
      else say(errorText(err));
    }
  });
}

function setPasswordScreen() {
  state.screen = 'password';
  screen(html`
    <h1>${t('auth.setTitle')}</h1><p class="muted">${t('auth.setText')}</p>
    <form id="pwForm" class="stack" novalidate>
      <input type="text" name="username" autocomplete="username" hidden>
      <label class="field"><span>${t('auth.newPassword')}</span><input type="password" name="p1" autocomplete="new-password" required autofocus></label>
      <label class="field"><span>${t('auth.repeat')}</span><input type="password" name="p2" autocomplete="new-password" required></label>
      <p class="form-msg err" role="alert" hidden></p>
      <button class="btn btn-gold" type="submit">${t('auth.setBtn')}</button>
    </form>`);
  const form = $('#pwForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = $('.form-msg', form);
    const say = (s) => { m.textContent = s; m.hidden = !s; };
    if (form.p1.value.length < 10) return say(t('auth.tooShort'));
    if (!/[A-Za-z]/.test(form.p1.value) || !/\d/.test(form.p1.value)) return say(t('auth.weak'));
    if (form.p1.value !== form.p2.value) return say(t('auth.mismatch'));
    try {
      await state.data.setPassword(form.p1.value);
      history.replaceState({}, '', '/admin');
      await enter();
    } catch (err) {
      say(err.code === 'weak_password' ? t('auth.weak') : errorText(err));
    }
  });
}

function fatalScreen(text) {
  screen(html`<h1>${t('auth.title')}</h1><p class="form-msg err">${text}</p>`);
}

/* --------------------------------------------------------------- sessions */
async function enter() {
  const session = await state.data.getSession();
  if (!session) return loginScreen();
  const me = await state.data.loadStaff(session.user.id);
  if (!me) {
    await state.data.signOut();
    return loginScreen(t('auth.noAccess'));
  }
  state.session = session;
  state.me = me;
  state.screen = 'app';
  if (state.data.touchLogin) state.data.touchLogin();
  renderShell();
  armIdle();
  startPolling();
  await show();
}

async function signedOut(messageKey, doSignOut = false) {
  stopPolling();
  state.me = null;
  state.session = null;
  state.lastOverview = null;
  if (doSignOut) { try { await state.data.signOut(); } catch { /* already gone */ } }
  loginScreen(messageKey ? t(messageKey) : '', 'err');
}

/* ----------------------------------------------------------------- events */
function wire() {
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[href]');
    if (a && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
      const href = a.getAttribute('href');
      if (/^\/admin(\/|$|\?)/.test(href) && state.me) {
        e.preventDefault();
        go(href);
        return;
      }
    }
    const lang = e.target.closest('[data-lang]');
    if (lang) {
      applyLang(lang.dataset.lang);
      if (state.me) { renderShell(); setNewCount(state.newCount); show(); } else if (state.screen === 'setup') setupScreen(); else if (state.screen === 'password') setPasswordScreen(); else loginScreen();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'theme') {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      renderShell();
      setNewCount(state.newCount);
      show();
    } else if (act.dataset.act === 'signout') {
      if (state.guard && !(await state.guard())) return;
      state.guard = null;
      await signedOut('', true);
    } else if (act.dataset.act === 'retry') {
      show();
    }
  });
  addEventListener('popstate', () => { if (state.me) show(); });
  addEventListener('beforeunload', (e) => {
    if (state.guard && state.guard.dirty && state.guard.dirty()) { e.preventDefault(); e.returnValue = ''; }
  });
}

/* ------------------------------------------------------------------- boot */
async function loadClient() {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (local && (new URLSearchParams(location.search).has('demo') || sessionStorage.getItem('ol:admin:demo'))) {
    try { sessionStorage.setItem('ol:admin:demo', '1'); } catch { /* ignore */ }
    const { createMock } = await import('./mock.js');
    return createMock();
  }
  const res = await fetch('/api/admin-config', { cache: 'no-store' });
  if (!res.ok) throw new AdminError('not_configured');
  const { url, anonKey } = await res.json();
  const { createClient } = await import(SUPABASE_JS);
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'ol-admin-auth' },
  });
  return createData({ client, supabaseUrl: url, apiBase: '' });
}

async function main() {
  applyLang(['ru', 'uz', 'en'].includes(store.get('lang')) ? store.get('lang') : 'ru');
  wire();
  // invitation / password-reset links arrive with the session in the address (#access_token=…&type=invite)
  const hash = location.hash;
  const setFlow = /type=(invite|recovery)/.test(hash);
  const linkError = /error(_code)?=/.test(hash);
  try {
    state.data = await loadClient();
  } catch (e) {
    return fatalScreen(t('auth.notConfigured'));
  }
  if (linkError) {
    history.replaceState({}, '', '/admin');
    return loginScreen(t('auth.linkExpired'));
  }
  if (setFlow) {
    const session = await state.data.getSession();
    if (session) return setPasswordScreen();
    history.replaceState({}, '', '/admin');
    return loginScreen(t('auth.linkExpired'));
  }
  state.data.onAuthChange((event) => {
    if (event === 'SIGNED_OUT' && state.me) signedOut('', false);
  });
  await enter();
}

main();
