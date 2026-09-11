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
import { useNavigate } from 'react-router-dom';
import { TeacherAPI } from '@/api';
import { Empty, PageTitle, StatCard, StudentRow } from '@/components';

function TeacherDashboard() {
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
        eyebrow="上午好，王老师"
        title="今天也一起关注学生的成长"
        description="这里汇总了班级的最新动态与待办事项。"
        action={
          <button
            className="primary"
            onClick={() => navigate('/teacher/search')}
          >
            <Sparkles size={17} />
            智能匹配学生
          </button>
        }
      />
      <div className="stat-grid">
        <StatCard
          icon={UsersRound}
          value={stats.students}
          label="学生档案"
          note="资料持续完善中"
          tone="green"
        />
        <StatCard
          icon={BookOpen}
          value={stats.classes}
          label="覆盖班级"
          note="当前学年"
          tone="orange"
        />
        <StatCard
          icon={BarChart3}
          value={stats.grade_records}
          label="成绩记录"
          note="跨学期趋势数据"
          tone="purple"
        />
        <StatCard
          icon={FileText}
          value={stats.reports}
          label="成长报告"
          note="已生成个性化分析"
          tone="gold"
        />
      </div>
      <div className="dashboard-grid">
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>最近学生</h3>
              <p>快速查看学生档案与成绩趋势</p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate('/teacher/students')}
            >
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div className="student-list">
            {data?.students?.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                onOpen={openStudent}
              />
            )) || <Empty>正在加载学生数据…</Empty>}
          </div>
        </section>
        <section className="card quick-card">
          <div className="card-head">
            <div>
              <h3>快捷操作</h3>
              <p>从这里开始今日工作</p>
            </div>
          </div>
          <button onClick={() => navigate('/teacher/search')}>
            <span className="quick-icon green">
              <Search />
            </span>
            <span>
              <b>寻找活动人选</b>
              <small>用自然语言描述需求</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => navigate('/teacher/grades/import')}>
            <span className="quick-icon orange">
              <Upload />
            </span>
            <span>
              <b>导入成绩数据</b>
              <small>支持标准 CSV 文件</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => navigate('/teacher/students')}>
            <span className="quick-icon purple">
              <FileText />
            </span>
            <span>
              <b>生成成长报告</b>
              <small>基于真实成绩趋势</small>
            </span>
            <ChevronRight />
          </button>
        </section>
      </div>
    </>
  );
}

export default TeacherDashboard;
