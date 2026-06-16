import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parsePointer, resolveTokens, enumerateLeaves, jsonType, Json } from '../../_aplus/jsonptr';

// Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers
// against a supplied JSON document (with ~0/~1 unescaping and array-index rules),
// and can enumerate every leaf pointer of a document. Pure computation — no LLM,
// nothing fetched, nothing stored.

const router = Router();

const MAX_POINTERS = 2000;
const ENUM_HARD_CAP = 20000;

export interface ResolveEntry { pointer: string; found: boolean; value?: Json; type?: string; reason?: string; }
export interface ResolveCore { document_type: string; requested: number; found_count: number; missing_count: number; results: ResolveEntry[]; }
export interface EnumerateCore { document_type: string; leaf_count: number; truncated: boolean; entries: { pointer: string; value: Json; type: string }[]; }

function hasDoc(body: any): boolean {
  return body !== null && typeof body === 'object' && !Array.isArray(body) && 'document' in body;
}

function resolveOne(doc: Json, pointer: string): ResolveEntry {
  const p = parsePointer(pointer);
  if ('error' in p) return { pointer, found: false, reason: p.error };
  const r = resolveTokens(doc, p.tokens);
  return r.found ? { pointer, found: true, value: r.value, type: jsonType(r.value as Json) } : { pointer, found: false, reason: r.reason };
}

function doResolve(body: any): { error: string } | { result: ResolveCore } {
  if (!hasDoc(body)) return { error: 'Provide an object with a "document" and "pointer" (or "pointers").' };
  const doc = body.document as Json;
  let pointers: string[];
  if (Array.isArray(body.pointers)) {
    if (body.pointers.length === 0) return { error: '"pointers" must be a non-empty array of JSON Pointer strings.' };
    if (body.pointers.length > MAX_POINTERS) return { error: `"pointers" exceeds the ${MAX_POINTERS}-pointer limit.` };
    if (!body.pointers.every((s: unknown) => typeof s === 'string')) return { error: '"pointers" must contain only strings.' };
    pointers = body.pointers as string[];
  } else if (typeof body.pointer === 'string') {
    pointers = [body.pointer];
  } else {
    return { error: 'Provide "pointer" (string) or "pointers" (string[]).' };
  }
  const results = pointers.map((p) => resolveOne(doc, p));
  const found_count = results.filter((r) => r.found).length;
  return { result: { document_type: jsonType(doc), requested: results.length, found_count, missing_count: results.length - found_count, results } };
}

function doEnumerate(body: any): { error: string } | { result: EnumerateCore } {
  if (!hasDoc(body)) return { error: 'Provide an object with a "document".' };
  const doc = body.document as Json;
  let max = 5000;
  if (body.max !== undefined) {
    if (typeof body.max !== 'number' || !Number.isInteger(body.max) || body.max < 1 || body.max > ENUM_HARD_CAP) return { error: `"max" must be an integer in [1, ${ENUM_HARD_CAP}].` };
    max = body.max;
  }
  const entries = enumerateLeaves(doc, max + 1);
  const truncated = entries.length > max;
  const kept = truncated ? entries.slice(0, max) : entries;
  return { result: { document_type: jsonType(doc), leaf_count: kept.length, truncated, entries: kept } };
}

const CHAIN_TO = [
  { api: 'json-patch', reason: 'Mutate the document at these pointers with RFC 6902 add/remove/replace operations.' },
  { api: 'json-schema-validator', reason: 'Validate the document these pointers address against a JSON Schema.' },
];
const INVALIDATORS = [
  'Pointers follow RFC 6901: tokens are ~1→"/" and ~0→"~" unescaped; array indices must be "0" or have no leading zeros; "-" (end-of-array) is reported as not-found because it addresses no existing element.',
  'A pointer is "not found" (not an error) when the path does not exist in this document; only malformed pointers (not starting with "/") are reported via reason without a value.',
  'Resolution reflects only the supplied document; a value of null is a real found value, distinguished from missing by the found flag.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JSON Pointer API', version: '1.0.0',
    description: 'Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers against a supplied JSON document and can enumerate every leaf pointer. No LLM, nothing fetched, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/json-pointer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/resolve', summary: 'Resolve one or many JSON Pointers', price_usdc: 0.005 },
      { method: 'POST', path: '/enumerate', summary: 'List every leaf pointer in a document', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL resolve + reasoning', price_usdc: 0.010 },
    ],
    pricing: [
      { path: '/resolve', price_usdc: 0.005, currency: 'USDC' },
      { path: '/enumerate', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.010, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/resolve', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doResolve(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ resolution: 1 }, [`Resolved ${v.found_count}/${v.requested} pointer(s); ${v.missing_count} not found.`]) });
});

router.post('/enumerate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doEnumerate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ enumeration: 1 }, [`Enumerated ${v.leaf_count} leaf pointer(s)${v.truncated ? ' (truncated — raise max for more)' : ''}.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doResolve(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Resolved ${v.requested} JSON Pointer(s) against a ${v.document_type} document: ${v.found_count} found, ${v.missing_count} missing.`,
      key_factors: [
        `Found: ${v.results.filter((x) => x.found).map((x) => x.pointer || '""').join(', ') || '(none)'}.`,
        `Missing: ${v.results.filter((x) => !x.found).map((x) => `${x.pointer || '""'} (${x.reason})`).join('; ') || '(none)'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ resolution: 1 }, [`Resolved ${v.found_count}/${v.requested} pointer(s); ${v.missing_count} not found.`]),
  });
});

export default router;
