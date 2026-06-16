import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parsePointer, resolveTokens, escapeToken, Json } from '../../_aplus/jsonptr';

// Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch
// (add/remove/replace/move/copy/test) against a document atomically; /diff
// generates a patch that transforms one document into another. Pure computation,
// operating on a clone — the input is never mutated. No LLM, nothing stored.

const router = Router();

const OPS = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
const MAX_OPS = 5000;

export interface TestResult { index: number; path: string; passed: boolean; }
export interface ApplyCore {
  operation_count: number;
  applied: boolean;
  document?: Json;
  failed_at_index?: number;
  failure_reason?: string;
  test_results: TestResult[];
}
export interface DiffCore { operation_count: number; patch: PatchOp[]; }

interface PatchOp { op: string; path: string; from?: string; value?: Json; }

function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as any)[k], (b as any)[k]));
  }
  return false;
}

const clone = (v: Json): Json => structuredClone(v);
const isArrIdx = (t: string) => t === '0' || /^[1-9][0-9]*$/.test(t);

// Locate the parent container of a pointer's last token. allowAppend permits index===length / "-".
function parent(doc: Json, tokens: string[]): { ok: true; container: Json[] | { [k: string]: Json }; last: string } | { ok: false; reason: string } {
  const r = resolveTokens(doc, tokens.slice(0, -1));
  if (!r.found) return { ok: false, reason: r.reason || 'parent path not found' };
  const c = r.value as Json;
  if (c === null || typeof c !== 'object') return { ok: false, reason: 'parent is not an object or array' };
  return { ok: true, container: c as any, last: tokens[tokens.length - 1] };
}

function addOp(doc: Json, tokens: string[], value: Json): { ok: true; doc: Json } | { ok: false; reason: string } {
  if (tokens.length === 0) return { ok: true, doc: clone(value) };
  const p = parent(doc, tokens);
  if (!p.ok) return p;
  if (Array.isArray(p.container)) {
    const arr = p.container;
    if (p.last === '-') { arr.push(clone(value)); return { ok: true, doc }; }
    if (!isArrIdx(p.last)) return { ok: false, reason: `"${p.last}" is not a valid array index for add.` };
    const idx = Number(p.last);
    if (idx > arr.length) return { ok: false, reason: `add index ${idx} is out of bounds (length ${arr.length}).` };
    arr.splice(idx, 0, clone(value));
  } else {
    (p.container as any)[p.last] = clone(value);
  }
  return { ok: true, doc };
}

function removeOp(doc: Json, tokens: string[]): { ok: true; doc: Json } | { ok: false; reason: string } {
  if (tokens.length === 0) return { ok: false, reason: 'cannot remove the whole document (path "").' };
  const p = parent(doc, tokens);
  if (!p.ok) return p;
  if (Array.isArray(p.container)) {
    if (!isArrIdx(p.last)) return { ok: false, reason: `"${p.last}" is not a valid array index for remove.` };
    const idx = Number(p.last);
    if (idx >= p.container.length) return { ok: false, reason: `remove index ${idx} out of bounds (length ${p.container.length}).` };
    p.container.splice(idx, 1);
  } else {
    if (!Object.prototype.hasOwnProperty.call(p.container, p.last)) return { ok: false, reason: `key "${p.last}" does not exist for remove.` };
    delete (p.container as any)[p.last];
  }
  return { ok: true, doc };
}

function replaceOp(doc: Json, tokens: string[], value: Json): { ok: true; doc: Json } | { ok: false; reason: string } {
  const exists = resolveTokens(doc, tokens);
  if (!exists.found) return { ok: false, reason: `replace target does not exist: ${exists.reason}` };
  if (tokens.length === 0) return { ok: true, doc: clone(value) };
  const p = parent(doc, tokens) as { ok: true; container: any; last: string };
  if (Array.isArray(p.container)) p.container[Number(p.last)] = clone(value);
  else p.container[p.last] = clone(value);
  return { ok: true, doc };
}

function applyOne(doc: Json, op: PatchOp): { ok: true; doc: Json; test?: boolean } | { ok: false; reason: string } {
  const pp = parsePointer(op.path);
  if ('error' in pp) return { ok: false, reason: pp.error };
  const tokens = pp.tokens;
  switch (op.op) {
    case 'add': return addOp(doc, tokens, op.value as Json);
    case 'remove': return removeOp(doc, tokens);
    case 'replace': return replaceOp(doc, tokens, op.value as Json);
    case 'test': {
      const r = resolveTokens(doc, tokens);
      const passed = r.found && deepEqual(r.value as Json, op.value as Json);
      return passed ? { ok: true, doc, test: true } : { ok: false, reason: `test failed at ${op.path}: value does not match.` };
    }
    case 'move':
    case 'copy': {
      const fp = parsePointer(op.from as string);
      if ('error' in fp) return { ok: false, reason: `invalid "from": ${fp.error}` };
      const src = resolveTokens(doc, fp.tokens);
      if (!src.found) return { ok: false, reason: `"from" path does not exist: ${src.reason}` };
      // move into own subtree is illegal
      if (op.op === 'move' && tokens.length >= fp.tokens.length && fp.tokens.every((t, i) => t === tokens[i])) {
        return { ok: false, reason: 'cannot move a value into one of its own children.' };
      }
      const val = clone(src.value as Json);
      let work = doc;
      if (op.op === 'move') { const rm = removeOp(work, fp.tokens); if (!rm.ok) return rm; work = rm.doc; }
      return addOp(work, tokens, val);
    }
    default: return { ok: false, reason: `unknown op "${op.op}".` };
  }
}

function doApply(body: any): { error: string } | { result: ApplyCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('document' in body)) return { error: 'Provide an object with a "document" and a "patch" array.' };
  if (!Array.isArray(body.patch)) return { error: '"patch" must be an array of RFC 6902 operations.' };
  if (body.patch.length > MAX_OPS) return { error: `"patch" exceeds the ${MAX_OPS}-operation limit.` };
  const ops: PatchOp[] = [];
  for (let i = 0; i < body.patch.length; i++) {
    const o = body.patch[i];
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return { error: `patch[${i}] must be an object.` };
    if (!OPS.includes(o.op)) return { error: `patch[${i}].op must be one of: ${OPS.join(', ')}.` };
    if (typeof o.path !== 'string') return { error: `patch[${i}].path must be a string.` };
    if ((o.op === 'add' || o.op === 'replace' || o.op === 'test') && !('value' in o)) return { error: `patch[${i}] (${o.op}) requires a "value".` };
    if ((o.op === 'move' || o.op === 'copy') && typeof o.from !== 'string') return { error: `patch[${i}] (${o.op}) requires a string "from".` };
    ops.push({ op: o.op, path: o.path, from: o.from, value: o.value });
  }

  let work = clone(body.document as Json);
  const test_results: TestResult[] = [];
  for (let i = 0; i < ops.length; i++) {
    const r = applyOne(work, ops[i]);
    if (ops[i].op === 'test') test_results.push({ index: i, path: ops[i].path, passed: r.ok });
    if (!r.ok) return { result: { operation_count: ops.length, applied: false, failed_at_index: i, failure_reason: r.reason, test_results } };
    work = r.doc;
  }
  return { result: { operation_count: ops.length, applied: true, document: work, test_results } };
}

// --- diff (generate a patch transforming `from` into `to`) ---
function diff(from: Json, to: Json, base: string, out: PatchOp[]): void {
  if (deepEqual(from, to)) return;
  const aObj = from !== null && typeof from === 'object' && !Array.isArray(from);
  const bObj = to !== null && typeof to === 'object' && !Array.isArray(to);
  const aArr = Array.isArray(from), bArr = Array.isArray(to);
  if (aObj && bObj) {
    const fa = from as { [k: string]: Json }, fb = to as { [k: string]: Json };
    for (const k of Object.keys(fa)) if (!Object.prototype.hasOwnProperty.call(fb, k)) out.push({ op: 'remove', path: `${base}/${escapeToken(k)}` });
    for (const k of Object.keys(fb)) {
      const p = `${base}/${escapeToken(k)}`;
      if (!Object.prototype.hasOwnProperty.call(fa, k)) out.push({ op: 'add', path: p, value: fb[k] });
      else diff(fa[k], fb[k], p, out);
    }
  } else if (aArr && bArr) {
    const common = Math.min(from.length, to.length);
    for (let i = 0; i < common; i++) diff(from[i], to[i], `${base}/${i}`, out);
    for (let i = from.length; i < to.length; i++) out.push({ op: 'add', path: `${base}/-`, value: to[i] });
    for (let i = from.length - 1; i >= to.length; i--) out.push({ op: 'remove', path: `${base}/${i}` });
  } else {
    out.push({ op: 'replace', path: base === '' ? '' : base, value: to });
  }
}

function doDiff(body: any): { error: string } | { result: DiffCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('from' in body) || !('to' in body)) return { error: 'Provide an object with "from" and "to" documents.' };
  const out: PatchOp[] = [];
  diff(body.from as Json, body.to as Json, '', out);
  return { result: { operation_count: out.length, patch: out } };
}

const CHAIN_TO = [
  { api: 'json-pointer', reason: 'Resolve or enumerate the pointers used by these patch operations.' },
  { api: 'json-schema-validator', reason: 'Validate the patched document against a JSON Schema.' },
];
const INVALIDATORS = [
  'Patches apply atomically per RFC 6902: on the first failing operation (bad path, out-of-bounds index, missing target, or failed test) the whole patch is rejected and no document is returned.',
  'The input document is never mutated — operations run on a deep clone; "move into own subtree" is rejected as illegal.',
  'diff is deterministic and correct (applying it transforms from→to) but not guaranteed minimal: array changes are compared index-wise, so an insertion mid-array may yield replace+append rather than a single insert.',
  'Whole-document operations: add/replace with path "" replace the entire document; remove with path "" is rejected BY DESIGN (RFC 6902 removes a value from its parent, and the root has no parent) — to empty a document, replace at "" with the desired value.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JSON Patch API', version: '1.0.0',
    description: 'Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch (add/remove/replace/move/copy/test) atomically against a document; /diff generates a patch transforming one document into another. Operates on a clone — input never mutated. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/json-patch/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/apply', summary: 'Apply an RFC 6902 patch to a document', price_usdc: 0.006 },
      { method: 'POST', path: '/diff', summary: 'Generate a patch transforming from→to', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL apply + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/apply', price_usdc: 0.006, currency: 'USDC' },
      { path: '/diff', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/apply', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doApply(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ apply: 1 }, [v.applied ? `Applied all ${v.operation_count} operation(s).` : `Patch rejected at operation ${v.failed_at_index}: ${v.failure_reason}`]) });
});

router.post('/diff', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doDiff(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ diff: 1 }, [`Generated a ${v.operation_count}-operation patch transforming from→to.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doApply(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: v.applied
        ? `Applied ${v.operation_count} operation(s) atomically; ${v.test_results.length} test op(s) evaluated.`
        : `Patch rejected at operation ${v.failed_at_index}: ${v.failure_reason}`,
      key_factors: [
        `Applied: ${v.applied}.`,
        `Test ops: ${v.test_results.map((t) => `${t.path}=${t.passed ? 'pass' : 'fail'}`).join(', ') || '(none)'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ apply: 1 }, [v.applied ? `Applied all ${v.operation_count} operation(s).` : `Patch rejected at operation ${v.failed_at_index}: ${v.failure_reason}`]),
  });
});

export default router;
