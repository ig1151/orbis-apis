import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


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
  res.json({ name: 'Web Navigation API', info: '/web-navigation/info', openapi: '/web-navigation/openapi.json', health: 'ok' });
});

router.post('/navigate', async (req: Request, res: Response) => {
  const { url, goal, extract = [], follow_redirects, wait_for, render_js } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Generate web navigation instructions for this URL and goal. Plan content extraction, handle redirects, identify page type, and structure the navigation output. URL: "${url}" Goal: "${goal}" Extract: ${JSON.stringify(extract)} Follow redirects: ${follow_redirects ?? true} Wait for: "${wait_for || 'load'}" Render JS: ${render_js ?? false}

Return concise JSON:
{
  "url": "string",
  "final_url": "string",
  "goal": "string",
  "page_type": "string",
  "page_title": "string",
  "page_summary": "string",
  "navigation_status": "success|redirect|blocked|error",
  "content_extracted": {},
  "links_found": [{ "url": "string", "text": "string", "relevance_score": 0-1 }],
  "forms_found": [{ "id": "string", "action": "string", "fields": ["string"] }],
  "render_required": true|false,
  "next_navigation_options": ["string"],
  "confidence_per_section": { "navigation": 0-1, "extraction": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-structured-data', async (req: Request, res: Response) => {
  const { url, schema, page_content, extraction_method, pagination, max_pages } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!schema) return res.status(400).json({ error: 'schema is required' });
  if (!page_content) return res.status(400).json({ error: 'page_content is required' });
  try {
    const raw = await callClaude(`Extract structured data from this page content according to the target schema. Handle missing fields, validate extracted values, and detect pagination. URL: "${url}" Extraction method: "${extraction_method || 'ai'}" Pagination: ${pagination ?? false} Max pages: ${max_pages || 1} Schema: ${JSON.stringify(schema)}

Page content (first 3000 chars): "${page_content.slice(0, 3000)}"

Return concise JSON:
{
  "url": "string",
  "extracted_data": {},
  "extraction_confidence": 0-1,
  "fields_extracted": number,
  "fields_missing": [{ "field": "string", "reason": "string" }],
  "pagination_detected": true|false,
  "total_pages_estimate": number,
  "data_quality": { "completeness": 0-1, "accuracy_signals": ["string"], "anomalies": ["string"] },
  "extraction_method_used": "string",
  "confidence_per_section": { "extracted_data": 0-1, "data_quality": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/live-search', async (req: Request, res: Response) => {
  const { query, search_engine, result_type, date_filter, limit, region } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!search_engine) return res.status(400).json({ error: 'search_engine is required' });
  try {
    const raw = await callClaude(`Generate a live search plan and structure results. Construct optimal search queries, filter for relevance, and extract structured result data. Query: "${query}" Search engine: "${search_engine}" Result type: "${result_type || 'web'}" Date filter: "${date_filter || 'any'}" Limit: ${limit || 10} Region: "${region || 'us'}"

Return concise JSON:
{
  "query": "string",
  "search_engine": "string",
  "optimized_query": "string",
  "results": [{ "title": "string", "url": "string", "snippet": "string", "domain": "string", "date": "string or null", "relevance_score": 0-1, "result_type": "string" }],
  "total_results_estimate": number,
  "featured_snippet": { "content": "string", "source": "string" } or null,
  "related_searches": ["string"],
  "knowledge_panel": {} or null,
  "search_quality_score": 0-100,
  "confidence_per_section": { "results": 0-1, "featured_snippet": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/follow-links', async (req: Request, res: Response) => {
  const { seed_url, goal, max_depth, link_filter, domain_restrict, max_pages, exclude_patterns = [] } = req.body;
  if (!seed_url) return res.status(400).json({ error: 'seed_url is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (max_depth === undefined || max_depth === null) return res.status(400).json({ error: 'max_depth is required' });
  try {
    const raw = await callClaude(`Generate a link-following crawl plan from this seed URL. Prioritize links by relevance to goal, manage depth, and define extraction strategy per page type. Seed URL: "${seed_url}" Goal: "${goal}" Max depth: ${max_depth} Link filter: "${link_filter || 'none'}" Domain restrict: ${domain_restrict ?? true} Max pages: ${max_pages || 50} Exclude patterns: ${JSON.stringify(exclude_patterns)}

Return concise JSON:
{
  "seed_url": "string",
  "goal": "string",
  "crawl_plan": [{ "url": "string", "depth": number, "priority": 0-1, "reason": "string", "extract_goal": "string" }],
  "total_urls_to_visit": number,
  "estimated_duration_ms": number,
  "link_prioritization_strategy": "string",
  "domain_scope": "string",
  "exclusions_applied": ["string"],
  "expected_data_yield": "string",
  "crawl_health_checks": ["string"],
  "confidence_per_section": { "crawl_plan": 0-1, "estimation": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/adaptive-crawl', async (req: Request, res: Response) => {
  const { start_url, extraction_goal, adapt_to = [], max_pages, output_format } = req.body;
  if (!start_url) return res.status(400).json({ error: 'start_url is required' });
  if (!extraction_goal) return res.status(400).json({ error: 'extraction_goal is required' });
  try {
    const raw = await callClaude(`Generate an adaptive crawling strategy that handles dynamic content, infinite scroll, JavaScript rendering, and anti-bot measures intelligently. Start URL: "${start_url}" Extraction goal: "${extraction_goal}" Adapt to: ${JSON.stringify(adapt_to)} Max pages: ${max_pages || 100} Output format: "${output_format || 'json'}"

Return concise JSON:
{
  "start_url": "string",
  "extraction_goal": "string",
  "challenges_detected": [{ "challenge": "string", "severity": "high|medium|low", "mitigation": "string" }],
  "crawl_strategy": { "rendering": "string", "scroll_handling": "string", "rate_limit_strategy": "string", "session_required": true|false },
  "step_sequence": [{ "step": number, "action": "string", "purpose": "string", "fallback": "string" }],
  "estimated_pages": number,
  "estimated_duration_ms": number,
  "data_completeness_estimate": 0-1,
  "confidence_per_section": { "challenges_detected": 0-1, "crawl_strategy": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/anti-bot-handling', async (req: Request, res: Response) => {
  const { url, challenge_type, context, previous_attempts, headers_sent } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!challenge_type) return res.status(400).json({ error: 'challenge_type is required' });
  try {
    const raw = await callClaude(`Generate ethical anti-bot handling strategies for this challenge. Recommend human-like behavior patterns, backoff strategies, and respectful crawling practices that comply with robots.txt. URL: "${url}" Challenge type: "${challenge_type}" Context: "${context || 'none'}" Previous attempts: ${previous_attempts || 0} Headers sent: ${JSON.stringify(headers_sent || {})}

Return concise JSON:
{
  "url": "string",
  "challenge_type": "string",
  "challenge_severity": "high|medium|low",
  "recommended_strategy": "string",
  "behavioral_recommendations": [{ "behavior": "string", "reason": "string" }],
  "timing_strategy": { "initial_delay_ms": number, "backoff_factor": number, "max_delay_ms": number, "jitter": true|false },
  "header_recommendations": {},
  "robots_txt_compliant": true|false,
  "ethical_notes": ["string"],
  "escalation_needed": true|false,
  "confidence_per_section": { "strategy": 0-1, "timing": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/content-diff', async (req: Request, res: Response) => {
  const { url, previous_content, current_content, diff_type, monitor_elements = [], alert_threshold } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!previous_content) return res.status(400).json({ error: 'previous_content is required' });
  if (!current_content) return res.status(400).json({ error: 'current_content is required' });
  try {
    const raw = await callClaude(`Detect and analyze content changes between two versions of a web page. Classify change types, assess significance, and generate monitoring alerts. URL: "${url}" Diff type: "${diff_type || 'semantic'}" Monitor elements: ${JSON.stringify(monitor_elements)} Alert threshold: ${alert_threshold || 0.3}

Previous content (first 2000 chars): "${previous_content.slice(0, 2000)}"
Current content (first 2000 chars): "${current_content.slice(0, 2000)}"

Return concise JSON:
{
  "url": "string",
  "change_detected": true|false,
  "change_magnitude": "none|minor|moderate|major|complete",
  "change_score": 0-1,
  "changes": [{ "element": "string", "change_type": "added|removed|modified|moved", "old_value": "string", "new_value": "string", "significance": "high|medium|low" }],
  "structural_changes": true|false,
  "content_changes": true|false,
  "data_changes": [{ "field": "string", "old_value": "string", "new_value": "string" }],
  "alert_triggered": true|false,
  "monitoring_recommendation": "string",
  "confidence_per_section": { "changes": 0-1, "classification": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { navigation_action, url, risk_threshold, check_robots_txt, rate_limit_check } = req.body;
  if (!navigation_action) return res.status(400).json({ error: 'navigation_action is required' });
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Gate web navigation actions for safety, compliance, and ethical crawling. Check robots.txt compliance, rate limits, and legal considerations. Navigation action: "${navigation_action}" URL: "${url}" Risk threshold: ${risk_threshold || 0.5} Check robots.txt: ${check_robots_txt ?? true} Rate limit check: ${rate_limit_check ?? true}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "robots_txt_compliant": true|false,
  "rate_limit_safe": true|false,
  "legal_risk": "high|medium|low|none",
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|slow_down|check_robots|deny",
  "crawl_delay_recommended_ms": number,
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/browser-session', async (req: Request, res: Response) => {
  const { session_goal, browser, viewport, user_agent, cookies, timeout_ms, auth_required } = req.body;
  if (!session_goal) return res.status(400).json({ error: 'session_goal is required' });
  if (!browser) return res.status(400).json({ error: 'browser is required' });
  const validBrowsers = ['chromium', 'firefox', 'webkit'];
  if (!validBrowsers.includes(browser)) return res.status(400).json({ error: 'browser must be chromium, firefox, or webkit' });
  try {
    const raw = await callClaude(`Configure a browser session for autonomous web navigation. Plan session setup, warmup steps, and auth handling. Session goal: "${session_goal}" Browser: "${browser}" Viewport: ${JSON.stringify(viewport || { width: 1280, height: 720 })} User agent: "${user_agent || 'default'}" Cookies: ${JSON.stringify(cookies || [])} Timeout ms: ${timeout_ms || 30000} Auth required: ${auth_required ?? false}

Return concise JSON:
{
  "session_id": "string",
  "browser": "string",
  "session_goal": "string",
  "viewport": { "width": number, "height": number },
  "user_agent": "string",
  "auth_required": true|false,
  "auth_method": "string or null",
  "estimated_duration_ms": number,
  "warmup_steps": ["string"],
  "session_config": { "timeout_ms": number, "retry_on_failure": true|false, "screenshot_on_error": true|false },
  "confidence_per_section": { "session_config": 0-1, "warmup_steps": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/screenshot', async (req: Request, res: Response) => {
  const { url, purpose, selector, full_page, format, viewport, wait_for, delay_ms } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!purpose) return res.status(400).json({ error: 'purpose is required' });
  try {
    const raw = await callClaude(`Plan a screenshot capture for this URL and purpose. Recommend capture instructions, viewport, format, and analysis hints. URL: "${url}" Purpose: "${purpose}" Selector: "${selector || 'none'}" Full page: ${full_page ?? false} Format: "${format || 'png'}" Viewport: ${JSON.stringify(viewport || { width: 1280, height: 720 })} Wait for: "${wait_for || 'load'}" Delay ms: ${delay_ms || 0}

Return concise JSON:
{
  "url": "string",
  "purpose": "string",
  "capture_instructions": [{ "step": number, "action": "string", "selector": "string or null" }],
  "recommended_viewport": { "width": number, "height": number },
  "format": "string",
  "full_page": true|false,
  "estimated_file_size_kb": number,
  "analysis_hints": ["string"],
  "diff_baseline_recommended": true|false,
  "confidence_per_section": { "capture_instructions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/form-detect', async (req: Request, res: Response) => {
  const { url, page_content, form_purpose, detect_hidden } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!page_content) return res.status(400).json({ error: 'page_content is required' });
  try {
    const raw = await callClaude(`Analyze this page content and detect all forms. Identify fields, validation, auth forms, search forms, and CAPTCHA. URL: "${url}" Form purpose filter: "${form_purpose || 'all'}" Detect hidden: ${detect_hidden ?? false}

Page content (first 3000 chars): "${page_content.slice(0, 3000)}"

Return concise JSON:
{
  "url": "string",
  "forms_detected": number,
  "forms": [{ "form_id": "string", "action": "string", "method": "GET|POST", "purpose": "string", "fields": [{ "name": "string", "type": "string", "label": "string", "required": true|false, "placeholder": "string or null", "options": ["string"] }], "submit_button": "string", "validation_present": true|false }],
  "auth_forms": number,
  "search_forms": number,
  "captcha_detected": true|false,
  "multi_step": true|false,
  "confidence_per_section": { "forms": 0-1, "field_detection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/submit-form-gated', async (req: Request, res: Response) => {
  const { url, form_id, field_values, submission_purpose, dry_run, risk_threshold, validate_before_submit } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!form_id) return res.status(400).json({ error: 'form_id is required' });
  if (!field_values) return res.status(400).json({ error: 'field_values is required' });
  if (!submission_purpose) return res.status(400).json({ error: 'submission_purpose is required' });
  try {
    const raw = await callClaude(`Gate a form submission for safety and correctness. Validate fields, assess risk, and plan submission steps. URL: "${url}" Form ID: "${form_id}" Submission purpose: "${submission_purpose}" Dry run: ${dry_run ?? false} Risk threshold: ${risk_threshold || 0.5} Validate before submit: ${validate_before_submit ?? true} Field values: ${JSON.stringify(field_values)}

Return concise JSON:
{
  "url": "string",
  "form_id": "string",
  "submission_approved": true|false,
  "risk_score": number,
  "blocking_flags": ["string"],
  "validation_result": { "valid": true|false, "errors": [{ "field": "string", "error": "string" }] },
  "submission_steps": [{ "step": number, "action": "string", "field": "string or null", "value": "string or null" }],
  "expected_response": "string",
  "rollback_possible": true|false,
  "dry_run": true|false,
  "confidence_per_section": { "validation": 0-1, "submission_steps": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/download-assets', async (req: Request, res: Response) => {
  const { url, asset_types, max_size_mb, filename_pattern, deduplicate, follow_pagination } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!asset_types) return res.status(400).json({ error: 'asset_types is required' });
  try {
    const raw = await callClaude(`Plan asset downloads from this URL. Identify assets by type, assess download safety, and build a prioritized download plan. URL: "${url}" Asset types: ${JSON.stringify(asset_types)} Max size MB: ${max_size_mb || 50} Filename pattern: "${filename_pattern || '*'}" Deduplicate: ${deduplicate ?? true} Follow pagination: ${follow_pagination ?? false}

Return concise JSON:
{
  "url": "string",
  "assets_found": [{ "url": "string", "type": "string", "filename": "string", "size_kb": number, "mime_type": "string", "download_approved": true|false, "reason": "string" }],
  "total_size_kb": number,
  "download_plan": [{ "priority": number, "url": "string", "filename": "string" }],
  "blocked_assets": [{ "url": "string", "reason": "string" }],
  "estimated_duration_ms": number,
  "confidence_per_section": { "assets_found": 0-1, "download_plan": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/navigate-and-extract', async (req: Request, res: Response) => {
  const { url, extraction_goal, schema, follow_links, max_pages, handle_auth, output_format } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!extraction_goal) return res.status(400).json({ error: 'extraction_goal is required' });
  try {
    const raw = await callClaude(`Perform a full navigate-and-extract operation in one call. Navigate the URL, detect forms and assets, follow relevant links, and extract structured data toward the extraction goal. URL: "${url}" Extraction goal: "${extraction_goal}" Schema: ${JSON.stringify(schema || {})} Follow links: ${follow_links ?? false} Max pages: ${max_pages || 1} Handle auth: ${handle_auth ?? false} Output format: "${output_format || 'json'}"

Return concise JSON:
{
  "run_id": "string",
  "url": "string",
  "extraction_goal": "string",
  "navigation_status": "success|partial|blocked|error",
  "pages_visited": number,
  "structured_data": {},
  "raw_findings": ["string"],
  "forms_detected": number,
  "assets_found": number,
  "links_followed": ["string"],
  "challenges_encountered": [{ "type": "string", "mitigation": "string", "resolved": true|false }],
  "data_completeness": number,
  "total_duration_ms": number,
  "confidence_per_section": { "structured_data": 0-1, "navigation": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["data:read", "data:extract", "data:monitor"];
const EXECUTION_AUTHORITY: string = "low";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;

