// GET /api/page?type=product|collection|brand|info|home&slug=…
// Vercel rewrites the shop's public addresses here (see vercel.json). The answer is the normal shop
// shell (index.html) with this page's own title, description, canonical link, Open Graph / Twitter
// tags, JSON-LD (Product + Offer, BreadcrumbList) and a plain-HTML fallback for crawlers — so Google,
// Yandex, Telegram and Instagram previews see real content before any script runs.
//
// The shop itself still renders in the browser; unknown products answer 404 with the same shell.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, optional SITE_URL

import { readFileSync } from 'node:fs';
import { PRODUCT_COLUMNS, CATEGORY_COLUMNS, rest, shapeProduct, shapeCategory } from './catalog.js';
import {
  siteUrl, isIndexing, DEPARTMENTS, COLLECTION_META, INFO_META, HOME_META, productMeta, productJsonLd, breadcrumbJsonLd, organizationJsonLd,
  injectHead, injectBody, noscriptBlock, money,
} from './_lib/seo.js';

let shell = null;
const loadShell = () => {
  if (!shell) shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  return shell;
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

const supabase = () => {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  return base && key ? { base, key } : null;
};

// a collection is /shop, /new, /sale or a department (/clothing …); `cats` maps category slug → department
const collectionFilter = (slug, cats) => {
  if (slug === 'shop') return () => true;
  if (slug === 'new') return (p) => p.isNew;
  if (slug === 'sale') return (p) => p.was > p.price;
  return (p) => cats[p.cat] === slug;
};
const isCollection = (slug) => slug === 'shop' || slug === 'new' || slug === 'sale' || DEPARTMENTS.includes(slug);

async function loadCategories(db) {
  try {
    const rows = await rest(db.base, db.key, `categories?select=${CATEGORY_COLUMNS}&is_active=eq.true&order=sort`);
    return rows.map((r) => shapeCategory(r, db.base));
  } catch {
    return [];
  }
}

async function allProducts(db) {
  const rows = await rest(db.base, db.key, `products?select=${encodeURIComponent(PRODUCT_COLUMNS)}&is_active=eq.true&order=created_at.desc`);
  return rows.map((r) => shapeProduct(r, db.base)).filter((p) => p.images.length && p.price > 0);
}
async function publicSettings(db) {
  try {
    const rows = await rest(db.base, db.key, 'settings?select=key,value&is_public=eq.true');
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

const productLinks = (list) => list.slice(0, 40).map((p) => ({
  href: `/product/${p.slug}`, label: [p.brand, p.name].filter(Boolean).join(' '), note: money(p.price),
}));

export default async function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const type = String(q.type || 'home');
  const slug = String(q.slug || '');
  const base = siteUrl();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  let html;
  try {
    html = loadShell();
  } catch (e) {
    console.error('page: shell missing');
    return res.status(500).send('error');
  }

  let status = 200;
  let meta = null;
  let block = null;
  const db = supabase();
  const settings = db ? await publicSettings(db) : {};
  const indexing = isIndexing(settings);

  try {
    if (type === 'product' && db) {
      const rows = !SLUG.test(slug) ? [] : await rest(db.base, db.key,
        `products?select=${encodeURIComponent(PRODUCT_COLUMNS)}&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`);
      const p = rows[0] && shapeProduct(rows[0], db.base);
      if (p && p.images.length && p.price > 0) {
        meta = productMeta(p, base);
        meta.jsonLd = [
          productJsonLd(p, base),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' }, { name: 'Каталог', path: '/shop' }, { name: meta.name, path: `/product/${p.slug}` },
          ], base),
        ];
        block = noscriptBlock({
          heading: meta.name,
          text: `${p.color ? `${p.color}. ` : ''}Цена ${money(p.price)}. Размеры: ${p.sizes.filter((s) => s.ok).map((s) => s.s).join(', ') || 'нет в наличии'}.`,
        });
      } else {
        status = 404;
        meta = { title: 'Страница не найдена — Outlet Lounge', description: 'Такой страницы нет. Вернитесь в каталог.', path: `/product/${slug}`, robots: 'noindex,follow' };
      }
    } else if (type === 'collection' && isCollection(slug)) {
      const [title, description] = COLLECTION_META[slug];
      const path = slug === 'shop' ? '/shop' : `/${slug}`;
      meta = {
        title: `${title} — Outlet Lounge`, description, path,
        jsonLd: [breadcrumbJsonLd([{ name: 'Главная', path: '/' }, { name: title, path }], base)],
      };
      let links = [];
      if (db) {
        try {
          const cats = Object.fromEntries((await loadCategories(db)).map((c) => [c.slug, c.dept]));
          links = productLinks((await allProducts(db)).filter(collectionFilter(slug, cats)));
        } catch { /* the shell still works */ }
      }
      block = noscriptBlock({ heading: title, text: description, links });
    } else if (type === 'category' && db) {
      const cat = !SLUG.test(slug) ? null : (await loadCategories(db)).find((c) => c.slug === slug);
      if (cat) {
        const title = cat.name.ru;
        const deptTitle = COLLECTION_META[cat.dept][0];
        const path = `/shop/${cat.slug}`;
        const list = (await allProducts(db)).filter((p) => p.cat === cat.slug);
        meta = {
          title: `${title} — купить оригинал — Outlet Lounge`,
          description: `${title}: оригинальные мужские товары мировых брендов. ${list.length ? `Моделей в каталоге: ${list.length}. ` : ''}В наличии в Ташкенте и под заказ, доставка по Узбекистану.`,
          path,
          image: list[0] && list[0].images[0],
          jsonLd: [breadcrumbJsonLd([
            { name: 'Главная', path: '/' }, { name: deptTitle, path: `/${cat.dept}` }, { name: title, path },
          ], base)],
        };
        block = noscriptBlock({ heading: title, text: meta.description, links: productLinks(list) });
      } else {
        status = 404;
        meta = { title: 'Страница не найдена — Outlet Lounge', description: 'Такой категории нет.', path: `/shop/${slug}`, robots: 'noindex,follow' };
      }
    } else if (type === 'brand' && db) {
      const brands = !SLUG.test(slug) ? [] : await rest(db.base, db.key, `brands?select=name,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`);
      if (brands[0]) {
        const name = brands[0].name;
        const list = (await allProducts(db)).filter((p) => p.brand === name);
        const path = `/brands/${slug}`;
        meta = {
          title: `${name} — оригинальная мужская одежда и обувь — Outlet Lounge`,
          description: `Оригинальные товары ${name}: одежда, обувь, аксессуары. ${list.length ? `Моделей в каталоге: ${list.length}. ` : ''}Доставка по Узбекистану.`,
          path,
          image: list[0] && list[0].images[0],
          jsonLd: [breadcrumbJsonLd([{ name: 'Главная', path: '/' }, { name: 'Каталог', path: '/shop' }, { name, path }], base)],
        };
        block = noscriptBlock({ heading: name, text: meta.description, links: productLinks(list) });
      } else {
        status = 404;
        meta = { title: 'Страница не найдена — Outlet Lounge', description: 'Такого бренда у нас нет.', path: `/brands/${slug}`, robots: 'noindex,follow' };
      }
    } else if (type === 'info' && INFO_META[slug]) {
      const [title, description] = INFO_META[slug];
      meta = {
        title: `${title} — Outlet Lounge`, description, path: `/${slug}`,
        jsonLd: [breadcrumbJsonLd([{ name: 'Главная', path: '/' }, { name: title, path: `/${slug}` }], base)],
      };
      block = noscriptBlock({ heading: title, text: description });
    } else if (type === 'home') {
      meta = {
        title: HOME_META.title, description: HOME_META.description, path: '/',
        image: settings.home && settings.home.hero && settings.home.hero.image,
        jsonLd: [organizationJsonLd(base, settings.contacts || {}, settings.legal || {})],
      };
      block = noscriptBlock({ heading: HOME_META.title, text: HOME_META.description });
    }
  } catch (e) {
    console.error('page: lookup failed:', e.message);
    meta = null; // fall back to the plain shell
  }

  res.status(status);
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=900' : 'public, max-age=0, s-maxage=60');
  if (!meta) return res.send(html);
  // until the owner switches indexing on, nothing is offered to search engines
  if (!indexing && !meta.robots) meta.robots = 'noindex,nofollow';
  let out = injectHead(html, meta, base);
  if (block) out = injectBody(out, block);
  return res.send(out);
}
