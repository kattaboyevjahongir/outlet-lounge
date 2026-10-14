// Activity log (owner): who changed what, newest first.
import { html, $ } from '../dom.js';
import { t } from '../i18n.js';
import { activityView } from '../logic.js';
import { money, dateTimeFull, errorText, deniedPage } from '../ui.js';

const ENTITIES = ['products', 'product_sizes', 'categories', 'promo_codes', 'settings', 'staff'];
const PAGE = 40;
const MONEY_FIELDS = new Set(['price', 'old_price', 'min_order', 'value']);

const fieldName = (k) => (t(`field.${k}`) === `field.${k}` ? k : t(`field.${k}`));
function valueText(field, v, row) {
  if (v == null || v === '') return '—';
  if (v === 'true') return t('common.yes');
  if (v === 'false') return t('common.no');
  if (field === 'role') return t(`role.${v}`);
  if (MONEY_FIELDS.has(field) && /^\d+$/.test(v) && !(field === 'value' && row.entity === 'promo_codes' && Number(v) <= 100)) return money(Number(v));
  if (field === 'category' && t(`cat.${v}`) !== `cat.${v}`) return t(`cat.${v}`);
  return String(v).length > 60 ? `${String(v).slice(0, 60)}…` : String(v);
}

export default async function page({ data, me, query }) {
  if (me.role !== 'owner') return { title: t('act.title'), body: deniedPage() };
  const entity = ENTITIES.includes(query.get('entity')) ? query.get('entity') : '';

  const body = html`
    <div class="page-head"><div><h1>${t('act.title')}</h1><p class="muted">${t('act.hint')}</p></div></div>
    <div class="chips-row" id="entityChips">
      <button type="button" class="chip-btn ${entity === '' ? 'is-on' : ''}" data-entity="">${t('common.all')}</button>
      ${ENTITIES.map((e) => html`<button type="button" class="chip-btn ${entity === e ? 'is-on' : ''}" data-entity="${e}">${t(`act.e.${e}`)}</button>`)}
    </div>
    <div id="actResult" aria-live="polite"></div>`;

  return {
    title: t('act.title'),
    body,
    mount(root) {
      const result = $('#actResult', root);
      const f = { entity, page: 1 };
      let seq = 0;

      const line = (row) => {
        const v = activityView(row);
        const what = row.entity === 'product_sizes' && v.size ? `${t('act.e.product_sizes')} ${t('act.size', { size: v.size })}` : t(`act.e.${row.entity}`);
        return html`<li>
          <div class="act-head"><b>${row.actor}</b> ${t(`act.${row.action}`)} ${what} <b>«${v.label}»</b>
            <small>${dateTimeFull(row.created_at)}</small></div>
          ${v.changes.length ? html`<ul class="act-changes">${v.changes.map((c) =>
            html`<li><span>${fieldName(c.field)}</span> <s>${valueText(c.field, c.from, row)}</s> → <b>${valueText(c.field, c.to, row)}</b></li>`)}</ul>` : ''}
        </li>`;
      };

      const load = async () => {
        const mine = (seq += 1);
        try {
          const { rows, total } = await data.listActivity({ entity: f.entity, page: f.page, pageSize: PAGE });
          if (mine !== seq) return;
          const pages = Math.max(1, Math.ceil(total / PAGE));
          result.innerHTML = String(rows.length ? html`
            <ul class="card act-list">${rows.map(line)}</ul>
            ${pages > 1 ? html`<nav class="pager">
              <button class="btn btn-ghost btn-sm" data-page="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>${t('common.prev')}</button>
              <span>${f.page} ${t('common.of')} ${pages}</span>
              <button class="btn btn-ghost btn-sm" data-page="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>${t('common.next')}</button>
            </nav>` : ''}` : html`<div class="empty-state"><p>${t('act.empty')}</p></div>`);
        } catch (e) {
          if (mine === seq) result.innerHTML = String(html`<div class="empty-state"><p>${errorText(e)}</p></div>`);
        }
      };

      root.addEventListener('click', (e) => {
        const c = e.target.closest('[data-entity]');
        if (c) {
          f.entity = c.dataset.entity; f.page = 1;
          root.querySelectorAll('#entityChips .chip-btn').forEach((b) => b.classList.toggle('is-on', b === c));
          const q = f.entity ? `?entity=${f.entity}` : '';
          history.replaceState({}, '', location.pathname + q);
          load();
          return;
        }
        const pg = e.target.closest('[data-page]');
        if (pg && !pg.disabled) { f.page = Number(pg.dataset.page); load(); window.scrollTo(0, 0); }
      });
      load();
      return () => { seq += 1; };
    },
  };
}
