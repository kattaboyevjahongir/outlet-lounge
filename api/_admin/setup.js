// First-run setup of the shop's owner account — no e-mail involved.
//
//   GET  /api/admin-setup                                   → { open, telegram }
//   POST { action: 'send' }                                 → a 8-digit code goes to the managers' Telegram chat
//   POST { action: 'claim', code, username, name, password } → the owner account is created
//
// The setup is only open while the shop has NO active owner. Proof that the person is the owner is
// the code: it is posted to the managers' Telegram group, so only people in that group can read it.
// The code is stored hashed, valid for 15 minutes, allows 5 attempts, and is consumed atomically.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN (+ the managers' chat setting)

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { select, upsert, patch, remove, tg, telegramChat, authAdmin, insert, logActivity, limited, limitedShared, clientIp, sameSite } from '../_lib/services.js';
import { USERNAME_RE, loginEmail, passwordProblem } from '../../assets/admin/logic.js';

const TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const KEY = 'admin_setup';

const send = (res, code, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(code).json(body);
};

const hashCode = (code) =>
  createHash('sha256').update(`${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`).digest('hex');
const sameHash = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

async function ownerExists() {
  const r = await select('staff?role=eq.owner&is_active=eq.true&select=user_id&limit=1');
  if (!r.ok || !Array.isArray(r.data)) throw new Error('staff lookup failed');
  return r.data.length > 0;
}
async function loadSetup() {
  const r = await select(`settings?key=eq.${KEY}&select=value`);
  return r.ok && Array.isArray(r.data) && r.data[0] ? r.data[0].value : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return send(res, 503, { error: 'not_configured' });
  if (limited(`setup:${clientIp(req)}`, 40, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });

  let hasOwner;
  try {
    hasOwner = await ownerExists();
  } catch (e) {
    console.error('setup: owner lookup failed');
    return send(res, 502, { error: 'upstream' });
  }
  const chat = await telegramChat();

  if (req.method === 'GET') return send(res, 200, { open: !hasOwner, telegram: !!chat });

  if (!sameSite(req)) return send(res, 403, { error: 'forbidden' });
  if (hasOwner) return send(res, 409, { error: 'closed' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};

  /* ---- send the code to the managers' chat ---- */
  if (b.action === 'send') {
    if (!chat) return send(res, 503, { error: 'telegram_off' });
    if (limited(`setup-send:${clientIp(req)}`, 3, 10 * 60 * 1000) || await limitedShared(`setup-send:${clientIp(req)}`, 3, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });
    const current = await loadSetup();
    if (current && current.sent_at && Date.now() - Date.parse(current.sent_at) < 60 * 1000) {
      return send(res, 429, { error: 'wait' });
    }
    const code = String(randomInt(0, 100000000)).padStart(8, '0');
    const saved = await upsert('settings', {
      key: KEY, is_public: false, updated_at: new Date().toISOString(),
      value: { hash: hashCode(code), attempts: 0, sent_at: new Date().toISOString(), expires_at: new Date(Date.now() + TTL_MS).toISOString() },
    }, 'key');
    if (!saved.ok) return send(res, 502, { error: 'upstream' });
    const sent = await tg('sendMessage', {
      chat_id: chat, parse_mode: 'HTML',
      text: `🔐 <b>Outlet Lounge · создание владельца админки</b>\n\nКод подтверждения: <code>${code}</code>\nДействует 15 минут. Если вы этого не запрашивали — просто проигнорируйте.`,
    });
    if (!sent || !sent.ok) return send(res, 502, { error: 'telegram_failed' });
    return send(res, 200, { ok: true, ttl_minutes: 15 });
  }

  /* ---- claim the owner account ---- */
  if (b.action === 'claim') {
    if (limited(`setup-claim:${clientIp(req)}`, 10, 10 * 60 * 1000) || await limitedShared(`setup-claim:${clientIp(req)}`, 10, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });
    const username = String(b.username || '').trim().toLowerCase();
    const name = String(b.name || '').replace(/\s+/g, ' ').trim();
    const password = String(b.password || '');
    if (!USERNAME_RE.test(username)) return send(res, 400, { error: 'invalid', field: 'username' });
    if (name.length < 2 || name.length > 60) return send(res, 400, { error: 'invalid', field: 'name' });
    const pw = passwordProblem(password);
    if (pw) return send(res, 400, { error: 'invalid', field: 'password', reason: pw });

    const setup = await loadSetup();
    if (!setup || !setup.hash || Date.parse(setup.expires_at) < Date.now()) return send(res, 400, { error: 'invalid_code' });
    if ((setup.attempts || 0) >= MAX_ATTEMPTS) {
      await remove(`settings?key=eq.${KEY}`);
      return send(res, 429, { error: 'locked' });
    }
    // count the attempt before comparing, so parallel guesses can't exceed the limit
    await patch(`settings?key=eq.${KEY}`, { value: { ...setup, attempts: (setup.attempts || 0) + 1 } });
    const code = String(b.code || '').replace(/\D/g, '');
    if (!sameHash(hashCode(code), setup.hash)) {
      return send(res, 400, { error: 'invalid_code', attempts_left: Math.max(0, MAX_ATTEMPTS - (setup.attempts || 0) - 1) });
    }
    // consume the code: only one request can win
    const used = await remove(`settings?key=eq.${KEY}&value->>hash=eq.${setup.hash}`);
    if (!used.ok || !Array.isArray(used.data) || used.data.length !== 1) return send(res, 409, { error: 'closed' });

    const created = await authAdmin('POST', '/admin/users', {
      email: loginEmail(username), password, email_confirm: true, user_metadata: { username, name },
    });
    if (!created.ok) {
      if (created.status === 422 && /exist|registered/i.test(JSON.stringify(created.data))) return send(res, 409, { error: 'username_taken' });
      if (created.code === 'weak_password') return send(res, 400, { error: 'invalid', field: 'password', reason: 'weak' });
      console.error('setup: user create failed', created.status);
      return send(res, 502, { error: 'upstream' });
    }
    const userId = created.data && created.data.id;
    const row = await insert('staff', { user_id: userId, name, role: 'owner', username });
    if (!row.ok) {
      await authAdmin('DELETE', `/admin/users/${userId}`); // don't leave a login without a staff row
      console.error('setup: staff insert failed', row.status);
      return send(res, 502, { error: 'upstream' });
    }
    await logActivity(name, 'insert', 'staff', userId, { label: username, changes: {}, note: 'owner created through first-run setup' });
    return send(res, 200, { ok: true, username });
  }

  return send(res, 400, { error: 'invalid' });
}
