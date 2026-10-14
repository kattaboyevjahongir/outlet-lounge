// Reports (owner): numbers for a period, a daily chart, breakdown tables, Excel / CSV export.
import { html, $, $$ } from '../dom.js';
import { t, getLang } from '../i18n.js';
import { reportRange, chartBars, fmtMoney, stockState } from '../logic.js';
import { buildXlsx, toCsv } from '../export.js';
import { money, toast, errorText, deniedPage, downloadBlob, dateTimeFull } from '../ui.js';

const PRESETS = ['today', '7d', '30d', 'month', 'year'];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const chart = (daily) => {
  const bars = chartBars(daily, 110);
  // a few days → fixed-width bars (not stretched across the card); a long range → squeezed to fit
  const few = bars.length <= 40;
  const w = few ? 28 : 12;
  const gap = few ? 8 : 4;
  const width = bars.length * (w + gap);
  return html`<svg class="chart ${few ? 'chart-fixed' : ''}" viewBox="0 0 ${width} 130" width="${width}" height="150" preserveAspectRatio="none" role="img" aria-label="${t('rep.byDay')}">
    ${bars.map((b, i) => html`<g><title>${t('dash.chartDay', { day: b.day, orders: b.orders, sum: money(b.revenue) })}</title>
      <rect x="${i * (w + gap)}" y="${120 - b.h}" width="${w}" height="${b.h}" rx="3" class="bar ${b.revenue ? '' : 'bar-zero'}"/></g>`)}
  </svg>`;
};

const table = (title, cols, rows) => html`
  <section class="card">
    <h2>${title}</h2>
    ${rows.length ? html`<div class="table-wrap"><table class="table plain"><thead><tr>${cols.map((c) => html`<th class="${c.num ? 'num' : ''}">${c.label}</th>`)}</tr></thead>
      <tbody>${rows.map((r) => html`<tr>${cols.map((c) => html`<td class="${c.num ? 'num' : ''}">${c.get(r)}</td>`)}</tr>`)}</tbody></table></div>`
      : html`<p class="muted">—</p>`}
  </section>`;

export default async function page({ data, me, query }) {
  if (me.role !== 'owner') return { title: t('rep.title'), body: deniedPage() };
  const preset = PRESETS.includes(query.get('range')) ? query.get('range') : '30d';
  const { from, to } = reportRange(preset);
  const r = await data.report(from, to);
  const tt = r.totals;
  const cancelRate = tt.all_orders ? Math.round((tt.cancelled / tt.all_orders) * 100) : 0;

  const kpi = (label, value, hint = '') => html`<div class="kpi"><span class="kpi-label">${label}</span><b class="kpi-value">${value}</b><small>${hint}</small></div>`;

  const body = html`
    <div class="page-head"><h1>${t('rep.title')}</h1></div>
    <div class="chips-row" id="presets">
      ${PRESETS.map((p) => html`<a class="chip-btn ${p === preset ? 'is-on' : ''}" href="/admin/reports?range=${p}">${t(`rep.${p}`)}</a>`)}
    </div>

    <section class="kpis">
      ${kpi(t('rep.orders'), tt.orders)}
      ${kpi(t('rep.revenue'), money(tt.revenue), t('rep.note'))}
      ${kpi(t('rep.avg'), money(tt.avg_order))}
      ${kpi(t('rep.cancelled'), tt.cancelled, `${cancelRate}%`)}
    </section>

    <section class="card">
      <div class="card-head"><h2>${t('rep.byDay')}</h2><small class="muted">${t('rep.discounts')}: ${money(tt.discounts)}</small></div>
      ${r.by_day.length ? chart(r.by_day) : html`<p class="muted">${t('rep.empty')}</p>`}
    </section>

    <div class="cols">
      ${table(t('rep.byBrand'), [{ label: t('rep.col.brand'), get: (x) => x.brand }, { label: t('rep.qty'), num: true, get: (x) => x.qty }, { label: t('rep.revenue'), num: true, get: (x) => money(x.revenue) }], r.by_brand)}
      ${table(t('rep.byProduct'), [{ label: t('rep.col.product'), get: (x) => x.name }, { label: t('rep.qty'), num: true, get: (x) => x.qty }, { label: t('rep.revenue'), num: true, get: (x) => money(x.revenue) }], r.by_product)}
      ${table(t('rep.byRegion'), [{ label: t('rep.col.region'), get: (x) => (t(`delivery.${x.region}`) === `delivery.${x.region}` ? x.region : t(`delivery.${x.region}`)) }, { label: t('rep.orders'), num: true, get: (x) => x.orders }, { label: t('rep.revenue'), num: true, get: (x) => money(x.revenue) }], r.by_region)}
      ${table(t('rep.bySource'), [{ label: t('rep.bySource'), get: (x) => (x.source === 'direct' ? t('rep.direct') : x.source) }, { label: t('rep.orders'), num: true, get: (x) => x.orders }, { label: t('rep.revenue'), num: true, get: (x) => money(x.revenue) }], r.by_source)}
      ${r.promo.length ? table(t('rep.promo'), [{ label: t('promo.code'), get: (x) => x.code }, { label: t('rep.orders'), num: true, get: (x) => x.orders }, { label: t('rep.discount'), num: true, get: (x) => money(x.discount) }, { label: t('rep.revenue'), num: true, get: (x) => money(x.revenue) }], r.promo) : ''}
    </div>

    <section class="card">
      <h2>${t('rep.export')}</h2>
      <p class="muted">${t(`rep.${preset}`)}</p>
      <div class="btn-row">
        <button type="button" class="btn btn-gold" data-export="orders-xlsx">${t('rep.exportOrders')}</button>
        <button type="button" class="btn btn-ghost" data-export="orders-csv">${t('rep.exportCsv')}</button>
        <button type="button" class="btn btn-ghost" data-export="products-xlsx">${t('rep.exportProducts')}</button>
      </div>
    </section>`;

  const stamp = new Date().toISOString().slice(0, 10);
  const orderRows = async () => {
    const orders = await data.exportOrders(from, to);
    const head = ['number', 'date', 'status', 'customer', 'phone', 'telegram', 'delivery', 'region', 'address', 'payment', 'items', 'subtotal', 'discount', 'fee', 'total', 'promo', 'comment', 'tracking']
      .map((k) => t(`rep.col.${k === 'fee' ? 'fee' : k === 'items' ? 'items' : k}`));
    const rows = orders.map((o) => [
      o.number, dateTimeFull(o.created_at), t(`status.${o.status}`), o.customer_name, o.phone, o.telegram || '',
      t(`delivery.${o.delivery_method}`), o.region || '', [o.city, o.address, o.landmark].filter(Boolean).join(', '),
      t(`payment.${o.payment_method}`),
      o.items.map((i) => `${[i.brand_snapshot, i.name_snapshot].filter(Boolean).join(' ')} ${i.size_label} ×${i.qty}${i.fulfilment === 'order' ? ` (${t('order.fulfil.order')})` : ''}`).join('; '),
      o.subtotal, o.discount, o.delivery_fee, o.total, o.promo_code || '', o.comment || '', o.tracking_no || '',
    ]);
    return [head, ...rows];
  };

  return {
    title: t('rep.title'),
    body,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-export]');
        if (!b) return;
        const kind = b.dataset.export;
        const label = b.textContent;
        b.disabled = true;
        b.textContent = t('rep.exporting');
        try {
          if (kind === 'orders-xlsx') {
            downloadBlob(`orders-${stamp}.xlsx`, new Blob([buildXlsx([{ name: t('nav.orders'), rows: await orderRows() }])], { type: XLSX_MIME }));
          } else if (kind === 'orders-csv') {
            downloadBlob(`orders-${stamp}.csv`, new Blob([toCsv(await orderRows())], { type: 'text/csv;charset=utf-8' }));
          } else {
            const products = await data.listProducts();
            const categories = await data.listCategories();
            const cat = Object.fromEntries(categories.map((c) => [c.slug, c]));
            const catName = (slug) => (cat[slug] ? cat[slug][`name_${getLang()}`] || cat[slug].name_en : slug);
            const head = ['brand', 'product', 'color', 'styleCode', 'sku', 'dept', 'category', 'origin', 'price', 'oldPrice', 'stock', 'shown', 'sizes'].map((k) => t(`rep.col.${k}`));
            const rows = products.map((p) => [
              p.brand_name, p.name, p.color, p.style_code, p.sku, cat[p.category] ? t(`dept.${cat[p.category].department}`) : '', catName(p.category),
              p.origin, p.price, p.old_price || '',
              stockState(p).total, p.is_active ? t('common.yes') : t('common.no'),
              p.sizes.map((s) => `${s.label}: ${s.stock}${s.orderable ? '*' : ''}`).join(', '),
            ]);
            downloadBlob(`products-${stamp}.xlsx`, new Blob([buildXlsx([{ name: t('nav.products'), rows: [head, ...rows] }])], { type: XLSX_MIME }));
          }
        } catch (err) {
          toast(errorText(err), 'err');
        } finally {
          b.disabled = false;
          b.textContent = label;
        }
      });
    },
  };
}
