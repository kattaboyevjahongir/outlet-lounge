// Product form: basics, colour, price, flags, photos, sizes & stock, details, descriptions. One save button;
// the database function admin_save_product() stores everything in a single transaction.
import { html, raw, $, $$, esc } from '../dom.js';
import { t, getLang } from '../i18n.js';
import {
  emptyProduct, validateProduct, toPayload, slugify, discountPct, parseMoney, fmtMoney, moveItem,
  DEPARTMENTS, SIZE_SYSTEMS, SIZE_SYSTEM_IDS, COLOR_GROUPS, FITS, COUNTRIES,
  sizeRows, systemOfCategory, duplicateAsColour, colourSiblings, isUploadedPath,
} from '../logic.js';
import { ICON, toast, errorText, confirmDialog } from '../ui.js';

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const field = (name) => name; // keeps template names greppable

// a product as the form holds it (everything is text)
const toForm = (p) => ({
  ...emptyProduct(), ...p,
  price: String(p.price), old_price: p.old_price ? String(p.old_price) : '',
  tags: (p.tags || []).join(', '),
  sizes: p.sizes.map((s) => ({ id: s.id, label: s.label, stock: String(s.stock), orderable: s.orderable !== false, dirty: false })),
  images: p.images.map((i) => ({ path: i.path })),
});

export default async function page({ data, me, params, query, go }) {
  const [brands, all, categories] = await Promise.all([data.listBrands(), data.listProducts(), data.listCategories()]);
  const isOwner = me.role === 'owner';
  const lang = getLang();
  const catName = (c) => c['name_' + lang] || c.name_en;

  /* ---- load or prepare the form ---- */
  let form;
  let isNew = !params.id;
  let loaded = null;
  let tagOriginal = null; // when a new colour is made from a product without a style code, the original gets the code too
  if (params.id) {
    loaded = await data.getProduct(params.id);
    if (!loaded) {
      return {
        title: t('pf.editTitle'),
        body: html`<div class="empty-state"><p>${t('pf.notFound')}</p><a class="btn btn-ghost" href="/admin/products">${t('common.back')}</a></div>`,
      };
    }
    form = { ...toForm(loaded), slugTouched: true };
  } else {
    form = emptyProduct();
    form.id = newId();
    const src = query.get('from') && all.find((p) => p.id === query.get('from'));
    if (src) {
      // another colour of an item: same texts, price and size rows, no photos, no stock, hidden until finished
      const base = toForm(src);
      const copy = duplicateAsColour(base);
      Object.assign(form, copy, { id: form.id, brand_id: src.brand_id, brand_name: '' });
      if (!src.style_code) tagOriginal = { id: src.id, code: copy.style_code };
    }
  }
  const originalPaths = new Set(form.images.map((i) => i.path));
  const sessionUploads = new Set(); // photos uploaded in this visit (cleaned up if never saved)
  let uploading = 0;
  let saving = false;

  const snapshot = () => JSON.stringify({ ...form, slugTouched: undefined });
  let original = snapshot();
  const isDirty = () => snapshot() !== original;

  /* ---- markup ---- */
  const brandOptions = () => html`
    <option value="" ${!form.brand_id && !form.brand_name ? 'selected' : ''} disabled>—</option>
    ${brands.map((b) => html`<option value="${b.id}" ${b.id === form.brand_id ? 'selected' : ''}>${b.name}</option>`)}
    <option value="__new__" ${!form.brand_id && form.brand_name ? 'selected' : ''}>${t('pf.brandNew')}</option>`;

  const textInput = (name, label, opts = {}) => html`
    <label class="field ${opts.cls || ''}"><span>${label}${opts.required ? html` <i class="req">*</i>` : ''}</span>
      <input data-f="${field(name)}" name="${name}" value="${form[name]}" ${opts.ph ? raw(`placeholder="${esc(opts.ph)}"`) : ''}
        ${opts.mode ? raw(`inputmode="${opts.mode}"`) : ''} ${opts.list ? raw(`list="${opts.list}"`) : ''} autocomplete="off" maxlength="${opts.max || 200}">
      <small class="err-msg" data-err="${name}"></small>${opts.hint ? html`<small class="hint">${opts.hint}</small>` : ''}</label>`;

  const flag = (name, label) => html`<label class="switch"><input type="checkbox" data-f="${name}" ${form[name] ? 'checked' : ''}><span>${label}</span></label>`;
  const select = (name, label, options, opts = {}) => html`
    <label class="field"><span>${label}</span>
      <select data-f="${name}">${opts.blank ? html`<option value="">${t('pf.noneOption')}</option>` : ''}
        ${options.map(([v, text]) => html`<option value="${v}" ${v === form[name] ? 'selected' : ''}>${text}</option>`)}</select>
      <small class="err-msg" data-err="${name}"></small></label>`;

  const body = html`
    <div class="page-head">
      <div class="head-main">
        <a class="back" href="/admin/products">${ICON.left}<span>${t('nav.products')}</span></a>
        <h1>${isNew ? t('pf.newTitle') : [form.name, form.color].filter(Boolean).join(' · ') || t('pf.editTitle')}</h1>
      </div>
      ${!isNew && form.is_active ? html`<a class="btn btn-ghost btn-sm" href="/product/${form.slug}" target="_blank" rel="noopener">${ICON.external}<span>${t('pf.view')}</span></a>` : ''}
    </div>

    <form id="productForm" class="pform" novalidate>
      <section class="card">
        <h2>${t('pf.basics')}</h2>
        <div class="grid-2">
          <label class="field"><span>${t('pf.brand')} <i class="req">*</i></span>
            <select id="brandSelect">${brandOptions()}</select><small class="err-msg" data-err="brand"></small></label>
          <label class="field" id="newBrandBox" ${!form.brand_id && form.brand_name ? '' : 'hidden'}><span>${t('pf.brandNewName')}</span>
            <input data-f="brand_name" value="${form.brand_name}" maxlength="60" autocomplete="off"></label>
        </div>
        ${textInput('name', t('pf.name'), { required: true, ph: t('pf.nameHint'), max: 160 })}
        <label class="field"><span>${t('pf.category')} <i class="req">*</i></span>
          <select data-f="category" id="categorySelect">
            <option value="" ${form.category ? '' : 'selected'} disabled>${t('pf.pickCategory')}</option>
            ${DEPARTMENTS.map((d) => html`<optgroup label="${t(`dept.${d}`)}">${categories.filter((c) => c.department === d).map((c) =>
              html`<option value="${c.slug}" ${c.slug === form.category ? 'selected' : ''}>${catName(c)}${c.is_active ? '' : ` (${t('cats.hiddenNote')})`}</option>`)}</optgroup>`)}
          </select><small class="err-msg" data-err="category"></small></label>
        <div class="grid-2">
          ${textInput('sku', t('pf.sku'), { max: 60 })}
          ${textInput('style_code', t('pf.styleCode'), { max: 40, hint: t('pf.styleHint') })}
        </div>
      </section>

      <section class="card">
        <h2>${t('pf.color')}</h2>
        <div class="grid-2">
          ${textInput('color', t('pf.color'), { ph: t('pf.colorHint'), max: 60 })}
          <label class="field"><span>${t('pf.colorHex')}</span>
            <span class="color-row"><input type="color" id="colorPicker" value="${/^#[0-9a-fA-F]{6}$/.test(form.color_hex) ? form.color_hex : '#888888'}" aria-label="${t('pf.colorHex')}">
              <input data-f="color_hex" value="${form.color_hex}" maxlength="7" placeholder="#1F2A44" autocomplete="off"></span>
            <small class="err-msg" data-err="color_hex"></small></label>
        </div>
        ${select('color_group', t('pf.colorGroup'), COLOR_GROUPS.map((g) => [g, t(`cg.${g}`)]), { blank: true })}
        <div id="coloursBox"></div>
      </section>

      <section class="card">
        <h2>${t('pf.pricing')}</h2>
        <div class="grid-2">
          ${textInput('price', t('pf.price'), { required: true, mode: 'numeric', max: 14 })}
          ${textInput('old_price', t('pf.oldPrice'), { mode: 'numeric', max: 14, hint: t('pf.oldHint') })}
        </div>
        <p class="discount-pill" id="discountPill" hidden></p>
      </section>

      <section class="card">
        <h2>${t('pf.flags')}</h2>
        <div class="flags">${flag('is_active', t('pf.isActive'))}${flag('is_new', t('pf.isNew'))}${flag('is_featured', t('pf.isFeatured'))}</div>
      </section>

      <section class="card">
        <h2>${t('pf.photos')}</h2>
        <p class="muted">${t('pf.photosHint')}</p>
        <div id="photosBox"></div>
      </section>

      <section class="card">
        <h2>${t('pf.sizes')}</h2>
        <p class="muted">${t('pf.sizesHint')}</p>
        <div id="sizesBox"></div>
      </section>

      <section class="card">
        <h2>${t('pf.details')}</h2>
        <div class="grid-2">
          ${textInput('origin', t('pf.origin'), { max: 2, list: 'countryList', hint: t('pf.originHint') })}
          ${select('fit', t('pf.fit'), FITS.map((x) => [x, t(`fit.${x}`)]), { blank: true })}
        </div>
        <datalist id="countryList">${COUNTRIES.map((c) => html`<option value="${c}"></option>`)}</datalist>
        ${textInput('material', t('pf.material'), { max: 160, ph: t('pf.materialHint') })}
        ${textInput('model_info', t('pf.modelInfo'), { max: 160, ph: t('pf.modelHint') })}
        ${textInput('order_lead', t('pf.orderLead'), { max: 8, hint: t('pf.orderLeadHint') })}
      </section>

      <section class="card">
        <h2>${t('pf.texts')}</h2>
        <div class="tabs" role="tablist">
          ${['ru', 'uz', 'en'].map((l, i) => html`<button type="button" role="tab" class="tab ${i === 0 ? 'is-on' : ''}" data-tab="${l}">${l.toUpperCase()}</button>`)}
        </div>
        ${['ru', 'uz', 'en'].map((l, i) => html`<textarea data-f="description_${l}" data-pane="${l}" rows="5" maxlength="4000" ${i === 0 ? '' : 'hidden'}>${form[`description_${l}`]}</textarea>`)}
        <label class="field"><span>${t('pf.tags')}</span>
          <input data-f="tags" value="${form.tags}" autocomplete="off" maxlength="400"><small class="hint">${t('pf.tagsHint')}</small></label>
      </section>

      <section class="card">
        <label class="field"><span>${t('pf.slug')} <i class="req">*</i></span>
          <input data-f="slug" name="slug" value="${form.slug}" autocomplete="off" maxlength="120">
          <small class="err-msg" data-err="slug"></small><small class="hint">${t('pf.slugHint')}</small></label>
        <details class="more"><summary>${t('pf.seo')}</summary>
          ${textInput('seo_title', t('pf.seoTitle'), { max: 120 })}
          <label class="field"><span>${t('pf.seoDesc')}</span><textarea data-f="seo_description" rows="3" maxlength="300">${form.seo_description}</textarea></label>
        </details>
      </section>

      <div class="savebar">
        <p class="form-msg err" id="formMsg" role="alert" hidden></p>
        <div class="savebar-actions">
          ${!isNew && isOwner ? html`<button type="button" class="btn btn-danger-ghost" data-act="delete">${ICON.trash}<span>${t('pf.delete')}</span></button>` : ''}
          <span class="spacer"></span>
          <a class="btn btn-ghost" href="/admin/products">${t('common.cancel')}</a>
          <button type="submit" class="btn btn-gold" id="saveBtn">${t('pf.save')}</button>
        </div>
      </div>
    </form>`;

  const canLeave = async () => {
    if (!isDirty()) return true;
    return confirmDialog({ title: t('pf.leave'), ok: t('common.yes'), danger: true });
  };
  canLeave.dirty = isDirty;

  return {
    title: isNew ? t('pf.newTitle') : form.name || t('pf.editTitle'),
    body,
    canLeave,
    mount(root) {
      const formEl = $('#productForm', root);
      const photosBox = $('#photosBox', root);
      const sizesBox = $('#sizesBox', root);
      const coloursBox = $('#coloursBox', root);
      const msg = $('#formMsg', root);

      /* -- validation display -- */
      const showErrors = (errors) => {
        $$('.err-msg', root).forEach((el) => { el.textContent = ''; });
        $$('.has-error', root).forEach((el) => el.classList.remove('has-error'));
        Object.entries(errors).forEach(([key, code]) => {
          const el = $(`[data-err="${key}"]`, root);
          if (el) el.textContent = t(`pf.err.${code}`);
          const holder = el ? el.closest('.field') || el.closest('td') : null;
          if (holder) holder.classList.add('has-error');
          const m = key.match(/^size\.(\d+)\.(\w+)$/);
          if (m) {
            const inp = $(`[data-size-row="${m[1]}"] [data-sf="${m[2]}"]`, root);
            if (inp) { inp.classList.add('has-error'); inp.title = t(`pf.err.${code}`); }
          }
        });
      };
      const revalidate = () => {
        if (formEl.dataset.touched) showErrors(validateProduct(form).errors);
      };

      /* -- other colours of this item (products that share the style code) -- */
      const renderColours = () => {
        const sibs = colourSiblings(all, form);
        coloursBox.innerHTML = String(html`
          <div class="colours">
            <h3>${t('pf.colours')}</h3>
            ${sibs.length ? html`<ul class="swatches">${sibs.map((s) => html`<li><a href="/admin/products/${s.id}" title="${s.color || s.name}">
                <i class="sw" style="background:${/^#[0-9a-fA-F]{6}$/.test(s.color_hex) ? s.color_hex : '#999'}"></i><span>${s.color || s.name}</span></a></li>`)}</ul>`
              : html`<p class="muted">${t('pf.coloursNone')}</p>`}
            ${isNew ? '' : html`<button type="button" class="btn btn-ghost btn-sm" data-act="add-colour">${ICON.plus}<span>${t('pf.addColour')}</span></button>
              <small class="hint">${t('pf.coloursHint')}</small>`}
          </div>`);
      };

      /* -- photos -- */
      const renderPhotos = () => {
        const tiles = form.images.map((img, i) => html`
          <li class="ptile ${i === 0 ? 'is-main' : ''}" draggable="true" data-i="${i}">
            <img src="${data.photoUrl(img.path, 400)}" alt="" draggable="false">
            ${i === 0 ? html`<span class="ptag">${t('pf.main')}</span>` : ''}
            <div class="ptools">
              ${i > 0 ? html`<button type="button" data-photo="left" data-i="${i}" title="${t('pf.moveLeft')}" aria-label="${t('pf.moveLeft')}">${ICON.left}</button>` : ''}
              ${i > 0 ? html`<button type="button" data-photo="main" data-i="${i}" title="${t('pf.makeMain')}" aria-label="${t('pf.makeMain')}">${ICON.check}</button>` : ''}
              ${i < form.images.length - 1 ? html`<button type="button" data-photo="right" data-i="${i}" title="${t('pf.moveRight')}" aria-label="${t('pf.moveRight')}">${ICON.right}</button>` : ''}
              <button type="button" data-photo="remove" data-i="${i}" title="${t('common.remove')}" aria-label="${t('common.remove')}">${ICON.trash}</button>
            </div>
          </li>`);
        const busy = Array.from({ length: uploading }, () => html`<li class="ptile is-busy" aria-hidden="true"><i class="spin"></i></li>`);
        photosBox.innerHTML = String(html`
          <ul class="pgrid" id="photoGrid">${tiles}${busy}
            <li><label class="pdrop" id="photoDrop">${ICON.image}<span>${t('pf.dropHere')}</span>
              <input type="file" id="photoInput" accept="image/*" multiple hidden></label></li>
          </ul>
          ${form.images.length === 0 && uploading === 0 ? html`<p class="warn">${t('pf.noPhotoWarn')}</p>` : ''}`);
      };

      const addFiles = async (files) => {
        const list = [...files].filter((f) => f && /^image\//.test(f.type || ''));
        if (!list.length) return;
        uploading += list.length;
        renderPhotos();
        for (const file of list) {
          try {
            const r = await data.uploadPhoto(form.id, file);
            form.images.push({ path: r.path });
            sessionUploads.add(r.path);
          } catch (e) {
            toast(e.message === 'too_big' ? t('pf.photoBig', { name: file.name }) : e.message === 'not_image' || e.code === 'unknown' || !e.code
              ? t('pf.photoBad', { name: file.name }) : errorText(e), 'err');
          } finally {
            uploading -= 1;
            renderPhotos();
          }
        }
      };

      photosBox.addEventListener('change', (e) => {
        if (e.target.id === 'photoInput') { addFiles(e.target.files); e.target.value = ''; }
      });
      photosBox.addEventListener('click', (e) => {
        const b = e.target.closest('[data-photo]');
        if (!b) return;
        const i = Number(b.dataset.i);
        const kind = b.dataset.photo;
        if (kind === 'left') form.images = moveItem(form.images, i, i - 1);
        if (kind === 'right') form.images = moveItem(form.images, i, i + 1);
        if (kind === 'main') form.images = moveItem(form.images, i, 0);
        if (kind === 'remove') {
          const [gone] = form.images.splice(i, 1);
          // a photo that was only just uploaded and never saved can go straight away
          if (sessionUploads.has(gone.path) && !originalPaths.has(gone.path)) {
            sessionUploads.delete(gone.path);
            data.deletePhotos([gone.path]);
          }
        }
        renderPhotos();
      });
      // drag & drop: files from the desktop, and reordering tiles
      let dragFrom = null;
      photosBox.addEventListener('dragstart', (e) => {
        const tile = e.target.closest('.ptile[data-i]');
        if (tile) { dragFrom = Number(tile.dataset.i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); }
      });
      photosBox.addEventListener('dragover', (e) => { e.preventDefault(); });
      photosBox.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length) { addFiles(e.dataTransfer.files); return; }
        const tile = e.target.closest('.ptile[data-i]');
        if (dragFrom != null && tile) {
          form.images = moveItem(form.images, dragFrom, Number(tile.dataset.i));
          renderPhotos();
        }
        dragFrom = null;
      });

      /* -- sizes: one row per label, in the order the shop shows them -- */
      const currentSystem = () => systemOfCategory(categories, form.category);
      // add the labels of a size system that are not there yet, keeping the system's own order
      const addSystem = (id) => {
        const have = new Set(form.sizes.map((s) => s.label));
        const fresh = sizeRows(id).filter((r) => !have.has(r.label)).map((r) => ({ ...r, dirty: true }));
        const order = SIZE_SYSTEMS[id];
        const merged = [...form.sizes, ...fresh];
        const rank = (s) => (order.includes(s.label) ? order.indexOf(s.label) : 1000);
        // rows of this system line up in its order; custom labels keep their place after them
        form.sizes = merged.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s);
      };
      const renderSizes = () => {
        const others = all.filter((p) => p.id !== form.id && p.sizes.length);
        const sys = currentSystem();
        sizesBox.innerHTML = String(html`
          ${form.sizes.length ? html`<table class="sizes"><thead><tr>
              <th>${t('pf.label')}</th><th>${t('pf.qty')}</th><th title="${t('pf.orderableHint')}">${t('pf.orderable')}</th><th></th></tr></thead>
            <tbody>${form.sizes.map((s, i) => html`<tr data-size-row="${i}">
              <td><input data-sf="label" value="${s.label}" maxlength="12" aria-label="${t('pf.label')}" ${s.id ? 'readonly' : ''}></td>
              <td><input data-sf="stock" value="${s.stock}" inputmode="numeric" aria-label="${t('pf.qty')}" class="qty-in"></td>
              <td><label class="switch tight"><input type="checkbox" data-sf="orderable" ${s.orderable ? 'checked' : ''} aria-label="${t('pf.orderableHint')}"><span class="sr-only">${t('pf.orderable')}</span></label></td>
              <td class="row-tools">
                <button type="button" class="icon-btn" data-size-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('pf.moveUp')}" title="${t('pf.moveUp')}">${ICON.up || '↑'}</button>
                <button type="button" class="icon-btn" data-size-move="${i}" data-dir="1" ${i === form.sizes.length - 1 ? 'disabled' : ''} aria-label="${t('pf.moveDown')}" title="${t('pf.moveDown')}">${ICON.down || '↓'}</button>
                <button type="button" class="icon-btn" data-size-remove="${i}" aria-label="${t('common.remove')}">${ICON.x}</button>
                <small class="err-msg" data-err="size.${i}.label"></small><small class="err-msg" data-err="size.${i}.stock"></small></td>
            </tr>`)}</tbody></table>` : html`<p class="muted">${t('pf.noSizes')}</p>`}
          <div class="size-tools">
            <span class="muted">${t('pf.preset')}</span>
            ${SIZE_SYSTEM_IDS.map((id) => html`<button type="button" class="chip-btn ${id === sys && form.category ? 'is-suggested' : ''}" data-preset="${id}">${t(`sys.${id}`)}</button>`)}
            <button type="button" class="btn btn-ghost btn-sm" data-act="add-size">${ICON.plus}<span>${t('pf.addSize')}</span></button>
            ${others.length ? html`<select id="copySizes" aria-label="${t('pf.copySizes')}"><option value="">${t('pf.copySizes')}</option>
              ${others.map((p) => html`<option value="${p.id}">${p.name}${p.color ? ` · ${p.color}` : ''}</option>`)}</select>` : ''}
          </div>`);
      };

      sizesBox.addEventListener('input', (e) => {
        const inp = e.target.closest('[data-sf]');
        if (!inp || inp.type === 'checkbox') return;
        const row = form.sizes[Number(inp.closest('tr').dataset.sizeRow)];
        row[inp.dataset.sf] = inp.dataset.sf === 'label' ? inp.value.trim() : inp.value;
        if (inp.dataset.sf === 'stock') row.dirty = true;
        inp.classList.remove('has-error');
      });
      sizesBox.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-size-remove]');
        if (rm) { form.sizes.splice(Number(rm.dataset.sizeRemove), 1); renderSizes(); revalidate(); return; }
        const mv = e.target.closest('[data-size-move]');
        if (mv) {
          const i = Number(mv.dataset.sizeMove);
          form.sizes = moveItem(form.sizes, i, i + Number(mv.dataset.dir));
          renderSizes();
          return;
        }
        const add = e.target.closest('[data-act=add-size]');
        if (add) {
          form.sizes.push({ label: '', stock: '', orderable: true, dirty: true });
          renderSizes();
          const last = $$('[data-size-row]', sizesBox).pop();
          if (last) $('[data-sf=label]', last).focus();
          return;
        }
        const pre = e.target.closest('[data-preset]');
        if (pre) { addSystem(pre.dataset.preset); renderSizes(); revalidate(); }
      });
      sizesBox.addEventListener('change', (e) => {
        const box = e.target.closest('[data-sf=orderable]');
        if (box) { form.sizes[Number(box.closest('tr').dataset.sizeRow)].orderable = box.checked; return; }
        if (e.target.id !== 'copySizes' || !e.target.value) return;
        const src = all.find((p) => p.id === e.target.value);
        if (!src) return;
        const have = new Set(form.sizes.map((s) => s.label));
        src.sizes.forEach((s) => {
          if (!have.has(s.label)) form.sizes.push({ label: s.label, stock: '0', orderable: s.orderable !== false, dirty: true });
        });
        renderSizes();
      });

      /* -- plain fields -- */
      const discount = () => {
        const pill = $('#discountPill', root);
        const pct = discountPct(parseMoney(form.price), parseMoney(form.old_price));
        pill.hidden = !pct;
        pill.textContent = pct ? t('pf.discount', { n: pct }) : '';
      };
      const slugInput = () => $('[data-f=slug]', root);
      // the page address follows brand + name + colour until the owner edits it by hand
      const suggestSlug = () => {
        if (form.slugTouched) return;
        const brand = form.brand_id ? (brands.find((b) => b.id === form.brand_id) || {}).name : form.brand_name;
        form.slug = slugify([brand, form.name, form.color].filter(Boolean).join(' '));
        slugInput().value = form.slug;
      };
      const picker = $('#colorPicker', root);

      formEl.addEventListener('input', (e) => {
        const el = e.target.closest('[data-f]');
        if (el) {
          const key = el.dataset.f;
          form[key] = el.type === 'checkbox' ? el.checked : el.value;
          if (key === 'name' || key === 'color') suggestSlug();
          if (key === 'slug') form.slugTouched = true;
          if (key === 'price' || key === 'old_price') discount();
          if (key === 'color_hex' && /^#[0-9a-fA-F]{6}$/.test(el.value)) picker.value = el.value;
          if (key === 'style_code') renderColours();
          revalidate();
          return;
        }
        if (e.target === picker) {
          form.color_hex = picker.value.toUpperCase();
          $('[data-f=color_hex]', root).value = form.color_hex;
          revalidate();
        }
      });
      formEl.addEventListener('change', (e) => {
        const el = e.target.closest('[data-f]');
        if (el && el.type === 'checkbox') form[el.dataset.f] = el.checked;
        if (el && el.tagName === 'SELECT') form[el.dataset.f] = el.value;
        if (e.target.id === 'categorySelect') {
          // a product without sizes gets the usual set of its category
          if (!form.sizes.length && form.category) { addSystem(currentSystem()); }
          renderSizes();
        }
        if (e.target.id === 'brandSelect') {
          const v = e.target.value;
          $('#newBrandBox', root).hidden = v !== '__new__';
          form.brand_id = v === '__new__' ? '' : v;
          if (v !== '__new__') form.brand_name = '';
          suggestSlug();
          revalidate();
        }
      });
      formEl.addEventListener('focusout', (e) => {
        const el = e.target.closest('[data-f]');
        if (!el) return;
        if (el.dataset.f === 'price' || el.dataset.f === 'old_price') {
          const n = parseMoney(el.value);
          el.value = n == null ? '' : fmtMoney(n);
          form[el.dataset.f] = el.value;
          discount();
        }
        if (el.dataset.f === 'slug') {
          el.value = form.slug = slugify(el.value) || slugify(form.name);
        }
        if (el.dataset.f === 'origin') el.value = form.origin = el.value.trim().toUpperCase();
        if (el.dataset.f === 'color_hex' && /^#?[0-9a-fA-F]{6}$/.test(el.value.trim())) {
          el.value = form.color_hex = `#${el.value.trim().replace('#', '').toUpperCase()}`;
          picker.value = form.color_hex;
        }
      });
      $$('.tab', root).forEach((b) => b.addEventListener('click', () => {
        $$('.tab', root).forEach((x) => x.classList.toggle('is-on', x === b));
        $$('[data-pane]', root).forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
      }));

      /* -- save / delete -- */
      const setBusy = (on) => {
        saving = on;
        const b = $('#saveBtn', root);
        b.disabled = on;
        b.textContent = on ? t('pf.saving') : t('pf.save');
      };
      const say = (text) => { msg.textContent = text; msg.hidden = !text; };

      // Saves the form (validated). Returns the saved { id, slug }, or null when something is wrong.
      const save = async () => {
        formEl.dataset.touched = '1';
        say('');
        const { ok, errors } = validateProduct(form);
        showErrors(errors);
        if (!ok) {
          say(t('pf.fixErrors'));
          const first = $('.has-error, .err-msg:not(:empty)', root);
          if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return null;
        }
        setBusy(true);
        try {
          const saved = await data.saveProduct(toPayload(form));
          const removed = [...originalPaths].filter((p) => !form.images.some((i) => i.path === p) && isUploadedPath(p));
          if (removed.length) await data.deletePhotos(removed);
          sessionUploads.clear();
          original = snapshot();
          if (tagOriginal) {
            // the product this colour was made from gets the same style code, so the two are linked
            await data.setStyleCode(tagOriginal.id, form.style_code).catch(() => {});
            tagOriginal = null;
          }
          return saved;
        } catch (err) {
          setBusy(false);
          if (err.code === 'slug_taken') {
            showErrors({ slug: 'duplicate' });
            const el = $('[data-err=slug]', root);
            if (el) el.textContent = t('pf.slugTaken');
            say(t('pf.slugTaken'));
          } else if (err.code === 'invalid') {
            say(t('pf.fixErrors'));
          } else {
            say(errorText(err));
          }
          return null;
        }
      };

      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (saving || uploading) return;
        const saved = await save();
        if (!saved) return;
        toast(t('pf.saved'));
        if (isNew) await go(`/admin/products/${saved.id}`, { replace: true, force: true });
        else await go(location.pathname, { force: true });
      });

      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-act=add-colour]')) {
          if (saving || uploading) return;
          // save first so the copy starts from what is on screen; a product without a style code gets one
          if (!form.style_code) {
            form.style_code = duplicateAsColour(form).style_code;
            $('[data-f=style_code]', root).value = form.style_code;
          }
          if (isDirty()) {
            const saved = await save();
            if (!saved) return;
          }
          await go(`/admin/products/new?from=${form.id}`, { force: true });
          return;
        }
        if (!e.target.closest('[data-act=delete]')) return;
        const used = await data.productOrderCount(form.id).catch(() => 0);
        const ok = await confirmDialog({
          title: t('pf.deleteTitle', { name: form.name }),
          text: `${t('pf.deleteText')}${used ? ` ${t('pf.deleteHint')}` : ''}`,
          ok: t('pf.delete'), danger: true,
        });
        if (!ok) return;
        try {
          await data.deleteProduct(form.id);
          original = snapshot();
          toast(t('pf.deleted'));
          await go('/admin/products', { force: true });
        } catch (err) {
          toast(errorText(err), 'err');
        }
      });

      renderColours();
      renderPhotos();
      renderSizes();
      discount();
      // price fields show grouped digits from the start
      ['price', 'old_price'].forEach((k) => {
        const n = parseMoney(form[k]);
        const el = $(`[data-f=${k}]`, root);
        if (el && n != null) { el.value = fmtMoney(n); form[k] = el.value; }
      });
      original = snapshot();

      // leaving without saving: files uploaded in this visit are orphans — remove them
      return () => {
        const orphans = [...sessionUploads].filter((p) => !originalPaths.has(p));
        if (orphans.length && isDirty()) data.deletePhotos(orphans);
      };
    },
  };
}
