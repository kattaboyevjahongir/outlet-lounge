// Overview: what needs attention right now, and how the last 30 days went.
import { html } from '../dom.js';
import { t } from '../i18n.js';
import { chartBars } from '../logic.js';
import { money, statusBadge, relTime } from '../ui.js';

const salesChart = (daily) => {
  const bars = chartBars(daily, 100);
  const w = 12;
  const gap = 4;
  return html`<svg class="chart" viewBox="0 0 ${bars.length * (w + gap)} 110" preserveAspectRatio="none" role="img" aria-label="${t('dash.chart')}">
    ${bars.map((b, i) => html`<g><title>${t('dash.chartDay', { day: b.day, orders: b.orders, sum: money(b.revenue) })}</title>
      <rect x="${i * (w + gap)}" y="${105 - b.h}" width="${w}" height="${b.h}" rx="3" class="bar ${b.revenue ? '' : 'bar-zero'}"/></g>`)}
  </svg>`;
};

export default async function page({ data, me, go }) {
  const [ov, latest] = await Promise.all([data.overview(), data.listOrders({ page: 1, pageSize: 8 })]);
  const by = ov.by_status || {};
  const lowProducts = new Map();
  (ov.low_stock || []).forEach((r) => {
    const e = lowProducts.get(r.product_id) || { id: r.product_id, name: r.name, sizes: [] };
    e.sizes.push({ eu: Number(r.eu), stock: r.stock });
    lowProducts.set(r.product_id, e);
  });
  const low = [...lowProducts.values()].slice(0, 8);
  const daily = ov.daily || [];
  const monthRevenue = daily.reduce((n, d) => n + Number(d.revenue || 0), 0);
  const top = ov.top_products || [];

  const kpi = (href, label, value, hint, tone = '') => html`
    <a class="kpi ${tone}" href="${href}"><span class="kpi-label">${label}</span>
      <b class="kpi-value">${value}</b><small>${hint}</small></a>`;

  const body = html`
    <div class="page-head"><div><h1>${t('dash.title')}</h1><p class="muted">${t('dash.hello', { name: me.name })}</p></div></div>

    <section class="kpis" aria-label="${t('dash.title')}">
      ${kpi('/admin/orders?status=new', t('dash.newOrders'), by.new || 0, t('dash.newHint'), (by.new || 0) > 0 ? 'is-hot' : '')}
      ${kpi('/admin/orders?range=today', t('dash.today'), ov.today_orders, `${t('dash.todayHint')} · ${money(ov.today_revenue)}`)}
      ${kpi('/admin/orders?range=7d', t('dash.week'), money(ov.week_revenue), `${ov.week_orders} ${t('dash.weekHint')}`)}
      ${kpi('/admin/stock?low=1', t('dash.lowStock'), (ov.low_stock || []).length, t('dash.lowHint'), (ov.low_stock || []).length ? 'is-warn' : '')}
    </section>

    ${daily.length ? html`<section class="card chart-card">
      <div class="card-head"><h2>${t('dash.chart')}</h2><b>${money(monthRevenue)}</b></div>
      ${salesChart(daily)}
      <div class="chart-axis"><small>${daily[0].day.slice(5)}</small><small>${daily[daily.length - 1].day.slice(5)}</small></div>
    </section>` : ''}

    <div class="cols">
      <section class="card">
        <div class="card-head"><h2>${t('dash.latest')}</h2><a class="link" href="/admin/orders">${t('dash.viewAll')}</a></div>
        ${latest.rows.length ? html`<ul class="list">${latest.rows.map((o) => html`
          <li><a class="row-link" href="/admin/orders/${o.number}">
            <span class="row-main"><b>${o.number}</b><small>${o.customer_name} · ${relTime(o.created_at)}</small></span>
            <span class="row-side"><b>${money(o.total)}</b>${statusBadge(o.status)}</span>
          </a></li>`)}</ul>` : html`<p class="muted pad">${t('dash.noOrders')}</p>`}
      </section>

      <div class="col">
        <section class="card">
          <div class="card-head"><h2>${t('dash.top')}</h2></div>
          ${top.length ? html`<ol class="top-list">${top.map((p, i) => html`
            <li><span class="rank">${i + 1}</span><span class="top-name">${p.name}</span><b>${t('dash.pcs', { n: p.qty })}</b></li>`)}</ol>`
            : html`<p class="muted pad">${t('dash.topEmpty')}</p>`}
        </section>

        <section class="card">
          <div class="card-head"><h2>${t('dash.lowTitle')}</h2><a class="link" href="/admin/stock?low=1">${t('dash.manage')}</a></div>
          ${low.length ? html`<ul class="list">${low.map((p) => html`
            <li><a class="row-link" href="/admin/products/${p.id}">
              <span class="row-main"><b>${p.name}</b></span>
              <span class="row-side chips">${p.sizes.map((s) => html`<span class="chip ${s.stock === 0 ? 'is-zero' : 'is-one'}">EU ${s.eu} · ${s.stock === 0 ? t('dash.soldOut') : t('dash.left', { n: s.stock })}</span>`)}</span>
            </a></li>`)}</ul>` : html`<p class="muted pad">${t('dash.lowEmpty')}</p>`}
        </section>
      </div>
    </div>`;

  // refresh when a new order arrives while the page is open
  const onOverview = (e) => { if (e.detail.grew) go(location.pathname + location.search); };
  return {
    title: t('dash.title'),
    body,
    mount() {
      window.addEventListener('admin:overview', onOverview);
      return () => window.removeEventListener('admin:overview', onOverview);
    },
  };
}
