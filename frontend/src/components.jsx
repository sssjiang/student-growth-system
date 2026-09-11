import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

export function Logo({ compact = false }) {
  return <div className={`logo ${compact ? 'compact' : ''}`}><span className="logo-mark">知</span>{!compact && <span><b>知行</b><small>学生成长中心</small></span>}</div>;
}

export function Avatar({ name = '', size = 'md' }) {
  const colors = ['peach', 'mint', 'lavender', 'blue'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return <span className={`avatar ${size} ${color}`}>{name.slice(-2)}</span>;
}

export function Empty({ children }) {
  return <div className="empty"><Sparkles size={28} /><p>{children}</p></div>;
}

export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function PageTitle({ eyebrow, title, description, action }) {
  return <header className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}

export function StudentRow({ student, onOpen, showScore = false }) {
  return <button className="student-row" onClick={() => onOpen?.(student)}>
    <Avatar name={student.name} />
    <span className="student-main"><b>{student.name}</b><small>{student.student_no} · {student.grade}{student.class_name}</small></span>
    <span className="tag-list">{(student.tags_list || []).slice(0, 3).map(tag => <em key={tag}>{tag}</em>)}</span>
    {showScore ? <span className="match-score"><b>{Math.round((student.score || 0) * 100)}%</b><small>匹配度</small></span> : <span className="score-cell">{student.average ?? '—'}</span>}
    <ChevronRight size={18} />
  </button>;
}

export function TrendChart({ grades = [], subjects = ['chinese', 'math', 'english', 'politics'] }) {
  if (!grades.length) return <Empty>暂无成绩数据</Empty>;
  const colors = { chinese: '#ef8354', math: '#476a57', english: '#6f76a8', politics: '#d4a72c' };
  const labels = { chinese: '语文', math: '数学', english: '英语', politics: '政治' };
  const width = 720, height = 250, left = 40, top = 18, chartW = 640, chartH = 190;
  const x = i => grades.length === 1 ? left + chartW / 2 : left + i * chartW / (grades.length - 1);
  const y = value => top + (100 - value) * chartH / 40;
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="成绩趋势折线图">
    {[60,70,80,90,100].map(value => <g key={value}><line x1={left} x2={left+chartW} y1={y(value)} y2={y(value)} className="grid-line"/><text x="4" y={y(value)+4}>{value}</text></g>)}
    {subjects.map(subject => {
      const points = grades.map((grade,i) => `${x(i)},${y(grade[subject])}`).join(' ');
      return <g key={subject}><polyline points={points} fill="none" stroke={colors[subject]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{grades.map((grade,i)=><circle key={i} cx={x(i)} cy={y(grade[subject])} r="4" fill="white" stroke={colors[subject]} strokeWidth="3"/>)}</g>;
    })}
    {grades.map((grade,i)=><text key={i} x={x(i)} y="238" textAnchor="middle">{grade.year}.{grade.semester}</text>)}
  </svg><div className="legend">{subjects.map(subject=><span key={subject}><i style={{background:colors[subject]}} />{labels[subject]}</span>)}</div></div>;
}
