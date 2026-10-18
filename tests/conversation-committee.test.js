import pool from '../server/config/database.js';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: AI CONVERSATION SYSTEM & COMMITTEE CONTACT ASSISTANT');
  console.log('================================================================\n');

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

  try {
    // Reset Medical contact to unverified state for idempotent test runs
    await pool.query('UPDATE event_committee_contacts SET is_verified = 0, verified_by_user_id = NULL WHERE event_id = 1 AND committee_type = "Medical"');

    // 1. Authenticate users
    console.log('--- STEP 1: Authentication ---');
    const orgLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@techsummit.io', password: 'password123' })
    })).json();
    assert(orgLogin.success && orgLogin.data.token, 'Organizer token acquired');
    const orgToken = orgLogin.data.token;
    const orgUserId = orgLogin.data.user.id;

    const sponsorLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sponsor@cloudscale.io', password: 'password123' })
    })).json();
    assert(sponsorLogin.success && sponsorLogin.data.token, 'Sponsor token acquired');
    const sponsorToken = sponsorLogin.data.token;
    const sponsorUserId = sponsorLogin.data.user.id;

    // 2. Verified Committee Contact Filtering
    console.log('\n--- STEP 2: Committee Contact RBAC & Filtering ---');
    // Sponsor queries event 1 contacts (should see only verified, NOT unverified Medical)
    const sponsorCommitteesRes = await (await fetch(`${BASE_URL}/api/committees/events/1`, {
      headers: { 'Authorization': `Bearer ${sponsorToken}` }
    })).json();
    assert(sponsorCommitteesRes.success, 'Sponsor retrieved event committees');
    const hasUnverifiedInSponsorView = sponsorCommitteesRes.data.some(c => c.is_verified === 0 || c.committee_type === 'Medical');
    assert(!hasUnverifiedInSponsorView, 'Sponsor cannot see unverified Medical contact');
    const hasSecurity = sponsorCommitteesRes.data.some(c => c.committee_type === 'Security' && c.is_verified === 1);
    assert(hasSecurity, 'Sponsor can see verified Security contact');

    // Organizer queries event 1 contacts (should see all contacts, including unverified Medical)
    const orgCommitteesRes = await (await fetch(`${BASE_URL}/api/committees/events/1`, {
      headers: { 'Authorization': `Bearer ${orgToken}` }
    })).json();
    assert(orgCommitteesRes.success, 'Organizer retrieved event committees');
    const hasMedicalInOrgView = orgCommitteesRes.data.some(c => c.committee_type === 'Medical' && c.is_verified === 0);
    assert(hasMedicalInOrgView, 'Organizer can see unverified Medical contact for verification workflow');

    // 3. Sponsor RBAC Protection (Sponsors cannot create or verify contacts)
    console.log('\n--- STEP 3: Committee Management RBAC Enforcement ---');
    const sponsorCreateRes = await (await fetch(`${BASE_URL}/api/committees/events/1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        committee_type: 'Other',
        contact_person: 'Fake Person',
        email: 'fake@sponsor.com',
        phone: '123456789'
      })
    })).json();
    assert(!sponsorCreateRes.success, 'Sponsor blocked from creating committee contact (403)');

    // 4. Conversation Thread Creation
    console.log('\n--- STEP 4: Conversation Thread Initialization ---');
    const threadRes = await (await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        event_id: 1,
        organizer_id: orgUserId,
        subject: 'CloudScale Title Sponsorship Q&A'
      })
    })).json();
    assert(threadRes.success && threadRes.threadId, `Conversation thread active (ID: ${threadRes.threadId})`);
    const threadId = threadRes.threadId;

    // 5. Contact Assistant: Routine Verified Contact Query
    console.log('\n--- STEP 5: AI Contact Assistant - Verified Contact Query ---');
    const verifiedContactQuery = await (await fetch(`${BASE_URL}/api/conversations/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        message_text: 'Who is the contact person for Security and what are their working hours?'
      })
    })).json();
    assert(verifiedContactQuery.success, 'Verified contact query processed');
    assert(verifiedContactQuery.aiReply && verifiedContactQuery.aiReply.message_text.includes('Vikram Rathore'), 'AI auto-reply returned verified Security contact (Vikram Rathore)');
    assert(verifiedContactQuery.aiReply.message_text.includes('+91 98110 23456'), 'AI auto-reply returned verified Security phone number');

    // 6. Contact Assistant: Unverified / Missing Contact (Anti-Hallucination)
    console.log('\n--- STEP 6: AI Contact Assistant - Unverified Contact Protection (Zero Hallucination) ---');
    const unverifiedContactQuery = await (await fetch(`${BASE_URL}/api/conversations/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        message_text: 'Can I get the phone number and email for the Medical committee tent?'
      })
    })).json();
    assert(unverifiedContactQuery.success, 'Unverified contact query processed safely');
    assert(
      unverifiedContactQuery.aiReply &&
      unverifiedContactQuery.aiReply.message_text.includes('unavailable or pending official organizer verification'),
      'AI did not hallucinate unverified Medical contact; safely reported unavailable'
    );
    assert(
      !unverifiedContactQuery.aiReply.message_text.includes('+91 98770 89012'),
      'Private unverified medical phone was strictly protected and not leaked'
    );

    // 7. Event Clarification when Context is Ambiguous
    console.log('\n--- STEP 7: Event Context Clarification ---');
    // Create an event-agnostic generic thread
    const genericThreadRes = await (await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        organizer_id: orgUserId,
        subject: 'General Question'
      })
    })).json();
    const genericThreadId = genericThreadRes.threadId;

    const ambiguousQuery = await (await fetch(`${BASE_URL}/api/conversations/${genericThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        message_text: 'Who can I contact for the transport shuttle service?'
      })
    })).json();
    assert(ambiguousQuery.success, 'Ambiguous inquiry processed');
    assert(
      ambiguousQuery.aiReply && ambiguousQuery.aiReply.message_text.includes('specify which event you are inquiring about'),
      'AI asked sponsor to clarify which event before returning transport contacts'
    );

    // 8. High-Risk Message Classification & Gating
    console.log('\n--- STEP 8: High-Risk Message Gating (Pricing / Discount / Negotiation) ---');
    const highRiskQuery = await (await fetch(`${BASE_URL}/api/conversations/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sponsorToken}`
      },
      body: JSON.stringify({
        message_text: 'We are prepared to sign if you can give us a 25% discount and guarantee exclusive keynote stage rights.'
      })
    })).json();
    assert(highRiskQuery.success, 'High-risk message submitted');
    assert(highRiskQuery.pendingApproval === true, 'High-risk message gated as pending approval');

    // 9. Sponsor Draft Isolation: Verify sponsor CANNOT see the pending draft
    console.log('\n--- STEP 9: Sponsor Draft Isolation Verification ---');
    const sponsorMessages = await (await fetch(`${BASE_URL}/api/conversations/${threadId}/messages`, {
      headers: { 'Authorization': `Bearer ${sponsorToken}` }
    })).json();
    const sponsorSeesPendingDraft = sponsorMessages.data.some(m => m.approval_status === 'pending_approval');
    assert(!sponsorSeesPendingDraft, 'Sponsor query strictly isolates and hides unapproved draft');

    // 10. Organizer Approval Queue
    console.log('\n--- STEP 10: Organizer Approval Queue ---');
    const pendingList = await (await fetch(`${BASE_URL}/api/conversations/approvals/pending`, {
      headers: { 'Authorization': `Bearer ${orgToken}` }
    })).json();
    assert(pendingList.success && pendingList.data.length > 0, `Organizer approval queue populated (${pendingList.data.length} pending drafts)`);
    const draftMessage = pendingList.data.find(m => m.conversation_id === threadId);
    assert(draftMessage && draftMessage.approval_status === 'pending_approval', 'Found high-risk draft in organizer approval queue');

    // 11. Organizer Decision & Audit Trail (Edit & Approve)
    console.log('\n--- STEP 11: Organizer Decision & Audit Logging ---');
    const approvedCustomText = 'Thank you for your proposal. We can offer a 10% multi-year discount with primary breakout session positioning, subject to standard contract terms.';
    const decisionRes = await (await fetch(`${BASE_URL}/api/conversations/approvals/${draftMessage.id}/decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${orgToken}`
      },
      body: JSON.stringify({
        decision: 'edited_and_approved',
        finalText: approvedCustomText,
        notes: 'Approved after executive committee pricing review.'
      })
    })).json();
    assert(decisionRes.success, 'Organizer approved and updated draft');

    // Verify audit log entry in database
    const [auditRows] = await pool.query(
      'SELECT * FROM conversation_approval_audit_logs WHERE message_id = ?',
      [draftMessage.id]
    );
    assert(auditRows.length > 0, 'Audit log recorded in conversation_approval_audit_logs');
    assert(auditRows[0].decision === 'edited_and_approved', 'Audit log captured exact decision');
    assert(auditRows[0].final_sent_text === approvedCustomText, 'Audit log captured final text');
    assert(auditRows[0].original_draft !== null, 'Audit log preserved original AI draft');

    // 12. Released Message Delivery to Sponsor
    console.log('\n--- STEP 12: Sponsor Message Delivery Post-Approval ---');
    const sponsorMessagesPostApproval = await (await fetch(`${BASE_URL}/api/conversations/${threadId}/messages`, {
      headers: { 'Authorization': `Bearer ${sponsorToken}` }
    })).json();
    const approvedMessageInSponsorView = sponsorMessagesPostApproval.data.find(m => m.id === draftMessage.id);
    assert(approvedMessageInSponsorView && approvedMessageInSponsorView.message_text === approvedCustomText, 'Approved message now delivered and visible to sponsor');

    // 13. Organizer Committee Verification Action
    console.log('\n--- STEP 13: Organizer Verifies Medical Contact ---');
    // Find unverified Medical contact for Event 1
    const [medRows] = await pool.query('SELECT id FROM event_committee_contacts WHERE event_id = 1 AND committee_type = "Medical"');
    if (medRows.length > 0) {
      const medId = medRows[0].id;
      const verifyRes = await (await fetch(`${BASE_URL}/api/committees/${medId}/verify`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${orgToken}` }
      })).json();
      assert(verifyRes.success, 'Organizer successfully verified Medical committee contact');

      // Now sponsor asks again for Medical contact
      const postVerifyQuery = await (await fetch(`${BASE_URL}/api/conversations/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sponsorToken}`
        },
        body: JSON.stringify({
          message_text: 'Who is the contact person for the Medical tent?'
        })
      })).json();
      assert(postVerifyQuery.success, 'Post-verification query processed');
      assert(
        postVerifyQuery.aiReply && postVerifyQuery.aiReply.message_text.includes('Dr. Alok Verma'),
        'AI immediately served Dr. Alok Verma now that the organizer verified the contact'
      );
    }

    // 14. Sponsor Requirements Extraction
    console.log('\n--- STEP 14: Structured Requirements & Feedback Extraction ---');
    const [reqRows] = await pool.query(
      'SELECT * FROM conversation_sponsor_requirements WHERE conversation_id = ?',
      [threadId]
    );
    assert(reqRows.length > 0, `Extracted ${reqRows.length} sponsor requirements into database`);

    console.log('\n================================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  }
}

runTests();
