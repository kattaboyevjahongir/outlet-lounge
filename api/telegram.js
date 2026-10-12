// POST /api/telegram — the bot's webhook.
//   • status buttons under an order message  → set_order_status() + the message is re-rendered
//   • /id                                    → replies with the chat's id (handy when setting up)
//   • /start OL-…  (private chat)            → a customer from the thank-you page gets the order's status
//
// Only requests that carry the secret header (set when the webhook is registered) are accepted,
// and only button presses from the managers' chat (TELEGRAM_CHAT_ID or the `telegram` setting) change anything.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, optional TELEGRAM_CHAT_ID / SITE_URL

import { timingSafeEqual } from 'node:crypto';
import { orderMessage, keyboard, ACTION_TO_STATUS, STATUS, customerMessage } from './_lib/format.js';
import { rpc, select, patch, tg, telegramChat, limited, clientIp } from './_lib/services.js';
import { loadOrder, hhmm } from './_lib/orders.js';

const ok = (res) => res.status(200).json({ ok: true });

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

async function onButton(cq) {
  const answer = (text, alert = false) => tg('answerCallbackQuery', { callback_query_id: cq.id, text, show_alert: alert });
  const chatId = cq.message && cq.message.chat && cq.message.chat.id;
  const managers = await telegramChat();
  if (!managers || String(chatId) !== managers) return answer('Нет доступа', true);

  const m = String(cq.data || '').match(/^s:([a-z]+):([0-9a-f-]{36})$/);
  const status = m && ACTION_TO_STATUS[m[1]];
  if (!status) return answer('Неизвестная команда');
  const orderId = m[2];

  const who = [cq.from && cq.from.first_name, cq.from && cq.from.last_name].filter(Boolean).join(' ')
    || (cq.from && cq.from.username) || 'менеджер';
  const changed = await rpc('set_order_status', {
    p_order_id: orderId, p_status: status, p_note: 'Telegram', p_actor: `telegram:${who}`,
  });
  if (!changed.ok) {
    if (/order_cancelled/.test(changed.error || '')) return answer('Заказ уже отменён', true);
    if (/not_found/.test(changed.error || '')) return answer('Заказ не найден', true);
    console.error('set_order_status failed:', changed.status);
    return answer('Не удалось изменить статус', true);
  }

  const order = await loadOrder(orderId);
  if (order) {
    await tg('editMessageText', {
      chat_id: chatId,
      message_id: cq.message.message_id,
      text: orderMessage({ ...order, status }, { actor: who, at: hhmm() }),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard(status, orderId),
    });
  }
  return answer(STATUS[status]);
}

async function onStart(msg) {
  const no = (msg.text.match(/^\/start(?:@\w+)?\s+(OL-\d{6}-\d{4})\s*$/) || [])[1];
  const userLang = msg.from && msg.from.language_code;
  let text = customerMessage('hello', { lang: userLang });
  if (no) {
    const r = await select(`orders?number=eq.${no}&select=status,lang`);
    const o = r.ok && Array.isArray(r.data) && r.data[0];
    text = o
      ? customerMessage('order', { number: no, status: o.status, lang: o.lang || userLang })
      : customerMessage('missing', { number: no, lang: userLang });
  }
  return tg('sendMessage', { chat_id: msg.chat.id, text, parse_mode: 'HTML' });
}

// GET /api/telegram — runs a pending one-time setup step. Vercel keeps the bot token write-only, so
// setup has to happen here on the server. The step is requested by writing the private `telegram_setup`
// setting (owner / database access only), e.g. {"action":"discover"}; the result is written back to
// that setting. The URL itself carries no power: with nothing pending it does nothing, it never
// returns data, and the webhook can only ever point at this shop (SITE_URL).
//   status   → bot username, webhook, last error      discover → chats the bot was added to
//   webhook  → register <SITE_URL>/api/telegram        test     → test message to the managers' chat
const SITE = () => (process.env.SITE_URL || 'https://outlet-lounge.vercel.app').replace(/\/$/, '');

async function runSetupStep(action) {
  const me = await tg('getMe', {});
  if (!me.ok) return { ok: false, step: 'token', error: me.description || 'rejected' };
  const out = { ok: true, bot: me.result.username };
  const hook = (await tg('getWebhookInfo', {})).result || {};
  if (action === 'status') {
    Object.assign(out, {
      webhook: hook.url || null, pending: hook.pending_update_count || 0, last_error: hook.last_error_message || null,
      chat: await telegramChat(), secret_set: !!process.env.TELEGRAM_WEBHOOK_SECRET,
    });
  } else if (action === 'discover') {
    if (hook.url) return { ...out, note: 'webhook is set — send /id in the group instead' };
    const updates = (await tg('getUpdates', { limit: 100 })).result || [];
    const chats = new Map();
    for (const u of updates) {
      const c = (u.message || u.channel_post || u.my_chat_member || (u.callback_query && u.callback_query.message) || {}).chat;
      if (c) chats.set(c.id, { id: c.id, type: c.type, title: c.title || c.username || c.first_name || '' });
    }
    out.chats = [...chats.values()];
  } else if (action === 'webhook') {
    if (!process.env.TELEGRAM_WEBHOOK_SECRET) return { ...out, ok: false, error: 'TELEGRAM_WEBHOOK_SECRET is not set' };
    const r = await tg('setWebhook', {
      url: `${SITE()}/api/telegram`, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    });
    Object.assign(out, { ok: !!r.ok, webhook: `${SITE()}/api/telegram`, error: r.ok ? undefined : r.description });
  } else if (action === 'test') {
    const chatId = await telegramChat();
    if (!chatId) return { ...out, ok: false, error: 'no managers chat configured' };
    const r = await tg('sendMessage', {
      chat_id: chatId, parse_mode: 'HTML',
      text: '✅ <b>Outlet Lounge</b>: Telegram подключён. Новые заказы будут приходить сюда.',
    });
    Object.assign(out, { ok: !!r.ok, error: r.ok ? undefined : r.description });
  } else {
    return { ok: false, error: 'unknown action' };
  }
  return out;
}

async function setup(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (limited(`tgsetup:${clientIp(req)}`, 20, 10 * 60 * 1000)) return res.status(429).json({ error: 'too_many_requests' });
  const r = await select('settings?key=eq.telegram_setup&select=value').catch(() => ({ ok: false }));
  const pending = r.ok && Array.isArray(r.data) && r.data[0] && r.data[0].value;
  if (pending && pending.action && !pending.done) {
    let result;
    try {
      result = await runSetupStep(pending.action);
    } catch (e) {
      result = { ok: false, error: e.message };
    }
    await patch('settings?key=eq.telegram_setup', {
      value: { action: pending.action, done: true, at: new Date().toISOString(), result },
      updated_at: new Date().toISOString(),
    });
  }
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return setup(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!safeEqual(req.headers['x-telegram-bot-api-secret-token'], process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  let update = req.body;
  if (typeof update === 'string') {
    try { update = JSON.parse(update); } catch { update = null; }
  }
  if (!update || typeof update !== 'object') return ok(res);

  try {
    if (update.callback_query) {
      await onButton(update.callback_query);
    } else if (update.message && typeof update.message.text === 'string' && update.message.chat
               && update.message.chat.type === 'private' && /^\/start\b/.test(update.message.text)) {
      await onStart(update.message);
    } else if (update.message && typeof update.message.text === 'string' && /^\/id(@\w+)?\b/.test(update.message.text)) {
      await tg('sendMessage', {
        chat_id: update.message.chat.id,
        text: `Chat ID: <code>${update.message.chat.id}</code>`,
        parse_mode: 'HTML',
      });
    }
  } catch (e) {
    console.error('webhook error:', e.message);
  }
  // always 200 — Telegram retries anything else and would repeat the action
  return ok(res);
}
