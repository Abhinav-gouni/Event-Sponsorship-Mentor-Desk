import pool from '../config/database.js';

const VALID_COMMITTEE_TYPES = [
  'Water',
  'Security',
  'Transport',
  'Food',
  'Medical',
  'Logistics',
  'Event Operations',
  'Other'
];

/**
 * Check if the authenticated user has permission to manage the event's committees
 */
async function canManageEvent(user, eventId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'organizer' || !user.organizerId) return false;

  const [rows] = await pool.query(
    'SELECT id FROM events WHERE id = ? AND organizer_id = ?',
    [eventId, user.organizerId]
  );
  return rows.length > 0;
}

/**
 * List committee contacts for an event.
 * Sponsors see only verified & active contacts.
 * Organizers/Admins see all contacts.
 */
export async function getEventCommittees(req, res, next) {
  try {
    const { eventId } = req.params;
    const user = req.user;

    const [events] = await pool.query('SELECT id, name, organizer_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const isManager = user.role === 'admin' || (user.role === 'organizer' && user.organizerId === events[0].organizer_id);

    let query;
    let params;

    if (isManager) {
      query = `
        SELECT c.*, u.name as verified_by_name
        FROM event_committee_contacts c
        LEFT JOIN users u ON c.verified_by_user_id = u.id
        WHERE c.event_id = ?
        ORDER BY c.committee_type ASC
      `;
      params = [eventId];
    } else {
      // Sponsor view: only verified and active contacts
      query = `
        SELECT id, event_id, committee_type, contact_person, email, phone, working_hours, notes, is_verified, is_active
        FROM event_committee_contacts
        WHERE event_id = ? AND is_verified = 1 AND is_active = 1
        ORDER BY committee_type ASC
      `;
      params = [eventId];
    }

    const [contacts] = await pool.query(query, params);

    res.json({
      success: true,
      event: { id: events[0].id, name: events[0].name },
      isManager,
      data: contacts
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get verified contact details for a specific committee type
 */
export async function getCommitteeByType(req, res, next) {
  try {
    const { eventId, committeeType } = req.params;
    const user = req.user;

    const [events] = await pool.query('SELECT id, name, organizer_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const isManager = user.role === 'admin' || (user.role === 'organizer' && user.organizerId === events[0].organizer_id);

    let query = 'SELECT * FROM event_committee_contacts WHERE event_id = ? AND committee_type = ?';
    const params = [eventId, committeeType];

    if (!isManager) {
      query += ' AND is_verified = 1 AND is_active = 1';
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        is_verified: false,
        message: `Contact information for the ${committeeType} committee is currently unavailable or unverified. Please contact the event organizer directly.`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new committee contact (Organizers/Admins only)
 */
export async function createCommitteeContact(req, res, next) {
  try {
    const { eventId } = req.params;
    const {
      committee_type,
      contact_person,
      email,
      phone,
      working_hours = '9:00 AM - 6:00 PM',
      notes = '',
      is_verified = 0
    } = req.body;

    const hasPermission = await canManageEvent(req.user, eventId);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'You are not authorized to manage committee contacts for this event.' });
    }

    if (!VALID_COMMITTEE_TYPES.includes(committee_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid committee type. Allowed types: ${VALID_COMMITTEE_TYPES.join(', ')}`
      });
    }

    if (!contact_person || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'contact_person, email, and phone are required fields.'
      });
    }

    const verifiedBy = is_verified ? req.user.id : null;

    const [result] = await pool.query(
      `INSERT INTO event_committee_contacts 
       (event_id, committee_type, contact_person, email, phone, working_hours, notes, is_verified, is_active, verified_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [eventId, committee_type, contact_person, email, phone, working_hours, notes, is_verified ? 1 : 0, verifiedBy]
    );

    const [created] = await pool.query('SELECT * FROM event_committee_contacts WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Committee contact created successfully.',
      data: created[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a committee contact (Organizers/Admins only)
 */
export async function updateCommitteeContact(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM event_committee_contacts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Committee contact not found.' });
    }

    const contact = existing[0];
    const hasPermission = await canManageEvent(req.user, contact.event_id);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this committee contact.' });
    }

    const {
      committee_type = contact.committee_type,
      contact_person = contact.contact_person,
      email = contact.email,
      phone = contact.phone,
      working_hours = contact.working_hours,
      notes = contact.notes,
      is_verified = contact.is_verified,
      is_active = contact.is_active
    } = req.body;

    const verifiedBy = is_verified ? (contact.verified_by_user_id || req.user.id) : null;

    await pool.query(
      `UPDATE event_committee_contacts 
       SET committee_type = ?, contact_person = ?, email = ?, phone = ?, working_hours = ?, notes = ?, is_verified = ?, is_active = ?, verified_by_user_id = ?
       WHERE id = ?`,
      [committee_type, contact_person, email, phone, working_hours, notes, is_verified ? 1 : 0, is_active ? 1 : 0, verifiedBy, id]
    );

    const [updated] = await pool.query('SELECT * FROM event_committee_contacts WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Committee contact updated successfully.',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify a committee contact (Organizers/Admins only)
 */
export async function verifyCommitteeContact(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM event_committee_contacts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Committee contact not found.' });
    }

    const contact = existing[0];
    const hasPermission = await canManageEvent(req.user, contact.event_id);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'You are not authorized to verify this committee contact.' });
    }

    await pool.query(
      'UPDATE event_committee_contacts SET is_verified = 1, verified_by_user_id = ? WHERE id = ?',
      [req.user.id, id]
    );

    const [updated] = await pool.query('SELECT * FROM event_committee_contacts WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Committee contact verified successfully.',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deactivate a committee contact (Organizers/Admins only)
 */
export async function deactivateCommitteeContact(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM event_committee_contacts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Committee contact not found.' });
    }

    const contact = existing[0];
    const hasPermission = await canManageEvent(req.user, contact.event_id);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'You are not authorized to deactivate this committee contact.' });
    }

    await pool.query('UPDATE event_committee_contacts SET is_active = 0 WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Committee contact deactivated successfully.'
    });
  } catch (error) {
    next(error);
  }
}
