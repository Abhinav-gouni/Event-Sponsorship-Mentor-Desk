import pool from '../config/database.js';
import { createNotification } from '../services/notificationService.js';

export async function getAgreementDeliverables(req, res, next) {
  try {
    const agreementId = req.params.agreementId;

    const [deliverables] = await pool.query(
      `SELECT fd.*, i.name as inventory_name, i.item_type
       FROM fulfilment_deliverables fd
       LEFT JOIN sponsorship_inventory i ON fd.inventory_id = i.id
       WHERE fd.agreement_id = ?
       ORDER BY fd.created_at ASC`,
      [agreementId]
    );

    // Fetch evidence attachments for each deliverable
    for (const d of deliverables) {
      const [evidence] = await pool.query(
        `SELECT fe.*, u.name as submitted_by_name
         FROM fulfilment_evidence fe
         JOIN users u ON fe.submitted_by_user_id = u.id
         WHERE fe.deliverable_id = ?
         ORDER BY fe.created_at DESC`,
        [d.id]
      );
      d.evidence = evidence;
    }

    res.json({ success: true, data: deliverables });
  } catch (error) {
    next(error);
  }
}

export async function createDeliverable(req, res, next) {
  try {
    const { agreement_id, inventory_id = null, title, description, benefit_type, due_date, estimated_reach = 0 } = req.body;

    if (!agreement_id || !title || !benefit_type) {
      return res.status(400).json({ success: false, message: 'Agreement ID, title, and benefit type are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO fulfilment_deliverables (
        agreement_id, inventory_id, title, description, benefit_type, status, due_date, estimated_reach
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [agreement_id, inventory_id, title, description || null, benefit_type, due_date || null, Number(estimated_reach) || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Deliverable created',
      data: { id: result.insertId, title, status: 'pending' }
    });
  } catch (error) {
    next(error);
  }
}

export async function submitEvidence(req, res, next) {
  try {
    const deliverableId = req.params.deliverableId;
    const {
      evidence_type, title, url, notes,
      measured_reach, reach_source, reach_measured_at
    } = req.body;

    if (!evidence_type || !title || !url) {
      return res.status(400).json({ success: false, message: 'Evidence type, title, and URL are required.' });
    }

    // Critical Rule: If measured_reach is provided, it must have a source and timestamp
    let measuredAtDate = reach_measured_at ? new Date(reach_measured_at) : (measured_reach ? new Date() : null);
    let sourceVal = reach_source || (measured_reach ? 'Organizer Reported' : null);

    // 1. Insert evidence record
    const [result] = await pool.query(
      `INSERT INTO fulfilment_evidence (
        deliverable_id, submitted_by_user_id, evidence_type, title, url, notes,
        measured_reach, reach_source, reach_measured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deliverableId, req.user.id, evidence_type, title, url, notes || null,
        measured_reach !== undefined && measured_reach !== null ? Number(measured_reach) : null,
        sourceVal,
        measuredAtDate
      ]
    );

    // 2. Advance deliverable status to 'submitted_for_review'
    await pool.query(
      "UPDATE fulfilment_deliverables SET status = 'submitted_for_review', updated_at = NOW() WHERE id = ?",
      [deliverableId]
    );

    // 3. Notify sponsor that evidence is ready for review
    const [delivRows] = await pool.query(
      `SELECT fd.title, a.id as agreement_id, a.event_id, s.user_id as sponsor_user_id, e.name as event_name
       FROM fulfilment_deliverables fd
       JOIN agreements a ON fd.agreement_id = a.id
       JOIN events e ON a.event_id = e.id
       JOIN sponsor_profiles s ON a.sponsor_id = s.id
       WHERE fd.id = ?`,
      [deliverableId]
    );

    if (delivRows.length > 0) {
      const d = delivRows[0];
      await createNotification({
        recipientUserId: d.sponsor_user_id,
        eventId: d.event_id,
        purpose: 'fulfilment_submitted',
        idempotencyKey: `notif_ful_${deliverableId}_ev_${result.insertId}`,
        title: 'Sponsorship Evidence Submitted for Review',
        message: `New proof submitted for deliverable '${d.title}' in '${d.event_name}'. Please review and approve.`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Evidence submitted for review successfully',
      data: {
        evidenceId: result.insertId,
        deliverableStatus: 'submitted_for_review'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewDeliverable(req, res, next) {
  try {
    const deliverableId = req.params.deliverableId;
    const rawAction = (req.body.action || req.body.decision || '').toLowerCase().trim();
    const action = rawAction === 'approved' ? 'approve' : (rawAction === 'rejected' ? 'reject' : rawAction);
    const { rejection_reason, review_notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting evidence' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await pool.query(
      `UPDATE fulfilment_deliverables SET
        status = ?,
        rejection_reason = ?,
        review_notes = ?,
        reviewed_at = NOW(),
        updated_at = NOW()
       WHERE id = ?`,
      [newStatus, action === 'reject' ? rejection_reason : null, review_notes || null, deliverableId]
    );

    // Notify organizer
    const [delivRows] = await pool.query(
      `SELECT fd.title, a.id as agreement_id, a.event_id, o.user_id as organizer_user_id, e.name as event_name
       FROM fulfilment_deliverables fd
       JOIN agreements a ON fd.agreement_id = a.id
       JOIN events e ON a.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       WHERE fd.id = ?`,
      [deliverableId]
    );

    if (delivRows.length > 0) {
      const d = delivRows[0];
      await createNotification({
        recipientUserId: d.organizer_user_id,
        eventId: d.event_id,
        purpose: `fulfilment_${newStatus}`,
        idempotencyKey: `notif_ful_${deliverableId}_reviewed_${newStatus}_${Date.now()}`,
        title: action === 'approve' ? 'Deliverable Approved by Sponsor' : 'Deliverable Rejected by Sponsor',
        message: action === 'approve' 
          ? `Sponsor approved '${d.title}' for '${d.event_name}'.`
          : `Sponsor requested revisions on '${d.title}'. Reason: ${rejection_reason}`
      });
    }

    res.json({
      success: true,
      message: `Deliverable has been ${newStatus}`,
      data: { deliverableId, status: newStatus }
    });
  } catch (error) {
    next(error);
  }
}
