import { useFileApi } from '@/hooks/useFileApi';
import { useQueryError } from '@/hooks/useQueryError';
import { useGetCredentialsQuery, useReviewCredentialMutation } from '@/api';
import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/hooks/useToast';
import { canPreview, formatFileSize } from '@/utils/files';

const FILTERS = [
  { key: 'pending', label: 'review.pending' },
  { key: 'approved', label: 'review.approved' },
  { key: 'rejected', label: 'review.rejected' },
  { key: '', label: 'review.all' },
];

function CredentialReviewPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [filter, setFilter] = useState('pending');
  const { currentData: data, error } = useGetCredentialsQuery(filter);
  const credentials = data?.credentials || [];
  const counts = data?.counts || { approved: 0, pending: 0, rejected: 0 };
  const [reviewCredential, { isLoading: loading }] =
    useReviewCredentialMutation();
  const { previewFile } = useFileApi();
  useQueryError(error);
  const [preview, setPreview] = useState(null);
  const [review, setReview] = useState(null);
  const [comment, setComment] = useState('');

  const statusLabel = (status) =>
    t(FILTERS.find((item) => item.key === status)?.label || 'review.all');

  const openReview = (credential, status) => {
    setReview({ credential, status });
    setComment('');
  };

  const submitReview = async () => {
    if (review.status === 'rejected' && !comment.trim()) {
      notify(t('review.reasonRequired'));
      return;
    }
    try {
      await reviewCredential({
        id: review.credential.id,
        status: review.status,
        comment,
      }).unwrap();
      setReview(null);
      const notice = {
        approved: 'review.approvedNotice',
        pending: 'review.undoNotice',
        rejected: 'review.rejectedNotice',
      };
      notify(t(notice[review.status]));
    } catch (err) {
      notify(err);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow={t('review.eyebrow')}
        title={t('review.title')}
        description={t('review.description')}
      />
      <div className="review-tabs">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            className={filter === item.key ? 'active' : ''}
            onClick={() => setFilter(item.key)}
          >
            {t(item.label)}
            {item.key && <span>{counts[item.key]}</span>}
          </button>
        ))}
      </div>
      <section className="card review-list">
        {credentials.length ? (
          credentials.map((credential) => (
            <article className="review-row" key={credential.id}>
              <span className="review-file-icon">
                <FileCheck2 />
              </span>
              <div className="review-main">
                <div>
                  <span className={`status-pill ${credential.status}`}>
                    {statusLabel(credential.status)}
                  </span>
                  <em>
                    {t(`credentialTypes.${credential.credential_type}`, {
                      defaultValue: credential.credential_type,
                    })}
                  </em>
                </div>
                <h3>{credential.title}</h3>
                <p>
                  {credential.student_name} · {credential.student_no} ·{' '}
                  {credential.grade}
                  {credential.class_name}
                </p>
              </div>
              <div className="review-meta">
                <span>{credential.issuer || t('common.noIssuer')}</span>
                <small>
                  {credential.awarded_at || t('common.noDate')} ·{' '}
                  {formatFileSize(credential.size)}
                </small>
              </div>
              <div className="review-actions">
                {canPreview(credential.mime_type, credential.original_name) && (
                  <button
                    className="secondary"
                    onClick={() => setPreview(credential)}
                  >
                    <Eye size={15} />
                    {t('common.preview')}
                  </button>
                )}
                {credential.status === 'pending' && (
                  <>
                    <button
                      className="approve-button"
                      onClick={() => openReview(credential, 'approved')}
                    >
                      <CheckCircle2 size={15} />
                      {t('review.approve')}
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => openReview(credential, 'rejected')}
                    >
                      <XCircle size={15} />
                      {t('review.reject')}
                    </button>
                  </>
                )}
                {credential.status !== 'pending' && (
                  <button
                    className="secondary"
                    onClick={() => openReview(credential, 'pending')}
                  >
                    <RotateCcw size={15} />
                    {t('review.undo')}
                  </button>
                )}
              </div>
              {credential.review_comment && (
                <div className="review-row-comment">
                  <RotateCcw size={14} />
                  {t('review.comment', {
                    comment: credential.review_comment,
                  })}
                </div>
              )}
            </article>
          ))
        ) : (
          <Empty>
            {t('review.empty', {
              status: statusLabel(filter),
            })}
          </Empty>
        )}
      </section>

      {preview && (
        <FilePreviewModal
          credential={preview}
          loadBlob={previewFile}
          showAnalysis
          onClose={() => setPreview(null)}
        />
      )}
      {review && (
        <Modal
          title={t(
            {
              approved: 'review.approveTitle',
              pending: 'review.undoTitle',
              rejected: 'review.rejectTitle',
            }[review.status]
          )}
          onClose={() => setReview(null)}
          size="sm"
        >
          <div className="review-dialog-summary">
            <b>{review.credential.title}</b>
            <span>
              {review.credential.student_name} ·{' '}
              {review.credential.original_name}
            </span>
          </div>
          {review.status === 'pending' ? (
            <p className="review-undo-hint">{t('review.undoHint')}</p>
          ) : (
            <label className="field">
              <span>
                {t('review.commentLabel')}
                {review.status === 'rejected' && t('review.required')}
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={
                  review.status === 'approved'
                    ? t('review.approvePlaceholder')
                    : t('review.rejectPlaceholder')
                }
              />
            </label>
          )}
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReview(null)}>
              {t('common.cancel')}
            </button>
            <button
              className={
                review.status === 'rejected' ? 'danger-button' : 'primary'
              }
              disabled={loading}
              onClick={submitReview}
            >
              {loading
                ? t('common.saving')
                : t(
                    {
                      approved: 'review.confirmApprove',
                      pending: 'review.confirmUndo',
                      rejected: 'review.confirmReject',
                    }[review.status]
                  )}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default CredentialReviewPage;
