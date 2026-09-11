import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FileText,
  Search,
  Sparkles,
  Upload,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TeacherAPI } from '@/api';
import { Empty, PageTitle, StatCard, StudentRow } from '@/components';

function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => {
    TeacherAPI.getDashboard()
      .then(setData)
      .catch(() => {});
  }, []);
  const openStudent = (student) =>
    navigate(`/teacher/students/${student.id}`, { state: { student } });
  const stats = data?.stats || {
    students: '—',
    classes: '—',
    grade_records: '—',
    reports: '—',
  };
  return (
    <>
      <PageTitle
        eyebrow={t('dashboard.greeting')}
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        action={
          <button
            className="primary"
            onClick={() => navigate('/teacher/search')}
          >
            <Sparkles size={17} />
            {t('dashboard.smartMatch')}
          </button>
        }
      />
      <div className="stat-grid">
        <StatCard
          icon={UsersRound}
          value={stats.students}
          label={t('dashboard.students')}
          note={t('dashboard.studentsNote')}
          tone="green"
        />
        <StatCard
          icon={BookOpen}
          value={stats.classes}
          label={t('dashboard.classes')}
          note={t('dashboard.classesNote')}
          tone="orange"
        />
        <StatCard
          icon={BarChart3}
          value={stats.grade_records}
          label={t('dashboard.records')}
          note={t('dashboard.recordsNote')}
          tone="purple"
        />
        <StatCard
          icon={FileText}
          value={stats.reports}
          label={t('dashboard.reports')}
          note={t('dashboard.reportsNote')}
          tone="gold"
        />
      </div>
      <div className="dashboard-grid">
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>{t('dashboard.recent')}</h3>
              <p>{t('dashboard.recentDesc')}</p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate('/teacher/students')}
            >
              {t('dashboard.viewAll')} <ChevronRight size={16} />
            </button>
          </div>
          <div className="student-list">
            {data?.students?.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                onOpen={openStudent}
              />
            )) || <Empty>{t('dashboard.loading')}</Empty>}
          </div>
        </section>
        <section className="card quick-card">
          <div className="card-head">
            <div>
              <h3>{t('dashboard.quick')}</h3>
              <p>{t('dashboard.quickDesc')}</p>
            </div>
          </div>
          <button onClick={() => navigate('/teacher/search')}>
            <span className="quick-icon green">
              <Search />
            </span>
            <span>
              <b>{t('dashboard.find')}</b>
              <small>{t('dashboard.findDesc')}</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => navigate('/teacher/grades/import')}>
            <span className="quick-icon orange">
              <Upload />
            </span>
            <span>
              <b>{t('dashboard.import')}</b>
              <small>{t('dashboard.importDesc')}</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => navigate('/teacher/students')}>
            <span className="quick-icon purple">
              <FileText />
            </span>
            <span>
              <b>{t('dashboard.report')}</b>
              <small>{t('dashboard.reportDesc')}</small>
            </span>
            <ChevronRight />
          </button>
        </section>
      </div>
    </>
  );
}

export default TeacherDashboard;
