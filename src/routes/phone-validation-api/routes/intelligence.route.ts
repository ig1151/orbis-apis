import { Router, Request, Response } from 'express';
import { validatePhone } from '../services/phone.service';
import type { ValidateRequest } from '../types/index';

export const intelligenceRouter = Router();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try { return JSON.parse(data.choices[0].message.content ?? '{}'); }
  catch { return {}; }
}

// ── POST /score-phone ─────────────────────────────────────────────────────────
intelligenceRouter.post('/score-phone', async (req: Request, res: Response) => {
  const { phone, country_code } = req.body;
  if (!phone) { res.status(400).json({ error: 'Provide phone' }); return; }
  const start = Date.now();
  try {
    const result = await validatePhone({ phone, country_code } as ValidateRequest);
    const aiData = await callClaude(`You are a phone intelligence scoring engine. Score this phone number for contact quality and return ONLY a valid JSON object with these keys:
- quality_score: number (0-100)
- reachability: high | medium | low
- contact_confidence: number (0-1)
- recommended_channel: sms | call | both | avoid
- carrier_tier: premium | standard | budget | unknown
- notes: array of strings
Phone data: ${JSON.stringify({ valid: result.valid, line_type: result.line_type, country: result.country, risk: result.risk })}
Return only the JSON object:`);
    res.json({
      endpoint: 'score-phone',
      phone: result.formatted.e164 || phone,
      valid: result.valid,
      line_type: result.line_type,
      country: result.country,
      risk: result.risk,
      intelligence: aiData,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ── POST /risk-check ──────────────────────────────────────────────────────────
intelligenceRouter.post('/risk-check', async (req: Request, res: Response) => {
  const { phone, country_code, context } = req.body;
  if (!phone) { res.status(400).json({ error: 'Provide phone' }); return; }
  const start = Date.now();
  try {
    const result = await validatePhone({ phone, country_code } as ValidateRequest);
    const r = result.risk;
    const fraud_analysis = {
      fraud_score: r.score,
      risk_level: r.level,
      fraud_signals: r.factors,
      is_burner: r.is_disposable,
      is_spoofed_likely: r.is_likely_fake,
      allow: r.level !== 'critical' && r.score < 70,
      block_reason: r.score >= 70 ? r.factors[0] : null,
      recommended_action: r.score >= 80 ? 'block' : r.score >= 50 ? 'verify' : r.score >= 20 ? 'flag' : 'allow',
    };
    res.json({
      endpoint: 'risk-check',
      phone: result.formatted.e164 || phone,
      valid: result.valid,
      line_type: result.line_type,
      risk: result.risk,
      fraud_analysis,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});
// ── POST /normalize-contact ───────────────────────────────────────────────────
intelligenceRouter.post('/normalize-contact', async (req: Request, res: Response) => {
  const { phone, name, email, country_code } = req.body;
  if (!phone) { res.status(400).json({ error: 'Provide phone' }); return; }
  const start = Date.now();
  try {
    const result = await validatePhone({ phone, country_code } as ValidateRequest);
    res.json({
      endpoint: 'normalize-contact',
      normalized: {
        phone_e164: result.formatted.e164,
        phone_international: result.formatted.international,
        phone_national: result.formatted.national,
        country_code: result.country.code,
        country_name: result.country.name,
        dial_code: result.country.dial_code,
        line_type: result.line_type,
        valid: result.valid,
        name: name ?? null,
        email: email ?? null,
      },
      risk: result.risk,
      crm_ready: result.valid && result.risk.level !== 'critical',
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ── POST /detect-carrier-risk ─────────────────────────────────────────────────
intelligenceRouter.post('/detect-carrier-risk', async (req: Request, res: Response) => {
  const { phone, country_code } = req.body;
  if (!phone) { res.status(400).json({ error: 'Provide phone' }); return; }
  const start = Date.now();
  try {
    const result = await validatePhone({ phone, country_code } as ValidateRequest);
    const aiData = await callClaude(`You are a carrier risk intelligence engine. Analyze this phone number's carrier and line type risk. Return ONLY a valid JSON object with these keys:
- carrier_risk: high | medium | low
- line_type_risk: high | medium | low
- porting_risk: high | medium | low
- spam_likelihood: high | medium | low
- carrier_notes: array of strings
- sms_deliverability: high | medium | low
- call_deliverability: high | medium | low
- overall_carrier_score: number (0-100, higher = safer)
Phone data: ${JSON.stringify({ valid: result.valid, line_type: result.line_type, country: result.country, risk: result.risk })}
Return only the JSON object:`);
    res.json({
      endpoint: 'detect-carrier-risk',
      phone: result.formatted.e164 || phone,
      line_type: result.line_type,
      country: result.country,
      base_risk: result.risk,
      carrier_intelligence: aiData,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ── POST /batch-score ─────────────────────────────────────────────────────────
intelligenceRouter.post('/batch-score', async (req: Request, res: Response) => {
  const { phones, country_code } = req.body;
  if (!phones || !Array.isArray(phones)) { res.status(400).json({ error: 'Provide phones array' }); return; }
  const start = Date.now();
  try {
    const results = await Promise.allSettled(
      phones.slice(0, 50).map(async (phone: string) => {
        const result = await validatePhone({ phone, country_code } as ValidateRequest);
        return {
          phone,
          phone_e164: result.formatted.e164,
          valid: result.valid,
          line_type: result.line_type,
          country_code: result.country.code,
          risk_level: result.risk.level,
          risk_score: result.risk.score,
          crm_ready: result.valid && result.risk.level !== 'critical',
        };
      })
    );
    const out = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed' });
    const valid = out.filter(r => !('error' in r) && (r as Record<string, unknown>).valid).length;
    const crm_ready = out.filter(r => !('error' in r) && (r as Record<string, unknown>).crm_ready).length;
    const high_risk = out.filter(r => !('error' in r) && ['high', 'critical'].includes((r as Record<string, unknown>).risk_level as string)).length;
    res.json({
      endpoint: 'batch-score',
      total: phones.length,
      valid,
      invalid: phones.length - valid,
      crm_ready,
      high_risk,
      results: out,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
intelligenceRouter.post('/execution-gate', async (req: Request, res: Response) => {
  const { phone, country_code, context, risk_threshold } = req.body;
  if (!phone) { res.status(400).json({ error: 'Provide phone' }); return; }
  const start = Date.now();
  try {
    const result = await validatePhone({ phone, country_code } as ValidateRequest);
    const threshold = risk_threshold ?? 50;
    const blocking_flags: string[] = [];
    if (!result.valid) blocking_flags.push('Phone number is invalid');
    if (result.risk.score >= threshold) blocking_flags.push(`Risk score ${result.risk.score} exceeds threshold ${threshold}`);
    if (result.risk.is_voip) blocking_flags.push('VoIP number detected');
    if (result.risk.is_disposable) blocking_flags.push('Disposable number detected');
    if (result.risk.is_likely_fake) blocking_flags.push('Likely fake number detected');
    const execute = result.valid && blocking_flags.length === 0;
    res.json({
      endpoint: 'execution-gate',
      phone: result.formatted.e164 || phone,
      execution_ready: execute,
      next_api: execute ? 'action-api' : 'crm-api',
      next_endpoint: execute ? '/send-sms' : '/flag-contact',
      data: {
        execute,
        valid: result.valid,
        risk_score: result.risk.score,
        risk_level: result.risk.level,
        line_type: result.line_type,
        blocking_flags,
        confidence: result.valid ? (1 - result.risk.score / 100) : 0,
        recommended_action: execute ? 'Proceed with contact' : 'Block or verify before contacting',
      },
      metadata: {
        latency_ms: Date.now() - start,
        estimated_cost: 0.003,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ── Webhook store ─────────────────────────────────────────────────────────────
interface PhoneWebhookEntry {
  id: string;
  webhook_url: string;
  risk_threshold: number;
  phones: string[];
  created_at: string;
  status: 'active' | 'cancelled';
  trigger_count: number;
}
const phoneWebhookStore = new Map<string, PhoneWebhookEntry>();

// ── POST /register-webhook ────────────────────────────────────────────────────
intelligenceRouter.post('/register-webhook', (req: Request, res: Response) => {
  const { webhook_url, risk_threshold, phones } = req.body;
  if (!webhook_url) { res.status(400).json({ error: 'Provide webhook_url' }); return; }
  const id = `pwh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: PhoneWebhookEntry = {
    id,
    webhook_url,
    risk_threshold: risk_threshold ?? 50,
    phones: phones ?? [],
    created_at: new Date().toISOString(),
    status: 'active',
    trigger_count: 0,
  };
  phoneWebhookStore.set(id, entry);
  res.json({
    endpoint: 'register-webhook',
    id,
    webhook_url,
    risk_threshold: entry.risk_threshold,
    phones_monitored: entry.phones.length,
    status: 'active',
    message: 'Webhook registered. Will fire when risk score exceeds threshold.',
    registered_at: entry.created_at,
    timestamp: new Date().toISOString(),
  });
});
