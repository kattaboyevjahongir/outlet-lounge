// POST /api/order
//   { type: 'order' | 'quick' | 'notify', … }   (see api/_lib/validate.js for the fields)
//
// order / quick → place_order() in the database (prices + stock + promo, atomically),
//                 then a Telegram message with status buttons. Telegram is best-effort:
//                 once the order is saved the customer always gets their number.
// notify        → "tell me when it's back in stock": saved + Telegram alert.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

import { parseOrder, parseNotify, parseDbError } from './_lib/validate.js';
import { orderMessage, keyboard, notifyMessage } from './_lib/format.js';
import { supabaseConfig, rpc, select, insert, patch, tg, telegramConfigured, limited, clientIp, sameSite } from './_lib/services.js';

const send = (res, code, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(code).json(body);
};

async function sendOrderToTelegram(placed, payload) {
  const order = {
    number: placed.number,
    status: 'new',
    created_at: new Date().toISOString(),
    lang: payload.lang,
    customer_name: payload.customer.name,
    phone: payload.customer.phone,
    telegram: payload.customer.telegram,
    contact_pref: payload.customer.contact_pref,
    delivery_method: payload.delivery.method,
    region: payload.delivery.region,
    city: payload.delivery.city,
    address: payload.delivery.address,
    landmark: payload.delivery.landmark,
    payment_method: payload.payment,
    comment: payload.comment,
    subtotal: placed.subtotal,
    discount: placed.discount,
    delivery_fee: placed.delivery_fee,
    total: placed.total,
    promo_code: placed.promo_code,
    order_items: (placed.items || []).map((l) => ({
      brand_snapshot: l.brand, name_snapshot: l.name, size_eu: l.size_eu, qty: l.qty, unit_price: l.unit_price,
    })),
  };
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const sent = await tg('sendMessage', {
    chat_id: chatId,
    text: orderMessage(order),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard('new', placed.order_id),
  });
  if (!sent.ok) {
    console.error('telegram send failed:', sent.description);
    return false;
  }
  // remember which message belongs to the order so status changes can edit it
  await patch(`orders?id=eq.${placed.order_id}`, { tg_chat_id: sent.result.chat.id, tg_message_id: sent.result.message_id });
  return true;
}

async function handleNotify(body, res) {
  const parsed = parseNotify(body);
  if (!parsed.ok) return send(res, 400, { error: 'invalid', field: parsed.field, code: parsed.code });
  const n = parsed.notify;

  const prod = await select(`products?slug=eq.${n.slug}&is_active=eq.true&select=id,name`);
  if (!prod.ok || !Array.isArray(prod.data) || !prod.data.length) return send(res, 404, { error: 'unavailable' });
  let sizeId = null;
  if (n.size != null) {
    const sz = await select(`product_sizes?product_id=eq.${prod.data[0].id}&eu=eq.${n.size}&select=id`);
    if (sz.ok && sz.data.length) sizeId = sz.data[0].id;
  }
  const saved = await insert('notify_requests', {
    product_id: prod.data[0].id, size_id: sizeId, phone: n.phone, telegram: n.telegram,
  });
  if (!saved.ok) {
    console.error('notify save failed', saved.status);
    return send(res, 502, { error: 'upstream' });
  }
  if (telegramConfigured()) {
    await tg('sendMessage', {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: notifyMessage({ name: prod.data[0].name, slug: n.slug, size: n.size, phone: n.phone, telegram: n.telegram }),
      parse_mode: 'HTML',
    });
  }
  return send(res, 200, { ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (!sameSite(req)) return send(res, 403, { error: 'forbidden' });
  if (limited(`order:${clientIp(req)}`, 8, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });
  if (!supabaseConfig()) return send(res, 503, { error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') return send(res, 400, { error: 'invalid', field: 'body' });

  if (body.type === 'notify') return handleNotify(body, res);
  if (body.type !== 'order' && body.type !== 'quick') return send(res, 400, { error: 'invalid', field: 'type' });

  const parsed = parseOrder(body, body.type);
  if (!parsed.ok) return send(res, 400, { error: 'invalid', field: parsed.field, code: parsed.code });

  const placed = await rpc('place_order', { p_payload: parsed.payload });
  if (!placed.ok) {
    const mapped = parseDbError(placed.error);
    if (mapped) return send(res, mapped.error === 'invalid' ? 400 : 409, mapped);
    console.error('place_order failed:', placed.status);
    return send(res, 502, { error: 'upstream' });
  }

  let notified = false;
  if (telegramConfigured()) {
    try {
      notified = await sendOrderToTelegram(placed.data, parsed.payload);
    } catch (e) {
      console.error('telegram step failed:', e.message);
    }
  }

  const o = placed.data;
  return send(res, 200, {
    ok: true,
    number: o.number,
    subtotal: o.subtotal,
    discount: o.discount,
    delivery_fee: o.delivery_fee,
    total: o.total,
    promo_code: o.promo_code,
    notified,
  });
}
