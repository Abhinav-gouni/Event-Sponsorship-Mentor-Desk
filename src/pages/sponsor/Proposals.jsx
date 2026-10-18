import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Handshake, Check, ArrowRight, History, MessageSquare, AlertCircle } from 'lucide-react';

export default function Proposals() {
  const { showToast } = useNotification();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalDetail, setProposalDetail] = useState(null);

  // Counteroffer modal
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterNotes, setCounterNotes] = useState('');

  const loadProposals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/negotiations');
      if (res.data?.success) {
        setProposals(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load proposals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleSelectProposal = async (propId) => {
    try {
      setSelectedProposal(propId);
      const res = await api.get(`/negotiations/${propId}`);
      if (res.data?.success) {
        setProposalDetail(res.data.data);
        setCounterPrice(String(res.data.data.proposal?.proposed_price || ''));
      }
    } catch (err) {
      showToast('Could not load proposal details', 'error');
    }
  };

  const handleAcceptProposal = async () => {
    if (!window.confirm('Accept this offer to finalize terms and draft the binding sponsorship agreement?')) return;
    try {
      const res = await api.post(`/negotiations/${selectedProposal}/accept`);
      if (res.data?.success) {
        showToast('Offer accepted! Agreement created and ready for signature.', 'success');
        handleSelectProposal(selectedProposal);
        loadProposals();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Acceptance failed', 'error');
    }
  };

  const handleSendCounteroffer = async (e) => {
    e.preventDefault();
    if (!counterPrice) return showToast('Please enter revised counter price', 'error');

    try {
      const res = await api.post(`/negotiations/${selectedProposal}/counteroffer`, {
        counter_price: Number(counterPrice),
        notes: counterNotes
      });
      if (res.data?.success) {
        showToast('Counteroffer sent to organizer!', 'success');
        setShowCounterModal(false);
        handleSelectProposal(selectedProposal);
        loadProposals();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Counteroffer failed', 'error');
    }
  };

  return (
    <SponsorLayout title="Proposals & Active Negotiations" subtitle="Monitor submitted proposals, review counteroffers from organizers, and accept final terms">
      <div className="card-grid two-up" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Left: Proposals List */}
        <div className="panel">
          <div className="panel-header">
            <h3>My Proposals ({proposals.length})</h3>
            <span>Active deals</span>
          </div>
          <div style={{ padding: '12px', display: 'grid', gap: '8px', maxHeight: '78vh', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading proposals...</p>
            ) : proposals.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No proposals submitted yet.</p>
            ) : (
              proposals.map((p) => {
                const isSelected = selectedProposal === p.id;
                const isCounter = p.status === 'counteroffer_organizer';

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProposal(p.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--violet)' : '1px solid var(--border)',
                      background: isSelected ? '#f5f3ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{p.event_name}</strong>
                      <span className={`badge ${
                        p.status === 'accepted' ? 'badge-success' : isCounter ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      Organizer: {p.organization_name} ({p.event_city})
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <strong style={{ color: 'var(--violet)' }}>₹{Number(p.proposed_price).toLocaleString()}</strong>
                      <span style={{ fontSize: '0.78rem', color: isCounter ? '#b45309' : 'var(--muted)', fontWeight: isCounter ? 600 : 400 }}>
                        {isCounter ? '⚠️ Organizer Counteroffer' : `Round ${p.current_version}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Negotiation Workspace */}
        <div className="panel">
          {!proposalDetail ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <Handshake size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3>Select a Proposal</h3>
              <p>Review organizer responses, inspect version history, or accept revised offers.</p>
            </div>
          ) : (
            <div>
              <div className="panel-header">
                <div>
                  <h3 style={{ margin: 0 }}>{proposalDetail.proposal?.title}</h3>
                  <small style={{ color: 'var(--muted)' }}>
                    Organizer: {proposalDetail.proposal?.organization_name}
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {proposalDetail.proposal?.status !== 'accepted' && proposalDetail.proposal?.status !== 'rejected' && (
                    <>
                      <button className="action-btn-sm" onClick={() => setShowCounterModal(true)}>
                        Counteroffer
                      </button>
                      <button className="primary-button" onClick={handleAcceptProposal}>
                        <Check size={14} style={{ marginRight: '4px' }} /> Accept Offer
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
                {/* Counteroffer Highlight Banner */}
                {proposalDetail.proposal?.status === 'counteroffer_organizer' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'start', gap: '10px' }}>
                    <AlertCircle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#92400e', fontSize: '0.9rem' }}>Organizer Sent a Revised Counteroffer:</strong>
                      <p style={{ margin: '4px 0 0', color: '#78350f', fontSize: '0.85rem' }}>
                        Proposed revised deal value: <strong>₹{Number(proposalDetail.proposal?.proposed_price).toLocaleString()}</strong>.
                        You can accept this counteroffer to draft the agreement or send a further revision.
                      </p>
                    </div>
                  </div>
                )}

                {/* Versions Timeline */}
                <div>
                  <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={16} /> Negotiation Rounds ({proposalDetail.versions?.length || 0})
                  </h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {(proposalDetail.versions || []).map((v) => (
                      <div key={v.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong>Version #{v.version_number} ({v.proposed_by_role === 'sponsor' ? 'Your Offer' : 'Organizer Offer'})</strong>
                          <strong style={{ color: 'var(--violet)' }}>₹{Number(v.proposed_price).toLocaleString()}</strong>
                        </div>
                        {v.notes && <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#475569' }}>"{v.notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Timeline */}
                <div>
                  <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} /> Negotiation Log
                  </h4>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {(proposalDetail.history || []).map((h) => (
                      <div key={h.id} style={{ fontSize: '0.82rem', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{h.action_by_name}</strong>: {h.message}</span>
                        <span style={{ color: 'var(--muted)' }}>
                          {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Counteroffer Modal */}
      {showCounterModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Send Revised Offer</h3>
              <button className="toolbar-button" onClick={() => setShowCounterModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendCounteroffer}>
              <div className="modal-body" style={{ display: 'grid', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Revised Proposed Budget (₹) *
                  <input
                    type="number"
                    required
                    min={1}
                    className="filter-input"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                  />
                </label>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Commercial Rationale / Note
                  <textarea
                    rows={3}
                    className="filter-input"
                    placeholder="Explain your revised proposal parameters to the organizer..."
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setShowCounterModal(false)}>Cancel</button>
                  <button type="submit" className="primary-button">Send Revised Counteroffer</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </SponsorLayout>
  );
}
