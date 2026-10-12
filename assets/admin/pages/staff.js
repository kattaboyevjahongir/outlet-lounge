// Staff accounts (owner): add a person with a username and password, reset a password, change a
// role, switch someone off. Everything goes through /api/admin-staff (it needs the service key).
import { html, $, $$ } from '../dom.js';
import { t } from '../i18n.js';
import { usernameProblem, passwordProblem, generatePassword } from '../logic.js';
import { ICON, toast, errorText, confirmDialog, dateTime, deniedPage } from '../ui.js';

const randomPassword = () => generatePassword(crypto.getRandomValues(new Uint8Array(16)));

// a server / validation error → text next to the right field
function staffError(e) {
  if (e.code === 'username_taken') return t('staff.taken');
  if (e.code === 'self') return t('staff.self');
  if (e.code === 'last_owner') return t('staff.lastOwner');
  if (e.code === 'invalid') {
    const reason = e.info && e.info.reason;
    if (reason === 'short') return t('auth.tooShort');
    if (reason === 'weak') return t('auth.weak');
    if (e.info && e.info.field === 'username') return t('auth.badUsername');
    return t('pf.fixErrors');
  }
  return errorText(e);
}

export default async function page({ data, me, go }) {
  if (me.role !== 'owner') return { title: t('staff.title'), body: deniedPage() };
  const list = await data.listStaff();
  const meId = (await data.getSession()).user.id;

  const row = (s) => html`
    <li class="staff-row ${s.is_active ? '' : 'is-off'}" data-id="${s.user_id}">
      <div class="staff-main">
        <b>${s.name}</b>${s.user_id === meId ? html` <span class="chip">${t('staff.you')}</span>` : ''}
        <small>${s.username || '—'} · ${s.last_login ? `${t('staff.lastLogin')}: ${dateTime(s.last_login)}` : t('staff.never')}</small>
      </div>
      <div class="staff-state"><span class="badge ${s.is_active ? 'sv-ok' : 'sv-hidden'}">${s.is_active ? t('staff.active') : t('staff.inactive')}</span></div>
      <div class="staff-role">
        <select data-role aria-label="${t('staff.role')}" ${s.user_id === meId ? 'disabled' : ''}>
          ${['manager', 'owner'].map((r) => html`<option value="${r}" ${r === s.role ? 'selected' : ''}>${t(`role.${r}`)}</option>`)}
        </select>
      </div>
      <div class="staff-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-pw>${ICON.copy}<span>${t('staff.resetPassword')}</span></button>
        ${s.user_id === meId ? '' : html`<button type="button" class="btn btn-ghost btn-sm" data-toggle>${s.is_active ? t('staff.deactivate') : t('staff.activate')}</button>`}
      </div>
      <form class="staff-pw" hidden novalidate>
        <input name="password" autocomplete="new-password" placeholder="${t('staff.password')}" aria-label="${t('staff.password')}">
        <button type="button" class="btn btn-ghost btn-sm" data-gen>${t('staff.generate')}</button>
        <button type="submit" class="btn btn-gold btn-sm">${t('staff.setPassword')}</button>
        <small class="err-msg" data-err></small>
      </form>
    </li>`;

  const body = html`
    <div class="page-head"><div><h1>${t('staff.title')}</h1><p class="muted">${t('staff.roleHelp')}</p></div>
      <button type="button" class="btn btn-gold" id="addToggle">${ICON.plus}<span>${t('staff.add')}</span></button></div>

    <section class="card" id="addCard" hidden>
      <h2>${t('staff.add')}</h2>
      <form id="addForm" class="stack" novalidate>
        <div class="grid-2">
          <label class="field"><span>${t('staff.name')}</span><input name="name" autocomplete="off" maxlength="60"></label>
          <label class="field"><span>${t('staff.username')}</span><input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="32"></label>
        </div>
        <div class="grid-2">
          <label class="field"><span>${t('staff.role')}</span>
            <select name="role"><option value="manager">${t('role.manager')}</option><option value="owner">${t('role.owner')}</option></select></label>
          <label class="field"><span>${t('staff.password')}</span>
            <div class="inline-input"><input name="password" autocomplete="new-password" spellcheck="false">
              <button type="button" class="btn btn-ghost btn-sm" data-gen>${t('staff.generate')}</button></div></label>
        </div>
        <p class="muted">${t('staff.hint')}</p>
        <p class="form-msg err" id="addMsg" role="alert" hidden></p>
        <div class="btn-row"><button class="btn btn-gold" type="submit">${t('staff.add')}</button></div>
      </form>
    </section>

    <ul class="card staff-list">${list.map(row)}</ul>`;

  return {
    title: t('staff.title'),
    body,
    mount(root) {
      const reload = () => go(location.pathname, { force: true });
      const addCard = $('#addCard', root);
      $('#addToggle', root).addEventListener('click', () => {
        addCard.hidden = !addCard.hidden;
        if (!addCard.hidden) $('input[name=name]', addCard).focus();
      });

      /* ---- add ---- */
      const addForm = $('#addForm', root);
      const msg = $('#addMsg', root);
      const say = (s) => { msg.textContent = s; msg.hidden = !s; };
      addForm.addEventListener('click', (e) => {
        if (e.target.closest('[data-gen]')) addForm.password.value = randomPassword();
      });
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        say('');
        const f = Object.fromEntries(new FormData(addForm));
        const name = String(f.name).trim();
        if (name.length < 2) return say(t('pf.err.required'));
        if (usernameProblem(f.username)) return say(t('auth.badUsername'));
        const pw = passwordProblem(f.password);
        if (pw) return say(pw === 'short' ? t('auth.tooShort') : t('auth.weak'));
        const btn = $('button[type=submit]', addForm);
        btn.disabled = true;
        try {
          await data.staffAction({ action: 'create', name, username: String(f.username).trim().toLowerCase(), role: f.role, password: f.password });
          // the only time the password is visible: show it once, copyable
          const text = `${t('auth.username')}: ${String(f.username).trim().toLowerCase()}\n${t('auth.password')}: ${f.password}`;
          try { await navigator.clipboard.writeText(text); } catch { /* the owner can copy it by hand */ }
          await confirmDialog({ title: t('staff.created'), text, ok: t('common.close') });
          await reload();
        } catch (err) {
          say(staffError(err));
          btn.disabled = false;
        }
      });

      /* ---- per-row actions ---- */
      root.addEventListener('click', async (e) => {
        const li = e.target.closest('.staff-row');
        if (!li) return;
        const id = li.dataset.id;
        const s = list.find((x) => x.user_id === id);
        if (e.target.closest('[data-pw]')) {
          const form = $('.staff-pw', li);
          form.hidden = !form.hidden;
          if (!form.hidden) form.password.focus();
          return;
        }
        if (e.target.closest('[data-gen]')) {
          $('.staff-pw input', li).value = randomPassword();
          return;
        }
        if (e.target.closest('[data-toggle]')) {
          if (s.is_active) {
            const ok = await confirmDialog({ title: t('staff.confirmTitle', { name: s.name }), text: t('staff.confirmText'), ok: t('staff.deactivate'), danger: true });
            if (!ok) return;
          }
          try {
            await data.staffAction({ action: 'update', user_id: id, is_active: !s.is_active });
            toast(t('staff.updated'));
            await reload();
          } catch (err) { toast(staffError(err), 'err'); }
        }
      });
      root.addEventListener('change', async (e) => {
        const sel = e.target.closest('[data-role]');
        if (!sel) return;
        const li = sel.closest('.staff-row');
        try {
          await data.staffAction({ action: 'update', user_id: li.dataset.id, role: sel.value });
          toast(t('staff.updated'));
          await reload();
        } catch (err) { toast(staffError(err), 'err'); await reload(); }
      });
      root.addEventListener('submit', async (e) => {
        const form = e.target.closest('.staff-pw');
        if (!form) return;
        e.preventDefault();
        const li = form.closest('.staff-row');
        const err = $('[data-err]', form);
        const pw = passwordProblem(form.password.value);
        if (pw) { err.textContent = pw === 'short' ? t('auth.tooShort') : t('auth.weak'); return; }
        err.textContent = '';
        const s = list.find((x) => x.user_id === li.dataset.id);
        try {
          await data.staffAction({ action: 'password', user_id: s.user_id, password: form.password.value });
          const text = `${t('auth.username')}: ${s.username || ''}\n${t('auth.password')}: ${form.password.value}`;
          try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
          form.hidden = true;
          form.password.value = '';
          await confirmDialog({ title: t('staff.passwordChanged'), text, ok: t('common.close') });
        } catch (e2) { err.textContent = staffError(e2); }
      });
      $$('.staff-pw', root); // (forms start hidden)
    },
  };
}
