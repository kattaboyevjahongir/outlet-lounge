// Admin panel — pure helpers (no DOM, no network), unit-tested in tests/admin-logic.test.mjs.

/* ------------------------------------------------------------ statuses */
export const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'no_answer'];

// Same flow as the Telegram buttons (api/_lib/format.js FLOW): what a manager may do next.
const FLOW = {
  new: ['confirmed', 'no_answer', 'cancelled'],
  no_answer: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
export const nextStatuses = (status) => (FLOW[status] || []).slice();
export const isFinal = (status) => status === 'cancelled' || status === 'delivered';

/* --------------------------------------------------------------- money */
export const parseMoney = (v) => {
  const d = String(v == null ? '' : v).replace(/[^\d]/g, '');
  return d === '' ? null : Number(d);
};
export const fmtMoney = (n) => {
  const x = Math.round(Number(n) || 0);
  return String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace(/^/, x < 0 ? '−' : '');
};
export const discountPct = (price, old) => {
  const p = Number(price), o = Number(old);
  return o > p && p >= 0 ? Math.round((1 - p / o) * 100) : 0;
};

/* --------------------------------------------------------------- slugs */
const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', ғ: 'g', қ: 'q', ҳ: 'h',
};
export const slugify = (s) =>
  String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[ʻʼ'’‘`´]/g, '')
    .replace(/[а-яёўғқҳ]/g, (c) => CYR[c] ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* ------------------------------------------------------------ products */
export const DEPARTMENTS = ['clothing', 'shoes', 'accessories'];

// Size labels per size system, in display order. The storefront has the same lists
// (assets/js/data.js OL.SIZE_SYSTEMS); a test keeps them identical.
export const SIZE_SYSTEMS = {
  letter: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
  ru: ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62'],
  waist: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
  shoes: ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
  belt: ['85', '90', '95', '100', '105', '110', '115'],
  one: ['ONE SIZE'],
};
export const SIZE_SYSTEM_IDS = Object.keys(SIZE_SYSTEMS);
export const SIZE_LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,11}$/;
export const COLOR_GROUPS = ['black', 'white', 'grey', 'navy', 'blue', 'green', 'beige', 'brown', 'red', 'other'];
export const FITS = ['slim', 'regular', 'relaxed', 'oversized'];
// countries items are usually imported from (ISO codes; any other 2-letter code can be typed)
export const COUNTRIES = ['IT', 'FR', 'US', 'GB', 'DE', 'NL', 'ES', 'PT', 'PL', 'TR', 'AE', 'CN', 'VN', 'ID', 'KR', 'JP'];
export const LEAD_RE = /^[0-9]{1,3}([–-][0-9]{1,3})?$/;
export const STYLE_RE = /^[A-Za-z0-9._-]{1,40}$/;

// the labels of one size system as form rows (sold out until the owner types a quantity)
export const sizeRows = (system) => (SIZE_SYSTEMS[system] || SIZE_SYSTEMS.letter).map((label) => ({ label, stock: '', orderable: true }));
// position of a label in its size system (labels the system does not know come last)
const rankIn = (system, label) => {
  const i = (SIZE_SYSTEMS[system] || []).indexOf(label);
  return i < 0 ? 1000 : i;
};
const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });
// columns of the stock grid: a system's own order first, any other label after, in natural order
export const sortLabels = (labels, system) =>
  [...new Set(labels)].sort((a, b) => rankIn(system, a) - rankIn(system, b) || natural(a, b));
// where a new label goes in a product's own list: after the last label that comes before it in the
// system; a label the system does not know goes to the end. Returns the new list of labels.
export function placeLabel(labels, label, system) {
  const r = rankIn(system, label);
  if (r === 1000) return [...labels, label];
  let at = 0;
  labels.forEach((l, i) => { if (rankIn(system, l) < r) at = i + 1; });
  return [...labels.slice(0, at), label, ...labels.slice(at)];
}
export const systemOfCategory = (categories, slug) => {
  const c = (categories || []).find((x) => x.slug === slug);
  return c ? c.size_system : 'letter';
};
export const categoryDepartment = (categories, slug) => {
  const c = (categories || []).find((x) => x.slug === slug);
  return c ? c.department : '';
};
// a style code the owner would recognise, from brand + name ("Lacoste Classic Fit Polo" → LACOSTE-CLASSIC-FIT-POLO)
export const styleCodeFor = (brand, name) =>
  slugify(`${brand || ''} ${name || ''}`).toUpperCase().slice(0, 30).replace(/-+$/, '');

export const emptyProduct = () => ({
  id: null, slug: '', slugTouched: false, brand_id: '', brand_name: '', name: '',
  color: '', color_hex: '', color_group: '', style_code: '', sku: '',
  category: '', price: '', old_price: '',
  origin: '', material: '', fit: '', model_info: '', order_lead: '',
  description_ru: '', description_uz: '', description_en: '', tags: '',
  is_new: false, is_featured: false, is_active: true, seo_title: '', seo_description: '',
  sizes: [], images: [],
});

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

// -> { ok, errors: { field: code } }   (codes are mapped to text in the UI)
export function validateProduct(f) {
  const errors = {};
  if (!String(f.name || '').trim()) errors.name = 'required';
  if (!f.brand_id && !String(f.brand_name || '').trim()) errors.brand = 'required';
  if (!f.category) errors.category = 'required';
  const price = parseMoney(f.price);
  if (price == null) errors.price = 'required';
  else if (price <= 0) errors.price = 'positive';
  const old = parseMoney(f.old_price);
  if (old != null && price != null && old <= price) errors.old_price = 'above_price';
  if (!f.slug || !SLUG_RE.test(f.slug)) errors.slug = 'slug';
  if (f.color_hex && !/^#[0-9A-Fa-f]{6}$/.test(String(f.color_hex).trim())) errors.color_hex = 'hex';
  if (f.color_group && !COLOR_GROUPS.includes(f.color_group)) errors.color_group = 'invalid';
  if (f.style_code && !STYLE_RE.test(String(f.style_code).trim())) errors.style_code = 'style';
  if (f.origin && !/^[A-Za-z]{2}$/.test(String(f.origin).trim())) errors.origin = 'origin';
  if (f.fit && !FITS.includes(f.fit)) errors.fit = 'invalid';
  if (f.order_lead && !LEAD_RE.test(String(f.order_lead).trim())) errors.order_lead = 'lead';
  for (const k of ['material', 'model_info']) if (String(f[k] || '').length > 160) errors[k] = 'long';
  const seen = new Set();
  (f.sizes || []).forEach((s, i) => {
    const label = String(s.label == null ? '' : s.label).trim();
    if (!SIZE_LABEL_RE.test(label)) errors[`size.${i}.label`] = 'size';
    else if (seen.has(label)) errors[`size.${i}.label`] = 'duplicate';
    else seen.add(label);
    const st = num(s.stock);
    if (Number.isNaN(st) || (st != null && (st < 0 || !Number.isInteger(st)))) errors[`size.${i}.stock`] = 'stock';
    if (st == null && !s.id) errors[`size.${i}.stock`] = 'stock'; // a new size needs a quantity (0 is fine)
  });
  return { ok: Object.keys(errors).length === 0, errors };
}

export const splitTags = (v) =>
  [...new Set((Array.isArray(v) ? v : String(v || '').split(/[,;\n]/)).map((s) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 30);

// form → the argument of admin_save_product(). An existing size whose quantity was not touched is
// sent with stock null so a concurrent sale is not overwritten with an old number. The order of
// the size rows is the display order on the shop.
export function toPayload(f) {
  const text = (v) => String(v || '').trim() || null;
  return {
    id: f.id || undefined,
    slug: f.slug,
    brand_id: f.brand_id || null,
    brand_name: f.brand_id ? null : String(f.brand_name || '').trim(),
    name: String(f.name).trim(),
    color: text(f.color),
    color_hex: text(f.color_hex),
    color_group: text(f.color_group),
    style_code: text(f.style_code),
    sku: text(f.sku),
    category: f.category,
    price: parseMoney(f.price),
    old_price: parseMoney(f.old_price),
    origin: text(f.origin) && String(f.origin).trim().toUpperCase(),
    material: text(f.material),
    fit: text(f.fit),
    model_info: text(f.model_info),
    order_lead: text(f.order_lead),
    description_ru: f.description_ru || null,
    description_uz: f.description_uz || null,
    description_en: f.description_en || null,
    tags: splitTags(f.tags),
    is_new: !!f.is_new,
    is_featured: !!f.is_featured,
    is_active: !!f.is_active,
    seo_title: text(f.seo_title),
    seo_description: text(f.seo_description),
    sizes: (f.sizes || []).map((s) => ({
      label: String(s.label).trim(),
      orderable: s.orderable !== false,
      stock: s.id && !s.dirty ? null : (num(s.stock) ?? 0),
    })),
    images: (f.images || []).map((i) => ({ path: i.path })),
  };
}

// Other colours of the same item: products that share the style code.
export function colourSiblings(list, p) {
  const code = String((p && p.style_code) || '').trim().toLowerCase();
  if (!code) return [];
  return list.filter((x) => x.id !== p.id && String(x.style_code || '').trim().toLowerCase() === code);
}

// A copy of a product to become its next colour: same text, price, category and size rows, but no photos,
// no stock, no colour, and a new address. The style code ties it to the original.
export function duplicateAsColour(f) {
  const code = String(f.style_code || '').trim() || styleCodeFor(f.brand_name, f.name);
  return {
    ...emptyProduct(),
    ...f,
    id: null, slug: '', slugTouched: false,
    color: '', color_hex: '', color_group: '', style_code: code, sku: '',
    images: [],
    is_new: !!f.is_new, is_active: false,   // hidden until the photos are in
    sizes: (f.sizes || []).map((s) => ({ label: s.label, stock: '', orderable: s.orderable !== false })),
  };
}

/* ---------------------------------------------------------- categories */
export const emptyCategory = () => ({ slug: '', department: 'clothing', name_ru: '', name_uz: '', name_en: '', size_system: 'letter', sort: '', is_active: true, image_path: '' });
export function validateCategory(f, existingSlugs = []) {
  const errors = {};
  const slug = String(f.slug || '').trim();
  if (!SLUG_RE.test(slug)) errors.slug = 'slug';
  else if (f.isNew && existingSlugs.includes(slug)) errors.slug = 'taken';
  if (!DEPARTMENTS.includes(f.department)) errors.department = 'invalid';
  for (const k of ['name_ru', 'name_uz', 'name_en']) {
    const v = String(f[k] || '').trim();
    if (!v) errors[k] = 'required';
    else if (v.length > 60) errors[k] = 'long';
  }
  if (!SIZE_SYSTEM_IDS.includes(f.size_system)) errors.size_system = 'invalid';
  const sort = num(f.sort);
  if (f.sort !== '' && f.sort != null && (Number.isNaN(sort) || !Number.isInteger(sort) || sort < 0 || sort > 9999)) errors.sort = 'number';
  return { ok: Object.keys(errors).length === 0, errors };
}
export const categoryToRow = (f) => ({
  slug: String(f.slug).trim(),
  department: f.department,
  name_ru: String(f.name_ru).trim(),
  name_uz: String(f.name_uz).trim(),
  name_en: String(f.name_en).trim(),
  size_system: f.size_system,
  sort: num(f.sort) ?? 0,
  is_active: !!f.is_active,
  image_path: String(f.image_path || '').trim() || null,
});

// Reasons a product can't be bought right now. 'hidden' wins, then 'sold_out', then 'low'.
export function stockState(p) {
  const total = (p.sizes || []).reduce((n, s) => n + (Number(s.stock) || 0), 0);
  if (!p.is_active) return { state: 'hidden', total };
  if (total === 0) return { state: (p.sizes || []).some((s) => s.orderable === true) ? 'on_order' : 'sold_out', total };
  if (total <= 3) return { state: 'low', total };
  return { state: 'ok', total };
}

// dept: a department id; `depts` maps category slug → department (the categories table)
export function filterProducts(list, { q = '', brand = '', category = '', dept = '', depts = {}, state = '' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return list.filter((p) => {
    if (brand && p.brand_id !== brand) return false;
    if (category && p.category !== category) return false;
    if (dept && depts[p.category] !== dept) return false;
    if (state) {
      const s = stockState(p).state;
      if (state === 'active' ? s === 'hidden' : s !== state) return false;
    }
    if (!needle) return true;
    return [p.name, p.color, p.sku, p.style_code, p.brand_name, p.slug, (p.tags || []).join(' ')]
      .some((v) => String(v || '').toLowerCase().includes(needle));
  });
}

/* -------------------------------------------------------------- orders */
// PostgREST `or=` value for the search box: number, name, phone. Characters that have a meaning
// inside the filter syntax are stripped so a search can't change the query.
export function orderSearch(q) {
  const clean = String(q || '').replace(/[,()*%\\"':;]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const parts = [`number.ilike.*${clean}*`, `customer_name.ilike.*${clean}*`];
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 3) parts.push(`phone.ilike.*${digits}*`);
  return parts.join(',');
}

// start of the range as an ISO string (Asia/Tashkent has no DST, UTC+5)
export function rangeStart(range, now = new Date()) {
  const TZ = 5 * 3600 * 1000;
  const local = new Date(now.getTime() + TZ);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TZ;
  const days = { today: 0, '7d': 6, '30d': 29 }[range];
  return days == null ? null : new Date(day - days * 86400000).toISOString();
}

export function courierText(o, labels) {
  const L = [];
  L.push(`${labels.order} ${o.number}`);
  L.push(`${labels.customer}: ${o.customer_name}, ${o.phone}${o.telegram ? `, ${o.telegram}` : ''}`);
  const place = [o.region, o.city, o.address].filter(Boolean).join(', ');
  L.push(`${labels.delivery}: ${labels.deliveryName}${place ? ` — ${place}` : ''}`);
  if (o.landmark) L.push(`${labels.landmark}: ${o.landmark}`);
  L.push('');
  (o.items || []).forEach((i, k) => {
    const abroad = i.fulfilment === 'order' && labels.onOrder ? ` (${labels.onOrder})` : '';
    L.push(`${k + 1}) ${[i.brand, i.name].filter(Boolean).join(' ')} — ${i.size_label} × ${i.qty} — ${fmtMoney(i.unit_price * i.qty)}${abroad}`);
  });
  L.push('');
  L.push(`${labels.total}: ${fmtMoney(o.total)} (${labels.paymentName})`);
  if (o.comment) L.push(`${labels.comment}: ${o.comment}`);
  return L.join('\n');
}

/* --------------------------------------------------------------- photos */
export const PHOTO_WIDTHS = [1600, 800, 400];
// longest side → max, never enlarge
export function fitSize(w, h, max) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}
// stored path is the 1600 px file; the other sizes sit next to it
export const variantPath = (path, w) => String(path).replace(/-1600\.(webp|jpg)$/, `-${w}.$1`);
export const photoVariants = (path) => PHOTO_WIDTHS.map((w) => variantPath(path, w));
export const isUploadedPath = (path) => !/^https?:\/\//i.test(String(path || ''));

export function moveItem(list, from, to) {
  const out = list.slice();
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  out.splice(to, 0, out.splice(from, 1)[0]);
  return out;
}

/* ------------------------------------------------------------- sign-in */
// Staff type a username, not an e-mail. Supabase Auth wants an e-mail-shaped login, so the username
// becomes <username>@staff.outlet-lounge.invalid — a reserved domain (RFC 2606) that can never
// receive mail, so no reset message can ever be intercepted. Real e-mail addresses still work.
export const STAFF_EMAIL_DOMAIN = 'staff.outlet-lounge.invalid';
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const loginEmail = (input) => {
  const v = String(input == null ? '' : input).trim().toLowerCase();
  if (!v) return '';
  return v.includes('@') ? v : `${v}@${STAFF_EMAIL_DOMAIN}`;
};
export const usernameFromEmail = (email) => {
  const e = String(email || '').toLowerCase();
  return e.endsWith(`@${STAFF_EMAIL_DOMAIN}`) ? e.slice(0, -STAFF_EMAIL_DOMAIN.length - 1) : e;
};
// -> null | 'required' | 'format'
export const usernameProblem = (u) => {
  const v = String(u == null ? '' : u).trim().toLowerCase();
  if (!v) return 'required';
  return USERNAME_RE.test(v) ? null : 'format';
};
// the same rule Supabase enforces (config.toml): 10+ characters with letters and digits
// -> null | 'short' | 'weak'
export const passwordProblem = (pw) => {
  const v = String(pw == null ? '' : pw);
  if (v.length < 10) return 'short';
  return /[A-Za-z]/.test(v) && /\d/.test(v) ? null : 'weak';
};
// readable random password (no 0/O/1/l/I); `bytes` = a Uint8Array of random values
const PW_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generatePassword = (bytes, length = 12) => {
  let out = '';
  for (let i = 0; i < length; i += 1) out += PW_ALPHABET[bytes[i % bytes.length] % PW_ALPHABET.length];
  if (!/\d/.test(out)) out = `${out.slice(0, -1)}7`;
  if (!/[A-Za-z]/.test(out)) out = `a${out.slice(1)}`;
  return out;
};

/* ---------------------------------------------------------------- promo */
export const PROMO_RE = /^[A-Z0-9][A-Z0-9_-]{2,19}$/;
export const emptyPromo = () => ({
  id: null, code: '', type: 'percent', value: '', min_order: '', starts_at: '', ends_at: '',
  usage_limit: '', per_phone_limit: '', is_active: true,
});
const TZ_MS = 5 * 3600 * 1000;
// <input type="datetime-local"> values are shop time (Tashkent, UTC+5)
export const localToIso = (v) => (v ? new Date(`${v}:00+05:00`).toISOString() : null);
export const isoToLocal = (iso) => (iso ? new Date(new Date(iso).getTime() + TZ_MS).toISOString().slice(0, 16) : '');

export function validatePromo(f) {
  const errors = {};
  const code = String(f.code || '').trim().toUpperCase();
  if (!PROMO_RE.test(code)) errors.code = 'code';
  const value = parseMoney(f.value);
  if (value == null || value <= 0) errors.value = 'positive';
  else if (f.type === 'percent' && value > 100) errors.value = 'percent';
  const min = parseMoney(f.min_order);
  if (f.min_order !== '' && min == null) errors.min_order = 'number';
  for (const k of ['usage_limit', 'per_phone_limit']) {
    const n = parseMoney(f[k]);
    if (f[k] !== '' && (n == null || n < 1)) errors[k] = 'positive';
  }
  if (f.starts_at && f.ends_at && localToIso(f.ends_at) <= localToIso(f.starts_at)) errors.ends_at = 'range';
  return { ok: Object.keys(errors).length === 0, errors };
}
export const promoToRow = (f) => ({
  code: String(f.code).trim().toUpperCase(),
  type: f.type === 'fixed' ? 'fixed' : 'percent',
  value: parseMoney(f.value),
  min_order: parseMoney(f.min_order) || 0,
  starts_at: localToIso(f.starts_at),
  ends_at: localToIso(f.ends_at),
  usage_limit: parseMoney(f.usage_limit),
  per_phone_limit: parseMoney(f.per_phone_limit),
  is_active: !!f.is_active,
});
export function promoState(p, now = Date.now()) {
  if (!p.is_active) return 'inactive';
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return 'scheduled';
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return 'expired';
  if (p.usage_limit != null && p.used_count >= p.usage_limit) return 'used_up';
  return 'active';
}

/* ------------------------------------------------------------- settings */
export const DELIVERY_METHODS = ['courier_tashkent', 'regions', 'pickup'];
// a pasted link or @name → the bare handle
export const cleanHandle = (v) => String(v == null ? '' : v).trim()
  .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, '').replace(/^@/, '').replace(/\/+$/, '');
export function validateContacts(c) {
  const errors = {};
  const phone = String(c.phone || '').replace(/\D/g, '');
  if (c.phone && (phone.length < 9 || phone.length > 15)) errors.phone = 'phone';
  const handle = cleanHandle;
  if (c.telegram && !/^[A-Za-z0-9_]{4,32}$/.test(handle(c.telegram))) errors.telegram = 'handle';
  if (c.telegram_bot && !/^[A-Za-z0-9_]{4,32}$/.test(handle(c.telegram_bot))) errors.telegram_bot = 'handle';
  if (c.instagram && !/^[A-Za-z0-9_.]{1,30}$/.test(handle(c.instagram))) errors.instagram = 'handle';
  const mins = parseMoney(c.call_minutes);
  if (c.call_minutes !== '' && c.call_minutes != null && (mins == null || mins < 1 || mins > 600)) errors.call_minutes = 'minutes';
  if (c.hours && String(c.hours).length > 40) errors.hours = 'long';
  return { ok: Object.keys(errors).length === 0, errors };
}
export function validateDelivery(d) {
  const errors = {};
  for (const id of DELIVERY_METHODS) {
    const fee = parseMoney(d[id]);
    if (fee == null || fee < 0) errors[id] = 'fee';
  }
  if (d.free_threshold !== '' && d.free_threshold != null && parseMoney(d.free_threshold) == null) errors.free_threshold = 'fee';
  for (const k of ['stock_days', 'order_days']) {
    if (d[k] && !LEAD_RE.test(String(d[k]).trim())) errors[k] = 'days';
  }
  for (const k of ['order_note_ru', 'order_note_uz', 'order_note_en']) {
    if (String(d[k] || '').length > 300) errors[k] = 'long';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// company details used by the offer, the privacy policy and the footer
export function validateLegal(l) {
  const errors = {};
  if (l.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(l.email).trim())) errors.email = 'email';
  if (l.inn && !/^\d{9,14}$/.test(String(l.inn).replace(/\s/g, ''))) errors.inn = 'inn';
  const days = parseMoney(l.return_days);
  if (l.return_days !== '' && l.return_days != null && (days == null || days < 1 || days > 365)) errors.return_days = 'days';
  if (String(l.company || '').length > 120) errors.company = 'long';
  return { ok: Object.keys(errors).length === 0, errors };
}
// Yandex Metrica counter number and Google Analytics 4 id
export function validateAnalytics(a) {
  const errors = {};
  if (a.yandex_metrica && !/^\d{5,12}$/.test(String(a.yandex_metrica).trim())) errors.yandex_metrica = 'metrica';
  if (a.ga4 && !/^G-[A-Z0-9]{4,14}$/.test(String(a.ga4).trim().toUpperCase())) errors.ga4 = 'ga4';
  return { ok: Object.keys(errors).length === 0, errors };
}

/* --------------------------------------------------------------- charts */
// daily: [{ day, orders, revenue }] oldest first → bars scaled to the tallest day
export function chartBars(daily, height = 120) {
  const max = Math.max(1, ...daily.map((d) => Number(d.revenue) || 0));
  return daily.map((d, i) => {
    const v = Number(d.revenue) || 0;
    return { i, day: d.day, orders: d.orders, revenue: v, h: v === 0 ? 2 : Math.max(4, Math.round((v / max) * height)) };
  });
}

// { from, to } (ISO, `to` exclusive) for the report presets, in shop time
export function reportRange(preset, now = new Date()) {
  const local = new Date(now.getTime() + TZ_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const midnight = (yy, mm, dd) => new Date(Date.UTC(yy, mm, dd) - TZ_MS);
  const tomorrow = midnight(y, m, d + 1);
  const start = {
    today: midnight(y, m, d),
    '7d': midnight(y, m, d - 6),
    '30d': midnight(y, m, d - 29),
    month: midnight(y, m, 1),
    year: midnight(y, 0, 1),
  }[preset] || midnight(y, m, d - 29);
  return { from: start.toISOString(), to: tomorrow.toISOString() };
}

/* ------------------------------------------------------------ activity */
const SKIP_FIELDS = new Set(['id', 'created_at', 'updated_at', 'updated_by', 'user_id', 'slug']);
// -> { entity, action, label, changes: [{ field, from, to }] }
export function activityView(row) {
  const diff = row.diff || {};
  const changes = Object.entries(diff.changes || {})
    .filter(([k]) => !SKIP_FIELDS.has(k))
    .map(([field, [from, to]]) => ({ field, from, to }));
  return { entity: row.entity, action: row.action, label: diff.label || '', size: diff.size || null, changes };
}


/* ---------------------------------------------------------------- time */
export function ago(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return { unit: 'now', n: 0 };
  if (s < 3600) return { unit: 'min', n: Math.floor(s / 60) };
  if (s < 86400) return { unit: 'h', n: Math.floor(s / 3600) };
  return { unit: 'd', n: Math.floor(s / 86400) };
}
