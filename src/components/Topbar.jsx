import { Bell, Bot, LogOut, User, Code2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function Topbar({ title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{user?.role ? `${user.role.toUpperCase()} WORKSPACE` : 'WORKSPACE'}</p>
        <h2>{title}</h2>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {actions}

        {/* Swagger API Docs */}
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="toolbar-button"
          title="Swagger API Documentation"
          style={{ position: 'relative', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600 }}
        >
          <Code2 size={16} />
          <span>Swagger API</span>
        </a>

        {/* AI Sponsorship Advisor Link */}
        <Link
          to="/ai-chat"
          className="toolbar-button"
          title="AI Sponsorship Advisor"
          style={{ position: 'relative', color: '#6366f1' }}
        >
          <Bot size={18} />
        </Link>

        {/* Notification Bell with live count */}
        <Link
          to="/notifications"
          className="toolbar-button"
          title="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {unreadCount}
            </span>
          )}
        </Link>

        {/* User Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '0.85rem',
          }}
        >
          <User size={16} color="#6366f1" />
          <span style={{ fontWeight: 600 }}>{user?.name || 'User'}</span>
          <span className="tag-chip" style={{ margin: 0, textTransform: 'capitalize' }}>
            {user?.role}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="toolbar-button"
          title="Sign Out"
          style={{ color: '#ef4444' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
