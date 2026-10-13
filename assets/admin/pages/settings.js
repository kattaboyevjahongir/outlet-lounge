// Site settings (owner): contacts, delivery prices, home page countdown / hero, Telegram test.
// The storefront reads these public settings through /api/catalog (cached about a minute).
import { html, raw, $, $$ } from '../dom.js';
import { t } from '../i18n.js';
import {
  validateContacts, validateDelivery, validateLegal, validateAnalytics, cleanHandle, parseMoney, fmtMoney, localToIso, isoToLocal, DELIVERY_METHODS,
} from '../logic.js';
import { toast, errorText, deniedPage } from '../ui.js';

export default async function page({ data, me }) {
  if (me.role !== 'owner') return { title: t('set.title'), body: deniedPage() };
  const [settings, products] = await Promise.all([data.getSettings(), data.listProducts()]);
  const contacts = settings.contacts || {};
  const delivery = settings.delivery || { methods: [], free_threshold: null };
  const home = settings.home || {};
  const tgSetting = settings.telegram || {};
  const legal = settings.legal || {};
  const analytics = settings.analytics || {};
  const site = settings.site || {};
  const feeOf = (id) => {
    const m = (delivery.methods || []).find((x) => x.id === id);
    return m ? fmtMoney(m.fee) : '';
  };

  const err = (k) => html`<small class="err-msg" data-err="${k}"></small>`;
  const input = (name, label, value, opts = {}) => html`
    <label class="field"><span>${label}</span>
      <input name="${name}" value="${value == null ? '' : value}" autocomplete="off" ${opts.mode ? raw(`inputmode="${opts.mode}"`) : ''}
        maxlength="${opts.max || 80}">${err(name)}${opts.hint ? html`<small class="hint">${opts.hint}</small>` : ''}</label>`;

  const body = html`
    <div class="page-head"><div><h1>${t('set.title')}</h1><p class="muted">${t('set.hint')}</p></div></div>
    <div class="pform">
      <section class="card">
        <h2>${t('set.contacts')}</h2>
        <form id="contactsForm" class="stack" novalidate>
          <div class="grid-2">${input('phone', t('set.phone'), contacts.phone, { mode: 'tel', max: 30 })}${input('hours', t('set.hours'), contacts.hours, { max: 40 })}</div>
          <div class="grid-2">${input('telegram', t('set.telegram'), contacts.telegram, { max: 60 })}${input('telegram_bot', t('set.telegramBot'), contacts.telegram_bot, { max: 60 })}</div>
          <div class="grid-2">${input('instagram', t('set.instagram'), contacts.instagram, { max: 60 })}${input('call_minutes', t('set.callMinutes'), contacts.call_minutes, { mode: 'numeric', max: 3 })}</div>
          ${input('address', t('set.address'), contacts.address, { max: 160 })}
          <div class="btn-row"><button class="btn btn-gold" type="submit">${t('set.saveContacts')}</button></div>
        </form>
      </section>

      <section class="card">
        <h2>${t('set.delivery')}</h2>
        <form id="deliveryForm" class="stack" novalidate>
          <div class="grid-2">
            ${DELIVERY_METHODS.map((id) => input(id, t(`set.fee.${id}`), feeOf(id), { mode: 'numeric', max: 12 }))}
            ${input('free_threshold', t('set.freeFrom'), delivery.free_threshold ? fmtMoney(delivery.free_threshold) : '', { mode: 'numeric', max: 12, hint: t('set.freeHint') })}
          </div>
          <div class="btn-row"><button class="btn btn-gold" type="submit">${t('set.saveDelivery')}</button></div>
        </form>
      </section>

      <section class="card">
        <h2>${t('set.home')}</h2>
        <form id="homeForm" class="stack" novalidate>
          <div class="grid-2">
            <label class="field"><span>${t('set.dealEnds')}</span><input type="datetime-local" name="deal_ends" value="${isoToLocal(home.deal_ends)}">
              <small class="hint">${t('set.dealHint')}</small></label>
            <label class="field"><span>${t('set.heroProduct')}</span>
              <select name="hero">
                <option value="">${t('set.heroAuto')}</option>
                ${products.filter((p) => p.is_active).map((p) => html`<option value="${p.slug}" ${home.hero && home.hero.product === p.slug ? 'selected' : ''}>${p.brand_name} ${p.name}</option>`)}
              </select></label>
          </div>
          <div class="btn-row"><button class="btn btn-gold" type="submit">${t('set.saveHome')}</button></div>
        </form>
      </section>

      <section class="card">
        <h2>${t('set.launch')}</h2>
        <p class="muted">${t('set.launchHint')}</p>
        <form id="launchForm" class="stack" novalidate>
          <label class="switch"><input type="checkbox" name="indexing" ${site.indexing === true ? 'checked' : ''}><span>${t('set.indexing')}</span></label>
          <div class="btn-row"><button class="btn btn-gold" type="submit">${t('set.saveLaunch')}</button></div>
        </form>
      </section>

      <section class="card">
        <h2>${t('set.legal')}</h2>
        <p class="muted">${t('set.legalHint')}</p>
        <form id="legalForm" class="stack" novalidate>
          <div class="grid-2">${input('company', t('set.company'), legal.company, { max: 120 })}${input('inn', t('set.inn'), legal.inn, { mode: 'numeric', max: 14 })}</div>
          ${input('legal_address', t('set.legalAddress'), legal.address, { max: 200 })}
          <div class="grid-2">${input('email', t('set.email'), legal.email, { max: 80 })}${input('return_days', t('set.returnDays'), legal.return_days || 14, { mode: 'numeric', max: 3 })}</div>
          <div class="btn-row"><button class="btn btn-gold" type="submit">${t('set.saveLegal')}</button></div>
        </form>
      </section>

      <section class="card">
        <h2>${t('set.analytics')}</h2>
        <p class="muted">${t('set.analyticsHint')}</p>
        <form id="analyticsForm" class="stack" novalidate>
          <div class="grid-2">${input('yandex_metrica', t('set.metrica'), analytics.yandex_metrica, { mode: 'numeric', max: 12 })}${input('ga4', t('set.ga4'), analytics.ga4, { max: 16 })}</div>
          <div class="btn-row"><button class="btn btn-gold" type="submit">${t('set.saveAnalytics')}</button></div>
        </form>
      </section>

      <section class="card">
        <h2>${t('set.tg')}</h2>
        ${tgSetting.chat_id
          ? html`<p>${t('set.tgChat')}: <b>${tgSetting.chat_title || tgSetting.chat_id}</b> <span class="muted">(${tgSetting.chat_id})</span></p>`
          : html`<p class="warn">${t('set.tgOff')}</p>`}
        <div class="btn-row"><button type="button" class="btn btn-ghost" id="tgTest">${t('set.tgTest')}</button></div>
      </section>
    </div>`;

  return {
    title: t('set.title'),
    body,
    mount(root) {
      const showErrors = (form, errors, prefix) => {
        $$('.err-msg', form).forEach((e) => { e.textContent = ''; });
        Object.entries(errors).forEach(([k, c]) => { const el = $(`[data-err="${k}"]`, form); if (el) el.textContent = t(`${prefix}.${c}`); });
      };
      const saved = () => toast(t('set.saved'));
      const fail = (e) => toast(errorText(e), 'err');

      $('#contactsForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const v = Object.fromEntries(new FormData(f));
        const { ok, errors } = validateContacts(v);
        showErrors(f, errors, 'set.err');
        if (!ok) return;
        const minutes = parseMoney(v.call_minutes);
        try {
          await data.saveSetting('contacts', {
            ...contacts,
            phone: String(v.phone).trim(), hours: String(v.hours).trim(),
            telegram: cleanHandle(v.telegram), telegram_bot: cleanHandle(v.telegram_bot), instagram: cleanHandle(v.instagram),
            call_minutes: minutes || 15,
            address: String(v.address || '').trim(),
          }, true);
          saved();
        } catch (err) { fail(err); }
      });

      $('#deliveryForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const v = Object.fromEntries(new FormData(f));
        const { ok, errors } = validateDelivery(v);
        showErrors(f, errors, 'set.err');
        if (!ok) return;
        const known = new Set((delivery.methods || []).map((m) => m.id));
        const methods = (delivery.methods || []).map((m) => (DELIVERY_METHODS.includes(m.id) ? { ...m, fee: parseMoney(v[m.id]) } : m));
        DELIVERY_METHODS.forEach((id) => { if (!known.has(id)) methods.push({ id, fee: parseMoney(v[id]) }); });
        const next = { ...delivery, methods };
        const free = parseMoney(v.free_threshold);
        if (free) next.free_threshold = free; else delete next.free_threshold;
        try { await data.saveSetting('delivery', next, true); saved(); } catch (err) { fail(err); }
      });

      $('#homeForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const hero = { ...(home.hero || {}) };
        if (f.hero.value) hero.product = f.hero.value; else delete hero.product;
        try {
          await data.saveSetting('home', { ...home, hero, deal_ends: localToIso(f.deal_ends.value) }, true);
          saved();
        } catch (err) { fail(err); }
      });

      $('#launchForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await data.saveSetting('site', { ...site, indexing: e.currentTarget.indexing.checked }, true);
          saved();
        } catch (err) { fail(err); }
      });

      $('#legalForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const v = Object.fromEntries(new FormData(f));
        const { ok, errors } = validateLegal(v);
        showErrors(f, errors, 'set.err');
        if (!ok) return;
        try {
          await data.saveSetting('legal', {
            company: String(v.company).trim(), inn: String(v.inn).replace(/\s/g, ''), address: String(v.legal_address).trim(),
            email: String(v.email).trim(), return_days: parseMoney(v.return_days) || 14,
          }, true);
          saved();
        } catch (err) { fail(err); }
      });

      $('#analyticsForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const v = Object.fromEntries(new FormData(f));
        const { ok, errors } = validateAnalytics(v);
        showErrors(f, errors, 'set.err');
        if (!ok) return;
        try {
          await data.saveSetting('analytics', { yandex_metrica: String(v.yandex_metrica).trim(), ga4: String(v.ga4).trim().toUpperCase() }, true);
          saved();
        } catch (err) { fail(err); }
      });

      $('#tgTest', root).addEventListener('click', async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        try {
          await data.telegramTest();
          toast(t('set.tgTested'));
        } catch (err) {
          toast(err.code === 'telegram_off' ? t('set.tgOff') : err.code === 'telegram_failed' ? t('set.tgFailed') : errorText(err), 'err');
        } finally { b.disabled = false; }
      });
    },
  };
}
