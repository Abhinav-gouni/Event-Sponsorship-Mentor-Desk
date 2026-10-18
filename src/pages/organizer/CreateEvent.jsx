import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ArrowLeft, Save, Plus } from 'lucide-react';

const CATEGORIES = [
  'Technology & AI',
  'Sports & Fitness',
  'Business & Entrepreneurship',
  'College & Cultural',
  'Gaming & Esports',
];

const COMMON_PROHIBITED = [
  'Tobacco',
  'Gambling',
  'Alcohol',
  'Fast Food',
  'Cryptocurrency',
  'Adult Entertainment'
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_name: 'Technology & AI',
    description: '',
    venue: '',
    location: '',
    city: 'Bangalore',
    state: 'Karnataka',
    start_date: '2026-12-01',
    end_date: '2026-12-02',
    application_deadline: '2026-11-20',
    expected_audience: 2500,
    estimated_reach: 10000,
    budget: 500000,
    target_demographics: 'Engineers, Tech Founders, Product Managers (Ages 22-45)',
    objectives: 'Drive developer adoption and enterprise partnerships',
    status: 'published',
  });

  const [prohibited, setProhibited] = useState(['Tobacco', 'Gambling']);

  const toggleProhibited = (tag) => {
    setProhibited((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.name || !formData.city || !formData.state) {
      return showToast('Please fill in required fields', 'error');
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      return showToast('End date cannot be earlier than start date', 'error');
    }
    if (new Date(formData.application_deadline) > new Date(formData.start_date)) {
      return showToast('Application deadline must be on or before start date', 'error');
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        prohibited_sponsor_categories: prohibited,
      };

      const res = await api.post('/events', payload);
      if (res.data?.success) {
        showToast('Event created successfully!', 'success');
        navigate('/organizer/events');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrganizerLayout title="Create Sponsorship Event" subtitle="Launch a new event opportunity with commercial specifications">
      <div className="panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="action-btn-sm" onClick={() => navigate('/organizer/events')}>
              <ArrowLeft size={14} /> Back
            </button>
            <h3 style={{ margin: 0 }}>Event Specifications Form</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Mandatory fields marked with *</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="full-span">
              <span>Event Name *</span>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Asia Developer & Cloud Summit 2026"
                value={formData.name}
                onChange={handleChange}
              />
            </label>

            <label>
              <span>Category *</span>
              <select name="category_name" value={formData.category_name} onChange={handleChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Initial Status *</span>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="published">Published (Visible to Sponsors)</option>
                <option value="draft">Draft (Private to Organizer)</option>
              </select>
            </label>

            <label className="full-span">
              <span>Event Description & Theme</span>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe the event scope, keynote highlights, attendee profiles, and why sponsors should partner..."
                value={formData.description}
                onChange={handleChange}
              />
            </label>

            <label>
              <span>City *</span>
              <input type="text" name="city" required value={formData.city} onChange={handleChange} />
            </label>

            <label>
              <span>State *</span>
              <input type="text" name="state" required value={formData.state} onChange={handleChange} />
            </label>

            <label className="full-span">
              <span>Venue / Exhibition Center</span>
              <input
                type="text"
                name="venue"
                placeholder="e.g. Bangalore International Exhibition Centre (BIEC)"
                value={formData.venue}
                onChange={handleChange}
              />
            </label>

            <label>
              <span>Start Date *</span>
              <input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} />
            </label>

            <label>
              <span>End Date *</span>
              <input type="date" name="end_date" required value={formData.end_date} onChange={handleChange} />
            </label>

            <label>
              <span>Sponsor Application Deadline *</span>
              <input type="date" name="application_deadline" required value={formData.application_deadline} onChange={handleChange} />
            </label>

            <label>
              <span>Expected In-Person Audience (Attendees)</span>
              <input type="number" name="expected_audience" min={0} value={formData.expected_audience} onChange={handleChange} />
            </label>

            <label>
              <span>Estimated Total Reach (Audience + Digital)</span>
              <input type="number" name="estimated_reach" min={0} value={formData.estimated_reach} onChange={handleChange} />
            </label>

            <label>
              <span>Event Production Budget (₹)</span>
              <input type="number" name="budget" min={0} value={formData.budget} onChange={handleChange} />
            </label>

            <label className="full-span">
              <span>Target Demographics</span>
              <input
                type="text"
                name="target_demographics"
                placeholder="e.g. Software engineers, CTOs, technical architects, aged 21-45"
                value={formData.target_demographics}
                onChange={handleChange}
              />
            </label>

            {/* Prohibited Categories Checklist */}
            <div className="full-span" style={{ marginTop: '10px' }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Prohibited Sponsor Categories (Brand Safety Enforcement)
              </span>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 10px' }}>
                Proposals from businesses in selected categories will be automatically rejected by the platform.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COMMON_PROHIBITED.map((tag) => {
                  const isSelected = prohibited.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleProhibited(tag)}
                      className={isSelected ? 'action-btn-sm danger' : 'action-btn-sm'}
                      style={{ borderRadius: '20px' }}
                    >
                      {isSelected ? `✕ Prohibit ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="panel-header" style={{ justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
            <button type="button" className="ghost-button" onClick={() => navigate('/organizer/events')}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              <Save size={16} style={{ marginRight: '6px' }} />
              {submitting ? 'Creating Event...' : 'Create & Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </OrganizerLayout>
  );
}
