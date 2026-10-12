// The Telegram order message (Russian — the managers' language) and its buttons.
// All customer-supplied text is HTML-escaped: Telegram parses the message as HTML.

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export const money = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} сум`;

const DELIVERY = {
  courier_tashkent: 'курьер по Ташкенту',
  regions: 'по регионам (БТС / почта)',
  pickup: 'самовывоз',
  callback: 'уточнить по телефону (быстрый заказ)',
};
const PAYMENT = {
  cash: 'наличными при получении',
  card_on_delivery: 'картой при получении',
  transfer: 'переводом на карту после звонка',
  tbd: 'уточнить',
};
export const STATUS = {
  new: '🆕 Новый',
  confirmed: '✅ Подтверждён',
  shipped: '📦 Отправлен',
  delivered: '🏁 Доставлен',
  cancelled: '❌ Отменён',
  no_answer: '📞 Не дозвонились',
};

const when = (iso) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso || Date.now()));

const phoneView = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : p;
};

/**
 * order: { number, status, created_at, lang, customer_name, phone, telegram, contact_pref,
 *          delivery_method, region, city, address, landmark, payment_method, comment,
 *          subtotal, discount, delivery_fee, total, promo_code?, order_items:[{brand_snapshot,name_snapshot,size_eu,qty,unit_price}] }
 * last: optional { actor, at } of the latest status change
 */
export function orderMessage(order, last) {
  const L = [];
  const quick = order.delivery_method === 'callback';
  L.push(`${quick ? '⚡' : '🛍'} <b>${quick ? 'Быстрый заказ' : 'Новый заказ'} ${esc(order.number)}</b>`);
  L.push(`🕒 ${when(order.created_at)} · сайт (${esc((order.lang || 'ru').toUpperCase())})`);
  L.push('');
  L.push(`👤 ${esc(order.customer_name)}`);
  L.push(`📞 ${esc(phoneView(order.phone))}${order.telegram ? `   ✈️ ${esc(order.telegram)}` : ''}`);
  L.push(`💬 Связь: ${order.contact_pref === 'telegram' ? 'Telegram' : 'звонок'}`);
  L.push('');
  L.push(`📦 Доставка: ${esc(DELIVERY[order.delivery_method] || order.delivery_method)}`);
  const place = [order.region, order.city, order.address].filter(Boolean).join(', ');
  if (place) L.push(`📍 ${esc(place)}`);
  if (order.landmark) L.push(`🧭 Ориентир: ${esc(order.landmark)}`);
  if (quick) L.push('ℹ️ Адрес и оплату уточнить по телефону');
  L.push('');
  (order.order_items || []).forEach((it, i) => {
    const brand = it.brand_snapshot ? `${it.brand_snapshot} ` : '';
    L.push(`${i + 1}) ${esc(brand + it.name_snapshot)} — EU ${esc(it.size_eu)} × ${it.qty} — ${esc(money(it.unit_price * it.qty))}`);
  });
  L.push('');
  L.push(`Сумма: ${esc(money(order.subtotal))}`);
  if (order.discount > 0) L.push(`Промокод${order.promo_code ? ` ${esc(order.promo_code)}` : ''}: −${esc(money(order.discount))}`);
  if (!quick) L.push(`Доставка: ${order.delivery_fee > 0 ? esc(money(order.delivery_fee)) : 'бесплатно'}`);
  L.push(`<b>ИТОГО: ${esc(money(order.total))}</b>`);
  L.push(`💳 Оплата: ${esc(PAYMENT[order.payment_method] || order.payment_method)}`);
  if (order.comment) L.push(`📝 Комментарий: ${esc(order.comment)}`);
  if (order.status && order.status !== 'new') {
    L.push('');
    L.push(`<b>${esc(STATUS[order.status] || order.status)}</b>${last && last.actor ? ` — ${esc(last.actor)}${last.at ? `, ${esc(last.at)}` : ''}` : ''}`);
  }
  return L.join('\n');
}

// callback_data is "s:<action>:<orderId>" (≤ 64 bytes)
const BTN = {
  confirm: ['✅ Подтвердить', 'confirm'],
  noanswer: ['📞 Не дозвонились', 'noanswer'],
  cancel: ['❌ Отменить', 'cancel'],
  ship: ['📦 Отправлен', 'ship'],
  deliver: ['🏁 Доставлен', 'deliver'],
};
const FLOW = {
  new: [['confirm', 'noanswer'], ['cancel']],
  no_answer: [['confirm'], ['cancel']],
  confirmed: [['ship'], ['cancel']],
  shipped: [['deliver'], ['cancel']],
  delivered: [],
  cancelled: [],
};
export function keyboard(status, orderId) {
  const rows = FLOW[status] || [];
  return {
    inline_keyboard: rows.map((row) => row.map((k) => ({ text: BTN[k][0], callback_data: `s:${BTN[k][1]}:${orderId}` }))),
  };
}

export const ACTION_TO_STATUS = {
  confirm: 'confirmed',
  noanswer: 'no_answer',
  cancel: 'cancelled',
  ship: 'shipped',
  deliver: 'delivered',
};

export function notifyMessage(n) {
  const L = ['🔔 <b>Просят уведомить о поступлении</b>', ''];
  L.push(`Модель: ${esc(n.name || n.slug)}${n.size ? ` · EU ${esc(n.size)}` : ''}`);
  if (n.phone) L.push(`📞 ${esc(phoneView(n.phone))}`);
  if (n.telegram) L.push(`✈️ ${esc(n.telegram)}`);
  return L.join('\n');
}
