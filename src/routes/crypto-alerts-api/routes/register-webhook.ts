import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { registerWebhook, removeWebhook, getWebhook, listWebhooks } from '../services/dispatcher';

const router = Router();

// POST /register-webhook
router.post('/', (req: Request, res: Response): void => {
  const start = Date.now();
  const { url, secret, symbols, condition_types } = req.body;

  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const id = 'wh_' + uuidv4().replace(/-/g, '').slice(0, 12);

  const entry = {
    id,
    url,
    secret: secret ?? undefined,
    symbols: Array.isArray(symbols) ? symbols.map((s: string) => s.toUpperCase()) : [],
    condition_types: Array.isArray(condition_types) ? condition_types : [],
    createdAt: Date.now(),
  };

  registerWebhook(entry);

  res.status(201).json({
    webhook_id: id,
    url,
    symbols_subscribed: entry.symbols.length > 0 ? entry.symbols : ['ALL'],
    condition_types_subscribed: entry.condition_types.length > 0 ? entry.condition_types : ['ALL'],
    secret_set: !!secret,
    signature_header: 'x-orbis-signature',
    signature_format: 'sha256=<hmac-sha256-hex>',
    status: 'active',
    fired: false,
    urgency: 'low',
    confidence: 0,
    market_impact_score: 0,
    recommended_action: 'wait_for_trigger',
    execution_ready: false,
    next_api: 'crypto-alerts',
    next_endpoint: '/check-triggers',
    metadata: {
      latency_ms: Date.now() - start,
      estimated_cost: 0.0,
    },
  });
});

// DELETE /register-webhook/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const removed = removeWebhook(req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }
  res.json({ success: true, webhook_id: req.params.id, status: 'deleted' });
});

// GET /register-webhook — list all
router.get('/', (_req: Request, res: Response): void => {
  const all = listWebhooks();
  res.json({
    count: all.length,
    webhooks: all.map(w => ({
      webhook_id: w.id,
      url: w.url,
      symbols_subscribed: w.symbols.length > 0 ? w.symbols : ['ALL'],
      condition_types: w.condition_types.length > 0 ? w.condition_types : ['ALL'],
      secret_set: !!w.secret,
      created_at: new Date(w.createdAt).toISOString(),
    })),
  });
});

// GET /register-webhook/:id
router.get('/:id', (req: Request, res: Response): void => {
  const wh = getWebhook(req.params.id);
  if (!wh) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }
  res.json({
    webhook_id: wh.id,
    url: wh.url,
    symbols_subscribed: wh.symbols.length > 0 ? wh.symbols : ['ALL'],
    condition_types: wh.condition_types.length > 0 ? wh.condition_types : ['ALL'],
    secret_set: !!wh.secret,
    created_at: new Date(wh.createdAt).toISOString(),
  });
});

export default router;
