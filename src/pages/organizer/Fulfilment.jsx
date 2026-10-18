import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Upload, CheckCircle2, Clock, AlertTriangle, ExternalLink, Image, Link as LinkIcon, Plus } from 'lucide-react';

export default function Fulfilment() {
  const { showToast } = useNotification();
  const [agreements, setAgreements] = useState([]);
  const [selectedAgrId, setSelectedAgrId] = useState('');
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Evidence modal state
  const [selectedDeliv, setSelectedDeliv] = useState(null);
  const [evidenceType, setEvidenceType] = useState('url');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [measuredReach, setMeasuredReach] = useState('');
  const [reachSource, setReachSource] = useState('Google Analytics / Badge Scans');

  // Create deliverable modal state
  const [showAddDelivModal, setShowAddDelivModal] = useState(false);
  const [delivTitle, setDelivTitle] = useState('');
  const [delivType, setDelivType] = useState('Stage Branding');
  const [delivDueDate, setDelivDueDate] = useState('');
  const [delivEstReach, setDelivEstReach] = useState(10000);

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

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceUrl || !evidenceTitle) return showToast('Title and Evidence URL are required', 'error');

    try {
      const res = await api.post(`/fulfilment/deliverables/${selectedDeliv.id}/evidence`, {
        evidence_type: evidenceType,
        title: evidenceTitle,
        url: evidenceUrl,
        notes: evidenceNotes,
        measured_reach: measuredReach ? Number(measuredReach) : null,
        reach_source: measuredReach ? reachSource : null,
        reach_measured_at: measuredReach ? new Date().toISOString() : null
      });

      if (res.data?.success) {
        showToast('Evidence submitted to sponsor for review!', 'success');
        setSelectedDeliv(null);
        setEvidenceTitle('');
        setEvidenceUrl('');
        setEvidenceNotes('');
        setMeasuredReach('');
        loadDeliverables(selectedAgrId);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Evidence submission failed', 'error');
    }
  };

  const handleCreateDeliverable = async (e) => {
    e.preventDefault();
    if (!delivTitle) return showToast('Title required', 'error');

    try {
      const res = await api.post('/fulfilment/deliverables', {
        agreement_id: Number(selectedAgrId),
        title: delivTitle,
        benefit_type: delivType,
        due_date: delivDueDate || null,
        estimated_reach: Number(delivEstReach) || 0
      });

      if (res.data?.success) {
        showToast('Deliverable added', 'success');
        setShowAddDelivModal(false);
        setDelivTitle('');
        loadDeliverables(selectedAgrId);
      }
    } catch (err) {
      showToast('Creation failed', 'error');
    }
  };

  const selectedAgreement = agreements.find((a) => String(a.id) === String(selectedAgrId));

  return (
    <OrganizerLayout title="Fulfilment & Evidence Delivery" subtitle="Submit proof of performance, measured telemetry, and monitor sponsor approval decisions">
      {/* Selector & Actions */}
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
                {a.agreement_number} - {a.company_name} ({a.event_name})
              </option>
            ))}
          </select>
        </label>

        <button className="primary-button" onClick={() => setShowAddDelivModal(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Deliverable
        </button>
      </div>

      {/* Deliverables List */}
      <div className="panel">
        <div className="panel-header">
          <h3>Agreed Benefit Deliverables ({deliverables.length})</h3>
          <span>Proof & verification dashboard</span>
        </div>

        <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading deliverables...</p>
          ) : deliverables.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
              No deliverables configured for this agreement. Click 'Add Deliverable' to schedule items.
            </p>
          ) : (
            deliverables.map((d) => (
              <div
                key={d.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '18px',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{d.title}</h4>
                      <span className="tag-chip">{d.benefit_type}</span>
                    </div>
                    {d.description && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>{d.description}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${
                      d.status === 'approved' ? 'badge-success' : d.status === 'rejected' ? 'badge-warning' : d.status === 'submitted_for_review' ? 'badge-neutral' : ''
                    }`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                    <button
                      className="primary-button"
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                      onClick={() => setSelectedDeliv(d)}
                    >
                      <Upload size={14} style={{ marginRight: '4px' }} /> Submit Evidence
                    </button>
                  </div>
                </div>

                {/* Audience metrics callout: Separates estimated from measured reach */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Estimated Reach:</span>{' '}
                    <strong>{Number(d.estimated_reach).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Target Due Date:</span>{' '}
                    <strong>{d.due_date ? new Date(d.due_date).toLocaleDateString() : 'Event Date'}</strong>
                  </div>
                  {d.rejection_reason && (
                    <div style={{ color: '#ef4444' }}>
                      <strong>Rejection Feedback:</strong> {d.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Attached Evidence Items */}
                {(d.evidence || []).length > 0 && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                      Submitted Proof of Delivery ({d.evidence.length}):
                    </strong>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {d.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#fafafa',
                            borderRadius: '6px',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div>
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--violet)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            >
                              <ExternalLink size={13} /> {ev.title}
                            </a>
                            {ev.notes && <span style={{ color: 'var(--muted)', marginLeft: '10px' }}>"{ev.notes}"</span>}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {ev.measured_reach && (
                              <span style={{ color: '#10b981', fontWeight: 600 }}>
                                Measured: {Number(ev.measured_reach).toLocaleString()} via {ev.reach_source}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submit Evidence Modal */}
      {selectedDeliv && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(620px, calc(100% - 32px))' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Submit Evidence of Delivery</h3>
                <small style={{ color: 'var(--muted)' }}>Deliverable: {selectedDeliv.title}</small>
              </div>
              <button className="toolbar-button" onClick={() => setSelectedDeliv(null)}>×</button>
            </div>
            <form onSubmit={handleSubmitEvidence}>
              <div className="modal-body" style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Evidence Type
                    <select
                      className="filter-select"
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                    >
                      <option value="url">URL Link / Recording</option>
                      <option value="image_url">Photograph / Screenshot URL</option>
                      <option value="social_link">Social Media Post Link</option>
                      <option value="metric_report">Analytics / Telemetry Report</option>
                      <option value="document_url">Signed Handover Document</option>
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Evidence Title *
                    <input
                      type="text"
                      required
                      className="filter-input"
                      placeholder="e.g. Stage Arch Center Logo Photograph"
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Public Asset URL / Cloud Link *
                  <input
                    type="url"
                    required
                    className="filter-input"
                    placeholder="https://images.unsplash.com/... or https://youtube.com/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                  />
                </label>

                {/* Measured Reach Telemetry */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>
                    Audited Reach Telemetry (Separate from Estimated Reach):
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={{ display: 'grid', gap: '4px', fontSize: '0.82rem' }}>
                      Measured Attendee Count
                      <input
                        type="number"
                        min={0}
                        className="filter-input"
                        placeholder="e.g. 14850"
                        value={measuredReach}
                        onChange={(e) => setMeasuredReach(e.target.value)}
                      />
                    </label>

                    <label style={{ display: 'grid', gap: '4px', fontSize: '0.82rem' }}>
                      Evidence Source
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="e.g. Venue Turnstile Scans"
                        value={reachSource}
                        onChange={(e) => setReachSource(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Delivery Notes & Specifications
                  <textarea
                    rows={2}
                    className="filter-input"
                    placeholder="Verification notes for the sponsor review team..."
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setSelectedDeliv(null)}>Cancel</button>
                  <button type="submit" className="primary-button">Submit for Sponsor Review</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Deliverable Modal */}
      {showAddDelivModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add Deliverable Commitment</h3>
              <button className="toolbar-button" onClick={() => setShowAddDelivModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateDeliverable}>
              <div className="modal-body" style={{ display: 'grid', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Deliverable Name *
                  <input
                    type="text"
                    required
                    className="filter-input"
                    placeholder="e.g. Opening Keynote 90s Sponsor Video"
                    value={delivTitle}
                    onChange={(e) => setDelivTitle(e.target.value)}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Benefit Category
                    <input
                      type="text"
                      className="filter-input"
                      value={delivType}
                      onChange={(e) => setDelivType(e.target.value)}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Estimated Reach
                    <input
                      type="number"
                      className="filter-input"
                      value={delivEstReach}
                      onChange={(e) => setDelivEstReach(Number(e.target.value))}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Due Date
                  <input
                    type="date"
                    className="filter-input"
                    value={delivDueDate}
                    onChange={(e) => setDelivDueDate(e.target.value)}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setShowAddDelivModal(false)}>Cancel</button>
                  <button type="submit" className="primary-button">Save Deliverable</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
