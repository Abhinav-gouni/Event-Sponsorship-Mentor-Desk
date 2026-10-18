import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Save, Building2, Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function BusinessProfile() {
  const { showToast } = useNotification();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    description: '',
    website: '',
    location: '',
    targetAudience: '',
    marketingObjectives: '',
    brandPreferences: ''
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.get('/auth/me');
        if (res.data?.success) {
          const prof = res.data.data?.user?.profile || {};
          setFormData({
            companyName: prof.company_name || '',
            industry: prof.industry || '',
            description: prof.description || '',
            website: prof.website || '',
            location: prof.location || '',
            targetAudience: prof.target_audience || '',
            marketingObjectives: prof.marketing_objectives || '',
            brandPreferences: prof.brand_preferences || ''
          });
        }
      } catch (err) {
        showToast('Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.put('/auth/profile', formData);
      if (res.data?.success) {
        showToast('Business profile updated successfully', 'success');
        refreshUser();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SponsorLayout title="Corporate Business Profile" subtitle="Manage your public corporate identity, target audience, and brand objectives">
      <div className="panel" style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="var(--violet)" />
            <h3 style={{ margin: 0 }}>Business Profile Specifications</h3>
          </div>
          <span>Visible to verified event organizers</span>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>Loading business profile...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                <span>Company / Brand Name *</span>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                />
              </label>

              <label>
                <span>Industry Domain *</span>
                <input
                  type="text"
                  name="industry"
                  required
                  placeholder="e.g. Cloud & SaaS Infrastructure, FinTech, Sports"
                  value={formData.industry}
                  onChange={handleChange}
                />
              </label>

              <label className="full-span">
                <span>Corporate Description</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe your core product/service offerings and event marketing objectives..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </label>

              <label>
                <span>Corporate Website URL</span>
                <input
                  type="url"
                  name="website"
                  placeholder="https://yourcompany.com"
                  value={formData.website}
                  onChange={handleChange}
                />
              </label>

              <label>
                <span>Headquarters / Primary Operating Region</span>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g. Bangalore, Karnataka (Pan-India Operating)"
                  value={formData.location}
                  onChange={handleChange}
                />
              </label>

              <label className="full-span">
                <span>Target Customer Audience & Demographics</span>
                <input
                  type="text"
                  name="targetAudience"
                  placeholder="e.g. Software engineers, CTOs, engineering leads, tech founders aged 22-45"
                  value={formData.targetAudience}
                  onChange={handleChange}
                />
              </label>

              <label className="full-span">
                <span>Primary Marketing & Sponsorship Objectives</span>
                <textarea
                  name="marketingObjectives"
                  rows={2}
                  placeholder="e.g. Drive B2B enterprise leads, developer recruitment, and product sampling..."
                  value={formData.marketingObjectives}
                  onChange={handleChange}
                />
              </label>

              <label className="full-span">
                <span>Brand Preferences & Positioning Guidelines</span>
                <textarea
                  name="brandPreferences"
                  rows={2}
                  placeholder="e.g. Prefers keynote stage branding, VIP booth spaces, and developer workshops..."
                  value={formData.brandPreferences}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="panel-header" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {submitting ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </SponsorLayout>
  );
}
