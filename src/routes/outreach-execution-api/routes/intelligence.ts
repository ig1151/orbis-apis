import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Outreach Execution API', info: '/outreach-execution/info', openapi: '/outreach-execution/openapi.json', health: 'ok' });
});

router.post('/compose-message', async (req: Request, res: Response) => {
  const { recipient, message_type, purpose, sender_context, tone, max_words, previous_touchpoints = [] } = req.body;
  if (!recipient) return res.status(400).json({ error: 'recipient is required' });
  if (!message_type) return res.status(400).json({ error: 'message_type is required' });
  if (!purpose) return res.status(400).json({ error: 'purpose is required' });
  try {
    const raw = await callClaude(`Compose a personalized outreach message for this recipient. Make it highly relevant to their role and company. Avoid generic language. Be compelling and concise.

Recipient: ${JSON.stringify(recipient)}
Message type: "${message_type}"
Purpose: "${purpose}"
Sender context: "${sender_context || 'not provided'}"
Tone: "${tone || 'professional'}"
Max words: ${max_words || 150}
Previous touchpoints: ${JSON.stringify(previous_touchpoints)}

Return concise JSON:
{
  "subject": "string or null (for email only)",
  "message_body": "string",
  "ps_line": "string or null",
  "message_type": "string",
  "word_count": number,
  "personalization_elements": ["string"],
  "tone_match": "professional|warm|direct|consultative",
  "cta": "string",
  "expected_reply_rate": "high|medium|low",
  "send_timing_recommendation": "string",
  "confidence_per_section": { "message_body": 0-1, "personalization": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/personalize', async (req: Request, res: Response) => {
  const { template, recipient, sender, personalization_depth } = req.body;
  if (!template) return res.status(400).json({ error: 'template is required' });
  if (!recipient) return res.status(400).json({ error: 'recipient is required' });
  try {
    const raw = await callClaude(`Personalize this outreach template for the specific recipient. Replace generic placeholders with specific, relevant content. Make it feel like it was written just for them.

Template: "${template}"
Recipient: ${JSON.stringify(recipient)}
Sender: ${JSON.stringify(sender || {})}
Personalization depth: "${personalization_depth || 'moderate'}"

Return concise JSON:
{
  "personalized_message": "string",
  "subject_line": "string",
  "personalizations": [{ "placeholder": "string", "replacement": "string", "source": "string" }],
  "relevance_score": 0-100,
  "personalization_score": 0-100,
  "hooks_used": [{ "hook": "string", "type": "news|pain_point|mutual_connection|industry_trend|company_milestone" }],
  "recommended_cta": "string",
  "confidence_per_section": { "personalized_message": 0-1, "hooks_used": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sequence-builder', async (req: Request, res: Response) => {
  const { prospect, goal, channels, num_touchpoints, sender_context, product_or_service } = req.body;
  if (!prospect) return res.status(400).json({ error: 'prospect is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!channels) return res.status(400).json({ error: 'channels is required' });
  try {
    const raw = await callClaude(`Build a complete multi-touch outreach sequence for this prospect. Each touchpoint should add new value or angle, not repeat the same ask.

Prospect: ${JSON.stringify(prospect)}
Goal: "${goal}"
Channels: ${JSON.stringify(channels)}
Number of touchpoints: ${num_touchpoints || 5}
Sender context: "${sender_context || 'not provided'}"
Product or service: "${product_or_service || 'not provided'}"

Return concise JSON:
{
  "sequence_id": "string (uuid-style)",
  "goal": "string",
  "total_touchpoints": number,
  "touchpoints": [{ "step": number, "channel": "string", "day": number, "subject": "string or null", "message": "string", "cta": "string", "if_no_response": "string" }],
  "sequence_strategy": "string",
  "exit_conditions": ["string"],
  "expected_reply_rate": "string",
  "optimal_timing": { "best_days": ["string"], "best_times": ["string"] },
  "confidence_per_section": { "touchpoints": 0-1, "optimal_timing": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/timing-optimize', async (req: Request, res: Response) => {
  const { recipient_profile, message_type, urgency, previous_open_times = [], platform } = req.body;
  if (!recipient_profile) return res.status(400).json({ error: 'recipient_profile is required' });
  if (!message_type) return res.status(400).json({ error: 'message_type is required' });
  try {
    const raw = await callClaude(`Determine the optimal timing to send this outreach for maximum open and response rates based on recipient profile and message type.

Recipient profile: ${JSON.stringify(recipient_profile)}
Message type: "${message_type}"
Urgency: "${urgency || 'medium'}"
Previous open times: ${JSON.stringify(previous_open_times)}
Platform: "${platform || 'not specified'}"

Return concise JSON:
{
  "recommended_send_time": "string",
  "timezone": "string",
  "day_of_week": "string",
  "hour_of_day": "string",
  "rationale": "string",
  "alternative_times": [{ "time": "string", "score": 0-100, "rationale": "string" }],
  "avoid_times": [{ "time": "string", "reason": "string" }],
  "follow_up_schedule": [{ "follow_up_number": number, "days_after": number, "recommended_time": "string" }],
  "confidence_per_section": { "recommended_send_time": 0-1, "follow_up_schedule": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/ab-test', async (req: Request, res: Response) => {
  const { variants, test_goal, recipient_segment, success_metric, sample_size } = req.body;
  if (!variants) return res.status(400).json({ error: 'variants is required' });
  if (!test_goal) return res.status(400).json({ error: 'test_goal is required' });
  try {
    const raw = await callClaude(`Analyze these outreach message variants for A/B testing. Predict which will perform best, explain the differences, and recommend testing strategy.

Variants: ${JSON.stringify(variants)}
Test goal: "${test_goal}"
Recipient segment: "${recipient_segment || 'not specified'}"
Success metric: "${success_metric || 'reply_rate'}"
Sample size: ${sample_size || 'not specified'}

Return concise JSON:
{
  "recommended_winner": "string (variant id)",
  "predicted_winner_score": 0-100,
  "variant_analysis": [{ "id": "string", "predicted_open_rate": "string", "predicted_reply_rate": "string", "strengths": ["string"], "weaknesses": ["string"], "score": 0-100 }],
  "key_differentiators": [{ "element": "string", "impact": "high|medium|low" }],
  "test_recommendations": { "min_sample_size": number, "test_duration_days": number, "success_metric": "string", "statistical_significance_target": number },
  "hypothesis": "string",
  "confidence_per_section": { "variant_analysis": 0-1, "test_recommendations": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/response-classify', async (req: Request, res: Response) => {
  const { response_text, original_outreach, channel, context } = req.body;
  if (!response_text) return res.status(400).json({ error: 'response_text is required' });
  if (!original_outreach) return res.status(400).json({ error: 'original_outreach is required' });
  try {
    const raw = await callClaude(`Classify this inbound response to outreach. Determine interest level, intent, and the best next action to take.

Response text: "${response_text}"
Original outreach: "${original_outreach}"
Channel: "${channel || 'not specified'}"
Context: "${context || 'not provided'}"

Return concise JSON:
{
  "classification": "interested|not_interested|timing|referral|auto_reply|unsubscribe|neutral|objection",
  "interest_level": "high|medium|low|none",
  "sentiment": "positive|negative|neutral",
  "intent": "schedule_meeting|request_info|decline|negotiate|passed_to_other|no_intent",
  "key_signals": [{ "signal": "string", "interpretation": "string" }],
  "objections": [{ "objection": "string", "suggested_response": "string" }],
  "urgency": "high|medium|low",
  "recommended_next_action": "string",
  "response_template": "string",
  "follow_up_in_days": number or null,
  "confidence_per_section": { "classification": 0-1, "intent": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/campaign-analytics', async (req: Request, res: Response) => {
  const { campaign_name, metrics, segment, time_period, benchmarks } = req.body;
  if (!campaign_name) return res.status(400).json({ error: 'campaign_name is required' });
  if (!metrics) return res.status(400).json({ error: 'metrics is required' });
  try {
    const raw = await callClaude(`Analyze outreach campaign performance. Calculate key rates, benchmark against industry standards, identify issues, and recommend optimizations.

Campaign name: "${campaign_name}"
Metrics: ${JSON.stringify(metrics)}
Segment: "${segment || 'not specified'}"
Time period: "${time_period || 'not specified'}"
Benchmarks: ${JSON.stringify(benchmarks || {})}

Return concise JSON:
{
  "campaign_name": "string",
  "delivery_rate": 0-1,
  "open_rate": 0-1,
  "click_rate": 0-1,
  "reply_rate": 0-1,
  "bounce_rate": 0-1,
  "unsubscribe_rate": 0-1,
  "performance_grade": "A+|A|B|C|D",
  "vs_benchmarks": [{ "metric": "string", "your_rate": "string", "benchmark": "string", "delta": "string", "assessment": "above|at|below" }],
  "issues_detected": [{ "issue": "string", "severity": "high|medium|low", "recommendation": "string" }],
  "top_performing_elements": ["string"],
  "optimizations": [{ "optimization": "string", "expected_impact": "string", "priority": "high|medium|low" }],
  "confidence_per_section": { "vs_benchmarks": 0-1, "issues_detected": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/objection-handle', async (req: Request, res: Response) => {
  const { objection, context, prospect_profile, previous_conversation, objection_type, constraints = [] } = req.body;
  if (!objection) return res.status(400).json({ error: 'objection is required' });
  if (!context) return res.status(400).json({ error: 'context is required' });
  if (!prospect_profile) return res.status(400).json({ error: 'prospect_profile is required' });
  try {
    const raw = await callClaude(`Generate a compelling, empathetic response to this sales objection. Acknowledge the concern, reframe with value, and guide toward next steps.

Objection: "${objection}"
Context (product/service being sold): "${context}"
Prospect profile: ${JSON.stringify(prospect_profile)}
Previous conversation: "${previous_conversation || 'not provided'}"
Objection type hint: "${objection_type || 'not specified'}"
Constraints: ${JSON.stringify(constraints)}

Return concise JSON:
{
  "objection_type": "price|timing|need|authority|competition|trust|feature|risk",
  "response_message": "string",
  "reframe_strategy": "string",
  "supporting_points": [{ "point": "string", "strength": "strong|moderate|weak" }],
  "proof_points": [{ "type": "case_study|stat|testimonial", "content": "string" }],
  "follow_up_question": "string",
  "escalation_needed": true|false,
  "deal_risk": "high|medium|low",
  "confidence_per_section": { "response_message": 0-1, "supporting_points": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { outreach_action, recipient_context, risk_threshold, compliance_check, campaign_context } = req.body;
  if (!outreach_action) return res.status(400).json({ error: 'outreach_action is required' });
  if (!recipient_context) return res.status(400).json({ error: 'recipient_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this outreach action should be executed. Check for compliance risks, spam signals, timing issues, and strategic fit.

Outreach action: "${outreach_action}"
Recipient context: "${recipient_context}"
Risk threshold: ${risk_threshold || 0.7}
Compliance check: ${compliance_check !== undefined ? compliance_check : true}
Campaign context: "${campaign_context || 'not provided'}"

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "compliance_flags": ["string"],
  "spam_risk": "high|medium|low",
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "send|modify|delay|skip",
  "modification_suggestions": ["string"],
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
