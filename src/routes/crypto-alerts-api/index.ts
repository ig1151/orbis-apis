import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import healthRouter from './routes/health';
import createAlertRouter from './routes/createAlert';
import checkAlertsRouter from './routes/checkAlerts';
import feedRouter from './routes/feed';
import whaleActivityRouter from './routes/whaleActivity';
import summaryRouter from './routes/summary';
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
app.use('/v1/alerts/create', createAlertRouter);
app.use('/v1/alerts/check', checkAlertsRouter);
app.use('/v1/alerts/feed', feedRouter);
app.use('/v1/alerts/summary', summaryRouter);
app.use('/v1/whale/activity', whaleActivityRouter);
app.use('/', docsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'crypto-alerts-api started');
});

export default app;
