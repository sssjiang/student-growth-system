import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';
import { StudentAPI } from '@/api';
import { PageTitle, StatCard, TrendChart } from '@/components';

function GradesPage() {
  const [grades, setGrades] = useState([]);
  useEffect(() => {
    StudentAPI.getGrades().then((data) => setGrades(data.grades));
  }, []);
  const average = useMemo(
    () =>
      grades.length
        ? (
            grades.reduce(
              (sum, grade) =>
                sum +
                grade.chinese +
                grade.math +
                grade.english +
                grade.politics,
              0
            ) /
            (grades.length * 4)
          ).toFixed(1)
        : '—',
    [grades]
  );
  return (
    <>
      <PageTitle
        eyebrow="学习轨迹"
        title="我的成绩变化"
        description="关注长期趋势，比一次分数更有意义。"
      />
      <div className="stat-grid student-stats">
        <StatCard
          icon={GraduationCap}
          value={average}
          label="综合平均分"
          note="全部已录入学期"
          tone="green"
        />
        <StatCard
          icon={CalendarDays}
          value={grades.length}
          label="已记录学期"
          note="持续积累中"
          tone="orange"
        />
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h3>四科趋势</h3>
            <p>语文、数学、英语、政治</p>
          </div>
        </div>
        <TrendChart grades={grades} />
      </section>
      <section className="card grade-table">
        <h3>历年成绩明细</h3>
        <table>
          <thead>
            <tr>
              <th>学年学期</th>
              <th>语文</th>
              <th>数学</th>
              <th>英语</th>
              <th>政治</th>
              <th>平均分</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={`${grade.year}-${grade.semester}`}>
                <td>
                  {grade.year} 年 · 第 {grade.semester} 学期
                </td>
                <td>{grade.chinese}</td>
                <td>{grade.math}</td>
                <td>{grade.english}</td>
                <td>{grade.politics}</td>
                <td>
                  <b>
                    {(
                      (grade.chinese +
                        grade.math +
                        grade.english +
                        grade.politics) /
                      4
                    ).toFixed(1)}
                  </b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export default GradesPage;
