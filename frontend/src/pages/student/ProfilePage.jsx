import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StudentAPI } from '@/api';
import { Empty, Field, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function ProfilePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [form, setForm] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    StudentAPI.getProfile().then((data) => {
      const profile = { ...data.student, tags: [...data.student.tags] };
      setForm(profile);
      setSavedProfile(profile);
    });
  }, []);
  if (!form) return <Empty>{t('profile.loading')}</Empty>;
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !form.tags.includes(tag))
      setForm({ ...form, tags: [...form.tags, tag] });
    setNewTag('');
  };
  const save = async () => {
    setSaving(true);
    try {
      const data = await StudentAPI.updateProfile(form);
      const profile = { ...data.student, tags: [...data.student.tags] };
      setForm(profile);
      setSavedProfile(profile);
      setEditing(false);
      setNewTag('');
      notify(t('profile.saved'));
    } catch (err) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };
  const cancelEditing = () => {
    setForm({ ...savedProfile, tags: [...savedProfile.tags] });
    setNewTag('');
    setEditing(false);
  };
  return (
    <>
      <PageTitle
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
        action={
          <div className="profile-actions">
            {editing ? (
              <>
                <button className="secondary" onClick={cancelEditing}>
                  <X size={17} />
                  {t('common.cancel')}
                </button>
                <button className="primary" onClick={save} disabled={saving}>
                  <Check size={17} />
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </>
            ) : (
              <button className="primary" onClick={() => setEditing(true)}>
                <Pencil size={17} />
                {t('common.edit')}
              </button>
            )}
          </div>
        }
      />
      <div className="profile-grid">
        <section className="card">
          <h3>{t('profile.basic')}</h3>
          <div className="form-grid">
            <Field label={t('profile.name')}>
              <input
                name="name"
                value={form.name}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label={t('profile.studentNo')}>
              <input value={form.student_no} disabled />
            </Field>
            <Field label={t('profile.gender')}>
              <select
                name="gender"
                value={form.gender}
                onChange={update}
                disabled={!editing}
              >
                <option value="">{t('common.select')}</option>
                <option value="男">{t('profile.male')}</option>
                <option value="女">{t('profile.female')}</option>
              </select>
            </Field>
            <Field label={t('profile.grade')}>
              <input
                name="grade"
                value={form.grade}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label={t('profile.class')}>
              <input
                name="class_name"
                value={form.class_name}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label={t('profile.birthday')}>
              <input
                name="birthday"
                type="date"
                value={form.birthday}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label={t('profile.email')}>
              <input
                name="email"
                value={form.email}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label={t('profile.phone')}>
              <input
                name="phone"
                value={form.phone}
                onChange={update}
                disabled={!editing}
              />
            </Field>
          </div>
        </section>
        <section className="card interests-card">
          <div className="section-icon">
            <Sparkles />
          </div>
          <h3>{t('profile.interests')}</h3>
          <p>{t('profile.interestHint')}</p>
          <div className="editable-tags">
            {form.tags.map((tag) => (
              <span key={tag}>
                {tag}
                {editing && (
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: form.tags.filter((item) => item !== tag),
                      })
                    }
                    aria-label={t('profile.removeTag', { tag })}
                  >
                    <X />
                  </button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="tag-input">
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t('profile.tagPlaceholder')}
              />
              <button onClick={addTag} aria-label={t('profile.addTag')}>
                <Plus />
              </button>
            </div>
          )}
          <Field label={t('profile.aboutInterests')}>
            <textarea
              name="interest_description"
              value={form.interest_description}
              onChange={update}
              disabled={!editing}
              placeholder={t('profile.interestPlaceholder')}
            />
          </Field>
        </section>
        <section className="card full">
          <h3>{t('profile.bio')}</h3>
          <Field label={t('profile.bioLabel')}>
            <textarea
              name="bio"
              value={form.bio}
              onChange={update}
              disabled={!editing}
            />
          </Field>
        </section>
      </div>
    </>
  );
}

export default ProfilePage;
