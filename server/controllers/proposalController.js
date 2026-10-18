import pool from '../config/database.js';
import { calculateFinancials } from '../utils/financials.js';
import { validateBrandSafety } from '../services/exclusivityService.js';
import { checkInventoryAvailability, reserveInventoryItem, releaseInventoryForProposal } from '../services/inventoryService.js';
import { createNotification } from '../services/notificationService.js';
import { suggestNegotiationStrategy } from '../services/ollamaService.js';

export async function listProposals(req, res, next) {
  try {
    const user = req.user;
    let query = `
      SELECT p.*, e.name as event_name, e.category_name, e.city as event_city, e.start_date,
             s.company_name, s.industry, s.contact_name, s.contact_email,
             o.organization_name, o.id as organizer_id
      FROM proposals p
      JOIN events e ON p.event_id = e.id
      JOIN organizer_profiles o ON e.organizer_id = o.id
      JOIN sponsor_profiles s ON p.sponsor_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'organizer') {
      query += ' AND o.id = ?';
      params.push(user.organizerId);
    } else if (user.role === 'sponsor') {
      query += ' AND s.id = ?';
      params.push(user.sponsorId);
    }

    query += ' ORDER BY p.updated_at DESC';

    const [proposals] = await pool.query(query, params);
    res.json({ success: true, data: proposals });
  } catch (error) {
    next(error);
  }
}

export async function getProposalById(req, res, next) {
  try {
    const proposalId = req.params.id;

    const [rows] = await pool.query(
      `SELECT p.*, e.name as event_name, e.category_name, e.city as event_city, e.start_date, e.budget as event_budget,
              s.company_name, s.industry, s.contact_name, s.contact_email, s.contact_phone,
              o.organization_name, o.contact_email as organizer_email, o.id as organizer_id,
              pkg.name as package_name
       FROM proposals p
       JOIN events e ON p.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN sponsor_profiles s ON p.sponsor_id = s.id
       LEFT JOIN packages pkg ON p.package_id = pkg.id
       WHERE p.id = ?`,
      [proposalId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const proposal = rows[0];

    // Authorization check
    if (req.user.role === 'organizer' && proposal.organizer_id !== req.user.organizerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role === 'sponsor' && proposal.sponsor_id !== req.user.sponsorId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Versions
    const [versions] = await pool.query(
      `SELECT pv.*, u.name as proposed_by_name 
       FROM proposal_versions pv 
       JOIN users u ON pv.proposed_by_user_id = u.id 
       WHERE pv.proposal_id = ? 
       ORDER BY pv.version_number ASC`,
      [proposalId]
    );

    const formattedVersions = versions.map(v => ({
      ...v,
      selected_benefits: typeof v.selected_benefits === 'string' ? JSON.parse(v.selected_benefits || '[]') : v.selected_benefits || []
    }));

    // Negotiation timeline
    const [history] = await pool.query(
      `SELECT nh.*, u.name as action_by_name, u.role as action_by_role
       FROM negotiation_history nh
       JOIN users u ON nh.action_by_user_id = u.id
       WHERE nh.proposal_id = ?
       ORDER BY nh.created_at ASC`,
      [proposalId]
    );

    // Linked agreement if accepted
    const [agreements] = await pool.query('SELECT id, agreement_number, status FROM agreements WHERE proposal_id = ?', [proposalId]);

    res.json({
      success: true,
      data: {
        proposal,
        versions: formattedVersions,
        history,
        agreement: agreements.length > 0 ? agreements[0] : null
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function createProposal(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const sponsorId = req.user.sponsorId;
    if (!sponsorId) {
      return res.status(403).json({ success: false, message: 'Sponsor profile required to submit a proposal.' });
    }

    const {
      event_id, package_id = null, title, proposed_price, notes,
      selected_benefits = [] // array of { inventory_id, quantity, name }
    } = req.body;

    if (!event_id || !proposed_price) {
      return res.status(400).json({ success: false, message: 'Event ID and proposed price are required.' });
    }

    // 1. Critical Rule: Validate brand safety & prohibited categories
    const brandCheck = await validateBrandSafety(event_id, sponsorId);
    if (!brandCheck.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        prohibitedCategoryViolation: true,
        message: brandCheck.reason
      });
    }

    // 2. Validate inventory availability & exclusivity
    let estimatedFulfilmentCost = 0;
    for (const b of selected_benefits) {
      if (b.inventory_id) {
        const item = await checkInventoryAvailability(connection, b.inventory_id, b.quantity || 1);
        estimatedFulfilmentCost += Number(item.fulfilment_cost) * (b.quantity || 1);
      }
    }

    // 3. Compute authoritative financials
    const fin = calculateFinancials({
      proposedPrice: Number(proposed_price),
      fulfilmentCost: estimatedFulfilmentCost
    });

    // 4. Create proposal
    const proposalTitle = title || `Sponsorship Proposal for Event #${event_id}`;
    const [propResult] = await connection.query(
      `INSERT INTO proposals (
        event_id, sponsor_id, package_id, title, current_version, status,
        proposed_price, estimated_fulfilment_cost, estimated_contribution, contribution_margin, notes
      ) VALUES (?, ?, ?, ?, 1, 'submitted', ?, ?, ?, ?, ?)`,
      [
        event_id, sponsorId, package_id, proposalTitle,
        fin.revenue, fin.fulfilmentCost, fin.contribution, fin.contributionMargin, notes || null
      ]
    );
    const proposalId = propResult.insertId;

    // 5. Create initial Proposal Version (v1)
    await connection.query(
      `INSERT INTO proposal_versions (
        proposal_id, version_number, proposed_by_role, proposed_by_user_id,
        proposed_price, fulfilment_cost, contribution, contribution_margin, selected_benefits, notes
      ) VALUES (?, 1, 'sponsor', ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId, req.user.id, fin.revenue, fin.fulfilmentCost, fin.contribution, fin.contributionMargin,
        JSON.stringify(selected_benefits), notes || null
      ]
    );

    // 6. Record negotiation history action
    await connection.query(
      `INSERT INTO negotiation_history (proposal_id, action_by_user_id, action_type, message, new_price)
       VALUES (?, ?, 'proposal_submitted', ?, ?)`,
      [proposalId, req.user.id, `Proposal submitted for ₹${fin.revenue}`, fin.revenue]
    );

    // 7. Notify organizer with deduplication key
    const [eventRows] = await connection.query(
      'SELECT e.name, o.user_id as organizer_user_id FROM events e JOIN organizer_profiles o ON e.organizer_id = o.id WHERE e.id = ?',
      [event_id]
    );
    if (eventRows.length > 0) {
      const org = eventRows[0];
      await createNotification({
        recipientUserId: org.organizer_user_id,
        eventId: event_id,
        purpose: 'new_proposal',
        idempotencyKey: `notif_prop_${proposalId}_v1_created`,
        title: 'New Sponsorship Proposal Received',
        message: `A new proposal of ₹${fin.revenue.toLocaleString()} was submitted for '${org.name}'.`
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: {
        id: proposalId,
        title: proposalTitle,
        status: 'submitted',
        ...fin
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function sendCounteroffer(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const proposalId = req.params.id;
    const { counter_price, modified_benefits = [], notes } = req.body;

    if (!counter_price) {
      return res.status(400).json({ success: false, message: 'Counter price is required.' });
    }

    const [props] = await connection.query(
      `SELECT p.*, e.organizer_id, o.user_id as organizer_user_id, s.user_id as sponsor_user_id, e.name as event_name
       FROM proposals p
       JOIN events e ON p.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN sponsor_profiles s ON p.sponsor_id = s.id
       WHERE p.id = ? FOR UPDATE`,
      [proposalId]
    );

    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const proposal = props[0];
    const userRole = req.user.role;
    const previousPrice = proposal.proposed_price;
    const nextVersion = proposal.current_version + 1;

    // Determine new status
    const newStatus = userRole === 'organizer' ? 'counteroffer_organizer' : 'counteroffer_sponsor';

    // Compute updated financials
    const fin = calculateFinancials({
      proposedPrice: Number(counter_price),
      fulfilmentCost: proposal.estimated_fulfilment_cost
    });

    // 1. Update proposal record
    await connection.query(
      `UPDATE proposals SET
        current_version = ?,
        status = ?,
        proposed_price = ?,
        estimated_contribution = ?,
        contribution_margin = ?,
        notes = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [nextVersion, newStatus, fin.revenue, fin.contribution, fin.contributionMargin, notes || proposal.notes, proposalId]
    );

    // 2. Insert new proposal version
    await connection.query(
      `INSERT INTO proposal_versions (
        proposal_id, version_number, proposed_by_role, proposed_by_user_id,
        proposed_price, fulfilment_cost, contribution, contribution_margin, selected_benefits, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId, nextVersion, userRole, req.user.id,
        fin.revenue, fin.fulfilmentCost, fin.contribution, fin.contributionMargin,
        JSON.stringify(modified_benefits), notes || null
      ]
    );

    // 3. Record negotiation history
    await connection.query(
      `INSERT INTO negotiation_history (proposal_id, action_by_user_id, action_type, message, previous_price, new_price)
       VALUES (?, ?, 'counteroffer_sent', ?, ?, ?)`,
      [proposalId, req.user.id, notes || `Counteroffer sent: ₹${fin.revenue}`, previousPrice, fin.revenue]
    );

    // 4. Send deduplicated notification to counterparty
    const recipientUserId = userRole === 'organizer' ? proposal.sponsor_user_id : proposal.organizer_user_id;
    await createNotification({
      recipientUserId,
      eventId: proposal.event_id,
      purpose: 'counteroffer_received',
      idempotencyKey: `notif_prop_${proposalId}_v${nextVersion}_counter`,
      title: 'Counteroffer Received',
      message: `${req.user.name} sent a counteroffer of ₹${fin.revenue.toLocaleString()} for '${proposal.event_name}'.`
    });

    await connection.commit();

    res.json({
      success: true,
      message: 'Counteroffer submitted successfully',
      data: {
        proposalId,
        version: nextVersion,
        status: newStatus,
        ...fin
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function acceptProposal(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const proposalId = req.params.id;

    const [props] = await connection.query(
      `SELECT p.*, e.organizer_id, o.user_id as organizer_user_id, s.user_id as sponsor_user_id, e.name as event_name, s.company_name
       FROM proposals p
       JOIN events e ON p.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN sponsor_profiles s ON p.sponsor_id = s.id
       WHERE p.id = ? FOR UPDATE`,
      [proposalId]
    );

    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const proposal = props[0];

    // 1. Update proposal status
    await connection.query("UPDATE proposals SET status = 'accepted' WHERE id = ?", [proposalId]);

    // 2. Fetch latest version benefits to lock inventory
    const [latestVersions] = await connection.query(
      'SELECT selected_benefits FROM proposal_versions WHERE proposal_id = ? ORDER BY version_number DESC LIMIT 1',
      [proposalId]
    );
    const benefits = latestVersions.length > 0
      ? (typeof latestVersions[0].selected_benefits === 'string' ? JSON.parse(latestVersions[0].selected_benefits || '[]') : latestVersions[0].selected_benefits)
      : [];

    // 3. Create Draft Agreement
    const agreementNumber = `AGR-${new Date().getFullYear()}-${String(proposalId).padStart(4, '0')}`;
    const [agrResult] = await connection.query(
      `INSERT INTO agreements (
        proposal_id, event_id, sponsor_id, agreement_number, current_version,
        agreed_price, fulfilment_cost, contribution, contribution_margin,
        status, organizer_approved, sponsor_approved, exclusivity_conditions, cancellation_policy
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, 'pending_organizer_approval', 0, 0, ?, ?)`,
      [
        proposalId, proposal.event_id, proposal.sponsor_id, agreementNumber,
        proposal.proposed_price, proposal.estimated_fulfilment_cost,
        proposal.estimated_contribution, proposal.contribution_margin,
        'Exclusive category protections apply per negotiated terms.',
        'Cancellation permitted up to 30 days prior with 50% forfeiture. Releases all committed inventory.'
      ]
    );
    const agreementId = agrResult.insertId;

    // 4. Create Agreement Version 1
    await connection.query(
      `INSERT INTO agreement_versions (
        agreement_id, version_number, proposed_by_user_id, agreed_price, terms, benefits_included,
        exclusivity_clause, cancellation_clause, organizer_approval, sponsor_approval
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        agreementId, req.user.id, proposal.proposed_price,
        'Standard Master Sponsorship Agreement terms. Mutual approval required for activation.',
        JSON.stringify(benefits),
        'Category exclusivity granted for the duration of the event.',
        'Standard 30-day cancellation and inventory forfeiture rules apply.'
      ]
    );

    // 5. Reserve inventory items in transaction
    for (const b of benefits) {
      if (b.inventory_id) {
        await reserveInventoryItem(connection, {
          inventoryId: b.inventory_id,
          sponsorId: proposal.sponsor_id,
          agreementId,
          proposalId,
          quantity: b.quantity || 1
        });
      }
    }

    // 6. Record negotiation history
    await connection.query(
      `INSERT INTO negotiation_history (proposal_id, action_by_user_id, action_type, message, new_price)
       VALUES (?, ?, 'proposal_accepted', ?, ?)`,
      [proposalId, req.user.id, `Proposal accepted at ₹${proposal.proposed_price}. Agreement ${agreementNumber} drafted.`, proposal.proposed_price]
    );

    // 7. Notify both parties
    await createNotification({
      recipientUserId: proposal.organizer_user_id,
      eventId: proposal.event_id,
      purpose: 'proposal_accepted',
      idempotencyKey: `notif_prop_${proposalId}_accepted_org`,
      title: 'Proposal Accepted - Agreement Ready',
      message: `Proposal for '${proposal.event_name}' was accepted. Agreement ${agreementNumber} is ready for signature.`
    });

    await createNotification({
      recipientUserId: proposal.sponsor_user_id,
      eventId: proposal.event_id,
      purpose: 'proposal_accepted',
      idempotencyKey: `notif_prop_${proposalId}_accepted_spons`,
      title: 'Proposal Accepted - Agreement Ready',
      message: `Your proposal for '${proposal.event_name}' was accepted. Please review and approve agreement ${agreementNumber}.`
    });

    await connection.commit();

    res.json({
      success: true,
      message: 'Proposal accepted and formal agreement drafted successfully.',
      data: {
        proposalId,
        agreementId,
        agreementNumber,
        status: 'accepted'
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function rejectProposal(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const proposalId = req.params.id;
    const { rejection_reason } = req.body;

    const [props] = await connection.query(
      `SELECT p.*, o.user_id as organizer_user_id, s.user_id as sponsor_user_id, e.name as event_name
       FROM proposals p
       JOIN events e ON p.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN sponsor_profiles s ON p.sponsor_id = s.id
       WHERE p.id = ? FOR UPDATE`,
      [proposalId]
    );

    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const proposal = props[0];

    // 1. Update proposal status
    await connection.query(
      "UPDATE proposals SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [rejection_reason || 'Terms could not be aligned.', proposalId]
    );

    // 2. Release any pending inventory reservations
    await releaseInventoryForProposal(connection, proposalId);

    // 3. Record in history
    await connection.query(
      `INSERT INTO negotiation_history (proposal_id, action_by_user_id, action_type, message)
       VALUES (?, ?, 'proposal_rejected', ?)`,
      [proposalId, req.user.id, `Proposal rejected. Reason: ${rejection_reason || 'Declined'}`]
    );

    // 4. Notify other party
    const recipientUserId = req.user.role === 'organizer' ? proposal.sponsor_user_id : proposal.organizer_user_id;
    await createNotification({
      recipientUserId,
      eventId: proposal.event_id,
      purpose: 'proposal_rejected',
      idempotencyKey: `notif_prop_${proposalId}_rejected`,
      title: 'Proposal Declined',
      message: `The sponsorship proposal for '${proposal.event_name}' was declined.`
    });

    await connection.commit();

    res.json({ success: true, message: 'Proposal rejected and reservations released.' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function getAiNegotiationAdvice(req, res, next) {
  try {
    const proposalId = req.params.id;

    const [props] = await pool.query(
      `SELECT p.*, e.name as event_name, e.category_name
       FROM proposals p
       JOIN events e ON p.event_id = e.id
       WHERE p.id = ?`,
      [proposalId]
    );

    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const [versions] = await pool.query(
      'SELECT * FROM proposal_versions WHERE proposal_id = ? ORDER BY version_number ASC',
      [proposalId]
    );

    const advice = await suggestNegotiationStrategy({
      proposal: props[0],
      versions,
      role: req.user.role,
      event: { name: props[0].event_name, category_name: props[0].category_name }
    });

    res.json({ success: true, data: advice });
  } catch (error) {
    next(error);
  }
}
