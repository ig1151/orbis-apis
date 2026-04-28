import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import actionRouter from './routes/action';
import docsRouter from './routes/docs';
import openapiRouter from './routes/openapi';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/', (_req, res) => {
  res.json({
    service: 'action-api',
    version: '1.0.0',
    description: 'Execution layer for AI agents — take action on leads, companies and outreach with one call.',
    status: 'ok',
    docs: '/docs',
    health: '/v1/health',
    endpoints: {
      execute_action: 'POST /v1/action',
      list_actions: 'GET /v1/actions',
    },
    example: {
      action: 'send_outreach',
      company: 'Stripe',
      contact_role: 'VP of Engineering',
      goal: 'sell API monitoring product',
    },
  });
});

app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'action-api', timestamp: new Date().toISOString() });
});

app.use('/v1', actionRouter);
app.use('/docs', docsRouter);
app.use('/openapi.json', openapiRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Action API running');
});
