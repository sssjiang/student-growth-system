import { errorMessage } from '@/api/errors';
import { useSearchStudentsMutation } from '@/api';
import { useState } from 'react';
import { BrainCircuit, Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageTitle, StudentRow } from '@/components';

function SmartSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState(() => t('search.defaultQuery'));
  const [
    searchStudents,
    { data: result, isLoading: loading, error: queryError },
  ] = useSearchStudentsMutation();
  const error = queryError ? errorMessage(queryError, t) : '';
  const search = () => {
    searchStudents(query);
  };
  const openStudent = (student) =>
    navigate(`/teacher/students/${student.id}`, { state: { student } });
  const samples = [
    t('search.sample1'),
    t('search.sample2'),
    t('search.sample3'),
  ];
  return (
    <>
      <PageTitle
        eyebrow={t('search.eyebrow')}
        title={t('search.title')}
        description={t('search.description')}
      />
      <section className="search-hero">
        <div className="ai-badge">
          <BrainCircuit size={18} />
          {t('search.localModel')}
        </div>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('search.placeholder')}
        />
        <div className="search-actions">
          <span>{query.length} / 200</span>
          <button className="primary" disabled={loading} onClick={search}>
            <Search size={18} />
            {loading ? t('search.understanding') : t('search.start')}
          </button>
        </div>
      </section>
      <div className="sample-row">
        <span>{t('search.samples')}</span>
        {samples.map((item) => (
          <button key={item} onClick={() => setQuery(item)}>
            {item}
          </button>
        ))}
      </div>
      {error && <div className="form-error">{error}</div>}
      {result && (
        <section className="card result-card">
          <div className="card-head">
            <div>
              <h3>{t('search.found', { count: result.count })}</h3>
              <p>{t('search.sorted')}</p>
            </div>
            <span className="engine-label">
              <span />
              {t('search.safe')}
            </span>
          </div>
          <div className="student-list">
            {result.students.map((student) => (
              <div key={student.id} className="matched-item">
                <StudentRow student={student} onOpen={openStudent} showScore />
                <p>
                  <Sparkles size={14} />
                  {student.match_reason_code
                    ? t(`search.reasons.${student.match_reason_code}`, {
                        tags: student.match_reason_tags.join(
                          t('search.tagSeparator')
                        ),
                      })
                    : student.match_reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {!result && (
        <div className="search-placeholder">
          <span>
            <Search size={32} />
          </span>
          <h3>{t('search.emptyTitle')}</h3>
          <p>{t('search.privacy')}</p>
        </div>
      )}
    </>
  );
}

export default SmartSearchPage;
