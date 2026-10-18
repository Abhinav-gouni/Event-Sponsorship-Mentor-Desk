import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { History, MessageSquare, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NegotiationHistory() {
  const { showToast } = useNotification();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.get('/negotiations');
        if (res.data?.success) {
          setProposals(res.data.data);
        }
      } catch (err) {
        showToast('Failed to load history', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <SponsorLayout title="Comprehensive Negotiation History" subtitle="Full audit trail of commercial offers, counteroffer rounds, and finalized agreements">
      <div className="panel">
        <div className="panel-header">
          <h3>Negotiation Threads ({proposals.length})</h3>
          <span>Audited decision history</span>
        </div>

        <div style={{ padding: '20px', display: 'grid', gap: '14px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading negotiation history...</p>
          ) : proposals.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>No historical negotiations found.</p>
          ) : (
            proposals.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  background: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{p.event_name}</strong>
                    <span className="tag-chip">{p.category_name}</span>
                    <span className={`badge ${p.status === 'accepted' ? 'badge-success' : 'badge-neutral'}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
                    Organizer: {p.organization_name} • {p.current_version} Rounds Completed
                  </div>
                  {p.notes && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#475569' }}>
                      Latest note: "{p.notes}"
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Agreed / Proposed:</div>
                    <strong style={{ color: 'var(--violet)', fontSize: '1.1rem' }}>
                      ₹{Number(p.proposed_price).toLocaleString()}
                    </strong>
                  </div>
                  <Link to="/sponsor/proposals" className="action-btn-sm primary">
                    Open Thread
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SponsorLayout>
  );
}
