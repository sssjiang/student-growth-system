import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { TeacherAPI } from '@/api';
import { Empty, FilePreviewModal, Modal, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

const SUBJECTS = ['chinese', 'math', 'english', 'politics'];

function KnowledgeBasePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    subject: 'chinese',
    grade_level: '',
    source: '',
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDocuments = useCallback(() => {
    TeacherAPI.getKnowledgeDocuments()
      .then((data) => setDocuments(data.documents))
      .catch((err) => notify(err.message));
  }, [notify]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const processing = useMemo(
    () =>
      documents.some((item) => ['pending', 'processing'].includes(item.status)),
    [documents]
  );

  useEffect(() => {
    if (!processing) return undefined;
    const timer = window.setInterval(loadDocuments, 2500);
    return () => window.clearInterval(timer);
  }, [loadDocuments, processing]);

  const submit = async (event) => {
    event.preventDefault();
    if (!file || !form.title.trim()) return;
    setLoading(true);
    try {
      await TeacherAPI.uploadKnowledgeDocument(file, form);
      setFile(null);
      setForm((current) => ({ ...current, title: '', source: '' }));
      notify(t('knowledge.uploaded'));
      loadDocuments();
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await TeacherAPI.deleteKnowledgeDocument(deleteTarget.id);
      notify(t('knowledge.deleted'));
      setDeleteTarget(null);
      loadDocuments();
    } catch (err) {
      notify(err.message);
    }
  };

  const reindex = async (document) => {
    try {
      await TeacherAPI.reindexKnowledgeDocument(document.id);
      notify(t('knowledge.reindexQueued'));
      loadDocuments();
    } catch (err) {
      notify(err.message);
    }
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
              onChange={(event) => setFile(event.target.files[0] || null)}
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
          loadBlob={TeacherAPI.previewKnowledgeDocument}
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
