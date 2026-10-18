import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Sliders, ShieldAlert, Save, Check } from 'lucide-react';

const CATEGORIES = [
  'Technology & AI',
  'Sports & Fitness',
  'Business & Entrepreneurship',
  'College & Cultural',
  'Gaming & Esports',
];

const BENEFIT_TYPES = [
  'Title Sponsorship',
  'Gold Tier Partner',
  'Stage Branding',
  'Booth',
  'Speaking Opportunity',
  'Digital Promotion',
  'Social Media',
];

const SAFETY_EXCLUSIONS = [
  'Tobacco',
  'Gambling',
  'Alcohol',
  'Fast Food',
  'Cryptocurrency',
  'Adult Entertainment'
];

export default function SponsorshipPreferences() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState(['Technology & AI']);
  const [cities, setCities] = useState('Bangalore, Hyderabad, Mumbai, Delhi NCR');
  const [minBudget, setMinBudget] = useState(50000);
  const [maxBudget, setMaxBudget] = useState(500000);
  const [benefits, setBenefits] = useState(['Title Sponsorship', 'Stage Branding', 'Booth']);
  const [minReach, setMinReach] = useState(5000);
  const [marketingGoals, setMarketingGoals] = useState('B2B lead generation, developer recruitment');
  const [excluded, setExcluded] = useState(['Tobacco', 'Gambling', 'Alcohol']);
  const [brandSafetyText, setBrandSafetyText] = useState('Strictly no co-sponsorship with betting or predatory lending apps');

  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true);
        const res = await api.get('/sponsors/preferences/me');
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          if (Array.isArray(d.preferred_categories) && d.preferred_categories.length > 0) {
            setCategories(d.preferred_categories);
          }
          if (Array.isArray(d.target_cities)) {
            setCities(d.target_cities.join(', '));
          }
          if (d.min_budget !== undefined) setMinBudget(Number(d.min_budget));
          if (d.max_budget !== undefined) setMaxBudget(Number(d.max_budget));
          if (Array.isArray(d.desired_benefits)) setBenefits(d.desired_benefits);
          if (d.preferred_min_reach !== undefined) setMinReach(Number(d.preferred_min_reach));
          if (d.marketing_goals) setMarketingGoals(d.marketing_goals);
          if (Array.isArray(d.excluded_categories)) setExcluded(d.excluded_categories);
          if (d.brand_safety_restrictions) setBrandSafetyText(d.brand_safety_restrictions);
        }
      } catch (err) {
        showToast('Failed to load preferences', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  const toggleCategory = (cat) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleBenefit = (ben) => {
    setBenefits((prev) =>
      prev.includes(ben) ? prev.filter((b) => b !== ben) : [...prev, ben]
    );
  };

  const toggleExcluded = (tag) => {
    setExcluded((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (minBudget > maxBudget) {
      return showToast('Min budget cannot be greater than max budget', 'error');
    }

    try {
      setSubmitting(true);
      const targetCitiesArray = cities.split(',').map((c) => c.trim()).filter(Boolean);

      const res = await api.put('/sponsors/preferences/me', {
        preferred_categories: categories,
        target_cities: targetCitiesArray,
        min_budget: Number(minBudget),
        max_budget: Number(maxBudget),
        desired_benefits: benefits,
        preferred_min_reach: Number(minReach),
        marketing_goals: marketingGoals,
        excluded_categories: excluded,
        brand_safety_restrictions: brandSafetyText
      });

      if (res.data?.success) {
        showToast('Sponsorship preferences & brand-safety rules saved!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save preferences', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SponsorLayout title="Sponsorship Preferences & Brand Safety" subtitle="Configure matching algorithms, budget ranges, desired benefits, and brand safety restrictions">
      <div className="panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="var(--violet)" />
            <h3 style={{ margin: 0 }}>Matching Engine Parameters</h3>
          </div>
          <span>Used by Ollama to recommend events</span>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>Loading preferences...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* 1. Preferred Categories */}
            <div style={{ marginBottom: '22px' }}>
              <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                Preferred Event Categories
              </strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CATEGORIES.map((cat) => {
                  const isSelected = categories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={isSelected ? 'action-btn-sm primary' : 'action-btn-sm'}
                      style={{ borderRadius: '20px' }}
                    >
                      {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Budget Range */}
            <div style={{ marginBottom: '22px', background: '#f8fafc', padding: '16px', borderRadius: '10px' }}>
              <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '12px' }}>
                Quarterly Sponsorship Budget Range (₹)
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Minimum Budget per Event (₹)
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    className="filter-input"
                    value={minBudget}
                    onChange={(e) => setMinBudget(Number(e.target.value))}
                  />
                </label>

                <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Maximum Budget per Event (₹)
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    className="filter-input"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            {/* 3. Target Cities & Min Reach */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '22px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                Target Cities (Comma Separated)
                <input
                  type="text"
                  className="filter-input"
                  value={cities}
                  onChange={(e) => setCities(e.target.value)}
                />
              </label>

              <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                Min. Expected Event Reach
                <input
                  type="number"
                  min={0}
                  className="filter-input"
                  value={minReach}
                  onChange={(e) => setMinReach(Number(e.target.value))}
                />
              </label>
            </div>

            {/* 4. Desired Benefit Types */}
            <div style={{ marginBottom: '22px' }}>
              <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                Desired Benefit Types
              </strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {BENEFIT_TYPES.map((b) => {
                  const isSelected = benefits.includes(b);
                  return (
                    <button
                      type="button"
                      key={b}
                      onClick={() => toggleBenefit(b)}
                      className={isSelected ? 'action-btn-sm primary' : 'action-btn-sm'}
                      style={{ borderRadius: '20px' }}
                    >
                      {isSelected ? `✓ ${b}` : `+ ${b}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Brand Safety & Prohibited Categories */}
            <div style={{ marginBottom: '22px', border: '1px solid #fee2e2', background: '#fff5f5', padding: '18px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', marginBottom: '8px' }}>
                <ShieldAlert size={18} />
                <strong style={{ fontSize: '0.95rem' }}>Brand Safety & Exclusion Filters</strong>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#7f1d1d' }}>
                Ollama will automatically suppress events in these categories, and proposals violating these restrictions will be rejected.
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {SAFETY_EXCLUSIONS.map((tag) => {
                  const isSelected = excluded.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleExcluded(tag)}
                      className={isSelected ? 'action-btn-sm danger' : 'action-btn-sm'}
                      style={{ borderRadius: '20px' }}
                    >
                      {isSelected ? `✕ Exclude ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>

              <label style={{ display: 'grid', gap: '4px', fontSize: '0.82rem', fontWeight: 600, color: '#991b1b' }}>
                Specific Brand-Safety Restrictions Policy
                <textarea
                  rows={2}
                  className="filter-input"
                  style={{ background: 'white' }}
                  value={brandSafetyText}
                  onChange={(e) => setBrandSafetyText(e.target.value)}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {submitting ? 'Saving...' : 'Save Sponsorship Preferences'}
              </button>
            </div>
          </form>
        )}
      </div>
    </SponsorLayout>
  );
}
