import { useEffect, useState } from 'react';
import { BookOpen, Eye, LoaderCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminAPI } from '@/api';
import { Empty, Modal, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function AdminKnowledgePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [documents, setDocuments] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = () =>
    AdminAPI.getKnowledge().then((data) => setDocuments(data.documents));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const inspect = async (document) => {
    setLoading(true);
    try {
      setDetail(await AdminAPI.getKnowledgeChunks(document.id));
    } finally {
      setLoading(false);
    }
  };

  const reindex = async (document) => {
    await AdminAPI.reindexKnowledge(document.id);
    notify(t('admin.knowledge.queued'));
    await load();
  };

  return (
    <>
      <PageTitle
        eyebrow={t('admin.knowledge.eyebrow')}
        title={t('admin.knowledge.title')}
        description={t('admin.knowledge.description')}
      />
      <section className="card admin-panel">
        <div className="card-head">
          <div>
            <h3>{t('admin.knowledge.library')}</h3>
            <p>{t('admin.knowledge.count', { count: documents.length })}</p>
          </div>
        </div>
        {documents.length ? (
          <div className="admin-knowledge-list">
            {documents.map((document) => (
              <article key={document.id}>
                <span className="knowledge-file-icon">
                  <BookOpen />
                </span>
                <div>
                  <div className="admin-inline">
                    <b>{document.title}</b>
                    <span className={`knowledge-status ${document.status}`}>
                      {['pending', 'processing'].includes(document.status) && (
                        <LoaderCircle className="spin" />
                      )}
                      {t(`knowledge.status.${document.status}`)}
                    </span>
                  </div>
                  <p>
                    {t(`subjects.${document.subject}`)} ·{' '}
                    {document.grade_level || t('knowledge.allGrades')} ·{' '}
                    {document.original_name}
                  </p>
                  <small>
                    {t('admin.knowledge.chunkCount', {
                      count: document.chunk_count,
                    })}
                    {document.error_message
                      ? ` · ${document.error_message}`
                      : ''}
                  </small>
                </div>
                <div className="knowledge-actions">
                  <button
                    className="icon-button"
                    onClick={() => inspect(document)}
                    title={t('admin.knowledge.inspect')}
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
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty>{t('knowledge.empty')}</Empty>
        )}
      </section>
      {(detail || loading) && (
        <Modal
          title={detail?.document.title || t('common.loading')}
          onClose={() => {
            setDetail(null);
            setLoading(false);
          }}
          size="lg"
        >
          {loading ? (
            <p className="muted">{t('common.loading')}</p>
          ) : (
            <div className="admin-chunk-list">
              {detail.chunks.map((chunk) => (
                <article key={chunk.id}>
                  <header>
                    <b>
                      #{chunk.position + 1}{' '}
                      {chunk.heading || t('admin.knowledge.body')}
                    </b>
                    <span>{chunk.content.length} chars</span>
                  </header>
                  <p>{chunk.content}</p>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default AdminKnowledgePage;
