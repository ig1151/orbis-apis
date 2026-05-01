import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import healthRouter from './routes/health';
import registerRouter from './routes/register';
import discoverRouter from './routes/discover';
import skillDetailRouter from './routes/skillDetail';
import matchRouter from './routes/match';
import trendingRouter from './routes/trending';
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
app.use('/v1/skills/register', registerRouter);
app.use('/v1/skills/discover', discoverRouter);
app.use('/v1/skills/trending', trendingRouter);
app.use('/v1/skills/match', matchRouter);
app.use('/v1/skills', skillDetailRouter);
app.use('/', docsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'agent-skills-api started');
});

export default app;
