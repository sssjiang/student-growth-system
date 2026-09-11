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
import { useTranslation } from 'react-i18next';
import { StudentAPI } from '@/api';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';
import { canPreview, formatFileSize, saveBlob } from '@/utils/files';
import CredentialForm from './CredentialForm';

function FilesPage() {
  const { t } = useTranslation();
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
      notify(t(formTarget ? 'files.resubmitted' : 'files.uploaded'));
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
      notify(t('files.deleted'));
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
        eyebrow={t('files.eyebrow')}
        title={t('files.title')}
        description={t('files.description')}
        action={
          <button className="primary" onClick={() => setFormTarget(null)}>
            <Upload size={17} />
            {t('files.upload')}
          </button>
        }
      />

      <div className="credential-summary">
        <div>
          <strong>{files.length}</strong>
          <span>{t('files.all')}</span>
        </div>
        <div>
          <strong>{counts.pending}</strong>
          <span>{t('files.pendingCount')}</span>
        </div>
        <div>
          <strong>{counts.approved}</strong>
          <span>{t('files.approvedCount')}</span>
        </div>
        <div>
          <strong>{counts.rejected}</strong>
          <span>{t('files.rejectedCount')}</span>
        </div>
      </div>

      {files.length ? (
        <div className="credential-grid">
          {files.map((credential) => {
            const status = credential.status || 'pending';
            return (
              <article className="credential-card" key={credential.id}>
                <div className="credential-card-head">
                  <span className="file-icon">
                    <FileText />
                  </span>
                  <span className={`status-pill ${status}`}>
                    {t(`files.${status}`)}
                  </span>
                </div>
                <span className="credential-type">
                  {t(`credentialTypes.${credential.credential_type}`, {
                    defaultValue: credential.credential_type,
                  })}
                </span>
                <h3>{credential.title || credential.original_name}</h3>
                <p>
                  {credential.issuer || t('common.noIssuer')}
                  {credential.awarded_at && ` · ${credential.awarded_at}`}
                </p>
                <div className="credential-file">
                  <FileText size={14} />
                  <span>{credential.original_name}</span>
                  <small>{formatFileSize(credential.size)}</small>
                </div>
                {credential.status === 'rejected' && (
                  <div className="review-message">
                    <b>{t('files.reviewComment')}</b>
                    <p>
                      {credential.review_comment || t('files.reviewFallback')}
                    </p>
                  </div>
                )}
                {credential.status === 'approved' && (
                  <div className="approved-message">
                    <ShieldCheck size={15} />
                    {t('files.approvedBy', {
                      name: credential.reviewer_name || t('common.teacher'),
                    })}
                  </div>
                )}
                <div className="credential-actions">
                  {canPreview(
                    credential.mime_type,
                    credential.original_name
                  ) && (
                    <button onClick={() => setPreview(credential)}>
                      <Eye size={15} />
                      {t('common.preview')}
                    </button>
                  )}
                  <button onClick={() => downloadCredential(credential)}>
                    <Download size={15} />
                    {t('common.download')}
                  </button>
                  {credential.status === 'rejected' && (
                    <button onClick={() => setFormTarget(credential)}>
                      <RotateCcw size={15} />
                      {t('files.resubmit')}
                    </button>
                  )}
                  <button
                    className="danger-text"
                    onClick={() => setDeleteTarget(credential)}
                  >
                    <Trash2 size={15} />
                    {t('common.delete')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="card">
          <Empty>{t('files.empty')}</Empty>
        </section>
      )}

      {formTarget !== undefined && (
        <Modal
          title={t(formTarget ? 'files.editResubmit' : 'files.uploadTitle')}
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
          title={t('files.deleteTitle')}
          onClose={() => setDeleteTarget(null)}
          size="sm"
        >
          <div className="confirm-content">
            <span className="danger-icon">
              <Trash2 />
            </span>
            <p>
              {t('files.deleteConfirm', {
                name: deleteTarget.title || deleteTarget.original_name,
              })}
            </p>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="danger-button"
              disabled={loading}
              onClick={deleteCredential}
            >
              {loading ? t('files.deleting') : t('files.confirmDelete')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default FilesPage;
