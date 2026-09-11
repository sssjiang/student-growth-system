import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TeacherAPI } from '@/api';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';
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
  const [credentials, setCredentials] = useState([]);
  const [counts, setCounts] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
  });
  const [preview, setPreview] = useState(null);
  const [review, setReview] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const statusLabel = (status) =>
    t(FILTERS.find((item) => item.key === status)?.label || 'review.all');

  const load = useCallback(() => {
    TeacherAPI.getCredentials(filter).then((data) => {
      setCredentials(data.credentials);
      setCounts(data.counts);
    });
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (credential, status) => {
    setReview({ credential, status });
    setComment('');
  };

  const submitReview = async () => {
    if (review.status === 'rejected' && !comment.trim()) {
      notify(t('review.reasonRequired'));
      return;
    }
    setLoading(true);
    try {
      await TeacherAPI.reviewCredential(
        review.credential.id,
        review.status,
        comment
      );
      setReview(null);
      notify(
        t(
          review.status === 'approved'
            ? 'review.approvedNotice'
            : 'review.rejectedNotice'
        )
      );
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
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
          loadBlob={TeacherAPI.previewCredential}
          onClose={() => setPreview(null)}
        />
      )}
      {review && (
        <Modal
          title={t(
            review.status === 'approved'
              ? 'review.approveTitle'
              : 'review.rejectTitle'
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
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReview(null)}>
              {t('common.cancel')}
            </button>
            <button
              className={
                review.status === 'approved' ? 'primary' : 'danger-button'
              }
              disabled={loading}
              onClick={submitReview}
            >
              {loading
                ? t('common.saving')
                : review.status === 'approved'
                  ? t('review.confirmApprove')
                  : t('review.confirmReject')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default CredentialReviewPage;
