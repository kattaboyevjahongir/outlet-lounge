// GET /api/catalog — the storefront's product feed.
// Reads active products, sizes/stock, images and public settings from Supabase
// with the PUBLIC anon key (row level security limits what it can see) and
// returns them in the shape assets/js/data.js uses. Edge-cached for ~60 s.
//
// Env (Vercel → Settings → Environment Variables):
//   SUPABASE_URL, SUPABASE_ANON_KEY
// If they are not set the endpoint answers 503 and the site falls back to the
// built-in placeholder catalog.

export const PRODUCT_COLUMNS = [
  'slug', 'name', 'color', 'color_hex', 'color_group', 'style_code', 'sku', 'category', 'price', 'old_price',
  'origin', 'material', 'fit', 'model_info', 'order_lead',
  'description_ru', 'description_uz', 'description_en', 'tags',
  'is_new', 'is_featured', 'created_at',
  'brands(name)',
  'product_images(path,sort,is_main)',
  'product_sizes(label,sort,stock,orderable)',
].join(',');

export const CATEGORY_COLUMNS = 'slug,department,name_ru,name_uz,name_en,size_system,image_path,sort';

const LAST_PIECES_AT_OR_BELOW = 3;

export function imageUrl(path, supabaseUrl) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${path}`;
}

export function shapeProduct(row, supabaseUrl) {
  const images = [...(row.product_images || [])]
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort - b.sort)
    .map((i) => imageUrl(i.path, supabaseUrl));
  // `ok` = can be bought now (in stock here, or can be ordered from abroad); `order` = can be ordered from abroad
  const sizes = [...(row.product_sizes || [])]
    .sort((a, b) => a.sort - b.sort || String(a.label).localeCompare(String(b.label), 'en', { numeric: true }))
    .map((z) => ({ s: z.label, ok: z.stock > 0 || !!z.orderable, stock: z.stock, order: !!z.orderable }));
  const totalStock = sizes.reduce((n, z) => n + z.stock, 0);

  let tag = null;
  if (row.is_new) tag = 'new';
  else if (row.is_featured) tag = 'hot';
  else if (totalStock > 0 && totalStock <= LAST_PIECES_AT_OR_BELOW) tag = 'last';

  return {
    id: row.slug,
    slug: row.slug,
    brand: row.brands ? row.brands.name : '',
    name: row.name,
    color: row.color || null,
    colorHex: row.color_hex || null,
    colorGroup: row.color_group || null,
    styleCode: row.style_code || null,
    sku: row.sku || null,
    cat: row.category,
    origin: row.origin || null,
    material: row.material || null,
    fit: row.fit || null,
    model: row.model_info || null,
    orderLead: row.order_lead || null,
    price: row.price,
    was: row.old_price || row.price,
    images,
    tag,
    isNew: !!row.is_new,
    featured: !!row.is_featured,
    sizes,
    tags: row.tags || [],
    desc: { ru: row.description_ru || '', uz: row.description_uz || '', en: row.description_en || '' },
  };
}

export function shapeCategory(row, supabaseUrl) {
  return {
    slug: row.slug,
    dept: row.department,
    name: { ru: row.name_ru, uz: row.name_uz, en: row.name_en },
    sizes: row.size_system,
    image: row.image_path ? imageUrl(row.image_path, supabaseUrl) : null,
    sort: row.sort,
  };
}

export function shapeCatalog(productRows, settingRows, supabaseUrl, categoryRows) {
  const products = productRows
    .map((r) => shapeProduct(r, supabaseUrl))
    // a product with no photo or no price can't be shown properly yet
    .filter((p) => p.images.length > 0 && p.price > 0);
  const settings = Object.fromEntries((settingRows || []).map((s) => [s.key, s.value]));
  const categories = (categoryRows || []).map((c) => shapeCategory(c, supabaseUrl));
  return { source: 'live', products, categories, settings, generatedAt: new Date().toISOString() };
}

export async function rest(base, key, path) {
  // legacy anon keys are JWTs and go in Authorization too; new publishable
  // keys (sb_publishable_…) are not JWTs and must only be sent as `apikey`
  const headers = { apikey: key };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${base}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!base || !key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'not_configured' });
  }

  try {
    const [products, settings, categories] = await Promise.all([
      rest(base, key, `products?select=${encodeURIComponent(PRODUCT_COLUMNS)}&is_active=eq.true&order=created_at.desc`),
      rest(base, key, 'settings?select=key,value&is_public=eq.true'),
      rest(base, key, `categories?select=${CATEGORY_COLUMNS}&is_active=eq.true&order=sort`),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(shapeCatalog(products, settings, base, categories));
  } catch (e) {
    // never leak upstream details to the browser
    console.error('catalog failed:', e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'upstream_unavailable' });
  }
}
