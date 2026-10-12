// One-time Telegram setup for order notifications. The token is read from the environment
// (Vercel → `vercel env pull .env.production.local --environment=production`) and never printed.
//
//   node scripts/telegram-setup.mjs status     who the bot is + current webhook
//   node scripts/telegram-setup.mjs discover   chats that have talked to the bot (to find the group id)
//   node scripts/telegram-setup.mjs test       send a test message to TELEGRAM_CHAT_ID
//   node scripts/telegram-setup.mjs webhook    register https://<site>/api/telegram for the status buttons
//
// Variables: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET, SITE_URL (default https://outlet-lounge.vercel.app)
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const f of ['.env.production.local', '.env.local']) {
  const file = root + f;
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = (process.env.SITE_URL || 'https://outlet-lounge.vercel.app').replace(/\/$/, '');
const cmd = process.argv[2] || 'status';

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set. Add it in Vercel, then run:\n  vercel env pull .env.production.local --environment=production');
  process.exit(1);
}

const call = async (method, payload = {}) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return res.json();
};
const need = (cond, msg) => { if (!cond) { console.error(msg); process.exit(1); } };

const me = await call('getMe');
need(me.ok, `Telegram rejected the token (${me.description || 'unknown error'}). If you revoked it, add the new one in Vercel and pull again.`);
console.log(`Bot: @${me.result.username} (id ${me.result.id})`);

if (cmd === 'status') {
  const w = (await call('getWebhookInfo')).result || {};
  console.log(`Webhook: ${w.url || 'not set'}${w.pending_update_count ? ` · ${w.pending_update_count} pending` : ''}${w.last_error_message ? ` · last error: ${w.last_error_message}` : ''}`);
  console.log(`TELEGRAM_CHAT_ID: ${chatId ? 'set' : 'NOT set'} · TELEGRAM_WEBHOOK_SECRET: ${secret ? 'set' : 'NOT set'}`);
} else if (cmd === 'discover') {
  const w = (await call('getWebhookInfo')).result || {};
  if (w.url) {
    console.log('A webhook is already registered, so updates cannot be listed here.\nSend /id in the managers\' chat instead — the bot replies with its id.');
  } else {
    const updates = (await call('getUpdates', { limit: 100 })).result || [];
    const chats = new Map();
    for (const u of updates) {
      const c = (u.message || u.channel_post || u.my_chat_member || u.callback_query?.message || {}).chat;
      if (c) chats.set(c.id, c);
    }
    if (!chats.size) console.log('No chats yet. Add the bot to your managers\' group (or open the bot and press Start), send any message, then run this again.');
    for (const c of chats.values()) console.log(`  ${c.id}   ${c.type}   ${c.title || c.username || [c.first_name, c.last_name].filter(Boolean).join(' ')}`);
  }
} else if (cmd === 'test') {
  need(chatId, 'TELEGRAM_CHAT_ID is not set.');
  const r = await call('sendMessage', { chat_id: chatId, text: '✅ <b>Outlet Lounge</b>: Telegram is connected. New orders will appear here.', parse_mode: 'HTML' });
  console.log(r.ok ? 'Test message sent.' : `Could not send: ${r.description}`);
} else if (cmd === 'webhook') {
  need(secret, 'TELEGRAM_WEBHOOK_SECRET is not set.');
  need(chatId, 'TELEGRAM_CHAT_ID is not set.');
  const r = await call('setWebhook', {
    url: `${site}/api/telegram`, secret_token: secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true,
  });
  console.log(r.ok ? `Webhook registered → ${site}/api/telegram` : `Could not register: ${r.description}`);
} else {
  console.error('Unknown command. Use: status | discover | test | webhook');
  process.exit(1);
}
