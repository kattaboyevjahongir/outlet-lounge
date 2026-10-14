// Search-engine and link-preview support: per-page <head> data, JSON-LD and a plain-HTML fallback
// for crawlers, injected into the shop's HTML shell by api/page.js. Pure functions, unit-tested.
// Everything that comes from the database or the admin panel is escaped here.

export const DEFAULT_SITE = 'https://outletlounge.uz'; // SITE_URL overrides it
// the public `site` setting: { indexing: true } once the owner opens the shop to search engines
export const isIndexing = (settings) => !!(settings && settings.site && settings.site.indexing === true);
export const siteUrl = () => String(process.env.SITE_URL || DEFAULT_SITE).replace(/\/+$/, '');

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON that is safe inside <script type="application/ld+json"> (no "</script>" or "<!--")
export const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028|\u2029/g, '');

export const money = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} сум`;
const clip = (s, n) => {
  const v = String(s || '').replace(/\s+/g, ' ').trim();
  return v.length <= n ? v : `${v.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
};

/* ------------------------------------------------------------- static pages */
// Russian: the language of most searches in Uzbekistan; the page itself switches language in the browser.
export const COLLECTION_META = {
  shop: ['Все кроссовки', 'Оригинальные кроссовки Nike, Jordan, New Balance, adidas и других брендов по ценам аутлета. Доставка по всему Узбекистану.'],
  new: ['Новинки', 'Новые поступления оригинальных кроссовок: свежие релизы Nike, Jordan, New Balance и других брендов.'],
  sale: ['Распродажа', 'Оригинальные кроссовки со скидками до 40% — цены аутлета, доставка по Узбекистану.'],
  men: ['Мужские кроссовки', 'Оригинальные мужские кроссовки Nike, Jordan, adidas, New Balance по ценам аутлета.'],
  women: ['Женские кроссовки', 'Оригинальные женские кроссовки Nike, New Balance, Converse, Puma по ценам аутлета.'],
  kids: ['Детские кроссовки', 'Оригинальные детские кроссовки популярных брендов по ценам аутлета.'],
};
export const INFO_META = {
  delivery: ['Доставка и оплата', 'Курьером по Ташкенту, по регионам — БТС и почтой. Стоимость, сроки, способы оплаты, бесплатная доставка.'],
  returns: ['Возврат и обмен', 'Условия возврата и обмена кроссовок: срок, состояние товара и как оформить.'],
  'size-guide': ['Таблица размеров', 'Таблица размеров кроссовок EU / US / UK / см и как правильно измерить стопу.'],
  authenticity: ['Оригинальность', 'Как мы проверяем каждую пару и гарантируем оригинальность кроссовок.'],
  about: ['О магазине', 'Outlet Lounge — оригинальные кроссовки мировых брендов по ценам аутлета.'],
  contacts: ['Контакты', 'Телефон, Telegram, Instagram и часы работы магазина Outlet Lounge.'],
  faq: ['Вопросы и ответы', 'Ответы на частые вопросы: заказ, оплата, доставка, размеры, возврат.'],
  offer: ['Публичная оферта', 'Условия договора купли-продажи в интернет-магазине Outlet Lounge.'],
  privacy: ['Политика конфиденциальности', 'Как Outlet Lounge собирает, хранит и защищает персональные данные покупателей.'],
};
export const HOME_META = {
  title: 'Outlet Lounge — оригинальные кроссовки по ценам аутлета',
  description: 'Оригинальные Nike, Jordan, New Balance и другие бренды по ценам аутлета. Доставка по всему Узбекистану, оплата при получении.',
};
const BRAND = 'Outlet Lounge';
const withBrand = (title) => (title.includes(BRAND) ? title : `${title} — ${BRAND}`);

/* ----------------------------------------------------------------- products */
export function productMeta(p, base) {
  const name = [p.brand, p.name].filter(Boolean).join(' ');
  const price = money(p.price);
  const own = clip(p.desc && (p.desc.ru || p.desc.en || p.desc.uz), 150);
  const description = `${name} — оригинал. ${price}${p.was > p.price ? ` вместо ${money(p.was)}` : ''}. ${own || 'Доставка по Узбекистану, оплата при получении.'}`;
  return {
    title: withBrand(`${name}${p.colorway ? ` ${p.colorway}` : ''} купить`),
    description: clip(description, 300),
    path: `/product/${p.slug}`,
    image: p.images && p.images[0],
    type: 'product',
    price: p.price,
    name,
    base,
  };
}

export function productJsonLd(p, base) {
  const inStock = (p.sizes || []).some((s) => s.ok);
  const url = `${base}/product/${p.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: [p.brand, p.name].filter(Boolean).join(' '),
    image: (p.images || []).slice(0, 6),
    description: clip(p.desc && (p.desc.ru || p.desc.en || p.desc.uz), 500) || undefined,
    sku: p.sku || p.slug,
    color: p.colorway || undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    category: p.cat,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'UZS',
      price: String(p.price),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND },
    },
  };
}

export const breadcrumbJsonLd = (items, base) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${base}${it.path}` })),
});

export const organizationJsonLd = (base, contacts = {}, legal = {}) => {
  const sameAs = [];
  if (contacts.instagram) sameAs.push(`https://instagram.com/${String(contacts.instagram).replace(/^@/, '')}`);
  if (contacts.telegram) sameAs.push(`https://t.me/${String(contacts.telegram).replace(/^@/, '')}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: BRAND,
    url: base,
    telephone: contacts.phone || undefined,
    address: contacts.address ? { '@type': 'PostalAddress', streetAddress: contacts.address, addressCountry: 'UZ' } : undefined,
    legalName: legal.company || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    priceRange: 'UZS',
  };
};

/* ------------------------------------------------------------- head injection */
const strip = (s, re) => s.replace(re, '');

// Replaces the generic head tags of the shell with this page's own.
// meta: { title, description, path, image?, type?, robots?, jsonLd?: object[] }
export function injectHead(shell, meta, base) {
  const url = `${base}${meta.path || '/'}`;
  const title = esc(meta.title);
  const desc = esc(meta.description);
  let out = shell;
  out = strip(out, /<title>[\s\S]*?<\/title>\s*/i);
  out = strip(out, /<meta\s+name="description"[^>]*>\s*/i);
  out = strip(out, /<meta\s+property="og:(title|description|type|url|image|locale)"[^>]*>\s*/gi);
  out = strip(out, /<meta\s+name="twitter:(card|title|description|image)"[^>]*>\s*/gi);
  out = strip(out, /<link\s+rel="canonical"[^>]*>\s*/i);
  out = strip(out, /<meta\s+name="robots"[^>]*>\s*/i);

  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="robots" content="${esc(meta.robots || 'index,follow,max-image-preview:large')}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:type" content="${meta.type === 'product' ? 'product' : 'website'}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
  ];
  if (meta.image) {
    tags.push(`<meta property="og:image" content="${esc(meta.image)}" />`, `<meta name="twitter:image" content="${esc(meta.image)}" />`);
  }
  if (meta.type === 'product' && meta.price != null) {
    tags.push(`<meta property="product:price:amount" content="${esc(meta.price)}" />`, '<meta property="product:price:currency" content="UZS" />');
  }
  for (const ld of meta.jsonLd || []) tags.push(`<script type="application/ld+json">${jsonLd(ld)}</script>`);

  out = out.replace(/<\/head>/i, `  ${tags.join('\n  ')}\n</head>`);
  // the document language of the generated markup
  out = out.replace(/<html\s+lang="[a-z-]*"/i, '<html lang="ru"');
  return out;
}

// plain HTML for crawlers that do not run scripts (and for screen-reader-less contexts)
export function noscriptBlock({ heading, text, links = [] }) {
  const list = links.length
    ? `<ul>${links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a>${l.note ? ` — ${esc(l.note)}` : ''}</li>`).join('')}</ul>`
    : '';
  return `<noscript><section><h1>${esc(heading)}</h1>${text ? `<p>${esc(text)}</p>` : ''}${list}<p><a href="/shop">Все кроссовки</a> · <a href="/delivery">Доставка</a> · <a href="/contacts">Контакты</a></p></section></noscript>`;
}
export function injectBody(html, block) {
  return html.replace(/<body([^>]*)>/i, (m) => `${m}\n${block}`);
}

/* ------------------------------------------------------------------ sitemap */
export function sitemapXml(base, entries) {
  const rows = entries.map((e) => {
    const parts = [`<loc>${esc(base + e.path)}</loc>`];
    if (e.lastmod) parts.push(`<lastmod>${esc(String(e.lastmod).slice(0, 10))}</lastmod>`);
    if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
    if (e.priority != null) parts.push(`<priority>${e.priority}</priority>`);
    for (const img of e.images || []) parts.push(`<image:image><image:loc>${esc(img)}</image:loc></image:image>`);
    return `<url>${parts.join('')}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`;
}

// indexing === false: the owner has not opened the shop to search engines yet (Settings → Launch)
export function robotsTxt(base, indexing = true) {
  if (!indexing) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /order/',
    'Disallow: /wishlist',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
}
