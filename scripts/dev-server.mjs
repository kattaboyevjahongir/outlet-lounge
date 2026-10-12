// Local dev server that behaves like Vercel for this project:
//   - real files are served as-is (assets, index.html)
//   - any other path without a dot (/shop, /product/x …) serves index.html (the router takes over);
//     /admin and /admin/… serve admin/index.html with the same security headers as production
//   - /api/catalog runs the real handler, using SUPABASE_URL / SUPABASE_ANON_KEY
//     from the environment or a git-ignored .env.local
//
//   node scripts/dev-server.mjs [port]
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 5173);

// tiny .env.local reader (KEY=VALUE per line) — only fills variables that are not already set
const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// API routes: /api/<name> → api/<name>.js (default export), like Vercel functions.
// The body is parsed to JSON into req.body, as the platform does.
const handlers = new Map();
const loadHandler = async (name) => {
  if (!handlers.has(name)) {
    const file = join(root, 'api', `${name}.js`);
    handlers.set(name, existsSync(file) ? (await import(pathToFileURL(file).href)).default : null);
  }
  return handlers.get(name);
};
const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    try { resolve(raw ? JSON.parse(raw) : undefined); } catch { resolve(raw); }
  });
});

// the headers vercel.json sets for /admin/*, so the panel is tried under the same CSP locally
const adminHeaders = (() => {
  try {
    const cfg = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
    const block = (cfg.headers || []).find((h) => h.source === '/admin/:path*');
    return block ? block.headers : [];
  } catch { return []; }
})();

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  const api = url.pathname.match(/^\/api\/([a-z0-9_-]+)$/);
  if (api) {
    const handler = await loadHandler(api[1]);
    if (!handler) { res.statusCode = 404; return res.end('{"error":"not_found"}'); }
    req.body = req.method === 'POST' ? await readBody(req) : undefined;
    const r = {
      status(c) { res.statusCode = c; return r; },
      setHeader(k, v) { res.setHeader(k, v); },
      json(b) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); },
    };
    try {
      return await handler(req, r);
    } catch (e) {
      console.error('api error:', e);
      res.statusCode = 500;
      return res.end('{"error":"server_error"}');
    }
  }

  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^[\\/]+/, '');
  let file = join(root, rel);
  const inside = file.startsWith(root.replace(/[\\/]+$/, '') + sep) || file === root;

  const looksLikeFile = /\.[a-z0-9]+$/i.test(rel);
  if (!inside || (looksLikeFile && (!existsSync(file) || statSync(file).isDirectory()))) {
    res.statusCode = 404;
    return res.end('not found');
  }
  const isAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
  if (!looksLikeFile) file = join(root, isAdmin ? 'admin/index.html' : 'index.html'); // SPA fallback
  if (isAdmin && !looksLikeFile) for (const h of adminHeaders) res.setHeader(h.key, h.value);

  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.end(readFileSync(file));
}).listen(port, () => {
  const live = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
  console.log(`dev server on http://localhost:${port}  (${live ? 'live Supabase data' : 'placeholder catalog — no SUPABASE_* set'})`);
});
