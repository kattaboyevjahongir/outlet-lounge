// node --test tests/*.test.mjs — storefront texts: the three languages stay in step, Uzbek spelling is correct
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../assets/js/i18n.js', import.meta.url), 'utf8'), sandbox);
const I = JSON.parse(JSON.stringify(sandbox.window.OL.I18N));

// every key path in a tree, with arrays as leaves that carry their length
const paths = (o, p = '') => Object.entries(o).flatMap(([k, v]) => {
  const key = p ? `${p}.${k}` : k;
  if (Array.isArray(v)) return [`${key}[${v.length}]`];
  return v && typeof v === 'object' ? paths(v, key) : [key];
});
const strings = (o) => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? strings(v) : []));

test('Russian, Uzbek and English have exactly the same keys', () => {
  const en = paths(I.en).sort();
  assert.deepEqual(paths(I.ru).sort(), en, 'ru differs from en');
  assert.deepEqual(paths(I.uz).sort(), en, 'uz differs from en');
});

test('no text is empty and placeholders match across languages', () => {
  const holders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  const walk = (en, other, path, lang) => {
    for (const [k, v] of Object.entries(en)) {
      const o = other[k];
      if (typeof v === 'string') {
        assert.ok(typeof o === 'string' && o.trim(), `${lang} ${path}${k} is empty`);
        assert.equal(holders(o), holders(v), `${lang} ${path}${k}: placeholders differ`);
      } else if (Array.isArray(v)) {
        v.forEach((x, i) => (typeof x === 'string' ? assert.equal(holders(o[i]), holders(x), `${lang} ${path}${k}[${i}]`) : walk(x, o[i], `${path}${k}[${i}].`, lang)));
      } else if (v && typeof v === 'object') walk(v, o, `${path}${k}.`, lang);
    }
  };
  walk(I.en, I.ru, '', 'ru');
  walk(I.en, I.uz, '', 'uz');
});

test('Uzbek uses the proper letters ʻ (oʻ, gʻ) and ʼ, never a straight or curly apostrophe', () => {
  for (const s of strings(I.uz)) {
    assert.ok(!/[oOgG]['‘’`´]/.test(s), `wrong apostrophe after o/g: ${s}`);
    assert.ok(!/\wʻ\w/.test(s.replace(/[oOgG]ʻ/g, '')), `ʻ used outside oʻ / gʻ: ${s}`);
  }
});

test('wording of the sneaker shop is gone (EU sizes, women and kids)', () => {
  const all = JSON.stringify(I);
  const hit = all.match(/.{20}(EU \d|gender|women|kids|drop|аутлет|outlet prices).{20}/i);
  assert.ok(!hit, hit && hit[0]);
});
