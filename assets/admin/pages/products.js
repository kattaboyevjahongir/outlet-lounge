// Products list: search + filters (done in the browser — the catalog is a few hundred rows at most).
import { html, $, $$, debounce } from '../dom.js';
import { t } from '../i18n.js';
import { filterProducts, stockState, colourSiblings, DEPARTMENTS, discountPct } from '../logic.js';
import { ICON, money, photo, toast, errorText } from '../ui.js';

const STATES = ['active', 'hidden', 'on_order', 'sold_out', 'low'];
const PAGE_SIZE = 30;

export default async function page({ data, query, go }) {
  const [products, categories] = await Promise.all([data.listProducts(), data.listCategories()]);
  const depts = Object.fromEntries(categories.map((c) => [c.slug, c.department]));
  const catName = (c) => c['name_' + (document.documentElement.lang || 'ru')] || c.name_en;
  const brands = [...new Map(products.map((p) => [p.brand_id, p.brand_name])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const f = {
    q: query.get('q') || '',
    brand: query.get('brand') || '',
    dept: DEPARTMENTS.includes(query.get('dept')) ? query.get('dept') : '',
    category: categories.some((c) => c.slug === query.get('category')) ? query.get('category') : '',
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
      <label class="field"><span class="sr-only">${t('products.dept')}</span>
        <select name="dept"><option value="">${t('products.dept')}: ${t('common.all')}</option>
          ${DEPARTMENTS.map((d) => html`<option value="${d}" ${d === f.dept ? 'selected' : ''}>${t(`dept.${d}`)}</option>`)}</select></label>
      <label class="field"><span class="sr-only">${t('products.category')}</span>
        <select name="category"><option value="">${t('products.category')}: ${t('common.all')}</option>
          ${DEPARTMENTS.map((d) => html`<optgroup label="${t(`dept.${d}`)}">${categories.filter((c) => c.department === d).map((c) =>
            html`<option value="${c.slug}" ${c.slug === f.category ? 'selected' : ''}>${catName(c)}</option>`)}</optgroup>`)}</select></label>
      <label class="field"><span class="sr-only">${t('products.state')}</span>
        <select name="state"><option value="">${t('products.state')}: ${t('common.all')}</option>
          ${STATES.map((s) => html`<option value="${s}" ${s === f.state ? 'selected' : ''}>${t(`products.state.${s}`)}</option>`)}</select></label>
    </form>
    <div id="bulkBar" class="bulkbar" hidden></div>
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

  const sel = new Set(); // ids ticked for a bulk action

  const card = (p) => {
    const s = stockState(p);
    const off = discountPct(p.price, p.old_price);
    const others = colourSiblings(products, p).length;
    return html`
      <li class="pitem ${p.is_active ? '' : 'is-hidden'}" data-id="${p.id}">
        <label class="sel"><input type="checkbox" data-sel="${p.id}" ${sel.has(p.id) ? 'checked' : ''} aria-label="${p.name}"></label>
        <a class="pitem-photo" href="/admin/products/${p.id}" tabindex="-1" aria-hidden="true">${photo(data, p.images[0] && p.images[0].path, 400, '')}</a>
        <div class="pitem-main">
          <a href="/admin/products/${p.id}"><b>${p.name}</b></a>
          <small>${p.brand_name}${p.color ? ` · ${p.color}` : ''}${p.sku ? ` · ${p.sku}` : ''}${others ? ` · ${t('products.colours', { n: others })}` : ''}</small>
          ${p.images.length ? '' : html`<small class="warn">${t('products.noPhoto')}</small>`}
        </div>
        <div class="pitem-price"><b>${money(p.price)}</b>${off ? html`<small><s>${money(p.old_price)}</s> −${off}%</small>` : ''}</div>
        <div class="pitem-stock"><b>${t('products.pcs', { n: s.total })}</b><small>${p.sizes.map((z) => z.label).join(' · ')}</small></div>
        <div class="pitem-state">${badge(p)}</div>
        <div class="pitem-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-toggle="${p.id}" title="${p.is_active ? t('products.hide') : t('products.show')}">
            ${p.is_active ? ICON.eyeOff : ICON.eye}<span class="sr-only">${p.is_active ? t('products.hide') : t('products.show')}</span></button>
          <a class="btn btn-ghost btn-sm" href="/admin/products/new?from=${p.id}" title="${t('pf.addColour')}">${ICON.copy}<span class="sr-only">${t('pf.addColour')}</span></a>
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
        const list = filterProducts(products, { ...f, depts });
        const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        if (f.page > pages) f.page = pages;
        const slice = list.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE);
        if (!products.length) {
          result.innerHTML = String(html`<div class="empty-state"><p>${t('products.none')}</p>
            <a class="btn btn-gold" href="/admin/products/new">${t('products.add')}</a></div>`);
          return;
        }
        result.innerHTML = String(list.length ? html`
          <div class="count-line sel-line"><span class="muted">${t('products.count', { n: list.length })}</span>
            <label class="switch"><input type="checkbox" id="selAll" ${slice.length && slice.every((p) => sel.has(p.id)) ? 'checked' : ''}><span>${t('products.selectAll')}</span></label></div>
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
      ['brand', 'dept', 'category', 'state'].forEach((k) => form[k].addEventListener('change', () => {
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
      const bar = $('#bulkBar', root);
      const renderBulk = () => {
        bar.hidden = sel.size === 0;
        if (!sel.size) { bar.innerHTML = ''; return; }
        bar.innerHTML = String(html`
          <b>${t('products.selected', { n: sel.size })}</b>
          <button type="button" class="btn btn-ghost btn-sm" data-bulk="hide">${t('products.bulkHide')}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-bulk="show">${t('products.bulkShow')}</button>
          <span class="bulk-discount"><input id="bulkPct" inputmode="numeric" placeholder="${t('products.bulkDiscount')}" aria-label="${t('products.bulkDiscount')}" maxlength="2">
            <button type="button" class="btn btn-gold btn-sm" data-bulk="discount">${t('products.bulkApply')}</button></span>
          <button type="button" class="btn btn-ghost btn-sm" data-bulk="clear">${t('products.clear')}</button>
          <small class="muted">${t('products.bulkHint')}</small>`);
      };
      result.addEventListener('change', (e) => {
        const one = e.target.closest('[data-sel]');
        if (one) {
          if (one.checked) sel.add(one.dataset.sel); else sel.delete(one.dataset.sel);
          renderBulk();
          return;
        }
        if (e.target.id === 'selAll') {
          const list = filterProducts(products, { ...f, depts }).slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE);
          list.forEach((p) => { if (e.target.checked) sel.add(p.id); else sel.delete(p.id); });
          render();
          renderBulk();
        }
      });
      bar.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-bulk]');
        if (!b) return;
        const kind = b.dataset.bulk;
        if (kind === 'clear') { sel.clear(); render(); renderBulk(); return; }
        const chosen = products.filter((p) => sel.has(p.id));
        let op;
        if (kind === 'hide') op = { active: false };
        else if (kind === 'show') op = { active: true };
        else {
          const pct = Number($('#bulkPct', bar).value);
          if (!Number.isInteger(pct) || pct < 1 || pct > 90) return toast(t('products.bulkNeedPct'), 'err');
          op = { discount: pct };
        }
        b.disabled = true;
        try {
          const n = await data.bulkProducts(chosen, op);
          const fresh = await data.listProducts();
          products.splice(0, products.length, ...fresh);
          sel.clear();
          toast(t('products.bulkDone', { n }));
          render();
          renderBulk();
        } catch (err) {
          toast(errorText(err), 'err');
          b.disabled = false;
        }
      });
      render();
      return () => onSearch.cancel();
    },
  };
}
