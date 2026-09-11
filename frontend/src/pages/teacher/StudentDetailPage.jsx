import { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Target } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TeacherAPI } from '@/api';
import { Avatar, Empty, TrendChart } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function ReportView({ data }) {
  const { report, metrics } = data;
  return (
    <section className="report-section">
      <div className="report-heading">
        <div>
          <span className="eyebrow">个性化成长报告</span>
          <h2>{data.student?.name}的学习趋势洞察</h2>
        </div>
        <span className="report-source">
          {data.generated_by?.startsWith('local')
            ? '本地分析生成'
            : 'Claude 辅助生成'}
        </span>
      </div>
      <div className="insight-grid">
        <article className="insight lead">
          <Sparkles />
          <h3>综合观察</h3>
          <p>{report.summary}</p>
        </article>
        {metrics && (
          <article className="insight metric">
            <Target />
            <small>综合均分</small>
            <strong>{metrics.overall.average}</strong>
            <span>下学期预测 {metrics.overall.prediction}</span>
          </article>
        )}
      </div>
      <div className="report-columns">
        <article className="card">
          <h3>值得肯定的变化</h3>
          {report.highlights.map((item, index) => (
            <p className="numbered" key={item}>
              <span>{index + 1}</span>
              {item}
            </p>
          ))}
        </article>
        <article className="card">
          <h3>下一步行动建议</h3>
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
      notify('成长报告已生成');
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };
  if (!student) return <Empty>正在加载学生档案…</Empty>;
  return (
    <>
      <button
        className="back-button"
        onClick={() => navigate('/teacher/students')}
      >
        <ArrowLeft />
        返回学生列表
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
          {loading ? '正在分析…' : '生成 AI 成长报告'}
        </button>
      </div>
      <div className="report-layout">
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>成绩发展轨迹</h3>
              <p>{grades.length} 个学期 · 四科成绩变化</p>
            </div>
          </div>
          <TrendChart grades={grades} />
        </section>
        <section className="card profile-summary">
          <h3>兴趣与特长</h3>
          <div className="large-tags">
            {(student.tags_list || []).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p>{student.description || student.bio || '暂无兴趣描述'}</p>
        </section>
      </div>
      {report ? (
        <ReportView data={report} />
      ) : (
        <section className="card no-report">
          <Sparkles />
          <div>
            <h3>还没有生成成长报告</h3>
            <p>系统将先计算真实成绩趋势，再用 AI 转写为清晰建议。</p>
          </div>
          <button className="secondary" onClick={generate}>
            现在生成
          </button>
        </section>
      )}
    </>
  );
}

export default StudentDetailPage;
