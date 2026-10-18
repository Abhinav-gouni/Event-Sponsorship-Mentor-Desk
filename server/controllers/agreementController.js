import pool from '../config/database.js';
import { releaseInventoryForAgreement } from '../services/inventoryService.js';
import { createNotification } from '../services/notificationService.js';
import { summarizeAgreement, compareAgreementVersions } from '../services/ollamaService.js';

export async function listAgreements(req, res, next) {
  try {
    const user = req.user;
    let query = `
      SELECT a.*, e.name as event_name, e.city as event_city, e.start_date, e.end_date,
             s.company_name, s.industry, s.contact_name, s.contact_email,
             o.organization_name, o.contact_email as organizer_email, o.id as organizer_id
      FROM agreements a
      JOIN events e ON a.event_id = e.id
      JOIN organizer_profiles o ON e.organizer_id = o.id
      JOIN sponsor_profiles s ON a.sponsor_id = s.id
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

    query += ' ORDER BY a.created_at DESC';

    const [agreements] = await pool.query(query, params);
    res.json({ success: true, data: agreements });
  } catch (error) {
    next(error);
  }
}

export async function getAgreementById(req, res, next) {
  try {
    const agreementId = req.params.id;

    const [rows] = await pool.query(
      `SELECT a.*, e.name as event_name, e.city as event_city, e.venue as event_venue, e.start_date, e.end_date,
              e.expected_audience, e.estimated_reach,
              s.company_name, s.industry, s.contact_name, s.contact_email, s.contact_phone,
              o.organization_name, o.contact_email as organizer_email, o.contact_phone as organizer_phone, o.id as organizer_id
       FROM agreements a
       JOIN events e ON a.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN sponsor_profiles s ON a.sponsor_id = s.id
       WHERE a.id = ?`,
      [agreementId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const agreement = rows[0];

    // Authorization check
    if (req.user.role === 'organizer' && agreement.organizer_id !== req.user.organizerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role === 'sponsor' && agreement.sponsor_id !== req.user.sponsorId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Versions
    const [versions] = await pool.query(
      `SELECT av.*, u.name as proposed_by_name, u.role as proposed_by_role
       FROM agreement_versions av
       JOIN users u ON av.proposed_by_user_id = u.id
       WHERE av.agreement_id = ?
       ORDER BY av.version_number ASC`,
      [agreementId]
    );

    const formattedVersions = versions.map(v => ({
      ...v,
      benefits_included: typeof v.benefits_included === 'string' ? JSON.parse(v.benefits_included || '[]') : v.benefits_included || []
    }));

    // Deliverables
    const [deliverables] = await pool.query(
      `SELECT fd.*, 
        (SELECT COUNT(*) FROM fulfilment_evidence fe WHERE fe.deliverable_id = fd.id) as evidence_count
       FROM fulfilment_deliverables fd
       WHERE fd.agreement_id = ?
       ORDER BY fd.due_date ASC`,
      [agreementId]
    );

    res.json({
      success: true,
      data: {
        agreement,
        versions: formattedVersions,
        deliverables
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function approveAgreement(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const agreementId = req.params.id;
    const userRole = req.user.role;

    const [rows] = await connection.query(
      `SELECT a.*, o.user_id as organizer_user_id, s.user_id as sponsor_user_id, e.name as event_name
       FROM agreements a
       JOIN events e ON a.event_id = e.id
       JOIN organizer_profiles o ON e.organizer_id = o.id
       JOIN sponsor_profiles s ON a.sponsor_id = s.id
       WHERE a.id = ? FOR UPDATE`,
      [agreementId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const agreement = rows[0];

    let organizerApproved = agreement.organizer_approved;
    let sponsorApproved = agreement.sponsor_approved;
    let organizerApprovedAt = agreement.organizer_approved_at;
    let sponsorApprovedAt = agreement.sponsor_approved_at;

    if (userRole === 'organizer') {
      organizerApproved = 1;
      organizerApprovedAt = new Date();
    } else if (userRole === 'sponsor') {
      sponsorApproved = 1;
      sponsorApprovedAt = new Date();
    }

    // Critical Rule: Both parties must approve for mutual approval
    const isMutuallyApproved = Boolean(organizerApproved && sponsorApproved);
    const newStatus = isMutuallyApproved 
      ? 'mutually_approved' 
      : (userRole === 'organizer' ? 'pending_sponsor_approval' : 'pending_organizer_approval');

    // Update agreement
    await connection.query(
      `UPDATE agreements SET
        organizer_approved = ?,
        sponsor_approved = ?,
        organizer_approved_at = ?,
        sponsor_approved_at = ?,
        status = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [organizerApproved, sponsorApproved, organizerApprovedAt, sponsorApprovedAt, newStatus, agreementId]
    );

    // Update latest version approval flags
    const [latestVersion] = await connection.query(
      'SELECT id, benefits_included FROM agreement_versions WHERE agreement_id = ? ORDER BY version_number DESC LIMIT 1',
      [agreementId]
    );
    if (latestVersion.length > 0) {
      const vId = latestVersion[0].id;
      if (userRole === 'organizer') {
        await connection.query('UPDATE agreement_versions SET organizer_approval = 1, organizer_approved_at = NOW() WHERE id = ?', [vId]);
      } else {
        await connection.query('UPDATE agreement_versions SET sponsor_approval = 1, sponsor_approved_at = NOW() WHERE id = ?', [vId]);
      }

      // If just mutually approved, generate fulfilment deliverables from agreed benefits if none exist yet
      if (isMutuallyApproved) {
        const [existingDeliverables] = await connection.query('SELECT id FROM fulfilment_deliverables WHERE agreement_id = ?', [agreementId]);
        if (existingDeliverables.length === 0) {
          const benefits = typeof latestVersion[0].benefits_included === 'string'
            ? JSON.parse(latestVersion[0].benefits_included || '[]')
            : latestVersion[0].benefits_included;

          for (const b of benefits) {
            await connection.query(
              `INSERT INTO fulfilment_deliverables (
                agreement_id, inventory_id, title, description, benefit_type, status, estimated_reach
              ) VALUES (?, ?, ?, ?, ?, 'pending', 10000)`,
              [
                agreementId,
                b.inventory_id || null,
                b.name || b.benefit || 'Sponsorship Deliverable Benefit',
                'Deliverable scheduled according to executed master agreement specifications.',
                b.item_type || 'Branding & Promotion'
              ]
            );
          }
        }
      }
    }

    // Send notifications
    const otherUserId = userRole === 'organizer' ? agreement.sponsor_user_id : agreement.organizer_user_id;
    await createNotification({
      recipientUserId: otherUserId,
      eventId: agreement.event_id,
      purpose: isMutuallyApproved ? 'agreement_mutually_approved' : 'agreement_party_approved',
      idempotencyKey: `notif_agr_${agreementId}_approved_by_${userRole}`,
      title: isMutuallyApproved ? 'Agreement Fully Executed!' : 'Agreement Signed by Counterparty',
      message: isMutuallyApproved 
        ? `Agreement ${agreement.agreement_number} for '${agreement.event_name}' has been mutually approved and is now legally binding.`
        : `${req.user.name} approved agreement ${agreement.agreement_number}. Awaiting your countersignature.`
    });

    await connection.commit();

    res.json({
      success: true,
      message: isMutuallyApproved ? 'Agreement is now mutually approved and active!' : 'Your approval has been recorded.',
      data: {
        agreementId,
        status: newStatus,
        organizerApproved,
        sponsorApproved
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function requestRevision(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const agreementId = req.params.id;
    const { revised_price, revised_terms, benefits_included = [], change_summary } = req.body;

    const [rows] = await connection.query('SELECT * FROM agreements WHERE id = ? FOR UPDATE', [agreementId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const agreement = rows[0];
    const newVersionNumber = agreement.current_version + 1;
    const userRole = req.user.role;

    // Critical Rule: Never overwrite original agreed terms! Create a new revision version.
    await connection.query(
      `INSERT INTO agreement_versions (
        agreement_id, version_number, proposed_by_user_id, agreed_price, terms, benefits_included,
        change_summary, organizer_approval, sponsor_approval,
        organizer_approved_at, sponsor_approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agreementId,
        newVersionNumber,
        req.user.id,
        Number(revised_price || agreement.agreed_price),
        revised_terms || 'Revised terms proposed.',
        JSON.stringify(benefits_included),
        change_summary || `Revision requested by ${req.user.name}`,
        userRole === 'organizer' ? 1 : 0,
        userRole === 'sponsor' ? 1 : 0,
        userRole === 'organizer' ? new Date() : null,
        userRole === 'sponsor' ? new Date() : null
      ]
    );

    // Update parent agreement status
    await connection.query(
      `UPDATE agreements SET
        current_version = ?,
        agreed_price = ?,
        status = 'revision_requested',
        organizer_approved = ?,
        sponsor_approved = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        newVersionNumber,
        Number(revised_price || agreement.agreed_price),
        userRole === 'organizer' ? 1 : 0,
        userRole === 'sponsor' ? 1 : 0,
        agreementId
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Revision version #${newVersionNumber} drafted. Requires mutual approval to become effective.`,
      data: { agreementId, versionNumber: newVersionNumber, status: 'revision_requested' }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function cancelAgreement(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const agreementId = req.params.id;
    const { cancellation_reason } = req.body;

    const [rows] = await connection.query('SELECT * FROM agreements WHERE id = ? FOR UPDATE', [agreementId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const agreement = rows[0];

    // Critical Rule: Release inventory when cancellation becomes effective and preserve history
    const releasedCount = await releaseInventoryForAgreement(connection, agreementId);

    // Update agreement status
    await connection.query(
      `UPDATE agreements SET
        status = 'cancelled',
        cancellation_reason = ?,
        cancelled_by_user_id = ?,
        cancelled_at = NOW(),
        updated_at = NOW()
       WHERE id = ?`,
      [cancellation_reason || 'Cancelled per terms', req.user.id, agreementId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Agreement cancelled. ${releasedCount} inventory reservations successfully released back to the event pool.`,
      data: { agreementId, status: 'cancelled', releasedReservations: releasedCount }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function getAiAgreementSummary(req, res, next) {
  try {
    const agreementId = req.params.id;
    const [rows] = await pool.query('SELECT * FROM agreements WHERE id = ?', [agreementId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const summary = await summarizeAgreement(rows[0]);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

export async function compareVersions(req, res, next) {
  try {
    const { versionAId, versionBId } = req.body;

    const [vA] = await pool.query('SELECT * FROM agreement_versions WHERE id = ?', [versionAId]);
    const [vB] = await pool.query('SELECT * FROM agreement_versions WHERE id = ?', [versionBId]);

    if (vA.length === 0 || vB.length === 0) {
      return res.status(404).json({ success: false, message: 'One or both versions not found' });
    }

    const comparison = await compareAgreementVersions(vA[0], vB[0]);
    res.json({ success: true, data: comparison });
  } catch (error) {
    next(error);
  }
}
