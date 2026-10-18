import { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Users, Calendar, Handshake, CheckCircle2, AlertTriangle, Trash2, Shield, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await api.get('/auth/admin/health');
      if (res.data?.success) {
        setHealthData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch health data', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/auth/admin/users', { params });
      if (res.data?.success) {
        setUsers(res.data.data.users);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await api.patch(`/auth/admin/users/${user.id}/status`, { status: nextStatus });
      showToast(`User ${user.name} is now ${nextStatus}`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await api.delete(`/auth/admin/users/${deleteConfirmUser.id}`);
      showToast(`User ${deleteConfirmUser.name} deleted successfully`, 'success');
      setDeleteConfirmUser(null);
      fetchUsers();
      fetchHealth();
    } catch (err) {
      showToast(err.response?.data?.message || 'Deletion failed', 'error');
    }
  };

  const dbStats = healthData?.database?.stats || {};
  const ollama = healthData?.ollama || {};

  return (
    <AdminLayout title="Platform Administration" subtitle="System health, governance, and user access directory">
      {/* System Health Banner */}
      <div className="panel" style={{ marginBottom: '24px', borderLeft: '4px solid var(--violet)' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--violet)" />
            <h3 style={{ margin: 0 }}>System Health & Infrastructure Telemetry</h3>
          </div>
          <button className="action-btn-sm" onClick={() => { fetchHealth(); fetchUsers(); }}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh
          </button>
        </div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Backend Express API</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <CheckCircle2 size={16} color="#10b981" />
              <strong>Operational (Port 5000)</strong>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>MySQL 8.4 Pool</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <CheckCircle2 size={16} color="#10b981" />
              <strong>Connected (c34_sponsorship_desk)</strong>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Local Ollama Engine</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              {ollama.available ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#f59e0b" />}
              <strong style={{ fontSize: '0.9rem' }}>
                {ollama.available ? `Active (${ollama.activeModel})` : 'Offline / Heuristics'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card violet">
          <div className="stat-card-icon"><Users size={20} /></div>
          <span>Total Platform Users</span>
          <strong>{dbStats.users || users.length}</strong>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-icon"><Calendar size={20} /></div>
          <span>Published Events</span>
          <strong>{dbStats.events || 0}</strong>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon"><Handshake size={20} /></div>
          <span>Active Agreements</span>
          <strong>{dbStats.agreements || 0}</strong>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-icon"><CheckCircle2 size={20} /></div>
          <span>Sponsorship Proposals</span>
          <strong>{dbStats.proposals || 0}</strong>
        </div>
      </div>

      {/* User Directory */}
      <div className="panel">
        <div className="panel-header">
          <h3>Registered Users Directory</h3>
          <span>{users.length} accounts loaded</span>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          />
          <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="organizer">Organizers</option>
            <option value="sponsor">Sponsors</option>
            <option value="admin">Administrators</option>
          </select>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <button className="primary-button" onClick={fetchUsers}>Filter</button>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No users found matching query.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="tag-chip" style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="action-btn-sm"
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="action-btn-sm danger"
                          onClick={() => setDeleteConfirmUser(u)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#ef4444' }}>Confirm User Deletion</h3>
              <button className="toolbar-button" onClick={() => setDeleteConfirmUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete user <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})?</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                This will delete their user record, associated profiles, and history. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button className="ghost-button" onClick={() => setDeleteConfirmUser(null)}>Cancel</button>
                <button className="action-btn-sm danger" style={{ padding: '10px 16px' }} onClick={handleDeleteUser}>
                  Yes, Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
