import { useQueryError } from '@/hooks/useQueryError';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/api';
import { useState } from 'react';
import { Check, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Empty, Field, PageTitle } from '@/components';
import { useToast } from '@/hooks/useToast';

function ProfilePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { data, error } = useGetProfileQuery();
  const savedProfile = data?.student;
  const [draft, setDraft] = useState(null);
  const form = draft || savedProfile;
  const editing = draft !== null;
  const [newTag, setNewTag] = useState('');
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  useQueryError(error);
  if (!form) return <Empty>{t('profile.loading')}</Empty>;
  const startEditing = () => {
    setDraft({ ...savedProfile, tags: [...savedProfile.tags] });
  };
  const update = (event) =>
    setDraft({ ...form, [event.target.name]: event.target.value });
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !form.tags.includes(tag))
      setDraft({ ...form, tags: [...form.tags, tag] });
    setNewTag('');
  };
  const save = async () => {
    try {
      await updateProfile(draft).unwrap();
      setDraft(null);
      setNewTag('');
      notify(t('profile.saved'));
    } catch (err) {
      notify(err);
    }
  };
  const cancelEditing = () => {
    setDraft(null);
    setNewTag('');
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
                <button
                  className="secondary"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X size={17} />
                  {t('common.cancel')}
                </button>
                <button className="primary" onClick={save} disabled={saving}>
                  <Check size={17} />
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </>
            ) : (
              <button className="primary" onClick={startEditing}>
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
                disabled={!editing || saving}
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
                disabled={!editing || saving}
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
                disabled={!editing || saving}
              />
            </Field>
            <Field label={t('profile.class')}>
              <input
                name="class_name"
                value={form.class_name}
                onChange={update}
                disabled={!editing || saving}
              />
            </Field>
            <Field label={t('profile.birthday')}>
              <input
                name="birthday"
                type="date"
                value={form.birthday}
                onChange={update}
                disabled={!editing || saving}
              />
            </Field>
            <Field label={t('profile.email')}>
              <input
                name="email"
                value={form.email}
                onChange={update}
                disabled={!editing || saving}
              />
            </Field>
            <Field label={t('profile.phone')}>
              <input
                name="phone"
                value={form.phone}
                onChange={update}
                disabled={!editing || saving}
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
                    disabled={saving}
                    onClick={() =>
                      setDraft({
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
                disabled={saving}
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
              <button
                disabled={saving}
                onClick={addTag}
                aria-label={t('profile.addTag')}
              >
                <Plus />
              </button>
            </div>
          )}
          <Field label={t('profile.aboutInterests')}>
            <textarea
              name="interest_description"
              value={form.interest_description}
              onChange={update}
              disabled={!editing || saving}
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
              disabled={!editing || saving}
            />
          </Field>
        </section>
      </div>
    </>
  );
}

export default ProfilePage;
