import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AuthLayout from '../../layouts/AuthLayout';
import api from '../../services/api';
import { LogIn, Sparkles, Shield } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useNotification();
  const [form, setForm] = useState({ email: 'organizer@techsummit.io', password: 'password123' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      return showToast('Please enter your email and password', 'error');
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/login', form);
      if (res.data?.success && res.data.data) {
        const { user, token } = res.data.data;
        login(user, token);
        showToast(`Welcome back, ${user.name}!`, 'success');

        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'sponsor') {
          navigate('/sponsor/dashboard');
        } else {
          navigate('/organizer/dashboard');
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Login failed. Check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setForm({ email, password });
  };

  return (
    <AuthLayout>
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-card-header">
          <p className="eyebrow">Enterprise Sponsorship Desk</p>
          <h1 style={{ fontSize: '1.8rem' }}>Sign in to C34</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Relational MySQL • Local Ollama AI • Real Negotiation & Inventory
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email Address
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          <button className="primary-button full-width" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            <LogIn size={16} style={{ marginRight: '6px' }} />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Login Credentials */}
        <div style={{ marginTop: '20px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
            One-Click Demo Credentials (Preloaded in MySQL):
          </span>
          <div style={{ display: 'grid', gap: '6px' }}>
            <button
              type="button"
              className="action-btn-sm"
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
              onClick={() => handleQuickLogin('organizer@techsummit.io', 'password123')}
            >
              <span><strong>Organizer:</strong> Alex Turner</span>
              <span style={{ color: 'var(--muted)' }}>organizer@techsummit.io</span>
            </button>
            <button
              type="button"
              className="action-btn-sm"
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
              onClick={() => handleQuickLogin('sponsor@cloudscale.io', 'password123')}
            >
              <span><strong>Sponsor:</strong> CloudScale (Marcus)</span>
              <span style={{ color: 'var(--muted)' }}>sponsor@cloudscale.io</span>
            </button>
            <button
              type="button"
              className="action-btn-sm"
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
              onClick={() => handleQuickLogin('admin@c34desk.com', 'admin123')}
            >
              <span><strong>Admin:</strong> System Administrator</span>
              <span style={{ color: 'var(--muted)' }}>admin@c34desk.com</span>
            </button>
          </div>
        </div>

        <div className="auth-meta">
          <span>Need an account?</span>
          <Link to="/register" style={{ fontWeight: 600 }}>Create account</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
