import React, { useState, useEffect } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import conversationService from '../../services/conversationService';
import eventService from '../../services/eventService';
import CommitteeContactCard from '../../components/common/CommitteeContactCard';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Filter,
  Users,
  Clock,
  X
} from 'lucide-react';

const COMMITTEE_TYPES = [
  'Water',
  'Security',
  'Transport',
  'Food',
  'Medical',
  'Logistics',
  'Event Operations',
  'Other'
];

export default function CommitteeContactManager() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    committee_type: 'Security',
    contact_person: '',
    email: '',
    phone: '',
    working_hours: '9:00 AM - 6:00 PM',
    notes: '',
    is_verified: true
  });
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadContacts(selectedEventId);
    }
  }, [selectedEventId]);

  async function loadEvents() {
    try {
      setLoading(true);
      const res = await eventService.getMyEvents();
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setEvents(list);
        if (list.length > 0) {
          setSelectedEventId(String(list[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load organizer events:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadContacts(eventId) {
    try {
      const res = await conversationService.getEventCommittees(eventId);
      if (res.success) {
        setContacts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load committee contacts:', err);
    }
  }

  async function handleCreateContact(e) {
    e.preventDefault();
    if (!newContact.contact_person || !newContact.email || !newContact.phone) {
      alert('Please fill in contact person, email, and phone number.');
      return;
    }

    try {
      const res = await conversationService.createCommitteeContact(selectedEventId, newContact);
      if (res.success) {
        setStatusMessage('Committee contact registered successfully.');
        setTimeout(() => setStatusMessage(null), 3000);
        setShowAddModal(false);
        setNewContact({
          committee_type: 'Security',
          contact_person: '',
          email: '',
          phone: '',
          working_hours: '9:00 AM - 6:00 PM',
          notes: '',
          is_verified: true
        });
        await loadContacts(selectedEventId);
      }
    } catch (err) {
      alert('Failed to register contact: ' + (err.response?.data?.message || err.message));
    }
  }

  async function handleVerify(contactId) {
    try {
      const res = await conversationService.verifyCommitteeContact(contactId);
      if (res.success) {
        setStatusMessage('Committee contact verified.');
        setTimeout(() => setStatusMessage(null), 3000);
        await loadContacts(selectedEventId);
      }
    } catch (err) {
      console.error('Failed to verify contact:', err);
    }
  }

  async function handleDeactivate(contactId) {
    if (!window.confirm('Are you sure you want to deactivate this committee contact?')) return;
    try {
      const res = await conversationService.deactivateCommitteeContact(contactId);
      if (res.success) {
        setStatusMessage('Committee contact deactivated.');
        setTimeout(() => setStatusMessage(null), 3000);
        await loadContacts(selectedEventId);
      }
    } catch (err) {
      console.error('Failed to deactivate contact:', err);
    }
  }

  const verifiedCount = contacts.filter(c => c.is_verified && c.is_active).length;
  const pendingCount = contacts.filter(c => !c.is_verified && c.is_active).length;

  return (
    <OrganizerLayout
      title="Event Committee Contacts"
      subtitle="Manage and verify Water, Security, Transport, Food, Medical, Logistics, and Operations contacts for AI Assistant grounding"
    >
      {/* Top Controls: Event Selector & Add Contact Button */}
      <div style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
            Select Event:
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              fontWeight: 500,
              minWidth: '260px'
            }}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="primary-button"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '8px 16px' }}
        >
          <Plus size={16} /> Add Committee Contact
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          background: '#dcfce7',
          color: '#166534',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>
          {statusMessage}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Committees Registered</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>{contacts.length}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.8rem', color: '#166534' }}>Verified for AI Assistant</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>{verifiedCount}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #fed7aa' }}>
          <span style={{ fontSize: '0.8rem', color: '#9a3412' }}>Pending Organizer Verification</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f97316', marginTop: '4px' }}>{pendingCount}</div>
        </div>
      </div>

      {/* Committee Cards Grid */}
      {contacts.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <ShieldCheck size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
          <h3>No Committee Contacts Registered</h3>
          <p style={{ margin: '4px 0 16px', fontSize: '0.88rem' }}>
            Add contacts for Water, Security, Transport, Food, Medical, Logistics, or Operations to empower the AI Assistant.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="primary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add First Contact
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {contacts.map((c) => (
            <CommitteeContactCard
              key={c.id}
              contact={c}
              isManager={true}
              onVerify={handleVerify}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Add Event Committee Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Committee Department *
                </label>
                <select
                  value={newContact.committee_type}
                  onChange={(e) => setNewContact({ ...newContact, committee_type: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  {COMMITTEE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Rathore"
                  value={newContact.contact_person}
                  onChange={(e) => setNewContact({ ...newContact, contact_person: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. security@techsummit.io"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98110 23456"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Working Hours / Operational Window
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8:00 AM - 10:00 PM or 24x7"
                  value={newContact.working_hours}
                  onChange={(e) => setNewContact({ ...newContact, working_hours: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Operational Notes & Responsibilities
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Handles sponsor booth badge clearance, VIP access, and overnight security."
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="verifyToggle"
                  checked={newContact.is_verified}
                  onChange={(e) => setNewContact({ ...newContact, is_verified: e.target.checked })}
                />
                <label htmlFor="verifyToggle" style={{ fontSize: '0.88rem', fontWeight: 500, color: '#1e293b' }}>
                  Verify immediately (Make accessible to sponsors via AI Assistant)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="secondary-button"
                  style={{ padding: '8px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ padding: '8px 18px' }}
                >
                  Register Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
