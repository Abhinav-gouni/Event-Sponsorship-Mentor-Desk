import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import SponsorLayout from '../../layouts/SponsorLayout';
import AdminLayout from '../../layouts/AdminLayout';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllRead, loading } = useNotification();

  const Layout = user?.role === 'sponsor' ? SponsorLayout : user?.role === 'admin' ? AdminLayout : OrganizerLayout;

  return (
    <Layout title="In-App Notifications" subtitle="Audited event updates, counteroffer notices, and fulfilment review alerts">
      <div className="panel" style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="var(--violet)" />
            <h3 style={{ margin: 0 }}>Activity & Deadline Alerts ({notifications.length})</h3>
          </div>
          <button className="action-btn-sm" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCheck size={14} /> Mark All as Read
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'grid', gap: '12px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '30px' }}>
              No notifications yet. You will receive real-time alerts when counteroffers or deliverables are submitted.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: n.is_read ? '#fafafa' : '#f5f3ff',
                  borderLeft: n.is_read ? '1px solid var(--border)' : '4px solid var(--violet)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{n.title}</strong>
                    {!n.is_read && <span className="badge badge-warning">New</span>}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
