// Admin panel — the data layer. Every screen talks to this object only; there is a second
// implementation with the same methods in mock.js (used for local demos and tests).
// Access control is NOT done here: the database (row level security + the functions in
// supabase/migrations/20261014000000_admin.sql) decides what a signed-in person may do.

import { orderSearch, rangeStart, variantPath, photoVariants, isUploadedPath } from './logic.js';
import { processImage } from './images.js';

export class AdminError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail || '';
  }
}

// Supabase / PostgREST / fetch errors → one of our codes
export function mapError(e) {
  if (e instanceof AdminError) return e;
  const msg = String((e && (e.message || e.error_description)) || e || '');
  const code = String((e && e.code) || '');
  if (code === '23505' || /duplicate key|unique/i.test(msg)) return new AdminError('slug_taken', msg);
  if (code === '42501' || /permission denied|row-level security|forbidden/i.test(msg)) return new AdminError('denied', msg);
  if (code === 'PGRST301' || /jwt|not authenticated|invalid refresh token/i.test(msg)) return new AdminError('auth', msg);
  if (/invalid:/.test(msg)) return new AdminError('invalid', msg);
  if (/order_cancelled/.test(msg)) return new AdminError('order_cancelled', msg);
  if (e instanceof TypeError || /failed to fetch|network|load failed/i.test(msg)) return new AdminError('offline', msg);
  return new AdminError('unknown', msg);
}

const ORDER_LIST_COLUMNS =
  'id,number,status,customer_name,phone,total,delivery_method,payment_method,created_at,order_items(qty)';
const PRODUCT_LIST_COLUMNS =
  'id,slug,name,colorway,sku,category,gender,price,old_price,is_active,is_new,is_featured,created_at,tags,' +
  'brand_id,brands(name),product_images(path,sort,is_main),product_sizes(id,eu,us,cm,stock)';

const asNumber = (v) => (v == null ? null : Number(v));

export function normalizeProduct(r) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    colorway: r.colorway || '',
    sku: r.sku || '',
    category: r.category,
    gender: r.gender,
    price: r.price,
    old_price: r.old_price,
    is_active: !!r.is_active,
    is_new: !!r.is_new,
    is_featured: !!r.is_featured,
    created_at: r.created_at,
    tags: r.tags || [],
    brand_id: r.brand_id,
    brand_name: r.brands ? r.brands.name : '',
    description_ru: r.description_ru || '',
    description_uz: r.description_uz || '',
    description_en: r.description_en || '',
    seo_title: r.seo_title || '',
    seo_description: r.seo_description || '',
    images: [...(r.product_images || [])]
      .sort((a, b) => a.sort - b.sort)
      .map((i) => ({ path: i.path })),
    sizes: [...(r.product_sizes || [])]
      .sort((a, b) => Number(a.eu) - Number(b.eu))
      .map((s) => ({ id: s.id, eu: Number(s.eu), us: asNumber(s.us), cm: asNumber(s.cm), stock: s.stock })),
  };
}

export function createData({ client, supabaseUrl, apiBase = '' }) {
  const check = (res) => {
    if (res.error) throw mapError(res.error);
    return res.data;
  };
  const photoUrl = (path, width = 800) => {
    if (!path) return '';
    if (!isUploadedPath(path)) return path;
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${variantPath(path, width)}`;
  };
  const bucket = () => client.storage.from('product-images');

  return {
    mode: 'live',
    photoUrl,

    /* ---------------------------------------------------------- auth */
    async getSession() {
      const { data } = await client.auth.getSession();
      return data.session || null;
    },
    onAuthChange(cb) {
      const { data } = client.auth.onAuthStateChange((event, session) => cb(event, session));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.status === 429 || /rate limit/i.test(error.message)) throw new AdminError('too_many');
        throw new AdminError(/invalid/i.test(error.message) ? 'invalid_login' : 'unknown', error.message);
      }
      return data.session;
    },
    async signOut() {
      await client.auth.signOut();
    },
    async sendReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin` });
      if (error && (error.status === 429 || /rate limit/i.test(error.message))) throw new AdminError('too_many');
    },
    async setPassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw new AdminError(/weak|short|least/i.test(error.message) ? 'weak_password' : 'unknown', error.message);
    },
    // the signed-in person's staff row (null = signed in but not staff / deactivated)
    async loadStaff(userId) {
      const r = await client.from('staff').select('name,role,is_active').eq('user_id', userId).maybeSingle();
      const row = check(r);
      return row && row.is_active ? { name: row.name, role: row.role } : null;
    },

    /* ----------------------------------------------------- dashboard */
    async overview() {
      return check(await client.rpc('admin_overview'));
    },

    /* --------------------------------------------------------- orders */
    async listOrders({ q = '', status = '', range = 'all', page = 1, pageSize = 25 } = {}) {
      let query = client.from('orders').select(ORDER_LIST_COLUMNS, { count: 'exact' }).order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const since = rangeStart(range);
      if (since) query = query.gte('created_at', since);
      const or = orderSearch(q);
      if (or) query = query.or(or);
      const from = (page - 1) * pageSize;
      const res = await query.range(from, from + pageSize - 1);
      if (res.error) throw mapError(res.error);
      return {
        total: res.count || 0,
        rows: res.data.map((o) => ({
          ...o,
          items_count: (o.order_items || []).reduce((n, i) => n + i.qty, 0),
        })),
      };
    },

    async getOrder(number) {
      const res = await client
        .from('orders')
        .select('*,order_items(*,products(slug,product_images(path,sort,is_main))),order_events(*),promo_codes(code)')
        .eq('number', number)
        .maybeSingle();
      const o = check(res);
      if (!o) return null;
      return {
        ...o,
        promo_code: o.promo_codes ? o.promo_codes.code : null,
        items: (o.order_items || []).map((i) => {
          const imgs = (i.products && i.products.product_images) || [];
          const main = [...imgs].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort - b.sort)[0];
          return {
            id: i.id,
            brand: i.brand_snapshot || '',
            name: i.name_snapshot,
            size_eu: Number(i.size_eu),
            qty: i.qty,
            unit_price: i.unit_price,
            product_id: i.product_id,
            slug: i.products ? i.products.slug : null,
            image: main ? main.path : null,
          };
        }),
        events: [...(o.order_events || [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      };
    },

    // Goes through the server so the Telegram message is updated in the same step.
    async setOrderStatus(orderId, status, note) {
      const session = await this.getSession();
      if (!session) throw new AdminError('auth');
      let res;
      try {
        res = await fetch(`${apiBase}/api/admin-order-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ order_id: orderId, status, note: note || undefined }),
        });
      } catch (e) {
        throw new AdminError('offline');
      }
      const body = await res.json().catch(() => ({}));
      if (res.ok) return body;
      const map = { 401: 'auth', 403: 'denied', 404: 'not_found', 409: 'order_cancelled', 429: 'too_many' };
      throw new AdminError(map[res.status] || 'unknown', body.error);
    },

    async saveOrderMeta(orderId, { staff_note, tracking_no }) {
      const res = await client
        .from('orders')
        .update({ staff_note: staff_note || null, tracking_no: tracking_no || null })
        .eq('id', orderId)
        .select('id');
      if (check(res).length === 0) throw new AdminError('denied');
    },

    /* ------------------------------------------------------- products */
    async listProducts() {
      const res = await client.from('products').select(PRODUCT_LIST_COLUMNS).order('created_at', { ascending: false });
      return check(res).map(normalizeProduct);
    },
    async getProduct(id) {
      const res = await client
        .from('products')
        .select('*,brands(name),product_images(path,sort,is_main),product_sizes(id,eu,us,cm,stock)')
        .eq('id', id)
        .maybeSingle();
      const row = check(res);
      return row ? normalizeProduct(row) : null;
    },
    async listBrands() {
      const res = await client.from('brands').select('id,name').order('name');
      return check(res);
    },
    async productOrderCount(id) {
      const res = await client.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id);
      if (res.error) throw mapError(res.error);
      return res.count || 0;
    },
    async saveProduct(payload) {
      return check(await client.rpc('admin_save_product', { p: payload }));
    },
    async setProductActive(id, active) {
      const res = await client.from('products').update({ is_active: !!active }).eq('id', id).select('id');
      if (check(res).length === 0) throw new AdminError('denied');
    },
    async deleteProduct(id) {
      const before = await this.getProduct(id);
      const res = await client.from('products').delete().eq('id', id).select('id');
      if (check(res).length === 0) throw new AdminError('denied'); // managers can't delete (owner only)
      if (before) await this.deletePhotos(before.images.map((i) => i.path));
    },

    /* ----------------------------------------------------------- stock */
    async setStock(sizeId, stock) {
      const res = await client.from('product_sizes').update({ stock }).eq('id', sizeId).select('id,stock');
      const rows = check(res);
      if (!rows.length) throw new AdminError('denied');
      return rows[0].stock;
    },
    async addSize(productId, { eu, us = null, cm = null, stock = 0 }) {
      const res = await client.from('product_sizes').insert({ product_id: productId, eu, us, cm, stock }).select('id,eu,us,cm,stock');
      const rows = check(res);
      return { id: rows[0].id, eu: Number(rows[0].eu), us: asNumber(rows[0].us), cm: asNumber(rows[0].cm), stock: rows[0].stock };
    },

    /* ---------------------------------------------------------- photos */
    // resize in the browser (1600 / 800 / 400 px WebP), upload the three files, return the 1600 path
    async uploadPhoto(productId, file) {
      const id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 12);
      const variants = await processImage(file);
      const base = `products/${productId}/${id}`;
      const ext = variants[0].ext;
      await Promise.all(variants.map(async (v) => {
        const { error } = await bucket().upload(`${base}-${v.width}.${ext}`, v.blob, {
          contentType: v.blob.type, cacheControl: '31536000', upsert: false,
        });
        if (error) throw mapError(error);
      }));
      const path = `${base}-1600.${ext}`;
      return { path, url: photoUrl(path, 400) };
    },
    async deletePhotos(paths) {
      const files = paths.filter(isUploadedPath).flatMap(photoVariants);
      if (files.length) await bucket().remove(files).catch(() => {}); // orphans are harmless
    },
  };
}
