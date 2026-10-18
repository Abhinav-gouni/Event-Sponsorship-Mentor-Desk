import { callOllama, pingOllama } from '../services/ollamaService.js';

export async function checkAiHealth(req, res, next) {
  try {
    const health = await pingOllama();
    res.json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
}

export async function chatAssistant(req, res, next) {
  try {
    const { message, context = {} } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message prompt is required.' });
    }

    const systemPrompt = `You are the C34 Event Sponsorship Match Desk AI Advisor.
You specialize in commercial deal structuring, sponsor valuation, contribution margins, and brand alignment.
User Role: ${req.user.role}.
Always be concise, professional, data-driven, and actionable. Return a JSON response:
{
  "reply": "Clear, direct guidance or answer to the user query",
  "suggested_actions": ["Actionable step 1", "Actionable step 2"],
  "key_metrics": "Relevant financial or reach metrics if applicable"
}`;

    const prompt = `Context: ${JSON.stringify(context)}\nUser Query: ${message}`;
    const result = await callOllama({ prompt, system: systemPrompt, timeoutMs: 60000 });

    if (result.success && result.data) {
      return res.json({
        success: true,
        data: {
          ...result.data,
          is_ai_generated: true,
          model: result.model
        }
      });
    }

    // Fallback response if Ollama is busy or down
    res.json({
      success: true,
      data: {
        reply: `Here is the platform guidance: Ensure you maintain at least a 40% contribution margin on packages (e.g., ₹30k revenue with ₹18k cost yields ₹12k contribution). Always verify category exclusivity before committing keynotes or stage naming.`,
        suggested_actions: [
          'Review available inventory items and costs in the Package Builder',
          'Use the What-If Calculator to simulate margins before sending counteroffers'
        ],
        key_metrics: 'Target Margin: >= 40.0%',
        is_ai_generated: false
      }
    });
  } catch (error) {
    next(error);
  }
}
