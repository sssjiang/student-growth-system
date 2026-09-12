import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ChevronRight, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminAPI } from '@/api';
import { Empty, Modal, PageTitle } from '@/components';

function AdminObservabilityPage() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [traces, setTraces] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    AdminAPI.getRagTraces(subject)
      .then((data) => setTraces(data.traces))
      .catch(() => {});
  }, [subject]);

  const inspect = async (trace) =>
    setDetail(await AdminAPI.getRagTrace(trace.id));

  return (
    <>
      <PageTitle
        eyebrow={t('admin.observability.eyebrow')}
        title={t('admin.observability.title')}
        description={t('admin.observability.description')}
        action={
          <select
            className="compact-select"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {['chinese', 'math', 'english', 'politics'].map((item) => (
              <option key={item} value={item}>
                {t(`subjects.${item}`)}
              </option>
            ))}
          </select>
        }
      />
      <section className="card admin-panel">
        {traces.length ? (
          <div className="trace-list">
            {traces.map((trace) => (
              <button key={trace.id} onClick={() => inspect(trace)}>
                <span
                  className={`trace-state ${trace.selected_count ? 'success' : 'empty'}`}
                >
                  {trace.selected_count ? <Activity /> : <SearchX />}
                </span>
                <span className="trace-main">
                  <b>{trace.question}</b>
                  <small>
                    {trace.student_name || '—'} ·{' '}
                    {t(`subjects.${trace.subject}`)} · {trace.created_at}
                  </small>
                </span>
                <span className="trace-metrics">
                  <b>
                    {trace.selected_count}/{trace.candidate_count}
                  </b>
                  <small>{trace.duration_ms} ms</small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
        ) : (
          <Empty>{t('admin.observability.empty')}</Empty>
        )}
      </section>
      {detail && (
        <Modal
          title={detail.trace.question}
          onClose={() => setDetail(null)}
          size="lg"
        >
          <div className="trace-summary">
            <span>
              <small>{t('admin.fields.student')}</small>
              <b>{detail.trace.student_name || '—'}</b>
            </span>
            <span>
              <small>{t('admin.fields.subject')}</small>
              <b>{t(`subjects.${detail.trace.subject}`)}</b>
            </span>
            <span>
              <small>{t('admin.fields.candidates')}</small>
              <b>{detail.trace.candidate_count}</b>
            </span>
            <span>
              <small>{t('admin.fields.duration')}</small>
              <b>{detail.trace.duration_ms} ms</b>
            </span>
          </div>
          <div className="trace-chunks">
            {detail.chunks.length ? (
              detail.chunks.map((chunk) => (
                <article
                  className={chunk.selected ? 'selected' : ''}
                  key={chunk.rank}
                >
                  <header>
                    <span className="trace-rank">#{chunk.rank}</span>
                    <div>
                      <b>{chunk.document_title}</b>
                      <small>
                        {chunk.heading || t('admin.knowledge.body')}
                      </small>
                    </div>
                    {chunk.selected && (
                      <span className="selected-badge">
                        <CheckCircle2 />
                        {t('admin.observability.selected')}
                      </span>
                    )}
                  </header>
                  <div className="score-strip">
                    <span>
                      Semantic <b>{chunk.semantic_score.toFixed(4)}</b>
                    </span>
                    <span>
                      Keyword <b>{chunk.keyword_score.toFixed(4)}</b>
                    </span>
                    <span>
                      Final <b>{chunk.final_score.toFixed(4)}</b>
                    </span>
                  </div>
                  <p>{chunk.content_snapshot}</p>
                </article>
              ))
            ) : (
              <Empty>{t('admin.observability.noChunks')}</Empty>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default AdminObservabilityPage;
