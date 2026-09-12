import {
  Activity,
  BarChart3,
  BadgeCheck,
  ClipboardList,
  FileText,
  LibraryBig,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, LanguageSwitcher, Logo } from '@/components';

const NAV_ITEMS = {
  admin: [
    {
      label: 'nav.adminDashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    { label: 'nav.userManagement', path: '/admin/users', icon: UsersRound },
    {
      label: 'nav.indexManagement',
      path: '/admin/knowledge',
      icon: LibraryBig,
    },
    {
      label: 'nav.aiObservability',
      path: '/admin/observability',
      icon: Activity,
    },
    { label: 'nav.systemSettings', path: '/admin/settings', icon: Settings },
  ],
  teacher: [
    {
      label: 'nav.dashboard',
      path: '/teacher/dashboard',
      icon: LayoutDashboard,
    },
    { label: 'nav.smartMatch', path: '/teacher/search', icon: Search },
    { label: 'nav.students', path: '/teacher/students', icon: UsersRound },
    {
      label: 'nav.credentialReview',
      path: '/teacher/credentials',
      icon: BadgeCheck,
    },
    {
      label: 'nav.gradeManagement',
      path: '/teacher/grades/import',
      icon: ClipboardList,
    },
    {
      label: 'nav.knowledgeBase',
      path: '/teacher/knowledge',
      icon: LibraryBig,
    },
  ],
  student: [
    { label: 'nav.myProfile', path: '/student/profile', icon: UserRound },
    { label: 'nav.myGrades', path: '/student/grades', icon: BarChart3 },
    { label: 'nav.materials', path: '/student/files', icon: FileText },
    { label: 'nav.aiTutor', path: '/student/tutor', icon: Sparkles },
  ],
};

function AppLayout({ children }) {
  const { t } = useTranslation();
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
          <button
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label={t('nav.closeMenu')}
          >
            <X />
          </button>
        </div>
        <div className="role-label">{t(`nav.${user.role}Workspace`)}</div>
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
                <span>{t(label)}</span>
                {active && <i />}
              </button>
            );
          })}
        </nav>
        <div className="side-foot">
          <button>
            <Settings size={18} />
            {t('nav.settings')}
          </button>
          <button onClick={handleSignOut}>
            <LogOut size={18} />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button className="scrim" onClick={() => setMenuOpen(false)} />
      )}

      <main className="main">
        <div className="topbar">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.openMenu')}
          >
            <Menu />
          </button>
          <div className="topbar-context">
            <span>{t(`nav.${user.role}Center`)}</span>
            <b>{currentItem && t(currentItem.label)}</b>
          </div>
          <LanguageSwitcher compact />
          <div className="user-chip">
            <Avatar name={user.name} size="sm" />
            <span>
              <b>{user.name}</b>
              <small>{t(`nav.${user.role}Role`)}</small>
            </span>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export default AppLayout;
