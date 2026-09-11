import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('student_user') || 'null')
  );

  const signIn = useCallback((session) => {
    localStorage.setItem('student_token', session.token);
    localStorage.setItem('student_user', JSON.stringify(session.user));
    setUser(session.user);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: Boolean(user), signIn, signOut, user }),
    [signIn, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
