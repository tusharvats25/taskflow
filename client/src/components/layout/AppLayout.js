import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users,
  User, LogOut, Menu, X, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const navLinks = [
    { to: '/', icon: <LayoutDashboard size={17} />, label: 'Dashboard', end: true },
    { to: '/projects', icon: <FolderKanban size={17} />, label: 'Projects' },
    { to: '/tasks', icon: <CheckSquare size={17} />, label: 'My Tasks' },
  ];

  const adminLinks = [
    { to: '/users', icon: <Users size={17} />, label: 'Users' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position:'fixed',inset:0,zIndex:99,background:'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Zap size={20} fill="currentColor" />
          TaskFlow
          <span style={{fontSize:'0.65rem',marginLeft:'auto',color:'var(--text-muted)'}}>v1.0</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navLinks.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {icon}{label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{marginTop:8}}>Admin</div>
              {adminLinks.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {icon}{label}
                </NavLink>
              ))}
            </>
          )}

          <div style={{flex:1}} />

          <div className="nav-section-label">Account</div>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <User size={17} />Profile
          </NavLink>
          <button className="nav-link" onClick={handleLogout}>
            <LogOut size={17} />Sign Out
          </button>
        </nav>

        <div className="sidebar-user">
          <div
            className="avatar avatar-md"
            style={{ background: user?.avatarColor, color: '#fff', flexShrink: 0 }}
          >
            {getInitials(user?.name)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name truncate">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="btn btn-ghost btn-icon"
            style={{display:'none'}}
            id="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Mobile menu btn - always show on mobile via CSS */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{marginRight:8}}
          >
            <Menu size={18} />
          </button>

          <div style={{flex:1}} />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="avatar avatar-sm"
                style={{ background: user?.avatarColor, color: '#fff' }}
              >
                {getInitials(user?.name)}
              </div>
              <div>
                <div style={{fontSize:'0.825rem',fontWeight:600}}>{user?.name}</div>
                <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
