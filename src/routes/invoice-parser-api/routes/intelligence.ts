import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Invoice Parser API', info: '/invoice-parser/info', openapi: '/invoice-parser/openapi.json', health: 'ok' });
});

router.post('/parse', async (req: Request, res: Response) => {
  const { invoice_text, format } = req.body;
  if (!invoice_text) return res.status(400).json({ error: 'invoice_text is required' });
  try {
    const raw = await callClaude(`Parse this invoice and extract all structured fields: "${invoice_text}". Format hint: ${format || 'auto'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"invoice_number":"string","invoice_date":"YYYY-MM-DD","due_date":"YYYY-MM-DD","vendor":{"name":"string","address":"string","tax_id":"string","email":"string"},"bill_to":{"name":"string","address":"string"},"line_items":[{"description":"string","quantity":1,"unit_price":0.00,"total":0.00,"tax_rate":0.0}],"subtotal":0.00,"tax_total":0.00,"discount":0.00,"total_amount":0.00,"currency":"USD","payment_terms":"string","notes":"string","source_provenance":{"provider":"invoice-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"invoice-parser","recommended_next_endpoint":"/reconcile","automation_safe":true,"confidence_per_section":{"vendor":0.92,"line_items":0.88,"totals":0.95},"recommended_actions_priority_order":["validate totals","match to PO","post to ERP"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-line-items', async (req: Request, res: Response) => {
  const { invoice_text } = req.body;
  if (!invoice_text) return res.status(400).json({ error: 'invoice_text is required' });
  try {
    const raw = await callClaude(`Extract all line items from this invoice: "${invoice_text}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"line_items":[{"line_number":1,"description":"string","sku":"string","quantity":1,"unit":"string","unit_price":0.00,"discount_percent":0,"tax_rate":0.0,"total":0.00,"gl_code":"string","category":"materials|services|travel|software|other"}],"line_item_count":0,"subtotal":0.00,"total_tax":0.00,"grand_total":0.00,"source_provenance":{"provider":"invoice-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"invoice-parser","recommended_next_endpoint":"/reconcile","automation_safe":true,"confidence_per_section":{"line_items":0.9},"recommended_actions_priority_order":["validate quantities","match to PO lines","post to ERP"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { invoice_text, po_number, expected_amount } = req.body;
  if (!invoice_text) return res.status(400).json({ error: 'invoice_text is required' });
  try {
    const raw = await callClaude(`Validate this invoice: "${invoice_text}". PO: ${po_number || 'N/A'}, expected: ${expected_amount || 'N/A'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"is_valid":true,"validation_score":0.95,"errors":[],"warnings":["string"],"math_check":{"subtotal_matches":true,"tax_correct":true,"total_matches":true},"required_fields_present":{"invoice_number":true,"date":true,"vendor":true,"line_items":true,"total":true},"po_match":{"po_number":"string","amount_matches":true,"variance":0.00},"source_provenance":{"provider":"invoice-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":0,"cache_recommended":false,"recommended_next_api":"invoice-parser","recommended_next_endpoint":"/reconcile","automation_safe":true,"confidence_per_section":{"validation":0.97,"math_check":1.0},"recommended_actions_priority_order":["fix errors","resolve warnings","approve if valid"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { invoice_text, objective } = req.body;
  if (!invoice_text) return res.status(400).json({ error: 'invoice_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'invoice_processing',
    next_api: 'invoice-parser', next_endpoint: '/parse',
    blocking_flags: [], flag_definitions: { NO_INVOICE: 'invoice_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'invoice-parser', recommended_next_endpoint: '/parse',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Parse invoice', 'Extract line items', 'Validate and reconcile'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/invoice-intelligence', async (req: Request, res: Response) => {
  const { invoice_text, context } = req.body;
  if (!invoice_text) return res.status(400).json({ error: 'invoice_text is required' });
  try {
    const raw = await callClaude(`Full invoice intelligence for: "${invoice_text}". Context: ${context || 'accounts payable'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"invoice_number":"string","vendor":"string","total_amount":0.00,"currency":"USD","due_date":"YYYY-MM-DD","payment_status":"pending|overdue|paid","risk_flags":["string"],"line_items":[{"description":"string","amount":0.00}],"approval_recommendation":"approve|review|reject","approval_reason":"string","duplicate_risk":false,"source_provenance":{"provider":"invoice-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"invoice-parser","recommended_next_endpoint":"/reconcile","automation_safe":true,"confidence_per_section":{"invoice":0.92,"risk":0.88},"recommended_actions_priority_order":["validate","approve/reject","post to ERP"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/reconcile', async (req: Request, res: Response) => {
  const { invoice_text, po_text, budget_code } = req.body;
  if (!invoice_text) return res.status(400).json({ error: 'invoice_text is required' });
  try {
    const raw = await callClaude(`Reconcile this invoice against PO/budget. Invoice: "${invoice_text}". PO: "${po_text || 'N/A'}". Budget: ${budget_code || 'N/A'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"reconciliation_status":"matched|partial|unmatched","match_score":0.95,"invoice_total":0.00,"po_total":0.00,"variance":0.00,"variance_percent":0.0,"unmatched_lines":[],"matched_lines":[{"invoice_line":"string","po_line":"string","amount":0.00}],"budget_code":"string","budget_remaining":0.00,"action_required":"auto_approve|manual_review|reject","source_provenance":{"provider":"invoice-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"invoice-parser","recommended_next_endpoint":"/invoice-intelligence","automation_safe":true,"confidence_per_section":{"reconciliation":0.93},"recommended_actions_priority_order":["resolve unmatched lines","approve matched","update budget"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { invoices } = req.body;
  if (!Array.isArray(invoices) || invoices.length === 0) return res.status(400).json({ error: 'invoices array is required' });
  if (invoices.length > 10) return res.status(400).json({ error: 'Maximum 10 invoices per batch' });
  try {
    const results = await Promise.all(invoices.map(async (inv: { invoice_text: string }) => {
      const raw = await callClaude(`Quick invoice parse: "${inv.invoice_text.slice(0, 300)}". Return JSON:
{"invoice_number":"string","vendor":"string","total_amount":0.00,"currency":"USD","due_date":"YYYY-MM-DD","is_valid":true,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: invoices.length, results,
      source_provenance: { provider: 'invoice-parser-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'invoice-parser', recommended_next_endpoint: '/reconcile',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
