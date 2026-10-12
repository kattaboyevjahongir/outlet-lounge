// Stock grid: products × EU sizes, every number editable in place and saved on change.
import { html, $, $$, debounce } from '../dom.js';
import { t } from '../i18n.js';
import { filterProducts, CATEGORIES } from '../logic.js';
import { photo, toast, errorText } from '../ui.js';

export default async function page({ data, query }) {
  const products = await data.listProducts();
  const brands = [...new Map(products.map((p) => [p.brand_id, p.brand_name])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const f = {
    q: query.get('q') || '',
    brand: query.get('brand') || '',
    category: CATEGORIES.includes(query.get('category')) ? query.get('category') : '',
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
      <label class="field"><span class="sr-only">${t('products.category')}</span>
        <select name="category"><option value="">${t('products.category')}: ${t('common.all')}</option>
          ${CATEGORIES.map((c) => html`<option value="${c}" ${c === f.category ? 'selected' : ''}>${t(`cat.${c}`)}</option>`)}</select></label>
      <label class="switch"><input type="checkbox" name="low" ${f.low ? 'checked' : ''}><span>${t('stock.onlyLow')}</span></label>
    </form>
    <div id="stockResult"></div>`;

  const total = (p) => p.sizes.reduce((n, s) => n + s.stock, 0);

  return {
    title: t('stock.title'),
    body,
    mount(root) {
      const result = $('#stockResult', root);
      const render = () => {
        let list = filterProducts(products, { q: f.q, brand: f.brand, category: f.category });
        if (f.low) list = list.filter((p) => p.sizes.some((s) => s.stock <= 1));
        if (!list.length) {
          result.innerHTML = String(html`<div class="empty-state"><p>${t('stock.empty')}</p></div>`);
          return;
        }
        const eus = [...new Set(list.flatMap((p) => p.sizes.map((s) => s.eu)))].sort((a, b) => a - b);
        result.innerHTML = String(html`
          <div class="table-wrap grid-wrap"><table class="grid">
            <thead><tr><th class="sticky">${t('products.product')}</th>${eus.map((eu) => html`<th>${eu}</th>`)}<th>${t('stock.total')}</th></tr></thead>
            <tbody>${list.map((p) => html`<tr class="${p.is_active ? '' : 'is-hidden'}" data-id="${p.id}">
              <th class="sticky" scope="row"><a href="/admin/products/${p.id}">
                <span class="thumb sm">${photo(data, p.images[0] && p.images[0].path, 200, '')}</span>
                <span class="gname"><b>${p.name}</b><small>${p.brand_name}${p.is_active ? '' : ` · ${t('stock.hiddenProduct')}`}</small></span></a></th>
              ${eus.map((eu) => {
                const s = p.sizes.find((z) => z.eu === eu);
                return s
                  ? html`<td><input class="cell ${s.stock === 0 ? 'z0' : s.stock === 1 ? 'z1' : ''}" type="number" min="0" step="1" inputmode="numeric"
                      value="${s.stock}" data-size="${s.id}" data-prev="${s.stock}" aria-label="${p.name} EU ${eu}"></td>`
                  : html`<td><button type="button" class="cell-add" data-add="${p.id}" data-eu="${eu}" title="${t('stock.addSize', { eu })}" aria-label="${t('stock.addSize', { eu })}">—</button></td>`;
              })}
              <td class="sum" data-sum>${total(p)}</td>
            </tr>`)}</tbody>
          </table></div>`);
      };

      const form = $('#stockFilters', root);
      form.addEventListener('submit', (e) => e.preventDefault());
      const sync = () => {
        const p = new URLSearchParams();
        if (f.q) p.set('q', f.q);
        if (f.brand) p.set('brand', f.brand);
        if (f.category) p.set('category', f.category);
        if (f.low) p.set('low', '1');
        const qs = p.toString();
        history.replaceState({}, '', location.pathname + (qs ? `?${qs}` : ''));
      };
      const onSearch = debounce(() => { f.q = form.q.value.trim(); sync(); render(); }, 200);
      form.q.addEventListener('input', onSearch);
      form.brand.addEventListener('change', () => { f.brand = form.brand.value; sync(); render(); });
      form.category.addEventListener('change', () => { f.category = form.category.value; sync(); render(); });
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
        const add = e.target.closest('[data-add]');
        if (!add) return;
        add.disabled = true;
        try {
          const p = products.find((x) => x.id === add.dataset.add);
          const s = await data.addSize(p.id, { eu: Number(add.dataset.eu), stock: 0 });
          p.sizes.push(s);
          p.sizes.sort((a, b) => a.eu - b.eu);
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
