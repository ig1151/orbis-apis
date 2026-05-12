import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import intelligenceRouter from './routes/intelligence';

const app = express();
const PORT = parseInt(process.env.PORT || '3021', 10);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

app.use('/v1/market-intelligence', intelligenceRouter);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => logger.info({ port: PORT }, 'market-intelligence-api started'));
export default app;
