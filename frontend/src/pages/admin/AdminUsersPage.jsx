import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminAPI } from '@/api';
import { PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function AdminUsersPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'teacher',
  });
  const load = () => AdminAPI.getUsers().then((data) => setUsers(data.users));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await AdminAPI.createUser(form);
      setForm({
        username: '',
        password: '',
        display_name: '',
        role: 'teacher',
      });
      notify(t('admin.users.created'));
      await load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow={t('admin.users.eyebrow')}
        title={t('admin.users.title')}
        description={t('admin.users.description')}
      />
      <div className="admin-two-column">
        <form className="card admin-create-user" onSubmit={submit}>
          <div className="card-head">
            <UserPlus />
            <div>
              <h3>{t('admin.users.add')}</h3>
              <p>{t('admin.users.addHint')}</p>
            </div>
          </div>
          <label className="field">
            <span>{t('admin.fields.role')}</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value })
              }
            >
              <option value="teacher">{t('admin.roles.teacher')}</option>
              <option value="admin">{t('admin.roles.admin')}</option>
            </select>
          </label>
          <label className="field">
            <span>{t('admin.fields.displayName')}</span>
            <input
              required
              value={form.display_name}
              onChange={(event) =>
                setForm({ ...form, display_name: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>{t('admin.fields.username')}</span>
            <input
              required
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>{t('admin.fields.password')}</span>
            <input
              required
              minLength={6}
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>
          <button className="primary wide" disabled={saving}>
            <UserPlus size={17} />
            {saving ? t('common.saving') : t('admin.users.create')}
          </button>
        </form>
        <section className="card admin-panel">
          <div className="card-head">
            <div>
              <h3>{t('admin.users.accounts')}</h3>
              <p>{t('admin.users.count', { count: users.length })}</p>
            </div>
          </div>
          <div className="admin-user-list">
            {users.map((user) => (
              <article key={`${user.role}-${user.id}`}>
                <span className={`admin-role-icon ${user.role}`}>
                  <ShieldCheck />
                </span>
                <div>
                  <b>{user.display_name}</b>
                  <small>
                    @{user.username} · {t(`admin.roles.${user.role}`)}
                  </small>
                </div>
                <time>{user.created_at?.slice(0, 10)}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default AdminUsersPage;
