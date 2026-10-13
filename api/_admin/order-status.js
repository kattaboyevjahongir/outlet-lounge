// POST /api/admin-order-status   Authorization: Bearer <staff session token>
//   { order_id, status, note? }
//
// Changes an order's status AS the signed-in staff member (the database checks they are active
// staff, records their name in the order history, returns stock on cancel), then re-renders the
// order's Telegram message so the managers' chat shows the same status and buttons.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN

import { ACTION_TO_STATUS } from '../_lib/format.js';
import { select, userRpc, limited, clientIp, sameSite } from '../_lib/services.js';
import { loadOrder, refreshOrderMessage } from '../_lib/orders.js';

const STATUSES = new Set(Object.values(ACTION_TO_STATUS).concat('new'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (limited(`adminstatus:${clientIp(req)}`, 60, 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });

  const jwt = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return send(res, 401, { error: 'unauthorized' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (!UUID.test(String(b.order_id || '')) || !STATUSES.has(b.status)) return send(res, 400, { error: 'invalid' });
  const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 300) : null;

  let changed;
  try {
    changed = await userRpc(jwt, 'set_order_status', { p_order_id: b.order_id, p_status: b.status, p_note: note });
  } catch (e) {
    return send(res, 503, { error: 'not_configured' });
  }
  if (!changed.ok) {
    const msg = String(changed.error || '');
    if (changed.status === 401 || /jwt/i.test(msg)) return send(res, 401, { error: 'unauthorized' });
    if (/forbidden/.test(msg) || changed.status === 403) return send(res, 403, { error: 'forbidden' });
    if (/order_cancelled/.test(msg)) return send(res, 409, { error: 'order_cancelled' });
    if (/not_found/.test(msg)) return send(res, 404, { error: 'not_found' });
    console.error('admin set_order_status failed:', changed.status);
    return send(res, 502, { error: 'upstream' });
  }

  // best effort from here on: the status is already saved
  let telegram = 'skipped';
  try {
    const order = await loadOrder(b.order_id);
    if (order) {
      const ev = await select(`order_events?order_id=eq.${b.order_id}&select=actor&order=created_at.desc&limit=1`);
      const who = ev.ok && Array.isArray(ev.data) && ev.data[0] ? ev.data[0].actor : null;
      telegram = await refreshOrderMessage(order, who);
    }
  } catch (e) {
    console.error('telegram sync failed:', e.message);
    telegram = 'failed';
  }
  return send(res, 200, { ok: true, status: changed.data.status, number: changed.data.number, telegram });
}
