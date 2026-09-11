import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TeacherAPI } from '@/api';
import { PageTitle, StudentRow } from '@/components';

function StudentDirectoryPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    TeacherAPI.getStudents().then((data) => setStudents(data.students));
  }, []);
  const shown = students.filter((student) =>
    (student.name + student.student_no + student.class_name + student.tags_text)
      .toLowerCase()
      .includes(filter.toLowerCase())
  );
  const openStudent = (student) =>
    navigate(`/teacher/students/${student.id}`, { state: { student } });
  return (
    <>
      <PageTitle
        eyebrow="学生档案"
        title="了解每一位学生"
        description={`共 ${students.length} 份成长档案，汇集基本信息、兴趣特长与学习轨迹。`}
      />
      <section className="card">
        <div className="directory-tools">
          <div className="search-input">
            <Search size={18} />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="搜索姓名、学号、班级或兴趣…"
            />
          </div>
          <span>{shown.length} 位学生</span>
        </div>
        <div className="student-list directory">
          {shown.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onOpen={openStudent}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export default StudentDirectoryPage;
