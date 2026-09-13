import { CheckCircle2, RefreshCw, TriangleAlert, XCircle } from 'lucide-react';

const RESULT_ICONS = {
  consistent: CheckCircle2,
  match: CheckCircle2,
  mismatch: XCircle,
};

function AnalysisResult({ analysis, onRetry, t }) {
  const OverallIcon = RESULT_ICONS[analysis.overall_status] || TriangleAlert;
  return (
    <div className="ai-review-result">
      <div className={`ai-review-summary ${analysis.overall_status}`}>
        <OverallIcon />
        <div>
          <b>{t(`aiReview.status.${analysis.overall_status}`)}</b>
          <span>
            {t('aiReview.confidence', {
              value: Math.round((analysis.overall_confidence || 0) * 100),
            })}
          </span>
        </div>
      </div>
      <p className="ai-review-notice">{t('aiReview.notice')}</p>
      <div className="ai-field-list">
        {(analysis.comparisons || []).map((item) => {
          const Icon = RESULT_ICONS[item.status] || TriangleAlert;
          return (
            <article className={`ai-field ${item.status}`} key={item.field}>
              <header>
                <b>{t(`aiReview.fields.${item.field}`)}</b>
                <span>
                  <Icon />
                  {t(`aiReview.fieldStatus.${item.status}`)}
                </span>
              </header>
              <dl>
                <div>
                  <dt>{t('aiReview.submitted')}</dt>
                  <dd>{item.submitted || t('aiReview.empty')}</dd>
                </div>
                <div>
                  <dt>{t('aiReview.extracted')}</dt>
                  <dd>{item.extracted || t('aiReview.notFound')}</dd>
                </div>
              </dl>
              {item.evidence && (
                <p>{t('aiReview.evidence', { evidence: item.evidence })}</p>
              )}
            </article>
          );
        })}
      </div>
      <div className="ai-review-foot">
        <div>
          <small>
            {t('aiReview.method', {
              method: t(`aiReview.methods.${analysis.extraction_method}`, {
                defaultValue: analysis.extraction_method,
              }),
            })}
          </small>
          <small>
            {t('aiReview.source', {
              source: t(`aiReview.sources.${analysis.generated_by}`, {
                defaultValue: analysis.generated_by,
              }),
            })}
          </small>
        </div>
        <button className="secondary" onClick={onRetry}>
          <RefreshCw size={14} />
          {t('aiReview.reanalyze')}
        </button>
      </div>
    </div>
  );
}

export default AnalysisResult;
