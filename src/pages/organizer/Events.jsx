import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Link } from 'react-router-dom';
import { Plus, Eye, CheckCircle, Archive, Search, MapPin, Users, Calendar } from 'lucide-react';

export default function Events() {
  const { showToast } = useNotification();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events/my-events');
      if (res.data?.success) {
        setEvents(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      await api.patch(`/events/${eventId}/status`, { status: newStatus });
      showToast(`Event status updated to ${newStatus}`, 'success');
      fetchEvents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  const handleViewDetails = async (eventId) => {
    try {
      const res = await api.get(`/events/${eventId}`);
      if (res.data?.success) {
        setEventDetails(res.data.data);
        setSelectedEvent(eventId);
      }
    } catch (err) {
      showToast('Could not load event details', 'error');
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <OrganizerLayout
      title="Event Portfolio"
      subtitle="Manage, publish, and track sponsorship opportunities across your events"
    >
      {/* Top action row */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            className="filter-input"
            style={{ border: 'none', padding: '6px 0', outline: 'none' }}
            placeholder="Search events by title or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="completed">Completed</option>
        </select>
        <Link to="/organizer/events/create" className="primary-button" style={{ display: 'inline-flex', gap: '6px' }}>
          <Plus size={16} /> Create Event
        </Link>
      </div>

      {/* Events Table Panel */}
      <div className="panel">
        <div className="panel-header">
          <h3>Events ({filteredEvents.length})</h3>
          <span>Active listings</span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Category</th>
                <th>City & Venue</th>
                <th>Dates</th>
                <th>Audience</th>
                <th>Confirmed Deals</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>Loading events...</td></tr>
              ) : filteredEvents.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No events found. Click 'Create Event' to start.</td></tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {e.proposals_count || 0} proposals ({e.pending_proposals_count || 0} pending)
                      </div>
                    </td>
                    <td><span className="tag-chip">{e.category_name}</span></td>
                    <td>
                      <div>{e.city}, {e.state}</div>
                      <small style={{ color: 'var(--muted)' }}>{e.venue || e.location}</small>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {new Date(e.start_date).toLocaleDateString()} to {new Date(e.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div><strong>{Number(e.expected_audience).toLocaleString()}</strong> attendees</div>
                      <small style={{ color: 'var(--muted)' }}>Reach: {Number(e.estimated_reach).toLocaleString()}</small>
                    </td>
                    <td>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>
                        ₹{(Number(e.confirmed_revenue) || 0).toLocaleString()}
                      </div>
                      <small style={{ color: 'var(--muted)' }}>{e.confirmed_deals_count || 0} agreed</small>
                    </td>
                    <td>
                      <span className={`badge ${
                        e.status === 'published' ? 'badge-success' : e.status === 'draft' ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="action-btn-sm"
                          onClick={() => handleViewDetails(e.id)}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {e.status === 'draft' && (
                          <button
                            className="action-btn-sm primary"
                            onClick={() => handleStatusChange(e.id, 'published')}
                            title="Publish Event"
                          >
                            Publish
                          </button>
                        )}
                        {e.status === 'published' && (
                          <button
                            className="action-btn-sm"
                            onClick={() => handleStatusChange(e.id, 'archived')}
                            title="Archive Event"
                          >
                            <Archive size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && eventDetails && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(750px, calc(100% - 32px))' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{eventDetails.event?.name}</h3>
                <small style={{ color: 'var(--muted)' }}>
                  {eventDetails.event?.category_name} • {eventDetails.event?.city}, {eventDetails.event?.state}
                </small>
              </div>
              <button className="toolbar-button" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <p>{eventDetails.event?.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '16px 0' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Expected Audience</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {Number(eventDetails.event?.expected_audience).toLocaleString()}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Estimated Reach</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {Number(eventDetails.event?.estimated_reach).toLocaleString()}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Total Budget</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    ₹{Number(eventDetails.event?.budget).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Prohibited Categories */}
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.85rem' }}>Prohibited Sponsor Categories:</strong>
                <div style={{ marginTop: '6px' }}>
                  {(eventDetails.event?.prohibited_sponsor_categories || []).length > 0 ? (
                    eventDetails.event.prohibited_sponsor_categories.map((c, i) => (
                      <span key={i} className="tag-chip tag-chip-danger">{c}</span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No prohibited categories specified.</span>
                  )}
                </div>
              </div>

              {/* Available Sponsorship Inventory */}
              <h4>Available Sponsorship Inventory ({eventDetails.inventory?.length || 0})</h4>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                {(eventDetails.inventory || []).map((inv) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div>
                      <strong>{inv.name}</strong> ({inv.item_type})
                      {inv.is_exclusive === 1 && (
                        <span className="badge badge-warning" style={{ marginLeft: '6px' }}>Exclusive Slot</span>
                      )}
                    </div>
                    <div>
                      <span>₹{Number(inv.base_price).toLocaleString()}</span> • 
                      <span style={{ color: inv.available_quantity > 0 ? '#10b981' : '#ef4444', fontWeight: 600, marginLeft: '6px' }}>
                        {inv.available_quantity}/{inv.total_quantity} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="primary-button" onClick={() => setSelectedEvent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
