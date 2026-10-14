// One order: items, customer, delivery, history, notes and the status buttons.
import { html, $, $$ } from '../dom.js';
import { t } from '../i18n.js';
import { nextStatuses, isFinal, courierText } from '../logic.js';
import {
  ICON, money, statusBadge, dateTimeFull, phoneView, telHref, tgHref, photo, toast, errorText, confirmDialog,
} from '../ui.js';

const who = (actor) => {
  if (!actor || actor === 'system') return t('common.system');
  if (actor.startsWith('telegram:')) return `Telegram · ${actor.slice(9)}`;
  return actor;
};

export default async function page({ data, params, go, requestOverview }) {
  const o = await data.getOrder(params.number);
  if (!o) {
    return {
      title: t('order.title', { no: params.number }),
      body: html`<div class="empty-state"><p>${t('order.notFound')}</p><a class="btn btn-ghost" href="/admin/orders">${t('common.back')}</a></div>`,
    };
  }

  const place = [o.region, o.city, o.address].filter(Boolean).join(', ');
  const utm = Object.entries(o.utm || {}).filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => `${k.replace(/^utm_/, '')}: ${v}`).join(' · ');
  const tel = telHref(o.phone);
  const tg = tgHref(o.telegram);
  const next = nextStatuses(o.status);
  // pieces of this order that still have to be bought abroad (only while the order is open)
  const abroad = isFinal(o.status) ? 0 : o.items.filter((i) => i.fulfilment === 'order').reduce((n, i) => n + i.qty, 0);

  const statusButtons = next.length ? html`<div class="status-actions">${next.map((s) => html`
      <button type="button" class="btn ${s === 'cancelled' ? 'btn-danger-ghost' : s === 'no_answer' ? 'btn-ghost' : 'btn-gold'}" data-status="${s}">${t(`status.${s}`)}</button>`)}</div>`
    : html`<p class="muted">${t('order.final')}</p>`;

  const body = html`
    <div class="page-head">
      <div class="head-main">
        <a class="back" href="/admin/orders">${ICON.left}<span>${t('nav.orders')}</span></a>
        <h1>${o.number}</h1>
        <p class="muted">${t('order.created')} ${dateTimeFull(o.created_at)}</p>
      </div>
      <div class="head-badge">${statusBadge(o.status)}</div>
    </div>

    <div class="cols cols-order">
      <div class="col">
        <section class="card">
          <h2>${t('order.changeStatus')}</h2>
          ${statusButtons}
        </section>
        <section class="card">
          <h2>${t('order.items')}</h2>
          ${abroad ? html`<p class="notice">${ICON.plane}<span>${t('order.abroad', { n: abroad })}</span></p>` : ''}
          <ul class="lines">${o.items.map((i) => html`<li>
            <span class="thumb">${photo(data, i.image, 200, '')}</span>
            <span class="line-main">
              ${i.product_id ? html`<a href="/admin/products/${i.product_id}"><b>${[i.brand, i.name].filter(Boolean).join(' ')}</b></a>`
                : html`<b>${[i.brand, i.name].filter(Boolean).join(' ')}</b>`}
              <small>${i.size_label} · ${i.qty} × ${money(i.unit_price)}${i.product_id ? '' : ` · ${t('order.productGone')}`}</small>
              <small><span class="badge ful-${i.fulfilment}">${ICON.plane}${t(`order.fulfil.${i.fulfilment}`)}</span></small>
            </span>
            <b class="nowrap">${money(i.unit_price * i.qty)}</b>
          </li>`)}</ul>
          <dl class="sums">
            <div><dt>${t('order.subtotal')}</dt><dd>${money(o.subtotal)}</dd></div>
            ${o.discount > 0 ? html`<div><dt>${t('order.discount')}${o.promo_code ? ` (${o.promo_code})` : ''}</dt><dd>−${money(o.discount)}</dd></div>` : ''}
            <div><dt>${t('order.fee')}</dt><dd>${o.delivery_fee > 0 ? money(o.delivery_fee) : t('order.free')}</dd></div>
            <div class="grand"><dt>${t('order.grand')}</dt><dd>${money(o.total)}</dd></div>
          </dl>
        </section>

        <section class="card">
          <h2>${t('order.timeline')}</h2>
          <ol class="timeline">${[...o.events].reverse().map((e) => html`<li>
            <span class="dot st-${e.to_status}"></span>
            <div><b>${e.from_status === null ? t('order.placed') : t(`status.${e.to_status}`)}</b>
              <small>${who(e.actor)} · ${dateTimeFull(e.created_at)}</small>
              ${e.note && e.note !== 'Telegram' && e.from_status !== null ? html`<p>${e.note}</p>` : ''}</div>
          </li>`)}</ol>
        </section>
      </div>

      <div class="col">
        <section class="card">
          <h2>${t('order.customer')}</h2>
          <p class="big">${o.customer_name}</p>
          <p><a class="link-line" href="${tel}">${ICON.phone}<span>${phoneView(o.phone)}</span></a></p>
          ${o.telegram ? html`<p>${tg ? html`<a class="link-line" href="${tg}" target="_blank" rel="noopener">${ICON.telegram}<span>${o.telegram}</span></a>` : o.telegram}</p>` : ''}
          <p class="muted">${t('order.contact')}: ${o.contact_pref === 'telegram' ? t('order.contactTg') : t('order.contactCall')} · ${t('order.lang')}: ${(o.lang || 'ru').toUpperCase()}</p>
          <div class="btn-row">
            ${tel ? html`<a class="btn btn-ghost btn-sm" href="${tel}">${ICON.phone}<span>${t('order.call')}</span></a>` : ''}
            ${tg ? html`<a class="btn btn-ghost btn-sm" href="${tg}" target="_blank" rel="noopener">${ICON.telegram}<span>${t('order.telegram')}</span></a>` : ''}
          </div>
        </section>

        <section class="card">
          <h2>${t('order.delivery')}</h2>
          <p class="big">${t(`delivery.${o.delivery_method}`)}</p>
          ${place ? html`<p>${place}</p>` : ''}
          ${o.landmark ? html`<p class="muted">${o.landmark}</p>` : ''}
          <p class="muted">${t('order.payment')}: ${t(`payment.${o.payment_method}`)}</p>
          ${o.comment ? html`<div class="note-box"><small>${t('order.comment')}</small><p>${o.comment}</p></div>` : ''}
          ${utm ? html`<p class="muted">${t('order.source')}: ${utm}</p>` : ''}
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" data-act="courier">${ICON.copy}<span>${t('order.courier')}</span></button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="print">${ICON.print}<span>${t('common.print')}</span></button>
          </div>
        </section>

        <section class="card">
          <h2>${t('order.note')}</h2>
          <form id="metaForm" class="stack" novalidate>
            <label class="field"><span>${t('order.tracking')}</span><input name="tracking_no" value="${o.tracking_no || ''}" maxlength="80" autocomplete="off"></label>
            <label class="field"><span class="sr-only">${t('order.note')}</span>
              <textarea name="staff_note" rows="3" maxlength="1000" placeholder="${t('order.notePlaceholder')}">${o.staff_note || ''}</textarea></label>
            <button class="btn btn-ghost btn-sm" type="submit">${t('order.saveNote')}</button>
          </form>
        </section>
      </div>
    </div>`;

  const refresh = () => go(location.pathname, { force: true });

  return {
    title: t('order.title', { no: o.number }),
    body,
    mount(root) {
      const changeStatus = async (status, btn) => {
        if (status === 'cancelled') {
          const ok = await confirmDialog({
            title: t('order.cancelTitle', { no: o.number }), text: t('order.cancelText'), ok: t('order.cancelYes'), danger: true,
          });
          if (!ok) return;
        }
        $$('[data-status]', root).forEach((b) => { b.disabled = true; });
        try {
          const r = await data.setOrderStatus(o.id, status);
          toast(t('order.statusDone', { status: t(`status.${status}`) }));
          if (r && r.telegram === 'failed') toast(t('order.tgFailed'), 'err');
          requestOverview();
          await refresh();
        } catch (e) {
          if (e.code === 'order_cancelled') { toast(t('order.final'), 'err'); await refresh(); return; }
          toast(errorText(e), 'err');
          $$('[data-status]', root).forEach((b) => { b.disabled = false; });
        }
      };

      root.addEventListener('click', async (e) => {
        const s = e.target.closest('[data-status]');
        if (s) return changeStatus(s.dataset.status, s);
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'print') window.print();
        if (act.dataset.act === 'courier') {
          const L = {};
          ['order', 'customer', 'delivery', 'landmark', 'total', 'comment'].forEach((k) => { L[k] = t(`order.courierLabels.${k}`); });
          const text = courierText(o, { ...L, onOrder: t('order.fulfil.order'), deliveryName: t(`delivery.${o.delivery_method}`), paymentName: t(`payment.${o.payment_method}`) });
          try {
            await navigator.clipboard.writeText(text);
            toast(t('common.copied'));
          } catch {
            window.prompt(t('order.courier'), text); // clipboard blocked: let the person copy by hand
          }
        }
      });

      $('#metaForm', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        try {
          await data.saveOrderMeta(o.id, { staff_note: form.staff_note.value.trim(), tracking_no: form.tracking_no.value.trim() });
          toast(t('order.noteSaved'));
        } catch (err) {
          toast(errorText(err), 'err');
        }
      });
    },
  };
}
