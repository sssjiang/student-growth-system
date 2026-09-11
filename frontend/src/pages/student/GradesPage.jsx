import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StudentAPI } from '@/api';
import { PageTitle, StatCard, TrendChart } from '@/components';

function GradesPage() {
  const { t } = useTranslation();
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
        eyebrow={t('grades.eyebrow')}
        title={t('grades.title')}
        description={t('grades.description')}
      />
      <div className="stat-grid student-stats">
        <StatCard
          icon={GraduationCap}
          value={average}
          label={t('grades.overallAverage')}
          note={t('grades.allSemesters')}
          tone="green"
        />
        <StatCard
          icon={CalendarDays}
          value={grades.length}
          label={t('grades.recorded')}
          note={t('grades.accumulating')}
          tone="orange"
        />
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('grades.trend')}</h3>
            <p>{t('grades.subjectList')}</p>
          </div>
        </div>
        <TrendChart grades={grades} />
      </section>
      <section className="card grade-table">
        <h3>{t('grades.details')}</h3>
        <table>
          <thead>
            <tr>
              <th>{t('grades.period')}</th>
              <th>{t('subjects.chinese')}</th>
              <th>{t('subjects.math')}</th>
              <th>{t('subjects.english')}</th>
              <th>{t('subjects.politics')}</th>
              <th>{t('subjects.average')}</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={`${grade.year}-${grade.semester}`}>
                <td>
                  {t('grades.periodValue', {
                    year: grade.year,
                    semester: grade.semester,
                  })}
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
