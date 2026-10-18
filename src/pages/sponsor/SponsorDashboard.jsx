import { useEffect, useState } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, DollarSign, Handshake, CheckSquare, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SponsorDashboard() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [agrRes, propRes] = await Promise.all([
          api.get('/agreements'),
          api.get('/negotiations')
        ]);
        if (agrRes.data?.success) setAgreements(agrRes.data.data);
        if (propRes.data?.success) setProposals(propRes.data.data);
      } catch (err) {
        console.error('Failed to load sponsor dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeAgreements = agreements.filter(a => a.status === 'mutually_approved');
  const pendingProposals = proposals.filter(p => ['submitted', 'under_review', 'counteroffer_organizer'].includes(p.status));
  const totalAgreedValue = activeAgreements.reduce((sum, a) => sum + Number(a.agreed_price), 0);
  const pendingCounteroffers = proposals.filter(p => p.status === 'counteroffer_organizer');

  return (
    <SponsorLayout title="Sponsor Partner Portal" subtitle="Portfolio sponsorships, active negotiations, and deliverable review status">
      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <DollarSign size={20} />
          </div>
          <span>Agreed Sponsorship Value</span>
          <strong>₹{totalAgreedValue.toLocaleString()}</strong>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '0.75rem' }}>
            Active contracted partnerships
          </small>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Handshake size={20} />
          </div>
          <span>Active Sponsorships</span>
          <strong>{activeAgreements.length}</strong>
          <small style={{ display: 'block', marginTop: '6px', color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>
            Mutually approved contracts
          </small>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <span>Pending Proposals</span>
          <strong>{pendingProposals.length}</strong>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '0.75rem' }}>
            {pendingCounteroffers.length} counteroffers awaiting your action
          </small>
        </div>

        <div className="stat-card violet">
          <div className="stat-card-icon"><Sparkles size={20} /></div>
          <span>AI Event Recommendations</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--violet)' }}>Ollama Active</strong>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '0.75rem' }}>
            Personalized to brand criteria
          </small>
        </div>
      </div>

      {/* Action Banners & Recent Activity */}
      <div className="card-grid two-up">
        {/* Active Agreements Overview */}
        <div className="panel">
          <div className="panel-header">
            <h3>Active Sponsorship Contracts ({activeAgreements.length})</h3>
            <Link to="/sponsor/active-sponsorships" className="action-btn-sm">View All</Link>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gap: '10px' }}>
            {activeAgreements.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0, padding: '20px 0', textAlign: 'center' }}>
                No active agreements yet. Browse events to submit a proposal.
              </p>
            ) : (
              activeAgreements.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div>
                    <strong>{a.event_name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {a.agreement_number} • {new Date(a.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#10b981' }}>₹{Number(a.agreed_price).toLocaleString()}</strong>
                    <span className="badge badge-success" style={{ display: 'block', marginTop: '2px' }}>Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Counteroffers / Decisions */}
        <div className="panel">
          <div className="panel-header">
            <h3>Pending Negotiations & Counteroffers</h3>
            <Link to="/sponsor/proposals" className="action-btn-sm">Proposals</Link>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gap: '10px' }}>
            {pendingProposals.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0, padding: '20px 0', textAlign: 'center' }}>
                No pending proposals or counteroffers.
              </p>
            ) : (
              pendingProposals.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div>
                    <strong>{p.event_name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Round {p.current_version} • Offered: ₹{Number(p.proposed_price).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    {p.status === 'counteroffer_organizer' ? (
                      <Link to="/sponsor/proposals" className="badge badge-warning" style={{ textDecoration: 'none' }}>
                        Counteroffer Received
                      </Link>
                    ) : (
                      <span className="badge badge-neutral">{p.status}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Discovery Shortcuts */}
      <div className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#581c87', fontWeight: 700, fontSize: '1.1rem' }}>
            <Sparkles size={20} color="#7c3aed" /> Explore Recommended Events
          </div>
          <p style={{ margin: '4px 0 0', color: '#6b21a8', fontSize: '0.9rem' }}>
            Let our local Ollama AI find high-conversion summits aligned with your budget and brand restrictions.
          </p>
        </div>
        <Link to="/sponsor/recommended-events" className="primary-button" style={{ display: 'inline-flex', gap: '6px' }}>
          Discover Events <ArrowRight size={16} />
        </Link>
      </div>
    </SponsorLayout>
  );
}
