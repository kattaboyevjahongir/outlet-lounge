// "More" — the menu phones get instead of a long sidebar.
import { html } from '../dom.js';
import { t } from '../i18n.js';
import { ICON } from '../ui.js';

export default async function page({ me }) {
  const owner = me.role === 'owner';
  const links = [
    owner && { href: '/admin/categories', label: t('nav.categories') },
    owner && { href: '/admin/promo', label: t('nav.promo') },
    owner && { href: '/admin/reports', label: t('nav.reports') },
    owner && { href: '/admin/settings', label: t('nav.settings') },
    owner && { href: '/admin/staff', label: t('nav.staff') },
    owner && { href: '/admin/activity', label: t('nav.activity') },
    { href: '/admin/account', label: t('nav.account') },
  ].filter(Boolean);
  return {
    title: t('more.title'),
    body: html`
      <div class="page-head"><h1>${t('more.title')}</h1></div>
      <ul class="card more-list">${links.map((l) => html`<li><a href="${l.href}"><span>${l.label}</span>${ICON.right}</a></li>`)}
        <li><a href="/" target="_blank" rel="noopener"><span>${t('nav.shop')}</span>${ICON.external}</a></li></ul>`,
  };
}
