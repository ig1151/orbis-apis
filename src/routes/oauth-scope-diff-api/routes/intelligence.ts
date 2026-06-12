import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic OAuth scope diff. Compares a granted scope set against a required
// set and returns what is missing, what is extra (over-grant), and whether the
// grant satisfies the requirement. Accepts space- or comma-delimited strings or
// arrays, and an optional scope hierarchy so a broad scope (e.g. "admin") can
// imply narrower ones. Pure set math — no LLM, no token introspection.

const router = Router();
const MAX_SCOPES = 1000;

function asScopes(v: unknown): string[] {
  let arr: string[] = [];
  if (Array.isArray(v)) arr = v.map((x) => String(x).trim());
  else if (typeof v === 'string') arr = v.split(/[\s,]+/).map((s) => s.trim());
  return [...new Set(arr.filter(Boolean))];
}

function expand(scopes: string[], hierarchy: Record<string, string[]>): string[] {
  const out = new Set(scopes);
  const queue = [...scopes];
  let guard = 0;
  while (queue.length && guard++ < MAX_SCOPES * 4) {
    const s = queue.shift()!;
    const implied = hierarchy[s];
    if (Array.isArray(implied)) for (const i of implied) { const v = String(i).trim(); if (v && !out.has(v)) { out.add(v); queue.push(v); } }
  }
  return [...out];
}

export interface DiffCore {
  granted: string[]; required: string[]; granted_expanded: string[]; used_hierarchy: boolean;
  missing: string[]; extra: string[]; overlap: string[];
  satisfied: boolean; satisfied_count: number; required_count: number;
}

export function diff(body: any): { error: string } | { result: DiffCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide "granted" and "required" scope sets.' };
  if (body.granted === undefined || body.required === undefined) return { error: 'Both "granted" and "required" are required (string or array of scopes).' };
  const granted = asScopes(body.granted);
  const required = asScopes(body.required);
  if (granted.length > MAX_SCOPES || required.length > MAX_SCOPES) return { error: `Scope sets must each have at most ${MAX_SCOPES} entries.` };
  if (required.length === 0) return { error: '"required" must contain at least one scope.' };

  let hierarchy: Record<string, string[]> = {};
  let used_hierarchy = false;
  if (body.hierarchy !== undefined) {
    if (body.hierarchy === null || typeof body.hierarchy !== 'object' || Array.isArray(body.hierarchy)) return { error: '"hierarchy" must be an object mapping a scope to the scopes it implies.' };
    for (const k of Object.keys(body.hierarchy)) { if (!Array.isArray(body.hierarchy[k])) return { error: `hierarchy["${k}"] must be an array of implied scopes.` }; }
    hierarchy = body.hierarchy; used_hierarchy = Object.keys(hierarchy).length > 0;
  }

  const grantedExpanded = used_hierarchy ? expand(granted, hierarchy) : granted;
  const grantedSet = new Set(grantedExpanded);
  const requiredSet = new Set(required);

  const missing = required.filter((s) => !grantedSet.has(s));
  const extra = granted.filter((s) => !requiredSet.has(s));
  const overlap = required.filter((s) => grantedSet.has(s));

  return {
    result: {
      granted, required, granted_expanded: grantedExpanded, used_hierarchy,
      missing, extra, overlap, satisfied: missing.length === 0,
      satisfied_count: overlap.length, required_count: required.length,
    },
  };
}

const CHAIN_TO = [
  { api: 'jwt-claim-policy-validator', reason: 'Validate the token whose "scope" claim these scopes came from.' },
  { api: 'iam-scope-simulator', reason: 'Map satisfied scopes to concrete action/resource permissions.' },
];
const INVALIDATORS = [
  'Scope names are compared as exact strings (after normalization); provider scope semantics, prefixes, and aliases (e.g. URL-style vs short scopes) are not normalized for you.',
  'Implication only applies if you supply a "hierarchy"; without it a broad scope does NOT automatically grant narrower ones.',
  'A satisfied diff means the requested scopes are present, not that the token is valid, unexpired, or accepted by the resource server.',
];

function actions(r: DiffCore): string[] {
  if (r.satisfied) return [
    `Satisfied: all ${r.required_count} required scope(s) are granted${r.used_hierarchy ? ' (after hierarchy expansion)' : ''}.`,
    r.extra.length ? `Over-granted scope(s) you could drop for least privilege: ${r.extra.join(', ')}.` : 'No over-grant — grant matches the requirement.',
    'Proceed; re-check if the required scopes change.',
  ];
  return [
    `Not satisfied — missing ${r.missing.length} scope(s): ${r.missing.join(', ')}.`,
    'Request the missing scope(s) in the authorization request (re-consent may be required).',
    r.extra.length ? `Unrelated over-granted scope(s): ${r.extra.join(', ')}.` : 'No over-granted scopes.',
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'OAuth Scope Diff API', version: '1.0.0',
    description: 'Deterministic OAuth scope diff. Compares a granted scope set against a required set and returns missing, extra (over-grant), and whether the grant satisfies the requirement. Accepts space/comma strings or arrays plus an optional scope hierarchy for implied scopes. Pure set math, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/oauth-scope-diff/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/diff', summary: 'Diff granted vs required scopes', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL diff + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/diff', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: DiffCore) => ({
  confidence_score: 1, confidence_per_section: { diff: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/diff', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = diff(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = diff(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.satisfied_count}/${v.required_count} required scope(s) present → satisfied=${v.satisfied}.`,
      key_factors: [
        `Granted ${v.granted.length}${v.used_hierarchy ? ` (expanded to ${v.granted_expanded.length} via hierarchy)` : ''}.`,
        v.missing.length ? `Missing: ${v.missing.join(', ')}.` : 'Nothing missing.',
        v.extra.length ? `Over-granted: ${v.extra.join(', ')}.` : 'No over-grant.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
