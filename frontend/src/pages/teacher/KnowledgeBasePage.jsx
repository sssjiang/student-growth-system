import { useFileApi } from '@/hooks/useFileApi';
import { useQueryError } from '@/hooks/useQueryError';
import {
  useDeleteKnowledgeDocumentMutation,
  useGetKnowledgeDocumentsQuery,
  useReindexKnowledgeDocumentMutation,
  useUploadKnowledgeDocumentMutation,
} from '@/api';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/hooks/useToast';

const SUBJECTS = ['chinese', 'math', 'english', 'politics'];
const MAX_KNOWLEDGE_FILE_SIZE = 40 * 1024 * 1024;

function KnowledgeBasePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [pollingInterval, setPollingInterval] = useState(2500);
  const { data, error } = useGetKnowledgeDocumentsQuery(undefined, {
    pollingInterval,
  });
  const documents = data?.documents || [];
  const [uploadDocument, { isLoading: loading }] =
    useUploadKnowledgeDocumentMutation();
  const [deleteDocument] = useDeleteKnowledgeDocumentMutation();
  const [reindexDocument] = useReindexKnowledgeDocumentMutation();
  const { previewKnowledgeDocument } = useFileApi();
  useQueryError(error);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    subject: 'chinese',
    grade_level: '',
    source: '',
  });

  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    setPollingInterval(
      data?.documents.some((item) =>
        ['pending', 'processing'].includes(item.status)
      )
        ? 2500
        : 0
    );
  }, [data]);

  const submit = async (event) => {
    event.preventDefault();
    if (!file || !form.title.trim()) return;
    try {
      await uploadDocument({ file, metadata: form }).unwrap();
      setFile(null);
      setForm((current) => ({ ...current, title: '', source: '' }));
      notify(t('knowledge.uploaded'));
    } catch (err) {
      notify(err);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id).unwrap();
      notify(t('knowledge.deleted'));
      setDeleteTarget(null);
    } catch (err) {
      notify(err);
    }
  };

  const reindex = async (document) => {
    try {
      await reindexDocument(document.id).unwrap();
      notify(t('knowledge.reindexQueued'));
    } catch (err) {
      notify(err);
    }
  };

  const selectFile = (event) => {
    const nextFile = event.target.files[0] || null;
    if (nextFile && nextFile.size > MAX_KNOWLEDGE_FILE_SIZE) {
      event.target.value = '';
      setFile(null);
      notify(t('knowledge.tooLarge'));
      return;
    }
    setFile(nextFile);
  };

  return (
    <>
      <PageTitle
        eyebrow={t('knowledge.eyebrow')}
        title={t('knowledge.title')}
        description={t('knowledge.description')}
      />
      <div className="knowledge-layout">
        <form className="card knowledge-upload" onSubmit={submit}>
          <div className="card-head">
            <div>
              <h3>{t('knowledge.addTitle')}</h3>
              <p>{t('knowledge.addHint')}</p>
            </div>
            <BookOpen />
          </div>
          <label className="field">
            <span>{t('knowledge.name')}</span>
            <input
              value={form.title}
              placeholder={t('knowledge.namePlaceholder')}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <div className="form-grid two">
            <label className="field">
              <span>{t('knowledge.subject')}</span>
              <select
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {t(`subjects.${subject}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('knowledge.grade')}</span>
              <input
                value={form.grade_level}
                placeholder={t('knowledge.gradePlaceholder')}
                onChange={(event) =>
                  setForm({ ...form, grade_level: event.target.value })
                }
              />
            </label>
          </div>
          <label className="field">
            <span>{t('knowledge.source')}</span>
            <input
              value={form.source}
              placeholder={t('knowledge.sourcePlaceholder')}
              onChange={(event) =>
                setForm({ ...form, source: event.target.value })
              }
            />
          </label>
          <label className="knowledge-file-picker">
            <Upload />
            <b>{file?.name || t('knowledge.chooseFile')}</b>
            <small>{t('knowledge.fileHint')}</small>
            <input
              hidden
              type="file"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={selectFile}
            />
          </label>
          <button
            className="primary wide"
            disabled={!file || !form.title.trim() || loading}
          >
            {loading ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Upload size={17} />
            )}
            {loading ? t('knowledge.uploading') : t('knowledge.upload')}
          </button>
        </form>

        <section className="card knowledge-list-card">
          <div className="card-head">
            <div>
              <h3>{t('knowledge.library')}</h3>
              <p>{t('knowledge.count', { count: documents.length })}</p>
            </div>
          </div>
          {documents.length ? (
            <div className="knowledge-list">
              {documents.map((document) => (
                <article className="knowledge-row" key={document.id}>
                  <span className="knowledge-file-icon">
                    <FileText />
                  </span>
                  <div className="knowledge-row-main">
                    <div>
                      <b>{document.title}</b>
                      <span className={`knowledge-status ${document.status}`}>
                        {['pending', 'processing'].includes(
                          document.status
                        ) && <LoaderCircle className="spin" />}
                        {t(`knowledge.status.${document.status}`)}
                      </span>
                    </div>
                    <p>
                      {t(`subjects.${document.subject}`)} ·{' '}
                      {document.grade_level || t('knowledge.allGrades')} ·{' '}
                      {document.original_name}
                    </p>
                    <small>
                      {document.status === 'ready'
                        ? t('knowledge.chunks', { count: document.chunk_count })
                        : document.source || t('knowledge.processingHint')}
                    </small>
                  </div>
                  <div className="knowledge-actions">
                    <button
                      className="icon-button"
                      onClick={() => setPreview(document)}
                      title={t('common.preview')}
                    >
                      <Eye />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => reindex(document)}
                      title={t('knowledge.reindex')}
                    >
                      <RefreshCw />
                    </button>
                    <button
                      className="icon-button danger-text"
                      onClick={() => setDeleteTarget(document)}
                      title={t('common.delete')}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty>{t('knowledge.empty')}</Empty>
          )}
        </section>
      </div>
      {preview && (
        <FilePreviewModal
          credential={preview}
          loadBlob={previewKnowledgeDocument}
          onClose={() => setPreview(null)}
        />
      )}
      {deleteTarget && (
        <Modal
          title={t('knowledge.deleteTitle')}
          onClose={() => setDeleteTarget(null)}
          size="sm"
        >
          <div className="confirm-content">
            <span className="danger-icon">
              <Trash2 />
            </span>
            <p>{t('knowledge.deleteConfirm', { title: deleteTarget.title })}</p>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className="danger-button" onClick={remove}>
              {t('common.delete')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default KnowledgeBasePage;
