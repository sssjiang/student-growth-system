import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';

const COLORS = {
  chinese: '#ef8354',
  math: '#476a57',
  english: '#6f76a8',
  politics: '#d4a72c',
};
const DEFAULT_SUBJECTS = ['chinese', 'math', 'english', 'politics'];
const WIDTH = 720;
const HEIGHT = 250;
const LEFT = 40;
const TOP = 18;
const CHART_WIDTH = 640;
const CHART_HEIGHT = 190;

function TrendChart({ grades = [], subjects = DEFAULT_SUBJECTS }) {
  const { t } = useTranslation();
  if (!grades.length) return <EmptyState>{t('grades.empty')}</EmptyState>;

  const x = (index) =>
    grades.length === 1
      ? LEFT + CHART_WIDTH / 2
      : LEFT + (index * CHART_WIDTH) / (grades.length - 1);
  const y = (value) => TOP + ((100 - value) * CHART_HEIGHT) / 40;

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('grades.chartLabel')}
      >
        {[60, 70, 80, 90, 100].map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={LEFT + CHART_WIDTH}
              y1={y(value)}
              y2={y(value)}
              className="grid-line"
            />
            <text x="4" y={y(value) + 4}>
              {value}
            </text>
          </g>
        ))}
        {subjects.map((subject) => {
          const points = grades
            .map((grade, index) => `${x(index)},${y(grade[subject])}`)
            .join(' ');
          return (
            <g key={subject}>
              <polyline
                points={points}
                fill="none"
                stroke={COLORS[subject]}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {grades.map((grade, index) => (
                <circle
                  key={`${grade.year}-${grade.semester}`}
                  cx={x(index)}
                  cy={y(grade[subject])}
                  r="4"
                  fill="white"
                  stroke={COLORS[subject]}
                  strokeWidth="3"
                />
              ))}
            </g>
          );
        })}
        {grades.map((grade, index) => (
          <text
            key={`${grade.year}-${grade.semester}`}
            x={x(index)}
            y="238"
            textAnchor="middle"
          >
            {grade.year}.{grade.semester}
          </text>
        ))}
      </svg>
      <div className="legend">
        {subjects.map((subject) => (
          <span key={subject}>
            <i style={{ background: COLORS[subject] }} />
            {t(`subjects.${subject}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default TrendChart;
