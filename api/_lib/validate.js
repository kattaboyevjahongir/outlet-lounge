// Input cleaning + validation for the order endpoints (pure, unit-tested).
// The database re-validates everything that matters (prices, stock, promo); this layer
// rejects junk early and keeps text safe and bounded.

export const PAYMENTS = ['cash', 'card_on_delivery', 'transfer', 'tbd'];
export const NO_ADDRESS_METHODS = ['pickup', 'callback'];
export const LANGS = ['ru', 'uz', 'en'];

// control characters, zero-width and bidi tricks are removed; whitespace collapsed
const JUNK = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
export const cleanText = (v, max = 200) =>
  String(v == null ? '' : v).replace(JUNK, '').replace(/\s+/g, ' ').trim().slice(0, max);

// Uzbek mobile numbers → +998XXXXXXXXX (9 national digits). Returns null when it can't be one.
export function normalizePhone(raw) {
  const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

export function normalizeTelegram(raw) {
  const v = cleanText(raw, 40).replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  if (!v) return '';
  return /^[A-Za-z0-9_]{5,32}$/.test(v) ? `@${v}` : null;
}

const fail = (field, code = 'invalid') => ({ ok: false, field, code });

function parseItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) return null;
  const out = [];
  for (const it of items) {
    const slug = cleanText(it && it.slug, 80);
    const size = Number(it && it.size);
    const qty = Number(it && it.qty);
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
    if (!Number.isFinite(size) || size < 30 || size > 50 || (size * 2) % 1 !== 0) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return null;
    out.push({ slug, size, qty });
  }
  return out;
}

function parseUtm(utm) {
  if (!utm || typeof utm !== 'object') return null;
  const out = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref']) {
    const v = cleanText(utm[k], 80);
    if (v) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

const MIN_FILL_MS = 1200; // a human needs a moment; bots post instantly

// Shared by every public form: honeypot + minimum fill time.
export function botCheck(body) {
  if (cleanText(body && body.website, 20)) return fail('website', 'bot');
  if (!(Number(body && body.elapsed) >= MIN_FILL_MS)) return fail('elapsed', 'too_fast');
  return null;
}

// type: 'order' (checkout) | 'quick' (buy in 1 click)
export function parseOrder(body, type) {
  if (!body || typeof body !== 'object') return fail('body');
  const bot = botCheck(body);
  if (bot) return bot;

  const name = cleanText(body.customer && body.customer.name, 80);
  if (name.length < 2) return fail('name');
  const phone = normalizePhone(body.customer && body.customer.phone);
  if (!phone) return fail('phone');
  const telegram = normalizeTelegram(body.customer && body.customer.telegram);
  if (telegram === null) return fail('telegram');
  const contactPref = body.customer && body.customer.contact_pref === 'telegram' && telegram ? 'telegram' : 'call';

  const items = parseItems(body.items);
  if (!items) return fail('items');

  let method;
  let payment;
  let delivery = {};
  if (type === 'quick') {
    method = 'callback';
    payment = 'tbd';
  } else {
    method = cleanText(body.delivery && body.delivery.method, 30);
    if (!/^[a-z_]{2,30}$/.test(method) || method === 'callback') return fail('delivery');
    payment = cleanText(body.payment, 30);
    if (!PAYMENTS.includes(payment) || payment === 'tbd') return fail('payment');
    if (!NO_ADDRESS_METHODS.includes(method)) {
      const d = body.delivery || {};
      delivery = {
        region: cleanText(d.region, 60),
        city: cleanText(d.city, 80),
        address: cleanText(d.address, 200),
        landmark: cleanText(d.landmark, 120),
      };
      if (!delivery.region) return fail('region');
      if (delivery.address.length < 5) return fail('address');
    }
  }

  const promo = cleanText(body.promo_code, 32).toUpperCase();
  if (promo && !/^[A-Z0-9_-]{1,32}$/.test(promo)) return fail('promo_code');

  const lang = LANGS.includes(body.lang) ? body.lang : 'ru';
  return {
    ok: true,
    payload: {
      customer: { name, phone, telegram: telegram || null, contact_pref: contactPref },
      delivery: { method, ...delivery },
      payment,
      comment: cleanText(body.comment, 500) || null,
      promo_code: promo || null,
      lang,
      utm: parseUtm(body.utm),
      items,
    },
  };
}

// type 'notify' — "tell me when it's back"
export function parseNotify(body) {
  if (!body || typeof body !== 'object') return fail('body');
  const bot = botCheck(body);
  if (bot) return bot;
  const slug = cleanText(body.slug, 80);
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fail('slug');
  const phone = normalizePhone(body.phone);
  const telegram = normalizeTelegram(body.telegram);
  if (telegram === null) return fail('telegram');
  if (!phone && !telegram) return fail('phone');
  let size = null;
  if (body.size != null && body.size !== '') {
    size = Number(body.size);
    if (!Number.isFinite(size) || size < 30 || size > 50) return fail('size');
  }
  return { ok: true, notify: { slug, size, phone, telegram: telegram || null } };
}

// quote: items + optional promo + delivery method (no customer data)
export function parseQuote(body) {
  if (!body || typeof body !== 'object') return fail('body');
  const items = parseItems(body.items);
  if (!items) return fail('items');
  const promo = cleanText(body.promo_code, 32).toUpperCase();
  if (promo && !/^[A-Z0-9_-]{1,32}$/.test(promo)) return fail('promo_code');
  const method = cleanText(body.delivery_method, 30) || 'courier_tashkent';
  if (!/^[a-z_]{2,30}$/.test(method)) return fail('delivery');
  return { ok: true, payload: { items, promo_code: promo || null, delivery: { method } } };
}

// "out_of_stock:air-max-1-sunset:41" → { error: 'out_of_stock', slug, size }
export function parseDbError(message) {
  const m = String(message || '').match(/^(out_of_stock|unavailable|invalid):?(.*)$/);
  if (!m) return null;
  const [slugOrField, size] = m[2].split(':');
  if (m[1] === 'invalid') return { error: 'invalid', field: slugOrField || null };
  return { error: m[1], slug: slugOrField || null, size: size ? Number(size) : null };
}
