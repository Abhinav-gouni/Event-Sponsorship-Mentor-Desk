import React from 'react';
import {
  ShieldCheck,
  Droplets,
  Bus,
  Utensils,
  Stethoscope,
  Truck,
  Settings,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const COMMITTEE_ICONS = {
  'Security': ShieldCheck,
  'Water': Droplets,
  'Transport': Bus,
  'Food': Utensils,
  'Medical': Stethoscope,
  'Logistics': Truck,
  'Event Operations': Settings,
  'Other': HelpCircle
};

export default function CommitteeContactCard({ contact, onVerify, onDeactivate, isManager = false }) {
  const IconComponent = COMMITTEE_ICONS[contact.committee_type] || HelpCircle;

  return (
    <div style={{
      background: 'var(--card-bg, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--primary-subtle, #eff6ff)',
            color: 'var(--primary, #2563eb)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconComponent size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{contact.committee_type} Committee</h4>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>{contact.contact_person}</span>
          </div>
        </div>

        <div>
          {contact.is_verified ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#dcfce7',
              color: '#166534'
            }}>
              <CheckCircle2 size={13} /> Verified
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#fef3c7',
              color: '#92400e'
            }}>
              <AlertCircle size={13} /> Pending Verification
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '8px',
        fontSize: '0.85rem',
        background: '#f8fafc',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
          <Phone size={14} style={{ color: '#64748b' }} />
          <a href={`tel:${contact.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contact.phone}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
          <Mail size={14} style={{ color: '#64748b' }} />
          <a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contact.email}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
          <Clock size={14} style={{ color: '#64748b' }} />
          <span>{contact.working_hours || '9:00 AM - 6:00 PM'}</span>
        </div>
      </div>

      {contact.notes && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>
          "{contact.notes}"
        </p>
      )}

      {isManager && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          {!contact.is_verified && onVerify && (
            <button
              onClick={() => onVerify(contact.id)}
              className="secondary-button"
              style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
            >
              Verify Contact
            </button>
          )}
          {contact.is_active && onDeactivate && (
            <button
              onClick={() => onDeactivate(contact.id)}
              className="secondary-button"
              style={{ fontSize: '0.8rem', padding: '4px 10px', color: '#dc2626' }}
            >
              Deactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
