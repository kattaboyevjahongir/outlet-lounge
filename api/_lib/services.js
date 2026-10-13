// Thin clients for Supabase (service role) and the Telegram Bot API, plus a tiny rate limiter.
// Secrets come only from environment variables and are never logged or returned.
import { createHash } from 'node:crypto';

const TIMEOUT = 8000;

/* ------------------------------------------------------------ Supabase */
export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return url && key ? { url, key } : null;
}

async function call(method, path, body, extraHeaders = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw Object.assign(new Error('not_configured'), { code: 'not_configured' });
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { ok: res.ok, status: res.status, data };
}

// Postgres function call. Errors raised inside (e.g. "out_of_stock:slug:41") come back in .error
export async function rpc(name, args) {
  const r = await call('POST', `rpc/${name}`, args);
  if (r.ok) return { ok: true, data: r.data };
  return { ok: false, status: r.status, error: (r.data && (r.data.message || r.data.error)) || `rpc ${r.status}` };
}
export const select = (path) => call('GET', path);
export const insert = (table, row) => call('POST', table, row, { Prefer: 'return=representation' });
export const patch = (path, row) => call('PATCH', path, row, { Prefer: 'return=minimal' });

// A Postgres function called AS the signed-in staff member: their JWT goes in Authorization, so
// row level security and auth.uid() inside the function see them (not the service role). The
// public anon key only identifies the project.
export async function userRpc(jwt, name, args) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anon) throw Object.assign(new Error('not_configured'), { code: 'not_configured' });
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (res.ok) return { ok: true, data };
  return { ok: false, status: res.status, error: (data && (data.message || data.error)) || `rpc ${res.status}` };
}

// insert or replace by primary key (settings.key)
export const upsert = (table, row, conflict) =>
  call('POST', `${table}?on_conflict=${conflict}`, row, { Prefer: 'resolution=merge-duplicates,return=minimal' });
export const remove = (path) => call('DELETE', path, undefined, { Prefer: 'return=representation' });

// Supabase Auth admin API (create / change users). Service role only; never reachable from a browser.
export async function authAdmin(method, path, body) {
  const cfg = supabaseConfig();
  if (!cfg) throw Object.assign(new Error('not_configured'), { code: 'not_configured' });
  const res = await fetch(`${cfg.url}/auth/v1${path}`, {
    method,
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { ok: res.ok, status: res.status, data, code: data && (data.error_code || data.code) };
}

// Who is calling? Validates the staff session token with Supabase Auth and loads the staff row.
// -> { user: { id }, staff: { user_id, name, role, is_active, username } } | { error: 'unauthorized' | 'forbidden' | 'not_configured' }
export async function staffFromRequest(req) {
  const jwt = String((req.headers && req.headers.authorization) || '').replace(/^Bearer\s+/i, '').trim();
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anon || !supabaseConfig()) return { error: 'not_configured' };
  if (!jwt) return { error: 'unauthorized' };
  let user;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!r.ok) return { error: 'unauthorized' };
    user = await r.json();
  } catch {
    return { error: 'unauthorized' };
  }
  if (!user || !user.id) return { error: 'unauthorized' };
  const s = await select(`staff?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,name,role,is_active,username`);
  const row = s.ok && Array.isArray(s.data) && s.data[0];
  if (!row || !row.is_active) return { error: 'forbidden' };
  return { user: { id: user.id }, staff: row };
}

export const logActivity = (actor, action, entity, entityId, diff) =>
  insert('activity_log', { actor, action, entity, entity_id: entityId, diff });


/* ------------------------------------------------------------ Telegram */
// The managers' chat: TELEGRAM_CHAT_ID, or else `chat_id` in the private `telegram` setting
// (picked during setup, editable in admin later). null = alerts are off. Cached for a minute.
let chatCache = { at: 0, id: null };
export async function telegramChat() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  if (process.env.TELEGRAM_CHAT_ID) return String(process.env.TELEGRAM_CHAT_ID);
  if (Date.now() - chatCache.at < 60000) return chatCache.id;
  let id = null;
  try {
    const r = await select('settings?key=eq.telegram&select=value');
    const v = r.ok && Array.isArray(r.data) && r.data[0] && r.data[0].value;
    if (v && /^-?\d{5,20}$/.test(String(v.chat_id))) id = String(v.chat_id);
  } catch { /* database not configured */ }
  chatCache = { at: Date.now(), id };
  return id;
}
export const resetTelegramChatCache = () => { chatCache = { at: 0, id: null }; };

export async function tg(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, description: 'not_configured' };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429 && attempt === 0) {
        const wait = Math.min(((json.parameters && json.parameters.retry_after) || 1) * 1000, 3000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return json;
    } catch (e) {
      if (attempt === 1) return { ok: false, description: 'network' };
    }
  }
  return { ok: false, description: 'failed' };
}

/* ------------------------------------------------------------ rate limit */
// In memory, per instance: serverless instances don't share memory, so this only blunts bursts.
// Public endpoints that matter (orders, owner setup) also use limitedShared below.
const buckets = new Map();
export function limited(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return hits.length > max;
}
// Shared by every instance: a counter in the database (public.rate_limit_hit), keyed by a hash so
// no raw IP is stored. Call it once the request is valid (just before the real work), after the
// in-memory check; if the database can't be reached the request is not blocked because of that.
export async function limitedShared(key, max, windowMs) {
  if (!supabaseConfig()) return false;
  try {
    const r = await rpc('rate_limit_hit', {
      p_key: createHash('sha256').update(`ol-rate:${key}`).digest('hex'),
      p_max: max,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    return r.ok && r.data === true;
  } catch {
    return false;
  }
}
export const clientIp = (req) =>
  String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || 'unknown')
    .split(',')[0].trim();

// Same-site only: the browser sends Origin on cross-origin POSTs.
export function sameSite(req) {
  const origin = req.headers && req.headers.origin;
  if (!origin) return true; // non-browser callers (curl) — still validated + rate limited
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
