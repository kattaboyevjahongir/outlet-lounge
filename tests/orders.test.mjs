// node --test tests/*.test.mjs  — order API, quote, Telegram webhook (Supabase + Telegram mocked)
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, normalizeTelegram, cleanText, parseOrder, parseNotify, parseQuote, parseDbError } from '../api/_lib/validate.js';
import { orderMessage, keyboard, esc } from '../api/_lib/format.js';
import orderHandler from '../api/order.js';
import quoteHandler from '../api/quote.js';
import webhook from '../api/telegram.js';
import { resetTelegramChatCache } from '../api/_lib/services.js';

/* ------------------------------------------------------------ harness */
const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_WEBHOOK_SECRET'];
const configure = (extra = {}) => {
  Object.assign(process.env, {
    SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    TELEGRAM_BOT_TOKEN: '123:token', TELEGRAM_CHAT_ID: '-1001', TELEGRAM_WEBHOOK_SECRET: 'hook-secret', ...extra,
  });
};
const unconfigure = () => ENV_KEYS.forEach((k) => delete process.env[k]);

let ipCounter = 0;
const res = () => {
  const r = { code: 200, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
};
const req = (body, over = {}) => ({
  method: 'POST', body,
  headers: { host: 'shop.test', 'x-forwarded-for': `10.0.0.${++ipCounter}`, ...(over.headers || {}) },
  ...over,
});

// fetch mock: records calls, answers by URL
const mockFetch = (handlers = {}) => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init.method || 'GET', body, headers: init.headers });
    for (const [needle, fn] of Object.entries(handlers)) {
      if (String(url).includes(needle)) {
        const r = await fn({ url, body, init });
        return { ok: r.status < 400, status: r.status, json: async () => r.json, text: async () => JSON.stringify(r.json) };
      }
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '{}' };
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
};

const PLACED = {
  order_id: '11111111-2222-3333-4444-555555555555', number: 'OL-261013-0042',
  subtotal: 1490000, discount: 0, delivery_fee: 30000, total: 1520000, promo_code: null,
  items: [{ brand: 'Jordan', name: 'Air Jordan 1 Low “Shattered”', size_label: '42', fulfilment: 'stock', qty: 1, unit_price: 1490000 }],
};
const goodOrder = (over = {}) => ({
  type: 'order', website: '', elapsed: 6000, lang: 'ru',
  customer: { name: 'Азиз Р.', phone: '+998 90 123 45 67', telegram: '@aziz_r', contact_pref: 'telegram' },
  delivery: { method: 'courier_tashkent', region: 'Ташкент', city: 'Юнусабад', address: 'ул. Навои, 12, кв 5', landmark: 'Mega Planet' },
  payment: 'cash', comment: 'позвонить после 18:00', promo_code: 'lounge10',
  items: [{ slug: 'air-jordan-1-low-shattered', size: '42', qty: 1, price: 1 }], // a "price" must be ignored
  ...over,
});

/* ------------------------------------------------------------ validation */
test('phone numbers normalise to +998XXXXXXXXX', () => {
  assert.equal(normalizePhone('90 123 45 67'), '+998901234567');
  assert.equal(normalizePhone('+998 (90) 123-45-67'), '+998901234567');
  assert.equal(normalizePhone('998901234567'), '+998901234567');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('+7 999 123 45 67'), null);
  assert.equal(normalizePhone(null), null);
});

test('telegram usernames, text cleaning', () => {
  assert.equal(normalizeTelegram('aziz_r'), '@aziz_r');
  assert.equal(normalizeTelegram('https://t.me/aziz_r'), '@aziz_r');
  assert.equal(normalizeTelegram(''), '');
  assert.equal(normalizeTelegram('a b'), null);
  assert.equal(cleanText('  hi\u0000   there‮  ', 50), 'hi there');
  assert.equal(cleanText('x'.repeat(500), 20).length, 20);
});

test('parseOrder: happy path builds a sanitized payload (no client prices)', () => {
  const r = parseOrder(goodOrder(), 'order');
  assert.ok(r.ok, JSON.stringify(r));
  const p = r.payload;
  assert.equal(p.customer.phone, '+998901234567');
  assert.equal(p.customer.contact_pref, 'telegram');
  assert.equal(p.promo_code, 'LOUNGE10');
  assert.deepEqual(p.items, [{ slug: 'air-jordan-1-low-shattered', size: '42', qty: 1 }]);
  assert.ok(!JSON.stringify(p).includes('"price"'));
});

test('parseOrder: rejects bots, junk and incomplete forms', () => {
  const bad = (over, type = 'order') => parseOrder(goodOrder(over), type);
  assert.equal(bad({ website: 'http://spam' }).code, 'bot');
  assert.equal(bad({ elapsed: 200 }).code, 'too_fast');
  assert.equal(bad({ customer: { name: 'A', phone: '+998901234567' } }).field, 'name');
  assert.equal(bad({ customer: { name: 'Ali', phone: '123' } }).field, 'phone');
  assert.equal(bad({ delivery: { method: 'courier_tashkent', region: 'T', address: '' } }).field, 'address');
  assert.equal(bad({ delivery: { method: 'callback' } }).field, 'delivery', 'callback only via quick');
  assert.equal(bad({ payment: 'bitcoin' }).field, 'payment');
  assert.equal(bad({ items: [] }).field, 'items');
  assert.equal(bad({ items: [{ slug: 'ok', size: '42', qty: 99 }] }).field, 'items');
  assert.equal(bad({ items: [{ slug: 'ok', size: 'no!', qty: 1 }] }).field, 'items');
  assert.equal(bad({ items: [{ slug: 'Bad Slug!', size: '42', qty: 1 }] }).field, 'items');
  assert.equal(bad({ promo_code: 'a b;--' }).field, 'promo_code');
  assert.equal(parseOrder(null, 'order').ok, false);
});

test('parseOrder: pickup needs no address; quick order needs only name, phone, items', () => {
  const pick = parseOrder(goodOrder({ delivery: { method: 'pickup' } }), 'order');
  assert.ok(pick.ok);
  const quick = parseOrder({ type: 'quick', website: '', elapsed: 3000, customer: { name: 'Ali', phone: '901234567' }, items: [{ slug: 'x-90-pink-haze', size: '38', qty: 1 }] }, 'quick');
  assert.ok(quick.ok);
  assert.equal(quick.payload.delivery.method, 'callback');
  assert.equal(quick.payload.payment, 'tbd');
});

test('parseNotify / parseQuote / parseDbError', () => {
  assert.ok(parseNotify({ website: '', elapsed: 2000, slug: 'kyrie-7-onyx', size: '43', phone: '901234567' }).ok);
  assert.equal(parseNotify({ website: '', elapsed: 2000, slug: 'kyrie-7-onyx' }).field, 'phone');
  assert.deepEqual(parseQuote({ items: [{ slug: 'a', size: '41', qty: 1 }], promo_code: 'x1', delivery_method: 'regions' }).payload.delivery, { method: 'regions' });
  assert.equal(parseQuote({ items: 'nope' }).ok, false);
  assert.deepEqual(parseDbError('out_of_stock:air-max:41'), { error: 'out_of_stock', slug: 'air-max', size: '41' });
  assert.deepEqual(parseDbError('unavailable:nope'), { error: 'unavailable', slug: 'nope', size: null });
  assert.deepEqual(parseDbError('invalid:promo'), { error: 'invalid', field: 'promo' });
  assert.equal(parseDbError('syntax error at or near'), null);
});

/* ------------------------------------------------------------ message */
test('order message escapes customer text and shows the essentials', () => {
  const msg = orderMessage({
    number: 'OL-1', status: 'new', created_at: '2026-10-13T10:00:00Z', lang: 'ru',
    customer_name: '<b>Evil</b> & Co', phone: '+998901234567', telegram: '@x_user', contact_pref: 'call',
    delivery_method: 'courier_tashkent', region: 'Ташкент', city: 'Чиланзар', address: 'ул. <script>', landmark: null,
    payment_method: 'cash', comment: '<a href="x">click</a>',
    subtotal: 2000000, discount: 200000, delivery_fee: 0, total: 1800000, promo_code: 'LOUNGE10',
    order_items: [{ brand_snapshot: 'Nike', name_snapshot: 'Air Max', size_label: '42', fulfilment: 'stock', qty: 2, unit_price: 1000000 }],
  });
  assert.ok(!msg.includes('<script>') && !msg.includes('<a href') && !msg.includes('<b>Evil'));
  assert.ok(msg.includes('&lt;b&gt;Evil&lt;/b&gt; &amp; Co'));
  assert.ok(msg.includes('OL-1'));
  assert.ok(msg.includes('+998 90 123 45 67'));
  assert.ok(msg.includes('Nike Air Max'));
  assert.ok(msg.includes('LOUNGE10'));
  assert.ok(msg.includes('бесплатно'));
  assert.ok(msg.includes('<b>ИТОГО:'));
  assert.equal(esc('<&>'), '&lt;&amp;&gt;');
});

test('buttons follow the status flow and fit Telegram limits', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  const labels = (s) => keyboard(s, id).inline_keyboard.flat().map((b) => b.callback_data.split(':')[1]);
  assert.deepEqual(labels('new'), ['confirm', 'noanswer', 'cancel']);
  assert.deepEqual(labels('confirmed'), ['ship', 'cancel']);
  assert.deepEqual(labels('shipped'), ['deliver', 'cancel']);
  assert.deepEqual(labels('delivered'), []);
  assert.deepEqual(labels('cancelled'), []);
  for (const b of keyboard('new', id).inline_keyboard.flat()) assert.ok(Buffer.byteLength(b.callback_data) <= 64);
});

/* ------------------------------------------------------------ /api/order */
test('order: saved, sent to Telegram with buttons, message id stored', async () => {
  configure();
  const m = mockFetch({
    'rpc/place_order': () => ({ status: 200, json: PLACED }),
    'sendMessage': () => ({ status: 200, json: { ok: true, result: { message_id: 77, chat: { id: -1001 } } } }),
  });
  try {
    const r = res();
    await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 200);
    assert.deepEqual({ ok: r.body.ok, number: r.body.number, total: r.body.total, notified: r.body.notified }, { ok: true, number: 'OL-261013-0042', total: 1520000, notified: true });

    const place = m.calls.find((c) => c.url.includes('rpc/place_order'));
    assert.equal(place.headers.apikey, 'service-key');
    assert.equal(place.body.p_payload.customer.phone, '+998901234567');
    assert.equal(place.body.p_payload.promo_code, 'LOUNGE10');
    assert.ok(!('price' in place.body.p_payload.items[0]), 'client price never reaches the database');

    const sent = m.calls.find((c) => c.url.includes('sendMessage'));
    assert.ok(sent.url.includes('bot123:token'));
    assert.equal(sent.body.chat_id, '-1001');
    assert.equal(sent.body.parse_mode, 'HTML');
    assert.ok(sent.body.text.includes('OL-261013-0042'));
    assert.equal(sent.body.reply_markup.inline_keyboard[0].length, 2);

    const patched = m.calls.find((c) => c.method === 'PATCH');
    assert.ok(patched.url.includes(`orders?id=eq.${PLACED.order_id}`));
    assert.deepEqual(patched.body, { tg_chat_id: -1001, tg_message_id: 77 });
    assert.ok(!JSON.stringify(r.body).includes('token'), 'no secrets in the response');
  } finally { m.restore(); unconfigure(); }
});

test('order: Telegram outage does not lose the order', async () => {
  configure();
  const m = mockFetch({
    'rpc/place_order': () => ({ status: 200, json: PLACED }),
    'sendMessage': () => ({ status: 502, json: { ok: false, description: 'bad gateway' } }),
  });
  const err = console.error; console.error = () => {};
  try {
    const r = res();
    await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.number, 'OL-261013-0042');
    assert.equal(r.body.notified, false);
    assert.ok(!m.calls.some((c) => c.method === 'PATCH'), 'nothing to link when the message was not sent');
  } finally { m.restore(); unconfigure(); console.error = err; }
});

test('order: works (saved) when Telegram is not configured yet', async () => {
  configure({ TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' });
  const m = mockFetch({ 'rpc/place_order': () => ({ status: 200, json: PLACED }) });
  try {
    const r = res();
    await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.notified, false);
    assert.ok(!m.calls.some((c) => c.url.includes('api.telegram.org')));
  } finally { m.restore(); unconfigure(); }
});

test('order: database business errors map to clear responses', async () => {
  configure();
  const cases = [
    ['out_of_stock:air-jordan-1-low-shattered:42', 409, { error: 'out_of_stock', slug: 'air-jordan-1-low-shattered', size: '42' }],
    ['unavailable:air-jordan-1-low-shattered', 409, { error: 'unavailable', slug: 'air-jordan-1-low-shattered', size: null }],
    ['invalid:promo', 400, { error: 'invalid', field: 'promo' }],
  ];
  for (const [message, code, expected] of cases) {
    const m = mockFetch({ 'rpc/place_order': () => ({ status: 400, json: { code: 'P0001', message } }) });
    try {
      const r = res();
      await orderHandler(req(goodOrder()), r);
      assert.equal(r.code, code, message);
      assert.deepEqual(r.body, expected, message);
    } finally { m.restore(); }
  }
  unconfigure();
});

test('order: unexpected database failure → 502 without details', async () => {
  configure();
  const m = mockFetch({ 'rpc/place_order': () => ({ status: 500, json: { message: 'connection to server at 10.1.2.3 failed' } }) });
  const err = console.error; console.error = () => {};
  try {
    const r = res();
    await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 502);
    assert.deepEqual(r.body, { error: 'upstream' });
  } finally { m.restore(); unconfigure(); console.error = err; }
});

test('order: guards — method, origin, config, validation, rate limit', async () => {
  configure();
  const m = mockFetch({ 'rpc/place_order': () => ({ status: 200, json: PLACED }) });
  try {
    let r = res(); await orderHandler({ ...req(goodOrder()), method: 'GET' }, r); assert.equal(r.code, 405);
    r = res(); await orderHandler(req(goodOrder(), { headers: { host: 'shop.test', origin: 'https://evil.example', 'x-forwarded-for': '9.9.9.9' } }), r); assert.equal(r.code, 403);
    r = res(); await orderHandler(req(goodOrder({ website: 'spam' })), r); assert.equal(r.code, 400);
    r = res(); await orderHandler(req({ type: 'hack' }), r); assert.equal(r.code, 400);
    r = res(); await orderHandler(req('not json {'), r); assert.equal(r.code, 400);
    assert.equal(m.calls.length, 0, 'invalid requests never reach the database');

    const sameIp = { headers: { host: 'shop.test', 'x-forwarded-for': '7.7.7.7' } };
    let last;
    for (let i = 0; i < 9; i += 1) { last = res(); await orderHandler(req(goodOrder(), sameIp), last); }
    assert.equal(last.code, 429, 'ninth order in 10 minutes from one IP is refused');

    unconfigure();
    r = res(); await orderHandler(req(goodOrder()), r); assert.equal(r.code, 503);
  } finally { m.restore(); unconfigure(); }
});

test('quick order and notify requests', async () => {
  configure();
  const m = mockFetch({
    'rpc/place_order': () => ({ status: 200, json: { ...PLACED, delivery_fee: 0, total: 890000 } }),
    'products?slug=': () => ({ status: 200, json: [{ id: 'p-1', name: 'Kyrie 7 “Onyx”' }] }),
    'product_sizes?': () => ({ status: 200, json: [{ id: 's-1' }] }),
    'notify_requests': () => ({ status: 201, json: [{}] }),
    'sendMessage': () => ({ status: 200, json: { ok: true, result: { message_id: 5, chat: { id: -1001 } } } }),
  });
  try {
    let r = res();
    await orderHandler(req({ type: 'quick', website: '', elapsed: 4000, lang: 'uz', customer: { name: 'Ali', phone: '901234567' }, items: [{ slug: 'x-90-pink-haze', size: '38', qty: 1 }] }), r);
    assert.equal(r.code, 200);
    const place = m.calls.find((c) => c.url.includes('place_order'));
    assert.equal(place.body.p_payload.delivery.method, 'callback');

    r = res();
    await orderHandler(req({ type: 'notify', website: '', elapsed: 4000, slug: 'kyrie-7-onyx', size: '43', phone: '+998901234567' }), r);
    assert.equal(r.code, 200);
    const saved = m.calls.find((c) => c.method === 'POST' && c.url.includes('notify_requests'));
    assert.deepEqual({ product_id: saved.body.product_id, size_id: saved.body.size_id, phone: saved.body.phone }, { product_id: 'p-1', size_id: 's-1', phone: '+998901234567' });
    const alert = m.calls.filter((c) => c.url.includes('sendMessage')).pop();
    assert.ok(alert.body.text.includes('Просят уведомить') && alert.body.text.includes('· 43'));
  } finally { m.restore(); unconfigure(); }
});

/* ------------------------------------------------------------ /api/quote */
test('quote: totals from the database, promo problems reported inline', async () => {
  configure();
  let reply = { status: 200, json: { subtotal: 1000000, discount: 100000, delivery_fee: 30000, total: 930000, promo_code: 'LOUNGE10', lines: [{ slug: 'a', size_label: '41', fulfilment: 'stock', qty: 1, unit_price: 1000000 }] } };
  const m = mockFetch({ 'rpc/quote_order': () => reply });
  try {
    let r = res();
    await quoteHandler(req({ items: [{ slug: 'a', size: '41', qty: 1 }], promo_code: 'lounge10' }), r);
    assert.equal(r.code, 200);
    assert.deepEqual({ ok: r.body.ok, total: r.body.total, promo: r.body.promo_code }, { ok: true, total: 930000, promo: 'LOUNGE10' });

    reply = { status: 400, json: { message: 'invalid:promo' } };
    r = res();
    await quoteHandler(req({ items: [{ slug: 'a', size: '41', qty: 1 }], promo_code: 'nope' }), r);
    assert.deepEqual(r.body, { ok: false, error: 'promo' });

    reply = { status: 400, json: { message: 'out_of_stock:a:41' } };
    r = res();
    await quoteHandler(req({ items: [{ slug: 'a', size: '41', qty: 1 }] }), r);
    assert.deepEqual(r.body, { ok: false, error: 'out_of_stock', slug: 'a', size: '41' });
  } finally { m.restore(); unconfigure(); }
});

/* ------------------------------------------------------------ /api/telegram */
const UPDATE = (over = {}) => ({
  callback_query: {
    id: 'cbq-1', data: `s:confirm:${PLACED.order_id}`,
    from: { first_name: 'Малика', last_name: 'Т.' },
    message: { message_id: 77, chat: { id: -1001 } },
    ...over,
  },
});
const hook = (body, secret = 'hook-secret') => ({ method: 'POST', body, headers: { 'x-telegram-bot-api-secret-token': secret } });

test('webhook: rejects requests without the secret', async () => {
  configure();
  const m = mockFetch();
  try {
    let r = res(); await webhook(hook(UPDATE(), 'wrong'), r); assert.equal(r.code, 401);
    r = res(); await webhook({ method: 'POST', body: UPDATE(), headers: {} }, r); assert.equal(r.code, 401);
    assert.equal(m.calls.length, 0);
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    r = res(); await webhook(hook(UPDATE(), ''), r); assert.equal(r.code, 401, 'an unset secret never matches');
  } finally { m.restore(); unconfigure(); }
});

test('webhook: a manager button press changes the status and re-renders the message', async () => {
  configure();
  const m = mockFetch({
    'rpc/set_order_status': () => ({ status: 200, json: { status: 'confirmed' } }),
    'orders?id=eq.': () => ({
      status: 200,
      json: [{
        id: PLACED.order_id, number: 'OL-261013-0042', status: 'confirmed', created_at: '2026-10-13T10:00:00Z', lang: 'ru',
        customer_name: 'Азиз', phone: '+998901234567', contact_pref: 'call', delivery_method: 'courier_tashkent',
        payment_method: 'cash', subtotal: 1000000, discount: 0, delivery_fee: 30000, total: 1030000,
        order_items: [{ brand_snapshot: 'Nike', name_snapshot: 'Air Max', size_label: '42', fulfilment: 'stock', qty: 1, unit_price: 1000000 }],
        promo_codes: null,
      }],
    }),
  });
  try {
    const r = res();
    await webhook(hook(UPDATE()), r);
    assert.equal(r.code, 200);
    const set = m.calls.find((c) => c.url.includes('set_order_status'));
    assert.deepEqual(set.body, { p_order_id: PLACED.order_id, p_status: 'confirmed', p_note: 'Telegram', p_actor: 'telegram:Малика Т.' });
    const edit = m.calls.find((c) => c.url.includes('editMessageText'));
    assert.equal(edit.body.message_id, 77);
    assert.ok(edit.body.text.includes('Подтверждён') && edit.body.text.includes('Малика'));
    assert.deepEqual(edit.body.reply_markup.inline_keyboard.flat().map((b) => b.callback_data.split(':')[1]), ['ship', 'cancel']);
    assert.ok(m.calls.some((c) => c.url.includes('answerCallbackQuery')));
  } finally { m.restore(); unconfigure(); }
});

test('webhook: presses from other chats or with junk data change nothing', async () => {
  configure();
  const m = mockFetch();
  try {
    let r = res();
    await webhook(hook(UPDATE({ message: { message_id: 1, chat: { id: -999 } } })), r);
    assert.equal(r.code, 200);
    await webhook(hook(UPDATE({ data: 's:confirm:not-a-uuid' })), res());
    await webhook(hook(UPDATE({ data: `s:explode:${PLACED.order_id}` })), res());
    assert.ok(!m.calls.some((c) => c.url.includes('set_order_status')));
    const answers = m.calls.filter((c) => c.url.includes('answerCallbackQuery'));
    assert.equal(answers.length, 3);
  } finally { m.restore(); unconfigure(); }
});

test('webhook: cancelled orders stay cancelled; /id answers with the chat id', async () => {
  configure();
  const m = mockFetch({ 'rpc/set_order_status': () => ({ status: 400, json: { message: 'order_cancelled' } }) });
  try {
    await webhook(hook(UPDATE()), res());
    const answer = m.calls.find((c) => c.url.includes('answerCallbackQuery'));
    assert.equal(answer.body.text, 'Заказ уже отменён');
    assert.ok(!m.calls.some((c) => c.url.includes('editMessageText')));

    await webhook(hook({ message: { text: '/id', chat: { id: -1001 } } }), res());
    const idMsg = m.calls.filter((c) => c.url.includes('sendMessage')).pop();
    assert.ok(idMsg.body.text.includes('-1001'));
  } finally { m.restore(); unconfigure(); }
});

test('webhook: /start <order no> in a private chat replies with the status only', async () => {
  configure();
  const m = mockFetch({
    'orders?number=eq.OL-261013-0042': () => ({ status: 200, json: [{ status: 'shipped', lang: 'uz' }] }),
    'orders?number=eq.OL-261013-9999': () => ({ status: 200, json: [] }),
  });
  const start = (text, extra = {}) => hook({ message: { text, chat: { id: 555, type: 'private' }, from: { language_code: 'en' }, ...extra } });
  const lastSent = () => m.calls.filter((c) => c.url.includes('sendMessage')).pop().body;
  try {
    await webhook(start('/start OL-261013-0042'), res());
    let sent = lastSent();
    assert.equal(sent.chat_id, 555);
    assert.equal(sent.text, 'Buyurtma <b>OL-261013-0042</b>: joʻnatildi.', 'in the language the order was placed in');

    await webhook(start('/start OL-261013-9999'), res());
    assert.match(lastSent().text, /^Order OL-261013-9999 was not found/);

    await webhook(start('/start'), res());
    assert.match(lastSent().text, /^Hello!/);

    // junk payloads never reach the database query
    await webhook(start('/start OL-1&select=*'), res());
    assert.ok(!m.calls.some((c) => c.url.includes('select=*')));

    // groups are ignored (the managers' chat uses /id and buttons)
    const before = m.calls.length;
    await webhook(hook({ message: { text: '/start OL-261013-0042', chat: { id: -1001, type: 'supergroup' } } }), res());
    assert.equal(m.calls.length, before);
  } finally { m.restore(); unconfigure(); }
});

test('webhook: GET runs only a setup step requested in the database, and returns nothing', async () => {
  configure({ TELEGRAM_CHAT_ID: '' });
  resetTelegramChatCache();
  let pending = { action: 'discover' };
  const m = mockFetch({
    'settings?key=eq.telegram_setup': ({ init }) => {
      if (init.method === 'PATCH') { pending = JSON.parse(init.body).value; return { status: 204, json: null }; }
      return { status: 200, json: [{ value: pending }] };
    },
    getMe: () => ({ status: 200, json: { ok: true, result: { username: 'shop_bot' } } }),
    getWebhookInfo: () => ({ status: 200, json: { ok: true, result: { url: '' } } }),
    getUpdates: () => ({ status: 200, json: { ok: true, result: [{ my_chat_member: { chat: { id: -1002, type: 'supergroup', title: 'Managers' } } }] } }),
    setWebhook: () => ({ status: 200, json: { ok: true } }),
  });
  const get = () => ({ method: 'GET', url: '/api/telegram', headers: { host: 'evil.test', 'x-forwarded-for': `10.9.0.${++ipCounter}` } });
  try {
    let r = res(); await webhook(get(), r);
    assert.deepEqual(r.body, { ok: true }, 'the response never carries data');
    assert.equal(pending.done, true);
    assert.deepEqual(pending.result.chats, [{ id: -1002, type: 'supergroup', title: 'Managers' }]);
    assert.ok(!JSON.stringify(pending).includes('123:token'), 'the token is never stored');

    // nothing pending → no Telegram calls at all
    const before = m.calls.filter((c) => c.url.includes('api.telegram.org')).length;
    await webhook(get(), res());
    assert.equal(m.calls.filter((c) => c.url.includes('api.telegram.org')).length, before);

    // the webhook always points at this shop, whatever Host the caller sends
    pending = { action: 'webhook' };
    await webhook(get(), res());
    const hookCall = m.calls.find((c) => c.url.includes('setWebhook'));
    assert.equal(hookCall.body.url, 'https://outletlounge.uz/api/telegram');
    assert.equal(hookCall.body.secret_token, 'hook-secret');
    assert.equal(pending.result.ok, true);
  } finally { m.restore(); unconfigure(); resetTelegramChatCache(); }
});

test('order alerts go to the chat saved in settings when TELEGRAM_CHAT_ID is not set', async () => {
  configure({ TELEGRAM_CHAT_ID: '' });
  resetTelegramChatCache();
  const m = mockFetch({
    'settings?key=eq.telegram': () => ({ status: 200, json: [{ value: { chat_id: -100777 } }] }),
    'rpc/place_order': () => ({ status: 200, json: PLACED }),
    sendMessage: () => ({ status: 200, json: { ok: true, result: { chat: { id: -100777 }, message_id: 5 } } }),
  });
  try {
    const r = res();
    await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.notified, true);
    assert.equal(m.calls.find((c) => c.url.includes('sendMessage')).body.chat_id, '-100777');
  } finally { m.restore(); unconfigure(); resetTelegramChatCache(); }
});

test('order: the shared (database) rate limit refuses even when this instance has not seen the IP', async () => {
  configure();
  let over = true;
  const m = mockFetch({
    'rpc/rate_limit_hit': () => (over ? { status: 200, json: true } : { status: 500, json: { message: 'down' } }),
    'rpc/place_order': () => ({ status: 200, json: PLACED }),
  });
  try {
    let r = res(); await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 429);
    assert.ok(!m.calls.some((c) => c.url.includes('rpc/place_order')), 'no order placed');
    const hit = m.calls.find((c) => c.url.includes('rpc/rate_limit_hit'));
    assert.match(hit.body.p_key, /^[0-9a-f]{64}$/, 'only a hash of the IP is sent');
    assert.ok(!JSON.stringify(hit.body).includes('10.0.0.'), 'no raw IP');
    assert.deepEqual([hit.body.p_max, hit.body.p_window_seconds], [8, 600]);

    over = false; // the counter is unreachable → the order still goes through
    r = res(); await orderHandler(req(goodOrder()), r);
    assert.equal(r.code, 200);

    r = res(); await orderHandler(req(goodOrder({ website: 'spam' })), r);
    assert.equal(r.code, 400);
    assert.equal(m.calls.filter((c) => c.url.includes('rpc/rate_limit_hit')).length, 2, 'invalid requests are not counted in the database');
  } finally { m.restore(); unconfigure(); }
});

/* ------------------------------------------------------------ sizes + on-order lines */
test('size labels: letters, numbers, waist/length and ONE SIZE pass; junk is refused', () => {
  const ok = (size) => parseQuote({ items: [{ slug: 'a', size, qty: 1 }] });
  for (const good of ['M', 'XXL', '48', 'W32/L34', '42.5', 'ONE SIZE', 43]) {
    assert.ok(ok(good).ok, String(good));
  }
  assert.equal(ok('M').payload.items[0].size, 'M');
  assert.equal(ok(43).payload.items[0].size, '43', 'numbers become labels');
  assert.equal(ok('  XL ').payload.items[0].size, 'XL', 'whitespace is trimmed');
  for (const bad of ['', '   ', 'M!', '<b>', 'a|b', 'x'.repeat(13), '-1', null, undefined, {}]) {
    assert.equal(ok(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseNotify({ website: '', elapsed: 2000, slug: 'a', size: 'XL', phone: '901234567' }).notify.size, 'XL');
  assert.equal(parseNotify({ website: '', elapsed: 2000, slug: 'a', size: 'XL!', phone: '901234567' }).field, 'size');
  assert.deepEqual(parseDbError('out_of_stock:gant-denim-jacket-blue:XXL'), { error: 'out_of_stock', slug: 'gant-denim-jacket-blue', size: 'XXL' });
});

test('Telegram message marks the lines ordered from abroad and counts them', () => {
  const msg = orderMessage({
    number: 'OL-2', status: 'new', created_at: '2026-10-13T10:00:00Z', lang: 'ru',
    customer_name: 'Азиз', phone: '+998901234567', contact_pref: 'call', delivery_method: 'courier_tashkent',
    payment_method: 'cash', subtotal: 7190000, discount: 0, delivery_fee: 0, total: 7190000,
    order_items: [
      { brand_snapshot: 'Lacoste', name_snapshot: 'Classic Fit Polo', size_label: 'M', fulfilment: 'stock', qty: 1, unit_price: 1290000 },
      { brand_snapshot: 'Diesel', name_snapshot: 'Leather Biker Jacket', size_label: 'L', fulfilment: 'order', qty: 1, unit_price: 5900000 },
    ],
  });
  const lines = msg.split('\n');
  const polo = lines.find((l) => l.includes('Classic Fit Polo'));
  const jacket = lines.find((l) => l.includes('Leather Biker Jacket'));
  assert.ok(polo.includes('— M × 1') && !polo.includes('под заказ'));
  assert.ok(jacket.includes('— L × 1') && jacket.includes('✈️ под заказ'));
  assert.ok(msg.includes('Под заказ из-за рубежа: 1 шт.'));
  const none = orderMessage({ number: 'OL-3', status: 'new', customer_name: 'x', phone: '+998901234567', delivery_method: 'pickup', payment_method: 'cash',
    order_items: [{ name_snapshot: 'Tee', size_label: 'S', fulfilment: 'stock', qty: 1, unit_price: 1 }], subtotal: 1, discount: 0, delivery_fee: 0, total: 1 });
  assert.ok(!none.includes('под заказ'), 'nothing to flag when everything is in stock');
});

test('quote: each line says whether it is in stock here or ordered from abroad', async () => {
  configure();
  const m = mockFetch({ 'rpc/quote_order': () => ({ status: 200, json: { subtotal: 1, discount: 0, delivery_fee: 0, total: 1, promo_code: null,
    lines: [{ slug: 'a', size_label: 'M', qty: 1, unit_price: 1, fulfilment: 'stock' }, { slug: 'b', size_label: 'L', qty: 2, unit_price: 1, fulfilment: 'order' }] } }) });
  try {
    const r = res();
    await quoteHandler(req({ items: [{ slug: 'a', size: 'M', qty: 1 }, { slug: 'b', size: 'L', qty: 2 }] }), r);
    assert.deepEqual(r.body.lines, [
      { slug: 'a', size: 'M', qty: 1, unit_price: 1, fulfilment: 'stock' },
      { slug: 'b', size: 'L', qty: 2, unit_price: 1, fulfilment: 'order' },
    ]);
  } finally { m.restore(); unconfigure(); }
});
