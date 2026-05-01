import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validateBody } from '../middleware/validate';
import { getAllSkills, recordInvocation } from '../store/skills';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { SkillMatch } from '../types';

const router = Router();

const schema = Joi.object({
  request: Joi.string().min(5).max(500).required(),
  limit: Joi.number().min(1).max(5).default(3),
});

router.post('/', validateBody(schema), async (req: Request, res: Response): Promise<void> => {
  const { request, limit } = req.body;

  try {
    const allSkills = getAllSkills();

    const skillsSummary = allSkills.map(s =>
      `ID: ${s.skillId} | Name: ${s.name} | Category: ${s.category} | Capabilities: ${s.capabilities.join(', ')} | Description: ${s.description}`
    ).join('\n');

    const aiPrompt = `You are an AI agent capability matcher. An agent needs a skill to fulfill a request. Find the best matching skills from the registry.

Agent Request: "${request}"

Available Skills:
${skillsSummary}

Respond ONLY in this JSON format (no markdown):
{
  "matches": [
    {
      "skillId": "string",
      "matchScore": number (0-100),
      "matchReason": "string (1 sentence why this skill matches)",
      "recommendedParams": {"paramName": "suggestedValue"} or null
    }
  ],
  "explanation": "string (2 sentences: which skill best fulfills the request and how to use it)"
}

Return top ${limit} matches sorted by matchScore descending.`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { matches: [], explanation: aiResponse.slice(0, 300) };
    }

    const matches = (parsed.matches || []).map((m: any) => {
      const skill = allSkills.find(s => s.skillId === m.skillId);
      if (!skill) return null;
      recordInvocation(skill.skillId);
      return {
        skill,
        matchScore: m.matchScore,
        matchReason: m.matchReason,
        recommendedParams: m.recommendedParams || null,
      };
    }).filter(Boolean).slice(0, limit);

    const bestMatch = matches[0]?.skill || null;

    const result: SkillMatch = {
      request,
      matches,
      bestMatch,
      aiExplanation: parsed.explanation || '',
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ request: request.slice(0, 50), matchCount: matches.length, bestMatch: bestMatch?.skillId }, 'skills/match');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'match error');
    res.status(500).json({ error: 'Failed to match skills', details: err.message });
  }
});

export default router;
