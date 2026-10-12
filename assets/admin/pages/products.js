// Products list: search + filters (done in the browser — the catalog is a few hundred rows at most).
import { html, $, $$, debounce } from '../dom.js';
import { t } from '../i18n.js';
import { filterProducts, stockState, CATEGORIES, discountPct } from '../logic.js';
import { ICON, money, photo, toast, errorText } from '../ui.js';

const STATES = ['active', 'hidden', 'sold_out', 'low'];
const PAGE_SIZE = 30;

export default async function page({ data, query, go }) {
  const products = await data.listProducts();
  const brands = [...new Map(products.map((p) => [p.brand_id, p.brand_name])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const f = {
    q: query.get('q') || '',
    brand: query.get('brand') || '',
    category: CATEGORIES.includes(query.get('category')) ? query.get('category') : '',
    state: STATES.includes(query.get('state')) ? query.get('state') : '',
    page: Math.max(1, Number(query.get('page')) || 1),
  };

  const body = html`
    <div class="page-head"><h1>${t('products.title')}</h1>
      <a class="btn btn-gold" href="/admin/products/new">${ICON.plus}<span>${t('products.add')}</span></a></div>
    <form class="filters" id="productFilters" role="search">
      <label class="field grow"><span class="sr-only">${t('common.search')}</span>
        <input type="search" name="q" value="${f.q}" placeholder="${t('products.search')}" autocomplete="off"></label>
      <label class="field"><span class="sr-only">${t('products.brand')}</span>
        <select name="brand"><option value="">${t('products.brand')}: ${t('common.all')}</option>
          ${brands.map(([id, name]) => html`<option value="${id}" ${id === f.brand ? 'selected' : ''}>${name}</option>`)}</select></label>
      <label class="field"><span class="sr-only">${t('products.category')}</span>
        <select name="category"><option value="">${t('products.category')}: ${t('common.all')}</option>
          ${CATEGORIES.map((c) => html`<option value="${c}" ${c === f.category ? 'selected' : ''}>${t(`cat.${c}`)}</option>`)}</select></label>
      <label class="field"><span class="sr-only">${t('products.state')}</span>
        <select name="state"><option value="">${t('products.state')}: ${t('common.all')}</option>
          ${STATES.map((s) => html`<option value="${s}" ${s === f.state ? 'selected' : ''}>${t(`products.state.${s}`)}</option>`)}</select></label>
    </form>
    <div id="productsResult" aria-live="polite"></div>`;

  const sync = () => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v && !(k === 'page' && v === 1)) p.set(k, v); });
    const qs = p.toString();
    history.replaceState({}, '', location.pathname + (qs ? `?${qs}` : ''));
  };

  const badge = (p) => {
    const s = stockState(p);
    return html`<span class="badge sv-${s.state}">${t(`products.state.${s.state === 'ok' ? 'ok' : s.state}`)}</span>`;
  };

  const card = (p) => {
    const s = stockState(p);
    const off = discountPct(p.price, p.old_price);
    return html`
      <li class="pitem ${p.is_active ? '' : 'is-hidden'}" data-id="${p.id}">
        <a class="pitem-photo" href="/admin/products/${p.id}" tabindex="-1" aria-hidden="true">${photo(data, p.images[0] && p.images[0].path, 400, '')}</a>
        <div class="pitem-main">
          <a href="/admin/products/${p.id}"><b>${p.name}</b></a>
          <small>${p.brand_name}${p.colorway ? ` · ${p.colorway}` : ''}${p.sku ? ` · ${p.sku}` : ''}</small>
          ${p.images.length ? '' : html`<small class="warn">${t('products.noPhoto')}</small>`}
        </div>
        <div class="pitem-price"><b>${money(p.price)}</b>${off ? html`<small><s>${money(p.old_price)}</s> −${off}%</small>` : ''}</div>
        <div class="pitem-stock"><b>${t('products.pcs', { n: s.total })}</b><small>${p.sizes.length} EU</small></div>
        <div class="pitem-state">${badge(p)}</div>
        <div class="pitem-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-toggle="${p.id}" title="${p.is_active ? t('products.hide') : t('products.show')}">
            ${p.is_active ? ICON.eyeOff : ICON.eye}<span class="sr-only">${p.is_active ? t('products.hide') : t('products.show')}</span></button>
          <a class="btn btn-ghost btn-sm" href="/admin/products/new?from=${p.id}" title="${t('products.duplicate')}">${ICON.copy}<span class="sr-only">${t('products.duplicate')}</span></a>
          <a class="btn btn-ghost btn-sm" href="/admin/products/${p.id}">${ICON.right}<span class="sr-only">${t('common.edit')}</span></a>
        </div>
      </li>`;
  };

  return {
    title: t('products.title'),
    body,
    mount(root) {
      const result = $('#productsResult', root);
      const render = () => {
        const list = filterProducts(products, f);
        const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        if (f.page > pages) f.page = pages;
        const slice = list.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE);
        if (!products.length) {
          result.innerHTML = String(html`<div class="empty-state"><p>${t('products.none')}</p>
            <a class="btn btn-gold" href="/admin/products/new">${t('products.add')}</a></div>`);
          return;
        }
        result.innerHTML = String(list.length ? html`
          <p class="muted count-line">${t('products.count', { n: list.length })}</p>
          <ul class="plist">${slice.map(card)}</ul>
          ${pages > 1 ? html`<nav class="pager">
            <button class="btn btn-ghost btn-sm" data-page="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>${t('common.prev')}</button>
            <span>${f.page} ${t('common.of')} ${pages}</span>
            <button class="btn btn-ghost btn-sm" data-page="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>${t('common.next')}</button>
          </nav>` : ''}` : html`<div class="empty-state"><p>${t('products.empty')}</p></div>`);
      };

      const form = $('#productFilters', root);
      form.addEventListener('submit', (e) => e.preventDefault());
      const onSearch = debounce(() => { f.q = form.q.value.trim(); f.page = 1; sync(); render(); }, 200);
      form.q.addEventListener('input', onSearch);
      ['brand', 'category', 'state'].forEach((k) => form[k].addEventListener('change', () => {
        f[k] = form[k].value; f.page = 1; sync(); render();
      }));

      result.addEventListener('click', async (e) => {
        const pg = e.target.closest('[data-page]');
        if (pg && !pg.disabled) { f.page = Number(pg.dataset.page); sync(); render(); window.scrollTo(0, 0); return; }
        const tg = e.target.closest('[data-toggle]');
        if (!tg) return;
        const p = products.find((x) => x.id === tg.dataset.toggle);
        tg.disabled = true;
        try {
          await data.setProductActive(p.id, !p.is_active);
          p.is_active = !p.is_active;
          toast(p.is_active ? t('products.shown') : t('products.hidden'));
          render();
        } catch (err) {
          toast(errorText(err), 'err');
          tg.disabled = false;
        }
      });
      render();
      return () => onSearch.cancel();
    },
  };
}
