import { useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import { User, Bell, Shield, Save } from 'lucide-react';

export default function SponsorSettings() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotification();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [counterofferAlerts, setCounterofferAlerts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.put('/auth/profile', { name, phone });
      if (res.data?.success) {
        showToast('Settings saved successfully', 'success');
        refreshUser();
      }
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SponsorLayout title="Account & Communication Settings" subtitle="Manage profile credentials and in-app alert preferences">
      <div className="panel" style={{ maxWidth: '750px', margin: '0 auto' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--violet)" />
            <h3 style={{ margin: 0 }}>Account Contact Information</h3>
          </div>
          <span className="badge badge-success">Active Account</span>
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px', display: 'grid', gap: '18px' }}>
          <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
            Contact Representative Name
            <input
              type="text"
              className="filter-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
            Registered Account Email (Immutable)
            <input
              type="email"
              disabled
              className="filter-input"
              style={{ background: '#f1f5f9', color: 'var(--muted)' }}
              value={user?.email || ''}
            />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
            Phone Number
            <input
              type="text"
              className="filter-input"
              placeholder="+91 98765 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} /> In-App Notification Preferences
            </h4>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={counterofferAlerts}
                onChange={(e) => setCounterofferAlerts(e.target.checked)}
              />
              <span>Receive instant in-app alerts on new counteroffers</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
              />
              <span>Notify me when evidence and telemetry are submitted for review</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" className="primary-button" disabled={submitting}>
              <Save size={16} style={{ marginRight: '6px' }} />
              {submitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </SponsorLayout>
  );
}
