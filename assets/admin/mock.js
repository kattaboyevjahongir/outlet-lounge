// Admin panel — an in-memory stand-in for data.js. It is only loaded on localhost with ?demo in
// the address (see app.js), so the panel can be tried and tested without an account or a database.
// It follows the same rules as the real one: status flow, stock returned on cancel, size rows kept.

import { AdminError } from './data.js';
import { SLUG_RE, nextStatuses, orderSearch, rangeStart, isUploadedPath } from './logic.js';
import { processImage } from './images.js';

const U = (id) => `https://images.unsplash.com/${id}`;
const PHOTOS = [
  'photo-1600185365483-26d7a4cc7519', 'photo-1600185365926-3a2ce3cdb9eb', 'photo-1542291026-7eec264c27ff',
  'photo-1549298916-b41d501d3772', 'photo-1606107557195-0e29a4b5b4aa', 'photo-1595950653106-6c9ebd614d3a',
  'photo-1491553895911-0055eca6402d', 'photo-1460353581641-37baddab0fa2',
];
const sizes = (list, out = []) => list.map((eu) => ({ eu, us: eu - 33, cm: Math.round((eu - 15) * 1.0), stock: out.includes(eu) ? 0 : 1 + (eu % 4) }));
const delay = (ms = 90) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

export function createMock() {
  let seq = 100;
  const uid = () => `mock-${(seq += 1)}`;
  const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

  const brands = ['Nike', 'Jordan', 'New Balance', 'adidas', 'Vans'].map((name, i) => ({ id: `b${i}`, name }));
  const brandName = (id) => (brands.find((b) => b.id === id) || {}).name || '';

  const mk = (n, name, brandIdx, cat, gender, price, old, sizeList, out, extra = {}) => ({
    id: `p${n}`, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, colorway: extra.colorway || '',
    sku: extra.sku || '', category: cat, gender, price, old_price: old, is_active: extra.is_active !== false,
    is_new: !!extra.is_new, is_featured: !!extra.is_featured, created_at: minutesAgo(n * 90), tags: extra.tags || [],
    brand_id: `b${brandIdx}`, description_ru: '', description_uz: '', description_en: '', seo_title: '', seo_description: '',
    images: [{ path: U(PHOTOS[n % PHOTOS.length]) }, { path: U(PHOTOS[(n + 3) % PHOTOS.length]) }],
    sizes: sizes(sizeList, out).map((s, i) => ({ ...s, id: `s${n}-${i}` })),
  });

  const products = [
    mk(1, 'Air Max 1 “Sunset”', 0, 'running', 'unisex', 1390000, 2190000, [40, 41, 42, 43, 44], [44], { sku: 'AM1-SUN', is_new: true }),
    mk(2, 'Air Jordan 1 Mid “Chicago Toe”', 1, 'basketball', 'unisex', 1590000, 2490000, [40, 41, 42, 43, 44], [40, 41, 42, 43, 44], { is_featured: true, tags: ['джордан', 'aj1'] }),
    mk(3, '247 “Olive Suede”', 2, 'lifestyle', 'unisex', 990000, 1690000, [39, 40, 41, 42, 43], [], { sku: 'NB247' }),
    mk(4, 'Old Skool “Burgundy”', 4, 'lifestyle', 'unisex', 590000, 990000, [39, 40, 41, 42, 43], [39, 40, 41, 42], { is_featured: true }),
    mk(5, 'Prophere “Aqua Pulse”', 3, 'running', 'unisex', 990000, 1790000, [40, 41, 42, 43], [], { is_active: false }),
    mk(6, 'Chuck 70 Hi “Cherry”', 4, 'lifestyle', 'women', 690000, 1190000, [36, 37, 38, 39, 40], []),
    mk(7, 'Dunk High “Coral Cream”', 0, 'lifestyle', 'unisex', 1390000, 2190000, [38, 39, 40, 41], [], { is_new: true }),
  ];
  // one pair left on a size, to show the low-stock list
  products[6].sizes[0].stock = 1;
  products[0].sizes[2].stock = 1;

  const mkOrder = (n, status, minutes, name, phone, delivery, items, extra = {}) => {
    const lines = items.map(([pi, si, qty]) => {
      const p = products[pi];
      const s = p.sizes[si];
      return { id: uid(), brand: brandName(p.brand_id), name: p.name, size_eu: s.eu, qty, unit_price: p.price,
        product_id: p.id, slug: p.slug, image: p.images[0].path, size_id: s.id };
    });
    const subtotal = lines.reduce((a, l) => a + l.unit_price * l.qty, 0);
    const fee = delivery === 'pickup' || subtotal >= 1500000 ? 0 : delivery === 'regions' ? 50000 : 30000;
    return {
      id: `o${n}`, number: `OL-261013-${String(4200 + n)}`, status, created_at: minutesAgo(minutes), customer_name: name,
      phone, telegram: extra.telegram || null, contact_pref: extra.pref || 'call', delivery_method: delivery,
      region: delivery === 'pickup' ? null : 'Ташкент', city: delivery === 'pickup' ? null : 'Юнусабад',
      address: delivery === 'pickup' ? null : 'ул. Навои, 12, кв 5', landmark: extra.landmark || null,
      payment_method: extra.payment || 'cash', comment: extra.comment || null, subtotal, discount: extra.discount || 0,
      delivery_fee: fee, total: subtotal - (extra.discount || 0) + fee, promo_code: extra.promo || null, lang: 'ru',
      utm: extra.utm || null, staff_note: null, tracking_no: null, items: lines,
      events: [{ id: uid(), from_status: null, to_status: 'new', note: null, actor: 'system', created_at: minutesAgo(minutes) }],
    };
  };
  const orders = [
    mkOrder(1, 'new', 4, 'Азиз Рахимов', '+998901234567', 'courier_tashkent', [[0, 1, 1]], { telegram: '@aziz_r', pref: 'telegram', landmark: 'Mega Planet', comment: 'Позвонить после 18:00' }),
    mkOrder(2, 'new', 38, 'Malika Karimova', '+998935551122', 'regions', [[3, 4, 2], [5, 1, 1]], { promo: 'LOUNGE10', discount: 120000 }),
    mkOrder(3, 'confirmed', 150, 'Jasur T.', '+998977778899', 'pickup', [[1, 0, 1]], { payment: 'card_on_delivery' }),
    mkOrder(4, 'shipped', 60 * 20, 'Dilnoza Y.', '+998909990011', 'courier_tashkent', [[2, 2, 1]], { utm: { source: 'instagram', campaign: 'story' } }),
    mkOrder(5, 'delivered', 60 * 52, 'Sardor B.', '+998946543210', 'courier_tashkent', [[6, 1, 1], [0, 0, 1]]),
    mkOrder(6, 'no_answer', 60 * 5, 'Anvar', '+998881112233', 'courier_tashkent', [[3, 0, 1]]),
    mkOrder(7, 'cancelled', 60 * 30, 'Test Buyer', '+998901110000', 'regions', [[5, 0, 1]], { comment: '<img src=x onerror=alert(1)> проверка' }),
  ];
  orders[3].events.push({ id: uid(), from_status: 'new', to_status: 'confirmed', note: 'Telegram', actor: 'telegram:Малика', created_at: minutesAgo(60 * 19) });
  orders[3].events.push({ id: uid(), from_status: 'confirmed', to_status: 'shipped', note: null, actor: 'Админ', created_at: minutesAgo(60 * 6) });

  const staff = { name: 'Демо-владелец', role: (location.search.match(/role=(manager)/) || [])[1] || 'owner' };
  const blobs = new Map();
  let signedIn = true;
  const listeners = new Set();

  const view = (p) => ({ ...clone(p), brand_name: brandName(p.brand_id) });

  return {
    mode: 'demo',
    photoUrl: (path) => blobs.get(path) || path,

    async getSession() { return signedIn ? { user: { id: 'demo' }, access_token: 'demo' } : null; },
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async signIn() { await delay(); signedIn = true; listeners.forEach((f) => f('SIGNED_IN', {})); return {}; },
    async signOut() { signedIn = false; listeners.forEach((f) => f('SIGNED_OUT', null)); },
    async sendReset() { await delay(); },
    async setPassword() { await delay(); },
    async loadStaff() { return { ...staff }; },

    async overview() {
      await delay();
      const live = orders.filter((o) => o.status !== 'cancelled');
      const day = rangeStart('today');
      const week = rangeStart('7d');
      const by_status = {};
      orders.forEach((o) => { by_status[o.status] = (by_status[o.status] || 0) + 1; });
      const inDay = live.filter((o) => o.created_at >= day);
      const inWeek = live.filter((o) => o.created_at >= week);
      const low = [];
      products.filter((p) => p.is_active).forEach((p) => p.sizes.forEach((s) => {
        if (s.stock <= 1) low.push({ product_id: p.id, slug: p.slug, name: p.name, eu: s.eu, stock: s.stock });
      }));
      low.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name) || a.eu - b.eu);
      return {
        by_status, today_orders: inDay.length, today_revenue: inDay.reduce((a, o) => a + o.total, 0),
        week_orders: inWeek.length, week_revenue: inWeek.reduce((a, o) => a + o.total, 0), notify_waiting: 2, low_stock: low.slice(0, 30),
      };
    },

    async listOrders({ q = '', status = '', range = 'all', page = 1, pageSize = 25 } = {}) {
      await delay();
      const since = rangeStart(range);
      const needle = (orderSearch(q) || '') && String(q).trim().toLowerCase();
      const digits = String(q).replace(/\D/g, '');
      let rows = orders.filter((o) => (!status || o.status === status) && (!since || o.created_at >= since));
      if (needle) {
        rows = rows.filter((o) => o.number.toLowerCase().includes(needle) || o.customer_name.toLowerCase().includes(needle)
          || (digits.length >= 3 && o.phone.replace(/\D/g, '').includes(digits)));
      }
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      const total = rows.length;
      rows = rows.slice((page - 1) * pageSize, page * pageSize).map((o) => ({
        ...clone(o), items_count: o.items.reduce((n, i) => n + i.qty, 0), items: undefined, events: undefined,
      }));
      return { rows, total };
    },
    async getOrder(number) {
      await delay();
      const o = orders.find((x) => x.number === number);
      return o ? clone(o) : null;
    },
    async setOrderStatus(orderId, status, note) {
      await delay(160);
      const o = orders.find((x) => x.id === orderId);
      if (!o) throw new AdminError('not_found');
      if (o.status === 'cancelled') throw new AdminError('order_cancelled');
      if (o.status !== status && !nextStatuses(o.status).includes(status)) throw new AdminError('invalid');
      if (status === 'cancelled') {
        o.items.forEach((i) => {
          const s = products.flatMap((p) => p.sizes).find((z) => z.id === i.size_id);
          if (s) s.stock += i.qty;
        });
      }
      o.events.push({ id: uid(), from_status: o.status, to_status: status, note: note || null, actor: staff.name, created_at: new Date().toISOString() });
      o.status = status;
      return { ok: true, status, number: o.number, telegram: 'updated' };
    },
    async saveOrderMeta(orderId, { staff_note, tracking_no }) {
      await delay();
      const o = orders.find((x) => x.id === orderId);
      o.staff_note = staff_note || null;
      o.tracking_no = tracking_no || null;
    },

    async listProducts() { await delay(); return products.map(view); },
    async getProduct(id) { await delay(); const p = products.find((x) => x.id === id); return p ? view(p) : null; },
    async listBrands() { return clone(brands); },
    async productOrderCount(id) { return orders.reduce((n, o) => n + o.items.filter((i) => i.product_id === id).length, 0); },
    async saveProduct(p) {
      await delay(200);
      if (!SLUG_RE.test(p.slug)) throw new AdminError('invalid', 'invalid:slug');
      if (products.some((x) => x.slug === p.slug && x.id !== p.id)) throw new AdminError('slug_taken');
      let brandId = p.brand_id;
      if (!brandId) {
        const hit = brands.find((b) => b.name.toLowerCase() === String(p.brand_name || '').toLowerCase());
        if (hit) brandId = hit.id;
        else { brandId = uid(); brands.push({ id: brandId, name: p.brand_name }); }
      }
      let row = products.find((x) => x.id === p.id);
      if (!row) {
        row = { id: p.id || uid(), created_at: new Date().toISOString(), sizes: [], images: [] };
        products.unshift(row);
      }
      Object.assign(row, {
        slug: p.slug, name: p.name, colorway: p.colorway || '', sku: p.sku || '', category: p.category, gender: p.gender,
        price: p.price, old_price: p.old_price, is_active: p.is_active, is_new: p.is_new, is_featured: p.is_featured,
        tags: p.tags, brand_id: brandId, description_ru: p.description_ru || '', description_uz: p.description_uz || '',
        description_en: p.description_en || '', seo_title: p.seo_title || '', seo_description: p.seo_description || '',
      });
      const old = new Map(row.sizes.map((s) => [Number(s.eu), s]));
      row.sizes = p.sizes.map((s) => {
        const prev = old.get(Number(s.eu));
        return { id: prev ? prev.id : uid(), eu: Number(s.eu), us: s.us, cm: s.cm, stock: s.stock == null ? (prev ? prev.stock : 0) : s.stock };
      }).sort((a, b) => a.eu - b.eu);
      row.images = p.images.map((i) => ({ path: i.path }));
      return { id: row.id, slug: row.slug };
    },
    async setProductActive(id, active) { await delay(); products.find((p) => p.id === id).is_active = !!active; },
    async deleteProduct(id) {
      await delay();
      if (staff.role !== 'owner') throw new AdminError('denied');
      products.splice(products.findIndex((p) => p.id === id), 1);
    },

    async setStock(sizeId, stock) {
      await delay(60);
      const s = products.flatMap((p) => p.sizes).find((z) => z.id === sizeId);
      if (!s) throw new AdminError('not_found');
      s.stock = stock;
      return s.stock;
    },
    async addSize(productId, { eu, us = null, cm = null, stock = 0 }) {
      await delay(60);
      const p = products.find((x) => x.id === productId);
      const s = { id: uid(), eu, us, cm, stock };
      p.sizes.push(s);
      p.sizes.sort((a, b) => a.eu - b.eu);
      return clone(s);
    },

    async uploadPhoto(productId, file) {
      const variants = await processImage(file); // exercises the real resize pipeline
      const path = `mock/${productId || 'new'}/${uid()}-1600.${variants[0].ext}`;
      blobs.set(path, URL.createObjectURL(variants[2].blob));
      return { path, url: blobs.get(path), sizes: variants.map((v) => v.blob.size) };
    },
    async deletePhotos(paths) { paths.filter(isUploadedPath).forEach((p) => blobs.delete(p)); },
  };
}
