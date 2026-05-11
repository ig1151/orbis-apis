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

// Alias: POST /sentiment → /sentiment-analysis
router.post('/sentiment', async (req, res) => {
  req.url = '/sentiment-analysis';
  (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});


export default router;
