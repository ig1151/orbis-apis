import { Router, Request, Response } from 'express';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { respond, fail } from '../../_aplus/scaffold';

// Deterministic Server-Sent Events parser for LLM streaming responses. Parses raw
// text/event-stream text per the WHATWG spec — event/data/id/retry fields, multi-
// line data joined with \n, comment lines, blank-line event boundaries — into
// structured events, best-effort JSON-parsing each data payload and flagging the
// [DONE] terminator. Pure parsing — no LLM, no delta assembly (provider-specific).

const router = Router();
const MAX_CHARS = 500_000;

export interface SseEvent { event: string | null; id: string | null; data: string; data_json: unknown; data_is_json: boolean; retry: number | null; is_done: boolean; }
export interface ParseCore {
  event_count: number; comment_count: number; json_parsed_count: number; done: boolean; byte_length: number;
  events: SseEvent[];
}

export function parseSse(body: any): { error: string } | { result: ParseCore } {
  const text = str(body?.text);
  if (text === undefined) return { error: 'Provide "text" as a non-empty raw SSE (text/event-stream) string.' };
  if (text.length > MAX_CHARS) return { error: `"text" exceeds the ${MAX_CHARS}-character limit (${text.length}).` };
  const parse_json = body?.parse_json !== false;

  const lines = text.split(/\r\n|\r|\n/);
  const events: SseEvent[] = [];
  let comment_count = 0;

  let dataLines: string[] = [];
  let evField: string | null = null;
  let idField: string | null = null;
  let retryField: number | null = null;
  let hasField = false;

  const reset = () => { dataLines = []; evField = null; idField = null; retryField = null; hasField = false; };
  const dispatch = () => {
    if (!hasField && dataLines.length === 0) { reset(); return; }
    const data = dataLines.join('\n');
    const is_done = data.trim() === '[DONE]';
    let data_json: unknown = null, data_is_json = false;
    if (parse_json && !is_done && data !== '') {
      try { data_json = JSON.parse(data); data_is_json = true; } catch { /* not JSON */ }
    }
    events.push({ event: evField, id: idField, data, data_json, data_is_json, retry: retryField, is_done });
    reset();
  };

  for (const line of lines) {
    if (line === '') { dispatch(); continue; }
    if (line[0] === ':') { comment_count++; continue; }
    const idx = line.indexOf(':');
    let field: string, value: string;
    if (idx === -1) { field = line; value = ''; }
    else { field = line.slice(0, idx); value = line.slice(idx + 1); if (value[0] === ' ') value = value.slice(1); }
    hasField = true;
    switch (field) {
      case 'data': dataLines.push(value); break;
      case 'event': evField = value; break;
      case 'id': idField = value; break;
      case 'retry': { const n = parseInt(value, 10); if (Number.isFinite(n)) retryField = n; break; }
      default: break; // unknown field ignored per spec
    }
  }
  dispatch(); // emit a trailing event with no terminating blank line (convenience)

  const json_parsed_count = events.filter((e) => e.data_is_json).length;
  const done = events.some((e) => e.is_done);

  return {
    result: { event_count: events.length, comment_count, json_parsed_count, done, byte_length: Buffer.byteLength(text, 'utf8'), events },
  };
}

function actions(r: ParseCore): string[] {
  const out = [`Parsed ${r.event_count} SSE event(s)${r.comment_count ? `, ${r.comment_count} comment(s)` : ''}; ${r.json_parsed_count} with JSON data.`];
  if (r.done) out.push('Stream terminated: [DONE] sentinel present.');
  else out.push('No [DONE] sentinel — the stream text may be incomplete/truncated.');
  return out;
}

const CHAIN_TO = [
  { api: 'json-repair', reason: 'Salvage a data payload that failed to parse as JSON.' },
  { api: 'conversation-cost-ledger', reason: 'Tally token usage if the stream carried usage events.' },
];
const INVALIDATORS = [
  'Parsing follows the text/event-stream spec on the full text you provide; transport chunk boundaries are ignored.',
  'data_json is a best-effort JSON.parse of each data field — provider-specific delta formats are not interpreted or assembled into final content.',
  'A trailing event without a terminating blank line is still emitted for convenience, which a strict client would not dispatch.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'SSE / Streaming Chunk Parser API', version: '1.0.0',
    description: 'Deterministic Server-Sent Events parser for LLM streaming responses. Parses raw text/event-stream text (event/data/id/retry fields, multi-line data, comments, blank-line boundaries) into structured events, best-effort JSON-parses each data payload, and flags the [DONE] terminator. Pure parsing — no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/sse-parser/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/parse', summary: 'Parse raw SSE into structured events', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL parse + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/parse', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/parse', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = parseSse(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1, confidence_per_section: { parse: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = parseSse(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.event_count} event(s) parsed from ${v.byte_length} bytes; ${v.json_parsed_count} JSON, done=${v.done}.`,
      key_factors: [`${v.event_count} events, ${v.comment_count} comments.`, `${v.json_parsed_count} data payloads parsed as JSON.`, v.done ? '[DONE] sentinel present.' : 'No [DONE] sentinel.'],
      invalidators: INVALIDATORS,
    },
    confidence_score: 1, confidence_per_section: { parse: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
