// Loading an order for its Telegram message, and re-rendering that message after a status change
// (used by the bot's buttons and by the admin panel, so both stay in sync).

import { orderMessage, keyboard } from './format.js';
import { select, tg } from './services.js';

export const hhmm = () =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }).format(new Date());

export async function loadOrder(id) {
  const r = await select(`orders?id=eq.${id}&select=*,order_items(*),promo_codes(code)`);
  if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
  const o = r.data[0];
  return { ...o, promo_code: o.promo_codes ? o.promo_codes.code : null };
}

// Edit the manager-chat message the order was announced in: new status line + matching buttons.
// Returns 'updated' | 'skipped' (never announced / Telegram off) | 'failed'.
export async function refreshOrderMessage(order, who) {
  if (!order || !order.tg_chat_id || !order.tg_message_id) return 'skipped';
  const r = await tg('editMessageText', {
    chat_id: order.tg_chat_id,
    message_id: order.tg_message_id,
    text: orderMessage(order, { actor: who, at: hhmm() }),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard(order.status, order.id),
  });
  if (r && r.ok) return 'updated';
  // "message is not modified" means it already shows this status — that is fine
  return r && /not modified/i.test(r.description || '') ? 'updated' : 'failed';
}
