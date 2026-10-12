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
export const CATEGORIES = ['running', 'lifestyle', 'basketball'];
export const GENDERS = ['men', 'women', 'kids', 'unisex'];
export const SIZE_PRESETS = {
  adult: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
  women: [35, 36, 37, 38, 39, 40, 41],
  men: [39, 40, 41, 42, 43, 44, 45, 46],
  kids: [28, 29, 30, 31, 32, 33, 34, 35],
};

export const emptyProduct = () => ({
  id: null, slug: '', slugTouched: false, brand_id: '', brand_name: '', name: '', colorway: '', sku: '',
  category: 'lifestyle', gender: 'unisex', price: '', old_price: '',
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
  const seen = new Set();
  (f.sizes || []).forEach((s, i) => {
    const eu = num(s.eu);
    if (eu == null || Number.isNaN(eu) || eu < 16 || eu > 60 || (eu * 2) % 1 !== 0) errors[`size.${i}.eu`] = 'size';
    else if (seen.has(eu)) errors[`size.${i}.eu`] = 'duplicate';
    else seen.add(eu);
    const st = num(s.stock);
    if (Number.isNaN(st) || (st != null && (st < 0 || !Number.isInteger(st)))) errors[`size.${i}.stock`] = 'stock';
    if (st == null && !s.id) errors[`size.${i}.stock`] = 'stock'; // a new size needs a quantity
    for (const k of ['us', 'cm']) {
      const v = num(s[k]);
      if (Number.isNaN(v) || (v != null && (v < 0 || v > 80))) errors[`size.${i}.${k}`] = 'number';
    }
  });
  return { ok: Object.keys(errors).length === 0, errors };
}

export const splitTags = (v) =>
  [...new Set((Array.isArray(v) ? v : String(v || '').split(/[,;\n]/)).map((s) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 30);

// form → the argument of admin_save_product(). An existing size whose quantity was not touched is
// sent with stock null so a concurrent sale is not overwritten with an old number.
export function toPayload(f) {
  return {
    id: f.id || undefined,
    slug: f.slug,
    brand_id: f.brand_id || null,
    brand_name: f.brand_id ? null : String(f.brand_name || '').trim(),
    name: String(f.name).trim(),
    colorway: String(f.colorway || '').trim() || null,
    sku: String(f.sku || '').trim() || null,
    category: f.category,
    gender: f.gender || 'unisex',
    price: parseMoney(f.price),
    old_price: parseMoney(f.old_price),
    description_ru: f.description_ru || null,
    description_uz: f.description_uz || null,
    description_en: f.description_en || null,
    tags: splitTags(f.tags),
    is_new: !!f.is_new,
    is_featured: !!f.is_featured,
    is_active: !!f.is_active,
    seo_title: String(f.seo_title || '').trim() || null,
    seo_description: String(f.seo_description || '').trim() || null,
    sizes: (f.sizes || []).map((s) => ({
      eu: num(s.eu),
      us: num(s.us),
      cm: num(s.cm),
      stock: s.id && !s.dirty ? null : (num(s.stock) ?? 0),
    })),
    images: (f.images || []).map((i) => ({ path: i.path })),
  };
}

// Reasons a product can't be bought right now. 'hidden' wins, then 'sold_out', then 'low'.
export function stockState(p) {
  const total = (p.sizes || []).reduce((n, s) => n + (Number(s.stock) || 0), 0);
  if (!p.is_active) return { state: 'hidden', total };
  if (total === 0) return { state: 'sold_out', total };
  if (total <= 3) return { state: 'low', total };
  return { state: 'ok', total };
}

export function filterProducts(list, { q = '', brand = '', category = '', state = '' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return list.filter((p) => {
    if (brand && p.brand_id !== brand) return false;
    if (category && p.category !== category) return false;
    if (state) {
      const s = stockState(p).state;
      if (state === 'active' ? s === 'hidden' : s !== state) return false;
    }
    if (!needle) return true;
    return [p.name, p.colorway, p.sku, p.brand_name, p.slug, (p.tags || []).join(' ')]
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
    L.push(`${k + 1}) ${[i.brand, i.name].filter(Boolean).join(' ')} — EU ${i.size_eu} × ${i.qty} — ${fmtMoney(i.unit_price * i.qty)}`);
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

/* ---------------------------------------------------------------- time */
export function ago(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return { unit: 'now', n: 0 };
  if (s < 3600) return { unit: 'min', n: Math.floor(s / 60) };
  if (s < 86400) return { unit: 'h', n: Math.floor(s / 3600) };
  return { unit: 'd', n: Math.floor(s / 86400) };
}
