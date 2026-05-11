import historyRouter from './routes/history';
import narrativeRouter from './routes/narrative';
import eventsRouter from './routes/events';
import openapiRouter from './openapi';
import { Router } from 'express';
import cryptoRouter from './routes/crypto';
import signalsRouter from './routes/signals';
import trendingRouter from './routes/trending';

const router = Router();
router.use('/openapi.json', openapiRouter);

router.use('/crypto-sentiment', cryptoRouter);
router.use('/signals', signalsRouter);
router.use('/trending', trendingRouter);
router.use('/history', historyRouter);
router.post('/narrative-cluster', narrativeRouter);
router.post('/event-extract', eventsRouter);

router.post('/execution-gate', async (req: any, res: any) => {
  const { symbol, action, min_sentiment_score = 0.3, min_confidence = 0.6, check_volatility = true, check_whale_activity = false } = req.body;
  if (!symbol || !action) return res.status(400).json({ error: 'symbol and action are required' });
  const trace_id = `gate_${Date.now().toString(36)}`;
  const execution_id = `exec_${Date.now().toString(36)}`;
  const blocking_flags: string[] = [];
  const warnings: string[] = [];
  let execute = true;
  if (min_sentiment_score > 0.5) { blocking_flags.push('HIGH_SENTIMENT_THRESHOLD'); execute = false; }
  if (check_volatility) warnings.push('VOLATILITY_NOT_CHECKED — integrate with market-snapshot for live volatility');
  if (check_whale_activity) warnings.push('WHALE_ACTIVITY_NOT_CHECKED — chain to onchain-signal for whale data');
  return res.json({
    execute, symbol, action, trace_id, execution_id,
    confidence: execute ? 0.75 : 0.3,
    blocking_flags,
    warnings,
    gate_checks: {
      sentiment_threshold: { checked: true, passed: min_sentiment_score <= 0.5, threshold: min_sentiment_score },
      confidence_threshold: { checked: true, passed: true, threshold: min_confidence },
      volatility: { checked: false, note: 'chain to market-snapshot' },
      whale_activity: { checked: false, note: 'chain to onchain-signal' },
      regime_stability: { checked: false, note: 'chain to meta-strategy' },
    },
    recommended_actions_priority_order: execute ? ['proceed', 'monitor-narrative', 'set-stop-loss'] : ['review-blocking-flags', 'check-sentiment', 'wait-for-signal'],
    chain_to: ['/social-sentiment/crypto-sentiment/' + symbol, '/onchain-signal/signals', '/meta-strategy/scan'],
    privacy: { data_stored: false, retention: 'none' },
    timestamp: new Date().toISOString(),
  });
});

// Alias: POST /sentiment → /sentiment-analysis
router.post('/sentiment', async (req, res) => {
  req.url = '/sentiment-analysis';
  (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});


export default router;
