import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { Calendar, DollarSign, Handshake, TrendingUp, Clock, CheckCircle2, Bot } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

export default function OrganizerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/reports/organizer-summary');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load organizer summary', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fin = data?.financials || {};
  const ful = data?.fulfilment || {};
  const pipeline = data?.pipeline || [];
  const deadlines = data?.upcomingDeadlines || [];

  const pipelineChartData = pipeline.map(p => ({
    name: p.status.replace(/_/g, ' '),
    count: Number(p.count),
    value: Number(p.total_value)
  }));

  const categoryData = (data?.categoryDeals || []).map(c => ({
    name: c.category_name,
    value: Number(c.total_value) || 1
  }));

  return (
    <OrganizerLayout title="Organizer Executive Desk" subtitle="Commercial performance, sponsorship pipeline, and fulfilment metrics">
      {/* Financial Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <DollarSign size={20} />
          </div>
          <span>Confirmed Sponsorship Value</span>
          <strong>₹{(fin.confirmedSponsorshipValue || 0).toLocaleString()}</strong>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '0.75rem' }}>
            Agreed contracted value
          </small>
        </div>

        <div className="stat-card violet">
          <div className="stat-card-icon"><TrendingUp size={20} /></div>
          <span>Confirmed Contribution</span>
          <strong>₹{(fin.confirmedContribution || 0).toLocaleString()}</strong>
          <small style={{ display: 'block', marginTop: '6px', color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>
            {fin.confirmedContributionMargin || 0}% Contribution Margin
          </small>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Handshake size={20} />
          </div>
          <span>Proposed Pipeline Value</span>
          <strong>₹{(fin.proposedSponsorshipValue || 0).toLocaleString()}</strong>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '0.75rem' }}>
            Pending proposals (not revenue)
          </small>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <CheckCircle2 size={20} />
          </div>
          <span>Fulfilment Completion</span>
          <strong>{ful.completionRate || 0}%</strong>
          <div className="progress-bar-wrap" style={{ marginTop: '10px' }}>
            <div className="progress-bar-fill" style={{ width: `${ful.completionRate || 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Charts & Pipeline */}
      <div className="card-grid two-up">
        {/* Pipeline Chart */}
        <div className="panel">
          <div className="panel-header">
            <h3>Sponsorship Pipeline Distribution</h3>
            <span>Deals by stage</span>
          </div>
          <div style={{ height: '260px', padding: '16px' }}>
            {pipelineChartData.length === 0 ? (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)' }}>
                No active proposals in pipeline.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val, name) => [name === 'value' ? `₹${Number(val).toLocaleString()}` : val, name]} />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="panel">
          <div className="panel-header">
            <h3>Sponsorship Value by Category</h3>
            <span>Contract volume</span>
          </div>
          <div style={{ height: '260px', padding: '16px' }}>
            {categoryData.length === 0 ? (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)' }}>
                No category data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Deadlines & Quick Actions */}
      <div className="card-grid two-up">
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#f59e0b" />
              <h3>Upcoming Deadlines</h3>
            </div>
            <span>Critical milestones</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {deadlines.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0 }}>No upcoming deadlines.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {deadlines.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div>
                      <strong>{d.event_name}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Starts: {new Date(d.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="badge badge-warning">
                      Deadline: {new Date(d.application_deadline).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="#6366f1" />
              <h3>AI Sponsorship Co-Pilot</h3>
            </div>
            <span>Fast shortcuts</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gap: '12px' }}>
            <Link to="/organizer/sponsor-finder" className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div>
                <strong>Find Matching Sponsors</strong>
                <p>Run Ollama recommendations against your event audience & categories.</p>
              </div>
              <span className="action-btn-sm primary">Launch</span>
            </Link>

            <Link to="/organizer/package-builder" className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div>
                <strong>What-If Pricing Calculator</strong>
                <p>Simulate ₹30k revenue with ₹18k cost to protect 40% margin.</p>
              </div>
              <span className="action-btn-sm">Calculate</span>
            </Link>

            <Link to="/organizer/reports" className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div>
                <strong>Export Business Validation Report</strong>
                <p>Download audited CSV/JSON telemetry and deliverable receipts.</p>
              </div>
              <span className="action-btn-sm">Reports</span>
            </Link>
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
