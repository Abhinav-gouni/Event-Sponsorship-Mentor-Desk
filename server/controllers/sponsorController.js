import pool from '../config/database.js';

export async function listSponsors(req, res, next) {
  try {
    const { industry, city, minBudget, maxBudget, search } = req.query;
    let query = `
      SELECT s.*, p.preferred_categories, p.target_cities, p.min_budget, p.max_budget, p.desired_benefits, p.excluded_categories,
        (SELECT COUNT(*) FROM agreements a WHERE a.sponsor_id = s.id AND a.status = 'mutually_approved') as completed_sponsorships_count
      FROM sponsor_profiles s
      LEFT JOIN sponsor_preferences p ON s.id = p.sponsor_id
      WHERE 1=1
    `;
    const params = [];

    if (industry) {
      query += ' AND s.industry LIKE ?';
      params.push(`%${industry}%`);
    }
    if (city) {
      query += ' AND (s.location LIKE ? OR JSON_CONTAINS(p.target_cities, ?))';
      params.push(`%${city}%`, JSON.stringify(city));
    }
    if (minBudget) {
      query += ' AND p.max_budget >= ?';
      params.push(Number(minBudget));
    }
    if (maxBudget) {
      query += ' AND p.min_budget <= ?';
      params.push(Number(maxBudget));
    }
    if (search) {
      query += ' AND (s.company_name LIKE ? OR s.industry LIKE ? OR s.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY s.company_name ASC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      ...r,
      preferred_categories: typeof r.preferred_categories === 'string' ? JSON.parse(r.preferred_categories || '[]') : r.preferred_categories || [],
      target_cities: typeof r.target_cities === 'string' ? JSON.parse(r.target_cities || '[]') : r.target_cities || [],
      desired_benefits: typeof r.desired_benefits === 'string' ? JSON.parse(r.desired_benefits || '[]') : r.desired_benefits || [],
      excluded_categories: typeof r.excluded_categories === 'string' ? JSON.parse(r.excluded_categories || '[]') : r.excluded_categories || []
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
}

export async function getSponsorById(req, res, next) {
  try {
    const sponsorId = req.params.id;

    const [rows] = await pool.query(
      `SELECT s.*, p.preferred_categories, p.target_cities, p.target_states, p.min_budget, p.max_budget,
              p.audience_preferences, p.desired_benefits, p.preferred_min_reach, p.marketing_goals,
              p.excluded_categories, p.brand_safety_restrictions
       FROM sponsor_profiles s
       LEFT JOIN sponsor_preferences p ON s.id = p.sponsor_id
       WHERE s.id = ?`,
      [sponsorId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }

    const sponsor = rows[0];
    sponsor.preferred_categories = typeof sponsor.preferred_categories === 'string' ? JSON.parse(sponsor.preferred_categories || '[]') : sponsor.preferred_categories || [];
    sponsor.target_cities = typeof sponsor.target_cities === 'string' ? JSON.parse(sponsor.target_cities || '[]') : sponsor.target_cities || [];
    sponsor.desired_benefits = typeof sponsor.desired_benefits === 'string' ? JSON.parse(sponsor.desired_benefits || '[]') : sponsor.desired_benefits || [];
    sponsor.excluded_categories = typeof sponsor.excluded_categories === 'string' ? JSON.parse(sponsor.excluded_categories || '[]') : sponsor.excluded_categories || [];

    // Fetch past sponsorship agreements for track record
    const [history] = await pool.query(
      `SELECT a.id, a.agreement_number, a.agreed_price, a.status, a.created_at, e.name as event_name, e.category_name, e.city
       FROM agreements a
       JOIN events e ON a.event_id = e.id
       WHERE a.sponsor_id = ? AND a.status IN ('mutually_approved', 'completed')
       ORDER BY a.created_at DESC`,
      [sponsorId]
    );

    res.json({
      success: true,
      data: {
        sponsor,
        sponsorshipHistory: history
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyPreferences(req, res, next) {
  try {
    const sponsorId = req.user.sponsorId;
    if (!sponsorId) {
      return res.status(403).json({ success: false, message: 'Sponsor profile required.' });
    }

    const [prefs] = await pool.query('SELECT * FROM sponsor_preferences WHERE sponsor_id = ?', [sponsorId]);

    if (prefs.length === 0) {
      return res.json({
        success: true,
        data: {
          preferred_categories: [],
          target_cities: [],
          min_budget: 0,
          max_budget: 0,
          desired_benefits: [],
          excluded_categories: []
        }
      });
    }

    const p = prefs[0];
    res.json({
      success: true,
      data: {
        ...p,
        preferred_categories: typeof p.preferred_categories === 'string' ? JSON.parse(p.preferred_categories || '[]') : p.preferred_categories || [],
        target_cities: typeof p.target_cities === 'string' ? JSON.parse(p.target_cities || '[]') : p.target_cities || [],
        desired_benefits: typeof p.desired_benefits === 'string' ? JSON.parse(p.desired_benefits || '[]') : p.desired_benefits || [],
        excluded_categories: typeof p.excluded_categories === 'string' ? JSON.parse(p.excluded_categories || '[]') : p.excluded_categories || []
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const sponsorId = req.user.sponsorId;
    if (!sponsorId) {
      return res.status(403).json({ success: false, message: 'Sponsor profile required.' });
    }

    const {
      preferred_categories, target_cities, target_states,
      min_budget, max_budget, audience_preferences,
      desired_benefits, preferred_min_reach, marketing_goals,
      excluded_categories, brand_safety_restrictions
    } = req.body;

    const prefCatsJson = Array.isArray(preferred_categories) ? JSON.stringify(preferred_categories) : preferred_categories;
    const targetCitiesJson = Array.isArray(target_cities) ? JSON.stringify(target_cities) : target_cities;
    const targetStatesJson = Array.isArray(target_states) ? JSON.stringify(target_states) : target_states;
    const desiredBenefitsJson = Array.isArray(desired_benefits) ? JSON.stringify(desired_benefits) : desired_benefits;
    const excludedCatsJson = Array.isArray(excluded_categories) ? JSON.stringify(excluded_categories) : excluded_categories;

    await pool.query(
      `INSERT INTO sponsor_preferences (
        sponsor_id, preferred_categories, target_cities, target_states,
        min_budget, max_budget, audience_preferences, desired_benefits,
        preferred_min_reach, marketing_goals, excluded_categories, brand_safety_restrictions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        preferred_categories = VALUES(preferred_categories),
        target_cities = VALUES(target_cities),
        target_states = VALUES(target_states),
        min_budget = VALUES(min_budget),
        max_budget = VALUES(max_budget),
        audience_preferences = VALUES(audience_preferences),
        desired_benefits = VALUES(desired_benefits),
        preferred_min_reach = VALUES(preferred_min_reach),
        marketing_goals = VALUES(marketing_goals),
        excluded_categories = VALUES(excluded_categories),
        brand_safety_restrictions = VALUES(brand_safety_restrictions)`,
      [
        sponsorId, prefCatsJson, targetCitiesJson, targetStatesJson,
        Number(min_budget) || 0, Number(max_budget) || 0, audience_preferences || null,
        desiredBenefitsJson, Number(preferred_min_reach) || 0, marketing_goals || null,
        excludedCatsJson, brand_safety_restrictions || null
      ]
    );

    res.json({ success: true, message: 'Sponsorship preferences updated successfully' });
  } catch (error) {
    next(error);
  }
}

// --------------------------------------------------------------------
// Organizer Shortlist & Outreach Tracker
// --------------------------------------------------------------------
export async function getShortlist(req, res, next) {
  try {
    const organizerId = req.user.organizerId;
    if (!organizerId) {
      return res.status(403).json({ success: false, message: 'Organizer profile required.' });
    }

    const [rows] = await pool.query(
      `SELECT sl.*, s.company_name, s.industry, s.contact_name, s.contact_email, s.contact_phone, s.location,
              e.name as event_name
       FROM sponsor_shortlists sl
       JOIN sponsor_profiles s ON sl.sponsor_id = s.id
       LEFT JOIN events e ON sl.event_id = e.id
       WHERE sl.organizer_id = ?
       ORDER BY sl.created_at DESC`,
      [organizerId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function toggleShortlist(req, res, next) {
  try {
    const organizerId = req.user.organizerId;
    const { sponsor_id, event_id, notes, outreach_status = 'not_contacted', follow_up_date } = req.body;

    if (!sponsor_id) {
      return res.status(400).json({ success: false, message: 'sponsor_id is required' });
    }

    // Check if already shortlisted
    const [existing] = await pool.query(
      'SELECT id FROM sponsor_shortlists WHERE organizer_id = ? AND sponsor_id = ? AND (event_id = ? OR (event_id IS NULL AND ? IS NULL))',
      [organizerId, sponsor_id, event_id || null, event_id || null]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM sponsor_shortlists WHERE id = ?', [existing[0].id]);
      return res.json({ success: true, shortlisted: false, message: 'Removed from shortlist' });
    }

    await pool.query(
      `INSERT INTO sponsor_shortlists (organizer_id, sponsor_id, event_id, outreach_status, follow_up_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizerId, sponsor_id, event_id || null, outreach_status, follow_up_date || null, notes || null]
    );

    res.json({ success: true, shortlisted: true, message: 'Added to shortlist' });
  } catch (error) {
    next(error);
  }
}

export async function updateOutreachStatus(req, res, next) {
  try {
    const shortlistId = req.params.id;
    const organizerId = req.user.organizerId;
    const { outreach_status, follow_up_date, notes } = req.body;

    await pool.query(
      `UPDATE sponsor_shortlists SET
        outreach_status = COALESCE(?, outreach_status),
        follow_up_date = COALESCE(?, follow_up_date),
        notes = COALESCE(?, notes)
       WHERE id = ? AND organizer_id = ?`,
      [outreach_status, follow_up_date, notes, shortlistId, organizerId]
    );

    res.json({ success: true, message: 'Outreach status updated successfully' });
  } catch (error) {
    next(error);
  }
}
