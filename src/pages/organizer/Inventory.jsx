import { useEffect, useState } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Trash2, Tag, ShieldAlert, CheckCircle, Package } from 'lucide-react';

const ITEM_TYPES = [
  'Title',
  'Gold',
  'Silver',
  'Bronze',
  'Booth',
  'Stage Branding',
  'Logo Placement',
  'Social Media',
  'Speaking Opportunity',
  'Digital Promotion',
  'Custom'
];

export default function Inventory() {
  const { showToast } = useNotification();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    item_type: 'Booth',
    name: '',
    description: '',
    total_quantity: 1,
    base_price: 35000,
    fulfilment_cost: 10000,
    is_exclusive: false,
    category_restrictions: []
  });

  const loadEvents = async () => {
    try {
      const res = await api.get('/events/my-events');
      if (res.data?.success && res.data.data.length > 0) {
        setEvents(res.data.data);
        setSelectedEventId(String(res.data.data[0].id));
      }
    } catch (err) {
      showToast('Failed to load events', 'error');
    }
  };

  const loadInventory = async (eventId) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await api.get(`/inventory/event/${eventId}`);
      if (res.data?.success) {
        setInventory(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadInventory(selectedEventId);
    }
  }, [selectedEventId]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!formData.name) return showToast('Item name is required', 'error');

    try {
      const res = await api.post('/inventory', {
        ...formData,
        event_id: Number(selectedEventId)
      });
      if (res.data?.success) {
        showToast('Inventory slot created successfully', 'success');
        setShowAddModal(false);
        setFormData({
          item_type: 'Booth',
          name: '',
          description: '',
          total_quantity: 1,
          base_price: 35000,
          fulfilment_cost: 10000,
          is_exclusive: false,
          category_restrictions: []
        });
        loadInventory(selectedEventId);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create item', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inventory slot?')) return;
    try {
      const res = await api.delete(`/inventory/${id}`);
      if (res.data?.success) {
        showToast('Item deleted', 'success');
        loadInventory(selectedEventId);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <OrganizerLayout title="Sponsorship Inventory Management" subtitle="Manage benefit slots, pricing, exclusivity parameters, and live reservations">
      {/* Event Selector & Actions */}
      <div className="filter-bar">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <strong style={{ fontSize: '0.9rem' }}>Event:</strong>
          <select
            className="filter-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.city})
              </option>
            ))}
          </select>
        </label>

        <button
          className="primary-button"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Add Inventory Item
        </button>
      </div>

      {/* Inventory Table */}
      <div className="panel">
        <div className="panel-header">
          <h3>Sponsorship Inventory Slots ({inventory.length})</h3>
          <span>Real-time availability status</span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier / Type</th>
                <th>Item Name</th>
                <th>Exclusivity</th>
                <th>Base Price</th>
                <th>Fulfilment Cost</th>
                <th>Est. Contribution</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>Loading inventory...</td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>No inventory items configured for this event. Click 'Add Inventory Item' to create slots.</td></tr>
              ) : (
                inventory.map((inv) => {
                  const base = Number(inv.base_price) || 0;
                  const cost = Number(inv.fulfilment_cost) || 0;
                  const contribution = base - cost;
                  const margin = base > 0 ? ((contribution / base) * 100).toFixed(1) : 0;

                  return (
                    <tr key={inv.id}>
                      <td><span className="tag-chip">{inv.item_type}</span></td>
                      <td>
                        <strong>{inv.name}</strong>
                        {inv.description && (
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem' }}>
                            {inv.description}
                          </small>
                        )}
                      </td>
                      <td>
                        {inv.is_exclusive === 1 ? (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', gap: '4px' }}>
                            <ShieldAlert size={12} /> Exclusive (1 slot)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Non-exclusive</span>
                        )}
                      </td>
                      <td><strong>₹{base.toLocaleString()}</strong></td>
                      <td style={{ color: 'var(--muted)' }}>₹{cost.toLocaleString()}</td>
                      <td>
                        <strong style={{ color: '#10b981' }}>₹{contribution.toLocaleString()}</strong>
                        <small style={{ display: 'block', color: 'var(--muted)' }}>{margin}% margin</small>
                      </td>
                      <td>
                        <strong style={{ color: inv.available_quantity > 0 ? '#10b981' : '#ef4444' }}>
                          {inv.available_quantity} / {inv.total_quantity}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${
                          inv.reservation_status === 'available' ? 'badge-success' : 'badge-neutral'
                        }`}>
                          {inv.reservation_status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn-sm danger"
                          onClick={() => handleDeleteItem(inv.id)}
                          title="Delete slot"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(600px, calc(100% - 32px))' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add Sponsorship Inventory Slot</h3>
              <button className="toolbar-button" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div className="modal-body" style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Item Type
                    <select
                      className="filter-select"
                      value={formData.item_type}
                      onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Total Quantity
                    <input
                      type="number"
                      min={1}
                      className="filter-input"
                      value={formData.total_quantity}
                      onChange={(e) => setFormData({ ...formData, total_quantity: Number(e.target.value) })}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Slot Name *
                  <input
                    type="text"
                    required
                    className="filter-input"
                    placeholder="e.g. VIP Keynote Stage Branding & Arch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Benefit Deliverables Description
                  <textarea
                    rows={2}
                    className="filter-input"
                    placeholder="Specific inclusions: e.g. 3x3 booth, 5 passes, 90-sec promo video..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Base Price (₹)
                    <input
                      type="number"
                      min={0}
                      className="filter-input"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Estimated Fulfilment Cost (₹)
                    <input
                      type="number"
                      min={0}
                      className="filter-input"
                      value={formData.fulfilment_cost}
                      onChange={(e) => setFormData({ ...formData, fulfilment_cost: Number(e.target.value) })}
                    />
                  </label>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_exclusive}
                    onChange={(e) => setFormData({ ...formData, is_exclusive: e.target.checked })}
                  />
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Enforce Strict Exclusivity</strong>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Guarantees that only ONE sponsor can ever be committed to this benefit for this event.
                    </p>
                  </div>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="ghost-button" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="primary-button">Save Inventory Slot</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
