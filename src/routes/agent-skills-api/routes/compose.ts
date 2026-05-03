import { Router, Request, Response } from "express";
import Joi from "joi";
import { validateBody } from "../middleware/validate";
import { getAllSkills, recordInvocation } from "../store/skills";
import { callAI } from "../services/ai";
import { logger } from "../logger";

const router = Router();

const schema = Joi.object({
  task: Joi.string().min(5).max(500).required(),
  max_skills: Joi.number().min(1).max(8).default(5),
  context: Joi.object().default({}),
});

router.post("/", validateBody(schema), async (req: Request, res: Response): Promise<void> => {
  const { task, max_skills, context } = req.body;

  try {
    const allSkills = getAllSkills();
    const skillsSummary = allSkills.map(s =>
      "ID: " + s.skillId + " | Name: " + s.name + " | Category: " + s.category + " | Capabilities: " + s.capabilities.join(", ")
    ).join("\n");

    const aiPrompt = [
      "You are an AI agent workflow composer. Given a task, return the ordered sequence of skills needed to complete it.",
      "",
      "Task: " + task,
      "Context: " + JSON.stringify(context),
      "Max skills to use: " + max_skills,
      "",
      "Available Skills:",
      skillsSummary,
      "",
      "Respond ONLY in this JSON format (no markdown):",
      JSON.stringify({
        skills: [{
          skillId: "string",
          name: "string",
          step: "number",
          purpose: "1 sentence: why this skill is needed at this step",
          depends_on: ["skillId of previous step or empty array"],
          estimated_duration_ms: "number",
          required: "true or false"
        }],
        confidence: "number 0-1",
        complexity: "low|medium|high",
        explanation: "2 sentences: how these skills work together to complete the task",
        estimated_total_duration_ms: "number"
      }, null, 2),
      "",
      "Return skills in execution order. Only include skills from the registry above.",
    ].join("\n");

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { skills: [], confidence: 0, explanation: aiResponse.slice(0, 300) };
    }

    const skills = (parsed.skills || []).map((s: any) => {
      const skill = allSkills.find(sk => sk.skillId === s.skillId);
      if (!skill) return null;
      recordInvocation(skill.skillId);
      return {
        skillId: s.skillId,
        name: s.name || skill.name,
        step: s.step,
        purpose: s.purpose,
        depends_on: s.depends_on || [],
        estimated_duration_ms: s.estimated_duration_ms || 2000,
        required: s.required !== false,
        endpoint: skill.endpoint,
        method: skill.method,
        pricePerCall: skill.pricePerCall,
      };
    }).filter(Boolean).slice(0, max_skills);

    logger.info({ task: task.slice(0, 50), skillCount: skills.length, confidence: parsed.confidence }, "skills/compose");

    res.status(201).json({
      success: true,
      data: {
        task,
        skills,
        confidence: parsed.confidence ?? 0.85,
        complexity: parsed.complexity ?? "medium",
        explanation: parsed.explanation ?? "",
        estimated_total_duration_ms: parsed.estimated_total_duration_ms ?? skills.length * 2000,
        next_action: "execute",
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        provider: "orbis-agent-skills",
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "compose error");
    res.status(500).json({ success: false, error: "Failed to compose skill sequence", details: err.message });
  }
});

export default router;
