import React, { useState } from 'react';
import { Check, ChevronRight, LogOut, Menu, Settings, X } from 'lucide-react';
import { Avatar, Logo } from '../components';

function AppLayout({ session, page, setPage, navItems, toast, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItems[session.role];
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="side-top"><Logo /><button className="mobile-close" onClick={() => setMenuOpen(false)}><X /></button></div>
      <div className="role-label">{session.role === 'teacher' ? '教师工作空间' : '学生成长空间'}</div>
      <nav>{items.map(([key, label, Icon]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => { setPage(key); setMenuOpen(false); }}><Icon size={19} /><span>{label}</span>{page === key && <i />}</button>)}</nav>
      <div className="side-foot"><button><Settings size={18} />系统设置</button><button onClick={onLogout}><LogOut size={18} />退出登录</button></div>
    </aside>
    {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} />}
    <main className="main">
      <div className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)}><Menu /></button><div className="topbar-context"><span>{session.role === 'teacher' ? '教学管理中心' : '个人成长中心'}</span><ChevronRight size={14} /><b>{items.find((item) => item[0] === page)?.[1]}</b></div><div className="user-chip"><Avatar name={session.name} size="sm" /><span><b>{session.name}</b><small>{session.role === 'teacher' ? '班主任 · 教师' : '在校学生'}</small></span></div></div>
      <div className="content">{children}</div>
    </main>
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>;
}

export default AppLayout;
