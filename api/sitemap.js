// GET /sitemap.xml (rewritten here) — every public page, products with their photos.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, optional SITE_URL

import { PRODUCT_COLUMNS, rest, shapeProduct } from './catalog.js';
import { siteUrl, isIndexing, sitemapXml, INFO_META } from './_lib/seo.js';

export default async function handler(req, res) {
  const base = siteUrl();
  const entries = [
    { path: '/', changefreq: 'daily', priority: 1.0 },
    { path: '/shop', changefreq: 'daily', priority: 0.9 },
    ...['new', 'sale', 'men', 'women', 'kids'].map((c) => ({ path: `/${c}`, changefreq: 'daily', priority: 0.8 })),
    ...Object.keys(INFO_META).map((p) => ({ path: `/${p}`, changefreq: 'monthly', priority: 0.4 })),
  ];

  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (url && key) {
    try {
      const settings = Object.fromEntries((await rest(url, key, 'settings?select=key,value&key=eq.site&is_public=eq.true')).map((r) => [r.key, r.value]));
      if (!isIndexing(settings)) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
        return res.status(200).send(sitemapXml(base, []));
      }
      const rows = await rest(url, key, `products?select=${encodeURIComponent(`${PRODUCT_COLUMNS},updated_at`)}&is_active=eq.true&order=created_at.desc`);
      const brands = new Set();
      for (const r of rows) {
        const p = shapeProduct(r, url);
        if (!p.images.length || p.price <= 0) continue;
        if (p.brand) brands.add(p.brand);
        entries.push({ path: `/product/${p.slug}`, lastmod: r.updated_at || r.created_at, changefreq: 'weekly', priority: 0.7, images: p.images.slice(0, 5) });
      }
      for (const b of brands) {
        entries.push({ path: `/brands/${b.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, changefreq: 'weekly', priority: 0.6 });
      }
    } catch (e) {
      console.error('sitemap: catalog unavailable:', e.message);
    }
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(sitemapXml(base, entries));
}
