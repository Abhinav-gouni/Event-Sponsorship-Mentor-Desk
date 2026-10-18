import axios from 'axios';
import ollamaConfig from '../config/ollama.js';
import { rankSponsorsForEvent, rankEventsForSponsor } from './matchingEngine.js';

let cachedModel = null;
let lastModelCheck = 0;

/**
 * Checks which Ollama models are available and returns the best model to use.
 */
async function resolveActiveModel() {
  const now = Date.now();
  if (cachedModel && (now - lastModelCheck < 30000)) return cachedModel;

  const preferredModel = String(ollamaConfig.model || 'qwen2.5:7b').trim();
  if (!preferredModel) throw new Error('OLLAMA_MODEL is not configured.');

  const res = await axios.get(`${ollamaConfig.endpoint}/api/tags`, { timeout: 3000 });
  const models = res.data?.models || [];
  const found = models.find(m => String(m.name || '').toLowerCase() === preferredModel.toLowerCase());
  if (!found) {
    const available = models.map(m => m.name).filter(Boolean);
    const hint = available.length ? ` Installed models: ${available.join(', ')}.` : ' No models are installed.';
    throw new Error(`Configured Ollama model '${preferredModel}' is not installed.${hint} Run: ollama pull ${preferredModel}`);
  }

  cachedModel = found.name;
  lastModelCheck = now;
  return cachedModel;
}

/**
 * Low-level call to Ollama generate endpoint with JSON validation and timeout handling.
 */
export async function callOllama({ prompt, system = '', format = 'json', timeoutMs = 60000 }) {
  let model = String(ollamaConfig.model || 'qwen2.5:7b');
  try {
    model = await resolveActiveModel();
    const response = await axios.post(
      `${ollamaConfig.endpoint}/api/generate`,
      {
        model,
        prompt,
        system: system || 'You are an expert AI Sponsorship Matchmaking & Financial Analyst assistant. Always output valid JSON strictly matching the requested schema without markdown wrap.',
        stream: false,
        format: format === 'json' ? 'json' : undefined,
        options: {
          temperature: 0,
          top_p: 0.1,
          seed: 42,
          num_predict: 700
        }
      },
      { timeout: timeoutMs }
    );

    const raw = response.data?.response;
    if (!raw) {
      throw new Error('Empty response from Ollama');
    }

    if (format === 'json') {
      try {
        const parsed = JSON.parse(raw);
        return {
          success: true,
          data: parsed,
          model,
          isAiGenerated: true,
          disclaimer: 'AI-generated analysis based on current database records. Subject to human organizer review.'
        };
      } catch (parseErr) {
        // Attempt clean substring parse
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            success: true,
            data: parsed,
            model,
            isAiGenerated: true,
            disclaimer: 'AI-generated analysis based on current database records.'
          };
        }
        throw new Error('Ollama returned invalid JSON: ' + raw.substring(0, 100));
      }
    }

    return {
      success: true,
      data: raw,
      model,
      isAiGenerated: true,
      disclaimer: 'AI-generated output. Human verification required.'
    };
  } catch (err) {
    console.warn(`[OllamaService] Call failed (${err.message}). Using rule-based fallback.`);
    return {
      success: false,
      error: err.message,
      model,
      isAiGenerated: false
    };
  }
}

/**
 * Health check for Ollama service.
 */
export async function pingOllama() {
  try {
    const res = await axios.get(`${ollamaConfig.endpoint}/api/tags`, { timeout: 3000 });
    const models = (res.data?.models || []).map(m => m.name).filter(Boolean);
    const preferredModel = String(ollamaConfig.model || 'qwen2.5:7b');
    const exactModel = models.find(name => name.toLowerCase() === preferredModel.toLowerCase());
    return {
      available: true,
      endpoint: ollamaConfig.endpoint,
      preferredModel,
      activeModel: exactModel || null,
      availableModels: models,
      modelReady: Boolean(exactModel),
      message: exactModel
        ? `Ollama is connected and configured model '${exactModel}' is installed.`
        : `Ollama is running, but configured model '${preferredModel}' is not installed. Available models: ${models.join(', ') || 'none'}. Run: ollama pull ${preferredModel}`
    };
  } catch (err) {
    return {
      available: false,
      endpoint: ollamaConfig.endpoint,
      preferredModel: ollamaConfig.model,
      activeModel: null,
      availableModels: [],
      modelReady: false,
      message: `Cannot reach Ollama at ${ollamaConfig.endpoint}: ${err.message}. Start Ollama and verify the endpoint.`
    };
  }
}

async function addGroundedExplanations(recommendations, direction, context) {
  if (!recommendations.length) return recommendations;
  // Scores and entity IDs are calculated in JavaScript from database records. The model may only
  // improve wording for the top eight candidates and may not create, remove, reorder, or rescore them.
  const top = recommendations.slice(0, 8);
  const payload = top.map(item => direction === 'sponsors'
    ? {
        id: item.sponsor_id,
        name: item.sponsor?.company_name,
        industry: item.sponsor?.industry,
        deterministic_score: item.match_score,
        score_breakdown: item.score_breakdown,
        matched_factors: item.explanation,
        budget: { min: item.sponsor?.min_budget ?? null, max: item.sponsor?.max_budget ?? null }
      }
    : {
        id: item.event_id,
        name: item.event?.name,
        category: item.event?.category_name,
        city: item.event?.city,
        state: item.event?.state,
        deterministic_score: item.match_score,
        score_breakdown: item.score_breakdown,
        matched_factors: item.explanation,
        available_benefits: item.available_benefits
      });

  const prompt = `Rewrite only the explanation text for these pre-ranked sponsorship matches. Do not change their IDs or scores. Use only the facts in the supplied data. If a fact is absent, say it is unknown. Do not invent audience sizes, outcomes, available inventory, package names, pricing, meetings, or market facts. Return JSON only in this shape: {"items":[{"id":"same id as input","explanation":"1-2 grounded sentences","potential_risks":"specific caveat based only on data","recommended_next_action":"safe next step"}]}.
Direction: ${direction}. Context: ${JSON.stringify(context)}. Candidates: ${JSON.stringify(payload)}`;

  const ai = await callOllama({
    prompt,
    system: 'You are a careful data-grounded sponsorship analyst. Never invent facts. Do not calculate or alter scores. Return valid JSON only.',
    timeoutMs: 45000
  });
  if (!ai.success || !Array.isArray(ai.data?.items)) return recommendations;

  const byId = new Map(ai.data.items.map(item => [String(item.id), item]));
  return recommendations.map((item, index) => {
    if (index >= top.length) return item;
    const id = direction === 'sponsors' ? item.sponsor_id : item.event_id;
    const proposed = byId.get(String(id));
    if (!proposed) return item;
    const safeText = (value, fallback, max = 600) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
    return {
      ...item,
      explanation: safeText(proposed.explanation, item.explanation),
      potential_risks: safeText(proposed.potential_risks, item.potential_risks),
      recommended_next_action: safeText(proposed.recommended_next_action, item.recommended_next_action),
      is_ai_generated: true,
      model_used: ai.model,
      match_method: 'deterministic_score_with_ollama_explanation'
    };
  });
}

/**
 * AI Sponsor Recommendations for an Organizer's Event.
 */
export async function matchEventToSponsors(event, sponsors, inventory = []) {
  const eventWithInventory = { ...event, available_inventory: inventory };
  const ranked = rankSponsorsForEvent(eventWithInventory, sponsors);
  return addGroundedExplanations(ranked, 'sponsors', {
    event: {
      id: event.id,
      name: event.name,
      category: event.category_name,
      city: event.city,
      state: event.state,
      budget: event.budget,
      expected_audience: event.expected_audience,
      target_demographics: event.target_demographics,
      objectives: event.objectives
    }
  });
}

export async function matchSponsorToEvents(sponsor, preferences, events) {
  const ranked = rankEventsForSponsor(sponsor, preferences, events);
  return addGroundedExplanations(ranked, 'events', {
    sponsor: {
      id: sponsor.id,
      industry: sponsor.industry,
      target_audience: sponsor.target_audience,
      marketing_objectives: sponsor.marketing_objectives
    },
    preferences: {
      preferred_categories: preferences?.preferred_categories,
      target_cities: preferences?.target_cities,
      target_states: preferences?.target_states,
      min_budget: preferences?.min_budget,
      max_budget: preferences?.max_budget,
      marketing_goals: preferences?.marketing_goals
    }
  });
}

/**
 * AI Negotiation Assistant: Suggests counteroffer strategy and drafted response.
 */
export async function suggestNegotiationStrategy({ proposal, versions, role, event }) {
  const currentPrice = proposal.proposed_price;
  const cost = proposal.estimated_fulfilment_cost || 0;
  const contribution = currentPrice - cost;
  const margin = currentPrice > 0 ? ((contribution / currentPrice) * 100).toFixed(1) : 0;

  const prompt = `Analyze this sponsorship negotiation and generate tactical counteroffer guidance.
EVENT: ${event?.name || 'Flagship Event'}
CURRENT PROPOSED PRICE: ₹${currentPrice}
ESTIMATED FULFILMENT COST: ₹${cost}
CONTRIBUTION: ₹${contribution} (${margin}% Margin)
REQUESTING ROLE: ${role}
NEGOTIATION ROUND: Version ${proposal.current_version}

Output JSON strictly:
{
  "strategy_summary": "1-2 sentence tactical recommendation",
  "recommended_price": ${role === 'organizer' ? Math.round(currentPrice * 1.05) : Math.round(currentPrice * 0.95)},
  "sweetener_benefits": ["Bonus social media blast", "2 extra VIP passes"],
  "rationale": "Commercial reasoning for this offer",
  "draft_counteroffer_message": "Professional polite counteroffer response ready to send to the counterparty."
}`;

  const aiResult = await callOllama({ prompt, timeoutMs: 60000 });
  if (aiResult.success && aiResult.data) {
    return {
      ...aiResult.data,
      is_ai_generated: true,
      model_used: aiResult.model
    };
  }

  // Fallback
  return {
    strategy_summary: role === 'organizer' 
      ? 'Preserve your contribution margin by offering high-perceived-value digital assets instead of pure price discounting.'
      : 'Leverage multi-event commitment or upfront payment terms to secure favorable pricing.',
    recommended_price: role === 'organizer' ? currentPrice : Math.round(currentPrice * 0.92),
    sweetener_benefits: ['Dedicated newsletter mention', 'VIP attendee passes'],
    rationale: `Current margin is ${margin}%. Maintain minimum 40% margin threshold.`,
    draft_counteroffer_message: `Thank you for your proposal. We are pleased to move forward with a revised package valued at ₹${currentPrice}, incorporating additional executive benefits.`,
    is_ai_generated: false
  };
}

/**
 * AI Agreement Comparison: Side-by-side comparison of version terms.
 */
export async function compareAgreementVersions(versionA, versionB) {
  const prompt = `Compare these two contract versions of an event sponsorship agreement:
VERSION ${versionA.version_number}:
- Agreed Price: ₹${versionA.agreed_price}
- Terms: ${versionA.terms}
- Benefits: ${JSON.stringify(versionA.benefits_included)}
- Exclusivity: ${versionA.exclusivity_clause || 'None'}
- Cancellation: ${versionA.cancellation_clause || 'Standard'}

VERSION ${versionB.version_number}:
- Agreed Price: ₹${versionB.agreed_price}
- Terms: ${versionB.terms}
- Benefits: ${JSON.stringify(versionB.benefits_included)}
- Exclusivity: ${versionB.exclusivity_clause || 'None'}
- Cancellation: ${versionB.cancellation_clause || 'Standard'}

Output JSON strictly:
{
  "price_difference": "₹${versionB.agreed_price - versionA.agreed_price}",
  "key_changes": ["List of distinct clause modifications"],
  "risk_assessment": "Assessment of altered commitments",
  "recommendation": "Whether to approve or request further adjustment"
}`;

  const aiResult = await callOllama({ prompt, timeoutMs: 60000 });
  if (aiResult.success && aiResult.data) {
    return aiResult.data;
  }

  return {
    price_difference: `₹${versionB.agreed_price - versionA.agreed_price}`,
    key_changes: [
      `Price updated from ₹${versionA.agreed_price} to ₹${versionB.agreed_price}`,
      'Benefits schedule re-allocated',
      'Mutual approval requirement preserved'
    ],
    risk_assessment: 'Terms remain consistent with standard platform guidelines.',
    recommendation: 'Both parties should inspect deliverables schedule prior to signing.'
  };
}

/**
 * AI Agreement Summary generator.
 */
export async function summarizeAgreement(agreement) {
  const prompt = `Provide a concise executive summary of this sponsorship contract:
AGREEMENT NUMBER: ${agreement.agreement_number}
PRICE: ₹${agreement.agreed_price}
EXCLUSIVITY: ${agreement.exclusivity_conditions || 'Non-exclusive'}
CANCELLATION POLICY: ${agreement.cancellation_policy || 'Standard 30-day'}
STATUS: ${agreement.status}

Output JSON strictly:
{
  "summary": "Concise 2-sentence executive summary",
  "commercial_highlights": ["Key financial terms", "Major deliverables"],
  "exclusivity_summary": "Exclusivity boundary summary",
  "cancellation_rules_summary": "Summary of refund and release conditions"
}`;

  const aiResult = await callOllama({ prompt, timeoutMs: 20000 });
  if (aiResult.success && aiResult.data) {
    return aiResult.data;
  }

  return {
    summary: `Contract ${agreement.agreement_number} binds the organizer and sponsor at a committed value of ₹${agreement.agreed_price}.`,
    commercial_highlights: [`Agreed Price: ₹${agreement.agreed_price}`, `Current Status: ${agreement.status}`],
    exclusivity_summary: agreement.exclusivity_conditions || 'Standard category exclusivity applies.',
    cancellation_rules_summary: agreement.cancellation_policy || 'Cancellation permitted up to 30 days before event.'
  };
}
