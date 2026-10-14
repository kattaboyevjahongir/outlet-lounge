// Stock grid: products × sizes, every number editable in place and saved on change.
// Products are grouped by the size system of their category (letter, Russian, waist, shoes, belts, one size),
// so each table has sensible columns. The plane switches "can be ordered from abroad when none is left".
import { html, $, debounce } from '../dom.js';
import { t, getLang } from '../i18n.js';
import { filterProducts, sortLabels, placeLabel, systemOfCategory, DEPARTMENTS, SIZE_SYSTEM_IDS } from '../logic.js';
import { ICON, photo, toast, errorText } from '../ui.js';

export default async function page({ data, query }) {
  const [products, categories] = await Promise.all([data.listProducts(), data.listCategories()]);
  const lang = getLang();
  const depts = Object.fromEntries(categories.map((c) => [c.slug, c.department]));
  const catName = (c) => c['name_' + lang] || c.name_en;
  const brands = [...new Map(products.map((p) => [p.brand_id, p.brand_name])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const f = {
    q: query.get('q') || '',
    brand: query.get('brand') || '',
    dept: DEPARTMENTS.includes(query.get('dept')) ? query.get('dept') : '',
    category: categories.some((c) => c.slug === query.get('category')) ? query.get('category') : '',
    low: query.get('low') === '1',
  };

  const body = html`
    <div class="page-head"><div><h1>${t('stock.title')}</h1><p class="muted">${t('stock.hint')}</p></div></div>
    <form class="filters" id="stockFilters" role="search">
      <label class="field grow"><span class="sr-only">${t('stock.search')}</span>
        <input type="search" name="q" value="${f.q}" placeholder="${t('stock.search')}" autocomplete="off"></label>
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
      <label class="switch"><input type="checkbox" name="low" ${f.low ? 'checked' : ''}><span>${t('stock.onlyLow')}</span></label>
    </form>
    <div id="stockResult"></div>`;

  const total = (p) => p.sizes.reduce((n, s) => n + s.stock, 0);
  const systemOf = (p) => systemOfCategory(categories, p.category);

  return {
    title: t('stock.title'),
    body,
    mount(root) {
      const result = $('#stockResult', root);

      const table = (system, list) => {
        const labels = sortLabels(list.flatMap((p) => p.sizes.map((s) => s.label)), system);
        return html`
          <h2 class="group-title">${t('stock.group', { name: t(`sys.${system}`) })}</h2>
          <div class="table-wrap grid-wrap"><table class="grid">
            <thead><tr><th class="sticky">${t('products.product')}</th>${labels.map((l) => html`<th>${l}</th>`)}<th>${t('stock.total')}</th></tr></thead>
            <tbody>${list.map((p) => html`<tr class="${p.is_active ? '' : 'is-hidden'}" data-id="${p.id}">
              <th class="sticky" scope="row"><a href="/admin/products/${p.id}">
                <span class="thumb sm">${photo(data, p.images[0] && p.images[0].path, 200, '')}</span>
                <span class="gname"><b>${p.name}${p.color ? ` · ${p.color}` : ''}</b><small>${p.brand_name}${p.is_active ? '' : ` · ${t('stock.hiddenProduct')}`}</small></span></a></th>
              ${labels.map((label) => {
                const s = p.sizes.find((z) => z.label === label);
                return s
                  ? html`<td><span class="cellbox"><input class="cell ${s.stock === 0 ? 'z0' : s.stock === 1 ? 'z1' : ''}" type="number" min="0" step="1" inputmode="numeric"
                      value="${s.stock}" data-size="${s.id}" data-prev="${s.stock}" aria-label="${p.name} ${label}">
                      <button type="button" class="orderable ${s.orderable ? 'is-on' : ''}" data-orderable="${s.id}" aria-pressed="${s.orderable ? 'true' : 'false'}"
                        title="${t('stock.orderToggle')}" aria-label="${t('stock.orderToggle')}">${ICON.plane}</button></span></td>`
                  : html`<td><button type="button" class="cell-add" data-add="${p.id}" data-label="${label}" title="${t('stock.addSize', { label })}" aria-label="${t('stock.addSize', { label })}">—</button></td>`;
              })}
              <td class="sum" data-sum>${total(p)}</td>
            </tr>`)}</tbody>
          </table></div>`;
      };

      const render = () => {
        let list = filterProducts(products, { q: f.q, brand: f.brand, category: f.category, dept: f.dept, depts });
        if (f.low) list = list.filter((p) => p.sizes.some((s) => s.stock <= 1));
        if (!list.length) {
          result.innerHTML = String(html`<div class="empty-state"><p>${t('stock.empty')}</p></div>`);
          return;
        }
        const groups = SIZE_SYSTEM_IDS
          .map((system) => [system, list.filter((p) => systemOf(p) === system)])
          .filter(([, l]) => l.length);
        result.innerHTML = String(html`${groups.map(([system, l]) => table(system, l))}`);
      };

      const form = $('#stockFilters', root);
      form.addEventListener('submit', (e) => e.preventDefault());
      const sync = () => {
        const p = new URLSearchParams();
        if (f.q) p.set('q', f.q);
        if (f.brand) p.set('brand', f.brand);
        if (f.dept) p.set('dept', f.dept);
        if (f.category) p.set('category', f.category);
        if (f.low) p.set('low', '1');
        const qs = p.toString();
        history.replaceState({}, '', location.pathname + (qs ? `?${qs}` : ''));
      };
      const onSearch = debounce(() => { f.q = form.q.value.trim(); sync(); render(); }, 200);
      form.q.addEventListener('input', onSearch);
      ['brand', 'dept', 'category'].forEach((k) => form[k].addEventListener('change', () => { f[k] = form[k].value; sync(); render(); }));
      form.low.addEventListener('change', () => { f.low = form.low.checked; sync(); render(); });

      const flash = (el, cls) => {
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 900);
      };

      result.addEventListener('change', async (e) => {
        const input = e.target.closest('input[data-size]');
        if (!input) return;
        const raw = input.value.trim();
        const n = Number(raw);
        if (raw === '' || !Number.isInteger(n) || n < 0) {
          input.value = input.dataset.prev;
          return toast(t('pf.err.stock'), 'err');
        }
        input.disabled = true;
        try {
          const saved = await data.setStock(input.dataset.size, n);
          const p = products.find((x) => x.id === input.closest('tr').dataset.id);
          p.sizes.find((s) => s.id === input.dataset.size).stock = saved;
          input.value = saved;
          input.dataset.prev = saved;
          input.classList.toggle('z0', saved === 0);
          input.classList.toggle('z1', saved === 1);
          $('[data-sum]', input.closest('tr')).textContent = total(p);
          flash(input, 'saved');
        } catch (err) {
          input.value = input.dataset.prev;
          flash(input, 'failed');
          toast(err.code === 'denied' ? errorText(err) : t('stock.saveFail'), 'err');
        } finally {
          input.disabled = false;
        }
      });

      result.addEventListener('click', async (e) => {
        const tog = e.target.closest('[data-orderable]');
        if (tog) {
          tog.disabled = true;
          try {
            const p = products.find((x) => x.id === tog.closest('tr').dataset.id);
            const size = p.sizes.find((s) => s.id === tog.dataset.orderable);
            size.orderable = await data.setOrderable(size.id, !size.orderable);
            tog.classList.toggle('is-on', size.orderable);
            tog.setAttribute('aria-pressed', size.orderable ? 'true' : 'false');
            flash(tog, 'saved');
          } catch (err) {
            toast(errorText(err), 'err');
          } finally {
            tog.disabled = false;
          }
          return;
        }
        const add = e.target.closest('[data-add]');
        if (!add) return;
        add.disabled = true;
        try {
          const p = products.find((x) => x.id === add.dataset.add);
          // the new size takes its place in the product's own order; the sizes after it move one step
          const order = placeLabel(p.sizes.map((s) => s.label), add.dataset.label, systemOf(p));
          const s = await data.addSize(p.id, { label: add.dataset.label, stock: 0, orderable: true, sort: order.indexOf(add.dataset.label) });
          p.sizes.push(s);
          const sorts = order.map((label, sort) => ({ label, sort }));
          const moved = p.sizes.filter((z) => z.id !== s.id).map((z) => ({ id: z.id, sort: sorts.find((x) => x.label === z.label).sort }));
          await data.setSizeSorts(moved);
          p.sizes.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
          render();
        } catch (err) {
          toast(errorText(err), 'err');
          add.disabled = false;
        }
      });

      // select the whole number when a cell gets focus, so typing replaces it
      result.addEventListener('focusin', (e) => { if (e.target.matches('input[data-size]')) e.target.select(); });
      render();
      return () => onSearch.cancel();
    },
  };
}
