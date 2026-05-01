import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import healthRouter from './routes/health';
import trendingRouter from './routes/trending';
import searchRouter from './routes/search';
import marketRouter from './routes/market';
import signalRouter from './routes/signal';
import docsRouter from './routes/docs';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use('/v1/health', healthRouter);
app.use('/v1/markets/trending', trendingRouter);
app.use('/v1/markets/search', searchRouter);
app.use('/v1/markets/signal', signalRouter);
app.use('/v1/market', marketRouter);
app.use('/', docsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'prediction-market-api started');
});

export default app;
