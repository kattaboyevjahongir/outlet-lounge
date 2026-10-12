// Promo codes (owner): list with usage and revenue, create / edit / switch off / delete.
import { html, $, $$ } from '../dom.js';
import { t } from '../i18n.js';
import { emptyPromo, validatePromo, promoToRow, promoState, isoToLocal, fmtMoney } from '../logic.js';
import { ICON, money, toast, errorText, confirmDialog, dateTime, deniedPage } from '../ui.js';

export default async function page({ data, me, go }) {
  if (me.role !== 'owner') return { title: t('promo.title'), body: deniedPage() };
  const promos = await data.listPromos();

  const stateBadge = (p) => {
    const s = promoState(p);
    const tone = { active: 'sv-ok', inactive: 'sv-hidden', scheduled: 'st-confirmed', expired: 'sv-hidden', used_up: 'sv-sold_out' }[s];
    return html`<span class="badge ${tone}">${t(`promo.state.${s}`)}</span>`;
  };
  const valueText = (p) => (p.type === 'percent' ? `−${p.value}%` : `−${money(p.value)}`);

  const card = (p) => html`
    <li class="promo-row" data-id="${p.id}">
      <div class="promo-main"><b class="code">${p.code}</b><small>${valueText(p)}${p.min_order ? ` · ≥ ${money(p.min_order)}` : ''}</small></div>
      <div class="promo-meta">
        <small>${t('promo.used')}: <b>${p.used_count}${p.usage_limit ? ` / ${p.usage_limit}` : ` (${t('promo.unlimited')})`}</b></small>
        <small>${t('promo.revenue')}: <b>${money(p.stats.revenue)}</b></small>
        ${p.ends_at ? html`<small>→ ${dateTime(p.ends_at)}</small>` : ''}
      </div>
      <div class="promo-state">${stateBadge(p)}</div>
      <div class="promo-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-toggle>${p.is_active ? t('products.hide') : t('products.show')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-edit>${ICON.right}<span class="sr-only">${t('common.edit')}</span></button>
        <button type="button" class="btn btn-danger-ghost btn-sm" data-del>${ICON.trash}<span class="sr-only">${t('common.delete')}</span></button>
      </div>
    </li>`;

  const body = html`
    <div class="page-head"><div><h1>${t('promo.title')}</h1><p class="muted">${t('promo.hint')}</p></div>
      <button type="button" class="btn btn-gold" id="promoNew">${ICON.plus}<span>${t('promo.add')}</span></button></div>
    <section class="card" id="promoEditor" hidden></section>
    ${promos.length ? html`<ul class="card promo-list">${promos.map(card)}</ul>` : html`<div class="empty-state"><p>${t('promo.empty')}</p></div>`}`;

  const toForm = (p) => ({
    id: p.id, code: p.code, type: p.type, value: String(p.value), min_order: p.min_order ? fmtMoney(p.min_order) : '',
    starts_at: isoToLocal(p.starts_at), ends_at: isoToLocal(p.ends_at),
    usage_limit: p.usage_limit == null ? '' : String(p.usage_limit), per_phone_limit: p.per_phone_limit == null ? '' : String(p.per_phone_limit),
    is_active: p.is_active,
  });

  return {
    title: t('promo.title'),
    body,
    mount(root) {
      const editor = $('#promoEditor', root);

      const open = (form) => {
        editor.hidden = false;
        editor.innerHTML = String(html`
          <h2>${t('promo.edit')}</h2>
          <form id="promoForm" class="stack" novalidate>
            <div class="grid-2">
              <label class="field"><span>${t('promo.code')}</span><input name="code" value="${form.code}" autocomplete="off" autocapitalize="characters" maxlength="20">
                <small class="err-msg" data-err="code"></small></label>
              <label class="field"><span>${t('promo.type')}</span>
                <select name="type"><option value="percent" ${form.type === 'percent' ? 'selected' : ''}>${t('promo.percent')}</option>
                  <option value="fixed" ${form.type === 'fixed' ? 'selected' : ''}>${t('promo.fixed')}</option></select></label>
            </div>
            <div class="grid-2">
              <label class="field"><span>${t('promo.value')}</span><input name="value" value="${form.value}" inputmode="numeric" autocomplete="off">
                <small class="err-msg" data-err="value"></small></label>
              <label class="field"><span>${t('promo.min')}</span><input name="min_order" value="${form.min_order}" inputmode="numeric" autocomplete="off">
                <small class="err-msg" data-err="min_order"></small></label>
            </div>
            <div class="grid-2">
              <label class="field"><span>${t('promo.starts')}</span><input type="datetime-local" name="starts_at" value="${form.starts_at}"></label>
              <label class="field"><span>${t('promo.ends')}</span><input type="datetime-local" name="ends_at" value="${form.ends_at}">
                <small class="err-msg" data-err="ends_at"></small></label>
            </div>
            <div class="grid-2">
              <label class="field"><span>${t('promo.limit')}</span><input name="usage_limit" value="${form.usage_limit}" inputmode="numeric" autocomplete="off">
                <small class="err-msg" data-err="usage_limit"></small></label>
              <label class="field"><span>${t('promo.perPhone')}</span><input name="per_phone_limit" value="${form.per_phone_limit}" inputmode="numeric" autocomplete="off">
                <small class="err-msg" data-err="per_phone_limit"></small></label>
            </div>
            <label class="switch"><input type="checkbox" name="is_active" ${form.is_active ? 'checked' : ''}><span>${t('promo.active')}</span></label>
            <div class="btn-row">
              <button class="btn btn-gold" type="submit">${t('common.save')}</button>
              <button class="btn btn-ghost" type="button" data-cancel>${t('common.cancel')}</button>
            </div>
          </form>`);
        const f = $('#promoForm', editor);
        f.code.focus();
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const values = {
            id: form.id, code: f.code.value, type: f.type.value, value: f.value.value, min_order: f.min_order.value,
            starts_at: f.starts_at.value, ends_at: f.ends_at.value, usage_limit: f.usage_limit.value,
            per_phone_limit: f.per_phone_limit.value, is_active: f.is_active.checked,
          };
          $$('.err-msg', f).forEach((x) => { x.textContent = ''; });
          const { ok, errors } = validatePromo(values);
          if (!ok) {
            Object.entries(errors).forEach(([k, c]) => { const el = $(`[data-err="${k}"]`, f); if (el) el.textContent = t(`promo.err.${c}`); });
            return;
          }
          try {
            await data.savePromo(promoToRow(values), form.id);
            toast(t('promo.saved'));
            await go(location.pathname, { force: true });
          } catch (err) {
            if (err.code === 'promo_taken') $('[data-err=code]', f).textContent = t('promo.taken');
            else toast(errorText(err), 'err');
          }
        });
      };

      $('#promoNew', root).addEventListener('click', () => open(emptyPromo()));
      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-cancel]')) { editor.hidden = true; return; }
        const li = e.target.closest('.promo-row');
        if (!li) return;
        const p = promos.find((x) => x.id === li.dataset.id);
        if (e.target.closest('[data-edit]')) { open(toForm(p)); editor.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        try {
          if (e.target.closest('[data-toggle]')) {
            await data.savePromo({ is_active: !p.is_active }, p.id);
            await go(location.pathname, { force: true });
          } else if (e.target.closest('[data-del]')) {
            const ok = await confirmDialog({ title: t('promo.deleteTitle', { code: p.code }), text: t('promo.deleteText'), ok: t('common.delete'), danger: true });
            if (!ok) return;
            await data.deletePromo(p.id);
            toast(t('promo.deleted'));
            await go(location.pathname, { force: true });
          }
        } catch (err) { toast(errorText(err), 'err'); }
      });
    },
  };
}
