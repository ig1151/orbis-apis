import { Router } from 'express';
import createTriggerRouter from './routes/create-trigger';
import checkTriggersRouter from './routes/check-triggers';
import scoreTriggerRouter from './routes/score-trigger';
import routeAlertRouter from './routes/route-alert';
import executionGateRouter from './routes/execution-gate';
import monitorAlertsRouter from './routes/monitor-alerts';
import summarizeAlertRouter from './routes/summarize-alert';

const router = Router();

router.use('/create-trigger',   createTriggerRouter);
router.use('/check-triggers',   checkTriggersRouter);
router.use('/score-trigger',    scoreTriggerRouter);
router.use('/route-alert',      routeAlertRouter);
router.use('/execution-gate',   executionGateRouter);
router.use('/monitor-alerts',   monitorAlertsRouter);
router.use('/summarize-alert',  summarizeAlertRouter);

export default router;
