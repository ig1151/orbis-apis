import { Router, Request, Response } from 'express';
import { getSkill, recordInvocation } from '../store/skills';
import { logger } from '../logger';

const router = Router();

router.get('/:skillId', async (req: Request, res: Response): Promise<void> => {
  const { skillId } = req.params;

  try {
    const skill = getSkill(skillId);
    if (!skill) {
      res.status(404).json({ error: `Skill "${skillId}" not found` });
      return;
    }

    // Record view as invocation signal
    recordInvocation(skillId);

    logger.info({ skillId, name: skill.name }, 'skill detail');
    res.json({ success: true, data: skill });
  } catch (err: any) {
    logger.error({ err: err.message, skillId }, 'skill detail error');
    res.status(500).json({ error: 'Failed to fetch skill', details: err.message });
  }
});

export default router;
