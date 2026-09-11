import { useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TeacherAPI } from '@/api';
import { PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function GradeImportPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const submit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await TeacherAPI.importGrades(file);
      setResult(data);
      notify(t('gradeImport.success', { count: data.imported }));
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow={t('gradeImport.eyebrow')}
        title={t('gradeImport.title')}
        description={t('gradeImport.description')}
      />
      <div className="two-column">
        <section className="card upload-card">
          <div className="upload-zone">
            <span>
              <Upload />
            </span>
            <h3>{file?.name || t('gradeImport.drop')}</h3>
            <p>{t('gradeImport.hint')}</p>
            <label className="secondary">
              {t('gradeImport.choose')}
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={(event) => setFile(event.target.files[0])}
              />
            </label>
          </div>
          <button
            className="primary wide"
            disabled={!file || loading}
            onClick={submit}
          >
            {loading ? t('gradeImport.importing') : t('gradeImport.confirm')}
          </button>
          {result && (
            <div className="success-box">
              <Check /> {t('gradeImport.success', { count: result.imported })}
              {result.skipped_rows?.length > 0 &&
                t('gradeImport.skipped', {
                  rows: result.skipped_rows.join(', '),
                })}
            </div>
          )}
        </section>
        <section className="card guide">
          <h3>{t('gradeImport.guide')}</h3>
          <p>{t('gradeImport.columns')}</p>
          <code>
            student_no, year, semester,
            <br />
            chinese, math, english, politics
          </code>
          <ul>
            <li>{t('gradeImport.studentNo')}</li>
            <li>{t('gradeImport.semester')}</li>
            <li>{t('gradeImport.scores')}</li>
          </ul>
          <a
            download="grades-template.csv"
            href="data:text/csv;charset=utf-8,%EF%BB%BFstudent_no,year,semester,chinese,math,english,politics%0A2026001,2026,1,88,90,86,84"
          >
            {t('gradeImport.download')}
          </a>
        </section>
      </div>
    </>
  );
}

export default GradeImportPage;
