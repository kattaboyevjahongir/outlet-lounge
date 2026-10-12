// POST /api/admin-telegram   Authorization: Bearer <owner's session token>   { action: 'test' }
// Sends a test message to the managers' chat, so the owner can check order alerts from the panel.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN

import { staffFromRequest, tg, telegramChat, limited, clientIp, sameSite } from './_lib/services.js';

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
  if (limited(`admintg:${clientIp(req)}`, 10, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });

  const who = await staffFromRequest(req);
  if (who.error === 'not_configured') return send(res, 503, { error: 'not_configured' });
  if (who.error) return send(res, who.error === 'unauthorized' ? 401 : 403, { error: who.error });
  if (who.staff.role !== 'owner') return send(res, 403, { error: 'forbidden' });

  const chat = await telegramChat();
  if (!chat) return send(res, 409, { error: 'telegram_off' });
  const sent = await tg('sendMessage', {
    chat_id: chat, parse_mode: 'HTML',
    text: '✅ <b>Outlet Lounge</b>: проверка связи из админки. Новые заказы приходят в этот чат.',
  });
  if (!sent || !sent.ok) return send(res, 502, { error: 'telegram_failed' });
  return send(res, 200, { ok: true });
}
