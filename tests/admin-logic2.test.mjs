// node --test tests/*.test.mjs  — admin panel phase 5 logic: sign-in names, promo, settings, charts, export
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../assets/admin/logic.js';
import { toCsv, buildXlsx, crc32, colName, zipStore } from '../assets/admin/export.js';

test('username → login e-mail; real e-mails keep working', () => {
  assert.equal(L.loginEmail('Malika'), 'malika@staff.outlet-lounge.invalid');
  assert.equal(L.loginEmail('  owner  '), 'owner@staff.outlet-lounge.invalid');
  assert.equal(L.loginEmail('Boss@Example.com'), 'boss@example.com');
  assert.equal(L.loginEmail(''), '');
  assert.equal(L.usernameFromEmail('malika@staff.outlet-lounge.invalid'), 'malika');
  assert.equal(L.usernameFromEmail('boss@example.com'), 'boss@example.com');
  // the reserved domain can never be registered (RFC 2606), so no reset mail can be intercepted
  assert.match(L.STAFF_EMAIL_DOMAIN, /\.invalid$/);
});

test('usernames and passwords follow the database rules', () => {
  assert.equal(L.usernameProblem('malika'), null);
  assert.equal(L.usernameProblem('Malika.K-2'), null, 'case-insensitive');
  assert.equal(L.usernameProblem(''), 'required');
  assert.equal(L.usernameProblem('ab'), 'format');
  assert.equal(L.usernameProblem('with space'), 'format');
  assert.equal(L.usernameProblem('a'.repeat(33)), 'format');
  assert.equal(L.usernameProblem('кириллица'), 'format');
  assert.equal(L.passwordProblem('short1'), 'short');
  assert.equal(L.passwordProblem('onlyletterspassword'), 'weak');
  assert.equal(L.passwordProblem('1234567890123'), 'weak');
  assert.equal(L.passwordProblem('Lounge2026ok'), null);
  // the SQL constraint and this regex agree
  const sqlRe = readFileSync(new URL('../supabase/migrations/20261015000000_admin_extended.sql', import.meta.url), 'utf8')
    .match(/username ~ '([^']+)'/)[1];
  assert.equal(sqlRe, L.USERNAME_RE.source);
});

test('generated passwords always satisfy the password rule', () => {
  for (let n = 0; n < 200; n += 1) {
    const bytes = new Uint8Array(16).map(() => Math.floor(Math.random() * 256));
    const pw = L.generatePassword(bytes);
    assert.equal(pw.length, 12);
    assert.equal(L.passwordProblem(pw), null, pw);
    assert.ok(!/[0OlI1]/.test(pw), 'no look-alike characters');
  }
  assert.equal(L.passwordProblem(L.generatePassword(new Uint8Array(16))), null, 'all-zero randomness still valid');
});

test('promo validation and row shape', () => {
  const good = { ...L.emptyPromo(), code: ' lounge10 ', value: '10', min_order: '500 000', usage_limit: '100' };
  assert.deepEqual(L.validatePromo(good), { ok: true, errors: {} });
  const row = L.promoToRow(good);
  assert.deepEqual(row, {
    code: 'LOUNGE10', type: 'percent', value: 10, min_order: 500000, starts_at: null, ends_at: null,
    usage_limit: 100, per_phone_limit: null, is_active: true,
  });
  const bad = (o) => L.validatePromo({ ...good, ...o }).errors;
  assert.equal(bad({ code: 'a' }).code, 'code');
  assert.equal(bad({ code: 'has space' }).code, 'code');
  assert.equal(bad({ value: '' }).value, 'positive');
  assert.equal(bad({ value: '0' }).value, 'positive');
  assert.equal(bad({ type: 'percent', value: '150' }).value, 'percent');
  assert.equal(bad({ type: 'fixed', value: '150000' }).value, undefined, 'a fixed amount may exceed 100');
  assert.equal(bad({ usage_limit: '0' }).usage_limit, 'positive');
  assert.equal(bad({ starts_at: '2026-10-10T10:00', ends_at: '2026-10-09T10:00' }).ends_at, 'range');
  assert.equal(L.promoToRow({ ...good, type: 'fixed', value: '50 000' }).type, 'fixed');
});

test('shop-time date inputs round-trip (UTC+5)', () => {
  assert.equal(L.localToIso('2026-10-13T09:30'), '2026-10-13T04:30:00.000Z');
  assert.equal(L.isoToLocal('2026-10-13T04:30:00.000Z'), '2026-10-13T09:30');
  assert.equal(L.localToIso(''), null);
  assert.equal(L.isoToLocal(null), '');
  assert.equal(L.isoToLocal(L.localToIso('2026-12-31T23:59')), '2026-12-31T23:59');
});

test('promo state, in the order a manager would ask', () => {
  const now = Date.parse('2026-10-13T12:00:00Z');
  const base = { is_active: true, starts_at: null, ends_at: null, usage_limit: null, used_count: 0 };
  assert.equal(L.promoState(base, now), 'active');
  assert.equal(L.promoState({ ...base, is_active: false }, now), 'inactive');
  assert.equal(L.promoState({ ...base, starts_at: '2026-10-14T00:00:00Z' }, now), 'scheduled');
  assert.equal(L.promoState({ ...base, ends_at: '2026-10-12T00:00:00Z' }, now), 'expired');
  assert.equal(L.promoState({ ...base, usage_limit: 5, used_count: 5 }, now), 'used_up');
  assert.equal(L.promoState({ ...base, usage_limit: 5, used_count: 4 }, now), 'active');
});

test('contacts and delivery settings validation', () => {
  assert.deepEqual(L.validateContacts({ phone: '+998 90 123 45 67', telegram: '@manager_ol', telegram_bot: 'outlet_lounge_bot', instagram: 'outlet.lounge', call_minutes: '15', hours: '10:00–21:00' }), { ok: true, errors: {} });
  assert.deepEqual(L.validateContacts({}), { ok: true, errors: {} }, 'everything is optional');
  const e = L.validateContacts({ phone: '12', telegram: 'a b', telegram_bot: 'x', instagram: 'bad name!', call_minutes: '0' }).errors;
  assert.deepEqual(Object.keys(e).sort(), ['call_minutes', 'instagram', 'phone', 'telegram', 'telegram_bot']);
  assert.ok(L.validateContacts({ telegram: 'https://t.me/outlet_manager/' }).ok, 'pasted links are accepted');
  assert.ok(L.validateDelivery({ courier_tashkent: '30 000', regions: '50000', pickup: '0', free_threshold: '1 500 000' }).ok);
  assert.ok(L.validateDelivery({ courier_tashkent: '30 000', regions: '50000', pickup: '0', free_threshold: '' }).ok, 'no threshold = no free delivery');
  assert.equal(L.validateDelivery({ courier_tashkent: '', regions: '1', pickup: '0' }).errors.courier_tashkent, 'fee');
});

test('chart bars scale to the best day and keep empty days visible', () => {
  const bars = L.chartBars([{ day: 'a', orders: 0, revenue: 0 }, { day: 'b', orders: 2, revenue: 2000 }, { day: 'c', orders: 1, revenue: 1000 }, { day: 'd', orders: 1, revenue: 10 }], 100);
  assert.deepEqual(bars.map((b) => b.h), [2, 100, 50, 4]);
  assert.deepEqual(L.chartBars([], 100), []);
  assert.equal(L.chartBars([{ day: 'x', orders: 0, revenue: 0 }], 100)[0].h, 2, 'no division by zero');
});

test('report ranges are in shop time and end tomorrow 00:00 (exclusive)', () => {
  const now = new Date('2026-10-13T22:30:00Z'); // 03:30 on 14 Oct in Tashkent
  assert.deepEqual(L.reportRange('today', now), { from: '2026-10-13T19:00:00.000Z', to: '2026-10-14T19:00:00.000Z' });
  assert.equal(L.reportRange('7d', now).from, '2026-10-07T19:00:00.000Z');
  assert.equal(L.reportRange('30d', now).from, '2026-09-14T19:00:00.000Z');
  assert.equal(L.reportRange('month', now).from, '2026-09-30T19:00:00.000Z');
  assert.equal(L.reportRange('year', now).from, '2025-12-31T19:00:00.000Z');
  assert.equal(L.reportRange('nonsense', now).from, L.reportRange('30d', now).from);
});

test('activity rows turn into readable changes', () => {
  const v = L.activityView({
    entity: 'products', action: 'update',
    diff: { label: 'Air Max', changes: { price: ['1190000', '1250000'], updated_at: ['a', 'b'], slug: ['x', 'y'] } },
  });
  assert.equal(v.label, 'Air Max');
  assert.deepEqual(v.changes, [{ field: 'price', from: '1190000', to: '1250000' }]);
  assert.deepEqual(L.activityView({ entity: 'products', action: 'insert', diff: null }).changes, []);
});

/* ------------------------------------------------------------- export */
test('CSV: BOM for Excel, quoting, and formulas are neutralised', () => {
  const csv = toCsv([['Name', 'Note'], ['Азиз, Р.', 'says "hi"\nnew line'], ['=HYPERLINK("x")', '-5'], ['+998901234567', '@x']]);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('"Азиз, Р.","says ""hi""\nnew line"'));
  assert.ok(csv.includes('\'=HYPERLINK("x")') || csv.includes('"\'=HYPERLINK(""x"")"'), csv);
  assert.ok(csv.includes(',-5\r\n'), 'plain negative numbers stay numbers');
  assert.ok(csv.includes('\'+998901234567'), 'a phone number starting with + is text, not a formula');
  assert.ok(csv.endsWith('\r\n'));
});

const readZip = (bytes) => {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.length - 22;
  assert.equal(dv.getUint32(eocd, true), 0x06054B50, 'end of central directory');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let i = 0; i < count; i += 1) {
    assert.equal(dv.getUint32(p, true), 0x02014B50);
    const crc = dv.getUint32(p + 16, true);
    const size = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const start = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    assert.equal(dv.getUint32(start, true), 0x04034B50);
    const dataStart = start + 30 + dv.getUint16(start + 26, true) + dv.getUint16(start + 28, true);
    const data = bytes.subarray(dataStart, dataStart + size);
    assert.equal(crc32(data), crc, `crc of ${name}`);
    files[name] = new TextDecoder().decode(data);
    p += 46 + nameLen;
  }
  return files;
};

test('XLSX: a valid zip with the parts Excel needs, numbers as numbers, text escaped', () => {
  const bytes = buildXlsx([
    { name: 'Orders', rows: [['Number', 'Total', 'Customer'], ['OL-1', 1420000, 'A & <B> "C"'], ['OL-2', 30000, '']] },
    { name: 'Bad/Name:[x]?', rows: [['x']] },
  ]);
  const f = readZip(bytes);
  assert.deepEqual(Object.keys(f).sort(), ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']);
  assert.match(f['xl/workbook.xml'], /<sheet name="Orders" sheetId="1" r:id="rId1"\/>/);
  assert.match(f['xl/workbook.xml'], /<sheet name="Bad Name\s+x" sheetId="2"/, 'characters Excel forbids in sheet names are replaced');
  const s1 = f['xl/worksheets/sheet1.xml'];
  assert.match(s1, /<c r="B2"><v>1420000<\/v><\/c>/);
  assert.match(s1, /<c r="A2" t="inlineStr"><is><t xml:space="preserve">OL-1<\/t><\/is><\/c>/);
  assert.match(s1, /A &amp; &lt;B&gt; &quot;C&quot;/);
  assert.ok(!s1.includes('r="C3"'), 'empty cells are skipped');
  for (const part of Object.values(f)) assert.match(part, /^<\?xml/);
});

test('XLSX strips characters XML cannot hold; column letters; crc32', () => {
  const f = readZip(buildXlsx([{ name: 's', rows: [['a\u0001b\u0008c']] }]));
  assert.match(f['xl/worksheets/sheet1.xml'], />abc</);
  assert.deepEqual([0, 25, 26, 27, 701, 702].map(colName), ['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  assert.equal(zipStore([]).length, 22, 'an empty archive is just the end record');
});
