import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1500): Promise<Record<string, unknown>> {
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

router.post('/extract', async (req, res) => { req.url = '/extract-invoice'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/extract-invoice', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are an invoice extraction engine. Extract all invoice data and return ONLY a valid JSON object with these keys:
- invoice_number, vendor_name, vendor_address, vendor_email, client_name, client_address
- issue_date, due_date, currency, subtotal, tax_amount, total_amount
- line_items: array of {description, quantity, unit_price, total}
- payment_terms, payment_method, notes
- confidence: number (0-1), missing_fields: array of strings
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-invoice', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-invoice', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-contract', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a legal contract extraction engine. Extract all key terms and return ONLY a valid JSON object with these keys:
- contract_type, parties: array of {name, role, address}
- effective_date, expiration_date, value, currency, payment_terms, governing_law, jurisdiction
- key_obligations: array of {party, obligation, deadline}
- termination_clauses: array of strings
- risk_flags: array of strings
- confidentiality: boolean, non_compete: boolean, auto_renewal: boolean
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-contract', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-contract', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-receipt', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a receipt extraction engine. Extract all purchase data and return ONLY a valid JSON object with these keys:
- merchant_name, merchant_address, merchant_phone, date, time, receipt_number
- items: array of {name, quantity, unit_price, total}
- subtotal, tax, tip, total, currency, payment_method, card_last_four
- category: string (restaurant|retail|grocery|travel|entertainment|other)
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 4000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-receipt', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-receipt', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-resume', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a resume extraction engine. Extract all professional data and return ONLY a valid JSON object with these keys:
- name, email, phone, location, linkedin, website, summary
- skills: array of strings
- experience: array of {company, role, start_date, end_date, location, description, achievements[]}
- education: array of {institution, degree, field, graduation_year, gpa}
- certifications: array of {name, issuer, date}
- total_years_experience: number
- seniority_level: string (intern|junior|mid|senior|lead|executive)
- top_skills: array of strings (top 5)
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-resume', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-resume', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-custom', async (req: Request, res: Response) => {
  const { text, schema, context } = req.body;
  if (!text || !schema) { res.status(400).json({ error: 'Provide text and schema object' }); return; }
  const start = Date.now();
  try {
    const fieldList = Object.entries(schema).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const data = await callClaude(`You are a custom document extraction engine. Extract these fields and return ONLY a valid JSON object:
${fieldList}
- confidence: number (0-1)
- missing_fields: array of strings
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-custom', schema, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-custom', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/classify-document', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a document classification engine. Classify this document and return ONLY a valid JSON object with these keys:
- document_type: string (invoice|contract|receipt|resume|report|letter|form|proposal|agreement|other)
- sub_type: string
- confidence: number (0-1)
- language: string
- has_tables: boolean, has_signatures: boolean, is_scanned: boolean
- recommended_extractor: string (extract-invoice|extract-contract|extract-receipt|extract-resume|extract-custom)
- key_entities: array of strings
- summary: string (1-2 sentences)
- pii_detected: boolean
Text: """${text.slice(0, 4000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'classify-document', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'classify-document', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { text, action, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are an autonomous agent execution gate for PDF document processing. Return ONLY a valid JSON object with these keys:
- execute: boolean
- confidence: number (0-1)
- document_type: string
- risk_level: string (high|medium|low)
- blocking_flags: array of strings
- recommended_action: string
- next_api: string
- next_endpoint: string
- data_quality: string (high|medium|low)
- pii_detected: boolean
- financial_data_detected: boolean
${action ? `Requested action: ${action}` : ''}
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 4000)}"""
Return only the JSON object:`) as Record<string, unknown>;
    res.json({
      endpoint: 'execution-gate',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.004, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;

// ── POST /analyze-document (one-call workflow) ────────────────────────────────
router.post('/analyze-document', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a complete document intelligence engine. Perform a full analysis of this document and return ONLY a valid JSON object with ALL of these keys:
- document_type: string (invoice|contract|receipt|resume|report|letter|form|proposal|agreement|other)
- sub_type: string
- confidence: number (0-1)
- language: string
- summary: string (2-3 sentences)
- key_entities: array of strings
- pii_detected: boolean
- financial_data_detected: boolean
- has_tables: boolean
- is_scanned: boolean
- extracted_data: object (all relevant fields based on document type)
- risk_flags: array of strings
- missing_fields: array of strings
- data_quality: string (high|medium|low)
- recommended_next_action: string
- execute: boolean (should agent process this document?)
- blocking_flags: array of strings
- next_api: string
- next_endpoint: string
${context ? `Context/goal: ${context}` : ''}
Document text:
"""${text.slice(0, 8000)}"""
Return only the JSON object:`, 2000) as Record<string, unknown>;

    res.json({
      endpoint: 'analyze-document',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.008, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-document', err }, message);
    res.status(500).json({ error: message });
  }
});
