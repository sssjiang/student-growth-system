import React, { useState } from 'react';
import { BarChart3, ClipboardList, FileText, LayoutDashboard, Search, UserRound, UsersRound } from 'lucide-react';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import TeacherPages from './pages/teacher/TeacherPages';
import StudentPages from './pages/student/StudentPages';

export const NAV_ITEMS = {
  teacher: [
    ['dashboard', '工作台', LayoutDashboard], ['search', '智能匹配', Search],
    ['students', '学生档案', UsersRound], ['import', '成绩管理', ClipboardList],
  ],
  student: [
    ['profile', '我的档案', UserRound], ['grades', '我的成绩', BarChart3],
    ['files', '成长材料', FileText],
  ],
};

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('student_user') || 'null'));
  const [page, setPage] = useState(session?.role === 'teacher' ? 'dashboard' : 'profile');
  const [toast, setToast] = useState('');
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const login = (data) => {
    localStorage.setItem('student_token', data.token);
    localStorage.setItem('student_user', JSON.stringify(data.user));
    setSession(data.user); setPage(data.user.role === 'teacher' ? 'dashboard' : 'profile');
  };
  const logout = () => {
    localStorage.removeItem('student_token'); localStorage.removeItem('student_user'); setSession(null);
  };
  if (!session) return <LoginPage onLogin={login} />;
  return <AppLayout session={session} page={page} setPage={setPage} navItems={NAV_ITEMS} toast={toast} onLogout={logout}>
    {session.role === 'teacher'
      ? <TeacherPages page={page} setPage={setPage} notify={notify} />
      : <StudentPages page={page} notify={notify} />}
  </AppLayout>;
}

export default App;
