import { useQueryError } from '@/hooks/useQueryError';
import { useGetSettingsQuery } from '@/api';
import { Bot, CheckCircle2, Database, Eye, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components';

const State = ({ enabled, t }) => (
  <span className={`config-state ${enabled ? 'on' : 'off'}`}>
    {enabled ? <CheckCircle2 /> : <XCircle />}
    {t(enabled ? 'admin.settings.enabled' : 'admin.settings.disabled')}
  </span>
);

function AdminSettingsPage() {
  const { t } = useTranslation();
  const { data: settings, error } = useGetSettingsQuery();
  useQueryError(error);
  if (!settings) return <p>{t('common.loading')}</p>;
  return (
    <>
      <PageTitle
        eyebrow={t('admin.settings.eyebrow')}
        title={t('admin.settings.title')}
        description={t('admin.settings.description')}
      />
      <div className="settings-grid">
        <section className="card config-card">
          <header>
            <Bot />
            <div>
              <h3>{t('admin.settings.ai')}</h3>
              <p>{t('admin.settings.aiHint')}</p>
            </div>
          </header>
          <dl>
            <div>
              <dt>{t('admin.settings.tutor')}</dt>
              <dd>
                <State enabled={settings.ai.tutor_enabled} t={t} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.settings.report')}</dt>
              <dd>
                <State enabled={settings.ai.report_enabled} t={t} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.settings.review')}</dt>
              <dd>
                <State enabled={settings.ai.credential_review_enabled} t={t} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.settings.chatModel')}</dt>
              <dd>{settings.ai.chat_model || '—'}</dd>
            </div>
            <div>
              <dt>{t('admin.settings.embedding')}</dt>
              <dd>{settings.ai.embedding_model}</dd>
            </div>
            <div>
              <dt>{t('admin.settings.device')}</dt>
              <dd>{settings.ai.embedding_device}</dd>
            </div>
          </dl>
        </section>
        <section className="card config-card">
          <header>
            <Eye />
            <div>
              <h3>Langfuse</h3>
              <p>{t('admin.settings.langfuseHint')}</p>
            </div>
          </header>
          <dl>
            <div>
              <dt>{t('admin.settings.status')}</dt>
              <dd>
                <State enabled={settings.langfuse.enabled} t={t} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.settings.credentials')}</dt>
              <dd>
                <State enabled={settings.langfuse.configured} t={t} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.settings.environment')}</dt>
              <dd>{settings.langfuse.environment}</dd>
            </div>
            <div>
              <dt>Base URL</dt>
              <dd>{settings.langfuse.base_url}</dd>
            </div>
          </dl>
        </section>
        <section className="card config-card">
          <header>
            <Database />
            <div>
              <h3>{t('admin.settings.queue')}</h3>
              <p>{t('admin.settings.queueHint')}</p>
            </div>
          </header>
          <dl>
            <div>
              <dt>Redis</dt>
              <dd>
                <State enabled={settings.queue.broker_configured} t={t} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.settings.timezone')}</dt>
              <dd>{settings.queue.timezone}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}

export default AdminSettingsPage;
