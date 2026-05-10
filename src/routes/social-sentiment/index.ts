import { Router } from 'express';
import cryptoRouter from './routes/crypto';
import signalsRouter from './routes/signals';
import trendingRouter from './routes/trending';

const router = Router();

router.use('/crypto-sentiment', cryptoRouter);
router.use('/signals', signalsRouter);
router.use('/trending', trendingRouter);

// Alias: POST /sentiment → /sentiment-analysis
router.post('/sentiment', async (req, res) => {
  req.url = '/sentiment-analysis';
  (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});


export default router;
