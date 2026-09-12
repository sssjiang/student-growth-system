import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  MessageSquareText,
  UserCog,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminAPI } from '@/api';
import { Empty, PageTitle, StatCard } from '@/components';

function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    AdminAPI.getDashboard()
      .then(setData)
      .catch(() => {});
  }, []);

  const stats = data?.stats || {};

  return (
    <>
      <PageTitle
        eyebrow={t('admin.dashboard.eyebrow')}
        title={t('admin.dashboard.title')}
        description={t('admin.dashboard.description')}
      />
      <div className="stats-grid admin-stats">
        <StatCard
          icon={UsersRound}
          label={t('admin.stats.students')}
          value={stats.students ?? '—'}
          tone="green"
          note={t('admin.stats.studentsNote')}
        />
        <StatCard
          icon={UserCog}
          label={t('admin.stats.teachers')}
          value={stats.teachers ?? '—'}
          tone="lav"
          note={t('admin.stats.teachersNote')}
        />
        <StatCard
          icon={BookOpen}
          label={t('admin.stats.documents')}
          value={stats.documents ?? '—'}
          tone="gold"
          note={t('admin.stats.documentsNote')}
        />
        <StatCard
          icon={MessageSquareText}
          label={t('admin.stats.questions')}
          value={stats.questions ?? '—'}
          tone="orange"
          note={t('admin.stats.questionsNote')}
        />
        <StatCard
          icon={AlertTriangle}
          label={t('admin.stats.emptyRetrievals')}
          value={stats.empty_retrievals ?? '—'}
          tone="orange"
          note={t('admin.stats.emptyRetrievalsNote')}
        />
      </div>
      <section className="card admin-panel">
        <div className="card-head">
          <div>
            <h3>{t('admin.dashboard.recent')}</h3>
            <p>{t('admin.dashboard.recentDescription')}</p>
          </div>
        </div>
        {data?.recent_traces?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.fields.question')}</th>
                  <th>{t('admin.fields.student')}</th>
                  <th>{t('admin.fields.subject')}</th>
                  <th>{t('admin.fields.retrieval')}</th>
                  <th>{t('admin.fields.duration')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_traces.map((trace) => (
                  <tr key={trace.id}>
                    <td>
                      <b>{trace.question}</b>
                    </td>
                    <td>{trace.student_name || '—'}</td>
                    <td>{t(`subjects.${trace.subject}`)}</td>
                    <td>
                      {trace.selected_count}/{trace.candidate_count}
                    </td>
                    <td>{trace.duration_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t('admin.dashboard.noTraces')}</Empty>
        )}
      </section>
    </>
  );
}

export default AdminDashboard;
