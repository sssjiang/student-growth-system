import { useQueryError } from '@/hooks/useQueryError';
import {
  useCreateStudentReportMutation,
  useGetStudentReportQuery,
  useGetStudentsQuery,
} from '@/api';
import {
  ArrowLeft,
  BookOpenCheck,
  Download,
  RefreshCw,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Empty, TrendChart } from '@/components';
import { useToast } from '@/hooks/useToast';
import { exportElementToPdf } from '@/utils/exportPdf';

const trendKey = (trend) =>
  trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'stable';

function NumberedList({ items = [], warm = false }) {
  return items.map((item, index) => (
    <p className={`numbered${warm ? ' warm' : ''}`} key={`${index}-${item}`}>
      <span>{index + 1}</span>
      {item}
    </p>
  ));
}

function LegacyReport({ report, t }) {
  return (
    <>
      <div className="legacy-report-notice">{t('report.legacyNotice')}</div>
      <section className="report-narrative report-block">
        <h2>{t('report.executiveSummary')}</h2>
        <p>{report.summary}</p>
      </section>
      <div className="report-two-columns">
        <section className="report-block">
          <h2>{t('report.strengths')}</h2>
          <NumberedList items={report.highlights} />
        </section>
        <section className="report-block">
          <h2>{t('report.focusAreas')}</h2>
          <NumberedList items={report.suggestions} warm />
        </section>
      </div>
    </>
  );
}

function ReportDocument({ data }) {
  const { t } = useTranslation();
  const { report, metrics, grades, student } = data;
  const subjectInsights = Object.fromEntries(
    (report.subject_insights || []).map((item) => [item.subject, item])
  );
  const subjects = Object.entries(metrics?.subjects || {});
  const overall = metrics?.overall || {};
  const modern = report.version === 2;

  return (
    <article className="growth-report-document">
      <header className="growth-report-cover">
        <div>
          <span className="eyebrow">{t('report.eyebrow')}</span>
          <h1>
            {modern
              ? report.title
              : t('detail.reportTitle', { name: student.name })}
          </h1>
          <p>{t('report.subtitle')}</p>
        </div>
        <dl>
          <div>
            <dt>{t('report.student')}</dt>
            <dd>{student.name}</dd>
          </div>
          <div>
            <dt>{t('report.class')}</dt>
            <dd>
              {`${student.grade || ''}${student.class_name || ''}` || '—'}
            </dd>
          </div>
          <div>
            <dt>{t('report.generatedAt')}</dt>
            <dd>
              {data.created_at?.slice(0, 10) || new Date().toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </header>

      <section className="report-kpi-grid">
        <div>
          <small>{t('report.latestAverage')}</small>
          <strong>{overall.latest ?? overall.average ?? '—'}</strong>
        </div>
        <div>
          <small>{t('report.stageChange')}</small>
          <strong>
            {overall.change > 0
              ? `+${overall.change}`
              : (overall.change ?? '—')}
          </strong>
        </div>
        <div>
          <small>{t('report.trend')}</small>
          <strong>{t(`report.trends.${trendKey(overall.trend)}`)}</strong>
        </div>
        <div>
          <small>{t('report.forecast')}</small>
          <strong>{overall.prediction ?? '—'}</strong>
        </div>
      </section>

      {modern ? (
        <>
          <section className="report-narrative report-block">
            <Sparkles />
            <h2>{t('report.executiveSummary')}</h2>
            <p>{report.executive_summary}</p>
            <p>{report.overall_assessment}</p>
          </section>

          <section className="report-block report-chart-section">
            <h2>{t('report.trajectory')}</h2>
            <TrendChart grades={grades} />
          </section>

          <section className="report-block">
            <h2>{t('report.subjectAnalysis')}</h2>
            <div className="subject-analysis-grid">
              {subjects.map(([key, metric]) => {
                const insight = subjectInsights[key] || {};
                return (
                  <article key={key}>
                    <div className="subject-analysis-heading">
                      <h3>{metric.label}</h3>
                      <span className={`trend-pill ${trendKey(metric.trend)}`}>
                        {t(`report.trends.${trendKey(metric.trend)}`)}
                      </span>
                    </div>
                    <div className="subject-metrics">
                      <span>
                        {t('report.latest')} <b>{metric.latest}</b>
                      </span>
                      <span>
                        {t('report.average')} <b>{metric.average}</b>
                      </span>
                      <span>
                        {t('report.predicted')} <b>{metric.prediction}</b>
                      </span>
                    </div>
                    <p>{insight.diagnosis}</p>
                    <p className="subject-recommendation">
                      {insight.recommendation}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="report-two-columns">
            <section className="report-block">
              <BookOpenCheck />
              <h2>{t('report.strengths')}</h2>
              <NumberedList items={report.strengths} />
            </section>
            <section className="report-block">
              <TriangleAlert />
              <h2>{t('report.focusAreas')}</h2>
              <NumberedList items={report.focus_areas} warm />
            </section>
          </div>

          <section className="report-block">
            <Target />
            <h2>{t('report.actionPlan')}</h2>
            <div className="action-plan-grid">
              {report.action_plan.map((item) => (
                <article key={`${item.timeframe}-${item.goal}`}>
                  <span>{item.timeframe}</span>
                  <h3>{item.goal}</h3>
                  <ul>
                    {item.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                  <p>
                    <b>{t('report.successMeasure')}</b>
                    {item.success_measure}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="report-two-columns">
            <section className="report-block">
              <h2>{t('report.interestConnections')}</h2>
              <NumberedList items={report.interest_connections} />
            </section>
            <section className="report-block">
              <h2>{t('report.teacherNotes')}</h2>
              <NumberedList items={report.teacher_notes} />
            </section>
          </div>
        </>
      ) : (
        <LegacyReport report={report} t={t} />
      )}

      <footer>
        <span>
          {data.generated_by?.startsWith('local')
            ? t('detail.localSource')
            : t('detail.aiSource')}
        </span>
        <p>{report.disclaimer}</p>
      </footer>
    </article>
  );
}

function StudentReportPage() {
  const { t } = useTranslation();
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const { currentData: studentData, error: studentError } =
    useGetStudentsQuery();
  const {
    currentData: reportData,
    error: reportError,
    isLoading,
  } = useGetStudentReportQuery(studentId);
  const [createReport, { isLoading: generating }] =
    useCreateStudentReportMutation();
  const student = studentData?.students.find(
    (item) => item.id === Number(studentId)
  );
  useQueryError(studentError || reportError);

  const generate = async () => {
    try {
      await createReport(studentId).unwrap();
      notify(t('detail.generated'));
    } catch (error) {
      notify(error);
    }
  };

  const downloadPdf = async () => {
    if (!reportData?.report || !student) return;
    setExporting(true);
    try {
      await exportElementToPdf(
        reportRef.current,
        t('detail.pdfFilename', { name: student.name }),
        t('detail.reportTitle', { name: student.name })
      );
      notify(t('detail.exportSuccess'));
    } catch (error) {
      console.error('Could not export growth report:', error);
      notify(t('detail.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  if (!student || isLoading) return <Empty>{t('detail.loading')}</Empty>;

  return (
    <>
      <div className="report-page-toolbar">
        <button
          className="back-button"
          onClick={() => navigate(`/teacher/students/${studentId}`)}
        >
          <ArrowLeft />
          {t('report.backToProfile')}
        </button>
        <div>
          {reportData?.report && (
            <button
              className="secondary"
              onClick={downloadPdf}
              disabled={exporting}
            >
              <Download size={17} />
              {exporting ? t('detail.exportingPdf') : t('detail.downloadPdf')}
            </button>
          )}
          <button className="primary" onClick={generate} disabled={generating}>
            {reportData?.report ? (
              <RefreshCw size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            {generating
              ? t('detail.analyzing')
              : reportData?.report
                ? t('report.regenerate')
                : t('detail.generate')}
          </button>
        </div>
      </div>

      {reportData?.report ? (
        <div className="report-paper-wrap" ref={reportRef}>
          <ReportDocument data={reportData} />
        </div>
      ) : (
        <section className="card report-empty-page">
          <Sparkles />
          <h1>{t('detail.noReport')}</h1>
          <p>{t('report.emptyDescription')}</p>
          <button className="primary" onClick={generate} disabled={generating}>
            {generating ? t('detail.analyzing') : t('detail.generate')}
          </button>
        </section>
      )}
    </>
  );
}

export default StudentReportPage;
