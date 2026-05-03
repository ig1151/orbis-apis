import { Router, Request, Response } from "express";
import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import { runTask } from "../tasks/runner";
import { runWorkflow, WORKFLOWS } from "../tasks/workflows";
import { fetchPage, searchTavily } from "../tasks/fetch";
import { extractText, extractTables, extractMeta } from "../tasks/extract";
import { claudeExtract, claudeSummarize } from "../tasks/claude";
import { logger } from "../logger";

const router = Router();

// ─── In-memory task store ─────────────────────────────────────────────────────

interface StoredTask {
  task_id: string;
  task_type: string;
  goal: string;
  status: "pending" | "running" | "completed" | "failed";
  result: unknown;
  trace: string[];
  latency_ms: number;
  createdAt: string;
}

const taskStore = new Map<string, StoredTask>();

function successMeta(startMs: number) {
  return { timestamp: new Date().toISOString(), latencyMs: Date.now() - startMs, version: "2.0.0", provider: "orbis-browser-task" };
}

// ─── POST /run ────────────────────────────────────────────────────────────────

const runSchema = Joi.object({
  goal: Joi.string().min(5).max(500).required(),
  task_type: Joi.string().valid("search_and_extract", "visit_and_summarize", "extract_table").required(),
  url: Joi.string().uri().optional(),
  query: Joi.string().max(200).optional(),
  output_schema: Joi.object().optional(),
  max_results: Joi.number().integer().min(1).max(10).default(3),
});

router.post("/run", async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = runSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_FAILED", message: error.details[0].message }, meta: successMeta(start) });
  }

  const task_id = "task_" + uuidv4().replace(/-/g, "").slice(0, 20);
  logger.info({ task_id, task_type: value.task_type, goal: value.goal }, "Task started");

  const stored: StoredTask = {
    task_id, task_type: value.task_type, goal: value.goal,
    status: "running", result: null, trace: [], latency_ms: 0,
    createdAt: new Date().toISOString(),
  };
  taskStore.set(task_id, stored);

  const result = await runTask(value);

  stored.status = (result.status as string) === "success" ? "completed" : "failed";
  stored.result = result.result;
  stored.trace = result.trace;
  stored.latency_ms = result.latency_ms;
  taskStore.set(task_id, stored);

  logger.info({ task_id, status: result.status, latency_ms: result.latency_ms }, "Task complete");

  return res.json({
    success: (result.status as string) === "success",
    data: {
      task_id,
      task_type: result.task_type,
      goal: result.goal,
      status: stored.status,
      result: result.result,
      trace: result.trace,
      metadata: { latency_ms: result.latency_ms, timestamp: result.timestamp },
    },
    meta: successMeta(start),
  });
});

// ─── POST /workflow/run ───────────────────────────────────────────────────────

const workflowSchema = Joi.object({
  workflow: Joi.string().required(),
  input: Joi.object().pattern(Joi.string(), Joi.string()).required(),
});

router.post("/workflow/run", async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = workflowSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_FAILED", message: error.details[0].message }, meta: successMeta(start) });
  }

  const task_id = "wftask_" + uuidv4().replace(/-/g, "").slice(0, 16);
  logger.info({ task_id, workflow: value.workflow }, "Workflow task started");

  const result = await runWorkflow(value);

  taskStore.set(task_id, {
    task_id, task_type: "workflow:" + value.workflow, goal: value.workflow,
    status: (result.status as string) === "success" ? "completed" : "failed",
    result: result.result, trace: result.trace ?? [],
    latency_ms: result.latency_ms, createdAt: new Date().toISOString(),
  });

  logger.info({ task_id, workflow: value.workflow, status: result.status }, "Workflow task complete");

  return res.json({
    success: (result.status as string) === "success",
    data: {
      task_id,
      workflow: value.workflow,
      status: (result.status as string) === "success" ? "completed" : "failed",
      result: result.result,
      metadata: { latency_ms: result.latency_ms, timestamp: result.timestamp },
    },
    meta: successMeta(start),
  });
});

// ─── POST /extract ────────────────────────────────────────────────────────────

const extractSchema = Joi.object({
  url: Joi.string().uri().required(),
  goal: Joi.string().min(3).max(300).required(),
  output_schema: Joi.object().optional(),
  extract_tables: Joi.boolean().default(false),
});

router.post("/extract", async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = extractSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_FAILED", message: error.details[0].message }, meta: successMeta(start) });
  }

  const task_id = "ext_" + uuidv4().replace(/-/g, "").slice(0, 18);

  try {
    const html = await fetchPage(value.url);
    const meta = extractMeta(html);
    const text = extractText(html);
    const tables = value.extract_tables ? extractTables(html) : [];
    const extracted = await claudeExtract(text, value.goal, value.output_schema);

    logger.info({ task_id, url: value.url, goal: value.goal }, "Extract complete");

    return res.json({
      success: true,
      data: {
        task_id,
        url: value.url,
        title: meta.title,
        description: meta.description,
        extracted,
        tables: value.extract_tables ? tables : undefined,
        metadata: { latency_ms: Date.now() - start, char_count: text.length, table_count: tables.length },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return res.status(500).json({ success: false, error: { code: "EXTRACT_FAILED", message }, meta: successMeta(start) });
  }
});

// ─── POST /screenshot ─────────────────────────────────────────────────────────

const screenshotSchema = Joi.object({
  url: Joi.string().uri().required(),
  goal: Joi.string().min(3).max(300).optional(),
  summarize: Joi.boolean().default(true),
});

router.post("/screenshot", async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = screenshotSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_FAILED", message: error.details[0].message }, meta: successMeta(start) });
  }

  const task_id = "ss_" + uuidv4().replace(/-/g, "").slice(0, 18);

  try {
    const html = await fetchPage(value.url);
    const meta = extractMeta(html);
    const text = extractText(html);
    const summary = value.summarize && value.goal ? await claudeSummarize(text, value.goal) : null;

    logger.info({ task_id, url: value.url }, "Screenshot/capture complete");

    return res.json({
      success: true,
      data: {
        task_id,
        url: value.url,
        title: meta.title,
        description: meta.description,
        summary: summary ?? null,
        text_preview: text.slice(0, 500),
        screenshot_url: null,
        note: "Full headless screenshot requires Puppeteer/Playwright. Text capture is available now.",
        metadata: { latency_ms: Date.now() - start, char_count: text.length },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screenshot failed";
    return res.status(500).json({ success: false, error: { code: "SCREENSHOT_FAILED", message }, meta: successMeta(start) });
  }
});

// ─── GET /tasks ───────────────────────────────────────────────────────────────

router.get("/tasks", (_req: Request, res: Response) => {
  const start = Date.now();
  const tasks = Array.from(taskStore.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)
    .map(t => ({
      task_id: t.task_id,
      task_type: t.task_type,
      goal: t.goal.slice(0, 80),
      status: t.status,
      latency_ms: t.latency_ms,
      createdAt: t.createdAt,
    }));

  return res.json({
    success: true,
    data: { tasks, count: tasks.length },
    meta: successMeta(start),
  });
});

// ─── GET /workflows ───────────────────────────────────────────────────────────

router.get("/workflows", (_req: Request, res: Response) => {
  const start = Date.now();
  return res.json({
    success: true,
    data: { workflows: WORKFLOWS, count: WORKFLOWS.length },
    meta: successMeta(start),
  });
});

// ─── GET /:task_id ────────────────────────────────────────────────────────────

router.get("/:task_id", (req: Request, res: Response) => {
  const start = Date.now();
  const { task_id } = req.params;

  const task = taskStore.get(task_id);
  if (!task) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Task not found: " + task_id }, meta: successMeta(start) });
  }

  return res.json({
    success: true,
    data: {
      task_id: task.task_id,
      task_type: task.task_type,
      goal: task.goal,
      status: task.status,
      result: task.result,
      trace: task.trace,
      metadata: { latency_ms: task.latency_ms, createdAt: task.createdAt },
    },
    meta: successMeta(start),
  });
});

export default router;
