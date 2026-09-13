import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    const home =
      user.role === 'teacher' ? '/teacher/dashboard' : '/student/profile';
    return <Navigate to={home} replace />;
  }

  return children;
}

export default ProtectedRoute;
