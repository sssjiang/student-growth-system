import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Logo } from '@/components';

const NAV_ITEMS = {
  teacher: [
    { label: '工作台', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: '智能匹配', path: '/teacher/search', icon: Search },
    { label: '学生档案', path: '/teacher/students', icon: UsersRound },
    { label: '成绩管理', path: '/teacher/grades/import', icon: ClipboardList },
  ],
  student: [
    { label: '我的档案', path: '/student/profile', icon: UserRound },
    { label: '我的成绩', path: '/student/grades', icon: BarChart3 },
    { label: '成长材料', path: '/student/files', icon: FileText },
  ],
};

function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const items = NAV_ITEMS[user.role];
  const currentItem = items.find((item) => pathname.startsWith(item.path));

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="side-top">
          <Logo />
          <button className="mobile-close" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>
        <div className="role-label">
          {user.role === 'teacher' ? '教师工作空间' : '学生成长空间'}
        </div>
        <nav>
          {items.map(({ icon: Icon, label, path }) => {
            const active = pathname.startsWith(path);
            return (
              <button
                key={path}
                className={active ? 'active' : ''}
                onClick={() => handleNavigate(path)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {active && <i />}
              </button>
            );
          })}
        </nav>
        <div className="side-foot">
          <button>
            <Settings size={18} />
            系统设置
          </button>
          <button onClick={handleSignOut}>
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button className="scrim" onClick={() => setMenuOpen(false)} />
      )}

      <main className="main">
        <div className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <div className="topbar-context">
            <span>
              {user.role === 'teacher' ? '教学管理中心' : '个人成长中心'}
            </span>
            <b>{currentItem?.label}</b>
          </div>
          <div className="user-chip">
            <Avatar name={user.name} size="sm" />
            <span>
              <b>{user.name}</b>
              <small>
                {user.role === 'teacher' ? '班主任 · 教师' : '在校学生'}
              </small>
            </span>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export default AppLayout;
