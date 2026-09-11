import React from 'react';
import ProfilePage from './ProfilePage';
import GradesPage from './GradesPage';
import FilesPage from './FilesPage';

function StudentPages({ page, notify }) {
  if (page === 'grades') return <GradesPage />;
  if (page === 'files') return <FilesPage notify={notify} />;
  return <ProfilePage notify={notify} />;
}

export default StudentPages;
