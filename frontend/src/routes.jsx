import { Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import {
  CredentialReviewPage,
  GradeImportPage,
  KnowledgeBasePage,
  SmartSearchPage,
  StudentDetailPage,
  StudentDirectoryPage,
  TeacherDashboard,
} from '@/pages/teacher';
import { FilesPage, GradesPage, ProfilePage, TutorPage } from '@/pages/student';

const routes = [
  { path: '/sign-in', element: <LoginPage /> },
  {
    path: '/teacher',
    element: (
      <ProtectedRoute roles={['teacher']}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <TeacherDashboard /> },
      { path: 'search', element: <SmartSearchPage /> },
      { path: 'students', element: <StudentDirectoryPage /> },
      { path: 'students/:studentId', element: <StudentDetailPage /> },
      { path: 'credentials', element: <CredentialReviewPage /> },
      { path: 'grades/import', element: <GradeImportPage /> },
      { path: 'knowledge', element: <KnowledgeBasePage /> },
    ],
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute roles={['student']}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="profile" replace /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'grades', element: <GradesPage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'tutor', element: <TutorPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/sign-in" replace /> },
  { path: '*', element: <Navigate to="/sign-in" replace /> },
];

export default routes;
