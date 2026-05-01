import { Router, Request, Response } from 'express';
import { skillCount, getCategories } from '../store/skills';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'agent-skills-api',
    version: '1.0.0',
    registeredSkills: skillCount(),
    categories: getCategories(),
    timestamp: new Date().toISOString(),
  });
});
export default router;
