import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1200): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try {
    const raw = data.choices[0].message.content ?? '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch { return { raw: data.choices[0].message.content }; }
}

// Shared email analysis function
async function analyzeEmail(email: string, context?: string): Promise<Record<string, unknown>> {
  const domain = email.split('@')[1] ?? '';
  const localPart = email.split('@')[0] ?? '';

  const disposableDomains = ['mailinator.com','tempmail.com','guerrillamail.com','10minutemail.com','throwaway.email','yopmail.com','trashmail.com','fakeinbox.com','sharklasers.com','guerrillamailblock.com'];
  const freeProviders = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','aol.com','protonmail.com','zoho.com'];
  const isDisposable = disposableDomains.some(d => domain.includes(d));
  const isFreeProvider = freeProviders.includes(domain);
  const isBusinessEmail = !isDisposable && !isFreeProvider && domain.length > 0;

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidFormat = emailRegex.test(email);

  // Role-based detection
  const roleKeywords = ['admin','info','support','sales','contact','help','noreply','no-reply','hello','team','billing','hr','careers','jobs'];
  const isRoleBased = roleKeywords.some(k => localPart.toLowerCase().startsWith(k));

  return {
    email,
    domain,
    local_part: localPart,
    is_valid_format: isValidFormat,
    is_disposable: isDisposable,
    is_free_provider: isFreeProvider,
    is_business_email: isBusinessEmail,
    is_role_based: isRoleBased,
  };
}

// ── POST /verify ──────────────────────────────────────────────────────────────
router.post('/verify', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const data = await callClaude(`You are an email verification engine. Analyze this email and return ONLY a valid JSON object with these keys:
- valid: boolean
- status: string (valid|invalid|risky|unknown)
- deliverability: string (high|medium|low)
- is_disposable: boolean
- is_free_provider: boolean
- is_business_email: boolean
- is_role_based: boolean
- is_catch_all_likely: boolean
- domain_reputation: string (good|neutral|poor|unknown)
- risk_score: number (0-100, higher = riskier)
- confidence: number (0-1)
- reason: string
Email: ${email}
Analysis data: ${JSON.stringify(analysis)}
Return only the JSON object:`);
    res.json({ endpoint: 'verify', email, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'verify', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /risk-score ──────────────────────────────────────────────────────────
router.post('/risk-score', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const data = await callClaude(`You are an email fraud and risk scoring engine. Score this email for risk and return ONLY a valid JSON object with these keys:
- risk_score: number (0-100, higher = riskier)
- risk_level: string (critical|high|medium|low)
- fraud_signals: array of strings
- spam_likelihood: string (high|medium|low)
- is_disposable: boolean
- is_burner: boolean
- is_spoofed_likely: boolean
- allow: boolean (should this email be allowed?)
- block_reason: string or null
- recommended_action: string (allow|flag|block|verify)
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Email: ${email}
Analysis: ${JSON.stringify(analysis)}
Return only the JSON object:`);
    res.json({ endpoint: 'risk-score', email, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'risk-score', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /enrich ──────────────────────────────────────────────────────────────
router.post('/enrich', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const domain = email.split('@')[1] ?? '';

    // Fetch domain info
    let domainData: Record<string, unknown> = {};
    try {
      const res2 = await fetch(`https://${domain}`, { signal: AbortSignal.timeout(5000) });
      domainData = { reachable: res2.ok, status: res2.status };
    } catch { domainData = { reachable: false }; }

    const data = await callClaude(`You are an email enrichment engine. Enrich this email address with contact and company intelligence. Return ONLY a valid JSON object with these keys:
- email_type: string (personal|business|role|disposable|unknown)
- likely_name_format: string (e.g. firstname.lastname, f.lastname)
- company_name: string or null (inferred from domain)
- company_domain: string
- company_type: string (startup|enterprise|agency|freelancer|unknown)
- industry_guess: string
- location_guess: string or null
- seniority_guess: string (executive|senior|mid|junior|unknown)
- linkedin_search_query: string (suggested search to find this person)
- crm_ready: boolean
- notes: string
${context ? `Context: ${context}` : ''}
Email: ${email}
Domain info: ${JSON.stringify({ ...analysis, ...domainData })}
Return only the JSON object:`);
    res.json({ endpoint: 'enrich', email, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'enrich', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /domain-health ───────────────────────────────────────────────────────
router.post('/domain-health', async (req: Request, res: Response) => {
  const { domain, email } = req.body;
  if (!domain && !email) { res.status(400).json({ error: 'Provide domain or email' }); return; }
  const start = Date.now();
  const targetDomain = domain ?? (email as string).split('@')[1];
  try {
    let reachable = false;
    let status = 0;
    try {
      const res2 = await fetch(`https://${targetDomain}`, { signal: AbortSignal.timeout(5000) });
      reachable = res2.ok;
      status = res2.status;
    } catch { reachable = false; }

    const data = await callClaude(`You are a domain health analysis engine. Analyze this domain for email deliverability and reputation. Return ONLY a valid JSON object with these keys:
- domain: string
- reachable: boolean
- health_score: number (0-100)
- reputation: string (excellent|good|neutral|poor|unknown)
- likely_has_mx: boolean
- likely_has_spf: boolean
- likely_has_dmarc: boolean
- is_disposable_domain: boolean
- is_free_provider: boolean
- catch_all_likely: boolean
- deliverability: string (high|medium|low)
- recommended_action: string
Domain: ${targetDomain}
Reachability: ${JSON.stringify({ reachable, status })}
Return only the JSON object:`);
    res.json({ endpoint: 'domain-health', domain: targetDomain, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'domain-health', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /batch-verify ────────────────────────────────────────────────────────
router.post('/batch-verify', async (req: Request, res: Response) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) { res.status(400).json({ error: 'Provide emails array' }); return; }
  const start = Date.now();
  try {
    const results = await Promise.allSettled(
      emails.slice(0, 50).map(async (email: string) => {
        const analysis = await analyzeEmail(email);
        const riskScore = analysis.is_disposable ? 80 : analysis.is_role_based ? 30 : 10;
        return {
          email,
          valid: analysis.is_valid_format,
          is_disposable: analysis.is_disposable,
          is_business: analysis.is_business_email,
          is_role_based: analysis.is_role_based,
          risk_score: riskScore,
          risk_level: riskScore >= 70 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
          crm_ready: analysis.is_valid_format && !analysis.is_disposable,
        };
      })
    );
    const out = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed' });
    const valid = out.filter(r => !('error' in r) && (r as Record<string, unknown>).valid).length;
    const crm_ready = out.filter(r => !('error' in r) && (r as Record<string, unknown>).crm_ready).length;
    const high_risk = out.filter(r => !('error' in r) && (r as Record<string, unknown>).risk_level === 'high').length;
    res.json({
      endpoint: 'batch-verify',
      total: emails.length,
      valid,
      invalid: emails.length - valid,
      crm_ready,
      high_risk,
      results: out,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'batch-verify', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { email, action, context, risk_threshold } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const threshold = risk_threshold ?? 50;
    const blocking_flags: string[] = [];
    if (!analysis.is_valid_format) blocking_flags.push('Invalid email format');
    if (analysis.is_disposable) blocking_flags.push('Disposable email detected');
    if (analysis.is_role_based) blocking_flags.push('Role-based email (lower deliverability)');
    const riskScore = analysis.is_disposable ? 80 : analysis.is_role_based ? 30 : 10;
    if (riskScore >= threshold) blocking_flags.push(`Risk score ${riskScore} exceeds threshold ${threshold}`);
    const execute = analysis.is_valid_format as boolean && blocking_flags.length === 0;
    res.json({
      endpoint: 'execution-gate',
      email,
      execution_ready: execute,
      next_api: execute ? 'action-api' : 'crm-api',
      next_endpoint: execute ? '/send-email' : '/flag-contact',
      data: {
        execute,
        valid: analysis.is_valid_format,
        risk_score: riskScore,
        risk_level: riskScore >= 70 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        is_disposable: analysis.is_disposable,
        is_business_email: analysis.is_business_email,
        blocking_flags,
        confidence: analysis.is_valid_format ? 0.9 : 0.5,
        recommended_action: execute ? 'Proceed with email contact' : 'Block or verify before sending',
      },
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.002, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /analyze-email (one-call) ────────────────────────────────────────────
router.post('/analyze-email', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const data = await callClaude(`You are a complete email intelligence engine. Perform a full analysis and return ONLY a valid JSON object with ALL of these keys:
- valid: boolean
- status: string (valid|invalid|risky|unknown)
- deliverability: string (high|medium|low)
- risk_score: number (0-100)
- risk_level: string (critical|high|medium|low)
- fraud_signals: array of strings
- is_disposable: boolean
- is_free_provider: boolean
- is_business_email: boolean
- is_role_based: boolean
- email_type: string (personal|business|role|disposable|unknown)
- company_name: string or null
- company_domain: string
- industry_guess: string
- seniority_guess: string
- linkedin_search_query: string
- domain_reputation: string (good|neutral|poor|unknown)
- crm_ready: boolean
- allow: boolean
- blocking_flags: array of strings
- recommended_action: string (allow|flag|block|verify)
- execute: boolean (should agent proceed with this email?)
- next_api: string
- next_endpoint: string
- confidence: number (0-1)
- notes: string
${context ? `Context: ${context}` : ''}
Email: ${email}
Analysis: ${JSON.stringify(analysis)}
Return only the JSON object:`, 1500) as Record<string, unknown>;
    res.json({
      endpoint: 'analyze-email',
      email,
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'action-api',
      next_endpoint: data.next_endpoint ?? '/send-email',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.006, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-email', err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
