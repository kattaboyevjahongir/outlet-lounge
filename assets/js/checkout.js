/* Cart page (/cart), checkout (/checkout) and the thank-you page (/order/success) */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);
  const esc = OL.esc;
  const O = OL.orderLogic;

  const KEY = { promo: 'ol:promo', last: 'ol:last-order', draft: 'ol:draft', utm: 'ol:utm' };
  const ss = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* noop */ } },
  };

  // remember campaign tags from the first page of the visit (they ride along on the order)
  (() => {
    try {
      const q = new URLSearchParams(location.search);
      const found = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'].forEach((k) => { if (q.get(k)) found[k] = q.get(k).slice(0, 80); });
      if (Object.keys(found).length && !ss.get(KEY.utm)) ss.set(KEY.utm, found);
    } catch (e) { /* noop */ }
  })();

  const delivery = () => (OL.SETTINGS && OL.SETTINGS.delivery) || { methods: [], free_threshold: 0 };
  const methods = () => (delivery().methods || []).filter((m) => m.id !== 'pickup' || delivery().pickup_address);
  const methodLabel = (id) => {
    const v = t('pd.methods.' + id);
    return v.startsWith('pd.methods') ? id : v;
  };
  const cartLines = () => OL.cartLines();

  /* ------------------------------------------------------------ quote */
  let seq = 0;
  OL.quoteCart = async ({ promo = '', method = 'courier_tashkent' } = {}) => {
    const local = () => ({ ok: true, local: true, promo_code: null, ...O.localQuote(cartLines(), OL.P, delivery(), method) });
    if (!cartLines().length) return { ok: true, subtotal: 0, discount: 0, delivery_fee: 0, total: 0, promo_code: null, lines: [] };
    if (OL.source !== 'live') return local();
    try {
      const r = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: O.cartItems(cartLines()), promo_code: promo || null, delivery_method: method }),
      });
      if (r.status === 503 || r.status === 404) return local();
      return await r.json();
    } catch (e) {
      return local();
    }
  };

  const progressHTML = (amount) => {
    if (OL.orderFree()) return `<div class="free-bar is-free"><p>${t('ful.cartFree')}</p></div>`;
    const p = O.freeProgress(amount, delivery().free_threshold);
    if (!p.enabled) return '';
    return `<div class="free-bar${p.free ? ' is-free' : ''}">
      <p>${p.free ? t('cp.freeDone') : t('cp.freeFrom', { n: OL.price(p.left) })}</p>
      <div><i data-w="${p.pct}"></i></div></div>`;
  };

  const lineName = (slug) => (OL.P[slug] ? OL.P[slug].name : slug);

  /* ============================================================ CART PAGE */
  const cartRow = (i, k) => {
    const p = OL.P[i.id];
    return `<article class="cp-row" data-key="${k}" data-id="${esc(p.id)}">
      <a class="cp-img" href="${OL.productUrl(p)}"><img src="${OL.pimg(p.images[0], 240, 300)}" alt="${esc(p.name)}"></a>
      <div class="cp-main">
        <small>${esc(p.brand)}</small>
        <h3><a href="${OL.productUrl(p)}">${esc(p.name)}</a></h3>
        <div class="cp-controls">
          <label class="cp-size"><span>${t('cp.size')}</span>
            ${OL.sizeSelect(p, i.size)}
          </label>
          <div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><span>${i.qty}</span><button type="button" data-qty="1" aria-label="+">+</button></div>
        </div>
        ${OL.lineBadge(p, i.size, i.qty)}
        <p class="cp-warn" hidden></p>
      </div>
      <div class="cp-end">
        <b>${OL.price(p.price * i.qty)}</b>
        <button type="button" class="ci-remove" data-remove-line>${t('cp.remove')}</button>
      </div>
    </article>`;
  };

  const emptyCart = () => `<div class="shop-empty">
      ${OL.ICON.heart}
      <h3>${t('cp.empty')}</h3><p>${t('cp.emptyText')}</p>
      <a class="btn btn-gold" href="/shop"><span>${t('cp.browse')}</span>${OL.ICON.arrow}</a></div>`;

  OL.pages.cart = {
    meta: () => ({ title: t('cp.title'), path: '/cart', robots: 'noindex' }),

    render() {
      const items = cartLines();
      const count = items.reduce((n, i) => n + i.qty, 0);
      return `
      <section class="shop cartpage">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${t('crumbs.home')}</a><i>/</i><span>${t('cp.title')}</span></nav>
          <header class="shop-head">
            <h1 class="shop-title">${t('cp.title')}</h1>
            <p class="shop-count" id="cpCount">${count ? t('cp.items', { n: count }) : ''}</p>
          </header>
          ${items.length ? `
          <div class="cp-layout">
            <div class="cp-list" id="cpList">${items.map(cartRow).join('')}</div>
            <aside class="cp-summary" id="cpSummary">
              <h2>${t('ck.summary')}</h2>
              ${OL.abroadCount() ? `<p class="cf-abroad">${OL.ICON.plane}<span>${t('ck.abroad', { n: OL.abroadCount(), days: OL.abroadDays() })}</span></p>` : ''}
              <div class="sum-row"><span>${t('cp.subtotal')}</span><b data-sum="subtotal">…</b></div>
              <div class="sum-row sum-discount" hidden><span>${t('cp.discount')}</span><b data-sum="discount"></b></div>
              <div class="sum-row"><span>${t('cp.delivery')}</span><em>${t('cp.deliveryNote')}</em></div>
              <div class="sum-total"><span>${t('cp.total')}</span><b data-sum="total">…</b></div>
              <div id="cpFree"></div>
              <form class="promo" id="cpPromo" novalidate>
                <label for="promoInput">${t('cp.promo')}</label>
                <div class="promo-row">
                  <input id="promoInput" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${t('cp.promoPh')}" maxlength="32">
                  <button type="submit" class="btn btn-ghost"><span>${t('cp.apply')}</span></button>
                </div>
                <p class="promo-msg" id="promoMsg" aria-live="polite"></p>
              </form>
              <a class="btn btn-gold cp-go" href="/checkout"><span>${t('cp.checkout')}</span>${OL.ICON.arrow}</a>
              <a class="cp-continue" href="/shop">${t('cp.continue')}</a>
            </aside>
          </div>` : emptyCart()}
        </div>
      </section>`;
    },

    bind(root) {
      const page = root.querySelector('.cartpage');
      if (!page.querySelector('#cpList')) return {};
      const $ = (s) => page.querySelector(s);
      let promo = ss.get(KEY.promo) || '';
      let promoState = ''; // '', 'ok', 'bad'

      const paintTotals = (q) => {
        const dis = q.discount > 0;
        $('[data-sum="subtotal"]').textContent = OL.price(q.subtotal);
        page.querySelector('.sum-discount').hidden = !dis;
        $('[data-sum="discount"]').textContent = dis ? `−${OL.price(q.discount)}` : '';
        $('[data-sum="total"]').textContent = OL.price(q.subtotal - q.discount);
        $('#cpFree').innerHTML = progressHTML(q.subtotal - q.discount);
      };
      const paintPromo = () => {
        const msg = $('#promoMsg');
        const input = $('#promoInput');
        input.value = promo;
        if (promoState === 'ok') msg.innerHTML = `<span class="ok">${t('cp.applied', { code: esc(promo) })}</span> <button type="button" data-promo-remove>${t('cp.removePromo')}</button>`;
        else if (promoState === 'bad') msg.innerHTML = `<span class="bad">${t('cp.promoBad')}</span>`;
        else msg.textContent = '';
      };
      const warnLines = (q) => {
        page.querySelectorAll('.cp-warn').forEach((w) => { w.hidden = true; });
        if (q.ok || !q.slug) return;
        page.querySelectorAll('.cp-row').forEach((row) => {
          if (row.dataset.id !== q.slug) return;
          const w = row.querySelector('.cp-warn');
          w.textContent = t('cp.gone', { name: lineName(q.slug), size: q.size || '' });
          w.hidden = false;
        });
      };

      const refresh = async () => {
        const mine = ++seq;
        let q = await OL.quoteCart({ promo });
        if (mine !== seq) return;
        promoState = promo ? 'ok' : '';
        if (!q.ok && q.error === 'promo') {
          promoState = 'bad';
          ss.del(KEY.promo); // never carry a rejected code to checkout
          q = await OL.quoteCart({ promo: '' });
          if (mine !== seq) return;
        } else if (q.ok && promo && !q.promo_code && !q.discount) {
          promoState = 'bad';
          ss.del(KEY.promo);
        }
        if (!q.ok) {
          warnLines(q);
          q = { ...O.localQuote(cartLines(), OL.P, delivery(), 'courier_tashkent') };
        } else {
          warnLines({ ok: true });
        }
        paintTotals(q);
        paintPromo();
      };

      const redraw = () => {
        const items = cartLines();
        if (!items.length) { OL.refreshRoute(); return; }
        $('#cpList').innerHTML = items.map(cartRow).join('');
        $('#cpCount').textContent = t('cp.items', { n: items.reduce((n, i) => n + i.qty, 0) });
        OL.renderCart();
        refresh();
      };
      const persist = () => { OL.saveCart(); OL.renderCart(); };

      page.addEventListener('click', (e) => {
        const row = e.target.closest('.cp-row');
        if (row) {
          const k = Number(row.dataset.key);
          const line = cartLines()[k];
          const q = e.target.closest('[data-qty]');
          if (q && line) {
            line.qty = Math.max(1, Math.min(10, line.qty + Number(q.dataset.qty)));
            persist(); redraw();
          } else if (e.target.closest('[data-remove-line]') && line) {
            OL.state.cart.splice(OL.state.cart.indexOf(line), 1);
            persist(); redraw();
          }
          return;
        }
        if (e.target.closest('[data-promo-remove]')) {
          promo = ''; ss.del(KEY.promo); refresh();
        }
      });
      page.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-size-select]');
        if (!sel) return;
        const line = cartLines()[Number(sel.closest('.cp-row').dataset.key)];
        if (!line) return;
        OL.setCartSize(line, sel.value);
        persist(); redraw();
      });
      $('#cpPromo').addEventListener('submit', (e) => {
        e.preventDefault();
        promo = $('#promoInput').value.trim().toUpperCase();
        if (promo) ss.set(KEY.promo, promo); else ss.del(KEY.promo);
        refresh();
      });

      $('#promoInput').value = promo;
      refresh();
      return {};
    },
  };

  /* ============================================================ CHECKOUT */
  const FIELD_ORDER = ['name', 'phone', 'telegram', 'region', 'address', 'consent'];

  const radio = (name, value, label, checked, extra = '') =>
    `<label class="rd"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span class="rd-dot"></span><span class="rd-label">${label}</span>${extra}</label>`;

  OL.pages.checkout = {
    meta: () => ({ title: t('ck.title'), path: '/checkout', robots: 'noindex' }),

    render() {
      if (!cartLines().length) {
        return `<section class="shop"><div class="container">
          <nav class="crumbs"><a href="/">${t('crumbs.home')}</a><i>/</i><span>${t('ck.title')}</span></nav>
          ${emptyCart()}</div></section>`;
      }
      const d = ss.get(KEY.draft) || {};
      const ms = methods();
      const method = ms.some((m) => m.id === d.method) ? d.method : (ms[0] && ms[0].id) || 'courier_tashkent';
      const regionsRu = OL.I18N.ru.ck.regions;
      const regionsT = t('ck.regions');
      const tashkentRu = regionsRu[0];
      const needsAddress = !O.NO_ADDRESS.includes(method);
      const items = cartLines();
      return `
      <section class="shop checkout">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${t('crumbs.home')}</a><i>/</i><a href="/cart">${t('cp.title')}</a><i>/</i><span>${t('ck.title')}</span></nav>
          <header class="shop-head"><h1 class="shop-title">${t('ck.title')}</h1></header>

          <form class="ck-layout" id="ckForm" novalidate autocomplete="on">
            <div class="ck-fields">
              <div class="ck-error" id="ckBanner" role="alert" hidden></div>

              <fieldset class="ck-card">
                <legend>01 · ${t('ck.contact')}</legend>
                <div class="ck-grid">
                  <label class="fld"><span>${t('ck.name')}</span><input name="name" autocomplete="name" value="${esc(d.name || '')}" maxlength="80"><em class="fld-err"></em></label>
                  <label class="fld"><span>${t('ck.phone')}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" value="${esc(d.phone || '')}"><em class="fld-err"></em></label>
                  <label class="fld"><span>${t('ck.telegram')}</span><input name="telegram" autocomplete="off" placeholder="@username" value="${esc(d.telegram || '')}" maxlength="40"><em class="fld-err"></em></label>
                </div>
                <div class="rd-group" id="prefGroup">
                  <p class="rd-title">${t('ck.pref')}</p>
                  ${radio('contact_pref', 'call', t('ck.prefCall'), d.contact_pref !== 'telegram')}
                  ${radio('contact_pref', 'telegram', t('ck.prefTg'), d.contact_pref === 'telegram')}
                </div>
              </fieldset>

              <fieldset class="ck-card">
                <legend>02 · ${t('ck.delivery')}</legend>
                <div class="rd-group rd-cards" id="methodGroup">
                  ${ms.map((m) => radio('method', m.id, methodLabel(m.id), m.id === method,
    `<b class="rd-fee">${m.fee ? OL.price(m.fee) : t('cp.free')}</b>`)).join('')}
                </div>
                <div id="addressBox" ${needsAddress ? '' : 'hidden'}>
                  <div class="ck-grid">
                    <label class="fld" id="regionFld" ${method === 'courier_tashkent' ? 'hidden' : ''}><span>${t('ck.region')}</span>
                      <select name="region"><option value="">${t('ck.regionPick')}</option>
                        ${regionsRu.map((v, i) => `<option value="${esc(v)}" ${d.region === v ? 'selected' : ''}>${esc(regionsT[i])}</option>`).join('')}
                      </select><em class="fld-err"></em></label>
                    <label class="fld"><span>${t('ck.city')}</span><input name="city" autocomplete="address-level2" value="${esc(d.city || '')}" maxlength="80"><em class="fld-err"></em></label>
                    <label class="fld fld-wide"><span>${t('ck.address')}</span><input name="address" autocomplete="street-address" value="${esc(d.address || '')}" maxlength="200"><em class="fld-err"></em></label>
                    <label class="fld fld-wide"><span>${t('ck.landmark')}</span><input name="landmark" value="${esc(d.landmark || '')}" maxlength="120"><em class="fld-err"></em></label>
                  </div>
                </div>
                <p class="ck-note" id="pickupNote" ${method === 'pickup' ? '' : 'hidden'}>${t('ck.pickupNote')}</p>
                <input type="hidden" id="tashkentValue" value="${esc(tashkentRu)}">
              </fieldset>

              <fieldset class="ck-card">
                <legend>03 · ${t('ck.payment')}</legend>
                <div class="rd-group">
                  ${['cash', 'card_on_delivery', 'transfer'].map((p, i) => radio('payment', p, t('ck.pay.' + p), (d.payment || 'cash') === p)).join('')}
                </div>
              </fieldset>

              <fieldset class="ck-card">
                <legend>04 · ${t('ck.comment')}</legend>
                <label class="fld fld-wide"><textarea name="comment" rows="3" maxlength="500" placeholder="${t('ck.commentPh')}">${esc(d.comment || '')}</textarea></label>
                <label class="ck-consent"><input type="checkbox" name="consent"><span class="fc-box"></span><span>${t('ck.consent')}</span></label>
                <em class="fld-err" id="consentErr"></em>
              </fieldset>

              <!-- honeypot: real visitors never see or fill this -->
              <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
            </div>

            <aside class="cp-summary ck-summary">
              <h2>${t('ck.summary')}</h2>
              <ul class="ck-items">
                ${items.map((i) => {
    const p = OL.P[i.id];
    return `<li><img src="${OL.pimg(p.images[0], 120, 150)}" alt=""><span><b>${esc(p.name)}</b><small>${esc(i.size)} × ${i.qty}</small>${OL.lineBadge(p, i.size, i.qty)}</span><em>${OL.price(p.price * i.qty)}</em></li>`;
  }).join('')}
              </ul>
              ${OL.abroadCount() ? `<p class="cf-abroad">${OL.ICON.plane}<span>${t('ck.abroad', { n: OL.abroadCount(), days: OL.abroadDays() })}</span></p>` : ''}
              <div class="sum-row"><span>${t('cp.subtotal')}</span><b data-sum="subtotal">…</b></div>
              <div class="sum-row sum-discount" hidden><span>${t('cp.discount')}</span><b data-sum="discount"></b></div>
              <div class="sum-row"><span>${t('cp.delivery')}</span><b data-sum="fee">…</b></div>
              <div class="sum-total"><span>${t('cp.total')}</span><b data-sum="total">…</b></div>
              <div id="ckFree"></div>
              <div class="promo">
                <label for="ckPromo">${t('cp.promo')}</label>
                <div class="promo-row">
                  <input id="ckPromo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${t('cp.promoPh')}" maxlength="32">
                  <button type="button" class="btn btn-ghost" data-promo-apply><span>${t('cp.apply')}</span></button>
                </div>
                <p class="promo-msg" id="ckPromoMsg" aria-live="polite"></p>
              </div>
              <button type="submit" class="btn btn-gold ck-submit" id="ckSubmit"><span>${t('ck.place')}</span>${OL.ICON.arrow}</button>
            </aside>
          </form>
        </div>
      </section>`;
    },

    bind(root) {
      const form = root.querySelector('#ckForm');
      if (!form) return {};
      const $ = (s) => form.querySelector(s);
      const startedAt = Date.now();
      if (OL.track) {
        const lines = cartLines();
        OL.track('begin_checkout', { currency: 'UZS', value: lines.reduce((n, i) => n + OL.P[i.id].price * i.qty, 0), items: lines.map((i) => OL.itemOf(OL.P[i.id], { quantity: i.qty })) });
      }
      let promo = ss.get(KEY.promo) || '';
      let promoState = '';
      let sending = false;
      const tashkent = $('#tashkentValue').value;

      const val = (name) => (form.elements[name] ? form.elements[name].value : '');
      const method = () => (form.querySelector('input[name="method"]:checked') || {}).value || 'courier_tashkent';
      const needsAddress = () => !O.NO_ADDRESS.includes(method());

      /* ---- draft (survives a refresh within the visit) ---- */
      const saveDraft = () => ss.set(KEY.draft, {
        name: val('name'), phone: val('phone'), telegram: val('telegram'), contact_pref: val('contact_pref'),
        method: method(), region: val('region'), city: val('city'), address: val('address'), landmark: val('landmark'),
        payment: val('payment'), comment: val('comment'),
      });

      /* ---- totals ---- */
      const paintTotals = (q) => {
        const dis = q.discount > 0;
        $('[data-sum="subtotal"]').textContent = OL.price(q.subtotal);
        form.querySelector('.sum-discount').hidden = !dis;
        $('[data-sum="discount"]').textContent = dis ? `−${OL.price(q.discount)}` : '';
        $('[data-sum="fee"]').textContent = q.delivery_fee > 0 ? OL.price(q.delivery_fee) : t('cp.free');
        $('[data-sum="total"]').textContent = OL.price(q.total);
        $('#ckFree').innerHTML = progressHTML(q.subtotal - q.discount);
      };
      const paintPromo = () => {
        const msg = $('#ckPromoMsg');
        $('#ckPromo').value = promo;
        if (promoState === 'ok') msg.innerHTML = `<span class="ok">${t('cp.applied', { code: esc(promo) })}</span> <button type="button" data-promo-remove>${t('cp.removePromo')}</button>`;
        else if (promoState === 'bad') msg.innerHTML = `<span class="bad">${t('cp.promoBad')}</span>`;
        else msg.textContent = '';
      };
      const refresh = async () => {
        const mine = ++seq;
        const m = method();
        let q = await OL.quoteCart({ promo, method: m });
        if (mine !== seq) return;
        promoState = promo ? 'ok' : '';
        if (!q.ok && q.error === 'promo') {
          promoState = 'bad';
          ss.del(KEY.promo);
          q = await OL.quoteCart({ promo: '', method: m });
          if (mine !== seq) return;
        } else if (q.ok && promo && !q.promo_code && !q.discount) {
          promoState = 'bad';
          ss.del(KEY.promo);
        }
        if (!q.ok) q = { ...O.localQuote(cartLines(), OL.P, delivery(), m) };
        paintTotals(q);
        paintPromo();
      };

      /* ---- layout reacts to the delivery method ---- */
      const applyMethod = () => {
        const m = method();
        $('#addressBox').hidden = !needsAddress();
        $('#regionFld').hidden = m === 'courier_tashkent';
        $('#pickupNote').hidden = m !== 'pickup';
      };

      /* ---- validation ---- */
      const setErr = (name, key) => {
        const input = form.elements[name];
        if (!input) return;
        const holder = input.closest('.fld') || input.closest('.ck-card');
        holder.classList.toggle('has-error', !!key);
        const em = name === 'consent' ? $('#consentErr') : holder.querySelector('.fld-err');
        if (em) em.textContent = key ? t('err.' + key) : '';
      };
      const collect = () => ({
        name: val('name'), phone: val('phone'), telegram: val('telegram'),
        region: method() === 'courier_tashkent' ? tashkent : val('region'),
        address: val('address'), consent: form.elements.consent.checked,
      });
      const check = () => {
        const errors = O.validate(collect(), { needsAddress: needsAddress(), requireConsent: true });
        ['name', 'phone', 'telegram', 'region', 'address', 'consent'].forEach((f) => setErr(f, errors[f]));
        return errors;
      };
      const banner = (text) => {
        const b = $('#ckBanner');
        const tg = OL.orderLogic.tgLink(OL.contacts().telegram);
        b.hidden = !text;
        b.textContent = text || '';
        if (text && tg) {
          const a = document.createElement('a');
          a.href = tg; a.target = '_blank'; a.rel = 'noopener';
          a.className = 'ck-banner-tg';
          a.textContent = t('err.viaTg');
          b.append(a);
        }
        if (text) b.scrollIntoView({ block: 'center', behavior: OL.reduced ? 'auto' : 'smooth' });
      };

      /* ---- events ---- */
      form.addEventListener('input', (e) => {
        const el = e.target;
        if (el.name === 'phone') {
          const wasDelete = e.inputType && e.inputType.startsWith('delete');
          el.value = wasDelete && !O.phoneDigits(el.value) ? '' : O.formatPhone(el.value);
        }
        if (el.closest('.has-error')) check();
        saveDraft();
      });
      form.addEventListener('change', (e) => {
        if (e.target.name === 'method') { applyMethod(); refresh(); }
        saveDraft();
      });
      form.addEventListener('click', (e) => {
        if (e.target.closest('[data-promo-apply]')) {
          promo = $('#ckPromo').value.trim().toUpperCase();
          if (promo) ss.set(KEY.promo, promo); else ss.del(KEY.promo);
          refresh();
        } else if (e.target.closest('[data-promo-remove]')) {
          promo = ''; ss.del(KEY.promo); refresh();
        }
      });
      $('#ckPromo').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); form.querySelector('[data-promo-apply]').click(); }
      });

      const failWith = (r, data) => {
        if (r === 'network') return banner(t('err.network'));
        if (r.status === 429) return banner(t('err.tooMany'));
        if (r.status === 503) return banner(t('err.down'));
        if (data && data.error === 'out_of_stock') return banner(t('err.stock', { name: lineName(data.slug), size: data.size || '' }));
        if (data && data.error === 'unavailable') return banner(t('err.gone', { name: lineName(data.slug) }));
        if (data && data.error === 'invalid') {
          if (data.field === 'promo') { promo = ''; ss.del(KEY.promo); refresh(); return banner(t('err.promo')); }
          const map = { name: 'name', phone: 'phone', telegram: 'telegram', region: 'region', address: 'address' };
          if (map[data.field]) { setErr(map[data.field], map[data.field]); const el = form.elements[data.field]; if (el) el.focus(); return null; }
        }
        return banner(t('err.generic'));
      };

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (sending) return;
        banner('');
        const errors = check();
        const first = FIELD_ORDER.find((f) => errors[f]);
        if (first) {
          const el = form.elements[first];
          (el.closest('.fld') || el.closest('.ck-card')).scrollIntoView({ block: 'center', behavior: OL.reduced ? 'auto' : 'smooth' });
          if (first !== 'consent') el.focus({ preventScroll: true });
          return;
        }

        const items = O.cartItems(cartLines());
        const m = method();
        const payload = {
          type: 'order',
          website: val('website'),
          elapsed: Date.now() - startedAt,
          lang: OL.state.lang,
          customer: { name: val('name'), phone: O.toE164(val('phone')), telegram: val('telegram') || null, contact_pref: val('contact_pref') || 'call' },
          delivery: needsAddress()
            ? { method: m, region: m === 'courier_tashkent' ? tashkent : val('region'), city: val('city'), address: val('address'), landmark: val('landmark') }
            : { method: m },
          payment: val('payment') || 'cash',
          comment: val('comment') || null,
          promo_code: promo || null,
          utm: ss.get(KEY.utm),
          items,
        };

        sending = true;
        const btn = $('#ckSubmit');
        btn.classList.add('is-loading');
        btn.querySelector('span').textContent = t('ck.placing');
        let result = null;
        try {
          const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await r.json().catch(() => ({}));
          if (r.ok && data.ok) result = data;
          else failWith(r, data);
        } catch (err) {
          failWith('network');
        }
        sending = false;
        btn.classList.remove('is-loading');
        btn.querySelector('span').textContent = t('ck.place');
        if (!result) return;

        ss.set(KEY.last, {
          number: result.number, total: result.total, subtotal: result.subtotal, discount: result.discount,
          delivery_fee: result.delivery_fee, name: payload.customer.name, phone: payload.customer.phone,
          method: m, notified: result.notified,
          items: cartLines().map((i) => ({ name: OL.P[i.id].name, size: i.size, qty: i.qty, price: OL.P[i.id].price, image: OL.P[i.id].images[0],
            abroad: OL.lineState(OL.P[i.id], i.size, i.qty) === 'order', days: OL.orderDays(OL.P[i.id]) })),
        });
        if (OL.track) {
          OL.track('purchase', {
            transaction_id: result.number, currency: 'UZS', value: result.total, shipping: result.delivery_fee, coupon: promo || undefined,
            items: cartLines().map((i) => OL.itemOf(OL.P[i.id], { quantity: i.qty })),
          });
        }
        OL.state.cart = [];
        OL.saveCart();
        OL.renderCart();
        ss.del(KEY.promo);
        ss.del(KEY.draft);
        OL.navigate('/order/success');
      });

      applyMethod();
      $('#ckPromo').value = promo;
      refresh();
      return {};
    },
  };

  /* ============================================================ SUCCESS */
  OL.pages.success = {
    meta: () => ({ title: t('ok.title'), path: '/order/success', robots: 'noindex' }),

    render() {
      const o = ss.get(KEY.last);
      const contacts = OL.contacts();
      const follow = o && OL.orderLogic.tgLink(contacts.telegram_bot, o.number);
      if (!o) {
        return `<section class="shop"><div class="container ok-wrap">
          <div class="shop-empty"><h3>${t('ok.none')}</h3><p>${t('ok.noneText')}</p>
          <a class="btn btn-gold" href="/shop"><span>${t('ok.continue')}</span>${OL.ICON.arrow}</a></div></div></section>`;
      }
      return `
      <section class="shop success">
        <div class="container ok-wrap">
          <div class="ok-mark" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36"/><path d="m24 41 11 11 22-24"/></svg></div>
          <h1 class="shop-title">${t('ok.title')}</h1>
          <p class="ok-text">${t('ok.text', { min: contacts.call_minutes || 15, hours: esc(contacts.hours || '10:00–21:00') })}</p>
          <div class="ok-card">
            <div class="ok-no"><span>${t('ok.number')}</span><b>${esc(o.number)}</b></div>
            <ul class="ck-items">
              ${(o.items || []).map((i) => `<li><img src="${OL.pimg(i.image, 120, 150)}" alt=""><span><b>${esc(i.name)}</b><small>${esc(i.size)} × ${i.qty}</small>${i.abroad ? `<span class="ful is-order">${OL.ICON.plane}${t('ful.order')} · ${esc(i.days || '')} ${t('ui.daysShort')}</span>` : ''}</span><em>${OL.price(i.price * i.qty)}</em></li>`).join('')}
            </ul>
            ${o.discount > 0 ? `<div class="sum-row"><span>${t('cp.discount')}</span><b>−${OL.price(o.discount)}</b></div>` : ''}
            <div class="sum-row"><span>${t('cp.delivery')}</span><b>${o.delivery_fee > 0 ? OL.price(o.delivery_fee) : t('cp.free')}</b></div>
            <div class="sum-total"><span>${t('ok.total')}</span><b>${OL.price(o.total)}</b></div>
          </div>
          ${(o.items || []).some((i) => i.abroad) ? `<p class="cf-abroad ok-abroad">${OL.ICON.plane}<span>${t('ful.note')}</span></p>` : ''}
          <div class="ok-actions">
            ${follow ? `<a class="btn btn-ghost" href="${follow}" target="_blank" rel="noopener">${OL.ICON.tg}<span>${t('ok.follow')}</span></a>` : ''}
            <a class="btn btn-gold" href="/shop"><span>${t('ok.continue')}</span>${OL.ICON.arrow}</a>
          </div>
        </div>
      </section>`;
    },
  };
})();
