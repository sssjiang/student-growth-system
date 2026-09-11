import React, { useEffect, useState } from 'react';
import TeacherDashboard from './TeacherDashboard';
import SmartSearchPage from './SmartSearchPage';
import StudentDirectoryPage from './StudentDirectoryPage';
import GradeImportPage from './GradeImportPage';
import StudentDetailPage from './StudentDetailPage';

function TeacherPages({ page, setPage, notify }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [page]);
  if (selected) return <StudentDetailPage student={selected} onBack={() => setSelected(null)} notify={notify} />;
  if (page === 'search') return <SmartSearchPage onOpen={setSelected} />;
  if (page === 'students') return <StudentDirectoryPage onOpen={setSelected} />;
  if (page === 'import') return <GradeImportPage notify={notify} />;
  return <TeacherDashboard onNavigate={setPage} onOpen={setSelected} />;
}

export default TeacherPages;
