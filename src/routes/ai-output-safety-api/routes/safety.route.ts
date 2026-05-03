import { Router, Request, Response, NextFunction } from "express";
import { checkSchema, batchSchema } from "../utils/validation";
import { checkSafety } from "../services/safety.service";
import type { CheckRequest, BatchRequest } from "../types/index";
import Joi from "joi";

export const safetyRouter = Router();

function successMeta(startMs: number) {
  return { timestamp: new Date().toISOString(), latencyMs: Date.now() - startMs, version: "2.0.0", provider: "orbis-agent-output-safety" };
}

function toStandardFormat(result: any, startMs: number) {
  const categoryList = Object.entries(result.categories ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const score = result.confidence ?? 0.8;
  const riskLevel = !result.safe && result.decision === "unsafe" ? "high"
    : result.decision === "review" ? "medium" : "low";

  const suggestedAction = result.decision === "unsafe" ? "block"
    : result.decision === "review" ? "modify" : "allow";

  return {
    id: result.id,
    safe: result.safe,
    risk_level: riskLevel,
    categories: categoryList,
    score: parseFloat((result.safe ? score : 1 - score).toFixed(3)),
    suggested_action: suggestedAction,
    cleaned_output: null,
    issues: result.issues ?? [],
    flagged_segments: result.flagged_segments ?? [],
    recommendation: result.recommendation ?? "",
    confidence: result.confidence ?? 0.8,
    metadata: {
      latency_ms: result.latency_ms ?? Date.now() - startMs,
      decision: result.decision,
      version: "2.0.0",
    },
  };
}

// ─── POST /check ──────────────────────────────────────────────────────────────

safetyRouter.post("/check", async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const { error, value } = checkSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.details.map(d => d.message) }, meta: successMeta(start) });
    }
    const result = await checkSafety(value as CheckRequest);
    return res.status(200).json({
      success: true,
      data: toStandardFormat(result, start),
      meta: successMeta(start),
    });
  } catch (err) { next(err); }
});

// ─── POST /batch ──────────────────────────────────────────────────────────────

safetyRouter.post("/batch", async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const { error, value } = batchSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.details.map(d => d.message) }, meta: successMeta(start) });
    }
    const results = await Promise.allSettled((value as BatchRequest).checks.map((c: CheckRequest) => checkSafety(c)));
    const out = results.map(r => r.status === "fulfilled" ? toStandardFormat(r.value, start) : { error: r.reason instanceof Error ? r.reason.message : "Unknown" });
    const safeCount = out.filter(r => !("error" in r) && (r as any).safe).length;
    return res.status(200).json({
      success: true,
      data: {
        batch_id: "batch_" + Date.now(),
        total: (value as BatchRequest).checks.length,
        safe_count: safeCount,
        unsafe_count: (value as BatchRequest).checks.length - safeCount,
        results: out,
      },
      meta: successMeta(start),
    });
  } catch (err) { next(err); }
});

// ─── POST /redact ─────────────────────────────────────────────────────────────

const redactSchema = Joi.object({
  text: Joi.string().min(1).max(50000).required(),
  categories: Joi.array().items(Joi.string()).default(["pii", "toxicity", "policy_violation"]),
  replacement: Joi.string().default("[REDACTED]"),
  context: Joi.string().max(500).optional(),
});

safetyRouter.post("/redact", async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const { error, value } = redactSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.details.map(d => d.message) }, meta: successMeta(start) });
    }

    const checkResult = await checkSafety({ text: value.text, context: value.context, check_categories: value.categories });
    const formatted = toStandardFormat(checkResult, start);

    let cleanedOutput = value.text;
    const redactedItems: string[] = [];

    for (const segment of checkResult.flagged_segments ?? []) {
      if (segment && cleanedOutput.includes(segment)) {
        cleanedOutput = cleanedOutput.split(segment).join(value.replacement);
        redactedItems.push(segment);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: checkResult.id,
        safe: formatted.safe,
        risk_level: formatted.risk_level,
        categories: formatted.categories,
        score: formatted.score,
        suggested_action: cleanedOutput !== value.text ? "allow" : formatted.suggested_action,
        original_length: value.text.length,
        cleaned_output: cleanedOutput,
        redacted_count: redactedItems.length,
        redacted_segments: redactedItems,
        metadata: {
          latency_ms: Date.now() - start,
          replacement_token: value.replacement,
          version: "2.0.0",
        },
      },
      meta: successMeta(start),
    });
  } catch (err) { next(err); }
});

// ─── POST /score ──────────────────────────────────────────────────────────────

const scoreSchema = Joi.object({
  text: Joi.string().min(1).max(50000).required(),
  context: Joi.string().max(500).optional(),
  threshold: Joi.number().min(0).max(1).default(0.8),
});

safetyRouter.post("/score", async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const { error, value } = scoreSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.details.map(d => d.message) }, meta: successMeta(start) });
    }

    const checkResult = await checkSafety({ text: value.text, context: value.context });
    const formatted = toStandardFormat(checkResult, start);

    const passesThreshold = formatted.score >= value.threshold;

    return res.status(200).json({
      success: true,
      data: {
        id: checkResult.id,
        score: formatted.score,
        safe: formatted.safe,
        risk_level: formatted.risk_level,
        passes_threshold: passesThreshold,
        threshold: value.threshold,
        suggested_action: formatted.suggested_action,
        categories: formatted.categories,
        recommendation: checkResult.recommendation,
        metadata: {
          latency_ms: Date.now() - start,
          version: "2.0.0",
        },
      },
      meta: successMeta(start),
    });
  } catch (err) { next(err); }
});

// ─── Legacy: POST / (backwards compat) ───────────────────────────────────────

safetyRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const { error, value } = checkSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.details.map(d => d.message) }, meta: successMeta(start) });
    }
    const result = await checkSafety(value as CheckRequest);
    return res.status(200).json({
      success: true,
      data: toStandardFormat(result, start),
      meta: successMeta(start),
    });
  } catch (err) { next(err); }
});
