// GET /api/admin-config — what the admin panel's browser code needs to talk to Supabase.
// Both values are PUBLIC by design (the anon key only grants what row level security allows);
// serving them from here keeps them out of the repository and in sync with the environment.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return res.status(503).json({ error: 'not_configured' });
  return res.status(200).json({ url, anonKey });
}
