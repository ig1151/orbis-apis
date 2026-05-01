import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import healthRouter from './routes/health';
import strategyRouter from './routes/strategy';
import docsRouter from './routes/docs';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // lower limit — each call hits 3 external APIs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use('/v1/health', healthRouter);
app.use('/v1/strategy', strategyRouter);
app.use('/', docsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'strategy-signal-api started');
});

export default app;
