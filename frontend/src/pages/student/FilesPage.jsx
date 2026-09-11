import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Eye,
  FileText,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { StudentAPI } from '@/api';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';
import { canPreview, formatFileSize, saveBlob } from '@/utils/files';
import CredentialForm from './CredentialForm';

const STATUS = {
  pending: { label: '待审核', className: 'pending' },
  approved: { label: '已通过', className: 'approved' },
  rejected: { label: '已驳回', className: 'rejected' },
};

function FilesPage() {
  const { notify } = useToast();
  const [files, setFiles] = useState([]);
  const [formTarget, setFormTarget] = useState(undefined);
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    StudentAPI.getFiles().then((data) => setFiles(data.files));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitCredential = async (file, metadata) => {
    setLoading(true);
    try {
      const data = formTarget
        ? await StudentAPI.resubmitFile(formTarget.id, file, metadata)
        : await StudentAPI.uploadFile(file, metadata);
      setFiles(data.files);
      setFormTarget(undefined);
      notify(formTarget ? '凭证已重新提交审核' : '凭证上传成功，等待老师审核');
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCredential = async () => {
    setLoading(true);
    try {
      await StudentAPI.deleteFile(deleteTarget.id);
      setFiles((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      notify('凭证已删除');
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCredential = async (credential) => {
    try {
      const blob = await StudentAPI.downloadFile(credential.id);
      saveBlob(blob, credential.original_name);
    } catch (err) {
      notify(err.message);
    }
  };

  const counts = files.reduce(
    (result, item) => ({ ...result, [item.status]: result[item.status] + 1 }),
    { approved: 0, pending: 0, rejected: 0 }
  );

  return (
    <>
      <PageTitle
        eyebrow="成长材料"
        title="收藏你的每一次收获"
        description="上传荣誉凭证并跟踪审核进度，通过后将进入正式成长档案。"
        action={
          <button className="primary" onClick={() => setFormTarget(null)}>
            <Upload size={17} />
            上传凭证
          </button>
        }
      />

      <div className="credential-summary">
        <div>
          <strong>{files.length}</strong>
          <span>全部凭证</span>
        </div>
        <div>
          <strong>{counts.pending}</strong>
          <span>等待审核</span>
        </div>
        <div>
          <strong>{counts.approved}</strong>
          <span>审核通过</span>
        </div>
        <div>
          <strong>{counts.rejected}</strong>
          <span>需要修改</span>
        </div>
      </div>

      {files.length ? (
        <div className="credential-grid">
          {files.map((credential) => {
            const status = STATUS[credential.status] || STATUS.pending;
            return (
              <article className="credential-card" key={credential.id}>
                <div className="credential-card-head">
                  <span className="file-icon">
                    <FileText />
                  </span>
                  <span className={`status-pill ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <span className="credential-type">
                  {credential.credential_type}
                </span>
                <h3>{credential.title || credential.original_name}</h3>
                <p>
                  {credential.issuer || '未填写颁发机构'}
                  {credential.awarded_at && ` · ${credential.awarded_at}`}
                </p>
                <div className="credential-file">
                  <FileText size={14} />
                  <span>{credential.original_name}</span>
                  <small>{formatFileSize(credential.size)}</small>
                </div>
                {credential.status === 'rejected' && (
                  <div className="review-message">
                    <b>审核意见</b>
                    <p>{credential.review_comment || '请核对信息后重新提交'}</p>
                  </div>
                )}
                {credential.status === 'approved' && (
                  <div className="approved-message">
                    <ShieldCheck size={15} />由{' '}
                    {credential.reviewer_name || '老师'} 审核通过
                  </div>
                )}
                <div className="credential-actions">
                  {canPreview(
                    credential.mime_type,
                    credential.original_name
                  ) && (
                    <button onClick={() => setPreview(credential)}>
                      <Eye size={15} />
                      预览
                    </button>
                  )}
                  <button onClick={() => downloadCredential(credential)}>
                    <Download size={15} />
                    下载
                  </button>
                  {credential.status === 'rejected' && (
                    <button onClick={() => setFormTarget(credential)}>
                      <RotateCcw size={15} />
                      重新提交
                    </button>
                  )}
                  <button
                    className="danger-text"
                    onClick={() => setDeleteTarget(credential)}
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="card">
          <Empty>还没有成长材料，上传你的第一份荣誉凭证吧</Empty>
        </section>
      )}

      {formTarget !== undefined && (
        <Modal
          title={formTarget ? '修改并重新提交' : '上传荣誉凭证'}
          onClose={() => setFormTarget(undefined)}
        >
          <CredentialForm
            credential={formTarget}
            loading={loading}
            onCancel={() => setFormTarget(undefined)}
            onSubmit={submitCredential}
          />
        </Modal>
      )}
      {preview && (
        <FilePreviewModal
          credential={preview}
          loadBlob={StudentAPI.previewFile}
          onClose={() => setPreview(null)}
        />
      )}
      {deleteTarget && (
        <Modal
          title="确认删除凭证"
          onClose={() => setDeleteTarget(null)}
          size="sm"
        >
          <div className="confirm-content">
            <span className="danger-icon">
              <Trash2 />
            </span>
            <p>
              确定删除“{deleteTarget.title || deleteTarget.original_name}
              ”吗？文件和审核记录都会被永久删除。
            </p>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDeleteTarget(null)}>
              取消
            </button>
            <button
              className="danger-button"
              disabled={loading}
              onClick={deleteCredential}
            >
              {loading ? '正在删除…' : '确认删除'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default FilesPage;
