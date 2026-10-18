/**
 * Deterministic sponsorship matching. Scores are computed from database fields;
 * Ollama is never allowed to invent scores or entity IDs.
 */
const STOP_WORDS = new Set([
  'and', 'or', 'the', 'for', 'with', 'from', 'into', 'your', 'their', 'this', 'that',
  'event', 'events', 'company', 'business', 'brand', 'marketing', 'audience', 'target',
  'people', 'users', 'based', 'need', 'needs', 'goal', 'goals', 'india', 'indian',
  'limited', 'ltd', 'private', 'pvt', 'inc', 'llp', 'of', 'in', 'to', 'a', 'an', 'on'
]);

const ALIASES = {
  technology: ['technology', 'tech', 'software', 'cloud', 'ai', 'artificial intelligence', 'developer', 'digital', 'saas', 'cybersecurity'],
  sports: ['sports', 'sport', 'fitness', 'athletics', 'athlete', 'running', 'football', 'cricket'],
  finance: ['finance', 'fintech', 'banking', 'investment', 'wealth', 'payment', 'insurance'],
  education: ['education', 'student', 'campus', 'university', 'learning', 'academic'],
  health: ['health', 'healthcare', 'wellness', 'nutrition', 'medical', 'fitness'],
  sustainability: ['sustainability', 'environment', 'green', 'climate', 'renewable', 'clean energy'],
  entertainment: ['entertainment', 'music', 'film', 'culture', 'festival', 'media']
};

export function parseList(value) {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map(v => v.trim()).filter(Boolean);
    } catch { /* plain text is handled below */ }
    return value.split(/[,;|]/).map(v => v.trim()).filter(Boolean);
  }
  return [];
}

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function normalize(value) {
  return text(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter(t => t.length > 2 && !STOP_WORDS.has(t)));
}

function overlapScore(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) if (b.has(token)) common++;
  const coverage = common / Math.min(a.size, b.size);
  return Math.min(1, coverage);
}

function categoryOverlap(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 1;
  for (const [, words] of Object.entries(ALIASES)) {
    const aHas = words.some(w => a.includes(w));
    const bHas = words.some(w => b.includes(w));
    if (aHas && bHas) return 0.85;
  }
  return overlapScore(a, b);
}

function hasConflict(event, sponsor, preferences) {
  const eventText = normalize(`${event.category_name || ''} ${event.name || ''} ${event.description || ''} ${event.objectives || ''}`);
  const sponsorText = normalize(`${sponsor.industry || ''} ${sponsor.company_name || ''} ${sponsor.description || ''} ${sponsor.brand_preferences || ''}`);
  // Event restrictions apply to the sponsor. Sponsor exclusions apply to the event.
  const eventProhibited = parseList(event.prohibited_sponsor_categories);
  const sponsorExcluded = parseList(preferences?.excluded_categories);
  const sponsorRestrictions = parseList(preferences?.brand_safety_restrictions);
  const eventConflict = eventProhibited.find(rule => {
    const r = normalize(rule);
    return r && sponsorText.includes(r);
  });
  if (eventConflict) return eventConflict;
  const sponsorConflict = [...sponsorExcluded, ...sponsorRestrictions].find(rule => {
    const r = normalize(rule);
    return r && eventText.includes(r);
  });
  return sponsorConflict || null;
}

function budgetFit(eventBudget, minBudget, maxBudget) {
  const budget = Number(eventBudget) || 0;
  const min = Number(minBudget) || 0;
  const max = Number(maxBudget) || 0;
  if (!budget || (!min && !max)) return { score: 0.5, label: 'Budget fit cannot be confirmed from the available data.' };
  const upper = max > 0 ? max : min;
  const lower = min > 0 ? min : 0;
  if (budget >= lower && budget <= upper) return { score: 1, label: `Event budget ₹${budget.toLocaleString('en-IN')} is within the sponsor's configured range.` };
  const distance = budget < lower ? (lower - budget) / Math.max(lower, 1) : (budget - upper) / Math.max(upper, 1);
  if (distance <= 0.2) return { score: 0.65, label: 'Event budget is close to the sponsor budget range; confirm budget flexibility.' };
  return { score: 0.15, label: 'Event budget is outside the sponsor budget range.' };
}

function locationFit(event, sponsor, preferences) {
  const eventCity = normalize(event.city);
  const eventState = normalize(event.state);
  const locations = [sponsor.location, sponsor.operating_regions, ...parseList(preferences?.target_cities), ...parseList(preferences?.target_states)]
    .map(normalize).filter(Boolean);
  if (!eventCity && !eventState) return 0.35;
  if (locations.some(loc => (eventCity && loc.includes(eventCity)) || (eventState && loc.includes(eventState)))) return 1;
  if (locations.some(loc => loc.includes('pan india') || loc.includes('india') || loc.includes('national'))) return 0.8;
  if (!locations.length) return 0.4;
  return 0.15;
}

function scorePair(event, sponsor, preferences = {}) {
  const categoryTargets = [sponsor.industry, ...parseList(preferences.preferred_categories)].filter(Boolean).join(' ');
  const eventCategoryText = `${event.category_name || ''} ${event.name || ''} ${event.description || ''}`;
  const category = categoryOverlap(categoryTargets, eventCategoryText);

  const sponsorAudience = `${sponsor.target_audience || ''} ${preferences.audience_preferences || ''}`;
  const eventAudience = `${event.target_demographics || ''} ${event.category_name || ''} ${event.objectives || ''}`;
  const audience = overlapScore(sponsorAudience, eventAudience);

  const location = locationFit(event, sponsor, preferences);
  const budget = budgetFit(event.budget, preferences.min_budget, preferences.max_budget);
  const sponsorGoals = `${sponsor.marketing_objectives || ''} ${preferences.marketing_goals || ''} ${parseList(preferences.desired_benefits).join(' ')}`;
  const eventGoals = `${event.objectives || ''} ${event.description || ''} ${event.category_name || ''}`;
  const goals = overlapScore(sponsorGoals, eventGoals);

  const minReach = Number(preferences.preferred_min_reach) || 0;
  const reach = minReach <= 0 || !Number(event.estimated_reach)
    ? 0.5
    : Number(event.estimated_reach) >= minReach ? 1 : Math.max(0, Number(event.estimated_reach) / minReach);

  const breakdown = {
    category: Math.round(category * 30),
    audience: Math.round(audience * 25),
    location: Math.round(location * 15),
    budget: Math.round(budget.score * 15),
    goals: Math.round(goals * 10),
    reach: Math.round(reach * 5)
  };
  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const matched = [];
  if (category >= 0.5) matched.push(`industry/category alignment (${breakdown.category}/30)`);
  if (audience >= 0.35) matched.push(`audience alignment (${breakdown.audience}/25)`);
  if (location >= 0.7) matched.push(`geographic alignment (${breakdown.location}/15)`);
  if (budget.score >= 0.65) matched.push(`budget compatibility (${breakdown.budget}/15)`);
  if (goals >= 0.35) matched.push(`marketing-goal alignment (${breakdown.goals}/10)`);
  if (minReach > 0 && Number(event.estimated_reach) >= minReach) matched.push('estimated reach meets the stated minimum');

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    budgetLabel: budget.label,
    matched,
    conflict: hasConflict(event, sponsor, preferences)
  };
}

function availableBenefitNames(event) {
  const inventory = Array.isArray(event.available_inventory) ? event.available_inventory : [];
  return inventory
    .filter(item => Number(item.available_quantity) > 0)
    .map(item => item.name || item.item_type)
    .filter(Boolean);
}

export function rankSponsorsForEvent(event, sponsors) {
  const ranked = [];
  for (const sponsor of sponsors || []) {
    const preferences = {
      preferred_categories: sponsor.preferred_categories,
      target_cities: sponsor.target_cities,
      target_states: sponsor.target_states,
      min_budget: sponsor.min_budget,
      max_budget: sponsor.max_budget,
      audience_preferences: sponsor.audience_preferences,
      desired_benefits: sponsor.desired_benefits,
      preferred_min_reach: sponsor.preferred_min_reach,
      marketing_goals: sponsor.marketing_goals,
      excluded_categories: sponsor.excluded_categories,
      brand_safety_restrictions: sponsor.brand_safety_restrictions
    };
    const result = scorePair(event, sponsor, preferences);
    if (result.conflict) continue;
    const available = availableBenefitNames(event);
    ranked.push({
      sponsor_id: sponsor.id,
      sponsor,
      match_score: result.score,
      score_breakdown: result.breakdown,
      explanation: result.matched.length
        ? `Match based on stored profile data: ${result.matched.join(', ')}.`
        : 'The stored profiles show limited overlap. Verify audience, budget, and objectives before outreach.',
      why_sponsor_benefits: `Potential value depends on the sponsor's stated objectives and the event's documented audience. Confirm expected deliverables before making a commitment.`,
      potential_risks: result.score < 50 ? 'Limited evidence of fit in the stored profiles; confirm goals and budget before outreach.' : 'Confirm the final benefit list, availability, and category exclusivity before sending an offer.',
      suggested_package: available[0] || 'No available inventory benefit is recorded for this event.',
      recommended_next_action: result.score >= 70 ? 'Review the match evidence, then send a personalized proposal.' : 'Verify the fit with the sponsor before investing time in outreach.',
      is_ai_generated: false,
      match_method: 'deterministic_profile_scoring'
    });
  }
  return ranked.sort((a, b) => b.match_score - a.match_score || String(a.sponsor?.company_name || '').localeCompare(String(b.sponsor?.company_name || '')));
}

export function rankEventsForSponsor(sponsor, preferences, events) {
  const ranked = [];
  for (const event of events || []) {
    const result = scorePair(event, sponsor, preferences || {});
    if (result.conflict) continue;
    const available = availableBenefitNames(event);
    ranked.push({
      event_id: event.id,
      event,
      match_score: result.score,
      score_breakdown: result.breakdown,
      explanation: result.matched.length
        ? `Match based on your saved preferences and this event's stored details: ${result.matched.join(', ')}.`
        : 'Your saved preferences show limited overlap with the event details currently available.',
      audience_alignment: result.breakdown.audience > 0
        ? `Audience alignment score: ${result.breakdown.audience}/25, based on stored audience and event-description text.`
        : 'Audience alignment could not be established from the saved profile data.',
      budget_compatibility: result.budgetLabel,
      available_benefits: available.length ? available.join(', ') : 'No available inventory benefits are recorded for this event.',
      potential_risks: result.score < 50 ? 'Limited profile overlap; verify audience, budget, and objectives before submitting a proposal.' : 'Confirm inventory availability, category restrictions, and final terms before submitting a proposal.',
      is_ai_generated: false,
      match_method: 'deterministic_profile_scoring'
    });
  }
  return ranked.sort((a, b) => b.match_score - a.match_score || String(a.event?.name || '').localeCompare(String(b.event?.name || '')));
}
