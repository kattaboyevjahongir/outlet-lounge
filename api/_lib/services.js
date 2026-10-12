// Thin clients for Supabase (service role) and the Telegram Bot API, plus a tiny rate limiter.
// Secrets come only from environment variables and are never logged or returned.

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
// Best effort: serverless instances don't share memory, but it still blunts bursts.
const buckets = new Map();
export function limited(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return hits.length > max;
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
