import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
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

router.post('/send-sequence', async (req: Request, res: Response) => {
  const { sequence, recipient, start_step, send_window } = req.body;
  if (!sequence) return res.status(400).json({ error: 'sequence is required' });
  if (!recipient) return res.status(400).json({ error: 'recipient is required' });
  try {
    const raw = await callClaude(`Execute this outreach sequence for the recipient. Validate compliance, set timing, and generate send instructions for each step. Recipient: ${JSON.stringify(recipient)} Start step: ${start_step || 1} Send window: ${JSON.stringify(send_window || { days: ['Mon','Tue','Wed','Thu'], hours: '9-17' })} Sequence: ${JSON.stringify(sequence.slice(0, 10))}

Return concise JSON:
{
  "sequence_id": "string (uuid-style)",
  "recipient_email": "string",
  "total_steps": number,
  "steps_to_execute": [{ "step": number, "channel": "string", "scheduled_at": "string (ISO datetime)", "subject": "string or null", "message_preview": "string (first 100 chars)", "send_status": "scheduled|skipped|blocked", "skip_reason": "string or null" }],
  "compliance_cleared": true|false,
  "compliance_flags": ["string"],
  "estimated_completion_date": "string",
  "pause_triggers": ["string"],
  "unsubscribe_link_injected": true|false,
  "tracking_enabled": true|false,
  "sequence_health": "healthy|warnings|blocked",
  "confidence_per_section": { "scheduling": 0-1, "compliance": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/pause-on-reply', async (req: Request, res: Response) => {
  const { reply_text, sequence_id, sequence_context } = req.body;
  if (!reply_text) return res.status(400).json({ error: 'reply_text is required' });
  try {
    const raw = await callClaude(`Determine if this inbound reply should pause or stop the outreach sequence. Analyze intent, sentiment, and type of response. Sequence ID: "${sequence_id || 'unknown'}" Sequence context: "${sequence_context || 'not provided'}" Reply: "${reply_text.slice(0, 1000)}"

Return concise JSON:
{
  "pause_sequence": true|false,
  "stop_sequence": true|false,
  "reason": "string",
  "reply_type": "interested|not_interested|auto_reply|ooo|bounce|unsubscribe|complaint|neutral",
  "human_reply_detected": true|false,
  "urgency": "high|medium|low",
  "recommended_action": "pause_and_notify|stop_and_archive|continue|escalate|transfer_to_human",
  "notification_message": "string",
  "resume_after_days": number|null,
  "confidence": 0-1,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/unsubscribe-check', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const raw = await callClaude(`Perform an unsubscribe and do-not-contact compliance check for this email address before sending outreach. Context: ${JSON.stringify(context || {})} Email: "${email}"

Return concise JSON:
{
  "email": "string",
  "can_contact": true|false,
  "block_reason": "string or null",
  "checks_performed": [{ "check": "string", "result": "pass|fail|unknown", "details": "string" }],
  "dnc_signals": ["string"],
  "gdpr_applicable": true|false,
  "casl_applicable": true|false,
  "recommended_action": "send|do_not_send|verify_first",
  "verification_steps": ["string"],
  "risk_level": "high|medium|low|none",
  "confidence": 0-1,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compliance-guard', async (req: Request, res: Response) => {
  const { message, sender_info, recipient_region } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    const raw = await callClaude(`Audit this outreach message for CAN-SPAM, GDPR, CASL, and general anti-spam compliance before sending. Sender info: ${JSON.stringify(sender_info || {})} Recipient region: "${recipient_region || 'unknown'}" Message: "${message.slice(0, 2000)}"

Return concise JSON:
{
  "compliant": true|false,
  "overall_risk": "high|medium|low|compliant",
  "regulations_checked": ["CAN-SPAM","GDPR","CASL"],
  "violations": [{ "regulation": "string", "violation": "string", "severity": "blocking|warning", "fix": "string" }],
  "warnings": ["string"],
  "required_elements": { "unsubscribe_link": true|false, "physical_address": true|false, "sender_identification": true|false, "subject_not_deceptive": true|false },
  "spam_score": 0-100,
  "spam_triggers": ["string"],
  "cleared_to_send": true|false,
  "recommended_modifications": ["string"],
  "confidence_per_section": { "can_spam": 0-1, "gdpr": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/delivery-status', async (req: Request, res: Response) => {
  const { campaign_id, delivery_metrics, domain } = req.body;
  if (!delivery_metrics) return res.status(400).json({ error: 'delivery_metrics is required' });
  try {
    const raw = await callClaude(`Analyze outreach delivery performance and identify deliverability issues. Campaign ID: "${campaign_id || 'unknown'}" Domain: "${domain || 'not provided'}" Delivery metrics: ${JSON.stringify(delivery_metrics)}

Return concise JSON:
{
  "campaign_id": "string",
  "deliverability_score": 0-100,
  "delivery_health": "excellent|good|degraded|critical",
  "metrics_analysis": { "delivery_rate": "string", "open_rate": "string", "bounce_rate": "string", "spam_rate": "string", "unsubscribe_rate": "string" },
  "issues_detected": [{ "issue": "string", "severity": "critical|high|medium|low", "likely_cause": "string", "fix": "string" }],
  "domain_reputation": "good|fair|poor|unknown",
  "inbox_placement_estimate": "high|medium|low",
  "warming_needed": true|false,
  "recommended_send_volume": "string",
  "action_items": [{ "action": "string", "priority": "immediate|soon|monitor", "expected_impact": "string" }],
  "confidence_per_section": { "deliverability": 0-1, "issues": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
