/* Product page — /product/<slug>
   Sizes are labels (M, 50, 32, 42 …). Each size is either in stock in Tashkent or can be ordered from abroad. */
(function () {
  const OL = window.OL;
  const t = (k, v) => OL.t(k, v);
  const esc = OL.esc;
  const html = document.documentElement;

  const VIEWED_KEY = 'viewed';
  const getViewed = () => OL.store.get(VIEWED_KEY, []).filter((s) => OL.P[s]);

  const description = (p) => {
    const d = p.desc && p.desc[OL.state.lang];
    return d || t('pd.descDefault', { brand: p.brand, name: p.name });
  };

  const deliveryRows = () => {
    const d = (OL.SETTINGS && OL.SETTINGS.delivery) || {};
    const rows = (d.methods || []).map((m) => {
      const label = t('pd.methods.' + m.id);
      return `<li><span>${label.startsWith('pd.methods') ? esc(m.id) : label}</span><b>${m.fee ? OL.price(m.fee) : t('pd.free')}</b></li>`;
    });
    if (d.free_threshold) rows.push(`<li class="pd-free"><span>${t('pd.freeFrom', { n: OL.price(d.free_threshold) })}</span></li>`);
    return rows.length ? `<ul class="pd-fees">${rows.join('')}</ul>` : '';
  };

  // the size guide of the item's category (letters, RU sizes, waist, shoes, belts); nothing for one-size items
  const guideOf = (p) => {
    const sys = (OL.CAT[p.cat] && OL.CAT[p.cat].sizes) || 'letter';
    const rows = (OL.SIZE_CHARTS && OL.SIZE_CHARTS[sys]) || [];
    return rows.length ? { sys, rows } : null;
  };
  const guideHTML = (g) => `<h3 class="sg-sub">${t('sg.sys.' + g.sys + '.title')}</h3>
    <table class="sg-table"><thead><tr>${t('sg.sys.' + g.sys + '.cols').map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${g.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // facts shown under "Details"
  const facts = (p) => [
    p.material ? [t('pd.material'), esc(p.material)] : null,
    p.fit ? [t('pd.fitLabel'), t('pd.fit.' + p.fit)] : null,
    p.origin ? [t('pd.origin'), esc(OL.country(p.origin))] : null,
    p.model ? [t('pd.model'), esc(p.model)] : null,
  ].filter(Boolean);

  // the line under the size picker for one size
  const sizeNote = (p, size) => {
    if (OL.lineState(p, size, 1) === 'order') return { cls: 'is-order', text: t('ful.orderDays', { days: OL.orderDays(p) }), note: t('ful.note') };
    const z = p.sizes.find((x) => x.s === size);
    if (z && z.stock > 0 && z.stock <= 2) return { cls: 'is-low', text: t('pd.onlyLeft', { n: z.stock }), note: '' };
    return { cls: '', text: t('ful.stockDays', { days: OL.stockDays() }), note: '' };
  };

  OL.pages.product = {
    meta(ctx) {
      const p = OL.P[ctx.params.slug];
      if (!p) return {};
      return {
        title: `${p.brand} ${p.name}${p.color ? `, ${p.color}` : ''}`,
        description: `${description(p)} ${OL.price(p.price)}.`.slice(0, 200),
        image: p.images[0],
        path: ctx.path,
      };
    },

    render(ctx) {
      const p = OL.P[ctx.params.slug];
      const off = OL.off(p);
      const buyable = p.sizes.some((z) => z.ok);
      const rel = OL.catalog.related(OL.PRODUCTS, p, 4);
      const look = OL.catalog.completeLook(OL.PRODUCTS, p, 4);
      const seen = getViewed().filter((s) => s !== p.slug).slice(0, 4).map((s) => OL.P[s]);
      const imgs = p.images.length ? p.images : [''];
      const dept = OL.catDept(p.cat);
      const guide = guideOf(p);
      const av = OL.catalog.availability(p);
      const tag = av === 'sold' ? 'sold' : av === 'order' ? 'order' : p.tag;
      const sibs = OL.catalog.otherColours(OL.PRODUCTS, p);
      const dot = (x) => `<a class="pd-colour${x === p ? ' is-on' : ''}" href="${OL.productUrl(x)}" title="${esc(x.color || x.name)}" aria-label="${esc(x.color || x.name)}"><i data-c="${/^#[0-9a-fA-F]{6}$/.test(x.colorHex || '') ? x.colorHex : '#999'}"></i></a>`;
      const f = facts(p);

      return `
      <article class="pd" data-id="${esc(p.id)}">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb">
            <a href="/">${t('crumbs.home')}</a><i>/</i>
            ${dept ? `<a href="/${dept}">${t('dept.' + dept)}</a><i>/</i>` : ''}
            <a href="${OL.catUrl(p.cat)}">${esc(OL.catName(p.cat))}</a><i>/</i>
            <span>${esc(p.name)}</span>
          </nav>

          <div class="pd-grid">
            <div class="pd-gallery">
              <div class="pd-thumbs" role="tablist" data-stagger>
                ${imgs.map((u, i) => `<button type="button" class="pd-thumb${i === 0 ? ' is-on' : ''}" data-thumb="${i}" aria-label="${i + 1}"><img src="${OL.pimg(u, 160, 200)}" alt=""></button>`).join('')}
              </div>
              <div class="pd-stage" data-img>
                <div class="pd-track" id="pdTrack">
                  ${imgs.map((u, i) => `<figure class="pd-slide"><img src="${OL.pimg(u, 1100, 1375)}" alt="${esc(p.brand)} ${esc(p.name)} — ${i + 1}" ${i ? 'loading="lazy"' : ''} data-slide="${i}"></figure>`).join('')}
                </div>
                <div class="pcard-flags">
                  ${off ? `<span class="pcard-badge">−${off}%</span>` : ''}
                  ${tag ? `<span class="pcard-tag is-${tag}">${t('tag.' + tag)}</span>` : ''}
                </div>
                <button type="button" class="pd-zoom" data-zoom aria-label="${t('pd.zoom')}"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></button>
                ${imgs.length > 1 ? `<button type="button" class="pd-arrow pd-prev" data-step="-1" aria-label="${t('pd.prev')}">${OL.ICON.arrow}</button>
                <button type="button" class="pd-arrow pd-next" data-step="1" aria-label="${t('pd.next')}">${OL.ICON.arrow}</button>
                <div class="pd-dots">${imgs.map((_, i) => `<i class="${i === 0 ? 'is-on' : ''}"></i>`).join('')}</div>` : ''}
              </div>
            </div>

            <div class="pd-info" data-stagger>
              <p class="eyebrow"><a href="/brands/${esc(OL.slug(p.brand))}">${esc(p.brand)}</a></p>
              <h1 class="pd-title" data-split>${esc(p.name)}</h1>
              ${p.color || p.sku ? `<p class="pd-sub">${[p.color ? `${t('pd.color')}: ${esc(p.color)}` : '', p.sku ? `${t('pd.sku')}: ${esc(p.sku)}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
              ${sibs.length ? `<div class="pd-colours" aria-label="${t('pd.otherColours')}">${[p, ...sibs].map(dot).join('')}</div>` : ''}

              <div class="pd-price">
                <b>${OL.price(p.price)}</b>
                ${p.was > p.price ? `<s>${OL.price(p.was)}</s><span class="pd-off">−${off}%</span>` : ''}
              </div>
              ${p.was > p.price ? `<p class="pd-save">${t('pd.save')}: ${OL.price(p.was - p.price)}</p>` : ''}

              ${buyable ? `
              <div class="pd-sizes-head">
                <span>${t('pd.size')}</span>
                ${guide ? `<button type="button" class="pd-guide" data-guide>${t('pd.sizeGuide')}</button>` : ''}
              </div>
              <div class="pd-sizes" role="radiogroup" aria-label="${t('pd.chooseSize')}">
                ${p.sizes.map((z) => `<button type="button" role="radio" aria-checked="false" class="pd-size${z.ok ? '' : ' is-out'}${z.ok && z.stock === 0 ? ' is-order' : ''}" data-pd-size="${esc(z.s)}" data-stock="${z.stock}" ${z.ok ? '' : 'disabled'}>${esc(z.s)}</button>`).join('')}
              </div>
              <p class="pd-legend"><span><i class="lg-stock"></i>${t('ful.stock')}</span><span><i class="lg-order"></i>${t('ful.order')}</span></p>
              <p class="pd-hint" id="pdHint" aria-live="polite">${t('pd.chooseSize')}</p>
              <p class="pd-ordernote" id="pdOrderNote" hidden></p>` : `<p class="pd-soldout">${t('pd.allSold')}</p>`}

              <div class="pd-actions" id="pdActions">
                <button type="button" class="btn btn-gold pd-add" data-pd-add ${buyable ? '' : 'disabled'}>
                  <span>${buyable ? t('pd.add') : t('pd.soldOut')}</span>${OL.ICON.arrow}
                </button>
                <button type="button" class="pd-fav pcard-fav${OL.state.wish.includes(p.id) ? ' is-on' : ''}" aria-label="${t('ui.fav')}" aria-pressed="${OL.state.wish.includes(p.id)}">${OL.ICON.heart}</button>
                <button type="button" class="pd-share" data-share aria-label="${t('pd.share')}"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="6" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="m8.2 10.9 7.1-3.7M8.2 13.1l7.1 3.7"/></svg></button>
              </div>

              ${buyable
    ? `<button type="button" class="btn btn-ghost pd-quick" data-quick><span>${t('qb.btn')}</span></button>`
    : `<button type="button" class="btn btn-ghost pd-quick" data-notify><span>${t('nt.btn')}</span></button>`}

              <ul class="pd-trust">${t('pd.trust').map((x) => `<li><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg>${x}</li>`).join('')}</ul>

              <div class="pd-acc">
                <details open><summary>${t('pd.description')}</summary><div><p>${esc(description(p))}</p></div></details>
                <details><summary>${t('pd.details')}</summary><div>
                  ${f.length ? `<dl class="pd-facts">${f.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
                  <ul class="pd-list">${t('pd.detailsList').map((x) => `<li>${x}</li>`).join('')}</ul></div></details>
                <details><summary>${t('pd.delivery')}</summary><div><p>${t('pd.deliveryText')}</p>
                  <p class="pd-days">${t('ful.stockDays', { days: OL.stockDays() })}<br>${t('ful.orderDays', { days: OL.orderDays(p) })}</p>${deliveryRows()}</div></details>
                <details><summary>${t('pd.returns')}</summary><div><p>${t('pd.returnsText')}</p></div></details>
                <details><summary>${t('pd.authentic')}</summary><div><p>${t('pd.authText')}</p></div></details>
              </div>
            </div>
          </div>

          ${look.length ? `<section class="pd-more"><h2 class="pd-h2" data-split>${t('pd.complete')}</h2>
            <div class="pgrid pd-grid-cards">${look.map((x) => OL.ui.card(x)).join('')}</div></section>` : ''}
          ${rel.length ? `<section class="pd-more"><h2 class="pd-h2" data-split>${t('pd.related')}</h2>
            <div class="pgrid pd-grid-cards">${rel.map((x) => OL.ui.card(x)).join('')}</div></section>` : ''}
          ${seen.length ? `<section class="pd-more"><h2 class="pd-h2" data-split>${t('pd.recent')}</h2>
            <div class="pgrid pd-grid-cards">${seen.map((x) => OL.ui.card(x)).join('')}</div></section>` : ''}
        </div>

        <div class="pd-sticky" id="pdSticky" aria-hidden="true">
          <div><small>${esc(p.brand)}</small><b>${OL.price(p.price)}</b></div>
          <button type="button" class="btn btn-gold" data-pd-add ${buyable ? '' : 'disabled'}><span>${buyable ? t('pd.add') : t('pd.soldOut')}</span></button>
        </div>

        ${guide ? `<div class="modal" id="sizeGuide" role="dialog" aria-modal="true" aria-label="${t('sg.title')}" aria-hidden="true">
          <div class="modal-backdrop" data-close-modal></div>
          <div class="modal-card" data-lenis-prevent>
            <button type="button" class="icon-btn modal-x" data-close-modal aria-label="${t('pd.close')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            <h2>${t('sg.title')}</h2>
            <p>${t('sg.text')}</p>
            ${guideHTML(guide)}
            <p class="sg-note">${t('sg.note')}</p>
          </div>
        </div>` : ''}

        <div class="modal" id="quickBuy" role="dialog" aria-modal="true" aria-label="${t('qb.title')}" aria-hidden="true">
          <div class="modal-backdrop" data-close-modal></div>
          <div class="modal-card" data-lenis-prevent>
            <button type="button" class="icon-btn modal-x" data-close-modal aria-label="${t('pd.close')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            <form class="mform" data-form="quick" novalidate>
              <h2>${t('qb.title')}</h2>
              <p>${t('qb.text')}</p>
              <p class="mform-item"><b>${esc(p.name)}</b><span data-quick-size></span></p>
              <p class="mform-order" data-quick-order hidden></p>
              <label class="fld"><span>${t('qb.name')}</span><input name="name" autocomplete="name" maxlength="80"><em class="fld-err"></em></label>
              <label class="fld"><span>${t('qb.phone')}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67"><em class="fld-err"></em></label>
              <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
              <p class="ck-error" data-form-error hidden></p>
              <button type="submit" class="btn btn-gold"><span>${t('qb.send')}</span></button>
            </form>
            <div class="mdone" hidden><h2>${t('qb.doneTitle')}</h2><p>${t('qb.doneText')}</p><p class="mdone-no"></p></div>
          </div>
        </div>

        <div class="modal" id="notifyMe" role="dialog" aria-modal="true" aria-label="${t('nt.title')}" aria-hidden="true">
          <div class="modal-backdrop" data-close-modal></div>
          <div class="modal-card" data-lenis-prevent>
            <button type="button" class="icon-btn modal-x" data-close-modal aria-label="${t('pd.close')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            <form class="mform" data-form="notify" novalidate>
              <h2>${t('nt.title')}</h2>
              <p>${t('nt.text')}</p>
              <label class="fld"><span>${t('nt.phone')}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67"><em class="fld-err"></em></label>
              <label class="fld"><span>${t('nt.telegram')}</span><input name="telegram" autocomplete="off" placeholder="@username" maxlength="40"><em class="fld-err"></em></label>
              <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
              <p class="ck-error" data-form-error hidden></p>
              <button type="submit" class="btn btn-gold"><span>${t('nt.send')}</span></button>
            </form>
            <div class="mdone" hidden><h2>${t('nt.doneTitle')}</h2><p>${t('nt.doneText')}</p></div>
          </div>
        </div>
      </article>`;
    },

    bind(root, ctx) {
      const p = OL.P[ctx.params.slug];
      if (OL.track) OL.track('view_item', { currency: 'UZS', value: p.price, items: [OL.itemOf(p)] });
      const page = root.querySelector('.pd');
      const $ = (s) => page.querySelector(s);
      const $$ = (s) => [...page.querySelectorAll(s)];
      const track = $('#pdTrack');
      const slides = $$('.pd-slide');
      let selected = null;
      let current = 0;

      // remember what the visitor looked at
      OL.store.set(VIEWED_KEY, [p.slug, ...getViewed().filter((s) => s !== p.slug)].slice(0, 12));

      /* ---- structured data for search engines ---- */
      const av = OL.catalog.availability(p);
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        brand: { '@type': 'Brand', name: p.brand },
        image: p.images,
        sku: p.slug,
        ...(p.color ? { color: p.color } : {}),
        ...(p.material ? { material: p.material } : {}),
        description: description(p),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'UZS',
          price: p.price,
          availability: av === 'stock' ? 'https://schema.org/InStock' : av === 'order' ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
          url: location.origin + ctx.path,
        },
      });
      document.head.appendChild(ld);
      OL.onCleanup(() => ld.remove());

      /* ---- gallery ---- */
      const go = (i, smooth = true) => {
        current = Math.max(0, Math.min(slides.length - 1, i));
        track.scrollTo({ left: current * track.clientWidth, behavior: smooth && !OL.reduced ? 'smooth' : 'auto' });
      };
      const mark = () => {
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        current = Math.max(0, Math.min(slides.length - 1, i));
        $$('.pd-thumb').forEach((b, k) => b.classList.toggle('is-on', k === current));
        $$('.pd-dots i').forEach((d, k) => d.classList.toggle('is-on', k === current));
      };
      track.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });

      /* ---- lightbox ---- */
      let lb = null;
      const closeLb = () => {
        if (!lb) return;
        lb.remove();
        lb = null;
        html.classList.remove('modal-open');
        OL.lockScroll();
        document.removeEventListener('keydown', onLbKey);
      };
      const showLb = (i) => {
        const imgs = p.images.length ? p.images : [''];
        const idx = (i + imgs.length) % imgs.length;
        lb.dataset.i = idx;
        const img = lb.querySelector('img');
        img.src = OL.pimg(imgs[idx], 1800);
        img.classList.remove('is-zoomed');
        lb.querySelector('.lb-count').textContent = `${idx + 1} / ${imgs.length}`;
      };
      const onLbKey = (e) => {
        if (e.key === 'Escape') closeLb();
        if (e.key === 'ArrowRight') showLb(Number(lb.dataset.i) + 1);
        if (e.key === 'ArrowLeft') showLb(Number(lb.dataset.i) - 1);
      };
      const openLb = (i) => {
        closeLb();
        lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.innerHTML = `
          <div class="lb-backdrop" data-lb-close></div>
          <img class="lb-img" alt="${esc(p.brand)} ${esc(p.name)}">
          <button type="button" class="icon-btn lb-x" data-lb-close aria-label="${t('pd.close')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          <button type="button" class="pd-arrow lb-prev" data-lb-step="-1" aria-label="${t('pd.prev')}">${OL.ICON.arrow}</button>
          <button type="button" class="pd-arrow lb-next" data-lb-step="1" aria-label="${t('pd.next')}">${OL.ICON.arrow}</button>
          <span class="lb-count"></span>`;
        document.body.appendChild(lb);
        html.classList.add('modal-open');
        OL.lockScroll();
        showLb(i);
        const img = lb.querySelector('img');
        lb.addEventListener('click', (e) => {
          if (e.target.closest('[data-lb-close]')) return closeLb();
          const st = e.target.closest('[data-lb-step]');
          if (st) return showLb(Number(lb.dataset.i) + Number(st.dataset.lbStep));
          if (e.target === img) img.classList.toggle('is-zoomed');
        });
        lb.addEventListener('pointermove', (e) => {
          if (!img.classList.contains('is-zoomed')) return;
          const r = img.getBoundingClientRect();
          img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        });
        document.addEventListener('keydown', onLbKey);
      };
      OL.onCleanup(closeLb);

      /* ---- size guide modal ---- */
      const guide = $('#sizeGuide');
      const setGuide = (open) => {
        if (!guide) return;
        guide.classList.toggle('is-open', open);
        guide.setAttribute('aria-hidden', String(!open));
        html.classList.toggle('modal-open', open);
        OL.lockScroll();
      };
      const onGuideKey = (e) => {
        if (e.key !== 'Escape') return;
        if (guide && guide.classList.contains('is-open')) setGuide(false);
        page.querySelectorAll('#quickBuy.is-open, #notifyMe.is-open').forEach((m) => {
          m.classList.remove('is-open');
          m.setAttribute('aria-hidden', 'true');
          html.classList.remove('modal-open');
          OL.lockScroll();
        });
      };
      document.addEventListener('keydown', onGuideKey);
      OL.onCleanup(() => { document.removeEventListener('keydown', onGuideKey); html.classList.remove('modal-open'); });

      /* ---- add to cart ---- */
      const hint = $('#pdHint');
      const orderNote = $('#pdOrderNote');
      const addLabel = (text) => $$('[data-pd-add] span').forEach((el) => { el.textContent = text; });
      const restLabel = () => (selected != null && OL.lineState(p, selected, 1) === 'order' ? t('pd.addOrder') : t('pd.add'));
      const needSize = () => {
        if (hint) {
          hint.textContent = t('pd.chooseHint');
          hint.className = 'pd-hint is-warn';
        }
        const box = $('.pd-sizes');
        if (box) {
          box.scrollIntoView({ block: 'center', behavior: OL.reduced ? 'auto' : 'smooth' });
          box.classList.remove('is-shake');
          void box.offsetWidth;
          box.classList.add('is-shake');
        }
      };
      const add = () => {
        if (selected == null) return needSize();
        const img = slides[current] && slides[current].querySelector('img');
        if (OL.motion && OL.motion.on) OL.motion.fly(img);
        OL.addToCart(p.id, selected);
        addLabel(t('cart.added'));
        $$('[data-pd-add]').forEach((b) => b.classList.add('is-done'));
        setTimeout(() => {
          addLabel(restLabel());
          $$('[data-pd-add]').forEach((b) => b.classList.remove('is-done'));
        }, 1700);
      };

      /* ---- sticky bar on phones: visible while the main button is off-screen ---- */
      const sticky = $('#pdSticky');
      const actions = $('#pdActions');
      if (sticky && actions && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(([en]) => {
          const show = !en.isIntersecting && en.boundingClientRect.top < 0;
          sticky.classList.toggle('is-on', show);
          sticky.setAttribute('aria-hidden', String(!show));
        }, { threshold: 0 });
        io.observe(actions);
        OL.onCleanup(() => io.disconnect());
      }

      /* ---- quick order + notify-me (modals with small forms) ---- */
      const O = OL.orderLogic;
      const modalOpenedAt = {};
      const setModal = (el, open) => {
        el.classList.toggle('is-open', open);
        el.setAttribute('aria-hidden', String(!open));
        html.classList.toggle('modal-open', open || !!page.querySelector('.modal.is-open'));
        OL.lockScroll();
        if (open) {
          modalOpenedAt[el.id] = Date.now();
          const first = el.querySelector('input:not([tabindex="-1"])');
          if (first) setTimeout(() => first.focus({ preventScroll: true }), 80);
        }
      };
      const errorBanner = (form, text) => {
        const b = form.querySelector('[data-form-error]');
        b.hidden = !text;
        b.textContent = text || '';
      };
      const fieldErr = (form, name, key) => {
        const input = form.elements[name];
        const holder = input.closest('.fld');
        holder.classList.toggle('has-error', !!key);
        holder.querySelector('.fld-err').textContent = key ? t('err.' + key) : '';
      };
      const bindPhoneMask = (form) => {
        const input = form.elements.phone;
        input.addEventListener('input', (e) => {
          const del = e.inputType && e.inputType.startsWith('delete');
          input.value = del && !O.phoneDigits(input.value) ? '' : O.formatPhone(input.value);
        });
      };
      const post = async (form, body) => {
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        errorBanner(form, '');
        let data = {};
        let status = 0;
        try {
          const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          status = r.status;
          data = await r.json().catch(() => ({}));
        } catch (e) {
          errorBanner(form, t('err.network'));
          btn.disabled = false;
          return null;
        }
        btn.disabled = false;
        if (status >= 200 && status < 300 && data.ok) return data;
        if (status === 429) errorBanner(form, t('err.tooMany'));
        else if (status === 503) errorBanner(form, t('err.down'));
        else if (data.error === 'out_of_stock' || data.error === 'unavailable') errorBanner(form, t('err.gone', { name: p.name }));
        else if (data.error === 'invalid' && data.field === 'phone') fieldErr(form, 'phone', 'phone');
        else errorBanner(form, t('err.generic'));
        return null;
      };
      const quick = $('#quickBuy');
      const notify = $('#notifyMe');
      $$('.mform').forEach(bindPhoneMask);

      quick.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errs = O.validate({ name: form.elements.name.value, phone: form.elements.phone.value }, {});
        fieldErr(form, 'name', errs.name);
        fieldErr(form, 'phone', errs.phone);
        if (errs.name || errs.phone) return;
        const data = await post(form, {
          type: 'quick',
          website: form.elements.website.value,
          elapsed: Date.now() - (modalOpenedAt.quickBuy || Date.now()),
          lang: OL.state.lang,
          customer: { name: form.elements.name.value, phone: O.toE164(form.elements.phone.value) },
          items: [{ slug: p.slug, size: selected, qty: 1 }],
        });
        if (!data) return;
        if (OL.track) OL.track('purchase', { transaction_id: data.number, currency: 'UZS', value: p.price, quick: true, items: [OL.itemOf(p, { quantity: 1 })] });
        form.hidden = true;
        const done = quick.querySelector('.mdone');
        done.hidden = false;
        done.querySelector('.mdone-no').textContent = data.number;
      });

      notify.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errs = O.validate({ name: 'xx', phone: form.elements.phone.value, telegram: form.elements.telegram.value }, {});
        fieldErr(form, 'phone', errs.phone && !form.elements.telegram.value.trim() ? 'phone' : '');
        fieldErr(form, 'telegram', errs.telegram);
        if ((errs.phone && !form.elements.telegram.value.trim()) || errs.telegram) return;
        const data = await post(form, {
          type: 'notify',
          website: form.elements.website.value,
          elapsed: Date.now() - (modalOpenedAt.notifyMe || Date.now()),
          slug: p.slug,
          phone: O.isValidPhone(form.elements.phone.value) ? O.toE164(form.elements.phone.value) : '',
          telegram: form.elements.telegram.value,
        });
        if (!data) return;
        form.hidden = true;
        notify.querySelector('.mdone').hidden = false;
      });

      /* ---- clicks ---- */
      page.addEventListener('click', (e) => {
        if (e.target.closest('[data-quick]')) {
          if (selected == null) return needSize();
          quick.querySelector('[data-quick-size]').textContent = ` · ${selected}`;
          const qo = quick.querySelector('[data-quick-order]');
          const isOrder = OL.lineState(p, selected, 1) === 'order';
          qo.hidden = !isOrder;
          qo.textContent = isOrder ? `${t('ful.orderDays', { days: OL.orderDays(p) })}. ${t('ful.note')}` : '';
          return setModal(quick, true);
        }
        if (e.target.closest('[data-notify]')) return setModal(notify, true);
        if (e.target.closest('[data-close-modal]')) {
          const m = e.target.closest('.modal');
          if (m && m.id === 'sizeGuide') return setGuide(false);
          if (m) return setModal(m, false);
        }
        const thumb = e.target.closest('[data-thumb]');
        if (thumb) return go(Number(thumb.dataset.thumb));
        const step = e.target.closest('[data-step]');
        if (step) return go(current + Number(step.dataset.step));
        if (e.target.closest('[data-zoom]') || e.target.closest('.pd-slide img')) return openLb(current);

        const size = e.target.closest('[data-pd-size]');
        if (size && !size.disabled) {
          selected = size.dataset.pdSize;
          $$('[data-pd-size]').forEach((b) => {
            const on = b === size;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-checked', String(on));
          });
          const n = sizeNote(p, selected);
          if (hint) {
            hint.className = `pd-hint ${n.cls}`;
            hint.textContent = n.text;
          }
          if (orderNote) { orderNote.hidden = !n.note; orderNote.textContent = n.note; }
          addLabel(restLabel());
          return;
        }

        if (e.target.closest('[data-guide]')) return setGuide(true);
        if (e.target.closest('[data-pd-add]')) return add();

        if (e.target.closest('[data-share]')) {
          const url = location.origin + ctx.path;
          if (navigator.share) navigator.share({ title: `${p.brand} ${p.name}`, url }).catch(() => {});
          else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => OL.toast(t('pd.copied')), () => {});
        }
      });

      return {};
    },
  };
})();
