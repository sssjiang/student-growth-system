import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components';
import { formatFileSize } from '@/utils/files';

const TYPES = [
  '学科竞赛',
  '体育赛事',
  '艺术活动',
  '志愿服务',
  '技能证书',
  '校内荣誉',
  '其他',
];

function CredentialForm({ credential, loading, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: credential?.title || '',
    credential_type: credential?.credential_type || '',
    issuer: credential?.issuer || '',
    awarded_at: credential?.awarded_at || '',
    description: credential?.description || '',
  });
  const [error, setError] = useState('');

  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const chooseFile = (event) => {
    const nextFile = event.target.files[0];
    if (nextFile && nextFile.size > 10 * 1024 * 1024) {
      setError(t('credentialForm.tooLarge'));
      return;
    }
    setError('');
    setFile(nextFile || null);
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.credential_type) {
      setError(t('credentialForm.required'));
      return;
    }
    if (!credential && !file) {
      setError(t('credentialForm.fileRequired'));
      return;
    }
    onSubmit(file, form);
  };

  return (
    <form className="credential-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label={t('credentialForm.title')}>
          <input
            name="title"
            value={form.title}
            onChange={update}
            placeholder={t('credentialForm.titleExample')}
          />
        </Field>
        <Field label={t('credentialForm.type')}>
          <select
            name="credential_type"
            value={form.credential_type}
            onChange={update}
          >
            <option value="">{t('common.select')}</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`credentialTypes.${type}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('credentialForm.issuer')}>
          <input
            name="issuer"
            value={form.issuer}
            onChange={update}
            placeholder={t('credentialForm.issuerPlaceholder')}
          />
        </Field>
        <Field label={t('credentialForm.date')}>
          <input
            name="awarded_at"
            type="date"
            value={form.awarded_at}
            onChange={update}
          />
        </Field>
      </div>
      <Field label={t('credentialForm.description')}>
        <textarea
          name="description"
          value={form.description}
          onChange={update}
          placeholder={t('credentialForm.descriptionPlaceholder')}
        />
      </Field>
      <label className="credential-file-picker">
        <FileUp size={22} />
        <span>
          <b>
            {file?.name ||
              (credential
                ? t('credentialForm.keepOrReplace')
                : t('credentialForm.chooseFile'))}
          </b>
          <small>
            {file ? formatFileSize(file.size) : t('credentialForm.fileHint')}
          </small>
        </span>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          hidden
          onChange={chooseFile}
        />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="primary" disabled={loading}>
          {loading
            ? t('credentialForm.submitting')
            : t(
                credential ? 'credentialForm.resubmit' : 'credentialForm.submit'
              )}
        </button>
      </div>
    </form>
  );
}

export default CredentialForm;
