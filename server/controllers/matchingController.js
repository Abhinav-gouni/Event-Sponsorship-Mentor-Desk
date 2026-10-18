import pool from '../config/database.js';
import { matchEventToSponsors, matchSponsorToEvents } from '../services/ollamaService.js';
import { validateBrandSafety } from '../services/exclusivityService.js';

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function findSponsorsForEvent(req, res, next) {
  try {
    const eventId = Number(req.body?.event_id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid event_id is required.' });
    }
    if (req.user.role !== 'organizer' || !req.user.organizerId) {
      return res.status(403).json({ success: false, message: 'Only organizers can find sponsors for their events.' });
    }

    const [events] = await pool.query(
      'SELECT * FROM events WHERE id = ? AND organizer_id = ?',
      [eventId, req.user.organizerId]
    );
    if (!events.length) {
      return res.status(404).json({ success: false, message: 'Event not found or you do not have access to it.' });
    }

    const [sponsors] = await pool.query(
      `SELECT s.*, p.preferred_categories, p.target_cities, p.target_states,
              p.min_budget, p.max_budget, p.audience_preferences, p.desired_benefits,
              p.preferred_min_reach, p.excluded_categories, p.marketing_goals,
              p.brand_safety_restrictions
       FROM sponsor_profiles s
       LEFT JOIN sponsor_preferences p ON s.id = p.sponsor_id
       ORDER BY s.company_name ASC`
    );
    const [inventory] = await pool.query(
      `SELECT id, event_id, item_type, name, available_quantity, base_price, is_exclusive
       FROM sponsorship_inventory WHERE event_id = ? AND available_quantity > 0
       ORDER BY is_exclusive DESC, base_price DESC`,
      [eventId]
    );

    const event = {
      ...events[0],
      prohibited_sponsor_categories: parseJsonArray(events[0].prohibited_sponsor_categories)
    };
    const recommendations = await matchEventToSponsors(event, sponsors, inventory);

    return res.json({
      success: true,
      data: {
        event,
        totalEvaluated: sponsors.length,
        eligibleMatches: recommendations.length,
        recommendations,
        scoringNote: 'Scores are calculated from stored profile data. Ollama may explain matches but cannot alter scores or create entities.'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function findEventsForSponsor(req, res, next) {
  try {
    if (req.user.role !== 'sponsor' || !req.user.sponsorId) {
      return res.status(403).json({ success: false, message: 'Only sponsors can receive recommendations for their own profile.' });
    }
    const sponsorId = Number(req.user.sponsorId);
    const [sponsors] = await pool.query('SELECT * FROM sponsor_profiles WHERE id = ? AND user_id = ?', [sponsorId, req.user.id]);
    if (!sponsors.length) {
      return res.status(404).json({ success: false, message: 'Your sponsor profile was not found.' });
    }

    const [preferencesRows] = await pool.query('SELECT * FROM sponsor_preferences WHERE sponsor_id = ?', [sponsorId]);
    const pref = preferencesRows[0] || {};
    for (const key of ['preferred_categories', 'target_cities', 'target_states', 'desired_benefits', 'excluded_categories']) {
      pref[key] = parseJsonArray(pref[key]);
    }

    const [events] = await pool.query(
      `SELECT e.* FROM events e
       WHERE e.status = 'published' AND e.start_date >= CURDATE()
       ORDER BY e.start_date ASC`
    );

    if (events.length) {
      const ids = events.map(event => event.id);
      const placeholders = ids.map(() => '?').join(',');
      const [inventory] = await pool.query(
        `SELECT id, event_id, item_type, name, available_quantity, base_price, is_exclusive
         FROM sponsorship_inventory WHERE event_id IN (${placeholders}) AND available_quantity > 0`,
        ids
      );
      const byEvent = new Map();
      for (const item of inventory) {
        if (!byEvent.has(item.event_id)) byEvent.set(item.event_id, []);
        byEvent.get(item.event_id).push(item);
      }
      for (const event of events) {
        event.prohibited_sponsor_categories = parseJsonArray(event.prohibited_sponsor_categories);
        event.available_inventory = byEvent.get(event.id) || [];
      }
    }

    const recommendations = await matchSponsorToEvents(sponsors[0], pref, events);
    return res.json({
      success: true,
      data: {
        sponsor: sponsors[0],
        totalEventsEvaluated: events.length,
        eligibleMatches: recommendations.length,
        recommendations,
        scoringNote: 'Scores are calculated from saved preferences and event records. Ollama cannot alter scores or invent events.'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function checkProhibitedCategories(req, res, next) {
  try {
    const eventId = Number(req.body?.event_id);
    const sponsorId = Number(req.body?.sponsor_id);
    if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(sponsorId) || sponsorId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid event_id and sponsor_id are required.' });
    }

    if (req.user.role === 'organizer') {
      const [owned] = await pool.query('SELECT id FROM events WHERE id = ? AND organizer_id = ?', [eventId, req.user.organizerId]);
      if (!owned.length) return res.status(403).json({ success: false, message: 'You can only check restrictions for your own events.' });
    } else if (req.user.role === 'sponsor') {
      if (sponsorId !== Number(req.user.sponsorId)) {
        return res.status(403).json({ success: false, message: 'You can only check restrictions for your own sponsor profile.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to check sponsorship restrictions.' });
    }

    const check = await validateBrandSafety(eventId, sponsorId);
    return res.json({ success: true, ...check });
  } catch (error) {
    next(error);
  }
}
