import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  FileWarning,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

const RESULT_ICONS = {
  consistent: CheckCircle2,
  match: CheckCircle2,
  mismatch: XCircle,
};

function FilePreviewModal({
  analyzeFile,
  credential,
  loadAnalysis,
  loadBlob,
  onClose,
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!analyzeFile) return;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const data = await analyzeFile(credential.id);
      if (mounted.current) setAnalysis(data.analysis);
    } catch (err) {
      if (mounted.current) setAnalysisError(err.message);
    } finally {
      if (mounted.current) setAnalyzing(false);
    }
  }, [analyzeFile, credential.id]);

  useEffect(() => {
    let objectUrl = '';
    loadBlob(credential.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => setError(err.message));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [credential.id, loadBlob]);

  useEffect(() => {
    if (!loadAnalysis) return;
    let active = true;
    setAnalyzing(true);
    loadAnalysis(credential.id)
      .then((data) => {
        if (!active) return;
        setAnalysis(data.analysis);
        if (!data.analysis || data.analysis.analysis_status !== 'completed') {
          runAnalysis();
        } else {
          setAnalyzing(false);
        }
      })
      .catch((err) => {
        if (active) {
          setAnalysisError(err.message);
          setAnalyzing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [credential.id, loadAnalysis, runAnalysis]);

  const isImage = credential.mime_type.startsWith('image/');

  return (
    <Modal
      title={credential.title || credential.original_name}
      onClose={onClose}
      size="preview"
    >
      <div
        className={`preview-workspace ${loadAnalysis ? 'with-analysis' : ''}`}
      >
        <div className="preview-body">
          {!url && !error && <LoaderCircle className="spin" size={28} />}
          {error && (
            <div className="preview-error">
              <FileWarning />
              <p>{error}</p>
            </div>
          )}
          {url && isImage && <img src={url} alt={credential.title} />}
          {url && !isImage && <iframe src={url} title={credential.title} />}
        </div>
        {loadAnalysis && (
          <aside className="ai-review-panel">
            <div className="ai-review-heading">
              <span>
                <BrainCircuit />
              </span>
              <div>
                <b>{t('aiReview.title')}</b>
                <small>{t('aiReview.subtitle')}</small>
              </div>
            </div>
            {analyzing && (
              <div className="ai-review-loading">
                <LoaderCircle className="spin" />
                <b>{t('aiReview.analyzing')}</b>
                <p>{t('aiReview.analyzingHint')}</p>
              </div>
            )}
            {!analyzing && analysisError && (
              <div className="ai-review-loading error">
                <TriangleAlert />
                <b>{t('aiReview.failed')}</b>
                <p>{analysisError}</p>
                <button className="secondary" onClick={runAnalysis}>
                  <RefreshCw size={14} />
                  {t('aiReview.retry')}
                </button>
              </div>
            )}
            {!analyzing && !analysisError && analysis && (
              <AnalysisResult analysis={analysis} onRetry={runAnalysis} t={t} />
            )}
          </aside>
        )}
      </div>
    </Modal>
  );
}

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

export default FilePreviewModal;
