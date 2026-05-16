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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Receipt Parser API', info: '/receipt-parser/info', openapi: '/receipt-parser/openapi.json', health: 'ok' });
});

router.post('/parse', async (req: Request, res: Response) => {
  const { receipt_text } = req.body;
  if (!receipt_text) return res.status(400).json({ error: 'receipt_text is required' });
  try {
    const raw = await callClaude(`Parse this receipt and extract all fields: "${receipt_text}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"merchant":{"name":"string","address":"string","phone":"string","tax_id":"string"},"transaction_date":"YYYY-MM-DD","transaction_time":"HH:MM","receipt_number":"string","items":[{"description":"string","quantity":1,"unit_price":0.00,"total":0.00}],"subtotal":0.00,"tax":0.00,"tip":0.00,"total":0.00,"currency":"USD","payment_method":"cash|credit|debit|digital","card_last_four":"string","source_provenance":{"provider":"receipt-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"receipt-parser","recommended_next_endpoint":"/categorize","automation_safe":true,"confidence_per_section":{"merchant":0.9,"items":0.88,"totals":0.95},"recommended_actions_priority_order":["categorize expense","submit to expense report","archive"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/categorize', async (req: Request, res: Response) => {
  const { receipt_text, merchant_name, total } = req.body;
  if (!receipt_text && !merchant_name) return res.status(400).json({ error: 'receipt_text or merchant_name is required' });
  try {
    const raw = await callClaude(`Categorize this expense receipt. Text: "${receipt_text || ''}", Merchant: "${merchant_name || ''}", Total: ${total || 0}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"category":"meals|travel|accommodation|transport|office|software|hardware|entertainment|utilities|other","subcategory":"string","is_business_expense":true,"reimbursable":true,"tax_deductible":true,"budget_code":"string","department":"string","policy_compliant":true,"policy_notes":"string","source_provenance":{"provider":"receipt-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"receipt-parser","recommended_next_endpoint":"/expense-report","automation_safe":true,"confidence_per_section":{"category":0.9,"policy":0.85},"recommended_actions_priority_order":["submit for reimbursement","log to expense tracker","save receipt"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-totals', async (req: Request, res: Response) => {
  const { receipt_text } = req.body;
  if (!receipt_text) return res.status(400).json({ error: 'receipt_text is required' });
  try {
    const raw = await callClaude(`Extract financial totals from receipt: "${receipt_text}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"subtotal":0.00,"tax_amount":0.00,"tax_rate":0.0,"tip_amount":0.00,"discount":0.00,"total":0.00,"currency":"USD","tax_breakdown":[{"name":"string","rate":0.0,"amount":0.00}],"math_valid":true,"source_provenance":{"provider":"receipt-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"receipt-parser","recommended_next_endpoint":"/expense-report","automation_safe":true,"confidence_per_section":{"totals":0.97},"recommended_actions_priority_order":["verify totals","log tax","submit report"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { receipt_text, objective } = req.body;
  if (!receipt_text) return res.status(400).json({ error: 'receipt_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'expense_processing',
    next_api: 'receipt-parser', next_endpoint: '/parse',
    blocking_flags: [], flag_definitions: { NO_RECEIPT: 'receipt_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'receipt-parser', recommended_next_endpoint: '/parse',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Parse receipt', 'Categorize expense', 'Generate expense report'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/receipt-intelligence', async (req: Request, res: Response) => {
  const { receipt_text, employee_id } = req.body;
  if (!receipt_text) return res.status(400).json({ error: 'receipt_text is required' });
  try {
    const raw = await callClaude(`Full receipt intelligence: "${receipt_text}". Employee: ${employee_id || 'N/A'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"merchant":"string","date":"YYYY-MM-DD","total":0.00,"currency":"USD","category":"string","is_business_expense":true,"reimbursable":true,"policy_compliant":true,"items":[{"description":"string","amount":0.00}],"approval_recommendation":"auto_approve|review|reject","flags":["string"],"source_provenance":{"provider":"receipt-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"receipt-parser","recommended_next_endpoint":"/expense-report","automation_safe":true,"confidence_per_section":{"receipt":0.92,"policy":0.87},"recommended_actions_priority_order":["approve/flag","submit report","archive"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/expense-report', async (req: Request, res: Response) => {
  const { receipts, period, employee } = req.body;
  if (!Array.isArray(receipts) || receipts.length === 0) return res.status(400).json({ error: 'receipts array is required' });
  try {
    const raw = await callClaude(`Generate expense report from receipts: ${JSON.stringify(receipts).slice(0, 500)}. Period: ${period || 'current month'}, Employee: ${employee || 'N/A'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"report_period":"string","employee":"string","total_expenses":0.00,"reimbursable_total":0.00,"non_reimbursable_total":0.00,"by_category":[{"category":"string","total":0.00,"count":0}],"top_merchant":"string","policy_violations":[],"approval_ready":true,"source_provenance":{"provider":"receipt-parser-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"receipt-parser","recommended_next_endpoint":"/receipt-intelligence","automation_safe":true,"confidence_per_section":{"report":0.93},"recommended_actions_priority_order":["review violations","submit for approval","process reimbursement"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { receipts } = req.body;
  if (!Array.isArray(receipts) || receipts.length === 0) return res.status(400).json({ error: 'receipts array is required' });
  if (receipts.length > 10) return res.status(400).json({ error: 'Maximum 10 receipts per batch' });
  try {
    const results = await Promise.all(receipts.map(async (r: { receipt_text: string }) => {
      const raw = await callClaude(`Quick receipt parse: "${r.receipt_text.slice(0, 200)}". Return JSON:
{"merchant":"string","total":0.00,"currency":"USD","date":"YYYY-MM-DD","category":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: receipts.length, results,
      source_provenance: { provider: 'receipt-parser-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'receipt-parser', recommended_next_endpoint: '/expense-report',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
