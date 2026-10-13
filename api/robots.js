// GET /robots.txt (rewritten here) — the sitemap address follows SITE_URL, so it stays right
// after the shop moves to its own domain.
import { rest } from './catalog.js';
import { siteUrl, isIndexing, robotsTxt } from './_lib/seo.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  let indexing = false; // closed until the owner opens the shop to search engines
  if (url && key) {
    try {
      const rows = await rest(url, key, 'settings?select=key,value&key=eq.site&is_public=eq.true');
      indexing = isIndexing(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    } catch (e) {
      // can't tell: a server error makes crawlers pause instead of caching a wrong answer
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).send('temporarily unavailable');
    }
  }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600');
  return res.status(200).send(robotsTxt(siteUrl(), indexing));
}
