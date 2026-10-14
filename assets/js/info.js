/* Outlet Lounge — information pages: delivery, returns, size guide, authenticity, about, contacts,
   FAQ, public offer, privacy policy. Texts live in info-content.js; numbers come from the settings. */
(function () {
  const OL = window.OL;
  const esc = (s) => OL.esc(s);
  const lang = () => OL.state.lang;

  OL.legal = () => ({ company: '', inn: '', address: '', email: '', return_days: 14, ...((OL.SETTINGS && OL.SETTINGS.legal) || {}) });
  OL.infoTitle = (slug) => (OL.INFO_TITLES[lang()] || OL.INFO_TITLES.ru)[slug] || slug;

  const context = () => {
    const d = (OL.SETTINGS && OL.SETTINGS.delivery) || OL.STATIC_SETTINGS.delivery || { methods: [] };
    const fee = {};
    (d.methods || []).forEach((m) => { fee[m.id] = Number(m.fee) || 0; });
    const c = OL.contacts();
    const l = OL.legal();
    return {
      fee,
      free: Number(d.free_threshold) || 0,
      stock: d.stock_days || '1–3',
      order: d.order_days || '10–18',
      money: (n) => OL.price(n),
      hours: c.hours || '10:00–21:00',
      minutes: c.call_minutes || 15,
      phone: c.phone || '',
      email: l.email || '',
      company: l.company || '',
      inn: l.inn || '',
      legalAddress: l.address || '',
      returnDays: Number(l.return_days) || 14,
    };
  };

  const block = (b) => {
    if (b.contacts) return contactsBlock();
    const head = b.h ? `<h2>${esc(b.h)}</h2>` : '';
    if (b.table) {
      return `<section class="info-block">${head}<div class="info-table-wrap"><table class="info-table">
        <thead><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
    }
    if (b.faq) {
      return `<section class="info-block faq">${b.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
    }
    const ps = (b.p || []).map((p) => `<p>${esc(p)}</p>`).join('');
    const ul = b.ul ? `<ul>${b.ul.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
    return `<section class="info-block">${head}${ps}${ul}</section>`;
  };

  function contactsBlock() {
    const c = OL.contacts();
    const L = OL.orderLogic;
    const tel = L.telLink(c.phone);
    const tg = L.tgLink(c.telegram);
    const insta = L.instaLink(c.instagram);
    const ext = 'target="_blank" rel="noopener"';
    const rows = [
      tel && `<li><span>${OL.t('ct.phone')}</span><a href="${tel}">${esc(c.phone)}</a></li>`,
      c.hours && `<li><span>${OL.t('ct.hours')}</span><b>${esc(c.hours)}</b></li>`,
      tg && `<li><span>Telegram</span><a href="${tg}" ${ext}>@${esc(String(c.telegram).replace(/^@/, ''))}</a></li>`,
      insta && `<li><span>Instagram</span><a href="${insta}" ${ext}>@${esc(String(c.instagram).replace(/^@/, ''))}</a></li>`,
      c.address && `<li><span>${OL.t('ct.address')}</span><b>${esc(c.address)}</b></li>`,
    ].filter(Boolean);
    return `<section class="info-block"><ul class="info-contacts">${rows.join('') || `<li><span>${OL.t('ct.soon')}</span></li>`}</ul></section>`;
  }

  OL.pages.info = {
    meta: (route) => {
      const slug = route.params.slug;
      const page = OL.infoContent(lang(), slug, context());
      return { title: OL.infoTitle(slug), description: page ? page.lead : '', path: `/${slug}` };
    },

    render(route) {
      const slug = route.params.slug;
      const page = OL.infoContent(lang(), slug, context());
      if (!page) return OL.pages.notfound.render();
      const nav = OL.INFO_SLUGS.filter((s) => s !== 'offer' && s !== 'privacy')
        .map((s) => `<a href="/${s}" class="${s === slug ? 'is-on' : ''}">${esc(OL.infoTitle(s))}</a>`).join('');
      const legal = ['offer', 'privacy'].map((s) => `<a href="/${s}" class="${s === slug ? 'is-on' : ''}">${esc(OL.infoTitle(s))}</a>`).join('');
      return `
      <section class="info">
        <div class="container info-wrap">
          <aside class="info-side" aria-label="${esc(OL.t('ct.help'))}">
            <p class="eyebrow"><span class="eyebrow-line"></span>${esc(OL.t('ct.help'))}</p>
            <nav>${nav}<span class="info-sep"></span>${legal}</nav>
          </aside>
          <article class="info-main">
            <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(OL.t('crumbs.home'))}</a><i>/</i><span>${esc(OL.infoTitle(slug))}</span></nav>
            <h1 class="info-title" data-split>${esc(OL.infoTitle(slug))}</h1>
            <p class="info-lead">${esc(page.lead)}</p>
            ${page.blocks.map(block).join('')}
            <div class="info-cta">
              <a class="btn btn-gold" href="/shop"><span>${esc(OL.t('nf.shop'))}</span>${OL.ICON.arrow}</a>
            </div>
          </article>
        </div>
      </section>`;
    },
  };
})();
