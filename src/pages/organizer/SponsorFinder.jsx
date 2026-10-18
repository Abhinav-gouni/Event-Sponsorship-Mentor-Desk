import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Sparkles, Bot, AlertTriangle, CheckCircle, ArrowRight, Bookmark, Building, ShieldCheck } from 'lucide-react';

export default function SponsorFinder() {
  const { showToast } = useNotification();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await api.get('/events/my-events');
        if (res.data?.success && res.data.data.length > 0) {
          setEvents(res.data.data);
          setSelectedEventId(String(res.data.data[0].id));
        }
      } catch (err) {
        showToast('Failed to load organizer events', 'error');
      }
    }
    loadEvents();
  }, []);

  const handleRunAiMatching = async () => {
    if (!selectedEventId) {
      return showToast('Please select an event to match', 'warning');
    }

    try {
      setLoading(true);
      const res = await api.post('/matching/event-to-sponsors', {
        event_id: Number(selectedEventId)
      });

      if (res.data?.success) {
        const recs = res.data.data.recommendations || [];
        setRecommendations(recs);
        if (recs.length > 0 && recs[0].model_used) {
          setModelUsed(recs[0].model_used);
        }
        showToast(`Generated ${recs.length} AI sponsor recommendations`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'AI matching failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async (sponsorId) => {
    try {
      await api.post('/sponsors/shortlist', {
        sponsor_id: sponsorId,
        event_id: Number(selectedEventId)
      });
      showToast('Sponsor bookmarked to event shortlist', 'success');
    } catch (err) {
      showToast('Shortlisting failed', 'error');
    }
  };

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));

  return (
    <OrganizerLayout title="AI Sponsor Match Finder" subtitle="Local Ollama AI recommendations connecting real event audience metrics to sponsor parameters">
      {/* Event Selection & AI Trigger */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#6366f1" />
            <h3 style={{ margin: 0 }}>Target Event Selection</h3>
          </div>
          {modelUsed && (
            <span className="badge badge-success" style={{ display: 'inline-flex', gap: '4px' }}>
              <Bot size={12} /> Powered by local Ollama ({modelUsed})
            </span>
          )}
        </div>

        <div style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '280px', display: 'grid', gap: '6px', fontWeight: 600 }}>
            <span>Select Your Event to Match:</span>
            <select
              className="filter-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.category_name} • {e.city})
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary-button"
            onClick={handleRunAiMatching}
            disabled={loading || !selectedEventId}
            style={{ padding: '12px 24px', display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <Sparkles size={16} />
            {loading ? 'Evaluating with Ollama AI...' : 'Find Compatible Sponsors'}
          </button>
        </div>

        {selectedEvent && (
          <div style={{ background: '#f8fafc', padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '0.85rem', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span><strong>Expected Audience:</strong> {Number(selectedEvent.expected_audience).toLocaleString()}</span>
            <span><strong>Estimated Reach:</strong> {Number(selectedEvent.estimated_reach).toLocaleString()}</span>
            <span><strong>Production Budget:</strong> ₹{Number(selectedEvent.budget).toLocaleString()}</span>
            <span><strong>Location:</strong> {selectedEvent.city}, {selectedEvent.state}</span>
          </div>
        )}
      </div>

      {/* AI Recommendations List */}
      <div className="page-content">
        {loading ? (
          <div className="panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
            <h3>Analyzing Sponsor Fit with Local Ollama AI...</h3>
            <p style={{ color: 'var(--muted)', maxWidth: '500px', margin: '0 auto' }}>
              Evaluating domain category overlap, sponsor budget ranges, brand-safety exclusion filters, and attendee demographics.
            </p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
            <Bot size={40} color="#6366f1" style={{ margin: '0 auto 12px' }} />
            <h3>Ready to Find Compatible Corporate Sponsors</h3>
            <p style={{ color: 'var(--muted)', maxWidth: '450px', margin: '0 auto 16px' }}>
              Match scores are calculated from saved sponsor profiles, event details, budget fit, audience overlap, and restrictions. Ollama can explain the result but cannot invent sponsors or change scores.
            </p>
            <button className="primary-button" onClick={handleRunAiMatching}>
              Run AI Match Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {recommendations.map((rec, i) => {
              const score = Number.isFinite(Number(rec.match_score)) ? Number(rec.match_score) : 0;
              const scoreClass = score >= 85 ? 'score-high' : score >= 70 ? 'score-medium' : 'score-low';
              const sp = rec.sponsor || {};

              return (
                <div key={i} className="panel" style={{ padding: '20px', display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`score-badge ${scoreClass}`} style={{ fontSize: '1rem', padding: '6px 14px' }}>
                        {score}% Match
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{sp.company_name || `Sponsor #${rec.sponsor_id}`}</h3>
                        <small style={{ color: 'var(--muted)' }}>{sp.industry} • {sp.location}</small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="action-btn-sm"
                        onClick={() => handleShortlist(rec.sponsor_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Bookmark size={14} /> Shortlist Lead
                      </button>
                    </div>
                  </div>

                  {/* AI Explanation Callout */}
                  <div style={{ background: '#f8fafc', borderLeft: '4px solid var(--violet)', padding: '12px 16px', borderRadius: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>
                      Match Assessment (profile-based score):
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                      {rec.explanation}
                    </p>
                  </div>

                  {/* 3-column analysis grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                        <CheckCircle size={14} /> Why Sponsor Benefits
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#14532d' }}>
                        {rec.why_sponsor_benefits || 'Confirm the sponsor’s objectives and the event deliverables before making a commercial claim.'}
                      </p>
                    </div>

                    <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                        <AlertTriangle size={14} /> Potential Risks / Caveats
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f' }}>
                        {rec.potential_risks || 'Verify the final terms, inventory availability, and category restrictions.'}
                      </p>
                    </div>

                    <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3730a3', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                        <ArrowRight size={14} /> Recommended Action & Tier
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#312e81' }}>
                        <strong>{rec.suggested_package || 'No package recommendation available'}</strong>: {rec.recommended_next_action || 'Review the match details before outreach.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}
