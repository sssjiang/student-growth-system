import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { TeacherAPI } from '@/api';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';
import { canPreview, formatFileSize } from '@/utils/files';

const FILTERS = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: '', label: '全部' },
];

function CredentialReviewPage() {
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
      notify('请填写驳回原因，帮助学生正确修改');
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
      notify(review.status === 'approved' ? '凭证已审核通过' : '凭证已驳回');
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
        eyebrow="凭证审核"
        title="确认学生的每一份成长"
        description="预览学生提交的荣誉材料，记录审核意见并跟踪重新提交。"
      />
      <div className="review-tabs">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            className={filter === item.key ? 'active' : ''}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
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
                    {
                      FILTERS.find((item) => item.key === credential.status)
                        ?.label
                    }
                  </span>
                  <em>{credential.credential_type}</em>
                </div>
                <h3>{credential.title}</h3>
                <p>
                  {credential.student_name} · {credential.student_no} ·{' '}
                  {credential.grade}
                  {credential.class_name}
                </p>
              </div>
              <div className="review-meta">
                <span>{credential.issuer || '未填写颁发机构'}</span>
                <small>
                  {credential.awarded_at || '未填写日期'} ·{' '}
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
                    预览
                  </button>
                )}
                {credential.status === 'pending' && (
                  <>
                    <button
                      className="approve-button"
                      onClick={() => openReview(credential, 'approved')}
                    >
                      <CheckCircle2 size={15} />
                      通过
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => openReview(credential, 'rejected')}
                    >
                      <XCircle size={15} />
                      驳回
                    </button>
                  </>
                )}
              </div>
              {credential.review_comment && (
                <div className="review-row-comment">
                  <RotateCcw size={14} />
                  审核意见：{credential.review_comment}
                </div>
              )}
            </article>
          ))
        ) : (
          <Empty>
            当前没有{FILTERS.find((item) => item.key === filter)?.label}凭证
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
          title={review.status === 'approved' ? '确认审核通过' : '填写驳回原因'}
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
            <span>审核意见{review.status === 'rejected' && '（必填）'}</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={
                review.status === 'approved'
                  ? '可填写鼓励或补充说明'
                  : '请明确说明需要修改或补充的内容'
              }
            />
          </label>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReview(null)}>
              取消
            </button>
            <button
              className={
                review.status === 'approved' ? 'primary' : 'danger-button'
              }
              disabled={loading}
              onClick={submitReview}
            >
              {loading
                ? '正在保存…'
                : review.status === 'approved'
                  ? '确认通过'
                  : '确认驳回'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default CredentialReviewPage;
