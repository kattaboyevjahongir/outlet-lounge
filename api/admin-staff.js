// POST /api/admin-staff   Authorization: Bearer <owner's session token>
//   { action: 'create',   username, name, role, password }
//   { action: 'password', user_id, password }
//   { action: 'update',   user_id, role?, is_active?, name? }
//
// Staff accounts are managed here (not from the browser) because creating a login and setting a
// password needs the service key. Only an active OWNER may call it.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { staffFromRequest, authAdmin, insert, patch, select, logActivity, limited, clientIp, sameSite } from './_lib/services.js';
import { USERNAME_RE, loginEmail, passwordProblem } from '../assets/admin/logic.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ['owner', 'manager'];

const send = (res, code, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(code).json(body);
};
const cleanName = (v) => String(v || '').replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (!sameSite(req)) return send(res, 403, { error: 'forbidden' });
  if (limited(`adminstaff:${clientIp(req)}`, 30, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many_requests' });

  const who = await staffFromRequest(req);
  if (who.error === 'not_configured') return send(res, 503, { error: 'not_configured' });
  if (who.error) return send(res, who.error === 'unauthorized' ? 401 : 403, { error: who.error });
  if (who.staff.role !== 'owner') return send(res, 403, { error: 'forbidden' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const me = who.staff;

  /* ---- create a staff login ---- */
  if (b.action === 'create') {
    const username = String(b.username || '').trim().toLowerCase();
    const name = cleanName(b.name);
    const role = String(b.role || 'manager');
    const password = String(b.password || '');
    if (!USERNAME_RE.test(username)) return send(res, 400, { error: 'invalid', field: 'username' });
    if (name.length < 2 || name.length > 60) return send(res, 400, { error: 'invalid', field: 'name' });
    if (!ROLES.includes(role)) return send(res, 400, { error: 'invalid', field: 'role' });
    const pw = passwordProblem(password);
    if (pw) return send(res, 400, { error: 'invalid', field: 'password', reason: pw });

    const taken = await select(`staff?username=eq.${encodeURIComponent(username)}&select=user_id&limit=1`);
    if (taken.ok && Array.isArray(taken.data) && taken.data.length) return send(res, 409, { error: 'username_taken' });

    const created = await authAdmin('POST', '/admin/users', {
      email: loginEmail(username), password, email_confirm: true, user_metadata: { username, name },
    });
    if (!created.ok) {
      if (created.status === 422 && /exist|registered/i.test(JSON.stringify(created.data))) return send(res, 409, { error: 'username_taken' });
      if (created.code === 'weak_password') return send(res, 400, { error: 'invalid', field: 'password', reason: 'weak' });
      console.error('staff create failed', created.status);
      return send(res, 502, { error: 'upstream' });
    }
    const userId = created.data.id;
    const row = await insert('staff', { user_id: userId, name, role, username });
    if (!row.ok) {
      await authAdmin('DELETE', `/admin/users/${userId}`);
      return send(res, 502, { error: 'upstream' });
    }
    await logActivity(me.name, 'insert', 'staff', userId, { label: username, changes: { role: [null, role] } });
    return send(res, 200, { ok: true, user_id: userId });
  }

  /* ---- everything else targets an existing staff member ---- */
  const target = String(b.user_id || '');
  if (!UUID.test(target)) return send(res, 400, { error: 'invalid', field: 'user_id' });
  const found = await select(`staff?user_id=eq.${target}&select=user_id,name,role,is_active,username`);
  const row = found.ok && Array.isArray(found.data) && found.data[0];
  if (!row) return send(res, 404, { error: 'not_found' });

  if (b.action === 'password') {
    const password = String(b.password || '');
    const pw = passwordProblem(password);
    if (pw) return send(res, 400, { error: 'invalid', field: 'password', reason: pw });
    const r = await authAdmin('PUT', `/admin/users/${target}`, { password });
    if (!r.ok) {
      if (r.code === 'weak_password') return send(res, 400, { error: 'invalid', field: 'password', reason: 'weak' });
      return send(res, 502, { error: 'upstream' });
    }
    await logActivity(me.name, 'update', 'staff', target, { label: row.username || row.name, changes: { password: ['•••', 'changed'] } });
    return send(res, 200, { ok: true });
  }

  if (b.action === 'update') {
    const changes = {};
    const patchRow = {};
    if (b.role !== undefined) {
      if (!ROLES.includes(b.role)) return send(res, 400, { error: 'invalid', field: 'role' });
      patchRow.role = b.role;
    }
    if (b.is_active !== undefined) patchRow.is_active = !!b.is_active;
    if (b.name !== undefined) {
      const name = cleanName(b.name);
      if (name.length < 2 || name.length > 60) return send(res, 400, { error: 'invalid', field: 'name' });
      patchRow.name = name;
    }
    if (!Object.keys(patchRow).length) return send(res, 400, { error: 'invalid' });
    // locking yourself out of the panel is never what's wanted
    if (target === me.user_id && (patchRow.is_active === false || (patchRow.role && patchRow.role !== 'owner'))) {
      return send(res, 400, { error: 'self' });
    }
    for (const [k, v] of Object.entries(patchRow)) if (row[k] !== v) changes[k] = [String(row[k]), String(v)];
    const r = await patch(`staff?user_id=eq.${target}`, patchRow);
    if (!r.ok) {
      if (/last_owner/.test(JSON.stringify(r.data))) return send(res, 409, { error: 'last_owner' });
      return send(res, 502, { error: 'upstream' });
    }
    if (Object.keys(changes).length) await logActivity(me.name, 'update', 'staff', target, { label: row.username || row.name, changes });
    return send(res, 200, { ok: true });
  }

  return send(res, 400, { error: 'invalid' });
}
