// node --test tests/*.test.mjs  — admin endpoints (Supabase + Telegram mocked)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import admin, { ADMIN_ROUTES } from '../api/admin.js';

// every admin endpoint is reached through the one /api/admin function, as vercel.json routes it
const via = (fn) => (req, res) => admin({ ...req, query: { ...(req.query || {}), fn } }, res);
const configHandler = via('config');
const statusHandler = via('order-status');

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
const configure = (extra = {}) => Object.assign(process.env, {
  SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_ANON_KEY: 'anon-key', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  TELEGRAM_BOT_TOKEN: '123:token', TELEGRAM_CHAT_ID: '-1001', ...extra,
});
const unconfigure = () => ENV_KEYS.forEach((k) => delete process.env[k]);

let ip = 0;
const res = () => {
  const r = { code: 200, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
};
const OID = '11111111-2222-3333-4444-555555555555';
const post = (body, headers = {}) => ({
  method: 'POST', body,
  headers: { host: 'shop.test', authorization: 'Bearer staff-jwt', 'x-forwarded-for': `10.1.0.${++ip}`, ...headers },
});

const mockFetch = (handlers = {}) => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url: String(url), method: init.method || 'GET', body, headers: init.headers || {} });
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

const ORDER_ROW = {
  id: OID, number: 'OL-261013-0042', status: 'confirmed', customer_name: 'Азиз', phone: '+998901234567',
  delivery_method: 'courier_tashkent', payment_method: 'cash', subtotal: 1000, discount: 0, delivery_fee: 0, total: 1000,
  tg_chat_id: -1001, tg_message_id: 77, created_at: '2026-10-13T10:00:00Z',
  order_items: [{ brand_snapshot: 'Nike', name_snapshot: 'Air Max', size_eu: 42, qty: 1, unit_price: 1000 }], promo_codes: null,
};
const happyBackend = (over = {}) => ({
  'rpc/set_order_status': () => ({ status: 200, json: { order_id: OID, number: 'OL-261013-0042', status: 'confirmed' } }),
  [`orders?id=eq.${OID}`]: () => ({ status: 200, json: [ORDER_ROW] }),
  'order_events?order_id': () => ({ status: 200, json: [{ actor: 'Малика' }] }),
  editMessageText: () => ({ status: 200, json: { ok: true } }),
  ...over,
});

test('admin-config: public values only, no caching, 503 when unconfigured', () => {
  configure();
  try {
    const r = res(); configHandler({ method: 'GET', headers: {} }, r);
    assert.equal(r.code, 200);
    assert.deepEqual(r.body, { url: 'https://x.supabase.co', anonKey: 'anon-key' });
    assert.equal(r.headers['Cache-Control'], 'no-store');
    assert.ok(!JSON.stringify(r.body).includes('service-key'));
    const bad = res(); configHandler({ method: 'POST', headers: {} }, bad);
    assert.equal(bad.code, 405);
  } finally { unconfigure(); }
  const off = res(); configHandler({ method: 'GET', headers: {} }, off);
  assert.equal(off.code, 503);
});

test('status change runs as the staff member and re-renders the Telegram message', async () => {
  configure();
  const m = mockFetch(happyBackend());
  try {
    const r = res();
    await statusHandler(post({ order_id: OID, status: 'confirmed', note: ' called ' }), r);
    assert.equal(r.code, 200);
    assert.deepEqual(r.body, { ok: true, status: 'confirmed', number: 'OL-261013-0042', telegram: 'updated' });

    const rpcCall = m.calls.find((c) => c.url.includes('rpc/set_order_status'));
    assert.equal(rpcCall.headers.Authorization, 'Bearer staff-jwt', 'must act with the staff JWT, not the service key');
    assert.equal(rpcCall.headers.apikey, 'anon-key');
    assert.deepEqual(rpcCall.body, { p_order_id: OID, p_status: 'confirmed', p_note: 'called' });
    assert.ok(!('p_actor' in rpcCall.body), 'the actor name comes from the database, never from the browser');

    const edit = m.calls.find((c) => c.url.includes('editMessageText'));
    assert.equal(edit.body.chat_id, -1001);
    assert.equal(edit.body.message_id, 77);
    assert.match(edit.body.text, /Подтверждён/);
    assert.match(edit.body.text, /Малика/);
    assert.ok(edit.body.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === `s:ship:${OID}`));
  } finally { m.restore(); unconfigure(); }
});

test('status change is kept even when Telegram is off or fails', async () => {
  configure({ TELEGRAM_BOT_TOKEN: '' });
  const noToken = mockFetch(happyBackend({ [`orders?id=eq.${OID}`]: () => ({ status: 200, json: [{ ...ORDER_ROW, tg_message_id: null }] }) }));
  try {
    const r = res();
    await statusHandler(post({ order_id: OID, status: 'confirmed' }), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.telegram, 'skipped');
  } finally { noToken.restore(); }

  configure();
  const failing = mockFetch(happyBackend({ editMessageText: () => ({ status: 400, json: { ok: false, description: 'chat not found' } }) }));
  try {
    const r = res();
    await statusHandler(post({ order_id: OID, status: 'confirmed' }), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.telegram, 'failed');
  } finally { failing.restore(); unconfigure(); }
});

test('"message is not modified" counts as in sync', async () => {
  configure();
  const m = mockFetch(happyBackend({ editMessageText: () => ({ status: 400, json: { ok: false, description: 'Bad Request: message is not modified' } }) }));
  try {
    const r = res();
    await statusHandler(post({ order_id: OID, status: 'confirmed' }), r);
    assert.equal(r.body.telegram, 'updated');
  } finally { m.restore(); unconfigure(); }
});

test('errors from the database map to clear HTTP codes', async () => {
  configure();
  const cases = [
    ['forbidden', 400, 403], ['order_cancelled', 400, 409], ['not_found', 400, 404], ['JWT expired', 401, 401],
  ];
  for (const [message, upstream, expected] of cases) {
    const m = mockFetch({ 'rpc/set_order_status': () => ({ status: upstream, json: { message } }) });
    try {
      const r = res();
      await statusHandler(post({ order_id: OID, status: 'shipped' }), r);
      assert.equal(r.code, expected, message);
      assert.ok(!m.calls.some((c) => c.url.includes('editMessageText')), 'no Telegram edit when the change failed');
    } finally { m.restore(); }
  }
  unconfigure();
});

test('rejects missing token, bad input, wrong method and cross-site requests', async () => {
  configure();
  const m = mockFetch(happyBackend());
  try {
    let r = res(); await statusHandler(post({ order_id: OID, status: 'confirmed' }, { authorization: '' }), r);
    assert.equal(r.code, 401);
    r = res(); await statusHandler(post({ order_id: 'not-a-uuid', status: 'confirmed' }), r);
    assert.equal(r.code, 400);
    r = res(); await statusHandler(post({ order_id: OID, status: 'refunded' }), r);
    assert.equal(r.code, 400);
    r = res(); await statusHandler({ ...post({}), method: 'GET' }, r);
    assert.equal(r.code, 405);
    r = res(); await statusHandler(post({ order_id: OID, status: 'confirmed' }, { origin: 'https://evil.test' }), r);
    assert.equal(r.code, 403);
    assert.equal(m.calls.length, 0, 'nothing reached Supabase');
  } finally { m.restore(); unconfigure(); }
});

test('503 when Supabase is not configured', async () => {
  unconfigure();
  const r = res();
  await statusHandler(post({ order_id: OID, status: 'confirmed' }), r);
  assert.equal(r.code, 503);
});

/* ------------------------------------------------- one function for the admin endpoints */
test('admin dispatcher: unknown or missing endpoint answers 404', async () => {
  for (const fn of ['', 'nope', 'constructor', '__proto__', 'toString']) {
    const r = res();
    await admin({ method: 'GET', headers: {}, query: fn ? { fn } : {} }, r);
    assert.equal(r.code, 404, `fn=${fn}`);
  }
});

test('vercel.json routes every /api/admin-<name> address to the dispatcher', () => {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rule = cfg.rewrites.find((r) => r.destination.startsWith('/api/admin?fn='));
  assert.ok(rule, 'rewrite exists');
  assert.ok(cfg.rewrites.indexOf(rule) < cfg.rewrites.length - 1, 'before the catch-all');
  const names = rule.source.match(/\(([^)]+)\)/)[1].split('|').sort();
  assert.deepEqual(names, Object.keys(ADMIN_ROUTES).sort());
  const clientUrls = [
    ...readFileSync(new URL('../assets/admin/data.js', import.meta.url), 'utf8').matchAll(/\/api\/admin-([a-z-]+)/g),
    ...readFileSync(new URL('../assets/admin/app.js', import.meta.url), 'utf8').matchAll(/\/api\/admin-([a-z-]+)/g),
  ].map((m) => m[1]);
  for (const u of clientUrls) assert.ok(names.includes(u), `client calls /api/admin-${u}`);
});

test('deployment stays within the Hobby plan: at most 12 functions, all near the database', () => {
  const fns = readdirSync(new URL('../api/', import.meta.url)).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  assert.ok(fns.length <= 12, `${fns.length} functions: ${fns.join(', ')}`);
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(cfg.regions, ['fra1'], 'functions run in Frankfurt, next to Supabase (eu-central-1)');
});
