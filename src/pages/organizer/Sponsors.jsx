import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Search, Bookmark, BookmarkCheck, ExternalLink, Calendar, Mail, Phone, MapPin } from 'lucide-react';

export default function Sponsors() {
  const { showToast } = useNotification();
  const [sponsors, setSponsors] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [sponsorDetails, setSponsorDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'shortlisted'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sponsRes, shortRes] = await Promise.all([
        api.get('/sponsors'),
        api.get('/sponsors/shortlist/my')
      ]);

      if (sponsRes.data?.success) setSponsors(sponsRes.data.data);
      if (shortRes.data?.success) setShortlists(shortRes.data.data);
    } catch (err) {
      showToast('Failed to load sponsor directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isShortlisted = (sponsorId) => shortlists.some((s) => s.sponsor_id === sponsorId);

  const handleToggleShortlist = async (sponsorId) => {
    try {
      const res = await api.post('/sponsors/shortlist', { sponsor_id: sponsorId });
      if (res.data?.success) {
        showToast(res.data.shortlisted ? 'Sponsor added to shortlist' : 'Sponsor removed from shortlist', 'success');
        fetchData();
      }
    } catch (err) {
      showToast('Action failed', 'error');
    }
  };

  const handleUpdateOutreach = async (shortlistId, status, followUpDate, notes) => {
    try {
      await api.put(`/sponsors/shortlist/${shortlistId}`, {
        outreach_status: status,
        follow_up_date: followUpDate,
        notes
      });
      showToast('Outreach status updated', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to update outreach', 'error');
    }
  };

  const handleViewSponsor = async (sponsorId) => {
    try {
      const res = await api.get(`/sponsors/${sponsorId}`);
      if (res.data?.success) {
        setSponsorDetails(res.data.data);
        setSelectedSponsor(sponsorId);
      }
    } catch (err) {
      showToast('Could not load sponsor profile', 'error');
    }
  };

  const filteredSponsors = sponsors.filter((s) => {
    const matchSearch = !searchTerm || s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchIndustry = !industryFilter || s.industry === industryFilter;
    if (activeTab === 'shortlisted') {
      return matchSearch && matchIndustry && isShortlisted(s.id);
    }
    return matchSearch && matchIndustry;
  });

  const industries = Array.from(new Set(sponsors.map((s) => s.industry)));

  return (
    <OrganizerLayout title="Sponsor Intelligence Database" subtitle="Explore verified corporate partners, budgets, preferences, and outreach history">
      {/* Tab Nav */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Sponsors ({sponsors.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'shortlisted' ? 'active' : ''}`}
          onClick={() => setActiveTab('shortlisted')}
        >
          My Shortlist & Outreach ({shortlists.length})
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            className="filter-input"
            style={{ border: 'none', padding: '6px 0', outline: 'none' }}
            placeholder="Search sponsors by brand name or industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
        >
          <option value="">All Industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {/* Sponsors Grid / Table */}
      {activeTab === 'all' ? (
        <div className="grid-cols-3">
          {loading ? (
            <div className="full-span" style={{ textAlign: 'center', padding: '40px' }}>Loading sponsors...</div>
          ) : filteredSponsors.length === 0 ? (
            <div className="full-span" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No sponsors found matching your criteria.
            </div>
          ) : (
            filteredSponsors.map((s) => {
              const shortlisted = isShortlisted(s.id);
              return (
                <div key={s.id} className="card-item">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <span className="tag-chip">{s.industry}</span>
                      <button
                        className="toolbar-button"
                        onClick={() => handleToggleShortlist(s.id)}
                        title={shortlisted ? 'Remove Shortlist' : 'Add to Shortlist'}
                      >
                        {shortlisted ? <BookmarkCheck size={16} color="var(--violet)" /> : <Bookmark size={16} />}
                      </button>
                    </div>

                    <h3 style={{ margin: '10px 0 6px', fontSize: '1.2rem' }}>{s.company_name}</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {s.location || 'Pan-India'}
                    </p>
                    <p style={{ fontSize: '0.88rem', color: '#334155', minHeight: '40px' }}>
                      {s.description ? `${s.description.substring(0, 110)}...` : 'Corporate sponsor actively discovering tech, sports, and cultural summits.'}
                    </p>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', margin: '12px 0', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--muted)', display: 'block' }}>Typical Budget Range</span>
                      <strong>₹{Number(s.min_budget || 25000).toLocaleString()} - ₹{Number(s.max_budget || 250000).toLocaleString()}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Target Domains</span>
                      {(s.preferred_categories || []).slice(0, 2).map((c, i) => (
                        <span key={i} className="tag-chip">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button
                      className="primary-button full-width"
                      onClick={() => handleViewSponsor(s.id)}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Shortlist & Outreach View */
        <div className="panel">
          <div className="panel-header">
            <h3>Shortlisted Sponsors & Outreach Status</h3>
            <span>{shortlists.length} leads tracked</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sponsor</th>
                  <th>Industry</th>
                  <th>Contact Person</th>
                  <th>Outreach Status</th>
                  <th>Follow-Up Date</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shortlists.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No sponsors currently shortlisted.</td></tr>
                ) : (
                  shortlists.map((sl) => (
                    <tr key={sl.id}>
                      <td><strong>{sl.company_name}</strong></td>
                      <td><span className="tag-chip">{sl.industry}</span></td>
                      <td>
                        <div>{sl.contact_name}</div>
                        <small style={{ color: 'var(--muted)' }}>{sl.contact_email}</small>
                      </td>
                      <td>
                        <select
                          className="filter-select"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          value={sl.outreach_status}
                          onChange={(e) => handleUpdateOutreach(sl.id, e.target.value, sl.follow_up_date, sl.notes)}
                        >
                          <option value="not_contacted">Not Contacted</option>
                          <option value="contacted">Contacted</option>
                          <option value="in_discussion">In Discussion</option>
                          <option value="committed">Committed</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="date"
                          style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem' }}
                          value={sl.follow_up_date ? sl.follow_up_date.substring(0, 10) : ''}
                          onChange={(e) => handleUpdateOutreach(sl.id, sl.outreach_status, e.target.value, sl.notes)}
                        />
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{sl.notes || 'No notes'}</span>
                      </td>
                      <td>
                        <button className="action-btn-sm" onClick={() => handleViewSponsor(sl.sponsor_id)}>
                          Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sponsor Details Modal */}
      {selectedSponsor && sponsorDetails && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(700px, calc(100% - 32px))' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{sponsorDetails.sponsor?.company_name}</h3>
                <small style={{ color: 'var(--muted)' }}>{sponsorDetails.sponsor?.industry} • {sponsorDetails.sponsor?.location}</small>
              </div>
              <button className="toolbar-button" onClick={() => setSelectedSponsor(null)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <p>{sponsorDetails.sponsor?.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', margin: '14px 0' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Target Audience</span>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '4px' }}>
                    {sponsorDetails.sponsor?.target_audience || 'Technology professionals, decision makers'}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Marketing Objectives</span>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '4px' }}>
                    {sponsorDetails.sponsor?.marketing_objectives || 'Lead generation, recruiting, mindshare'}
                  </div>
                </div>
              </div>

              {/* Brand Restrictions */}
              <div style={{ marginBottom: '14px' }}>
                <strong style={{ fontSize: '0.85rem' }}>Brand Safety & Excluded Categories:</strong>
                <div style={{ marginTop: '6px' }}>
                  {(sponsorDetails.sponsor?.excluded_categories || []).length > 0 ? (
                    sponsorDetails.sponsor.excluded_categories.map((c, i) => (
                      <span key={i} className="tag-chip tag-chip-danger">{c}</span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No excluded categories.</span>
                  )}
                </div>
              </div>

              {/* Past sponsorships track record */}
              <h4>Platform Sponsorship Track Record ({sponsorDetails.sponsorshipHistory?.length || 0})</h4>
              {sponsorDetails.sponsorshipHistory?.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No previous completed sponsorships on record.</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {sponsorDetails.sponsorshipHistory.map((h) => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div>
                        <strong>{h.event_name}</strong> ({h.city})
                        <small style={{ display: 'block', color: 'var(--muted)' }}>{h.agreement_number}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#10b981' }}>₹{Number(h.agreed_price).toLocaleString()}</strong>
                        <span className="badge badge-success" style={{ display: 'block', marginTop: '2px' }}>{h.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="primary-button" onClick={() => setSelectedSponsor(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
