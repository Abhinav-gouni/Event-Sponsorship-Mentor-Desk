import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Download, FileText, CheckCircle2, AlertCircle, BarChart3, TrendingUp, Sparkles } from 'lucide-react';

export default function Reports() {
  const { showToast } = useNotification();
  const [reportData, setReportData] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'validation'

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [repRes, valRes] = await Promise.all([
          api.get('/reports/organizer-summary'),
          api.get('/reports/business-validation')
        ]);
        if (repRes.data?.success) setReportData(repRes.data.data);
        if (valRes.data?.success) setValidationReport(valRes.data.data);
      } catch (err) {
        showToast('Failed to load reports', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const handleExport = (type, format) => {
    // Direct browser download via endpoint
    const url = `/api/reports/export/${type}/${format}`;
    window.open(url, '_blank');
    showToast(`Exporting ${type} report as ${format.toUpperCase()}...`, 'info');
  };

  const fin = reportData?.financials || {};
  const ful = reportData?.fulfilment || {};

  return (
    <OrganizerLayout title="Reports, Analytics & Business Validation" subtitle="Authoritative financial audits, measured reach comparisons, and pilot validation hypotheses">
      {/* Top Controls & Export Bar */}
      <div className="filter-bar">
        <div className="tab-nav" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Commercial Analytics & Audit
          </button>
          <button
            className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            Business Validation Report (Pilot Ready)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button
            className="action-btn-sm"
            onClick={() => handleExport('pipeline', 'csv')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Pipeline CSV
          </button>
          <button
            className="action-btn-sm"
            onClick={() => handleExport('agreements', 'csv')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Agreements CSV
          </button>
          <button
            className="action-btn-sm"
            onClick={() => handleExport('fulfilment', 'json')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Fulfilment JSON
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div style={{ display: 'grid', gap: '22px' }}>
          {/* Executive Margin Breakdown */}
          <div className="stats-grid">
            <div className="stat-card green">
              <span>Confirmed Sponsorship Value</span>
              <strong>₹{(fin.confirmedSponsorshipValue || 0).toLocaleString()}</strong>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                Mutually signed agreements
              </small>
            </div>
            <div className="stat-card blue">
              <span>Fulfilment Production Cost</span>
              <strong>₹{(fin.confirmedFulfilmentCost || 0).toLocaleString()}</strong>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                Delivery fabrication expenses
              </small>
            </div>
            <div className="stat-card violet">
              <span>Net Contribution</span>
              <strong>₹{(fin.confirmedContribution || 0).toLocaleString()}</strong>
              <small style={{ color: '#10b981', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                {fin.confirmedContributionMargin || 0}% Net Margin
              </small>
            </div>
            <div className="stat-card amber">
              <span>Proposed Value (Pipeline)</span>
              <strong>₹{(fin.proposedSponsorshipValue || 0).toLocaleString()}</strong>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                Not counted as revenue
              </small>
            </div>
          </div>

          {/* Measured Reach vs Estimated Reach Telemetry Table */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 style={{ margin: 0 }}>Measured Reach vs Estimated Reach Audit</h3>
                <small style={{ color: 'var(--muted)' }}>
                  Strictly distinguishes measured telemetry from initial projections
                </small>
              </div>
              <span className="badge badge-success">Audited Data</span>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Deliverable Benefit</th>
                    <th>Event</th>
                    <th>Sponsor</th>
                    <th>Estimated Reach</th>
                    <th>Measured Reach</th>
                    <th>Audited Source</th>
                    <th>Measurement Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.reachComparison || []).length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No reach telemetry submitted yet.</td></tr>
                  ) : (
                    reportData.reachComparison.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{r.title}</strong>
                          <span className="tag-chip" style={{ marginLeft: '6px' }}>{r.benefit_type}</span>
                        </td>
                        <td>{r.event_name}</td>
                        <td>{r.company_name}</td>
                        <td>{Number(r.estimated_reach).toLocaleString()}</td>
                        <td>
                          {r.measured_reach ? (
                            <strong style={{ color: '#10b981' }}>
                              {Number(r.measured_reach).toLocaleString()}
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>Pending measurement</span>
                          )}
                        </td>
                        <td>{r.reach_source || '—'}</td>
                        <td>
                          {r.reach_measured_at ? new Date(r.reach_measured_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Section 15: Business Validation Report */
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <FileText size={24} color="var(--violet)" />
              <div>
                <h3 style={{ margin: 0 }}>Business Validation & Pilot Readiness Report</h3>
                <small style={{ color: 'var(--muted)' }}>
                  Controlled evaluation framework distinguishing observed evidence from hypotheses
                </small>
              </div>
            </div>

            {/* 1. Observed Evidence */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#1e1b4b', marginBottom: '8px' }}>1. Observed Evidence</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {(validationReport?.observed_evidence || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'start', gap: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Customer Value Hypothesis */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#1e1b4b', marginBottom: '8px' }}>2. Customer-Value Hypothesis</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                  <strong style={{ color: 'var(--violet)', display: 'block', marginBottom: '6px' }}>Organizer Value:</strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                    {validationReport?.customer_value_hypothesis?.organizer_value}
                  </p>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                  <strong style={{ color: '#10b981', display: 'block', marginBottom: '6px' }}>Sponsor Value:</strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                    {validationReport?.customer_value_hypothesis?.sponsor_value}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Contribution & Willingness-To-Pay */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#1e1b4b', marginBottom: '8px' }}>3. Contribution & Willingness-To-Pay Hypothesis</h4>
              <div style={{ background: '#faf5ff', border: '1px solid #c084fc', padding: '16px', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#3b0764' }}>
                  {validationReport?.willingness_to_pay_hypothesis?.benchmark_pricing}
                </p>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '6px', fontWeight: 600, color: '#581c87', fontSize: '0.85rem' }}>
                  Mandatory Validation Example: {validationReport?.willingness_to_pay_hypothesis?.required_example}
                </div>
              </div>
            </div>

            {/* 4. Negotiated Change Example */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#1e1b4b', marginBottom: '8px' }}>4. Audited Negotiation Round Example</h4>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', fontSize: '0.88rem' }}>
                <div><strong>Scenario:</strong> {validationReport?.negotiated_change_example?.scenario}</div>
                <div style={{ marginTop: '4px' }}><strong>Initial Proposal:</strong> {validationReport?.negotiated_change_example?.initial_proposal}</div>
                <div style={{ marginTop: '4px' }}><strong>Organizer Counteroffer:</strong> {validationReport?.negotiated_change_example?.counteroffer}</div>
                <div style={{ marginTop: '6px', color: '#10b981', fontWeight: 600 }}>
                  <strong>Final Result:</strong> {validationReport?.negotiated_change_example?.result}
                </div>
              </div>
            </div>

            {/* 5. Next 30-Day Validation Test */}
            <div>
              <h4 style={{ color: '#1e1b4b', marginBottom: '8px' }}>5. Next 30-Day Controlled Pilot Test</h4>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#1e40af' }}>
                  <strong>Objective:</strong> {validationReport?.next_30_day_validation_test?.objective}
                </p>
                <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#1e40af' }}>
                  <strong>Primary Metric:</strong> {validationReport?.next_30_day_validation_test?.metric_to_measure}
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
                  <strong>Status:</strong> {validationReport?.next_30_day_validation_test?.pilot_readiness}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
