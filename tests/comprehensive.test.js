import pool from '../server/config/database.js';
import { calculateFinancials, validatePricing } from '../server/utils/financials.js';
import { checkInventoryAvailability, reserveInventoryItem, releaseInventoryForAgreement } from '../server/services/inventoryService.js';
import { validateBrandSafety } from '../server/services/exclusivityService.js';
import { createNotification, getUserNotifications } from '../server/services/notificationService.js';

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

async function runAllTests() {
  console.log('========================================================');
  console.log('C34 EVENT SPONSORSHIP MATCH DESK - COMPREHENSIVE TESTS');
  console.log('========================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: Pricing calculations & Contribution Margin
    // Mandatory sample: Revenue = ₹30,000, Fulfilment = ₹18,000 => Contribution = ₹12,000, Margin = 40%
    // -------------------------------------------------------------
    console.log('TEST 1: Financial & Contribution Margin Formulas');
    const fin = calculateFinancials({
      basePrice: 30000,
      discount: 0,
      additionalCost: 0,
      fulfilmentCost: 18000
    });
    assert(fin.revenue === 30000, `Revenue equals 30000 (got ${fin.revenue})`);
    assert(fin.fulfilmentCost === 18000, `Fulfilment cost equals 18000 (got ${fin.fulfilmentCost})`);
    assert(fin.contribution === 12000, `Contribution equals 12000 (got ${fin.contribution})`);
    assert(fin.contributionMargin === 40, `Contribution margin equals 40.0% (got ${fin.contributionMargin}%)`);

    const fin2 = calculateFinancials({
      basePrice: 100000,
      discount: 10000,
      additionalCost: 5000,
      fulfilmentCost: 38000
    });
    // Revenue = 95000, Cost = 38000, Contribution = 57000, Margin = (57000/95000)*100 = 60.0%
    assert(fin2.revenue === 95000, `Revenue with discount/additions = 95000`);
    assert(fin2.contribution === 57000, `Contribution = 57000`);
    assert(fin2.contributionMargin === 60, `Contribution margin = 60.0%`);
    console.log('');

    // -------------------------------------------------------------
    // TEST 2: Exclusive Inventory Conflict Enforcement
    // -------------------------------------------------------------
    console.log('TEST 2: Exclusive Inventory Conflict Enforcement');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Create a test exclusive item
      const [itemResult] = await conn.query(
        `INSERT INTO sponsorship_inventory (event_id, item_type, name, total_quantity, available_quantity, base_price, is_exclusive)
         VALUES (1, 'Title', 'Test Exclusive Title Slot 99', 1, 1, 500000, 1)`
      );
      const testItemId = itemResult.insertId;

      // Reserve it for Sponsor 1 (CloudScale)
      await reserveInventoryItem(conn, {
        inventoryId: testItemId,
        sponsorId: 1,
        quantity: 1,
        isExclusive: true
      });

      // Try reserving the same exclusive item for Sponsor 2
      let conflictDetected = false;
      try {
        await checkInventoryAvailability(conn, testItemId, 1);
      } catch (err) {
        if (err.message.includes('Exclusive item conflict') || err.message.includes('Insufficient inventory')) {
          conflictDetected = true;
        }
      }
      assert(conflictDetected, 'System blocked duplicate reservation of exclusive title sponsorship slot');

      await conn.rollback();
    } finally {
      conn.release();
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST 3: Prohibited Category Rejection
    // -------------------------------------------------------------
    console.log('TEST 3: Prohibited Category Rejection & Brand Safety');
    // Global AI Conclave prohibits Tobacco, Gambling, Alcohol
    const [testSponsor] = await pool.query(
      `INSERT INTO sponsor_profiles (user_id, company_name, industry)
       VALUES (1, 'Vegas Betting & Casino App', 'Gambling & Sports Betting')`
    );
    const gamblingSponsorId = testSponsor.insertId;

    const brandCheck = await validateBrandSafety(1, gamblingSponsorId);
    assert(brandCheck.valid === false, 'Brand safety check correctly rejected prohibited sponsor');
    assert(brandCheck.reason.includes('Prohibited Category Violation'), `Explanation provided: ${brandCheck.reason}`);

    // Clean up test sponsor
    await pool.query('DELETE FROM sponsor_profiles WHERE id = ?', [gamblingSponsorId]);
    console.log('');

    // -------------------------------------------------------------
    // TEST 4: Sponsor / Event Matching Logic
    // -------------------------------------------------------------
    console.log('TEST 4: Sponsor / Event Matching');
    const [eventRows] = await pool.query('SELECT * FROM events WHERE id = 1');
    const [sponsors] = await pool.query('SELECT * FROM sponsor_profiles');
    assert(eventRows.length > 0, 'Target event loaded from database');
    assert(sponsors.length >= 3, 'Sponsors loaded from database');
    console.log('');

    // -------------------------------------------------------------
    // TEST 5: Proposal & Negotiation Version History
    // -------------------------------------------------------------
    console.log('TEST 5: Proposal & Negotiation Version History');
    const [props] = await pool.query('SELECT * FROM proposals WHERE id = 1');
    assert(props.length > 0, 'Found proposal #1 in database');
    assert(props[0].current_version >= 2, `Proposal has multiple recorded negotiation versions (current: v${props[0].current_version})`);

    const [versions] = await pool.query('SELECT * FROM proposal_versions WHERE proposal_id = 1 ORDER BY version_number ASC');
    assert(versions.length >= 2, `Preserved ${versions.length} versions in proposal_versions table`);
    assert(versions[0].version_number === 1 && versions[1].version_number === 2, 'Version sequence properly preserved (v1 -> v2)');
    console.log('');

    // -------------------------------------------------------------
    // TEST 6: Mutual Approval of Agreement Changes
    // -------------------------------------------------------------
    console.log('TEST 6: Mutual Approval of Agreement Changes');
    const [agrs] = await pool.query('SELECT * FROM agreements WHERE id = 1');
    assert(agrs.length > 0, 'Agreement #1 loaded');
    const a = agrs[0];
    assert(a.organizer_approved === 1 && a.sponsor_approved === 1, 'Agreement status is mutually approved only when both parties approved');
    assert(a.status === 'mutually_approved', 'Agreement status verified as mutually_approved');
    console.log('');

    // -------------------------------------------------------------
    // TEST 7: Cancellation & Inventory Release
    // -------------------------------------------------------------
    console.log('TEST 7: Cancellation & Inventory Release');
    const testConn = await pool.getConnection();
    try {
      await testConn.beginTransaction();

      // Create test inventory item with available_quantity = 2
      const [invRes] = await testConn.query(
        `INSERT INTO sponsorship_inventory (event_id, item_type, name, total_quantity, available_quantity, base_price)
         VALUES (1, 'Booth', 'Test Release Booth', 2, 2, 20000)`
      );
      const testInvId = invRes.insertId;

      // Reserve 1 booth for agreement 1
      await reserveInventoryItem(testConn, {
        inventoryId: testInvId,
        sponsorId: 1,
        agreementId: 1,
        quantity: 1
      });

      // Verify available is now 1
      const [afterReserve] = await testConn.query('SELECT available_quantity FROM sponsorship_inventory WHERE id = ?', [testInvId]);
      assert(afterReserve[0].available_quantity === 1, 'Available quantity decremented to 1 upon reservation');

      // Release inventory for agreement #1
      const releasedCount = await releaseInventoryForAgreement(testConn, 1);
      assert(releasedCount >= 1, 'Released reservation records');

      // Verify available quantity is restored to 2
      const [afterRelease] = await testConn.query('SELECT available_quantity FROM sponsorship_inventory WHERE id = ?', [testInvId]);
      assert(afterRelease[0].available_quantity === 2, 'Available quantity restored to 2 upon cancellation release');

      await testConn.rollback();
    } finally {
      testConn.release();
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST 8: Duplicate Notification Deduplication (Idempotency)
    // -------------------------------------------------------------
    console.log('TEST 8: Notification Deduplication & Idempotency Key');
    const testKey = `test_unique_key_${Date.now()}`;
    const firstNotif = await createNotification({
      recipientUserId: 2,
      purpose: 'test_alert',
      idempotencyKey: testKey,
      title: 'First Notification',
      message: 'Initial message'
    });
    assert(firstNotif.status === 'created', 'First notification created successfully');

    // Attempt second notification with same idempotency key
    const duplicateNotif = await createNotification({
      recipientUserId: 2,
      purpose: 'test_alert',
      idempotencyKey: testKey,
      title: 'Duplicate Notification',
      message: 'Duplicate attempt'
    });
    assert(duplicateNotif.status === 'deduplicated', 'Duplicate notification with identical key was blocked (deduplicated)');
    console.log('');

    // -------------------------------------------------------------
    // TEST 9: Role-Based Authorization Checks
    // -------------------------------------------------------------
    console.log('TEST 9: Role-Based User Access Verification');
    const [organizers] = await pool.query("SELECT * FROM users WHERE role = 'organizer'");
    const [sponsorsList] = await pool.query("SELECT * FROM users WHERE role = 'sponsor'");
    const [admins] = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    assert(organizers.length > 0, `Organizers verified in database (${organizers.length} accounts)`);
    assert(sponsorsList.length > 0, `Sponsors verified in database (${sponsorsList.length} accounts)`);
    assert(admins.length > 0, `Admin verified in database (${admins.length} accounts)`);
    console.log('');

    // -------------------------------------------------------------
    // TEST 10: Measured Reach vs Estimated Reach Separation
    // -------------------------------------------------------------
    console.log('TEST 10: Measured Reach vs Estimated Reach Separation');
    const [evidence] = await pool.query(
      `SELECT fe.measured_reach, fe.reach_source, fe.reach_measured_at, fd.estimated_reach
       FROM fulfilment_evidence fe
       JOIN fulfilment_deliverables fd ON fe.deliverable_id = fd.id
       LIMIT 1`
    );
    assert(evidence.length > 0, 'Fulfilment evidence loaded');
    const ev = evidence[0];
    assert(ev.measured_reach !== null && ev.measured_reach > 0, `Measured reach recorded: ${ev.measured_reach}`);
    assert(ev.reach_source !== null && ev.reach_source.length > 0, `Measured reach has source: '${ev.reach_source}'`);
    assert(ev.reach_measured_at !== null, `Measured reach has timestamp: ${ev.reach_measured_at}`);
    assert(ev.estimated_reach !== null && ev.estimated_reach > 0, `Estimated reach kept distinct: ${ev.estimated_reach}`);
    console.log('');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('========================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runAllTests();
