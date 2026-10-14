// Admin panel — shared UI pieces: icons, logo, badges, formatting, toast and confirm dialog.

import { html, raw, esc, $ } from './dom.js';
import { t, getLang } from './i18n.js';
import { fmtMoney, ago } from './logic.js';

/* --------------------------------------------------------------- icons */
const svg = (d, extra = '') =>
  raw(`<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${extra}>${d}</svg>`);
export const ICON = {
  dashboard: svg('<rect x="3.5" y="3.5" width="7" height="8" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.5"/>'),
  orders: svg('<path d="M6 3.5h12l1.5 4.5V20a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V8L6 3.5Z"/><path d="M4.5 8h15"/><path d="M9 12a3 3 0 0 0 6 0"/>'),
  products: svg('<path d="M3 15.5c3.2.2 5-1.2 6.6-3.3l1.4 1.2c1 .9 2.2 1.4 3.6 1.5l4.4.4c1 .1 1.5 1.1 1.5 2v.7H3v-2.5Z"/><path d="M9.6 12.2 8.5 9.6M13.3 13.2l-1.1-2.6"/>'),
  stock: svg('<path d="M3.5 8.5 12 4l8.5 4.5V17L12 21.5 3.5 17V8.5Z"/><path d="m3.5 8.5 8.5 4.5 8.5-4.5M12 13v8.5"/>'),
  signOut: svg('<path d="M9.5 4.5h-4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4"/><path d="M15 8l4 4-4 4M19 12H9.5"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  trash: svg('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>'),
  phone: svg('<path d="M5 4.5h3.5l1.7 4.2-2.2 1.4a11 11 0 0 0 5.4 5.4l1.4-2.2 4.2 1.7V18.5a1.5 1.5 0 0 1-1.6 1.5C10.2 19.700 4.300 13.800 4 6.100A1.500 1.500 0 0 1 5 4.500Z"/>'),
  telegram: svg('<path d="M21 4 3 11.2l5.6 2 2.2 6.3 3.2-3.6 4.8 3.6L21 4Z"/><path d="m8.6 13.2 8.4-5.6"/>'),
  print: svg('<path d="M7 9V3.5h10V9M7 17.5H4.5a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v6.500a1 1 0 0 1-1 1H17"/><rect x="7" y="14" width="10" height="6.500" rx="1"/>'),
  image: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.500 5-4.500 4 3.500 3-2.500 4.500 4"/>'),
  up: svg('<path d="m6 14.500 6-6 6 6"/>'),
  down: svg('<path d="m6 9.500 6 6 6-6"/>'),
  plane: svg('<path d="M21 3.500 3 10.500l6.500 2.500L12 20l2-5.500 4 3.500L21 3.500Z"/><path d="m9.500 13 11-9.500"/>'),
  categories: svg('<rect x="3.500" y="3.500" width="7" height="7" rx="1.500"/><rect x="13.500" y="3.500" width="7" height="7" rx="1.500"/><rect x="3.500" y="13.500" width="7" height="7" rx="1.500"/><rect x="13.500" y="13.500" width="7" height="7" rx="1.500"/>'),
  left: svg('<path d="m14.500 6-6 6 6 6"/>'),
  right: svg('<path d="m9.500 6 6 6-6 6"/>'),
  check: svg('<path d="m5 12.500 4.500 4.500L19 7.500"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  bell: svg('<path d="M6 17.500V11a6 6 0 0 1 12 0v6.500l1.500 1.500h-15L6 17.500ZM10 21h4"/>'),
  external: svg('<path d="M14 4.500h5.500V10M19.500 4.500 11 13M18 14v4.500a1 1 0 0 1-1 1H5.500a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>'),
  tag: svg('<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.400l-7.300 7.300a1 1 0 0 1-1.400 0L3.500 12.200Z"/><circle cx="8" cy="8" r="1.300"/>'),
  chart: svg('<path d="M4 20V4M4 20h16"/><rect x="7.500" y="11" width="3" height="6" rx=".8"/><rect x="12.500" y="7" width="3" height="10" rx=".8"/><rect x="17.500" y="13" width="2.500" height="4" rx=".8"/>'),
  cog: svg('<circle cx="12" cy="12" r="3"/><path d="M19.400 14.500a1.700 1.700 0 0 0 .3 1.800l.1.100a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.100a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.100a1.700 1.700 0 0 0 1.800.3h0a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.100a1.700 1.700 0 0 0-.3 1.800v0a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1Z"/>'),
  users: svg('<circle cx="9" cy="8" r="3.200"/><path d="M3 20c0-3.300 2.700-6 6-6s6 2.700 6 6M16 5.200a3 3 0 0 1 0 5.600M17.500 14.300c2 .7 3.500 2.700 3.500 5.700"/>'),
  list: svg('<path d="M8.500 6.500h11M8.500 12h11M8.500 17.500h11"/><circle cx="4.500" cy="6.500" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="17.500" r="1"/>'),
  more: svg('<circle cx="5.500" cy="12" r="1.200"/><circle cx="12" cy="12" r="1.200"/><circle cx="18.500" cy="12" r="1.200"/>'),
  eye: svg('<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="2.800"/>'),
  eyeOff: svg('<path d="M4 4l16 16M9.800 5.800A9 9 0 0 1 12 5.500c6 0 9.500 6.500 9.500 6.500a15 15 0 0 1-3 3.800M6.300 7.700A15 15 0 0 0 2.500 12S6 18.500 12 18.500c1.500 0 2.800-.4 4-1M10 10a3 3 0 0 0 4 4"/>'),
};

/* ---------------------------------------------------------------- logo */
// the AAA mark + swoosh used on the shop, as one inline SVG with its own gradient
const A = (x) => `M${x + 37} 8L${x + 46} 8L${x + 81} 97L${x + 88} 97L${x + 88} 100L${x + 58} 100L${x + 58} 97L${x + 64} 97L${x + 36} 26L${x + 10} 97L${x + 16} 97L${x + 16} 100L${x - 2} 100L${x - 2} 97L${x + 4} 97Z`;
const SWOOSH = 'M8 99C70 62 150 37 236 25.5L237 29.5C152 43 74 66 8 99Z';
const HEAD = 'M232 20.5L259 22.5L235.5 35L239.5 27.5Z';
// each copy gets its own gradient id: a gradient inside a hidden copy (the desktop sidebar on a
// phone) would otherwise leave the visible copy unpainted
let logoSeq = 0;
export const logo = () => {
  const id = `adminGold${(logoSeq += 1)}`;
  return raw(`<svg class="logo-mark" viewBox="0 0 262 104" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F4E2B8"/><stop offset=".45" stop-color="#D4B078"/><stop offset="1" stop-color="#A4804C"/>
  </linearGradient></defs>
  <g fill="url(#${id})">${[6, 80, 154].map((x) => `<path d="${A(x)}"/>`).join('')}<path d="${SWOOSH}"/><path d="${HEAD}"/></g>
</svg>`);
};

/* -------------------------------------------------------------- format */
export const money = (n) => `${fmtMoney(n)} ${t('common.sum')}`;

const dtf = {};
const fmt = (opts) => {
  const key = getLang() + JSON.stringify(opts);
  return (dtf[key] ||= new Intl.DateTimeFormat(getLang() === 'uz' ? 'uz-Latn-UZ' : getLang() === 'en' ? 'en-GB' : 'ru-RU',
    { timeZone: 'Asia/Tashkent', ...opts }));
};
export const dateTime = (iso) => fmt({ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const dateTimeFull = (iso) =>
  fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const relTime = (iso) => {
  const a = ago(iso);
  return a.unit === 'now' ? t('time.now') : t(`time.${a.unit}`, { n: a.n });
};

export const phoneView = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : String(p || '');
};
export const telHref = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  return d.length >= 9 ? `tel:+${d.length === 9 ? `998${d}` : d}` : '';
};
export const tgHref = (v) => {
  const u = String(v || '').trim().replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '').replace(/^@/, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9_]{4,32}$/.test(u) ? `https://t.me/${u}` : '';
};

/* -------------------------------------------------------------- pieces */
export const statusBadge = (s) => html`<span class="badge st-${s}">${t(`status.${s}`)}</span>`;

export const photo = (data, path, w, alt = '') =>
  path ? html`<img src="${data.photoUrl(path, w)}" alt="${alt}" loading="lazy" decoding="async">`
    : html`<span class="ph-empty" aria-hidden="true">${ICON.image}</span>`;

/* --------------------------------------------------------------- toast */
let toastTimer;
export function toast(message, kind = 'ok') {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  el.textContent = message;
  box.append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  clearTimeout(toastTimer);
  const life = kind === 'err' ? 6000 : 3200;
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 300);
  }, life);
}

/* -------------------------------------------------------------- dialog */
// confirm({ title, text, ok, danger }) → Promise<boolean>
export function confirmDialog({ title, text = '', ok = t('common.yes'), danger = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dialog';
    d.innerHTML = `<form method="dialog" class="dialog-body">
        <h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
        <div class="dialog-actions">
          <button class="btn btn-ghost" value="no" autofocus>${esc(t('common.cancel'))}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-gold'}" value="yes">${esc(ok)}</button>
        </div></form>`;
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    document.body.append(d);
    d.showModal();
  });
}

// what a manager sees when they open an owner-only address (the database refuses them anyway)
export const deniedPage = () => html`<div class="empty-state"><p>${t('common.denied')}</p><a class="btn btn-ghost" href="/admin">${t('common.back')}</a></div>`;

// save bytes / text as a file the browser downloads
export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// the message shown for an AdminError code
export const errorText = (e) => {
  const code = e && e.code;
  if (code === 'offline') return t('common.offline');
  if (code === 'denied') return t('common.denied');
  if (code === 'category_in_use' || code === 'category_taken') return t(`err.${code}`);
  return t('common.error');
};
