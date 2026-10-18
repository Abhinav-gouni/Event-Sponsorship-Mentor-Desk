import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { FileText, CheckCircle2, AlertCircle, Sparkles, XCircle } from 'lucide-react';

export default function ActiveSponsorships() {
  const { showToast } = useNotification();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgrId, setSelectedAgrId] = useState(null);
  const [agreementDetail, setAgreementDetail] = useState(null);

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadAgreements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/agreements');
      if (res.data?.success) {
        setAgreements(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load active sponsorships', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, []);

  const handleSelectAgreement = async (agrId) => {
    try {
      setSelectedAgrId(agrId);
      const res = await api.get(`/agreements/${agrId}`);
      if (res.data?.success) {
        setAgreementDetail(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load agreement detail', 'error');
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.post(`/agreements/${selectedAgrId}/approve`);
      if (res.data?.success) {
        showToast(res.data.message, 'success');
        handleSelectAgreement(selectedAgrId);
        loadAgreements();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Approval failed', 'error');
    }
  };

  const handleCancelAgreement = async (e) => {
    e.preventDefault();
    if (!cancelReason) return showToast('Please state cancellation reason', 'error');

    try {
      const res = await api.post(`/agreements/${selectedAgrId}/cancel`, {
        cancellation_reason: cancelReason
      });
      if (res.data?.success) {
        showToast(res.data.message, 'success');
        setShowCancelModal(false);
        handleSelectAgreement(selectedAgrId);
        loadAgreements();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Cancellation failed', 'error');
    }
  };

  const agr = agreementDetail?.agreement;

  return (
    <SponsorLayout title="Active Sponsorships & Contracts" subtitle="Review executed agreements, countersign pending contracts, and track deliverables">
      <div className="card-grid two-up" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Left: Contracts List */}
        <div className="panel">
          <div className="panel-header">
            <h3>Sponsorship Agreements ({agreements.length})</h3>
            <span>Executed & Draft Contracts</span>
          </div>
          <div style={{ padding: '12px', display: 'grid', gap: '8px', maxHeight: '78vh', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading agreements...</p>
            ) : agreements.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No agreements yet.</p>
            ) : (
              agreements.map((a) => {
                const isSelected = selectedAgrId === a.id;
                const isMutual = a.status === 'mutually_approved';

                return (
                  <div
                    key={a.id}
                    onClick={() => handleSelectAgreement(a.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--violet)' : '1px solid var(--border)',
                      background: isSelected ? '#f5f3ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{a.agreement_number}</strong>
                      <span className={`badge ${isMutual ? 'badge-success' : a.status === 'cancelled' ? 'badge-neutral' : 'badge-warning'}`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                      Event: {a.event_name} ({a.event_city})
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <strong style={{ color: 'var(--violet)' }}>₹{Number(a.agreed_price).toLocaleString()}</strong>
                      <span style={{ fontSize: '0.78rem', color: a.sponsor_approved ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        {a.sponsor_approved ? '✓ Countersigned' : 'Action Required: Countersign'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Contract Review Detail */}
        <div className="panel">
          {!agreementDetail ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3>Select a Contract to Review</h3>
              <p>Inspect clauses, countersign agreements, and monitor cancellation policies.</p>
            </div>
          ) : (
            <div>
              <div className="panel-header">
                <div>
                  <h3 style={{ margin: 0 }}>{agr.agreement_number}</h3>
                  <small style={{ color: 'var(--muted)' }}>
                    Event: {agr.event_name} • Organizer: {agr.organization_name}
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!agr.sponsor_approved && agr.status !== 'cancelled' && (
                    <button className="primary-button" onClick={handleApprove}>
                      <CheckCircle2 size={14} style={{ marginRight: '6px' }} /> Countersign Agreement
                    </button>
                  )}
                  {agr.status !== 'cancelled' && (
                    <button className="action-btn-sm danger" onClick={() => setShowCancelModal(true)}>
                      Cancel Contract
                    </button>
                  )}
                </div>
              </div>

              <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
                {/* Approval Status Card */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>
                    Mutual Execution Status:
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {agr.organizer_approved ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#f59e0b" />}
                      <span style={{ fontSize: '0.85rem' }}>
                        Organizer Signature: <strong>{agr.organizer_approved ? 'Approved' : 'Pending'}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {agr.sponsor_approved ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#f59e0b" />}
                      <span style={{ fontSize: '0.85rem' }}>
                        Your Signature: <strong>{agr.sponsor_approved ? 'Countersigned' : 'Pending'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exclusivity Clause */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                    Guaranteed Category Exclusivity:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                    {agr.exclusivity_conditions || 'Exclusive rights guaranteed for the duration of the event.'}
                  </p>
                </div>

                {/* Cancellation Policy */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                    Cancellation Rules & Policy:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                    {agr.cancellation_policy || 'Cancellation permitted up to 30 days prior. Releases inventory slots back to the public pool.'}
                  </p>
                </div>

                {/* Deliverables Scheduled */}
                <div>
                  <h4 style={{ margin: '0 0 10px' }}>
                    Contracted Deliverables ({agreementDetail.deliverables?.length || 0})
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(agreementDetail.deliverables || []).map((d) => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fafafa', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{d.title}</strong>
                          <span className="tag-chip" style={{ marginLeft: '6px' }}>{d.benefit_type}</span>
                        </div>
                        <span className="badge badge-neutral">{d.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#ef4444' }}>Request Agreement Cancellation</h3>
              <button className="toolbar-button" onClick={() => setShowCancelModal(false)}>×</button>
            </div>
            <form onSubmit={handleCancelAgreement}>
              <div className="modal-body" style={{ display: 'grid', gap: '12px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
                  Per cancellation policy, cancelling this contract will release reserved inventory and trigger contract forfeiture terms.
                </p>
                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Cancellation Reason *
                  <textarea
                    rows={3}
                    required
                    className="filter-input"
                    placeholder="State reason according to contract terms..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setShowCancelModal(false)}>Back</button>
                  <button type="submit" className="action-btn-sm danger" style={{ padding: '8px 16px' }}>Confirm Cancellation</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </SponsorLayout>
  );
}
