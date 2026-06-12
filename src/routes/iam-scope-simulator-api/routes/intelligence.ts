import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic IAM-style policy simulator. Evaluates AWS-flavored
// allow/deny statements (action + resource, with * and ? wildcards) against one
// or more action/resource requests using the standard precedence: an explicit
// Deny always wins, otherwise an Allow grants, otherwise the default is an
// implicit deny. Pure set/glob evaluation — no LLM, no live IAM calls. It models
// Effect/Action/Resource only (no Conditions, NotAction, or Principals).

const router = Router();
const MAX_POLICIES = 200;
const MAX_REQUESTS = 100;

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') return [v];
  return [];
}
function globToRegExp(pattern: string, flags: string): RegExp {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp('^' + esc + '$', flags);
}
const actionMatch = (pattern: string, value: string) => globToRegExp(pattern, 'i').test(value);
const resourceMatch = (pattern: string, value: string) => globToRegExp(pattern, '').test(value);

interface Stmt { effect: 'Allow' | 'Deny'; actions: string[]; resources: string[]; sid: string | null; index: number; }

export interface Evaluated {
  action: string; resource: string; decision: 'Allow' | 'Deny' | 'ImplicitDeny'; allowed: boolean;
  matched_allow: number[]; matched_deny: number[];
  deciding_statement: { index: number; sid: string | null; effect: 'Allow' | 'Deny' } | null; reason: string;
}
export interface SimCore {
  evaluated: Evaluated[]; request_count: number; allow_count: number; deny_count: number; statement_count: number;
}

function parseStatements(raw: any): { error: string } | Stmt[] {
  if (!Array.isArray(raw) || raw.length === 0) return { error: '"policies" must be a non-empty array of statements.' };
  if (raw.length > MAX_POLICIES) return { error: `"policies" exceeds the ${MAX_POLICIES}-statement limit.` };
  const out: Stmt[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (s === null || typeof s !== 'object' || Array.isArray(s)) return { error: `policies[${i}] must be an object.` };
    if (s.effect !== 'Allow' && s.effect !== 'Deny') return { error: `policies[${i}].effect must be "Allow" or "Deny".` };
    const actions = asList(s.actions);
    const resources = asList(s.resources);
    if (actions.length === 0) return { error: `policies[${i}].actions must be a non-empty string or array.` };
    if (resources.length === 0) return { error: `policies[${i}].resources must be a non-empty string or array.` };
    out.push({ effect: s.effect, actions, resources, sid: typeof s.sid === 'string' ? s.sid : null, index: i });
  }
  return out;
}

function evaluate(stmts: Stmt[], action: string, resource: string): Evaluated {
  const matched_allow: number[] = [];
  const matched_deny: number[] = [];
  for (const s of stmts) {
    const aHit = s.actions.some((p) => actionMatch(p, action));
    const rHit = s.resources.some((p) => resourceMatch(p, resource));
    if (aHit && rHit) (s.effect === 'Deny' ? matched_deny : matched_allow).push(s.index);
  }
  if (matched_deny.length) {
    const di = matched_deny[0]; const s = stmts.find((x) => x.index === di)!;
    return { action, resource, decision: 'Deny', allowed: false, matched_allow, matched_deny, deciding_statement: { index: di, sid: s.sid, effect: 'Deny' }, reason: `Explicit Deny in statement ${s.sid ?? `#${di}`} overrides any Allow.` };
  }
  if (matched_allow.length) {
    const ai = matched_allow[0]; const s = stmts.find((x) => x.index === ai)!;
    return { action, resource, decision: 'Allow', allowed: true, matched_allow, matched_deny, deciding_statement: { index: ai, sid: s.sid, effect: 'Allow' }, reason: `Allowed by statement ${s.sid ?? `#${ai}`} with no matching Deny.` };
  }
  return { action, resource, decision: 'ImplicitDeny', allowed: false, matched_allow, matched_deny, deciding_statement: null, reason: 'No statement matches this action/resource — default deny.' };
}

export function simulate(body: any): { error: string } | { result: SimCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide "policies" and a "request" (or "requests").' };
  const stmts = parseStatements(body.policies);
  if ('error' in stmts) return stmts;

  let reqs: { action: string; resource: string }[] = [];
  if (Array.isArray(body.requests)) {
    if (body.requests.length === 0 || body.requests.length > MAX_REQUESTS) return { error: `"requests" must have 1..${MAX_REQUESTS} items.` };
    for (let i = 0; i < body.requests.length; i++) {
      const q = body.requests[i];
      if (q === null || typeof q !== 'object' || typeof q.action !== 'string' || typeof q.resource !== 'string') return { error: `requests[${i}] must have string "action" and "resource".` };
      reqs.push({ action: q.action, resource: q.resource });
    }
  } else if (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) {
    if (typeof body.request.action !== 'string' || typeof body.request.resource !== 'string') return { error: '"request" must have string "action" and "resource".' };
    reqs = [{ action: body.request.action, resource: body.request.resource }];
  } else {
    return { error: 'Provide "request" {action, resource} or "requests" [{action, resource}, …].' };
  }

  const evaluated = reqs.map((q) => evaluate(stmts, q.action, q.resource));
  const allow_count = evaluated.filter((e) => e.allowed).length;
  return { result: { evaluated, request_count: evaluated.length, allow_count, deny_count: evaluated.length - allow_count, statement_count: stmts.length } };
}

const CHAIN_TO = [
  { api: 'oauth-scope-diff', reason: 'Compare the OAuth scopes a token carries against what these actions require.' },
  { api: 'jwt-claim-policy-validator', reason: 'Validate the identity claims of the principal making the request.' },
];
const INVALIDATORS = [
  'This models Effect/Action/Resource with * and ? globs only — it does NOT evaluate Conditions, NotAction/NotResource, Principals, permission boundaries, SCPs, or session policies, all of which can change the real decision.',
  'Action matching is case-insensitive and resource matching is case-sensitive glob; provider-specific ARN semantics (e.g. path-aware matching) are not modeled.',
  'A simulated Allow is necessary but not sufficient — the live authorizer may deny via mechanisms outside the supplied statements.',
];

function actions(r: SimCore): string[] {
  const first = r.evaluated[0];
  return [
    r.request_count === 1
      ? `Decision: ${first.decision} for ${first.action} on ${first.resource}. ${first.reason}`
      : `${r.allow_count}/${r.request_count} request(s) allowed; ${r.deny_count} denied.`,
    first.decision === 'Deny' ? 'An explicit Deny is in effect — remove or scope it down if access is intended.' : (first.decision === 'ImplicitDeny' ? 'Add an Allow statement covering this action/resource if access is intended.' : 'Confirm no Conditions or boundary policies further restrict this at runtime.'),
    'Re-simulate after any policy edit; least-privilege beats broad wildcards.',
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'IAM Scope Simulator API', version: '1.0.0',
    description: 'Deterministic IAM-style policy simulator. Evaluates AWS-flavored allow/deny statements (action + resource with * and ? wildcards) against action/resource requests using standard precedence: explicit Deny wins, else Allow grants, else implicit deny. Models Effect/Action/Resource only. No LLM, no live IAM calls.',
    openapi_url: 'https://orbis-apis.onrender.com/iam-scope-simulator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/simulate', summary: 'Simulate policy decision(s)', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL simulate + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/simulate', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: SimCore) => ({
  confidence_score: 0.9, confidence_per_section: { evaluation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/simulate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = simulate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = simulate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.statement_count} statement(s) evaluated against ${v.request_count} request(s): ${v.allow_count} Allow, ${v.deny_count} deny.`,
      key_factors: [
        'Precedence: explicit Deny > Allow > implicit deny.',
        `First request → ${v.evaluated[0].decision} (${v.evaluated[0].reason})`,
        `Matched allow stmts: [${v.evaluated[0].matched_allow.join(', ')}], deny stmts: [${v.evaluated[0].matched_deny.join(', ')}].`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
