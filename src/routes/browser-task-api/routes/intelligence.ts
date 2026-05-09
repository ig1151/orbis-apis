import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content ?? '';
}

function parseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { raw };
  }
}

function successMeta(startMs: number) {
  return {
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startMs,
    version: '2.0.0',
    provider: 'orbis-browser-task',
  };
}

// ─── POST /autofill ───────────────────────────────────────────────────────────

const autofillSchema = Joi.object({
  page_context: Joi.string().min(1).max(5000).required(),
  field_data: Joi.object().required(),
  form_type: Joi.string().valid('checkout', 'signup', 'contact', 'search', 'custom').optional(),
  smart_fill: Joi.boolean().optional(),
});

router.post('/autofill', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = autofillSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'af_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Generate step-by-step autofill instructions for this web form. Map provided data to form fields intelligently, handle edge cases, and validate the mapping.

Form context:
${value.page_context}

Data to fill:
${JSON.stringify(value.field_data, null, 2)}

${value.form_type ? `Form type: ${value.form_type}` : ''}
${value.smart_fill !== undefined ? `Smart fill: ${value.smart_fill}` : ''}

Return a JSON object with exactly these fields:
- fill_instructions: array of {field_selector: string, field_label: string, value: string, action: "type"|"select"|"check"|"upload", confidence: number (0-1)}
- unmapped_fields: array of {field: string, reason: string}
- validation_checks: array of {field: string, rule: string}
- estimated_completion_rate: number (0-1)
- warnings: array of strings
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}
- confidence_per_section: object with section names as keys and confidence numbers as values

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, form_type: value.form_type }, 'Autofill complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Autofill failed';
    return res.status(500).json({
      success: false,
      error: { code: 'AUTOFILL_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /click-path ─────────────────────────────────────────────────────────

const clickPathSchema = Joi.object({
  goal: Joi.string().min(1).max(500).required(),
  page_context: Joi.string().min(1).max(5000).required(),
  starting_url: Joi.string().uri().optional(),
  constraints: Joi.array().items(Joi.string()).optional(),
  max_steps: Joi.number().integer().min(1).max(50).optional(),
});

router.post('/click-path', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = clickPathSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'cp_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Generate an optimal click path to achieve this goal on this page. Provide step-by-step instructions with selectors, actions, and validation checks.

Goal: ${value.goal}

Page context:
${value.page_context}

${value.starting_url ? `Starting URL: ${value.starting_url}` : ''}
${value.constraints?.length ? `Constraints (avoid these): ${value.constraints.join(', ')}` : ''}
${value.max_steps ? `Maximum steps: ${value.max_steps}` : ''}

Return a JSON object with exactly these fields:
- steps: array of {step_number: number, action: "click"|"scroll"|"hover"|"wait"|"type"|"navigate", target: string, value: string or null, verification: string, fallback: string}
- total_steps: number
- estimated_duration_seconds: number
- risk_points: array of {step: number, risk: string, mitigation: string}
- success_criteria: array of strings
- confidence_per_section: object with section names as keys and confidence numbers as values
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, goal: value.goal }, 'Click-path complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Click-path generation failed';
    return res.status(500).json({
      success: false,
      error: { code: 'CLICK_PATH_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /capture-structured-data ───────────────────────────────────────────

const captureStructuredDataSchema = Joi.object({
  page_content: Joi.string().min(1).max(50000).required(),
  data_schema: Joi.object().required(),
  extraction_hints: Joi.array().items(Joi.string()).optional(),
  fallback_values: Joi.object().optional(),
});

router.post('/capture-structured-data', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = captureStructuredDataSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'csd_' + uuidv4().replace(/-/g, '').slice(0, 17);

  try {
    const prompt = `Extract structured data from this page content according to the target schema. Handle missing fields gracefully and validate extracted values.

Target schema:
${JSON.stringify(value.data_schema, null, 2)}

${value.extraction_hints?.length ? `Extraction hints: ${value.extraction_hints.join('; ')}` : ''}
${value.fallback_values ? `Fallback values for missing fields: ${JSON.stringify(value.fallback_values)}` : ''}

Page content:
${value.page_content}

Return a JSON object with exactly these fields:
- extracted_data: object matching the provided schema
- extraction_confidence: number (0-1)
- fields_extracted: number
- fields_missing: array of strings (field names not found)
- fields_defaulted: array of {field: string, default_used: string}
- data_quality_issues: array of {field: string, issue: string}
- confidence_per_section: object with section names as keys and confidence numbers as values
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id }, 'Capture-structured-data complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Structured data capture failed';
    return res.status(500).json({
      success: false,
      error: { code: 'CAPTURE_STRUCTURED_DATA_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /screenshot-analysis ────────────────────────────────────────────────

const screenshotAnalysisSchema = Joi.object({
  screenshot_description: Joi.string().min(1).max(5000).required(),
  analysis_goal: Joi.string().min(1).max(500).required(),
  context: Joi.string().max(2000).optional(),
  extract_elements: Joi.array().items(Joi.string()).optional(),
  check_for: Joi.array().items(Joi.string()).optional(),
});

router.post('/screenshot-analysis', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = screenshotAnalysisSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'sa_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Analyze this screenshot description for the specified goal. Identify UI elements, detect issues, extract information, and suggest actions.

Screenshot description:
${value.screenshot_description}

Analysis goal: ${value.analysis_goal}

${value.context ? `Additional context: ${value.context}` : ''}
${value.extract_elements?.length ? `Elements to find: ${value.extract_elements.join(', ')}` : ''}
${value.check_for?.length ? `Check for: ${value.check_for.join(', ')}` : ''}

Return a JSON object with exactly these fields:
- analysis_result: string (overall analysis narrative)
- elements_found: array of {element_type: string, description: string, location_hint: string, actionable: boolean}
- issues_detected: array of {issue: string, severity: "critical"|"high"|"medium"|"low", recommended_fix: string}
- extracted_information: object (key-value pairs of any information extracted)
- suggested_actions: array of {action: string, priority: "high"|"medium"|"low", selector_hint: string}
- page_type: string
- confidence_per_section: object with section names as keys and confidence numbers as values
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, analysis_goal: value.analysis_goal }, 'Screenshot-analysis complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Screenshot analysis failed';
    return res.status(500).json({
      success: false,
      error: { code: 'SCREENSHOT_ANALYSIS_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /execution-gate ─────────────────────────────────────────────────────

const executionGateSchema = Joi.object({
  browser_action: Joi.string().min(1).max(1000).required(),
  page_context: Joi.string().min(1).max(5000).required(),
  risk_threshold: Joi.number().min(0).max(1).optional(),
  requires_auth: Joi.boolean().optional(),
  irreversible: Joi.boolean().optional(),
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = executionGateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'eg_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Evaluate whether this browser action is safe to execute. Check for irreversibility, authentication requirements, and potential negative outcomes.

Browser action to evaluate:
${value.browser_action}

Page context:
${value.page_context}

${value.risk_threshold !== undefined ? `Risk threshold (reject if risk_score exceeds this): ${value.risk_threshold}` : ''}
${value.requires_auth !== undefined ? `Requires authentication: ${value.requires_auth}` : ''}
${value.irreversible !== undefined ? `Caller flagged as irreversible: ${value.irreversible}` : ''}

Return a JSON object with exactly these fields:
- execute: boolean (whether this action should be allowed to proceed)
- confidence: number (0-1, confidence in this assessment)
- risk_score: number (0-1, overall risk level)
- irreversible: boolean (whether this action cannot be undone)
- blocking_flags: array of strings (specific reasons blocking execution)
- warnings: array of strings (non-blocking concerns)
- recommended_action: "proceed"|"confirm_first"|"abort"|"alternative_approach"
- safer_alternative: string or null (description of a safer way to achieve the goal)
- chain_to: array of strings (suggested follow-up actions if proceeding)
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, recommended_action: (result as Record<string, unknown>).recommended_action }, 'Execution-gate complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution gate evaluation failed';
    return res.status(500).json({
      success: false,
      error: { code: 'EXECUTION_GATE_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

export default router;
