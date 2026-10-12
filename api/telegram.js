// POST /api/telegram — the bot's webhook.
//   • status buttons under an order message  → set_order_status() + the message is re-rendered
//   • /id                                    → replies with the chat's id (handy when setting up)
//   • /start OL-…  (private chat)            → a customer from the thank-you page gets the order's status
//
// Only requests that carry the secret header (set when the webhook is registered) are accepted,
// and only button presses from the managers' chat (TELEGRAM_CHAT_ID) change anything.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET

import { timingSafeEqual } from 'node:crypto';
import { orderMessage, keyboard, ACTION_TO_STATUS, STATUS, customerMessage } from './_lib/format.js';
import { rpc, select, tg } from './_lib/services.js';

const ok = (res) => res.status(200).json({ ok: true });

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

const hhmm = () =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }).format(new Date());

async function loadOrder(id) {
  const r = await select(`orders?id=eq.${id}&select=*,order_items(*),promo_codes(code)`);
  if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
  const o = r.data[0];
  return { ...o, promo_code: o.promo_codes ? o.promo_codes.code : null };
}

async function onButton(cq) {
  const answer = (text, alert = false) => tg('answerCallbackQuery', { callback_query_id: cq.id, text, show_alert: alert });
  const chatId = cq.message && cq.message.chat && cq.message.chat.id;
  if (String(chatId) !== String(process.env.TELEGRAM_CHAT_ID)) return answer('Нет доступа', true);

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

export default async function handler(req, res) {
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
