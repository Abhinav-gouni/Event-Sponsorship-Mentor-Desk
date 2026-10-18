import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, XCircle, ExternalLink, Clock, FileCheck, AlertCircle } from 'lucide-react';

export default function FulfilmentReview() {
  const { showToast } = useNotification();
  const [agreements, setAgreements] = useState([]);
  const [selectedAgrId, setSelectedAgrId] = useState('');
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reject modal
  const [rejectingDeliv, setRejectingDeliv] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadAgreements = async () => {
    try {
      const res = await api.get('/agreements');
      if (res.data?.success && res.data.data.length > 0) {
        setAgreements(res.data.data);
        setSelectedAgrId(String(res.data.data[0].id));
      }
    } catch (err) {
      showToast('Failed to load agreements', 'error');
    }
  };

  const loadDeliverables = async (agrId) => {
    if (!agrId) return;
    try {
      setLoading(true);
      const res = await api.get(`/fulfilment/agreement/${agrId}`);
      if (res.data?.success) {
        setDeliverables(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load deliverables', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, []);

  useEffect(() => {
    if (selectedAgrId) {
      loadDeliverables(selectedAgrId);
    }
  }, [selectedAgrId]);

  const handleReviewAction = async (delivId, action, reason = null) => {
    try {
      const res = await api.put(`/fulfilment/deliverables/${delivId}/review`, {
        action,
        rejection_reason: reason
      });
      if (res.data?.success) {
        showToast(`Deliverable evidence ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
        setRejectingDeliv(null);
        setRejectReason('');
        loadDeliverables(selectedAgrId);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Review action failed', 'error');
    }
  };

  return (
    <SponsorLayout title="Fulfilment & Evidence Review" subtitle="Inspect proof of performance submitted by event organizers, verify measured reach, and approve deliverables">
      {/* Agreement Selector */}
      <div className="filter-bar">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <strong style={{ fontSize: '0.9rem' }}>Agreement:</strong>
          <select
            className="filter-select"
            value={selectedAgrId}
            onChange={(e) => setSelectedAgrId(e.target.value)}
          >
            {agreements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.agreement_number} - {a.event_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Deliverables List */}
      <div className="panel">
        <div className="panel-header">
          <h3>Deliverables for Review ({deliverables.length})</h3>
          <span>Audit proof & signoff</span>
        </div>

        <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading deliverables...</p>
          ) : deliverables.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>No deliverables scheduled for this contract.</p>
          ) : (
            deliverables.map((d) => {
              const isPendingReview = d.status === 'submitted_for_review';
              const isApproved = d.status === 'approved';

              return (
                <div
                  key={d.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '18px',
                    background: isPendingReview ? '#fffdf5' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{d.title}</h4>
                        <span className="tag-chip">{d.benefit_type}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                        {d.description || 'Deliverable per agreement specifications.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${
                        isApproved ? 'badge-success' : d.status === 'rejected' ? 'badge-warning' : isPendingReview ? 'badge-neutral' : ''
                      }`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>

                      {/* Action buttons if submitted for review */}
                      {isPendingReview && (
                        <>
                          <button
                            className="primary-button"
                            style={{ padding: '6px 14px', fontSize: '0.82rem', background: '#10b981' }}
                            onClick={() => handleReviewAction(d.id, 'approve')}
                          >
                            <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Approve
                          </button>
                          <button
                            className="action-btn-sm danger"
                            onClick={() => setRejectingDeliv(d)}
                          >
                            <XCircle size={14} style={{ marginRight: '4px' }} /> Request Changes
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reach Telemetry Callout */}
                  <div style={{ display: 'flex', gap: '20px', marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: 'var(--muted)' }}>Initial Estimated Reach:</span>{' '}
                      <strong>{Number(d.estimated_reach).toLocaleString()}</strong>
                    </div>
                    {d.reviewed_at && (
                      <div style={{ color: 'var(--muted)' }}>
                        Reviewed on: {new Date(d.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                    {d.rejection_reason && (
                      <div style={{ color: '#ef4444' }}>
                        <strong>Rejection Reason:</strong> {d.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Evidence Items */}
                  {(d.evidence || []).length > 0 ? (
                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                        Submitted Proof of Performance:
                      </strong>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {d.evidence.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#fafafa',
                              borderRadius: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div>
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--violet)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                              >
                                <ExternalLink size={14} /> {ev.title} ({ev.evidence_type})
                              </a>
                              {ev.notes && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>"{ev.notes}"</div>}
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              {ev.measured_reach ? (
                                <div>
                                  <strong style={{ color: '#10b981' }}>
                                    Measured Reach: {Number(ev.measured_reach).toLocaleString()}
                                  </strong>
                                  <small style={{ display: 'block', color: 'var(--muted)' }}>
                                    Source: {ev.reach_source} ({new Date(ev.reach_measured_at).toLocaleDateString()})
                                  </small>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Unmeasured asset</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                      No evidence uploaded by organizer yet.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingDeliv && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#ef4444' }}>Reject Evidence & Request Revisions</h3>
              <button className="toolbar-button" onClick={() => setRejectingDeliv(null)}>×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!rejectReason) return showToast('Rejection reason is required', 'error');
              handleReviewAction(rejectingDeliv.id, 'reject', rejectReason);
            }}>
              <div className="modal-body" style={{ display: 'grid', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                  Deliverable: <strong>{rejectingDeliv.title}</strong>
                </p>
                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Specific Rejection Reason / Correction Request *
                  <textarea
                    rows={3}
                    required
                    className="filter-input"
                    placeholder="e.g. Logo resolution too low, photo angle does not verify placement, missing turnstile log..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setRejectingDeliv(null)}>Cancel</button>
                  <button type="submit" className="action-btn-sm danger" style={{ padding: '8px 16px' }}>Submit Rejection</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </SponsorLayout>
  );
}
