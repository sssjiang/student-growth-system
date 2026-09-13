import { useEffect, useState } from 'react';
import { useCredentialAnalysis } from '@/hooks/useCredentialAnalysis';
import { errorMessage } from '@/api/errors';
import {
  BrainCircuit,
  FileWarning,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import AnalysisResult from './AnalysisResult';

function FilePreviewModal({
  credential,
  showAnalysis = false,
  loadBlob,
  onClose,
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const {
    analysis,
    analyzing,
    error: analysisFailure,
    runAnalysis,
  } = useCredentialAnalysis(credential.id, showAnalysis);
  const analysisError = analysisFailure ? errorMessage(analysisFailure, t) : '';

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl('');
    setError('');
    loadBlob(credential.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, t));
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [credential.id, loadBlob, t]);

  const isImage = credential.mime_type.startsWith('image/');

  return (
    <Modal
      title={credential.title || credential.original_name}
      onClose={onClose}
      size="preview"
    >
      <div
        className={`preview-workspace ${showAnalysis ? 'with-analysis' : ''}`}
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
        {showAnalysis && (
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
            {!analyzing &&
              !analysisError &&
              ['pending', 'processing'].includes(analysis?.analysis_status) && (
                <div className="ai-review-loading">
                  <LoaderCircle className="spin" />
                  <b>
                    {t(
                      analysis.analysis_status === 'pending'
                        ? 'aiReview.queued'
                        : 'aiReview.processing'
                    )}
                  </b>
                  <p>
                    {t(
                      analysis.analysis_status === 'pending'
                        ? 'aiReview.queuedHint'
                        : 'aiReview.processingHint'
                    )}
                  </p>
                  <button className="secondary" onClick={runAnalysis}>
                    <RefreshCw size={14} />
                    {t('aiReview.reanalyze')}
                  </button>
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
            {!analyzing &&
              !analysisError &&
              analysis?.analysis_status === 'failed' && (
                <div className="ai-review-loading error">
                  <TriangleAlert />
                  <b>{t('aiReview.failed')}</b>
                  <p>{t('aiReview.failedHint')}</p>
                  <button className="secondary" onClick={runAnalysis}>
                    <RefreshCw size={14} />
                    {t('aiReview.retry')}
                  </button>
                </div>
              )}
            {!analyzing &&
              !analysisError &&
              analysis?.analysis_status === 'completed' && (
                <AnalysisResult
                  analysis={analysis}
                  onRetry={runAnalysis}
                  t={t}
                />
              )}
          </aside>
        )}
      </div>
    </Modal>
  );
}

export default FilePreviewModal;
