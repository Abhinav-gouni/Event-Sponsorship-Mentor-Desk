import assert from 'node:assert/strict';
import { rankSponsorsForEvent, rankEventsForSponsor } from '../server/services/matchingEngine.js';

const event = {
  id: 10,
  name: 'AI and Cloud Developer Summit',
  category_name: 'Technology & AI',
  description: 'Conference for software developers and cloud engineers',
  city: 'Hyderabad',
  state: 'Telangana',
  budget: 100000,
  expected_audience: 1200,
  estimated_reach: 50000,
  target_demographics: 'Software engineers, developers, CTOs',
  objectives: 'Developer awareness and B2B lead generation',
  prohibited_sponsor_categories: ['Tobacco', 'Gambling'],
  available_inventory: [{ id: 2, name: 'Gold Sponsor', available_quantity: 1, base_price: 50000 }]
};

const sponsors = [
  {
    id: 1,
    company_name: 'CloudScale Technologies',
    industry: 'Cloud Software Technology',
    target_audience: 'Software engineers, developers, CTOs',
    marketing_objectives: 'B2B leads and developer awareness',
    location: 'Hyderabad, Telangana',
    preferred_categories: ['Technology & AI'],
    target_cities: ['Hyderabad'],
    target_states: ['Telangana'],
    min_budget: 50000,
    max_budget: 500000,
    audience_preferences: 'Software developers and cloud engineers',
    marketing_goals: 'Developer awareness and B2B lead generation',
    excluded_categories: ['Gambling'],
    preferred_min_reach: 10000
  },
  {
    id: 2,
    company_name: 'Example Tobacco Co',
    industry: 'Tobacco',
    min_budget: 10000,
    max_budget: 500000
  }
];

const ranked = rankSponsorsForEvent(event, sponsors);
assert.equal(ranked.length, 1, 'prohibited sponsor should be excluded');
assert.equal(ranked[0].sponsor_id, 1);
assert.ok(ranked[0].match_score >= 70, `expected strong match score, got ${ranked[0].match_score}`);
assert.ok(ranked[0].match_score <= 100);
assert.ok(ranked[0].suggested_package.includes('Gold Sponsor'));
assert.equal(ranked[0].match_method, 'deterministic_profile_scoring');

const sponsor = sponsors[0];
const eventRecommendations = rankEventsForSponsor(sponsor, {
  preferred_categories: ['Technology & AI'],
  target_cities: ['Hyderabad'],
  target_states: ['Telangana'],
  min_budget: 50000,
  max_budget: 500000,
  audience_preferences: 'software developers engineers',
  marketing_goals: 'B2B lead generation developer awareness',
  preferred_min_reach: 10000,
  excluded_categories: ['Gambling']
}, [event]);
assert.equal(eventRecommendations.length, 1);
assert.equal(eventRecommendations[0].event_id, 10);
assert.ok(eventRecommendations[0].match_score >= 70);
assert.ok(eventRecommendations[0].available_benefits.includes('Gold Sponsor'));

const excludedEvent = { ...event, name: 'National Gambling Expo', category_name: 'Gambling' };
assert.equal(rankEventsForSponsor(sponsor, { excluded_categories: ['Gambling'] }, [excludedEvent]).length, 0);

const repeat = rankSponsorsForEvent(event, sponsors);
assert.deepEqual(repeat.map(x => [x.sponsor_id, x.match_score]), ranked.map(x => [x.sponsor_id, x.match_score]), 'scores must be deterministic');

console.log('PASS: deterministic matching engine tests');
