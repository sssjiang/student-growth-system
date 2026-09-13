import { useQueryError } from '@/hooks/useQueryError';
import { useGetStudentsQuery } from '@/api';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageTitle, StudentRow } from '@/components';

function StudentDirectoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, error } = useGetStudentsQuery();
  const students = data?.students || [];
  useQueryError(error);
  const [filter, setFilter] = useState('');

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
        eyebrow={t('directory.eyebrow')}
        title={t('directory.title')}
        description={t('directory.description', { count: students.length })}
      />
      <section className="card">
        <div className="directory-tools">
          <div className="search-input">
            <Search size={18} />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t('directory.placeholder')}
            />
          </div>
          <span>{t('directory.count', { count: shown.length })}</span>
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
