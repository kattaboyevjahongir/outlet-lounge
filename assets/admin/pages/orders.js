// Orders list: search, status / period filters, paging. Filters live in the address so a view
// can be bookmarked or shared; typing in the search box reloads only the table.
import { html, $, $$, debounce } from '../dom.js';
import { t } from '../i18n.js';
import { STATUSES } from '../logic.js';
import { money, statusBadge, dateTime, phoneView, errorText, toast } from '../ui.js';

const PAGE_SIZE = 25;
const RANGES = ['all', 'today', '7d', '30d'];

export default async function page({ data, query, state, go }) {
  const f = {
    q: query.get('q') || '',
    status: STATUSES.includes(query.get('status')) ? query.get('status') : '',
    range: RANGES.includes(query.get('range')) ? query.get('range') : 'all',
    page: Math.max(1, Number(query.get('page')) || 1),
  };
  const counts = (state.lastOverview && state.lastOverview.by_status) || {};
  const soundOn = (() => { try { return localStorage.getItem('ol:admin:sound') === '1'; } catch { return false; } })();

  const body = html`
    <div class="page-head"><h1>${t('orders.title')}</h1>
      <label class="switch" title="${t('orders.sound')}"><input type="checkbox" id="soundToggle" ${soundOn ? 'checked' : ''}><span>${t('orders.sound')}</span></label>
    </div>
    <form class="filters" id="orderFilters" role="search">
      <label class="field grow"><span class="sr-only">${t('common.search')}</span>
        <input type="search" name="q" value="${f.q}" placeholder="${t('orders.search')}" autocomplete="off" inputmode="search"></label>
      <label class="field"><span class="sr-only">${t('orders.range')}</span>
        <select name="range">${RANGES.map((r) => html`<option value="${r}" ${r === f.range ? 'selected' : ''}>${t(`orders.${r}`)}</option>`)}</select></label>
    </form>
    <div class="chips-row" id="statusChips" role="group" aria-label="${t('orders.status')}">
      <button type="button" class="chip-btn ${f.status === '' ? 'is-on' : ''}" data-status="">${t('common.all')}</button>
      ${STATUSES.map((s) => html`<button type="button" class="chip-btn st-${s} ${f.status === s ? 'is-on' : ''}" data-status="${s}">${t(`status.${s}`)}${counts[s] ? html` <i>${counts[s]}</i>` : ''}</button>`)}
    </div>
    <div id="ordersResult" aria-live="polite"></div>`;

  const sync = () => {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.status) p.set('status', f.status);
    if (f.range !== 'all') p.set('range', f.range);
    if (f.page > 1) p.set('page', f.page);
    const qs = p.toString();
    history.replaceState({}, '', location.pathname + (qs ? `?${qs}` : ''));
  };

  const row = (o) => html`
    <tr data-href="/admin/orders/${o.number}" class="${o.status === 'new' ? 'is-new' : ''}">
      <td data-label="${t('orders.number')}"><a class="nowrap" href="/admin/orders/${o.number}"><b>${o.number}</b></a></td>
      <td data-label="${t('orders.date')}">${dateTime(o.created_at)}</td>
      <td data-label="${t('orders.customer')}">${o.customer_name}</td>
      <td data-label="${t('orders.phone')}"><span class="nowrap">${phoneView(o.phone)}</span></td>
      <td class="hide-md" data-label="${t('orders.items')}">${t('orders.pcs', { n: o.items_count })}</td>
      <td data-label="${t('orders.total')}"><b class="nowrap">${money(o.total)}</b></td>
      <td class="hide-md" data-label="${t('orders.delivery')}">${t(`delivery.${o.delivery_method}`)}</td>
      <td data-label="${t('orders.status')}">${statusBadge(o.status)}</td>
    </tr>`;

  return {
    title: t('orders.title'),
    body,
    mount(root) {
      const result = $('#ordersResult', root);
      let seq = 0;

      const load = async () => {
        const mine = (seq += 1);
        result.setAttribute('aria-busy', 'true');
        try {
          const { rows, total } = await data.listOrders({ ...f, pageSize: PAGE_SIZE });
          if (mine !== seq) return;
          const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
          if (f.page > pages) { f.page = pages; sync(); return load(); }
          result.innerHTML = String(rows.length ? html`
            <p class="muted count-line">${t('orders.count', { n: total })}</p>
            <div class="table-wrap"><table class="table stack-sm"><thead><tr>
              <th>${t('orders.number')}</th><th>${t('orders.date')}</th><th>${t('orders.customer')}</th><th>${t('orders.phone')}</th>
              <th class="hide-md">${t('orders.items')}</th><th>${t('orders.total')}</th><th class="hide-md">${t('orders.delivery')}</th><th>${t('orders.status')}</th>
            </tr></thead><tbody>${rows.map(row)}</tbody></table></div>
            ${pages > 1 ? html`<nav class="pager" aria-label="Pages">
              <button class="btn btn-ghost btn-sm" data-page="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>${t('common.prev')}</button>
              <span>${f.page} ${t('common.of')} ${pages}</span>
              <button class="btn btn-ghost btn-sm" data-page="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>${t('common.next')}</button>
            </nav>` : ''}` : html`<div class="empty-state"><p>${t('orders.empty')}</p></div>`);
        } catch (e) {
          if (mine === seq) result.innerHTML = String(html`<div class="empty-state"><p>${errorText(e)}</p>
            <button class="btn btn-ghost" data-act="reload-orders">${t('common.retry')}</button></div>`);
        } finally {
          if (mine === seq) result.removeAttribute('aria-busy');
        }
      };

      $('#orderFilters', root).addEventListener('submit', (e) => e.preventDefault());
      const q = $('input[name=q]', root);
      const onSearch = debounce(() => { f.q = q.value.trim(); f.page = 1; sync(); load(); }, 300);
      q.addEventListener('input', onSearch);
      $('select[name=range]', root).addEventListener('change', (e) => { f.range = e.target.value; f.page = 1; sync(); load(); });
      $('#statusChips', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-status]');
        if (!b) return;
        f.status = b.dataset.status; f.page = 1;
        $$('#statusChips .chip-btn', root).forEach((x) => x.classList.toggle('is-on', x === b));
        sync(); load();
      });
      result.addEventListener('click', (e) => {
        const pg = e.target.closest('[data-page]');
        if (pg && !pg.disabled) { f.page = Number(pg.dataset.page); sync(); load(); window.scrollTo(0, 0); return; }
        if (e.target.closest('[data-act=reload-orders]')) { load(); return; }
        const tr = e.target.closest('tr[data-href]');
        if (tr && !e.target.closest('a')) go(tr.dataset.href);
      });
      $('#soundToggle', root).addEventListener('change', (e) => {
        try { localStorage.setItem('ol:admin:sound', e.target.checked ? '1' : '0'); } catch { /* private mode */ }
        if (e.target.checked) toast(t('orders.sound'));
      });

      const onOverview = (e) => { if (e.detail.grew) load(); };
      window.addEventListener('admin:overview', onOverview);
      load();
      return () => { onSearch.cancel(); window.removeEventListener('admin:overview', onOverview); seq += 1; };
    },
  };
}
