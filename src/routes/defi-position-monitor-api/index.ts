import { Router } from 'express';
import scanPositionRouter from './routes/scan-position';
import scoreHealthRouter from './routes/score-health';
import detectLiquidationRiskRouter from './routes/detect-liquidation-risk';
import recommendActionRouter from './routes/recommend-action';
import rebalancePlanRouter from './routes/rebalance-plan';
import executionGateRouter from './routes/execution-gate';
import monitorPositionRouter from './routes/monitor-position';
import summarizePositionRouter from './routes/summarize-position';

const router = Router();

router.use('/scan-position',           scanPositionRouter);
router.use('/score-health',            scoreHealthRouter);
router.use('/detect-liquidation-risk', detectLiquidationRiskRouter);
router.use('/recommend-action',        recommendActionRouter);
router.use('/rebalance-plan',          rebalancePlanRouter);
router.use('/execution-gate',          executionGateRouter);
router.use('/monitor-position',        monitorPositionRouter);
router.use('/summarize-position',      summarizePositionRouter);

export default router;
