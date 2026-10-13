// node --test tests/*.test.mjs  — owner setup, staff management, Telegram test (a small fake Supabase + Telegram)
import test from 'node:test';
import assert from 'node:assert/strict';
import admin from '../api/admin.js';

const via = (fn) => (req, res) => admin({ ...req, query: { fn } }, res);
const setupHandler = via('setup');
const staffHandler = via('staff');
const telegramHandler = via('telegram');

const ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
const OWNER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const MANAGER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';

let ip = 0;
const res = () => {
  const r = { code: 200, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
};
const call = async (handler, { method = 'POST', body, token, headers = {} } = {}) => {
  const r = res();
  await handler({
    method, body,
    headers: { host: 'shop.test', 'x-forwarded-for': `10.7.0.${++ip}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  }, r);
  return r;
};

// ---- a tiny stateful stand-in for the parts of Supabase and Telegram these endpoints touch
function backend(seed = {}) {
  const s = {
    staff: seed.staff || [],
    settings: seed.settings || {},
    users: seed.users || [],
    tokens: seed.tokens || {},
    activity: [],
    telegram: [],
    deletedUsers: [],
    failStaffInsert: false,
    ...seed.extra,
  };
  const real = globalThis.fetch;
  const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => (body === null ? '' : JSON.stringify(body)) });
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const q = decodeURIComponent(u.split('?')[1] || '');
    const bearer = String((init.headers || {}).Authorization || '').replace(/^Bearer /, '');

    if (u.includes('api.telegram.org')) {
      s.telegram.push({ method: u.split('/').pop(), body });
      return json(200, { ok: true, result: {} });
    }
    if (u.includes('/auth/v1/user')) {
      const id = s.tokens[bearer];
      return id ? json(200, { id }) : json(401, { msg: 'invalid JWT' });
    }
    if (u.includes('/auth/v1/admin/users')) {
      if (method === 'POST') {
        if (s.users.some((x) => x.email === body.email)) return json(422, { error_code: 'email_exists', msg: 'A user with this email address has already been registered' });
        if (!/\d/.test(body.password) || body.password.length < 10) return json(422, { error_code: 'weak_password', msg: 'weak' });
        const user = { id: `cccccccc-0000-4000-8000-${String(s.users.length + 10).padStart(12, '0')}`, email: body.email, password: body.password, meta: body.user_metadata };
        s.users.push(user);
        return json(200, { id: user.id, email: user.email });
      }
      const id = u.split('/').pop().split('?')[0];
      if (method === 'PUT') { Object.assign(s.users.find((x) => x.id === id) || {}, { password: body.password }); return json(200, {}); }
      if (method === 'DELETE') { s.deletedUsers.push(id); s.users = s.users.filter((x) => x.id !== id); return json(200, {}); }
    }
    if (u.includes('/rest/v1/staff')) {
      if (method === 'GET') {
        let rows = s.staff;
        const m = q.match(/user_id=eq\.([^&]+)/);
        if (m) rows = rows.filter((r) => r.user_id === m[1]);
        if (/role=eq\.owner/.test(q)) rows = rows.filter((r) => r.role === 'owner' && r.is_active);
        const un = q.match(/username=eq\.([^&]+)/);
        if (un) rows = rows.filter((r) => r.username === un[1]);
        return json(200, rows);
      }
      if (method === 'POST') {
        if (s.failStaffInsert) return json(500, { message: 'boom' });
        s.staff.push({ is_active: true, ...body });
        return json(201, [body]);
      }
      if (method === 'PATCH') {
        const id = q.match(/user_id=eq\.([^&]+)/)[1];
        const row = s.staff.find((r) => r.user_id === id);
        const owners = s.staff.filter((r) => r.role === 'owner' && r.is_active && r.user_id !== id);
        if (row.role === 'owner' && row.is_active && (body.is_active === false || (body.role && body.role !== 'owner')) && !owners.length) {
          return json(400, { message: 'last_owner' });
        }
        Object.assign(row, body);
        return json(204, null);
      }
    }
    if (u.includes('/rest/v1/activity_log')) { s.activity.push(body); return json(201, [body]); }
    if (u.includes('/rest/v1/settings')) {
      const key = (q.match(/key=eq\.([^&]+)/) || [])[1];
      if (method === 'GET') return json(200, s.settings[key] ? [{ value: s.settings[key] }] : []);
      if (method === 'POST') { s.settings[body.key] = body.value; return json(201, null); }
      if (method === 'PATCH') { s.settings[key] = body.value; return json(204, null); }
      if (method === 'DELETE') {
        const hash = (q.match(/value->>hash=eq\.([^&]+)/) || [])[1];
        const cur = s.settings[key];
        if (cur && (!hash || cur.hash === hash)) { delete s.settings[key]; return json(200, [{ key }]); }
        return json(200, []);
      }
    }
    return json(404, { message: `unhandled ${method} ${u}` });
  };
  return { state: s, restore: () => { globalThis.fetch = real; } };
}
const configure = (extra = {}) => Object.assign(process.env, {
  SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  TELEGRAM_BOT_TOKEN: '123:t', TELEGRAM_CHAT_ID: '-1001', ...extra,
});
const reset = () => ENV.forEach((k) => delete process.env[k]);
const owner = (o = {}) => ({ user_id: OWNER_ID, name: 'Aziz', role: 'owner', is_active: true, username: 'aziz', ...o });
const manager = (o = {}) => ({ user_id: MANAGER_ID, name: 'Malika', role: 'manager', is_active: true, username: 'malika', ...o });

/* --------------------------------------------------------- first-run setup */
test('setup is open only while the shop has no owner', async () => {
  configure();
  let b = backend();
  try {
    let r = await call(setupHandler, { method: 'GET' });
    assert.deepEqual(r.body, { open: true, telegram: true });
    b.state.staff.push(owner());
    r = await call(setupHandler, { method: 'GET' });
    assert.deepEqual(r.body, { open: false, telegram: true });
    r = await call(setupHandler, { body: { action: 'send' } });
    assert.equal(r.code, 409);
    r = await call(setupHandler, { body: { action: 'claim', code: '12345678', username: 'x1y', name: 'X Y', password: 'Password123' } });
    assert.equal(r.code, 409);
    assert.equal(b.state.telegram.length, 0, 'nothing is sent once an owner exists');
  } finally { b.restore(); reset(); }
});

test('the code goes to the managers chat, is stored hashed, and claiming creates the owner', async () => {
  configure();
  const b = backend();
  try {
    let r = await call(setupHandler, { body: { action: 'send' } });
    assert.equal(r.code, 200);
    const msg = b.state.telegram.find((t) => t.method === 'sendMessage');
    assert.equal(msg.body.chat_id, '-1001');
    const code = msg.body.text.match(/<code>(\d{8})<\/code>/)[1];
    const stored = b.state.settings.admin_setup;
    assert.ok(stored.hash && !JSON.stringify(stored).includes(code), 'the code itself is never stored');

    // wrong code first
    r = await call(setupHandler, { body: { action: 'claim', code: '00000000', username: 'aziz', name: 'Aziz R', password: 'Lounge2026ok' } });
    assert.equal(r.code, 400);
    assert.equal(r.body.error, 'invalid_code');
    assert.equal(r.body.attempts_left, 4);

    r = await call(setupHandler, { body: { action: 'claim', code, username: 'Aziz', name: ' Aziz  R ', password: 'Lounge2026ok' } });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body, { ok: true, username: 'aziz' });
    const user = b.state.users[0];
    assert.equal(user.email, 'aziz@staff.outlet-lounge.invalid');
    assert.equal(user.password, 'Lounge2026ok');
    assert.deepEqual(b.state.staff, [{ is_active: true, user_id: user.id, name: 'Aziz R', role: 'owner', username: 'aziz' }]);
    assert.equal(b.state.settings.admin_setup, undefined, 'the code is used up');
    assert.ok(!JSON.stringify(b.state.activity).includes('Lounge2026ok'), 'the password never reaches the log');

    // and the door closes
    r = await call(setupHandler, { method: 'GET' });
    assert.equal(r.body.open, false);
  } finally { b.restore(); reset(); }
});

test('five wrong guesses lock the code; a resend is throttled', async () => {
  configure();
  const b = backend();
  try {
    await call(setupHandler, { body: { action: 'send' } });
    const again = await call(setupHandler, { body: { action: 'send' } });
    assert.equal(again.code, 429, 'one code per minute');
    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await call(setupHandler, { body: { action: 'claim', code: String(10000000 + i), username: 'aziz', name: 'Aziz', password: 'Lounge2026ok' } });
      assert.equal(last.code, 400);
    }
    last = await call(setupHandler, { body: { action: 'claim', code: '99999999', username: 'aziz', name: 'Aziz', password: 'Lounge2026ok' } });
    assert.equal(last.code, 429);
    assert.equal(last.body.error, 'locked');
    assert.equal(b.state.settings.admin_setup, undefined, 'a locked code is deleted');
    assert.equal(b.state.users.length, 0);
  } finally { b.restore(); reset(); }
});

test('claim: expired code, bad input, weak password and taken username change nothing', async () => {
  configure();
  const b = backend({ settings: { admin_setup: { hash: 'x', attempts: 0, expires_at: new Date(Date.now() - 1000).toISOString() } } });
  try {
    const claim = (o) => call(setupHandler, { body: { action: 'claim', code: '12345678', username: 'aziz', name: 'Aziz', password: 'Lounge2026ok', ...o } });
    assert.equal((await claim({})).body.error, 'invalid_code', 'expired');
    assert.equal((await claim({ username: 'A' })).body.field, 'username');
    assert.equal((await claim({ name: 'A' })).body.field, 'name');
    assert.equal((await claim({ password: 'short' })).body.reason, 'short');
    assert.equal((await claim({ password: 'onlyletterspassword' })).body.reason, 'weak');
    assert.equal(b.state.users.length, 0);
    assert.equal(b.state.settings.admin_setup.attempts, 0, 'invalid input does not burn attempts');
  } finally { b.restore(); reset(); }
});

test('claim rolls back the login when the staff row cannot be written', async () => {
  configure();
  const b = backend({ extra: { failStaffInsert: true } });
  try {
    await call(setupHandler, { body: { action: 'send' } });
    const code = b.state.telegram[0].body.text.match(/<code>(\d{8})<\/code>/)[1];
    const r = await call(setupHandler, { body: { action: 'claim', code, username: 'aziz', name: 'Aziz', password: 'Lounge2026ok' } });
    assert.equal(r.code, 502);
    assert.equal(b.state.users.length, 0, 'no orphan login');
    assert.equal(b.state.deletedUsers.length, 1);
  } finally { b.restore(); reset(); }
});

test('setup needs Telegram: without a chat no code can be sent', async () => {
  configure({ TELEGRAM_CHAT_ID: '' });
  const b = backend();
  try {
    const g = await call(setupHandler, { method: 'GET' });
    assert.deepEqual(g.body, { open: true, telegram: false });
    const r = await call(setupHandler, { body: { action: 'send' } });
    assert.equal(r.code, 503);
    assert.equal(r.body.error, 'telegram_off');
  } finally { b.restore(); reset(); }
});

/* --------------------------------------------------------- staff management */
const withOwner = (extra = {}) => backend({
  staff: [owner(), manager()],
  tokens: { 'owner-token': OWNER_ID, 'manager-token': MANAGER_ID },
  ...extra,
});

test('only an owner may manage staff', async () => {
  configure();
  const b = withOwner();
  try {
    const body = { action: 'create', username: 'newbie', name: 'New B', role: 'manager', password: 'Lounge2026ok' };
    assert.equal((await call(staffHandler, { body })).code, 401);
    assert.equal((await call(staffHandler, { body, token: 'nope' })).code, 401);
    assert.equal((await call(staffHandler, { body, token: 'manager-token' })).code, 403);
    b.state.staff[0].is_active = false;
    assert.equal((await call(staffHandler, { body, token: 'owner-token' })).code, 403, 'a deactivated owner is no owner');
    assert.equal(b.state.users.length, 0);
    assert.equal((await call(staffHandler, { method: 'GET' })).code, 405);
    assert.equal((await call(staffHandler, { body, token: 'owner-token', headers: { origin: 'https://evil.test' } })).code, 403);
  } finally { b.restore(); reset(); }
});

test('owner creates a manager with a username and password', async () => {
  configure();
  const b = withOwner();
  try {
    const r = await call(staffHandler, { token: 'owner-token', body: { action: 'create', username: 'Jasur_K', name: 'Jasur K', role: 'manager', password: 'Lounge2026ok' } });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    const u = b.state.users[0];
    assert.equal(u.email, 'jasur_k@staff.outlet-lounge.invalid');
    const row = b.state.staff.find((s) => s.user_id === u.id);
    assert.deepEqual({ role: row.role, username: row.username, name: row.name }, { role: 'manager', username: 'jasur_k', name: 'Jasur K' });
    assert.equal(b.state.activity.at(-1).actor, 'Aziz');
    assert.ok(!JSON.stringify(b.state.activity).includes('Lounge2026ok'));

    const dup = await call(staffHandler, { token: 'owner-token', body: { action: 'create', username: 'jasur_k', name: 'Other', role: 'manager', password: 'Lounge2026ok' } });
    assert.equal(dup.code, 409);
    for (const [over, field] of [[{ username: 'x' }, 'username'], [{ name: '' }, 'name'], [{ role: 'god' }, 'role'], [{ password: 'nodigitshere' }, 'password']]) {
      const bad = await call(staffHandler, { token: 'owner-token', body: { action: 'create', username: 'valid1', name: 'Valid', role: 'manager', password: 'Lounge2026ok', ...over } });
      assert.equal(bad.code, 400);
      assert.equal(bad.body.field, field);
    }
    assert.equal(b.state.users.length, 1, 'rejected requests create nothing');
  } finally { b.restore(); reset(); }
});

test('owner resets a password, deactivates, changes role — but cannot lock themselves out', async () => {
  configure();
  const b = withOwner();
  b.state.users.push({ id: MANAGER_ID, email: 'malika@staff.outlet-lounge.invalid', password: 'Old-password-1' });
  try {
    let r = await call(staffHandler, { token: 'owner-token', body: { action: 'password', user_id: MANAGER_ID, password: 'Brand-new-pass-7' } });
    assert.equal(r.code, 200);
    assert.equal(b.state.users[0].password, 'Brand-new-pass-7');
    assert.deepEqual(b.state.activity.at(-1).diff.changes.password, ['•••', 'changed'], 'logged without the value');

    r = await call(staffHandler, { token: 'owner-token', body: { action: 'password', user_id: MANAGER_ID, password: 'short' } });
    assert.equal(r.code, 400);

    r = await call(staffHandler, { token: 'owner-token', body: { action: 'update', user_id: MANAGER_ID, is_active: false } });
    assert.equal(r.code, 200);
    assert.equal(b.state.staff.find((s) => s.user_id === MANAGER_ID).is_active, false);
    assert.deepEqual(b.state.activity.at(-1).diff.changes.is_active, ['true', 'false']);

    r = await call(staffHandler, { token: 'owner-token', body: { action: 'update', user_id: MANAGER_ID, role: 'owner', is_active: true } });
    assert.equal(r.code, 200);
    assert.equal(b.state.staff.find((s) => s.user_id === MANAGER_ID).role, 'owner');

    // yourself: never
    r = await call(staffHandler, { token: 'owner-token', body: { action: 'update', user_id: OWNER_ID, is_active: false } });
    assert.equal(r.code, 400);
    assert.equal(r.body.error, 'self');
    r = await call(staffHandler, { token: 'owner-token', body: { action: 'update', user_id: OWNER_ID, role: 'manager' } });
    assert.equal(r.body.error, 'self');

    // the database refuses to remove the last owner (here: owner-token = the manager promoted above is also owner)
    b.state.staff.find((s) => s.user_id === MANAGER_ID).role = 'manager';
    b.state.tokens['promoted'] = MANAGER_ID;
    b.state.staff.find((s) => s.user_id === MANAGER_ID).role = 'owner';
    r = await call(staffHandler, { token: 'promoted', body: { action: 'update', user_id: OWNER_ID, is_active: false } });
    assert.equal(r.code, 200, 'allowed: another active owner remains');
    r = await call(staffHandler, { token: 'owner-token', body: { action: 'update', user_id: MANAGER_ID, is_active: false } });
    assert.equal(r.code, 403, 'the deactivated owner can no longer act');

    r = await call(staffHandler, { token: 'promoted', body: { action: 'update', user_id: '11111111-1111-4111-8111-111111111111', role: 'manager' } });
    assert.equal(r.code, 404);
    r = await call(staffHandler, { token: 'promoted', body: { action: 'update', user_id: 'not-a-uuid', role: 'manager' } });
    assert.equal(r.code, 400);
  } finally { b.restore(); reset(); }
});

test('Telegram test message: owner only', async () => {
  configure();
  const b = withOwner();
  try {
    assert.equal((await call(telegramHandler, { token: 'manager-token', body: { action: 'test' } })).code, 403);
    assert.equal(b.state.telegram.length, 0);
    const r = await call(telegramHandler, { token: 'owner-token', body: { action: 'test' } });
    assert.equal(r.code, 200);
    assert.equal(b.state.telegram[0].body.chat_id, '-1001');
    configure({ TELEGRAM_CHAT_ID: '' });
    const off = await call(telegramHandler, { token: 'owner-token', body: { action: 'test' } });
    assert.equal(off.code, 409);
  } finally { b.restore(); reset(); }
});
