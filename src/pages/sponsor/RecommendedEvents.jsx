import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Sparkles, Bot, AlertTriangle, CheckCircle, ArrowRight, MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function RecommendedEvents() {
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState('');

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await api.post('/matching/sponsor-to-events', {});
      if (res.data?.success) {
        const recs = res.data.data.recommendations || [];
        setRecommendations(recs);
        if (recs.length > 0 && recs[0].model_used) {
          setModelUsed(recs[0].model_used);
        }
        showToast(`Loaded ${recs.length} profile-based event matches`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <SponsorLayout title="AI Event Recommendations" subtitle="Events ranked from your saved preferences and real event records; Ollama only assists with grounded explanations">
      {/* Top Banner */}
      <div className="panel" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f8fafc, #ede9fe)', border: '1px solid #c7d2fe' }}>
        <div className="panel-header" style={{ borderBottom: 'none' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--violet)" />
              <h3 style={{ margin: 0 }}>Sponsorship Matching Engine</h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Deterministic scores use saved preferences, category fit, location, budget, audience, and restrictions. Ollama may improve explanations but cannot change scores.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={fetchRecommendations}
            disabled={loading}
            style={{ display: 'inline-flex', gap: '6px' }}
          >
            <Bot size={16} /> {loading ? 'Matching...' : 'Refresh AI Recommendations'}
          </button>
        </div>
      </div>

      {/* Recommendations Feed */}
      {loading ? (
        <div className="panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <h3>Calculating matches from your saved preferences...</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '450px', margin: '0 auto' }}>
            Evaluating audience demographics, expected reach, and brand safety constraints.
          </p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Bot size={40} color="var(--violet)" style={{ margin: '0 auto 12px' }} />
          <h3>No matching events found</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '450px', margin: '0 auto 16px' }}>
            Adjust your sponsorship preferences or budget ranges to broaden discovery.
          </p>
          <Link to="/sponsor/preferences" className="action-btn-sm primary">
            Configure Preferences
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {recommendations.map((rec, i) => {
            const score = Number.isFinite(Number(rec.match_score)) ? Number(rec.match_score) : 0;
            const scoreClass = score >= 85 ? 'score-high' : score >= 70 ? 'score-medium' : 'score-low';
            const evt = rec.event || {};

            return (
              <div key={i} className="panel" style={{ padding: '22px', display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={`score-badge ${scoreClass}`} style={{ fontSize: '1rem', padding: '6px 14px' }}>
                        {score}% Match
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{evt.name || `Event #${rec.event_id}`}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                      <span><span className="tag-chip">{evt.category_name}</span></span>
                      <span>{evt.city}, {evt.state}</span>
                      <span>Dates: {evt.start_date} to {evt.end_date}</span>
                    </div>
                  </div>

                  <Link
                    to={`/sponsor/browse-events?event=${evt.id}`}
                    className="primary-button"
                    style={{ display: 'inline-flex', gap: '6px' }}
                  >
                    Draft Proposal <ArrowRight size={16} />
                  </Link>
                </div>

                {/* AI Explanation Box */}
                <div style={{ background: '#f8fafc', borderLeft: '4px solid var(--violet)', padding: '12px 16px', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>
                    Match Assessment:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                    {rec.explanation}
                  </p>
                </div>

                {/* Key Pillars */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ color: '#166534', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                      Audience Alignment
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#14532d' }}>
                      {rec.audience_alignment || 'Audience alignment could not be established from the available profile data.'}
                    </p>
                  </div>

                  <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ color: '#1e40af', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                      Budget Compatibility
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e3a8a' }}>
                      {rec.budget_compatibility || 'Budget compatibility cannot be confirmed from the available data.'}
                    </p>
                  </div>

                  <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <div style={{ color: '#92400e', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                      Potential Commercial Risks
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f' }}>
                      {rec.potential_risks || 'Confirm current inventory availability before submitting a proposal.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SponsorLayout>
  );
}
