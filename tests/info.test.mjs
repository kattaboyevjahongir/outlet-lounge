// node --test tests/*.test.mjs  — information pages: every page in every language, numbers from settings
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as L from '../assets/admin/logic.js';

const sandbox = { window: {}, console };
sandbox.window.OL = {};
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../assets/js/info-content.js', import.meta.url), 'utf8'), sandbox);
const OL = sandbox.window.OL;
const plain = (x) => JSON.parse(JSON.stringify(x));

const ctx = (over = {}) => ({
  fee: { courier_tashkent: 30000, regions: 50000, pickup: 0 }, free: 1500000, money: (n) => `${n} UZS`, hours: '10:00–21:00',
  minutes: 15, phone: '+998 90 123 45 67', email: 'shop@example.uz', company: 'ООО Лаунж', inn: '123456789', legalAddress: 'Ташкент',
  returnDays: 14, stock: '1–3', order: '10–18', ...over,
});
const LANGS = ['ru', 'uz', 'en'];

test('there is a page for every slug in every language, with a title in each', () => {
  assert.deepEqual([...OL.INFO_SLUGS].sort(), ['about', 'authenticity', 'contacts', 'delivery', 'faq', 'offer', 'privacy', 'returns', 'size-guide']);
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(OL.INFO_TITLES[lang]).sort(), [...OL.INFO_SLUGS].sort(), lang);
    for (const slug of OL.INFO_SLUGS) {
      const page = plain(OL.infoContent(lang, slug, ctx()));
      assert.ok(page && page.lead && page.blocks.length, `${lang}/${slug}`);
      assert.ok(OL.INFO_TITLES[lang][slug]);
    }
  }
});

test('the three languages have the same structure (no page is half translated)', () => {
  for (const slug of OL.INFO_SLUGS) {
    const shape = (lang) => plain(OL.infoContent(lang, slug, ctx())).blocks.map((b) => [
      b.contacts ? 'contacts' : b.table ? `table${b.table.rows.length}` : b.faq ? `faq${b.faq.length}` : b.ul ? `ul${b.ul.length}` : `p${b.p.length}`,
    ].join(''));
    assert.deepEqual(shape('uz'), shape('ru'), `uz ${slug}`);
    assert.deepEqual(shape('en'), shape('ru'), `en ${slug}`);
  }
});

test('prices, hours, return period and company details come from the settings', () => {
  for (const lang of LANGS) {
    const d = JSON.stringify(plain(OL.infoContent(lang, 'delivery', ctx())));
    assert.ok(d.includes('30000 UZS'), `${lang} courier fee`);
    assert.ok(d.includes('50000 UZS'), `${lang} regions fee`);
    assert.ok(d.includes('1500000 UZS'), `${lang} free threshold`);
    assert.ok(d.includes('15') && d.includes('10:00–21:00'), `${lang} call window`);
    const r = JSON.stringify(plain(OL.infoContent(lang, 'returns', ctx({ returnDays: 7 }))));
    assert.ok(r.includes('7'), `${lang} return days`);
    const o = JSON.stringify(plain(OL.infoContent(lang, 'offer', ctx())));
    assert.ok(o.includes('ООО Лаунж') && o.includes('123456789'), `${lang} offer carries the company`);
  }
});

test('missing company details do not leave holes or "undefined"', () => {
  const empty = ctx({ company: '', inn: '', legalAddress: '', email: '', phone: '', free: 0, fee: {} });
  for (const lang of LANGS) {
    for (const slug of OL.INFO_SLUGS) {
      const s = JSON.stringify(plain(OL.infoContent(lang, slug, empty)));
      assert.ok(!/undefined|NaN|\[object/.test(s), `${lang}/${slug}`);
    }
    assert.ok(JSON.stringify(plain(OL.infoContent(lang, 'offer', empty))).includes('Outlet Lounge'));
  }
});

test('Uzbek texts use oʻ / gʻ and the tutuq letter, never straight or curly apostrophes', () => {
  const uz = OL.INFO_SLUGS.map((s) => JSON.stringify(plain(OL.infoContent('uz', s, ctx())))).join(' ');
  assert.ok(!/[A-Za-z][’'‘`´][A-Za-z]/.test(uz));
});

test('unknown language falls back to Russian; unknown slug is null', () => {
  assert.equal(plain(OL.infoContent('xx', 'delivery', ctx())).lead, plain(OL.infoContent('ru', 'delivery', ctx())).lead);
  assert.equal(OL.infoContent('ru', 'nope', ctx()), null);
});

test('company and analytics validation (admin)', () => {
  assert.ok(L.validateLegal({ company: 'ООО', inn: '123 456 789', email: 'a@b.uz', return_days: '14' }).ok);
  assert.ok(L.validateLegal({}).ok, 'everything optional');
  assert.equal(L.validateLegal({ email: 'nope' }).errors.email, 'email');
  assert.equal(L.validateLegal({ inn: '12' }).errors.inn, 'inn');
  assert.equal(L.validateLegal({ return_days: '0' }).errors.return_days, 'days');
  assert.ok(L.validateAnalytics({ yandex_metrica: '12345678', ga4: 'g-ab12cd34ef' }).ok);
  assert.ok(L.validateAnalytics({ yandex_metrica: '', ga4: '' }).ok);
  assert.equal(L.validateAnalytics({ yandex_metrica: 'abc' }).errors.yandex_metrica, 'metrica');
  assert.equal(L.validateAnalytics({ ga4: 'UA-123' }).errors.ga4, 'ga4');
});
