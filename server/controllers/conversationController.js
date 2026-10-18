import pool from '../config/database.js';
import {
  classifyMessage,
  resolveEventContext,
  handleCommitteeInquiry,
  generateHighRiskDraft,
  extractAndSaveRequirements
} from '../services/conversationAiService.js';

/**
 * List threads for current user (sponsor or organizer)
 */
export async function getThreads(req, res, next) {
  try {
    const user = req.user;
    let query;
    let params;

    if (user.role === 'sponsor') {
      query = `
        SELECT t.*, e.name as event_name, org_u.name as organizer_name, org_u.email as organizer_email,
          (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = t.id AND m.approval_status != 'pending_approval') as message_count,
          (SELECT m.message_text FROM conversation_messages m WHERE m.conversation_id = t.id AND m.approval_status != 'pending_approval' ORDER BY m.created_at DESC LIMIT 1) as last_message_snippet
        FROM conversation_threads t
        LEFT JOIN events e ON t.event_id = e.id
        LEFT JOIN users org_u ON t.organizer_id = org_u.id
        WHERE t.sponsor_id = ?
        ORDER BY t.last_message_at DESC
      `;
      params = [user.id];
    } else if (user.role === 'organizer') {
      query = `
        SELECT t.*, e.name as event_name, sp_u.name as sponsor_name, sp_u.email as sponsor_email, sp_p.company_name as sponsor_company,
          (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = t.id) as message_count,
          (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = t.id AND m.approval_status = 'pending_approval') as pending_approvals_count,
          (SELECT m.message_text FROM conversation_messages m WHERE m.conversation_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message_snippet
        FROM conversation_threads t
        LEFT JOIN events e ON t.event_id = e.id
        LEFT JOIN users sp_u ON t.sponsor_id = sp_u.id
        LEFT JOIN sponsor_profiles sp_p ON sp_p.user_id = sp_u.id
        WHERE t.organizer_id = ?
        ORDER BY t.last_message_at DESC
      `;
      params = [user.id];
    } else {
      // Admin sees all
      query = `
        SELECT t.*, e.name as event_name, sp_u.name as sponsor_name, org_u.name as organizer_name,
          (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = t.id) as message_count,
          (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = t.id AND m.approval_status = 'pending_approval') as pending_approvals_count
        FROM conversation_threads t
        LEFT JOIN events e ON t.event_id = e.id
        LEFT JOIN users sp_u ON t.sponsor_id = sp_u.id
        LEFT JOIN users org_u ON t.organizer_id = org_u.id
        ORDER BY t.last_message_at DESC
      `;
      params = [];
    }

    const [threads] = await pool.query(query, params);
    res.json({ success: true, data: threads });
  } catch (error) {
    next(error);
  }
}

/**
 * Get messages for a thread.
 * Sponsors strictly cannot view messages where approval_status = 'pending_approval'.
 */
export async function getThreadMessages(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const [threads] = await pool.query(
      `SELECT t.*, e.name as event_name, sp_u.name as sponsor_name, org_u.name as organizer_name 
       FROM conversation_threads t
       LEFT JOIN events e ON t.event_id = e.id
       LEFT JOIN users sp_u ON t.sponsor_id = sp_u.id
       LEFT JOIN users org_u ON t.organizer_id = org_u.id
       WHERE t.id = ?`,
      [id]
    );

    if (threads.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation thread not found.' });
    }

    const thread = threads[0];

    // Verify participant
    if (user.role !== 'admin' && thread.sponsor_id !== user.id && thread.organizer_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this conversation.' });
    }

    let query;
    let params;

    if (user.role === 'sponsor') {
      // Security Gate: NEVER expose unapproved drafts to sponsors
      query = `
        SELECT m.*, u.name as sender_name 
        FROM conversation_messages m
        JOIN users u ON m.sender_user_id = u.id
        WHERE m.conversation_id = ? 
          AND (m.approval_status != 'pending_approval' OR m.approval_status IS NULL)
        ORDER BY m.created_at ASC
      `;
      params = [id];
    } else {
      // Organizers and Admins can see all messages including pending drafts
      query = `
        SELECT m.*, u.name as sender_name, approver.name as approved_by_name
        FROM conversation_messages m
        JOIN users u ON m.sender_user_id = u.id
        LEFT JOIN users approver ON m.approved_by_user_id = approver.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `;
      params = [id];
    }

    const [messages] = await pool.query(query, params);

    res.json({
      success: true,
      thread,
      data: messages
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Start a new thread
 */
export async function createThread(req, res, next) {
  try {
    const user = req.user;
    const { event_id, organizer_id, sponsor_id, subject = 'Sponsorship Inquiry' } = req.body;

    let finalSponsorId = user.role === 'sponsor' ? user.id : sponsor_id;
    let finalOrganizerId = user.role === 'organizer' ? user.id : organizer_id;

    if (!finalOrganizerId && event_id) {
      const [ev] = await pool.query(
        'SELECT e.id, o.user_id as organizer_user_id FROM events e JOIN organizer_profiles o ON e.organizer_id = o.id WHERE e.id = ?',
        [event_id]
      );
      if (ev.length > 0) {
        finalOrganizerId = ev[0].organizer_user_id;
      }
    }

    if (!finalSponsorId || !finalOrganizerId) {
      return res.status(400).json({ success: false, message: 'sponsor_id and organizer_id are required to start a thread.' });
    }

    // Check if an active thread already exists for this event and pair
    const [existing] = await pool.query(
      'SELECT id FROM conversation_threads WHERE sponsor_id = ? AND organizer_id = ? AND (event_id = ? OR (event_id IS NULL AND ? IS NULL)) AND status = "active"',
      [finalSponsorId, finalOrganizerId, event_id || null, event_id || null]
    );

    if (existing.length > 0) {
      return res.json({ success: true, message: 'Existing conversation found.', threadId: existing[0].id });
    }

    const [result] = await pool.query(
      'INSERT INTO conversation_threads (event_id, sponsor_id, organizer_id, subject, status) VALUES (?, ?, ?, ?, "active")',
      [event_id || null, finalSponsorId, finalOrganizerId, subject]
    );

    res.status(201).json({
      success: true,
      message: 'Conversation thread created successfully.',
      threadId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send a message in a thread with AI policy routing
 */
export async function postMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { message_text } = req.body;
    const user = req.user;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const [threads] = await pool.query('SELECT * FROM conversation_threads WHERE id = ?', [id]);
    if (threads.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation thread not found.' });
    }

    const thread = threads[0];
    if (user.role !== 'admin' && thread.sponsor_id !== user.id && thread.organizer_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to post in this conversation.' });
    }

    // 1. Save sender's message
    const senderRole = user.role === 'sponsor' ? 'sponsor' : (user.role === 'organizer' ? 'organizer' : 'sponsor');
    const messageType = senderRole === 'sponsor' ? 'sponsor_message' : 'organizer_message';

    const [msgResult] = await pool.query(
      `INSERT INTO conversation_messages 
       (conversation_id, sender_user_id, sender_role, message_text, message_type, classification, is_ai_generated, approval_status)
       VALUES (?, ?, ?, ?, ?, 'routine', 0, 'none')`,
      [id, user.id, senderRole, message_text.trim(), messageType]
    );

    await pool.query('UPDATE conversation_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    const sentMessageId = msgResult.insertId;

    // If message is from organizer, no AI intervention needed
    if (senderRole === 'organizer') {
      const [saved] = await pool.query('SELECT * FROM conversation_messages WHERE id = ?', [sentMessageId]);
      return res.status(201).json({
        success: true,
        message: 'Message sent successfully.',
        data: saved[0]
      });
    }

    // --- SPONSOR MESSAGE PROCESSING PIPELINE ---
    // Extract any requirements / feedback asynchronously
    extractAndSaveRequirements({
      conversationId: thread.id,
      sponsorId: user.id,
      eventId: thread.event_id,
      messageText: message_text
    });

    // Classify intent
    const classificationResult = await classifyMessage(message_text);

    // Update classification on user message
    await pool.query('UPDATE conversation_messages SET classification = ? WHERE id = ?', [
      classificationResult.classification,
      sentMessageId
    ]);

    // Resolve event context
    const eventResolution = await resolveEventContext(thread.event_id, message_text);

    // Scenario 1: Committee Contact Inquiry
    if (classificationResult.classification === 'contact_inquiry') {
      const committeeType = classificationResult.committeeType;
      const committeeResponse = await handleCommitteeInquiry({
        event: eventResolution.event,
        committeeType,
        sponsorUser: user
      });

      // Save AI auto-reply
      const [aiMsgResult] = await pool.query(
        `INSERT INTO conversation_messages 
         (conversation_id, sender_user_id, sender_role, message_text, message_type, classification, is_ai_generated, approval_status)
         VALUES (?, ?, 'ai_assistant', ?, 'ai_auto_reply', 'contact_inquiry', 1, 'none')`,
        [id, thread.organizer_id, committeeResponse.text]
      );

      const [aiMsg] = await pool.query('SELECT * FROM conversation_messages WHERE id = ?', [aiMsgResult.insertId]);

      return res.status(201).json({
        success: true,
        message: 'Message sent and verified committee assistance provided.',
        userMessageId: sentMessageId,
        aiReply: aiMsg[0]
      });
    }

    // Scenario 2: High-Risk Message (Pricing, Counteroffer, Legal/Agreement, Guarantee)
    if (classificationResult.isHighRisk) {
      const draft = await generateHighRiskDraft({
        event: eventResolution.event,
        sponsorUser: user,
        messageText: message_text,
        classification: classificationResult.classification,
        reason: classificationResult.reason
      });

      // Store as pending approval - GATED from sponsor view
      const [draftResult] = await pool.query(
        `INSERT INTO conversation_messages 
         (conversation_id, sender_user_id, sender_role, message_text, message_type, classification, is_ai_generated, approval_status)
         VALUES (?, ?, 'ai_assistant', ?, 'ai_draft_proposed', ?, 1, 'pending_approval')`,
        [id, thread.organizer_id, draft.draftText, classificationResult.classification]
      );

      // Create high-priority organizer notification
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, related_resource_type, related_resource_id)
           VALUES (?, 'system', 'AI Draft Pending Approval', ?, 'conversation_thread', ?)`,
          [thread.organizer_id, `A high-risk inquiry (${classificationResult.classification}) from sponsor requires your review before reply.`, thread.id]
        );
      } catch (e) {
        // notification table fallback
      }

      return res.status(201).json({
        success: true,
        message: 'Your message has been sent. Our organizing team is reviewing your inquiry and will respond shortly.',
        userMessageId: sentMessageId,
        pendingApproval: true,
        notice: 'Draft generated and queued for organizer approval.'
      });
    }

    // Scenario 3: Routine Informational
    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      userMessageId: sentMessageId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all pending approvals for an organizer
 */
export async function getPendingApprovals(req, res, next) {
  try {
    const user = req.user;
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let query;
    let params;

    if (user.role === 'admin') {
      query = `
        SELECT m.*, t.event_id, e.name as event_name, sp_u.name as sponsor_name, sp_u.email as sponsor_email,
          (SELECT prev.message_text FROM conversation_messages prev WHERE prev.conversation_id = m.conversation_id AND prev.created_at < m.created_at ORDER BY prev.created_at DESC LIMIT 1) as sponsor_inquiry
        FROM conversation_messages m
        JOIN conversation_threads t ON m.conversation_id = t.id
        LEFT JOIN events e ON t.event_id = e.id
        JOIN users sp_u ON t.sponsor_id = sp_u.id
        WHERE m.approval_status = 'pending_approval'
        ORDER BY m.created_at ASC
      `;
      params = [];
    } else {
      query = `
        SELECT m.*, t.event_id, e.name as event_name, sp_u.name as sponsor_name, sp_u.email as sponsor_email,
          (SELECT prev.message_text FROM conversation_messages prev WHERE prev.conversation_id = m.conversation_id AND prev.created_at < m.created_at ORDER BY prev.created_at DESC LIMIT 1) as sponsor_inquiry
        FROM conversation_messages m
        JOIN conversation_threads t ON m.conversation_id = t.id
        LEFT JOIN events e ON t.event_id = e.id
        JOIN users sp_u ON t.sponsor_id = sp_u.id
        WHERE m.approval_status = 'pending_approval' AND t.organizer_id = ?
        ORDER BY m.created_at ASC
      `;
      params = [user.id];
    }

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Decide on pending draft approval (Approve, Edit & Approve, Reject)
 */
export async function decideApproval(req, res, next) {
  try {
    const { messageId } = req.params;
    const { decision, finalText, notes } = req.body;
    const user = req.user;

    if (!['approved', 'edited_and_approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Must be "approved", "edited_and_approved", or "rejected".'
      });
    }

    const [msgs] = await pool.query(
      `SELECT m.*, t.organizer_id, t.sponsor_id 
       FROM conversation_messages m
       JOIN conversation_threads t ON m.conversation_id = t.id
       WHERE m.id = ?`,
      [messageId]
    );

    if (msgs.length === 0) {
      return res.status(404).json({ success: false, message: 'Message draft not found.' });
    }

    const message = msgs[0];

    if (user.role !== 'admin' && message.organizer_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to approve messages for this conversation.' });
    }

    if (message.approval_status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Draft is already in status "${message.approval_status}".`
      });
    }

    const originalDraft = message.message_text;
    const resolvedText = (decision === 'edited_and_approved' && finalText) ? finalText.trim() : originalDraft;

    // 1. Update message status
    if (decision === 'rejected') {
      await pool.query(
        `UPDATE conversation_messages 
         SET approval_status = 'rejected', rejection_reason = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [notes || 'Draft rejected by organizer.', user.id, messageId]
      );
    } else {
      await pool.query(
        `UPDATE conversation_messages 
         SET approval_status = ?, message_text = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [decision, resolvedText, user.id, messageId]
      );
    }

    // 2. Insert audit log
    await pool.query(
      `INSERT INTO conversation_approval_audit_logs 
       (message_id, conversation_id, organizer_user_id, decision, original_draft, final_sent_text, decision_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, message.conversation_id, user.id, decision, originalDraft, decision === 'rejected' ? null : resolvedText, notes || null]
    );

    const [updated] = await pool.query('SELECT * FROM conversation_messages WHERE id = ?', [messageId]);

    res.json({
      success: true,
      message: `Draft successfully ${decision.replace(/_/g, ' ')}.`,
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get structured requirements summary for an event
 */
export async function getEventRequirements(req, res, next) {
  try {
    const { eventId } = req.params;
    const user = req.user;

    const [events] = await pool.query('SELECT id, organizer_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (user.role !== 'admin' && user.organizerId !== events[0].organizer_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const [reqs] = await pool.query(
      `SELECT r.*, u.name as sponsor_name, sp.company_name
       FROM conversation_sponsor_requirements r
       JOIN users u ON r.sponsor_id = u.id
       LEFT JOIN sponsor_profiles sp ON sp.user_id = u.id
       WHERE r.event_id = ?
       ORDER BY r.extracted_at DESC`,
      [eventId]
    );

    res.json({ success: true, data: reqs });
  } catch (error) {
    next(error);
  }
}
