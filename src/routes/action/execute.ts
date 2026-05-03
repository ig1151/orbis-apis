import { Router, Request, Response } from 'express';
import axios from 'axios';

export const actionRouter = Router();

type TaskType = 'web_fetch' | 'api_call' | 'data_transform';

interface TaskInput {
  task_type: TaskType;
  input: Record<string, any>;
  constraints?: { timeout?: number; max_steps?: number };
  dry_run?: boolean;
}

async function executeWebFetch(input: any, timeout: number): Promise<any> {
  const { url, extract_fields } = input;
  if (!url) throw new Error('url is required for web_fetch');
  const start = Date.now();
  const { data } = await axios.get(url, { timeout, headers: { 'User-Agent': 'OrbisBot/1.0' } });
  const text = typeof data === 'string' ? data.slice(0, 5000) : JSON.stringify(data).slice(0, 5000);
  const result: any = { raw_length: text.length, preview: text.slice(0, 500) };
  if (extract_fields && Array.isArray(extract_fields)) {
    if (typeof data === 'object') {
      result.extracted = {};
      for (const field of extract_fields) {
        result.extracted[field] = data[field] ?? null;
      }
    }
  }
  return { result, duration_ms: Date.now() - start };
}

async function executeApiCall(input: any, timeout: number): Promise<any> {
  const { url, method = 'GET', headers = {}, body, params } = input;
  if (!url) throw new Error('url is required for api_call');
  const start = Date.now();
  const { data, status } = await axios({ method, url, headers, data: body, params, timeout });
  return { result: { status, data: typeof data === 'object' ? data : { raw: String(data).slice(0, 2000) } }, duration_ms: Date.now() - start };
}

async function executeDataTransform(input: any): Promise<any> {
  const { data, operation, options = {} } = input;
  if (!data || !operation) throw new Error('data and operation are required for data_transform');
  const start = Date.now();
  let result: any;

  if (operation === 'filter') {
    const { field, operator, value } = options;
    result = Array.isArray(data) ? data.filter((item: any) => {
      if (operator === 'eq') return item[field] === value;
      if (operator === 'gt') return item[field] > value;
      if (operator === 'lt') return item[field] < value;
      if (operator === 'contains') return String(item[field]).includes(value);
      return true;
    }) : data;
  } else if (operation === 'map') {
    const { fields } = options;
    result = Array.isArray(data) && fields
      ? data.map((item: any) => Object.fromEntries(fields.map((f: string) => [f, item[f]])))
      : data;
  } else if (operation === 'aggregate') {
    const { field, func } = options;
    if (!Array.isArray(data)) throw new Error('data must be an array for aggregate');
    const values = data.map((item: any) => Number(item[field])).filter(v => !isNaN(v));
    if (func === 'sum') result = { [field + '_sum']: values.reduce((a, b) => a + b, 0) };
    else if (func === 'avg') result = { [field + '_avg']: values.reduce((a, b) => a + b, 0) / values.length };
    else if (func === 'min') result = { [field + '_min']: Math.min(...values) };
    else if (func === 'max') result = { [field + '_max']: Math.max(...values) };
    else if (func === 'count') result = { count: values.length };
    else throw new Error('Unknown aggregate func: ' + func);
  } else if (operation === 'sort') {
    const { field, order = 'asc' } = options;
    result = Array.isArray(data) ? [...data].sort((a, b) => order === 'asc' ? a[field] > b[field] ? 1 : -1 : a[field] < b[field] ? 1 : -1) : data;
  } else {
    throw new Error('Unknown operation: ' + operation);
  }

  return { result, duration_ms: Date.now() - start };
}

actionRouter.post('/execute', async (req: Request, res: Response) => {
  const { task_type, input, constraints = {}, dry_run = false }: TaskInput = req.body;
  const timeout = (constraints.timeout || 10) * 1000;
  const started_at = new Date().toISOString();

  if (!task_type || !input) {
    return res.status(400).json({ success: false, error: 'task_type and input are required' });
  }

  const valid_types: TaskType[] = ['web_fetch', 'api_call', 'data_transform'];
  if (!valid_types.includes(task_type)) {
    return res.status(400).json({ success: false, error: `Invalid task_type. Must be one of: ${valid_types.join(', ')}` });
  }

  if (dry_run) {
    return res.json({
      success: true,
      dry_run: true,
      message: 'Dry run — task validated but not executed',
      execution: { task_type, input, constraints, started_at, steps: 0, duration_ms: 0, errors: [] },
    });
  }

  try {
    let outcome: any;
    let steps = 1;

    if (task_type === 'web_fetch') outcome = await executeWebFetch(input, timeout);
    else if (task_type === 'api_call') outcome = await executeApiCall(input, timeout);
    else if (task_type === 'data_transform') { outcome = await executeDataTransform(input); steps = 0; }

    return res.json({
      success: true,
      result: outcome.result,
      execution: { task_type, started_at, steps, duration_ms: outcome.duration_ms, errors: [] },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      result: null,
      execution: { task_type, started_at, steps: 0, duration_ms: 0, errors: [err.message] },
    });
  }
});
