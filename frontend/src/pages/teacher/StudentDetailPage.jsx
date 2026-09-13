import { useQueryError } from '@/hooks/useQueryError';
import {
  useGetStudentGradesQuery,
  useGetStudentReportQuery,
  useGetStudentsQuery,
} from '@/api';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Empty, TrendChart } from '@/components';

function StudentDetailPage() {
  const { t } = useTranslation();
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentData: studentData, error: studentError } =
    useGetStudentsQuery();
  const { currentData: gradeData, error: gradeError } =
    useGetStudentGradesQuery(studentId);
  const { currentData: reportData, error: reportError } =
    useGetStudentReportQuery(studentId);
  const student =
    studentData?.students.find((item) => item.id === Number(studentId)) ||
    location.state?.student ||
    null;
  const grades = gradeData?.grades || [];
  const hasReport = Boolean(reportData?.report);
  useQueryError(studentError || gradeError || reportError);

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
        <div className="student-banner-actions">
          <button
            className="primary"
            onClick={() => navigate(`/teacher/students/${studentId}/report`)}
          >
            {hasReport ? <FileText size={17} /> : <Sparkles size={17} />}
            {hasReport ? t('detail.viewReport') : t('detail.openReport')}
          </button>
        </div>
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
      <section className="card report-entry-card">
        <Sparkles />
        <div>
          <h3>{hasReport ? t('detail.reportReady') : t('detail.noReport')}</h3>
          <p>
            {hasReport ? t('detail.reportReadyDesc') : t('detail.noReportDesc')}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => navigate(`/teacher/students/${studentId}/report`)}
        >
          {hasReport ? t('detail.viewReport') : t('detail.generateNow')}
        </button>
      </section>
    </>
  );
}

export default StudentDetailPage;
