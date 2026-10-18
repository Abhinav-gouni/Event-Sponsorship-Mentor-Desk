import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SponsorLayout from '../../layouts/SponsorLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Search, MapPin, Calendar, Users, DollarSign, Send, Eye, ShieldAlert, Sparkles } from 'lucide-react';

export default function BrowseEvents() {
  const [searchParams] = useSearchParams();
  const preselectedEvent = searchParams.get('event');
  const { showToast } = useNotification();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Proposal Modal State
  const [proposalModalEvent, setProposalModalEvent] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events', { params: { status: 'published' } });
      if (res.data?.success) {
        setEvents(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (preselectedEvent && events.length > 0) {
      const match = events.find((e) => String(e.id) === String(preselectedEvent));
      if (match) {
        handleOpenProposal(match);
      }
    }
  }, [preselectedEvent, events]);

  const handleOpenProposal = async (event) => {
    try {
      // Load event details to get packages and inventory
      const res = await api.get(`/events/${event.id}`);
      if (res.data?.success) {
        const fullEvent = res.data.data;
        setProposalModalEvent(fullEvent);
        setProposalTitle(`Sponsorship Proposal for ${fullEvent.event?.name}`);
        if (fullEvent.packages && fullEvent.packages.length > 0) {
          setSelectedPackageId(String(fullEvent.packages[0].id));
          setProposedPrice(String(fullEvent.packages[0].final_price));
        } else {
          setProposedPrice('50000');
        }
      }
    } catch (err) {
      showToast('Could not load event packages', 'error');
    }
  };

  const handleSelectPackage = (pkgId) => {
    setSelectedPackageId(pkgId);
    const pkg = (proposalModalEvent?.packages || []).find((p) => String(p.id) === String(pkgId));
    if (pkg) {
      setProposedPrice(String(pkg.final_price));
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!proposedPrice) return showToast('Please enter your proposed budget', 'error');

    try {
      setSubmittingProposal(true);
      const res = await api.post('/negotiations', {
        event_id: proposalModalEvent.event.id,
        package_id: selectedPackageId ? Number(selectedPackageId) : null,
        title: proposalTitle,
        proposed_price: Number(proposedPrice),
        notes: proposalNotes,
        selected_benefits: []
      });

      if (res.data?.success) {
        showToast('Sponsorship proposal submitted to organizer!', 'success');
        setProposalModalEvent(null);
      }
    } catch (err) {
      // Show prohibited category violation or inventory error clearly
      const msg = err.response?.data?.message || 'Proposal submission failed';
      showToast(msg, 'error');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const categories = Array.from(new Set(events.map((e) => e.category_name)));
  const cities = Array.from(new Set(events.map((e) => e.city)));

  const filteredEvents = events.filter((e) => {
    const matchSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !categoryFilter || e.category_name === categoryFilter;
    const matchCity = !cityFilter || e.city === cityFilter;
    return matchSearch && matchCat && matchCity;
  });

  return (
    <SponsorLayout title="Discover Sponsorship Opportunities" subtitle="Browse verified events, review audience telemetry, and submit commercial proposals">
      {/* Search & Filters */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            className="filter-input"
            style={{ border: 'none', padding: '6px 0', outline: 'none' }}
            placeholder="Search events by name, theme, or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid-cols-3">
        {loading ? (
          <div className="full-span" style={{ textAlign: 'center', padding: '40px' }}>Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="full-span" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            No events found matching your search.
          </div>
        ) : (
          filteredEvents.map((e) => (
            <div key={e.id} className="card-item">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tag-chip">{e.category_name}</span>
                  <span className="badge badge-success">Published</span>
                </div>

                <h3 style={{ margin: '12px 0 6px', fontSize: '1.2rem' }}>{e.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                  <MapPin size={14} /> {e.city}, {e.state}
                </div>

                <p style={{ fontSize: '0.88rem', color: '#334155', minHeight: '44px' }}>
                  {e.description ? `${e.description.substring(0, 110)}...` : 'Join as a corporate partner to reach qualified attendees.'}
                </p>

                {/* Audience metrics */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', margin: '12px 0', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block' }}>Expected Attendees</span>
                    <strong>{Number(e.expected_audience).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block' }}>Total Reach</span>
                    <strong>{Number(e.estimated_reach).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block' }}>Slots Left</span>
                    <strong style={{ color: '#10b981' }}>{e.available_inventory_slots || 0}</strong>
                  </div>
                </div>

                {/* Prohibited categories notice if any */}
                {(e.prohibited_sponsor_categories || []).length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '8px' }}>
                    <strong>Restricted:</strong> {e.prohibited_sponsor_categories.join(', ')}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                <button
                  className="primary-button full-width"
                  onClick={() => handleOpenProposal(e)}
                >
                  <Send size={14} style={{ marginRight: '6px' }} /> Submit Proposal
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Proposal Builder Modal */}
      {proposalModalEvent && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(700px, calc(100% - 32px))' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Create Sponsorship Proposal</h3>
                <small style={{ color: 'var(--muted)' }}>
                  Event: {proposalModalEvent.event?.name} ({proposalModalEvent.event?.city})
                </small>
              </div>
              <button className="toolbar-button" onClick={() => setProposalModalEvent(null)}>×</button>
            </div>
            <form onSubmit={handleSubmitProposal}>
              <div className="modal-body" style={{ display: 'grid', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Proposal Title *
                  <input
                    type="text"
                    required
                    className="filter-input"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                  />
                </label>

                {/* Package Selection */}
                <div>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>
                    Select an Event Package (or Custom Offer):
                  </strong>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(proposalModalEvent.packages || []).map((pkg) => {
                      const isSelected = selectedPackageId === String(pkg.id);
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => handleSelectPackage(pkg.id)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--violet)' : '1px solid var(--border)',
                            background: isSelected ? '#f5f3ff' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong>{pkg.name}</strong>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                              {pkg.description}
                            </p>
                          </div>
                          <strong style={{ color: 'var(--violet)', fontSize: '1.05rem' }}>
                            ₹{Number(pkg.final_price).toLocaleString()}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proposed Budget */}
                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Proposed Price / Deal Value (₹) *
                  <input
                    type="number"
                    required
                    min={1}
                    className="filter-input"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                  />
                </label>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Proposal Notes & Commercial Requirements
                  <textarea
                    rows={3}
                    className="filter-input"
                    placeholder="Specify special branding requirements, speaking slot topics, booth placement requests..."
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setProposalModalEvent(null)}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={submittingProposal}>
                    <Send size={16} style={{ marginRight: '6px' }} />
                    {submittingProposal ? 'Submitting Proposal...' : 'Send Proposal to Organizer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </SponsorLayout>
  );
}
