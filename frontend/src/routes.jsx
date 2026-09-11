import { Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import {
  GradeImportPage,
  SmartSearchPage,
  StudentDetailPage,
  StudentDirectoryPage,
  TeacherDashboard,
} from '@/pages/teacher';
import { FilesPage, GradesPage, ProfilePage } from '@/pages/student';

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
      { path: 'grades/import', element: <GradeImportPage /> },
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
    ],
  },
  { path: '/', element: <Navigate to="/sign-in" replace /> },
  { path: '*', element: <Navigate to="/sign-in" replace /> },
];

export default routes;
