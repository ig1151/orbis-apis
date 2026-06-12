import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic .env validator. Parses dotenv text (KEY=VALUE, export, quotes,
// comments) and reports format issues (malformed lines, invalid key names,
// duplicates, empty/unquoted-with-spaces values). With an optional schema it
// also checks required keys, types (string/number/integer/boolean/url/email/
// port), allowed sets, and regex patterns. Returns KEY NAMES only — never echoes
// values, so secrets are not reflected. Pure parsing, no LLM, nothing stored.

const router = Router();
const MAX_BYTES = 256 * 1024;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TYPES = new Set(['string', 'number', 'integer', 'boolean', 'url', 'email', 'port']);

export interface EnvIssue { key: string | null; line: number; code: string; message: string; }
export interface ValidateCore {
  valid: boolean; checked_against_schema: boolean;
  keys: string[]; parsed_count: number;
  errors: EnvIssue[]; warnings: EnvIssue[];
  missing_required: string[]; unknown_keys: string[];
}

interface Parsed { key: string; value: string; quoted: boolean; line: number; }

function parseEnv(text: string): { parsed: Parsed[]; malformed: { line: number; raw: string }[] } {
  const parsed: Parsed[] = [];
  const malformed: { line: number; raw: string }[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    let work = trimmed.replace(/^export\s+/, '');
    const eq = work.indexOf('=');
    if (eq < 0) { malformed.push({ line: i + 1, raw: trimmed }); continue; }
    const key = work.slice(0, eq).trim();
    let value = work.slice(eq + 1).trim();
    let quoted = false;
    if ((value.startsWith('"') && value.endsWith('"') && value.length >= 2) || (value.startsWith("'") && value.endsWith("'") && value.length >= 2)) {
      quoted = true; value = value.slice(1, -1);
    }
    parsed.push({ key, value, quoted, line: i + 1 });
  }
  return { parsed, malformed };
}

function typeOk(type: string, value: string): boolean {
  switch (type) {
    case 'string': return true;
    case 'number': return /^-?\d+(\.\d+)?$/.test(value);
    case 'integer': return /^-?\d+$/.test(value);
    case 'boolean': return /^(true|false|1|0|yes|no)$/i.test(value);
    case 'port': return /^\d+$/.test(value) && +value >= 1 && +value <= 65535;
    case 'email': return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
    case 'url': { try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }
    default: return true;
  }
}

export function validate(body: any): { error: string } | { result: ValidateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with an "env" string.' };
  if (typeof body.env !== 'string') return { error: '"env" is required and must be a string (dotenv file contents).' };
  if (Buffer.byteLength(body.env, 'utf8') > MAX_BYTES) return { error: `"env" exceeds the ${MAX_BYTES}-byte limit.` };

  let schema: Record<string, any> | null = null;
  if (body.schema !== undefined) {
    if (body.schema === null || typeof body.schema !== 'object' || Array.isArray(body.schema)) return { error: '"schema" must be an object mapping KEY → rule.' };
    schema = body.schema as Record<string, any>;
    for (const k of Object.keys(schema)) {
      const rule = schema![k];
      if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) return { error: `schema["${k}"] must be a rule object.` };
      if (rule.type !== undefined && !TYPES.has(rule.type)) return { error: `schema["${k}"].type must be one of: ${[...TYPES].join(', ')}.` };
      if (rule.pattern !== undefined) { try { new RegExp(rule.pattern); } catch { return { error: `schema["${k}"].pattern is not a valid regular expression.` }; } }
    }
  }

  const { parsed, malformed } = parseEnv(body.env);
  const errors: EnvIssue[] = [];
  const warnings: EnvIssue[] = [];

  for (const m of malformed) errors.push({ key: null, line: m.line, code: 'MALFORMED_LINE', message: 'Line is not blank, a comment, or KEY=VALUE.' });

  const seen = new Map<string, number>();
  const lastValue = new Map<string, Parsed>();
  for (const p of parsed) {
    if (!KEY_RE.test(p.key)) errors.push({ key: p.key, line: p.line, code: 'INVALID_KEY', message: 'Key must match [A-Za-z_][A-Za-z0-9_]* (no spaces, dashes, or leading digits).' });
    if (seen.has(p.key)) warnings.push({ key: p.key, line: p.line, code: 'DUPLICATE_KEY', message: `Key first defined on line ${seen.get(p.key)} is redefined; the last value wins.` });
    else seen.set(p.key, p.line);
    if (p.value === '') warnings.push({ key: p.key, line: p.line, code: 'EMPTY_VALUE', message: 'Value is empty.' });
    if (!p.quoted && /\s/.test(p.value)) warnings.push({ key: p.key, line: p.line, code: 'UNQUOTED_SPACES', message: 'Unquoted value contains whitespace; quote it to be safe.' });
    lastValue.set(p.key, p);
  }

  const keys = [...lastValue.keys()];
  const missing_required: string[] = [];
  const unknown_keys: string[] = [];

  if (schema) {
    for (const k of Object.keys(schema)) {
      const rule = schema[k];
      const present = lastValue.get(k);
      if (!present) { if (rule.required) { missing_required.push(k); errors.push({ key: k, line: 0, code: 'MISSING_REQUIRED', message: 'Required key is not defined.' }); } continue; }
      const v = present.value;
      if (rule.type && !typeOk(rule.type, v)) errors.push({ key: k, line: present.line, code: 'TYPE_MISMATCH', message: `Value is not a valid ${rule.type}.` });
      if (Array.isArray(rule.allowed) && !rule.allowed.map(String).includes(v)) errors.push({ key: k, line: present.line, code: 'NOT_ALLOWED', message: `Value is not in the allowed set [${rule.allowed.map(String).join(', ')}].` });
      if (rule.pattern && !new RegExp(rule.pattern).test(v)) errors.push({ key: k, line: present.line, code: 'PATTERN_MISMATCH', message: 'Value does not match the required pattern.' });
    }
    for (const k of keys) if (!(k in schema)) { unknown_keys.push(k); warnings.push({ key: k, line: lastValue.get(k)!.line, code: 'UNKNOWN_KEY', message: 'Key is not declared in the schema.' }); }
  }

  errors.sort((a, b) => a.line - b.line || a.code.localeCompare(b.code));
  warnings.sort((a, b) => a.line - b.line || a.code.localeCompare(b.code));

  return {
    result: {
      valid: errors.length === 0, checked_against_schema: schema !== null,
      keys, parsed_count: parsed.length, errors, warnings, missing_required, unknown_keys,
    },
  };
}

const CHAIN_TO = [
  { api: 'secret-scanner', reason: 'Scan the same .env for leaked credentials before committing.' },
  { api: 'dockerfile-linter', reason: 'Ensure these values are injected at runtime, not baked into the image.' },
];
const INVALIDATORS = [
  'Validation is structural/schema-based; it cannot confirm a value is correct for your application (a well-formed URL may still point at the wrong host).',
  'Without a schema, only format checks run — required/typed validation needs you to declare the schema.',
  'Parsing follows common dotenv conventions; exotic interpolation or multiline values may not be handled.',
];

function actions(r: ValidateCore): string[] {
  if (r.valid) return [`Valid${r.checked_against_schema ? ' against the schema' : ' (format only)'} — ${r.keys.length} key(s), ${r.warnings.length} warning(s).`, r.checked_against_schema ? 'Promote the validated config; keep the schema in version control.' : 'Supply a "schema" to also enforce required keys and types.'];
  const e = r.errors[0];
  return [
    `${r.errors.length} error(s) — fix first: ${e.code}${e.key ? ` on ${e.key}` : ''}${e.line ? ` (line ${e.line})` : ''}.`,
    r.missing_required.length ? `Add missing required key(s): ${r.missing_required.join(', ')}.` : e.message,
    'Re-validate before deploying; never commit real secret values.',
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Env Validator API', version: '1.0.0',
    description: 'Deterministic .env validator. Parses dotenv text and reports format issues (malformed lines, invalid keys, duplicates, empty/unquoted values); with an optional schema it checks required keys, types, allowed sets, and patterns. Returns key names only — never echoes values. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/env-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Validate .env contents', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: ValidateCore) => ({
  confidence_score: 1, confidence_per_section: { validation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.parsed_count} assignment(s) parsed; ${v.errors.length} error(s), ${v.warnings.length} warning(s) → valid=${v.valid}.`,
      key_factors: [
        `Checked against schema: ${v.checked_against_schema}.`,
        v.missing_required.length ? `Missing required: ${v.missing_required.join(', ')}.` : 'No missing required keys.',
        v.unknown_keys.length ? `Unknown keys: ${v.unknown_keys.join(', ')}.` : 'No unknown keys.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
