import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AuthLayout from '../../layouts/AuthLayout';
import api from '../../services/api';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useNotification();
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'organizer',
    organizationName: '',
    companyName: '',
    industry: 'Technology',
    city: 'Bangalore',
    state: 'Karnataka',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.password) {
      return showToast('Please fill in all mandatory fields', 'error');
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/register', form);
      if (res.data?.success && res.data.data) {
        const { user, token } = res.data.data;
        login(user, token);
        showToast('Account registered successfully! Welcome to C34 Desk.', 'success');

        if (user.role === 'sponsor') {
          navigate('/sponsor/dashboard');
        } else {
          navigate('/organizer/dashboard');
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-card-header">
          <p className="eyebrow">Join C34 Sponsorship Desk</p>
          <h1 style={{ fontSize: '1.8rem' }}>Create Account</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Empowering organizers and corporate sponsors with transparent matching and contract execution.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full Name *
            <input
              required
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label>
            Business Email Address *
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label>
              Platform Role *
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="organizer">Event Organizer</option>
                <option value="sponsor">Corporate Sponsor</option>
              </select>
            </label>

            <label>
              City *
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
          </div>

          {form.role === 'organizer' ? (
            <label>
              Organizer Entity / Foundation Name
              <input
                placeholder="e.g. Apex Tech Events Foundation"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
              />
            </label>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label>
                Company Name
                <input
                  placeholder="e.g. CloudScale Tech"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </label>

              <label>
                Industry Domain
                <input
                  placeholder="e.g. Cloud & SaaS"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </label>
            </div>
          )}

          <label>
            Password (Min 6 characters) *
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          <button className="primary-button full-width" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            <UserPlus size={16} style={{ marginRight: '6px' }} />
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="auth-meta">
          <span>Already have an account?</span>
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
