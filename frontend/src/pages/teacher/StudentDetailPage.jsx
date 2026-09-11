import { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TeacherAPI } from '@/api';
import { Avatar, Empty, TrendChart } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function ReportView({ data }) {
  const { t } = useTranslation();
  const { report, metrics } = data;
  return (
    <section className="report-section">
      <div className="report-heading">
        <div>
          <span className="eyebrow">{t('detail.reportEyebrow')}</span>
          <h2>{t('detail.reportTitle', { name: data.student?.name })}</h2>
        </div>
        <span className="report-source">
          {data.generated_by?.startsWith('local')
            ? t('detail.localSource')
            : t('detail.aiSource')}
        </span>
      </div>
      <div className="insight-grid">
        <article className="insight lead">
          <Sparkles />
          <h3>{t('detail.overview')}</h3>
          <p>{report.summary}</p>
        </article>
        {metrics && (
          <article className="insight metric">
            <Target />
            <small>{t('detail.overallAverage')}</small>
            <strong>{metrics.overall.average}</strong>
            <span>
              {t('detail.prediction', {
                value: metrics.overall.prediction,
              })}
            </span>
          </article>
        )}
      </div>
      <div className="report-columns">
        <article className="card">
          <h3>{t('detail.highlights')}</h3>
          {report.highlights.map((item, index) => (
            <p className="numbered" key={item}>
              <span>{index + 1}</span>
              {item}
            </p>
          ))}
        </article>
        <article className="card">
          <h3>{t('detail.suggestions')}</h3>
          {report.suggestions.map((item, index) => (
            <p className="numbered warm" key={item}>
              <span>{index + 1}</span>
              {item}
            </p>
          ))}
        </article>
      </div>
      <p className="disclaimer">{report.disclaimer}</p>
    </section>
  );
}

function StudentDetailPage() {
  const { t } = useTranslation();
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [student, setStudent] = useState(location.state?.student || null);
  const [grades, setGrades] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    Promise.all([
      TeacherAPI.getStudents(),
      TeacherAPI.getStudentGrades(studentId),
      TeacherAPI.getStudentReport(studentId),
    ]).then(([studentData, gradeData, reportData]) => {
      setStudent(
        studentData.students.find((item) => item.id === Number(studentId)) ||
          null
      );
      setGrades(gradeData.grades);
      setReport(reportData.report ? reportData : null);
    });
  }, [studentId]);
  const generate = async () => {
    setLoading(true);
    try {
      const data = await TeacherAPI.createStudentReport(studentId);
      setReport(data);
      notify(t('detail.generated'));
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };
  if (!student) return <Empty>{t('detail.loading')}</Empty>;
  return (
    <>
      <button
        className="back-button"
        onClick={() => navigate('/teacher/students')}
      >
        <ArrowLeft />
        {t('detail.back')}
      </button>
      <div className="student-banner">
        <Avatar name={student.name} />
        <div>
          <span>
            {student.grade}
            {student.class_name}
          </span>
          <h1>{student.name}</h1>
          <p>
            {student.student_no} · {(student.tags_list || []).join(' / ')}
          </p>
        </div>
        <button className="primary" onClick={generate} disabled={loading}>
          <Sparkles size={17} />
          {loading ? t('detail.analyzing') : t('detail.generate')}
        </button>
      </div>
      <div className="report-layout">
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>{t('detail.trajectory')}</h3>
              <p>{t('detail.periods', { count: grades.length })}</p>
            </div>
          </div>
          <TrendChart grades={grades} />
        </section>
        <section className="card profile-summary">
          <h3>{t('detail.interests')}</h3>
          <div className="large-tags">
            {(student.tags_list || []).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p>{student.description || student.bio || t('detail.noInterests')}</p>
        </section>
      </div>
      {report ? (
        <ReportView data={report} />
      ) : (
        <section className="card no-report">
          <Sparkles />
          <div>
            <h3>{t('detail.noReport')}</h3>
            <p>{t('detail.noReportDesc')}</p>
          </div>
          <button className="secondary" onClick={generate}>
            {t('detail.generateNow')}
          </button>
        </section>
      )}
    </>
  );
}

export default StudentDetailPage;
