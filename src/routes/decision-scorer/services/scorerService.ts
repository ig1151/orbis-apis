import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export async function scoreDecision(decision: string, context: string = '', goal: string = '') {
  const prompt = `You are a decision analysis expert. Analyze the following decision and provide a structured risk and quality assessment.

Decision: ${decision}
${context ? `Context: ${context}` : ''}
${goal ? `Goal: ${goal}` : ''}

Return ONLY valid JSON with this exact structure:
{
  "score": <0-100>,
  "rating": "excellent|good|fair|poor|critical",
  "confidence": "high|medium|low",
  "summary": "<2-3 sentence assessment>",
  "pros": ["<pro1>", "<pro2>", "<pro3>"],
  "cons": ["<con1>", "<con2>", "<con3>"],
  "risks": ["<risk1>", "<risk2>"],
  "recommendation": "proceed|proceed_with_caution|reconsider|avoid",
  "alternatives": ["<alternative1>", "<alternative2>"]
}`;

  const aiRes = await axios.post(`${OPENROUTER_BASE}/chat/completions`, {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const raw = aiRes.data.choices?.[0]?.message?.content || '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let analysis = {};
  try { analysis = JSON.parse(cleaned); } catch { analysis = { error: 'Failed to parse', raw }; }

  return {
    decision,
    context: context || null,
    goal: goal || null,
    analysis,
    scored_at: new Date().toISOString(),
  };
}
