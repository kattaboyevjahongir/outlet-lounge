// node --test tests/*.test.mjs — client-side order helpers (phone mask, validation, totals)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../assets/js/order-logic.js', import.meta.url), 'utf8'), sandbox);
const O = sandbox.window.OL.orderLogic;
const plain = (v) => JSON.parse(JSON.stringify(v));

test('phone mask formats as you type', () => {
  assert.equal(O.formatPhone(''), '');
  assert.equal(O.formatPhone('9'), '+998 9');
  assert.equal(O.formatPhone('901'), '+998 90 1');
  assert.equal(O.formatPhone('90123'), '+998 90 123');
  assert.equal(O.formatPhone('9012345'), '+998 90 123 45');
  assert.equal(O.formatPhone('901234567'), '+998 90 123 45 67');
  assert.equal(O.formatPhone('+998 90 123 45 67'), '+998 90 123 45 67', 'idempotent');
  assert.equal(O.formatPhone('998901234567'), '+998 90 123 45 67');
  assert.equal(O.formatPhone('90123456789999'), '+998 90 123 45 67', 'extra digits are ignored');
  assert.equal(O.formatPhone('+'), '+998 ');
});

test('phone validity and E.164', () => {
  assert.equal(O.isValidPhone('+998 90 123 45 67'), true);
  assert.equal(O.isValidPhone('90 123 45'), false);
  assert.equal(O.toE164('90 123 45 67'), '+998901234567');
  assert.equal(O.toE164('+998 90 123 45 67'), '+998901234567');
});

test('form validation', () => {
  const ok = { name: 'Aziz', phone: '+998 90 123 45 67', telegram: '', region: 'Ташкент', address: 'ул. Навои 12', consent: true };
  assert.deepEqual(plain(O.validate(ok, { needsAddress: true, requireConsent: true })), {});
  assert.deepEqual(plain(O.validate({ ...ok, name: 'A' }, {})), { name: 'name' });
  assert.deepEqual(plain(O.validate({ ...ok, phone: '12' }, {})), { phone: 'phone' });
  assert.deepEqual(plain(O.validate({ ...ok, telegram: 'a b' }, {})), { telegram: 'telegram' });
  assert.deepEqual(plain(O.validate({ ...ok, telegram: '@aziz_r' }, {})), {});
  assert.deepEqual(plain(O.validate({ ...ok, telegram: 'https://t.me/aziz_r' }, {})), {});
  assert.deepEqual(plain(O.validate({ ...ok, region: '', address: 'x' }, { needsAddress: true })), { region: 'region', address: 'address' });
  assert.deepEqual(plain(O.validate({ ...ok, region: '', address: '' }, { needsAddress: false })), {}, 'pickup needs no address');
  assert.deepEqual(plain(O.validate({ ...ok, consent: false }, { requireConsent: true })), { consent: 'consent' });
});

test('local totals and free-delivery progress', () => {
  const P = { a: { price: 1000000 }, b: { price: 700000 } };
  const delivery = { methods: [{ id: 'courier_tashkent', fee: 30000 }, { id: 'regions', fee: 50000 }], free_threshold: 1500000 };
  assert.deepEqual(plain(O.localQuote([{ id: 'a', qty: 1 }], P, delivery, 'courier_tashkent')), { subtotal: 1000000, discount: 0, delivery_fee: 30000, total: 1030000 });
  assert.equal(O.localQuote([{ id: 'a', qty: 1 }], P, delivery, 'regions').delivery_fee, 50000);
  assert.equal(O.localQuote([{ id: 'a', qty: 1 }, { id: 'b', qty: 1 }], P, delivery, 'regions').delivery_fee, 0, 'free above threshold');
  assert.deepEqual(plain(O.freeProgress(1000000, 1500000)), { left: 500000, pct: 67, free: false, enabled: true });
  assert.equal(O.freeProgress(2000000, 1500000).free, true);
  assert.equal(O.freeProgress(500, 0).enabled, false);
  assert.deepEqual(plain(O.cartItems([{ id: 'x', size: 42, qty: 2 }])), [{ slug: 'x', size: 42, qty: 2 }]);
});

test('contact links: Telegram, Instagram, phone', () => {
  assert.equal(O.tgLink('@outlet_manager'), 'https://t.me/outlet_manager');
  assert.equal(O.tgLink('https://t.me/outlet_manager/'), 'https://t.me/outlet_manager');
  assert.equal(O.tgLink('outlet_lounge_bot', 'OL-261012-4821'), 'https://t.me/outlet_lounge_bot?start=OL-261012-4821');
  assert.equal(O.tgLink('outlet_lounge_bot', 'bad start!'), 'https://t.me/outlet_lounge_bot', 'invalid start param is dropped');
  assert.equal(O.tgLink(''), '');
  assert.equal(O.tgLink('a b'), '');
  assert.equal(O.tgLink('javascript:alert(1)'), '');
  assert.equal(O.instaLink('@outlet.lounge'), 'https://instagram.com/outlet.lounge');
  assert.equal(O.instaLink('https://www.instagram.com/outlet.lounge/'), 'https://instagram.com/outlet.lounge');
  assert.equal(O.instaLink(''), '');
  assert.equal(O.telLink('+998 90 123 45 67'), 'tel:+998901234567');
  assert.equal(O.telLink('90 123 45 67'), 'tel:+998901234567');
  assert.equal(O.telLink('12'), '');
});
