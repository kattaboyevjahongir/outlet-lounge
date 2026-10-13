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
  'slug', 'name', 'colorway', 'sku', 'category', 'gender', 'price', 'old_price',
  'description_ru', 'description_uz', 'description_en', 'tags',
  'is_new', 'is_featured', 'created_at',
  'brands(name)',
  'product_images(path,sort,is_main)',
  'product_sizes(eu,us,cm,stock)',
].join(',');

const LAST_PAIRS_AT_OR_BELOW = 3;

export function imageUrl(path, supabaseUrl) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${path}`;
}

export function shapeProduct(row, supabaseUrl) {
  const images = [...(row.product_images || [])]
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort - b.sort)
    .map((i) => imageUrl(i.path, supabaseUrl));
  const sizes = [...(row.product_sizes || [])]
    .sort((a, b) => Number(a.eu) - Number(b.eu))
    .map((z) => ({ s: Number(z.eu), us: z.us == null ? null : Number(z.us), cm: z.cm == null ? null : Number(z.cm), ok: z.stock > 0, stock: z.stock }));
  const totalStock = sizes.reduce((n, z) => n + z.stock, 0);

  let tag = null;
  if (row.is_new) tag = 'new';
  else if (row.is_featured) tag = 'hot';
  else if (totalStock > 0 && totalStock <= LAST_PAIRS_AT_OR_BELOW) tag = 'last';

  return {
    id: row.slug,
    slug: row.slug,
    brand: row.brands ? row.brands.name : '',
    name: row.name,
    colorway: row.colorway || null,
    sku: row.sku || null,
    cat: row.category,
    gender: row.gender,
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

export function shapeCatalog(productRows, settingRows, supabaseUrl) {
  const products = productRows
    .map((r) => shapeProduct(r, supabaseUrl))
    // a product with no photo or no price can't be shown properly yet
    .filter((p) => p.images.length > 0 && p.price > 0);
  const settings = Object.fromEntries((settingRows || []).map((s) => [s.key, s.value]));
  return { source: 'live', products, settings, generatedAt: new Date().toISOString() };
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
    const [products, settings] = await Promise.all([
      rest(base, key, `products?select=${encodeURIComponent(PRODUCT_COLUMNS)}&is_active=eq.true&order=created_at.desc`),
      rest(base, key, 'settings?select=key,value&is_public=eq.true'),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(shapeCatalog(products, settings, base));
  } catch (e) {
    // never leak upstream details to the browser
    console.error('catalog failed:', e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'upstream_unavailable' });
  }
}
