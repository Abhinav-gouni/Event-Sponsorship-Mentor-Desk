import pool from '../config/database.js';

export async function listEvents(req, res, next) {
  try {
    const { category, city, search, minBudget, maxBudget, status = 'published', page = 1, limit = 20 } = req.query;
    let query = `
      SELECT e.*, o.organization_name, o.contact_email,
        (SELECT COUNT(*) FROM sponsorship_inventory i WHERE i.event_id = e.id) as total_inventory_slots,
        (SELECT COUNT(*) FROM sponsorship_inventory i WHERE i.event_id = e.id AND i.available_quantity > 0) as available_inventory_slots,
        (SELECT COUNT(*) FROM packages p WHERE p.event_id = e.id AND p.is_active = 1) as packages_count
      FROM events e
      JOIN organizer_profiles o ON e.organizer_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND e.category_name = ?';
      params.push(category);
    }
    if (city) {
      query += ' AND e.city = ?';
      params.push(city);
    }
    if (minBudget) {
      query += ' AND e.budget >= ?';
      params.push(Number(minBudget));
    }
    if (maxBudget) {
      query += ' AND e.budget <= ?';
      params.push(Number(maxBudget));
    }
    if (search) {
      query += ' AND (e.name LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY e.start_date ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [events] = await pool.query(query, params);

    // Format prohibited categories if JSON string
    const formatted = events.map(e => ({
      ...e,
      prohibited_sponsor_categories: typeof e.prohibited_sponsor_categories === 'string'
        ? JSON.parse(e.prohibited_sponsor_categories || '[]')
        : e.prohibited_sponsor_categories || []
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
}

export async function getMyEvents(req, res, next) {
  try {
    const organizerId = req.user.organizerId;
    if (!organizerId) {
      return res.status(403).json({ success: false, message: 'Organizer profile required.' });
    }

    const [events] = await pool.query(
      `SELECT e.*,
        (SELECT COUNT(*) FROM proposals p WHERE p.event_id = e.id) as proposals_count,
        (SELECT COUNT(*) FROM proposals p WHERE p.event_id = e.id AND p.status = 'submitted') as pending_proposals_count,
        (SELECT COUNT(*) FROM agreements a WHERE a.event_id = e.id AND a.status = 'mutually_approved') as confirmed_deals_count,
        (SELECT COALESCE(SUM(a.agreed_price), 0) FROM agreements a WHERE a.event_id = e.id AND a.status = 'mutually_approved') as confirmed_revenue,
        (SELECT COALESCE(SUM(p.proposed_price), 0) FROM proposals p WHERE p.event_id = e.id AND p.status IN ('submitted', 'under_review', 'counteroffer_organizer', 'counteroffer_sponsor')) as pipeline_proposed_value
       FROM events e
       WHERE e.organizer_id = ?
       ORDER BY e.created_at DESC`,
      [organizerId]
    );

    const formatted = events.map(e => ({
      ...e,
      prohibited_sponsor_categories: typeof e.prohibited_sponsor_categories === 'string'
        ? JSON.parse(e.prohibited_sponsor_categories || '[]')
        : e.prohibited_sponsor_categories || []
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
}

export async function getEventById(req, res, next) {
  try {
    const eventId = req.params.id;

    const [events] = await pool.query(
      `SELECT e.*, o.organization_name, o.contact_email, o.contact_phone, o.website as organizer_website, u.name as organizer_name
       FROM events e
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE e.id = ?`,
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = events[0];
    event.prohibited_sponsor_categories = typeof event.prohibited_sponsor_categories === 'string'
      ? JSON.parse(event.prohibited_sponsor_categories || '[]')
      : event.prohibited_sponsor_categories || [];

    // Load inventory items
    const [inventory] = await pool.query(
      'SELECT * FROM sponsorship_inventory WHERE event_id = ? ORDER BY is_exclusive DESC, base_price DESC',
      [eventId]
    );

    // Load active packages
    const [packages] = await pool.query(
      `SELECT p.*,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT('inventory_id', pb.inventory_id, 'name', i.name, 'quantity', pb.quantity, 'allocated_price', pb.allocated_price, 'allocated_cost', pb.allocated_cost)
        ) FROM package_benefits pb JOIN sponsorship_inventory i ON pb.inventory_id = i.id WHERE pb.package_id = p.id) as benefits
       FROM packages p
       WHERE p.event_id = ? AND p.is_active = 1`,
      [eventId]
    );

    // Proposals count for organizers
    const [proposals] = await pool.query(
      'SELECT id, status, proposed_price FROM proposals WHERE event_id = ?',
      [eventId]
    );

    res.json({
      success: true,
      data: {
        event,
        inventory,
        packages,
        proposalsSummary: {
          total: proposals.length,
          pending: proposals.filter(p => p.status === 'submitted' || p.status === 'under_review').length,
          accepted: proposals.filter(p => p.status === 'accepted').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const organizerId = req.user.organizerId;
    if (!organizerId) {
      return res.status(403).json({ success: false, message: 'Organizer profile required.' });
    }

    const {
      name, description, category_name, category_id,
      location, venue, city, state,
      start_date, end_date, application_deadline,
      expected_audience, estimated_reach, target_demographics,
      objectives, budget, prohibited_sponsor_categories, status = 'draft'
    } = req.body;

    // Required fields check
    if (!name || !category_name || !city || !state || !start_date || !end_date || !application_deadline) {
      return res.status(400).json({ success: false, message: 'Please provide all mandatory event fields.' });
    }

    // Date validations
    const start = new Date(start_date);
    const end = new Date(end_date);
    const deadline = new Date(application_deadline);

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
    }
    if (deadline > start) {
      return res.status(400).json({ success: false, message: 'Application deadline must be on or before start date.' });
    }

    const prohibitedJson = Array.isArray(prohibited_sponsor_categories)
      ? JSON.stringify(prohibited_sponsor_categories)
      : (prohibited_sponsor_categories || '[]');

    const [result] = await pool.query(
      `INSERT INTO events (
        organizer_id, category_id, category_name, name, description,
        location, venue, city, state, start_date, end_date, application_deadline,
        expected_audience, estimated_reach, target_demographics, objectives,
        budget, prohibited_sponsor_categories, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizerId, category_id || null, category_name, name, description || null,
        location || venue || '', venue || '', city, state, start_date, end_date, application_deadline,
        Number(expected_audience) || 0, Number(estimated_reach) || 0, target_demographics || null,
        objectives || null, Number(budget) || 0, prohibitedJson, status
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { id: result.insertId, name, status }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const eventId = req.params.id;
    const organizerId = req.user.organizerId;

    // Check ownership
    const [events] = await pool.query('SELECT organizer_id, status FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && events[0].organizer_id !== organizerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this event.' });
    }

    const {
      name, description, category_name, location, venue, city, state,
      start_date, end_date, application_deadline, expected_audience,
      estimated_reach, target_demographics, objectives, budget,
      prohibited_sponsor_categories, status
    } = req.body;

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
    }

    const prohibitedJson = prohibited_sponsor_categories !== undefined
      ? (Array.isArray(prohibited_sponsor_categories) ? JSON.stringify(prohibited_sponsor_categories) : prohibited_sponsor_categories)
      : null;

    await pool.query(
      `UPDATE events SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category_name = COALESCE(?, category_name),
        location = COALESCE(?, location),
        venue = COALESCE(?, venue),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        application_deadline = COALESCE(?, application_deadline),
        expected_audience = COALESCE(?, expected_audience),
        estimated_reach = COALESCE(?, estimated_reach),
        target_demographics = COALESCE(?, target_demographics),
        objectives = COALESCE(?, objectives),
        budget = COALESCE(?, budget),
        prohibited_sponsor_categories = COALESCE(?, prohibited_sponsor_categories),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name, description, category_name, location, venue, city, state,
        start_date, end_date, application_deadline, expected_audience,
        estimated_reach, target_demographics, objectives, budget,
        prohibitedJson, status, eventId
      ]
    );

    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function setEventStatus(req, res, next) {
  try {
    const eventId = req.params.id;
    const { status } = req.body;
    const organizerId = req.user.organizerId;

    if (!['draft', 'published', 'archived', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid event status' });
    }

    const [events] = await pool.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (req.user.role !== 'admin' && events[0].organizer_id !== organizerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.query('UPDATE events SET status = ? WHERE id = ?', [status, eventId]);
    res.json({ success: true, message: `Event status set to ${status}` });
  } catch (error) {
    next(error);
  }
}
