import pool from '../config/database.js';
import { callOllama } from './ollamaService.js';

const COMMITTEE_TYPES = [
  'Water',
  'Security',
  'Transport',
  'Food',
  'Medical',
  'Logistics',
  'Event Operations'
];

/**
 * Determine which committee type the user is asking about (if any)
 */
export function detectCommitteeType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('water') || lower.includes('hydration') || lower.includes('drinking water')) {
    return 'Water';
  }
  if (lower.includes('security') || lower.includes('guard') || lower.includes('police') || lower.includes('badge') || lower.includes('access control')) {
    return 'Security';
  }
  if (lower.includes('transport') || lower.includes('shuttle') || lower.includes('transit') || lower.includes('bus') || lower.includes('parking') || lower.includes('airport')) {
    return 'Transport';
  }
  if (lower.includes('food') || lower.includes('catering') || lower.includes('meal') || lower.includes('lunch') || lower.includes('dining') || lower.includes('beverage')) {
    return 'Food';
  }
  if (lower.includes('medical') || lower.includes('doctor') || lower.includes('first aid') || lower.includes('ambulance') || lower.includes('emergency') || lower.includes('health')) {
    return 'Medical';
  }
  if (lower.includes('logistics') || lower.includes('loading dock') || lower.includes('freight') || lower.includes('shipment') || lower.includes('booth delivery') || lower.includes('av setup')) {
    return 'Logistics';
  }
  if (lower.includes('operations') || lower.includes('event ops') || lower.includes('floor manager') || lower.includes('stage') || lower.includes('auditorium') || lower.includes('schedule')) {
    return 'Event Operations';
  }
  return null;
}

/**
 * Identify or clarify the event context from thread or message text
 */
export async function resolveEventContext(threadEventId, messageText) {
  if (threadEventId) {
    const [events] = await pool.query('SELECT id, name, organizer_id FROM events WHERE id = ?', [threadEventId]);
    if (events.length > 0) return { event: events[0], isAmbiguous: false };
  }

  // If no thread event ID, search event names in message text
  const [allEvents] = await pool.query('SELECT id, name, organizer_id FROM events WHERE status = "published"');
  const matched = allEvents.filter(e => messageText.toLowerCase().includes(e.name.toLowerCase()));

  if (matched.length === 1) {
    return { event: matched[0], isAmbiguous: false };
  }

  return { event: null, isAmbiguous: true, availableEvents: allEvents.map(e => ({ id: e.id, name: e.name })) };
}

/**
 * Classify incoming message intent and risk level
 */
export async function classifyMessage(messageText) {
  const lower = messageText.toLowerCase();

  // Check for committee inquiries first
  const committeeType = detectCommitteeType(lower);
  if (committeeType && (lower.includes('contact') || lower.includes('person') || lower.includes('phone') || lower.includes('email') || lower.includes('reach') || lower.includes('in charge') || lower.includes('who is') || lower.includes('hours') || lower.includes('help'))) {
    return {
      classification: 'contact_inquiry',
      isHighRisk: false,
      committeeType,
      reason: `Inquiry regarding verified ${committeeType} committee contact.`
    };
  }

  // Check for high-risk pricing, negotiation, commitments
  const pricingKeywords = ['discount', 'reduce price', 'cheaper', 'negotiate', 'offer', 'counteroffer', 'payment plan', 'installment', 'refund', 'waive fee'];
  const agreementKeywords = ['contract', 'agreement', 'clause', 'terms', 'legal commitment', 'liability', 'deliverables guarantee', 'exclusive sponsor'];
  const commitmentKeywords = ['guarantee', 'promise', 'commit', 'must assure', 'lock in', 'holding slot'];

  for (const kw of pricingKeywords) {
    if (lower.includes(kw)) {
      return {
        classification: 'high_risk_pricing',
        isHighRisk: true,
        reason: `Financial negotiation detected (${kw}). Requires organizer approval before sending.`
      };
    }
  }

  for (const kw of agreementKeywords) {
    if (lower.includes(kw)) {
      return {
        classification: 'high_risk_agreement',
        isHighRisk: true,
        reason: `Contractual or legal terms inquiry detected (${kw}). Requires organizer approval.`
      };
    }
  }

  for (const kw of commitmentKeywords) {
    if (lower.includes(kw)) {
      return {
        classification: 'high_risk_commitment',
        isHighRisk: true,
        reason: `Commitment or guarantee requested (${kw}). Organizer review required.`
      };
    }
  }

  // Feedback & requirements
  if (lower.includes('require') || lower.includes('we need') || lower.includes('our booth') || lower.includes('dietary') || lower.includes('speaking slot') || lower.includes('feedback')) {
    return {
      classification: 'feedback',
      isHighRisk: false,
      reason: 'Sponsor feedback or technical requirement note.'
    };
  }

  // Use LLM classification if available for edge cases
  try {
    const prompt = `Classify this message from a sponsor to an event organizer:
Message: "${messageText}"

Respond ONLY with JSON:
{
  "classification": "routine" | "contact_inquiry" | "high_risk_pricing" | "high_risk_agreement" | "high_risk_commitment" | "uncertain",
  "isHighRisk": boolean,
  "reason": "short explanation"
}`;
    const llmRes = await callOllama({ prompt, format: 'json', timeoutMs: 4000 });
    if (llmRes.success && llmRes.data?.classification) {
      return {
        classification: llmRes.data.classification,
        isHighRisk: Boolean(llmRes.data.isHighRisk),
        reason: llmRes.data.reason || 'Classified by AI policy engine.'
      };
    }
  } catch (err) {
    // Fall back to routine
  }

  return {
    classification: 'routine',
    isHighRisk: false,
    reason: 'Standard informational question.'
  };
}

/**
 * Extract sponsor requirements and store in database
 */
export async function extractAndSaveRequirements({ conversationId, sponsorId, eventId, messageText }) {
  const lower = messageText.toLowerCase();
  let category = 'other';
  if (lower.includes('booth') || lower.includes('space') || lower.includes('sq ft') || lower.includes('sqm')) category = 'booth_space';
  else if (lower.includes('logo') || lower.includes('branding') || lower.includes('banner') || lower.includes('signage')) category = 'branding';
  else if (lower.includes('speaking') || lower.includes('keynote') || lower.includes('panel')) category = 'speaking';
  else if (lower.includes('pass') || lower.includes('ticket') || lower.includes('vip')) category = 'vip_passes';
  else if (lower.includes('food') || lower.includes('diet') || lower.includes('vegan') || lower.includes('meal')) category = 'catering_dietary';
  else if (lower.includes('power') || lower.includes('wifi') || lower.includes('av') || lower.includes('audio') || lower.includes('projector')) category = 'technical_av';
  else if (lower.includes('committee') || lower.includes('security') || lower.includes('water')) category = 'committee_support';

  let sentiment = 'neutral';
  if (lower.includes('great') || lower.includes('excited') || lower.includes('pleased')) sentiment = 'positive';
  else if (lower.includes('urgent') || lower.includes('asap') || lower.includes('emergency')) sentiment = 'urgent';
  else if (lower.includes('concerned') || lower.includes('delay') || lower.includes('issue') || lower.includes('problem')) sentiment = 'concerned';

  try {
    await pool.query(
      `INSERT INTO conversation_sponsor_requirements 
       (conversation_id, sponsor_id, event_id, category, requirement_text, sentiment, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [conversationId, sponsorId, eventId || null, category, messageText, sentiment]
    );
  } catch (err) {
    console.warn('[RequirementExtractor] Failed to store requirement:', err.message);
  }
}

/**
 * Handle committee contact inquiries with strict anti-hallucination policy
 */
export async function handleCommitteeInquiry({ event, committeeType, sponsorUser }) {
  if (!event) {
    return {
      autoReply: true,
      text: `[AI Event Committee Assistant] To provide you with the correct verified committee contact details, could you please specify which event you are inquiring about?`,
      classification: 'contact_inquiry',
      isApproved: true
    };
  }

  // Retrieve strictly verified and active contact from database
  const [contacts] = await pool.query(
    `SELECT contact_person, email, phone, working_hours, notes 
     FROM event_committee_contacts 
     WHERE event_id = ? AND committee_type = ? AND is_verified = 1 AND is_active = 1`,
    [event.id, committeeType]
  );

  if (contacts.length === 0) {
    // Strict policy: NEVER hallucinate contacts if missing or unverified
    return {
      autoReply: true,
      text: `[AI Event Committee Assistant] The verified contact information for the ${committeeType} committee of "${event.name}" is currently unavailable or pending official organizer verification. We have logged your inquiry and alerted the event organizer to assist you directly.`,
      classification: 'contact_inquiry',
      isApproved: true,
      referredToOrganizer: true
    };
  }

  const c = contacts[0];
  const replyText = `[AI Event Committee Assistant] Here are the verified contact details for the ${committeeType} Committee of "${event.name}":\n\n` +
    `• Contact Person: ${c.contact_person}\n` +
    `• Email: ${c.email}\n` +
    `• Phone: ${c.phone}\n` +
    `• Working Hours: ${c.working_hours || '9:00 AM - 6:00 PM'}\n` +
    (c.notes ? `• Notes: ${c.notes}\n` : '') +
    `\nAll contact information is verified by the event organizing team.`;

  return {
    autoReply: true,
    text: replyText,
    classification: 'contact_inquiry',
    isApproved: true,
    contactData: c
  };
}

/**
 * Generate proposed draft for high-risk queries requiring organizer approval
 */
export async function generateHighRiskDraft({ event, sponsorUser, messageText, classification, reason }) {
  let draftText = `Thank you for reaching out regarding ${event ? `"${event.name}"` : 'the event sponsorship'}. We have received your inquiry regarding our sponsorship terms. Our organizing team is reviewing your request in detail, and an authorized representative will follow up with you shortly with formal details.`;

  try {
    const prompt = `You are an AI assistant drafting a polite, professional response on behalf of an event organizer for a sponsor's inquiry.
CRITICAL SAFETY RULES:
- Never commit to specific discounts, guarantees, or prices without organizer sign-off.
- Acknowledge their specific question professionally.
- Inform them that the organizer is reviewing the parameters.
- Keep the tone courteous and collaborative.

Event: ${event ? event.name : 'Sponsorship Event'}
Sponsor Message: "${messageText}"
Risk Reason: "${reason}"

Draft a clear response (1-2 paragraphs):`;

    const res = await callOllama({ prompt, format: 'text', timeoutMs: 5000 });
    if (res.success && res.data && typeof res.data === 'string' && res.data.trim().length > 20) {
      draftText = res.data.trim();
    }
  } catch (err) {
    console.warn('[DraftGen] Falling back to default high-risk draft template.');
  }

  return {
    isHighRisk: true,
    draftText,
    classification,
    approvalStatus: 'pending_approval',
    reason
  };
}
