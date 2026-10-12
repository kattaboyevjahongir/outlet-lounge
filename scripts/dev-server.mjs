// Local dev server that behaves like Vercel for this project:
//   - real files are served as-is (assets, index.html)
//   - any other path without a dot (/shop, /product/x …) serves index.html (the router takes over)
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

const { default: catalog } = await import(pathToFileURL(join(root, 'api/catalog.js')).href);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/catalog') {
    const r = {
      status(c) { res.statusCode = c; return r; },
      setHeader(k, v) { res.setHeader(k, v); },
      json(b) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); },
    };
    return catalog({ method: req.method }, r);
  }

  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^[\\/]+/, '');
  let file = join(root, rel);
  const inside = file.startsWith(root.replace(/[\\/]+$/, '') + sep) || file === root;

  const looksLikeFile = /\.[a-z0-9]+$/i.test(rel);
  if (!inside || (looksLikeFile && (!existsSync(file) || statSync(file).isDirectory()))) {
    res.statusCode = 404;
    return res.end('not found');
  }
  if (!looksLikeFile) file = join(root, 'index.html'); // SPA fallback

  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.end(readFileSync(file));
}).listen(port, () => {
  const live = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
  console.log(`dev server on http://localhost:${port}  (${live ? 'live Supabase data' : 'placeholder catalog — no SUPABASE_* set'})`);
});
