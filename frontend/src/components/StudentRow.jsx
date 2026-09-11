import { ChevronRight } from 'lucide-react';
import Avatar from './Avatar';

function StudentRow({ onOpen, showScore = false, student }) {
  return (
    <button className="student-row" onClick={() => onOpen?.(student)}>
      <Avatar name={student.name} />
      <span className="student-main">
        <b>{student.name}</b>
        <small>
          {student.student_no} · {student.grade}
          {student.class_name}
        </small>
      </span>
      <span className="tag-list">
        {(student.tags_list || []).slice(0, 3).map((tag) => (
          <em key={tag}>{tag}</em>
        ))}
      </span>
      {showScore ? (
        <span className="match-score">
          <b>{Math.round((student.score || 0) * 100)}%</b>
          <small>匹配度</small>
        </span>
      ) : (
        <span className="score-cell">{student.average ?? '—'}</span>
      )}
      <ChevronRight size={18} />
    </button>
  );
}

export default StudentRow;
