// One server function for every admin endpoint. The Hobby plan allows 12 functions per deployment
// and each file in api/ is one function, so the admin endpoints live in api/_admin/ (folders
// starting with "_" are not deployed as functions) and are dispatched from here.
// vercel.json rewrites /api/admin-<name> to /api/admin?fn=<name>, so the addresses stay the same:
//   /api/admin-config  /api/admin-order-status  /api/admin-setup  /api/admin-staff  /api/admin-telegram
import config from './_admin/config.js';
import orderStatus from './_admin/order-status.js';
import setup from './_admin/setup.js';
import staff from './_admin/staff.js';
import telegram from './_admin/telegram.js';

export const ADMIN_ROUTES = { config, 'order-status': orderStatus, setup, staff, telegram };

export default function handler(req, res) {
  const fn = String((req.query && req.query.fn) || '');
  const route = Object.hasOwn(ADMIN_ROUTES, fn) ? ADMIN_ROUTES[fn] : null;
  if (!route) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'not_found' });
  }
  return route(req, res);
}
