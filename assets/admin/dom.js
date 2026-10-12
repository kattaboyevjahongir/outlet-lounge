// Admin panel — tiny HTML templating that escapes by default.
// html`<td>${customer.name}</td>` escapes every interpolated value; wrap trusted markup (another
// html`` result, an icon) and it is inserted as is. Customer text can never become markup.

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => MAP[c]);

class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Safe(String(s == null ? '' : s));
const part = (v) => {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === false || v == null) return '';
  return esc(v);
};
export const html = (strings, ...vals) =>
  new Safe(strings.reduce((out, s, i) => out + s + (i < vals.length ? part(vals[i]) : ''), ''));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const debounce = (fn, ms = 250) => {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
};
