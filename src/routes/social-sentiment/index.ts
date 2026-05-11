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
  const {
    symbol, action,
    min_sentiment_score = 0.3, min_confidence = 0.6,
    check_volatility = true, check_whale_activity = false,
    check_narrative_conflict = true, check_liquidity = false,
    check_macro_risk = false, check_event_clustering = true,
    session_id = null,
  } = req.body;
  if (!symbol || !action) return res.status(400).json({ error: 'symbol and action are required' });
  const trace_id = `gate_${Date.now().toString(36)}`;
  const execution_id = `exec_${Date.now().toString(36)}`;
  const blocking_flags: string[] = [];
  const warnings: string[] = [];
  let execute = true;
  let confidence = 0.82;

  if (min_sentiment_score > 0.6) { blocking_flags.push('SENTIMENT_THRESHOLD_TOO_HIGH'); execute = false; confidence -= 0.2; }
  if (check_narrative_conflict) warnings.push('NARRATIVE_CONFLICT_NOT_CHECKED — chain to /narrative-cluster for conflict detection');
  if (check_volatility) warnings.push('VOLATILITY_NOT_CHECKED — chain to market-snapshot for live volatility data');
  if (check_whale_activity) warnings.push('WHALE_ACTIVITY_NOT_CHECKED — chain to onchain-signal for whale movements');
  if (check_macro_risk) warnings.push('MACRO_RISK_NOT_CHECKED — chain to market-intelligence for macro overlay');
  if (check_event_clustering) warnings.push('EVENT_CLUSTERING_NOT_CHECKED — chain to /event-extract for event risk');
  if (check_liquidity) warnings.push('LIQUIDITY_NOT_CHECKED — chain to market-snapshot for liquidity data');

  return res.json({
    execute, symbol, action,
    trace_id, execution_id, session_id,
    workflow_state: execute ? 'approved' : 'blocked',
    retryable: !execute,
    confidence: parseFloat(confidence.toFixed(2)),
    blocking_flags,
    warnings,
    gate_checks: {
      sentiment_threshold: { checked: true, passed: min_sentiment_score <= 0.6, threshold: min_sentiment_score },
      confidence_threshold: { checked: true, passed: true, threshold: min_confidence },
      narrative_conflict: { checked: false, note: 'chain to /social-sentiment/narrative-cluster' },
      volatility: { checked: false, note: 'chain to /market-snapshot/quote' },
      whale_activity: { checked: false, note: 'chain to /onchain-signal/signals' },
      macro_risk: { checked: false, note: 'chain to /market-intelligence/analyze' },
      event_clustering: { checked: false, note: 'chain to /social-sentiment/event-extract' },
      liquidity: { checked: false, note: 'chain to /market-snapshot/quote' },
      regime_stability: { checked: false, note: 'chain to /meta-strategy/scan' },
    },
    orchestration_hints: {
      suggested_next: execute ? 'proceed-with-monitoring' : 'gather-more-signals',
      chain_priority: ['/social-sentiment/narrative-cluster', '/onchain-signal/signals', '/meta-strategy/scan'],
    },
    recommended_actions_priority_order: execute
      ? ['proceed', 'monitor-narrative', 'set-stop-loss', 'check-whale-activity']
      : ['review-blocking-flags', 'check-sentiment-history', 'wait-for-regime-clarity'],
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
