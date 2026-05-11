import { Router, Request, Response } from 'express';

import { riskSchema } from '../utils/validation';
import { assessRisk } from '../services/risk.service';
import type { RiskRequest } from '../types/index';

const riskRouter = Router();
export { riskRouter };
