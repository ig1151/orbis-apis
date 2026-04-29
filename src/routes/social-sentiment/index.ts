import { Router } from 'express';
import cryptoRouter from './routes/crypto';
import signalsRouter from './routes/signals';
import trendingRouter from './routes/trending';

const router = Router();

router.use('/crypto-sentiment', cryptoRouter);
router.use('/signals', signalsRouter);
router.use('/trending', trendingRouter);

export default router;
