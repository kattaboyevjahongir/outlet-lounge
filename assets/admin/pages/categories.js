// Categories (owner): the shop's departments and their categories — rename, reorder, hide, choose the
// size system offered for new products, add and delete. Managers can't open it (the database refuses them).
import { html, $, $$ } from '../dom.js';
import { t, getLang } from '../i18n.js';
import { DEPARTMENTS, SIZE_SYSTEM_IDS, emptyCategory, validateCategory, categoryToRow } from '../logic.js';
import { ICON, toast, errorText, confirmDialog, deniedPage } from '../ui.js';

export default async function page({ data, me, go }) {
  if (me.role !== 'owner') return { title: t('cats.title'), body: deniedPage() };
  const [cats, counts] = await Promise.all([data.listCategories(), data.categoryCounts()]);
  const lang = getLang();
  const name = (c) => c['name_' + lang] || c.name_en;

  const row = (c) => html`
    <li class="cat-row ${c.is_active ? '' : 'is-hidden'}" data-slug="${c.slug}">
      <div class="cat-main"><b>${name(c)}</b><small>/shop/${c.slug} · ${t(`sys.${c.size_system}`)}${c.is_active ? '' : ` · ${t('cats.hiddenNote')}`}</small></div>
      <div class="cat-meta"><small>${t('cats.products', { n: counts[c.slug] || 0 })}</small></div>
      <div class="cat-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-edit>${ICON.right}<span class="sr-only">${t('common.edit')}</span></button>
        <button type="button" class="btn btn-danger-ghost btn-sm" data-del>${ICON.trash}<span class="sr-only">${t('cats.delete')}</span></button>
      </div>
    </li>`;

  const body = html`
    <div class="page-head"><div><h1>${t('cats.title')}</h1><p class="muted">${t('cats.hint')}</p></div>
      <button type="button" class="btn btn-gold" id="catNew">${ICON.plus}<span>${t('cats.add')}</span></button></div>
    <section class="card" id="catEditor" hidden></section>
    ${cats.length ? DEPARTMENTS.map((d) => html`
      <h2 class="group-title">${t(`dept.${d}`)}</h2>
      <ul class="card cat-list">${cats.filter((c) => c.department === d).map(row)}</ul>`)
      : html`<div class="empty-state"><p>${t('cats.empty')}</p></div>`}`;

  const toForm = (c) => ({ ...c, isNew: false, original: c.slug, sort: String(c.sort), image_path: c.image_path || '' });

  return {
    title: t('cats.title'),
    body,
    mount(root) {
      const editor = $('#catEditor', root);
      const slugs = cats.map((c) => c.slug);

      const open = (form) => {
        editor.hidden = false;
        editor.innerHTML = String(html`
          <h2>${t('cats.edit')}</h2>
          <form id="catForm" class="stack" novalidate>
            <div class="grid-2">
              <label class="field"><span>${t('cats.slug')}</span>
                <input name="slug" value="${form.slug}" autocomplete="off" maxlength="60" ${form.isNew ? '' : 'readonly'}>
                <small class="err-msg" data-err="slug"></small><small class="hint">${t('cats.slugHint')}</small></label>
              <label class="field"><span>${t('cats.department')}</span>
                <select name="department">${DEPARTMENTS.map((d) => html`<option value="${d}" ${d === form.department ? 'selected' : ''}>${t(`dept.${d}`)}</option>`)}</select></label>
            </div>
            <div class="grid-3">
              ${[['name_ru', 'cats.nameRu'], ['name_uz', 'cats.nameUz'], ['name_en', 'cats.nameEn']].map(([k, label]) => html`
                <label class="field"><span>${t(label)}</span><input name="${k}" value="${form[k]}" maxlength="60" autocomplete="off">
                  <small class="err-msg" data-err="${k}"></small></label>`)}
            </div>
            <div class="grid-2">
              <label class="field"><span>${t('cats.sizeSystem')}</span>
                <select name="size_system">${SIZE_SYSTEM_IDS.map((s) => html`<option value="${s}" ${s === form.size_system ? 'selected' : ''}>${t(`sys.${s}`)}</option>`)}</select>
                <small class="hint">${t('cats.sizeHint')}</small></label>
              <label class="field"><span>${t('cats.sort')}</span><input name="sort" value="${form.sort}" inputmode="numeric" maxlength="4" autocomplete="off">
                <small class="err-msg" data-err="sort"></small></label>
            </div>
            <label class="switch"><input type="checkbox" name="is_active" ${form.is_active ? 'checked' : ''}><span>${t('cats.active')}</span></label>
            <div class="btn-row">
              <button class="btn btn-gold" type="submit">${t('common.save')}</button>
              <button class="btn btn-ghost" type="button" data-cancel>${t('common.cancel')}</button>
            </div>
          </form>`);
        const f = $('#catForm', editor);
        (form.isNew ? f.slug : f.name_ru).focus();
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const values = {
            isNew: form.isNew, slug: f.slug.value.trim(), department: f.department.value,
            name_ru: f.name_ru.value, name_uz: f.name_uz.value, name_en: f.name_en.value,
            size_system: f.size_system.value, sort: f.sort.value, is_active: f.is_active.checked, image_path: form.image_path || '',
          };
          $$('.err-msg', f).forEach((x) => { x.textContent = ''; });
          const { ok, errors } = validateCategory(values, slugs);
          if (!ok) {
            Object.entries(errors).forEach(([k, c]) => { const el = $(`[data-err="${k}"]`, f); if (el) el.textContent = t(`cats.err.${c}`); });
            return;
          }
          try {
            await data.saveCategory(categoryToRow(values), form.isNew ? null : form.original);
            toast(t('cats.saved'));
            await go(location.pathname, { force: true });
          } catch (err) {
            if (err.code === 'category_taken') $('[data-err=slug]', f).textContent = t('cats.err.taken');
            else toast(errorText(err), 'err');
          }
        });
      };

      $('#catNew', root).addEventListener('click', () => {
        const next = Math.max(0, ...cats.map((c) => c.sort)) + 1;
        open({ ...emptyCategory(), isNew: true, sort: String(next) });
        editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-cancel]')) { editor.hidden = true; return; }
        const li = e.target.closest('.cat-row');
        if (!li) return;
        const c = cats.find((x) => x.slug === li.dataset.slug);
        if (e.target.closest('[data-edit]')) { open(toForm(c)); editor.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (e.target.closest('[data-del]')) {
          const ok = await confirmDialog({ title: t('cats.deleteTitle', { name: name(c) }), text: t('cats.deleteText'), ok: t('cats.delete'), danger: true });
          if (!ok) return;
          try {
            await data.deleteCategory(c.slug);
            toast(t('cats.deleted'));
            await go(location.pathname, { force: true });
          } catch (err) {
            toast(err.code === 'category_in_use' ? t('err.category_in_use') : errorText(err), 'err');
          }
        }
      });
    },
  };
}
