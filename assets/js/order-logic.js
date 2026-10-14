/* Outlet Lounge — order helpers (pure, unit-tested in tests/order-logic.test.mjs):
   phone mask + validation, form validation, local totals (offline fallback), free-delivery progress. */
(function () {
  const OL = (window.OL = window.OL || {});
  const O = (OL.orderLogic = {});

  // Uzbek mobile: +998 XX XXX XX XX → 9 national digits
  O.phoneDigits = (raw) => {
    let d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    return d.slice(0, 9);
  };
  O.formatPhone = (raw) => {
    const d = O.phoneDigits(raw);
    if (!d) return String(raw || '').trim().startsWith('+') ? '+998 ' : '';
    const groups = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return `+998 ${groups.join(' ')}`;
  };
  O.isValidPhone = (raw) => O.phoneDigits(raw).length === 9;
  O.toE164 = (raw) => `+998${O.phoneDigits(raw)}`;

  O.NO_ADDRESS = ['pickup', 'callback'];

  // returns { field: 'errorKey' } — empty object when the form is fine
  O.validate = (f, opts = {}) => {
    const e = {};
    if (String(f.name || '').trim().length < 2) e.name = 'name';
    if (!O.isValidPhone(f.phone)) e.phone = 'phone';
    if (f.telegram && !/^@?[A-Za-z0-9_]{5,32}$/.test(String(f.telegram).trim().replace(/^https?:\/\/t\.me\//i, ''))) e.telegram = 'telegram';
    if (opts.needsAddress) {
      if (!f.region) e.region = 'region';
      if (String(f.address || '').trim().length < 5) e.address = 'address';
    }
    if (opts.requireConsent && !f.consent) e.consent = 'consent';
    return e;
  };

  // Offline / not-configured fallback. The server's number is always the real one.
  // true when no line of the cart can be served from the stock here (sizes: { s, stock })
  O.allOnOrder = (cart, products) => {
    const lines = cart.filter((i) => products[i.id]);
    const fromStock = (i) => {
      const z = (products[i.id].sizes || []).find((x) => x.s === i.size);
      return !z || z.stock >= i.qty;
    };
    return lines.length > 0 && !lines.some(fromStock);
  };

  O.localQuote = (cart, products, delivery, method) => {
    let subtotal = 0;
    cart.forEach((i) => { if (products[i.id]) subtotal += products[i.id].price * i.qty; });
    const d = delivery || {};
    const m = (d.methods || []).find((x) => x.id === method);
    let fee = m ? m.fee : 0;
    if (d.free_threshold && subtotal >= d.free_threshold) fee = 0;
    // items ordered from abroad already include delivery: nothing from the stock here → free (like price_order)
    if (O.allOnOrder(cart, products) && d.order_free !== false) fee = 0;
    return { subtotal, discount: 0, delivery_fee: fee, total: subtotal + fee };
  };

  // How far the basket is from free delivery: { left, pct, free }
  O.freeProgress = (amount, threshold) => {
    if (!threshold) return { left: 0, pct: 0, free: false, enabled: false };
    const left = Math.max(0, threshold - amount);
    return { left, pct: Math.min(100, Math.round((amount / threshold) * 100)), free: left === 0, enabled: true };
  };

  O.cartItems = (cart) => cart.map((i) => ({ slug: i.id, size: i.size, qty: i.qty }));

  // Contact links from the `contacts` setting. Each returns '' when the value is missing or
  // malformed, so the matching button simply isn't shown.
  const handle = (v) => String(v == null ? '' : v).trim()
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, '').replace(/^@/, '').replace(/\/+$/, '');
  O.tgLink = (user, start) => {
    const u = handle(user);
    if (!/^[A-Za-z0-9_]{4,32}$/.test(u)) return '';
    const s = String(start || '');
    return `https://t.me/${u}${/^[A-Za-z0-9_-]{1,64}$/.test(s) ? `?start=${s}` : ''}`;
  };
  O.instaLink = (user) => {
    const u = handle(user);
    return /^[A-Za-z0-9_.]{1,30}$/.test(u) ? `https://instagram.com/${u}` : '';
  };
  O.telLink = (phone) => {
    const d = String(phone == null ? '' : phone).replace(/\D/g, '');
    return d.length >= 9 && d.length <= 15 ? `tel:+${d.length === 9 ? `998${d}` : d}` : '';
  };
})();
