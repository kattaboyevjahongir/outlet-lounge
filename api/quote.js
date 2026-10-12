// POST /api/quote  { items:[{slug,size,qty}], promo_code?, delivery_method? }
// Cart / checkout preview. Uses the same database pricing as the real order, but never
// changes stock or uses up a promo code. Business problems (bad promo, sold-out line)
// come back as 200 { ok:false, error, … } so the UI can show them inline.

import { parseQuote, parseDbError } from './_lib/validate.js';
import { supabaseConfig, rpc, limited, clientIp, sameSite } from './_lib/services.js';

const send = (res, code, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(code).json(body);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (!sameSite(req)) return send(res, 403, { error: 'forbidden' });
  // promo codes can be guessed by hammering this — keep the budget small
  if (limited(`quote:${clientIp(req)}`, 60, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });
  if (!supabaseConfig()) return send(res, 503, { error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const parsed = parseQuote(body);
  if (!parsed.ok) return send(res, 400, { error: 'invalid', field: parsed.field });

  const r = await rpc('quote_order', { p_payload: parsed.payload });
  if (!r.ok) {
    const mapped = parseDbError(r.error);
    if (mapped) {
      // an invalid promo is the customer's typo, not a server fault
      if (mapped.error === 'invalid' && mapped.field === 'promo') return send(res, 200, { ok: false, error: 'promo' });
      return send(res, 200, { ok: false, ...mapped });
    }
    console.error('quote failed:', r.status);
    return send(res, 502, { error: 'upstream' });
  }
  const q = r.data;
  return send(res, 200, {
    ok: true,
    subtotal: q.subtotal,
    discount: q.discount,
    delivery_fee: q.delivery_fee,
    total: q.total,
    promo_code: q.promo_code || null,
    lines: (q.lines || []).map((l) => ({ slug: l.slug, size: l.size_eu, qty: l.qty, unit_price: l.unit_price })),
  });
}
