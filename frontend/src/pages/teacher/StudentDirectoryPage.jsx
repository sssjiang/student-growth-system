import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../api';
import { PageTitle, StudentRow } from '../../components';

function StudentDirectoryPage({ onOpen }) {
  const [students, setStudents] = useState([]); const [filter, setFilter] = useState('');
  useEffect(() => { api('/teacher/students').then((data) => setStudents(data.students)); }, []);
  const shown = students.filter((student) => (student.name + student.student_no + student.class_name + student.tags_text).toLowerCase().includes(filter.toLowerCase()));
  return <><PageTitle eyebrow="学生档案" title="了解每一位学生" description={`共 ${students.length} 份成长档案，汇集基本信息、兴趣特长与学习轨迹。`} /><section className="card"><div className="directory-tools"><div className="search-input"><Search size={18} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="搜索姓名、学号、班级或兴趣…" /></div><span>{shown.length} 位学生</span></div><div className="student-list directory">{shown.map((student) => <StudentRow key={student.id} student={student} onOpen={onOpen} />)}</div></section></>;
}

export default StudentDirectoryPage;
