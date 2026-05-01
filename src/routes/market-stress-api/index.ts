import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { router } from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many requests.' } }));
app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next(); });
app.use('/', router);
app.listen(PORT, () => console.log(`market-stress-api running on port ${PORT}`));
