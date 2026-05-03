import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { researchCompany } from '../research/runner';
import { tavilySearch } from '../research/search';
import { claudeResearch } from '../research/claude';
import { logger } from '../logger';

const router = Router();

function meta(startMs: number, cost: number) {
  return { latency_ms: Date.now() - startMs, estimated_cost: cost };
}

async function searchAndAsk(queries: string[], prompt: string, maxChars = 10000): Promise<any> {
  const results = await Promise.all(queries.map(q => tavilySearch(q, 4)));
  const content = results.flat().map(r => `${r.title}: ${r.content}`).join('\n\n').slice(0, maxChars);
  const sources = [...new Set(results.flat().map(r => r.url))].slice(0, 8);
  const raw = await claudeResearch(prompt.replace('{{CONTENT}}', content));
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return { ...parsed, sources };
}

// ── POST /profile-company ──────────────────────────────────────────────────
router.post('/profile-company', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ company: Joi.string().min(1).max(200).required(), focus: Joi.string().max(200).optional() }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await researchCompany(value.company, value.focus);
    return res.json({ ...result, metadata: meta(start, 0.003) });
  } catch (err: any) {
    return res.status(500).json({ error: 'profile_failed', message: err.message });
  }
});

// ── POST /score-company ────────────────────────────────────────────────────
router.post('/score-company', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    criteria: Joi.array().items(Joi.string()).default(['growth', 'stability', 'innovation', 'market_position', 'financial_health'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} company performance growth revenue`, `${value.company} market position competitive strength`],
      `You are a company scoring engine. Score ${value.company} on each criterion. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","overall_score":0.0,"scores":{"growth":0.0,"stability":0.0,"innovation":0.0,"market_position":0.0,"financial_health":0.0},"grade":"A|B|C|D|F","investment_signal":"strong_buy|buy|hold|sell|strong_sell","confidence":0.0,"summary":"one sentence","red_flags":[],"green_flags":[]}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.0025) });
  } catch (err: any) {
    return res.status(500).json({ error: 'score_failed', message: err.message });
  }
});

// ── POST /detect-risks ─────────────────────────────────────────────────────
router.post('/detect-risks', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    risk_types: Joi.array().items(Joi.string().valid('financial', 'legal', 'reputational', 'operational', 'market', 'regulatory')).default(['financial', 'legal', 'reputational', 'operational', 'market', 'regulatory'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} risks lawsuits investigations problems 2024 2025`, `${value.company} financial risk debt layoffs problems`],
      `You are a risk detection engine. Identify risks for ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","risk_level":"low|medium|high|critical","overall_risk_score":0.0,"risks":[{"type":"financial|legal|reputational|operational|market|regulatory","description":"one sentence","severity":0.0,"likelihood":0.0}],"immediate_flags":[],"due_diligence_required":true,"confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.0035) });
  } catch (err: any) {
    return res.status(500).json({ error: 'risk_detection_failed', message: err.message });
  }
});

// ── POST /find-competitors ─────────────────────────────────────────────────
router.post('/find-competitors', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    max_results: Joi.number().integer().min(1).max(10).default(5)
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} competitors alternatives similar companies`, `${value.company} industry landscape market share`],
      `You are a competitive intelligence engine. Find top competitors of ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","competitors":[{"name":"string","similarity_score":0.0,"threat_level":"low|medium|high","strengths":["string"],"market_overlap":"string"}],"market_summary":"one sentence","competitive_position":"leader|challenger|follower|niche","confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.003) });
  } catch (err: any) {
    return res.status(500).json({ error: 'competitor_search_failed', message: err.message });
  }
});

// ── POST /compare-companies ────────────────────────────────────────────────
router.post('/compare-companies', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    companies: Joi.array().items(Joi.string().min(1).max(200)).min(2).max(5).required(),
    criteria: Joi.array().items(Joi.string()).default(['revenue', 'growth', 'innovation', 'market_share', 'talent'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      value.companies.map((c: string) => `${c} company overview performance revenue`),
      `You are a company comparison engine. Compare these companies: ${value.companies.join(', ')}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"companies":["string"],"winner":"company_name","comparison":[{"company":"string","scores":{"revenue":0.0,"growth":0.0,"innovation":0.0,"market_share":0.0,"talent":0.0},"overall":0.0,"recommendation":"buy|hold|avoid"}],"key_differentiators":["string"],"confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.004) });
  } catch (err: any) {
    return res.status(500).json({ error: 'comparison_failed', message: err.message });
  }
});

// ── POST /monitor-signals ──────────────────────────────────────────────────
router.post('/monitor-signals', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    signal_types: Joi.array().items(Joi.string().valid('hiring', 'funding', 'partnerships', 'product', 'leadership', 'legal', 'financial')).default(['hiring', 'funding', 'partnerships', 'product', 'leadership'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} news announcements 2025`, `${value.company} hiring funding partnership product launch 2025`],
      `You are a company signal monitor. Detect recent signals for ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","signals":[{"type":"hiring|funding|partnerships|product|leadership|legal|financial","description":"one sentence","sentiment":"positive|negative|neutral","impact_score":0.0,"date":"string or null"}],"overall_momentum":"accelerating|stable|declining","alert_level":"none|watch|alert|critical","next_check_ms":3600000,"confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) {
    return res.status(500).json({ error: 'monitor_failed', message: err.message });
  }
});

// ── POST /summarize-filings ────────────────────────────────────────────────
router.post('/summarize-filings', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    filing_type: Joi.string().valid('10-K', '10-Q', '8-K', 'S-1', 'annual_report', 'earnings').default('earnings')
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} ${value.filing_type} filing 2024 2025`, `${value.company} earnings revenue financial results 2025`],
      `You are a financial filing analyst. Summarize ${value.filing_type} filings for ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","filing_type":"${value.filing_type}","key_metrics":{"revenue":"string or null","growth":"string or null","profit_margin":"string or null","guidance":"string or null"},"highlights":["string"],"risks":["string"],"sentiment":"bullish|bearish|neutral","agent_summary":"two sentences","confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.0045) });
  } catch (err: any) {
    return res.status(500).json({ error: 'filings_failed', message: err.message });
  }
});

// ── POST /rank-targets ─────────────────────────────────────────────────────
router.post('/rank-targets', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    companies: Joi.array().items(Joi.string().min(1).max(200)).min(2).max(10).required(),
    objective: Joi.string().valid('investment', 'acquisition', 'partnership', 'competitive_threat', 'hiring').default('investment'),
    top_n: Joi.number().integer().min(1).max(10).default(3)
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      value.companies.map((c: string) => `${c} company performance growth ${value.objective}`),
      `You are a company ranking engine. Rank these companies for ${value.objective}: ${value.companies.join(', ')}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"objective":"${value.objective}","ranked":[{"rank":1,"company":"string","score":0.0,"action":"string","reason":"one sentence","confidence":0.0}],"top_pick":"company_name","summary":"one sentence"}`
    );
    const ranked = { ...data, ranked: (data.ranked || []).slice(0, value.top_n) };
    return res.json({ ...ranked, timestamp: new Date().toISOString(), metadata: meta(start, 0.005) });
  } catch (err: any) {
    return res.status(500).json({ error: 'ranking_failed', message: err.message });
  }
});

// ── Legacy ─────────────────────────────────────────────────────────────────
router.post('/research/company', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({ company: Joi.string().min(1).max(200).required(), focus: Joi.string().max(200).optional() }).validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  logger.info({ company: value.company }, 'Company research started');
  try {
    const result = await researchCompany(value.company, value.focus);
    logger.info({ company: value.company, latency_ms: result.latency_ms }, 'Company research complete');
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed';
    res.status(500).json({ error: 'Research failed', details: message });
  }
});

export default router;
