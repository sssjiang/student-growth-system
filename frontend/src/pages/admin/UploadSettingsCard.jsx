import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetUploadLimitsQuery, useUpdateUploadLimitsMutation } from '@/api';
import { useQueryError } from '@/hooks/useQueryError';
import { useToast } from '@/hooks/useToast';

const CATEGORIES = ['credential', 'knowledge', 'grades'];

export default function UploadSettingsCard() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { data, error } = useGetUploadLimitsQuery();
  const [draft, setDraft] = useState(null);
  const [updateLimits, { isLoading: saving }] = useUpdateUploadLimitsMutation();
  useQueryError(error);
  const limits = draft || data?.upload_limits;
  const submit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(
      CATEGORIES.map((key) => [key, Number(limits[key])])
    );
    if (
      Object.values(values).some(
        (value) =>
          !Number.isInteger(value) || value < data.min_mb || value > data.max_mb
      )
    ) {
      notify(t('uploadSettings.invalid'));
      return;
    }
    try {
      await updateLimits(values).unwrap();
      setDraft(null);
      notify(t('uploadSettings.saved'));
    } catch (error) {
      notify(error);
    }
  };
  return (
    <form className="card config-card upload-settings" onSubmit={submit}>
      <header>
        <Upload />
        <div>
          <h3>{t('uploadSettings.title')}</h3>
          <p>{t('uploadSettings.description')}</p>
        </div>
      </header>
      {!limits ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          {CATEGORIES.map((key) => (
            <label className="field" key={key}>
              <span>{t(`uploadSettings.${key}`)}</span>
              <input
                name={key}
                type="number"
                min={data.min_mb}
                max={data.max_mb}
                step="1"
                required
                value={limits[key]}
                disabled={saving}
                onChange={(event) =>
                  setDraft({ ...limits, [key]: event.target.value })
                }
              />
            </label>
          ))}
          <p>
            {t('uploadSettings.range', { min: data.min_mb, max: data.max_mb })}
          </p>
          <button className="primary" disabled={saving}>
            {t(saving ? 'common.saving' : 'common.save')}
          </button>
        </>
      )}
    </form>
  );
}
