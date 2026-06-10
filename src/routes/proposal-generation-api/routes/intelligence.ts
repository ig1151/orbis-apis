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
  res.json({ name: 'Proposal & Document Generation API', info: '/proposal-generation/info', openapi: '/proposal-generation/openapi.json', health: 'ok' });
});

router.post('/generate-proposal', async (req: Request, res: Response) => {
  const { client_name, problem_statement, solution_description, pricing, timeline, team = [], case_studies = [], tone } = req.body;
  if (!client_name) return res.status(400).json({ error: 'client_name is required' });
  if (!problem_statement) return res.status(400).json({ error: 'problem_statement is required' });
  if (!solution_description) return res.status(400).json({ error: 'solution_description is required' });
  try {
    const raw = await callClaude(`Generate a complete business proposal document. Include executive summary, problem/solution, approach, timeline, team, pricing, and next steps. Be persuasive and professional.

Client: "${client_name}"
Problem: "${problem_statement}"
Solution: "${solution_description}"
Tone: "${tone || 'consultative'}"
Timeline: "${timeline || 'to be defined'}"
Team: ${JSON.stringify(team)}
Case studies: ${JSON.stringify(case_studies)}
Pricing inputs: ${JSON.stringify(pricing || {})}

Return concise JSON:
{
  "proposal_id": "string (uuid-style)",
  "client_name": "string",
  "executive_summary": "string (2-3 paragraphs)",
  "problem_statement": "string",
  "proposed_solution": "string",
  "approach_and_methodology": [{ "phase": "string", "description": "string", "duration": "string", "deliverables": ["string"] }],
  "timeline_overview": "string",
  "team_section": [{ "name": "string", "role": "string", "relevant_experience": "string" }],
  "pricing_section": { "investment_summary": "string", "line_items": [{ "item": "string", "price": "string", "description": "string" }] },
  "case_study_references": ["string"],
  "next_steps": ["string"],
  "call_to_action": "string",
  "word_count": number,
  "confidence_per_section": { "executive_summary": 0-1, "approach": 0-1, "pricing": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/executive-summary', async (req: Request, res: Response) => {
  const { document_content, summary_purpose, max_words, audience, key_highlights = [] } = req.body;
  if (!document_content) return res.status(400).json({ error: 'document_content is required' });
  if (!summary_purpose) return res.status(400).json({ error: 'summary_purpose is required' });
  try {
    const raw = await callClaude(`Generate a compelling executive summary that captures the most critical information for decision-makers. Focus on business value, key decisions needed, and outcomes.

Purpose: "${summary_purpose}"
Audience: "${audience || 'senior leadership'}"
Max words: ${max_words || 300}
Key highlights to include: ${JSON.stringify(key_highlights)}

Document content (first 4000 chars): "${document_content.slice(0, 4000)}"

Return concise JSON:
{
  "executive_summary": "string",
  "key_takeaways": ["string (max 5)"],
  "decision_needed": "string or null",
  "value_proposition": "string",
  "risks_highlighted": ["string"],
  "word_count": number,
  "reading_time_minutes": number,
  "audience_fit_score": 0-100,
  "clarity_score": 0-100,
  "confidence_per_section": { "executive_summary": 0-1, "key_takeaways": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/pricing-table', async (req: Request, res: Response) => {
  const { service_or_product, cost_inputs, margin_target, competitor_pricing = [], discount_tiers = [], currency } = req.body;
  if (!service_or_product) return res.status(400).json({ error: 'service_or_product is required' });
  if (!cost_inputs) return res.status(400).json({ error: 'cost_inputs is required' });
  try {
    const raw = await callClaude(`Build a professional pricing table with tiered options, ROI justification, and competitive positioning.

Service/Product: "${service_or_product}"
Currency: "${currency || 'USD'}"
Margin target: ${margin_target || 40}%
Cost inputs: ${JSON.stringify(cost_inputs)}
Competitor pricing: ${JSON.stringify(competitor_pricing)}
Discount tiers: ${JSON.stringify(discount_tiers)}

Return concise JSON:
{
  "pricing_tiers": [{ "tier_name": "string", "price": "string", "billing": "monthly|annual|one_time", "features": ["string"], "recommended": true|false, "target_customer": "string" }],
  "total_cost_base": number,
  "recommended_margin": number,
  "price_justification": [{ "point": "string", "value_delivered": "string" }],
  "roi_statement": "string",
  "competitive_position": "premium|competitive|value",
  "discount_recommendations": [{ "scenario": "string", "discount_pct": number, "conditions": "string" }],
  "confidence_per_section": { "pricing_tiers": 0-1, "competitive_position": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sow', async (req: Request, res: Response) => {
  const { project_name, scope_description, deliverables, timeline, assumptions = [], exclusions = [], payment_terms } = req.body;
  if (!project_name) return res.status(400).json({ error: 'project_name is required' });
  if (!scope_description) return res.status(400).json({ error: 'scope_description is required' });
  if (!deliverables) return res.status(400).json({ error: 'deliverables is required' });
  try {
    const raw = await callClaude(`Generate a formal Statement of Work document with clear scope, deliverables, acceptance criteria, timeline, assumptions, exclusions, and payment terms.

Project: "${project_name}"
Scope: "${scope_description}"
Deliverables: ${JSON.stringify(deliverables)}
Timeline: ${JSON.stringify(timeline || {})}
Assumptions: ${JSON.stringify(assumptions)}
Exclusions: ${JSON.stringify(exclusions)}
Payment terms: "${payment_terms || 'Net 30'}"

Return concise JSON:
{
  "sow_id": "string (uuid-style)",
  "project_name": "string",
  "project_overview": "string",
  "scope_of_work": [{ "item": "string", "description": "string", "acceptance_criteria": "string" }],
  "deliverables": [{ "deliverable": "string", "format": "string", "due": "string", "acceptance_criteria": "string" }],
  "out_of_scope": ["string"],
  "assumptions": ["string"],
  "timeline": [{ "milestone": "string", "date": "string", "owner": "string" }],
  "payment_schedule": [{ "milestone": "string", "amount_pct": number, "trigger": "string" }],
  "change_order_process": "string",
  "legal_notes": ["string"],
  "confidence_per_section": { "scope_of_work": 0-1, "deliverables": 0-1, "payment_schedule": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/rfp-response', async (req: Request, res: Response) => {
  const { rfp_content, your_company, capabilities, differentiators = [], case_studies = [], team_bios = [] } = req.body;
  if (!rfp_content) return res.status(400).json({ error: 'rfp_content is required' });
  if (!your_company) return res.status(400).json({ error: 'your_company is required' });
  if (!capabilities) return res.status(400).json({ error: 'capabilities is required' });
  try {
    const raw = await callClaude(`Generate a compelling RFP response tailored to the requirements. Address each requirement systematically, highlight differentiators, and include relevant evidence.

Company: "${your_company}"
Capabilities: ${JSON.stringify(capabilities)}
Differentiators: ${JSON.stringify(differentiators)}
Case studies: ${JSON.stringify(case_studies)}
Team bios: ${JSON.stringify(team_bios)}

RFP content (first 3000 chars): "${rfp_content.slice(0, 3000)}"

Return concise JSON:
{
  "rfp_response_id": "string (uuid-style)",
  "requirements_addressed": [{ "requirement": "string", "our_response": "string", "evidence": "string or null", "strength": "strong|adequate|gap" }],
  "executive_summary": "string",
  "differentiators_highlighted": [{ "differentiator": "string", "relevance_to_rfp": "string" }],
  "gaps_identified": [{ "gap": "string", "mitigation": "string" }],
  "win_themes": ["string"],
  "recommended_pricing_approach": "string",
  "submission_checklist": [{ "item": "string", "status": "included|missing|partial" }],
  "confidence_per_section": { "requirements_addressed": 0-1, "differentiators": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/case-study', async (req: Request, res: Response) => {
  const { client_name, challenge, solution, results, industry, timeline, quote, metrics = [] } = req.body;
  if (!client_name) return res.status(400).json({ error: 'client_name is required' });
  if (!challenge) return res.status(400).json({ error: 'challenge is required' });
  if (!solution) return res.status(400).json({ error: 'solution is required' });
  if (!results) return res.status(400).json({ error: 'results is required' });
  try {
    const raw = await callClaude(`Transform raw case study inputs into a compelling narrative case study document with challenge, solution, results, and proof points.

Client: "${client_name}"
Industry: "${industry || 'not specified'}"
Timeline: "${timeline || 'not specified'}"
Challenge: "${challenge}"
Solution: "${solution}"
Results: ${JSON.stringify(results)}
Quote: "${quote || ''}"
Metrics: ${JSON.stringify(metrics)}

Return concise JSON:
{
  "case_study_id": "string (uuid-style)",
  "headline": "string",
  "client_overview": "string",
  "challenge_narrative": "string",
  "solution_narrative": "string",
  "results_narrative": "string",
  "metrics_highlight": [{ "metric": "string", "improvement": "string", "formatted": "string" }],
  "pull_quote": "string",
  "lessons_learned": ["string"],
  "reusability_score": 0-100,
  "ideal_prospect_match": "string",
  "confidence_per_section": { "challenge_narrative": 0-1, "results_narrative": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/document-score', async (req: Request, res: Response) => {
  const { document_content, document_type, audience, goals = [], rubric } = req.body;
  if (!document_content) return res.status(400).json({ error: 'document_content is required' });
  if (!document_type) return res.status(400).json({ error: 'document_type is required' });
  try {
    const raw = await callClaude(`Score this document for clarity, persuasiveness, completeness, professionalism, and audience fit. Provide specific improvement recommendations.

Document type: "${document_type}"
Audience: "${audience || 'general business'}"
Goals: ${JSON.stringify(goals)}
Rubric overrides: ${JSON.stringify(rubric || {})}

Document content (first 3000 chars): "${document_content.slice(0, 3000)}"

Return concise JSON:
{
  "overall_score": 0-100,
  "grade": "A+|A|B|C|D",
  "dimension_scores": { "clarity": 0-100, "persuasiveness": 0-100, "completeness": 0-100, "professionalism": 0-100, "audience_fit": 0-100 },
  "strengths": [{ "aspect": "string", "example": "string" }],
  "weaknesses": [{ "aspect": "string", "recommendation": "string", "priority": "high|medium|low" }],
  "missing_sections": ["string"],
  "language_issues": [{ "issue": "string", "fix": "string" }],
  "reading_level": "string",
  "estimated_close_rate_impact": "positive|neutral|negative",
  "confidence_per_section": { "dimension_scores": 0-1, "weaknesses": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/personalize-document', async (req: Request, res: Response) => {
  const { template_content, recipient_profile, tone, personalization_depth } = req.body;
  if (!template_content) return res.status(400).json({ error: 'template_content is required' });
  if (!recipient_profile) return res.status(400).json({ error: 'recipient_profile is required' });
  try {
    const raw = await callClaude(`Personalize this document template for the specific recipient. Tailor examples, pain points, tone, and value propositions to their profile.

Recipient profile: ${JSON.stringify(recipient_profile)}
Tone: "${tone || 'consultative'}"
Personalization depth: "${personalization_depth || 'moderate'}"

Template content (first 3000 chars): "${template_content.slice(0, 3000)}"

Return concise JSON:
{
  "personalized_content": "string",
  "personalizations_made": [{ "original": "string", "replacement": "string", "reason": "string" }],
  "personalization_score": 0-100,
  "relevance_score": 0-100,
  "pain_points_addressed": ["string"],
  "tone_match": 0-100,
  "recommended_additional_personalizations": ["string"],
  "confidence_per_section": { "personalized_content": 0-1, "personalizations_made": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { document_type, document_context, completeness_threshold, quality_threshold } = req.body;
  if (!document_type) return res.status(400).json({ error: 'document_type is required' });
  if (!document_context) return res.status(400).json({ error: 'document_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this document is ready to send or needs revision. Check completeness, quality, and risk factors.

Document type: "${document_type}"
Completeness threshold: ${completeness_threshold || 0.8}
Quality threshold: ${quality_threshold || 0.75}

Document context: "${typeof document_context === 'string' ? document_context.slice(0, 3000) : JSON.stringify(document_context).slice(0, 3000)}"

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "ready_to_send": true|false,
  "blocking_issues": ["string"],
  "warnings": ["string"],
  "quality_score": 0-100,
  "recommended_action": "send|revise|personalize_first|legal_review",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
