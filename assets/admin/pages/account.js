// My profile: who I am, and change my own password.
import { html, $ } from '../dom.js';
import { t } from '../i18n.js';
import { passwordProblem } from '../logic.js';
import { toast, errorText } from '../ui.js';

export default async function page({ data, me }) {
  const session = await data.getSession();
  const username = me.username || '';

  const body = html`
    <div class="page-head"><div><h1>${t('acc.title')}</h1><p class="muted">${me.name} · ${t(`role.${me.role}`)}${username ? ` · ${username}` : ''}</p></div></div>
    <section class="card pform">
      <h2>${t('acc.change')}</h2>
      <form id="pwForm" class="stack" novalidate>
        <input type="text" name="username" value="${username}" autocomplete="username" hidden>
        <label class="field"><span>${t('acc.current')}</span><input type="password" name="current" autocomplete="current-password"></label>
        <label class="field"><span>${t('acc.new')}</span><input type="password" name="next" autocomplete="new-password"><small class="hint">${t('auth.setText')}</small></label>
        <label class="field"><span>${t('acc.repeat')}</span><input type="password" name="again" autocomplete="new-password"></label>
        <p class="form-msg err" id="pwMsg" role="alert" hidden></p>
        <div class="btn-row"><button class="btn btn-gold" type="submit">${t('acc.change')}</button></div>
      </form>
    </section>`;

  return {
    title: t('acc.title'),
    body,
    mount(root) {
      const form = $('#pwForm', root);
      const msg = $('#pwMsg', root);
      const say = (s) => { msg.textContent = s; msg.hidden = !s; };
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        say('');
        const problem = passwordProblem(form.next.value);
        if (!form.current.value) return say(t('acc.wrongCurrent'));
        if (problem) return say(problem === 'short' ? t('auth.tooShort') : t('auth.weak'));
        if (form.next.value !== form.again.value) return say(t('auth.mismatch'));
        const btn = $('button[type=submit]', form);
        btn.disabled = true;
        try {
          await data.changePassword(username || (session && session.user && session.user.email), form.current.value, form.next.value);
          form.reset();
          toast(t('acc.changed'));
        } catch (err) {
          say(err.code === 'wrong_password' ? t('acc.wrongCurrent') : err.code === 'weak_password' ? t('auth.weak') : errorText(err));
        } finally { btn.disabled = false; }
      });
    },
  };
}
