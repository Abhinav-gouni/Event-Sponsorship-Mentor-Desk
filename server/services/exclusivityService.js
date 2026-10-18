import pool from '../config/database.js';

/**
 * Validates brand safety and prohibited categories between an event and a sponsor.
 * Returns { valid: true } or { valid: false, reason: string }
 */
export async function validateBrandSafety(eventId, sponsorId) {
  // 1. Fetch event prohibited categories
  const [eventRows] = await pool.query(
    'SELECT id, name, category_name, prohibited_sponsor_categories FROM events WHERE id = ?',
    [eventId]
  );
  if (eventRows.length === 0) {
    throw new Error('Event not found');
  }
  const event = eventRows[0];
  const eventProhibited = Array.isArray(event.prohibited_sponsor_categories)
    ? event.prohibited_sponsor_categories
    : (typeof event.prohibited_sponsor_categories === 'string'
        ? JSON.parse(event.prohibited_sponsor_categories || '[]')
        : []);

  // 2. Fetch sponsor profile and preferences
  const [sponsorRows] = await pool.query(
    `SELECT s.*, p.excluded_categories, p.brand_safety_restrictions
     FROM sponsor_profiles s
     LEFT JOIN sponsor_preferences p ON s.id = p.sponsor_id
     WHERE s.id = ?`,
    [sponsorId]
  );
  if (sponsorRows.length === 0) {
    throw new Error('Sponsor not found');
  }
  const sponsor = sponsorRows[0];
  const sponsorExcluded = Array.isArray(sponsor.excluded_categories)
    ? sponsor.excluded_categories
    : (typeof sponsor.excluded_categories === 'string'
        ? JSON.parse(sponsor.excluded_categories || '[]')
        : []);

  // Check 1: Does sponsor industry match any event prohibited categories?
  for (const prohibited of eventProhibited) {
    if (sponsor.industry?.toLowerCase().includes(prohibited.toLowerCase()) ||
        sponsor.company_name?.toLowerCase().includes(prohibited.toLowerCase())) {
      return {
        valid: false,
        reason: `Prohibited Category Violation: '${event.name}' strictly prohibits sponsors in the '${prohibited}' category. Sponsor '${sponsor.company_name}' operates in '${sponsor.industry}'.`
      };
    }
  }

  // Check 2: Does event category match sponsor's excluded categories?
  for (const excluded of sponsorExcluded) {
    if (event.category_name?.toLowerCase().includes(excluded.toLowerCase()) ||
        event.name?.toLowerCase().includes(excluded.toLowerCase())) {
      return {
        valid: false,
        reason: `Brand Safety Violation: Sponsor '${sponsor.company_name}' has excluded events in the '${excluded}' category.`
      };
    }
  }

  return { valid: true };
}
