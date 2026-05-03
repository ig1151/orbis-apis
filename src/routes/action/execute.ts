import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const actionRouter = Router();

const actionHistory: any[] = [];

type ActionType = 'research' | 'outreach' | 'web_fetch' | 'data_extract' | 'api_call' | 'workflow_step';

const VALID_TYPES: ActionType[] = ['research', 'outreach', 'web_fetch', 'data_extract', 'api_call', 'workflow_step'];

function buildResponse(action_id: string, action_type: string, status: string, result: any, duration_ms: number, retryable: boolean, next_action: string | null = null) {
  return {
    action_id,
    status,
    action_type,
    result,
    metadata: {
      duration_ms,
      tokens_used: null,
      cost_estimate: 0.005,
      retryable,
      next_action,
    },
  };
}

actionRouter.post('/execute', async (req: Request, res: Response) => {
  const { action_type, input = {}, constraints = {}, dry_run = false } = req.body;
  const action_id = uuidv4();
  const started_at = Date.now();

  if (!action_type) return res.status(400).json({ success: false, error: 'action_type is required' });
  if (!VALID_TYPES.includes(action_type)) return res.status(400).json({ success: false, error: `Invalid action_type. Must be one of: ${VALID_TYPES.join(', ')}` });

  if (dry_run) {
    return res.json({ action_id, status: 'pending', action_type, result: null, metadata: { duration_ms: 0, tokens_used: null, cost_estimate: 0.005, retryable: true, next_action: null }, dry_run: true });
  }

  try {
    const timeout = (constraints.timeout || 10) * 1000;
    let result: any = {};

    if (action_type === 'web_fetch' || action_type === 'data_extract') {
      const { url, extract_fields } = input;
      if (!url) throw new Error('url is required');
      const { data } = await axios.get(url, { timeout, headers: { 'User-Agent': 'OrbisBot/1.0' } });
      result = { raw_length: JSON.stringify(data).length, preview: JSON.stringify(data).slice(0, 500) };
      if (extract_fields && typeof data === 'object') {
        result.extracted = Object.fromEntries(extract_fields.map((f: string) => [f, data[f] ?? null]));
      }
    } else if (action_type === 'api_call') {
      const { url, method = 'GET', headers = {}, body, params } = input;
      if (!url) throw new Error('url is required');
      const { data, status } = await axios({ method, url, headers, data: body, params, timeout });
      result = { status, data: typeof data === 'object' ? data : { raw: String(data).slice(0, 2000) } };
    } else if (action_type === 'research') {
      result = { query: input.query || '', note: 'Research task logged. Pair with /web-researcher for full results.', suggested_api: 'https://orbis-apis.onrender.com/web-researcher' };
    } else if (action_type === 'outreach') {
      result = { recipient: input.recipient || null, subject: input.subject || null, note: 'Outreach task logged.', status: 'queued' };
    } else if (action_type === 'workflow_step') {
      result = { step: input.step || 1, label: input.label || 'unnamed', completed: true, next_step: input.next_step || null };
    }

    const duration_ms = Date.now() - started_at;
    const response = buildResponse(action_id, action_type, 'completed', result, duration_ms, false, input.next_action || null);
    actionHistory.unshift({ ...response, timestamp: new Date().toISOString() });
    if (actionHistory.length > 100) actionHistory.pop();
    return res.json(response);

  } catch (err: any) {
    const duration_ms = Date.now() - started_at;
    const response = buildResponse(action_id, action_type, 'failed', null, duration_ms, true);
    actionHistory.unshift({ ...response, error: err.message, timestamp: new Date().toISOString() });
    if (actionHistory.length > 100) actionHistory.pop();
    return res.status(500).json({ ...response, error: err.message });
  }
});

actionRouter.get('/history', (_req: Request, res: Response) => {
  const limit = Math.min(parseInt(_req.query.limit as string) || 20, 50);
  return res.json({ success: true, count: Math.min(actionHistory.length, limit), history: actionHistory.slice(0, limit) });
});

actionRouter.get('/:action_id', (req: Request, res: Response) => {
  const { action_id } = req.params;
  const action = actionHistory.find(a => a.action_id === action_id);
  if (!action) return res.status(404).json({ success: false, error: 'Action not found' });
  return res.json({ success: true, data: action });
});
