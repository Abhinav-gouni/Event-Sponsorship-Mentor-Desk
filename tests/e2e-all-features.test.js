import pool from '../server/config/database.js';

const BASE_URL = 'http://localhost:5000';

async function runE2E() {
  console.log('========================================================');
  console.log('C34 EVENT SPONSORSHIP MATCH DESK - END-TO-END FEATURE AUDIT');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Auth Tokens
  console.log('TEST 1: Authentication & Role Tokens');
  const orgLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@techsummit.io', password: 'password123' })
  })).json();
  assert(orgLogin.success && orgLogin.data.token, 'Organizer login successful');
  const orgToken = orgLogin.data.token;

  const sponsorLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sponsor@cloudscale.io', password: 'password123' })
  })).json();
  assert(sponsorLogin.success && sponsorLogin.data.token, 'Sponsor login successful');
  const sponsorToken = sponsorLogin.data.token;

  const adminLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@c34desk.com', password: 'admin123' })
  })).json();
  assert(adminLogin.success && adminLogin.data.token, 'Admin login successful');
  const adminToken = adminLogin.data.token;

  // 2. Event Management Flow
  console.log('\nTEST 2: Event Management Functionality');
  const myEventsRes = await (await fetch(`${BASE_URL}/api/events/my-events`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(myEventsRes.success && myEventsRes.data.length > 0, `Organizer events retrieved (${myEventsRes.data.length} events)`);

  const newEventData = {
    name: `Autonomous Systems Expo ${Date.now()}`,
    category_id: 1,
    category_name: 'Technology & AI',
    description: 'Premier robotics, automation, and AI showcase',
    location: 'Bangalore International Exhibition Centre',
    venue: 'Hall 4',
    city: 'Bangalore',
    state: 'Karnataka',
    start_date: '2026-12-10',
    end_date: '2026-12-12',
    application_deadline: '2026-11-30',
    expected_audience: 8000,
    estimated_reach: 25000,
    budget: 350000,
    target_demographics: 'Engineers, CTOs, AI Founders',
    objectives: 'Drive commercial partnerships in robotics',
    prohibited_sponsor_categories: ['Tobacco', 'Gambling']
  };
  const createEvtRes = await (await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orgToken}` },
    body: JSON.stringify(newEventData)
  })).json();
  assert(createEvtRes.success && createEvtRes.data.id, `Created new event #${createEvtRes.data?.id}`);
  const createdEventId = createEvtRes.data?.id;

  // 3. Sponsorship Inventory & What-If Pricing
  console.log('\nTEST 3: Inventory Creation & Financial Calculator');
  const invRes = await (await fetch(`${BASE_URL}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orgToken}` },
    body: JSON.stringify({
      event_id: createdEventId,
      name: 'Main Stage Keynote Slot',
      item_type: 'Speaking',
      base_price: 60000,
      total_quantity: 1,
      is_exclusive: true,
      fulfilment_cost: 15000,
      description: 'Exclusive 20-minute morning keynote address'
    })
  })).json();
  assert(invRes.success && invRes.data.id, `Created exclusive inventory item #${invRes.data?.id}`);

  // What-If Pricing verification
  const calcRes = await (await fetch(`${BASE_URL}/api/inventory/calculate-pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orgToken}` },
    body: JSON.stringify({
      basePrice: 35000,
      discount: 5000,
      additionalCost: 0,
      fulfilmentCost: 18000
    })
  })).json();
  assert(
    calcRes.success &&
    calcRes.data.revenue === 30000 &&
    calcRes.data.contribution === 12000 &&
    calcRes.data.contributionMargin === 40,
    'What-If Pricing Calculator yields exact benchmark: Revenue ₹30k, Cost ₹18k = Contribution ₹12k (40.0%)'
  );

  // 4. AI Sponsor Matching
  console.log('\nTEST 4: AI Sponsor Finder Functionality');
  const matchRes = await (await fetch(`${BASE_URL}/api/matching/event-to-sponsors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orgToken}` },
    body: JSON.stringify({ event_id: createdEventId })
  })).json();
  assert(
    matchRes.success && Array.isArray(matchRes.data.recommendations) && matchRes.data.recommendations.length > 0,
    `AI Sponsor Finder evaluated ${matchRes.data.totalEvaluated} sponsors and returned ${matchRes.data.recommendations?.length} scored recommendations`
  );

  // 5. Sponsor Event Recommendations & Preferences
  console.log('\nTEST 5: Sponsor AI Recommendations & Preferences');
  const sponsRecRes = await (await fetch(`${BASE_URL}/api/matching/sponsor-to-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sponsorToken}` },
    body: JSON.stringify({})
  })).json();
  assert(
    sponsRecRes.success && Array.isArray(sponsRecRes.data.recommendations),
    `Sponsor AI returned ${sponsRecRes.data.recommendations?.length} matched published events`
  );

  // 6. Negotiations & Counteroffers
  console.log('\nTEST 6: Proposal & Negotiation Flow');
  const proposalsRes = await (await fetch(`${BASE_URL}/api/negotiations`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(proposalsRes.success && proposalsRes.data.length > 0, `Retrieved ${proposalsRes.data.length} active proposals in negotiation desk`);

  // AI negotiation advice
  const testPropId = proposalsRes.data[0].id;
  const adviceRes = await (await fetch(`${BASE_URL}/api/negotiations/${testPropId}/ai-advice`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(adviceRes.success && adviceRes.data.strategy_summary, `AI Negotiation Advisor provided tactical counteroffer strategy for Proposal #${testPropId}`);

  // 7. Agreements & Mutual Signatures
  console.log('\nTEST 7: Agreements & Versioned Contracts');
  const agRes = await (await fetch(`${BASE_URL}/api/agreements`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(agRes.success && agRes.data.length > 0, `Retrieved ${agRes.data.length} executed/pending agreements`);

  // 8. Fulfilment & Measured Reach Auditing
  console.log('\nTEST 8: Fulfilment Deliverables & Reach Separation');
  const fulRes = await (await fetch(`${BASE_URL}/api/fulfilment/agreement/1`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(fulRes.success && fulRes.data.length > 0, `Retrieved ${fulRes.data.length} fulfilment deliverables for agreement #1`);

  // Log measured reach with audit attribution
  const delivId = fulRes.data[0].id;
  const reachAuditRes = await (await fetch(`${BASE_URL}/api/fulfilment/deliverables/${delivId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orgToken}` },
    body: JSON.stringify({
      evidence_type: 'url',
      title: 'Turnstile & Livestream Audit Feed',
      url: 'https://cdn.c34events.com/audit/event1-final.pdf',
      notes: 'Audited turnstile gate telemetry',
      measured_reach: 15420,
      reach_source: 'Onsite RFID Smart Badge Turnstiles + Livestream Metrics',
      reach_measured_at: new Date().toISOString()
    })
  })).json();
  assert(reachAuditRes.success, 'Successfully audited measured reach with mandatory source & timestamp');

  // Sponsor reviews and approves evidence
  const reviewRes = await (await fetch(`${BASE_URL}/api/fulfilment/deliverables/${delivId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sponsorToken}` },
    body: JSON.stringify({
      decision: 'approved',
      review_notes: 'Deliverable proof reviewed and approved by sponsor.'
    })
  })).json();
  assert(reviewRes.success, 'Sponsor approved deliverable evidence with audit trail');

  // 9. BI Reports & Exports
  console.log('\nTEST 9: Analytics Reports & CSV/JSON Exports');
  const pipeRes = await (await fetch(`${BASE_URL}/api/reports/pipeline`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(pipeRes.success && pipeRes.data.financials, 'Pipeline financial breakdown report generated');

  const csvRes = await fetch(`${BASE_URL}/api/reports/export/csv`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  });
  const csvText = await csvRes.text();
  assert(csvRes.status === 200 && csvText.includes('Agreement Number'), 'CSV sponsorship deals report exported successfully');

  // 10. Notifications & Deduplication
  console.log('\nTEST 10: In-App Notification Center');
  const notifRes = await (await fetch(`${BASE_URL}/api/notifications`, {
    headers: { 'Authorization': `Bearer ${orgToken}` }
  })).json();
  assert(notifRes.success && Array.isArray(notifRes.data), `Notification center loaded ${notifRes.data.length} alerts for user`);

  // 11. Admin System Health Telemetry
  console.log('\nTEST 11: Admin Infrastructure Telemetry');
  const adminHealthRes = await (await fetch(`${BASE_URL}/api/auth/admin/health`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  })).json();
  assert(
    adminHealthRes.success &&
    adminHealthRes.data.backend.status === 'operational' &&
    adminHealthRes.data.database.status === 'operational' &&
    adminHealthRes.data.ollama.available === true,
    'Admin Telemetry verifies Backend, MySQL, and Ollama are all concurrently Operational'
  );

  // 12. Interactive AI Assistant Chat
  console.log('\nTEST 12: Interactive Ollama Chat Assistant');
  const chatRes = await (await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orgToken}` },
    body: JSON.stringify({ message: 'What are 3 tips for negotiating with an AI sponsor?' })
  })).json();
  assert(chatRes.success && chatRes.data.reply, `Ollama Assistant responded: "${chatRes.data.reply.slice(0, 60)}..."`);

  console.log('\n========================================================');
  console.log(`TOTAL FEATURES AUDITED: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================================');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runE2E().catch(err => {
  console.error('Audit exception:', err);
  process.exit(1);
});
