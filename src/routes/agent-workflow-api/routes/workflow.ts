import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { runWorkflow } from "../workflows/runner";
import { TEMPLATES } from "../workflows/templates";
import { logger } from "../logger";

const router = Router();

// ─── In-memory store ──────────────────────────────────────────────────────────

interface StoredWorkflow {
  workflow_id: string;
  name: string;
  goal: string;
  steps_definition: { name: string; type: string }[];
  input: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result: unknown;
  steps: StepResult[];
  metadata: WorkflowMetadata;
  createdAt: string;
  updatedAt: string;
}

interface StepResult {
  step_id: string;
  name: string;
  status: "completed" | "failed" | "skipped";
  duration_ms: number;
  output: unknown;
  retryable: boolean;
}

interface WorkflowMetadata {
  duration_ms: number;
  total_steps: number;
  failed_steps: number;
  next_action: string | null;
}

const workflowStore = new Map<string, StoredWorkflow>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function successMeta(startMs: number) {
  return { timestamp: new Date().toISOString(), latencyMs: Date.now() - startMs, version: "2.0.0", provider: "orbis-agent-workflow" };
}

function buildStepsFromExecuted(stepsExecuted: string[], durationMs: number, failed: boolean): StepResult[] {
  const perStep = stepsExecuted.length > 0 ? Math.floor(durationMs / stepsExecuted.length) : 0;
  return stepsExecuted.map((name, i) => ({
    step_id: "step_" + (i + 1).toString().padStart(3, "0"),
    name,
    status: (failed && i === stepsExecuted.length - 1) ? "failed" : "completed",
    duration_ms: perStep,
    output: {},
    retryable: failed && i === stepsExecuted.length - 1,
  }));
}

function buildMetadata(steps: StepResult[], durationMs: number, status: string): WorkflowMetadata {
  const failed = steps.filter(s => s.status === "failed").length;
  return {
    duration_ms: durationMs,
    total_steps: steps.length,
    failed_steps: failed,
    next_action: status === "failed" ? "retry" : status === "completed" ? null : "wait",
  };
}

// ─── POST /create ─────────────────────────────────────────────────────────────

router.post("/create", (req: Request, res: Response) => {
  const start = Date.now();
  const { name, goal, steps = [], input = {} } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ success: false, error: { code: "MISSING_NAME", message: "name (string) is required" }, meta: successMeta(start) });
  }
  if (!goal || typeof goal !== "string") {
    return res.status(400).json({ success: false, error: { code: "MISSING_GOAL", message: "goal (string) is required" }, meta: successMeta(start) });
  }

  const workflow_id = "wf_" + uuidv4().replace(/-/g, "").slice(0, 20);
  const now = new Date().toISOString();

  const stored: StoredWorkflow = {
    workflow_id, name, goal,
    steps_definition: steps,
    input, status: "pending",
    result: null, steps: [],
    metadata: { duration_ms: 0, total_steps: steps.length, failed_steps: 0, next_action: "run" },
    createdAt: now, updatedAt: now,
  };

  workflowStore.set(workflow_id, stored);
  logger.info({ workflow_id, name, goal }, "Workflow created");

  return res.status(201).json({
    success: true,
    data: { workflow_id, name, goal, status: "pending", steps_definition: steps, input, metadata: stored.metadata, createdAt: now },
    meta: successMeta(start),
  });
});

// ─── POST /run ────────────────────────────────────────────────────────────────

router.post("/run", async (req: Request, res: Response) => {
  const start = Date.now();
  const { workflow_id, goal, workflow, input = {} } = req.body;

  if (!goal && !workflow_id) {
    return res.status(400).json({ success: false, error: { code: "MISSING_INPUT", message: "goal or workflow_id is required" }, meta: successMeta(start) });
  }

  let stored = workflow_id ? workflowStore.get(workflow_id) : null;
  const resolvedGoal = goal ?? stored?.goal ?? "";
  const resolvedId = workflow_id ?? "wf_" + uuidv4().replace(/-/g, "").slice(0, 20);

  if (stored) {
    stored.status = "running";
    stored.updatedAt = new Date().toISOString();
    workflowStore.set(resolvedId, stored);
  }

  logger.info({ workflow_id: resolvedId, goal: resolvedGoal }, "Workflow run started");

  try {
    const runResult = await runWorkflow(resolvedGoal, input as Record<string, unknown>, workflow);
    const steps = buildStepsFromExecuted(runResult.steps_executed, runResult.latency_ms, runResult.status === "failed");
    const metadata = buildMetadata(steps, runResult.latency_ms, runResult.status);

    const updated: StoredWorkflow = {
      workflow_id: resolvedId,
      name: stored?.name ?? resolvedGoal.slice(0, 50),
      goal: resolvedGoal,
      steps_definition: stored?.steps_definition ?? [],
      input: input as Record<string, unknown>,
      status: runResult.status,
      result: runResult.result,
      steps,
      metadata,
      createdAt: stored?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    workflowStore.set(resolvedId, updated);
    logger.info({ workflow_id: resolvedId, status: runResult.status }, "Workflow run complete");

    return res.json({
      success: true,
      data: {
        workflow_id: resolvedId,
        status: runResult.status,
        goal: resolvedGoal,
        result: runResult.result,
        steps,
        confidence: runResult.confidence,
        metadata,
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workflow failed";
    const steps = buildStepsFromExecuted([], Date.now() - start, true);
    const metadata = buildMetadata(steps, Date.now() - start, "failed");

    if (stored) {
      stored.status = "failed";
      stored.updatedAt = new Date().toISOString();
      workflowStore.set(resolvedId, stored);
    }

    logger.error({ workflow_id: resolvedId, err }, "Workflow run failed");

    return res.status(500).json({
      success: false,
      data: { workflow_id: resolvedId, status: "failed", steps, metadata },
      error: { code: "WORKFLOW_FAILED", message },
      meta: successMeta(start),
    });
  }
});

// ─── GET /:workflow_id ────────────────────────────────────────────────────────

router.get("/:workflow_id", (req: Request, res: Response) => {
  const start = Date.now();
  const { workflow_id } = req.params;

  if (workflow_id === "templates") return res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "Use GET /templates for templates" }, meta: successMeta(start) });

  const stored = workflowStore.get(workflow_id);
  if (!stored) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Workflow not found: " + workflow_id }, meta: successMeta(start) });
  }

  return res.json({
    success: true,
    data: {
      workflow_id: stored.workflow_id,
      name: stored.name,
      goal: stored.goal,
      status: stored.status,
      result: stored.result,
      steps: stored.steps,
      metadata: stored.metadata,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    },
    meta: successMeta(start),
  });
});

// ─── GET /:workflow_id/status ─────────────────────────────────────────────────

router.get("/:workflow_id/status", (req: Request, res: Response) => {
  const start = Date.now();
  const { workflow_id } = req.params;

  const stored = workflowStore.get(workflow_id);
  if (!stored) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Workflow not found: " + workflow_id }, meta: successMeta(start) });
  }

  return res.json({
    success: true,
    data: {
      workflow_id,
      status: stored.status,
      metadata: stored.metadata,
      updatedAt: stored.updatedAt,
    },
    meta: successMeta(start),
  });
});

// ─── POST /:workflow_id/retry ─────────────────────────────────────────────────

router.post("/:workflow_id/retry", async (req: Request, res: Response) => {
  const start = Date.now();
  const { workflow_id } = req.params;

  const stored = workflowStore.get(workflow_id);
  if (!stored) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Workflow not found: " + workflow_id }, meta: successMeta(start) });
  }
  if (stored.status !== "failed") {
    return res.status(400).json({ success: false, error: { code: "NOT_RETRYABLE", message: "Only failed workflows can be retried" }, meta: successMeta(start) });
  }

  stored.status = "running";
  stored.updatedAt = new Date().toISOString();
  workflowStore.set(workflow_id, stored);
  logger.info({ workflow_id }, "Workflow retry started");

  try {
    const runResult = await runWorkflow(stored.goal, stored.input, undefined);
    const steps = buildStepsFromExecuted(runResult.steps_executed, runResult.latency_ms, runResult.status === "failed");
    const metadata = buildMetadata(steps, runResult.latency_ms, runResult.status);

    stored.status = runResult.status;
    stored.result = runResult.result;
    stored.steps = steps;
    stored.metadata = metadata;
    stored.updatedAt = new Date().toISOString();
    workflowStore.set(workflow_id, stored);

    return res.json({
      success: true,
      data: { workflow_id, status: runResult.status, steps, metadata, result: runResult.result },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retry failed";
    stored.status = "failed";
    stored.updatedAt = new Date().toISOString();
    workflowStore.set(workflow_id, stored);
    return res.status(500).json({ success: false, error: { code: "RETRY_FAILED", message }, meta: successMeta(start) });
  }
});

// ─── POST /:workflow_id/optimize ──────────────────────────────────────────────

router.post("/:workflow_id/optimize", (req: Request, res: Response) => {
  const start = Date.now();
  const { workflow_id } = req.params;

  const stored = workflowStore.get(workflow_id);
  if (!stored) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Workflow not found: " + workflow_id }, meta: successMeta(start) });
  }

  const slowSteps = stored.steps.filter(s => s.duration_ms > 2000);
  const failedSteps = stored.steps.filter(s => s.status === "failed");
  const suggestions: string[] = [];

  if (slowSteps.length > 0) suggestions.push("parallelize_slow_steps");
  if (failedSteps.length > 0) suggestions.push("add_retry_logic");
  if (stored.steps.length > 5) suggestions.push("cache_intermediate_results");
  if (stored.metadata.duration_ms > 10000) suggestions.push("reduce_search_depth");
  if (suggestions.length === 0) suggestions.push("workflow_already_optimized");

  const optimizedSteps = stored.steps_definition.map(s => ({ ...s, timeout_ms: 5000, retries: 2 }));

  return res.json({
    success: true,
    data: {
      workflow_id,
      original_duration_ms: stored.metadata.duration_ms,
      estimated_optimized_duration_ms: Math.floor(stored.metadata.duration_ms * 0.65),
      suggestions,
      optimized_steps: optimizedSteps,
      slow_steps: slowSteps.map(s => s.name),
      failed_steps: failedSteps.map(s => s.name),
    },
    meta: successMeta(start),
  });
});


// ─── POST /decompose ──────────────────────────────────────────────────────────

router.post("/decompose", async (req: Request, res: Response) => {
  const start = Date.now();
  const { goal, context = {}, max_steps = 6 } = req.body;

  if (!goal || typeof goal !== "string") {
    return res.status(400).json({ success: false, error: { code: "MISSING_GOAL", message: "goal (string) is required" }, meta: successMeta(start) });
  }

  try {
    const { callClaudeJSON } = await import("../executors/anthropic");
    const plan = await callClaudeJSON(`You are an agent workflow planner. Decompose this goal into ${max_steps} or fewer concrete executable steps.
Goal: "${goal}"
Context: ${JSON.stringify(context)}

Return a JSON object with this exact shape:
{
  "steps": [
    { "name": "step_name", "description": "what this step does", "type": "search|extract|analyze|synthesize|validate|enrich", "depends_on": [], "estimated_duration_ms": 2000, "retryable": true }
  ],
  "estimated_total_duration_ms": 10000,
  "complexity": "low|medium|high",
  "recommended_template": "template name or null"
}`) as {
      steps: { name: string; description: string; type: string; depends_on: string[]; estimated_duration_ms: number; retryable: boolean }[];
      estimated_total_duration_ms: number;
      complexity: string;
      recommended_template: string | null;
    } | null;

    if (!plan || !plan.steps) {
      throw new Error("Failed to decompose goal into steps");
    }

    const workflow_id = "wf_" + uuidv4().replace(/-/g, "").slice(0, 20);

    logger.info({ workflow_id, goal, step_count: plan.steps.length }, "Workflow decomposed");

    return res.status(201).json({
      success: true,
      data: {
        workflow_id,
        goal,
        steps: plan.steps.map((s, i) => ({
          step_id: "step_" + (i + 1).toString().padStart(3, "0"),
          name: s.name,
          description: s.description,
          type: s.type,
          depends_on: s.depends_on,
          estimated_duration_ms: s.estimated_duration_ms,
          retryable: s.retryable,
        })),
        estimated_total_duration_ms: plan.estimated_total_duration_ms,
        complexity: plan.complexity,
        recommended_template: plan.recommended_template,
        next_action: "run",
        run_url: "/agent-workflow/run",
      },
      confidence: { score: 0.92, signals: ["goal_parsed", "steps_planned", "dependencies_mapped"] },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decomposition failed";
    return res.status(500).json({ success: false, error: { code: "DECOMPOSE_FAILED", message }, meta: successMeta(start) });
  }
});

// ─── GET /templates ───────────────────────────────────────────────────────────

router.get("/templates", (_req: Request, res: Response) => {
  const start = Date.now();
  const templates = Object.entries(TEMPLATES).map(([key, t]) => ({
    template_id: key,
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
    output_schema: t.output_schema,
    steps: t.steps,
    estimated_duration_ms: 8000,
    retryable: true,
  }));

  return res.json({
    success: true,
    data: { templates, count: templates.length },
    meta: successMeta(start),
  });
});

export default router;
