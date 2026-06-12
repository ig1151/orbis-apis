import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic best-effort JSON repair for malformed model output. A tolerant
// recursive-descent parser handles the common LLM mistakes — markdown code fences,
// leading/trailing prose, // and /* */ comments, single/backtick/smart quotes,
// unquoted object keys, trailing commas, Python literals (True/False/None) and
// non-finite numbers, and unclosed braces/brackets — then re-serializes canonical
// JSON. Every transform applied is reported. Repair is heuristic and may change
// meaning, so confidence < 1.0 (1.0 only when the input was already valid). No LLM.

const router = Router();
const MAX_CHARS = 200_000;
const OPEN_QUOTES: Record<string, string> = { '"': '"', "'": "'", '`': '`', '“': '”', '‘': '’' };

class Repair {
  s: string; i = 0; repairs = new Set<string>();
  constructor(s: string) { this.s = s; }
  private fail(m: string): never { throw new Error(`${m} at position ${this.i}`); }
  private ws(): void {
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v' || c === ' ' || c === '﻿') { this.i++; continue; }
      if (c === '/' && s[this.i + 1] === '/') { this.repairs.add('removed_line_comment'); this.i += 2; while (this.i < s.length && s[this.i] !== '\n') this.i++; continue; }
      if (c === '/' && s[this.i + 1] === '*') { this.repairs.add('removed_block_comment'); this.i += 2; while (this.i < s.length && !(s[this.i] === '*' && s[this.i + 1] === '/')) this.i++; this.i += 2; continue; }
      break;
    }
  }
  parse(): unknown {
    this.ws();
    const v = this.value();
    this.ws();
    if (this.i < this.s.length) this.repairs.add('stripped_trailing_text');
    return v;
  }
  private value(): unknown {
    this.ws();
    if (this.i >= this.s.length) this.fail('unexpected end of input');
    const c = this.s[this.i];
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c in OPEN_QUOTES) return this.string();
    if (c === '-' || c === '+' || (c >= '0' && c <= '9') || c === '.') return this.number();
    return this.bareword();
  }
  private object(): Record<string, unknown> {
    this.i++; // {
    const out: Record<string, unknown> = {};
    for (;;) {
      this.ws();
      if (this.i >= this.s.length) { this.repairs.add('auto_closed_object'); return out; }
      if (this.s[this.i] === '}') { this.i++; return out; }
      let key: string;
      if (this.s[this.i] in OPEN_QUOTES) key = this.string();
      else { key = this.barewordKey(); this.repairs.add('quoted_unquoted_key'); }
      this.ws();
      if (this.s[this.i] === ':') this.i++;
      else this.fail('expected ":" after object key');
      out[key] = this.value();
      this.ws();
      if (this.s[this.i] === ',') { this.i++; this.ws(); if (this.s[this.i] === '}') { this.repairs.add('removed_trailing_comma'); this.i++; return out; } continue; }
      if (this.s[this.i] === '}') { this.i++; return out; }
      if (this.i >= this.s.length) { this.repairs.add('auto_closed_object'); return out; }
      this.fail('expected "," or "}" in object');
    }
  }
  private array(): unknown[] {
    this.i++; // [
    const out: unknown[] = [];
    for (;;) {
      this.ws();
      if (this.i >= this.s.length) { this.repairs.add('auto_closed_array'); return out; }
      if (this.s[this.i] === ']') { this.i++; return out; }
      out.push(this.value());
      this.ws();
      if (this.s[this.i] === ',') { this.i++; this.ws(); if (this.s[this.i] === ']') { this.repairs.add('removed_trailing_comma'); this.i++; return out; } continue; }
      if (this.s[this.i] === ']') { this.i++; return out; }
      if (this.i >= this.s.length) { this.repairs.add('auto_closed_array'); return out; }
      this.fail('expected "," or "]" in array');
    }
  }
  private string(): string {
    const open = this.s[this.i];
    const close = OPEN_QUOTES[open];
    if (open !== '"') this.repairs.add('normalized_quotes');
    this.i++;
    let out = '';
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if (c === '\\') {
        const e = this.s[this.i++];
        switch (e) {
          case 'n': out += '\n'; break; case 't': out += '\t'; break; case 'r': out += '\r'; break;
          case 'b': out += '\b'; break; case 'f': out += '\f'; break; case '/': out += '/'; break;
          case '"': out += '"'; break; case "'": out += "'"; break; case '\\': out += '\\'; break; case '`': out += '`'; break;
          case 'u': { const hex = this.s.slice(this.i, this.i + 4); this.i += 4; const code = parseInt(hex, 16); out += Number.isNaN(code) ? '' : String.fromCharCode(code); break; }
          default: out += e ?? ''; break;
        }
        continue;
      }
      if (c === close) return out;
      out += c;
    }
    this.repairs.add('auto_closed_string');
    return out;
  }
  private barewordKey(): string {
    const start = this.i;
    while (this.i < this.s.length && /[A-Za-z0-9_$.-]/.test(this.s[this.i])) this.i++;
    if (this.i === start) this.fail('expected object key');
    return this.s.slice(start, this.i);
  }
  private number(): number | null {
    const start = this.i;
    if (this.s[this.i] === '+') { this.i++; this.repairs.add('coerced_number'); }
    while (this.i < this.s.length && /[0-9eE+\-.xXa-fA-F]/.test(this.s[this.i])) this.i++;
    const raw = this.s.slice(start, this.i);
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
    this.repairs.add('coerced_nonfinite_to_null');
    return null;
  }
  private bareword(): unknown {
    const start = this.i;
    while (this.i < this.s.length && /[A-Za-z0-9_$]/.test(this.s[this.i])) this.i++;
    const w = this.s.slice(start, this.i);
    if (w === '') this.fail('unexpected character');
    switch (w) {
      case 'true': return true; case 'false': return false; case 'null': return null;
      case 'True': this.repairs.add('python_literal'); return true;
      case 'False': this.repairs.add('python_literal'); return false;
      case 'None': this.repairs.add('python_literal'); return null;
      case 'NaN': case 'Infinity': this.repairs.add('coerced_nonfinite_to_null'); return null;
      case 'undefined': this.repairs.add('coerced_undefined_to_null'); return null;
      default: this.repairs.add('unquoted_value_to_string'); return w;
    }
  }
}

type Risk = 'low' | 'medium' | 'high';
export interface RepairDiff { repair: string; description: string; semantic_risk: Risk; }
export interface RepairCore {
  original_valid: boolean; valid_json: boolean; repaired: boolean;
  repairs_applied: string[]; repaired_diff: RepairDiff[]; semantic_risk: Risk;
  parse_error: string | null;
  repaired_text: string | null; parsed?: unknown;
}

// Per-repair semantic risk: HIGH transforms can change meaning, LOW are cosmetic.
const HIGH_RISK = new Set(['unquoted_value_to_string', 'auto_closed_string', 'coerced_nonfinite_to_null', 'coerced_undefined_to_null']);
const MEDIUM_RISK = new Set(['normalized_quotes', 'python_literal', 'auto_closed_object', 'auto_closed_array', 'stripped_trailing_text', 'stripped_leading_text']);
const REPAIR_DESC: Record<string, string> = {
  stripped_code_fence: 'Removed a surrounding markdown code fence.',
  stripped_leading_text: 'Removed text before the first JSON value.',
  stripped_trailing_text: 'Dropped content after the first complete JSON value.',
  removed_line_comment: 'Removed // line comment(s).',
  removed_block_comment: 'Removed /* */ block comment(s).',
  normalized_quotes: 'Converted single/backtick/smart quotes to double quotes.',
  quoted_unquoted_key: 'Added double quotes around unquoted object key(s).',
  removed_trailing_comma: 'Removed trailing comma(s).',
  python_literal: 'Mapped Python literal(s) True/False/None to JSON true/false/null.',
  coerced_number: 'Normalized a numeric literal (e.g. a leading +).',
  coerced_nonfinite_to_null: 'Replaced NaN/Infinity with null.',
  coerced_undefined_to_null: 'Replaced undefined with null.',
  unquoted_value_to_string: 'Treated a bareword value as a string — this can change the intended type/meaning.',
  auto_closed_string: 'Auto-closed an unterminated string.',
  auto_closed_object: 'Auto-closed an unterminated object.',
  auto_closed_array: 'Auto-closed an unterminated array.',
};
const riskOf = (r: string): Risk => HIGH_RISK.has(r) ? 'high' : MEDIUM_RISK.has(r) ? 'medium' : 'low';
function buildDiff(repairs: string[]): { repaired_diff: RepairDiff[]; semantic_risk: Risk } {
  const repaired_diff = repairs.map((r) => ({ repair: r, description: REPAIR_DESC[r] ?? r, semantic_risk: riskOf(r) }));
  const semantic_risk: Risk = repaired_diff.some((d) => d.semantic_risk === 'high') ? 'high' : repaired_diff.some((d) => d.semantic_risk === 'medium') ? 'medium' : 'low';
  return { repaired_diff, semantic_risk };
}

export function repair(body: any): { error: string } | { result: RepairCore } {
  const text = str(body?.text);
  if (text === undefined) return { error: 'Provide "text" as a non-empty string of (possibly malformed) JSON.' };
  if (text.length > MAX_CHARS) return { error: `"text" exceeds the ${MAX_CHARS}-character limit (${text.length}).` };
  const return_parsed = body?.return_parsed !== false;

  // Fast path: already valid
  try {
    const parsed = JSON.parse(text);
    const core: RepairCore = { original_valid: true, valid_json: true, repaired: false, repairs_applied: [], repaired_diff: [], semantic_risk: 'low', parse_error: null, repaired_text: JSON.stringify(parsed) };
    if (return_parsed) core.parsed = parsed;
    return { result: core };
  } catch { /* fall through to repair */ }

  const pre = new Set<string>();
  let t = text;
  const fence = t.match(/```(?:json5?|jsonc)?\s*([\s\S]*?)```/i);
  if (fence) { t = fence[1]; pre.add('stripped_code_fence'); }
  t = t.trim();
  const firstStart = t.search(/[[{]/);
  if (firstStart > 0) { t = t.slice(firstStart); pre.add('stripped_leading_text'); }

  try {
    const r = new Repair(t);
    const parsed = r.parse();
    for (const p of pre) r.repairs.add(p);
    const repaired_text = JSON.stringify(parsed);
    const repairs_applied = [...r.repairs];
    const core: RepairCore = {
      original_valid: false, valid_json: true, repaired: true,
      repairs_applied, ...buildDiff(repairs_applied), parse_error: null, repaired_text,
    };
    if (return_parsed) core.parsed = parsed;
    return { result: core };
  } catch (e: any) {
    const repairs_applied = [...pre];
    const core: RepairCore = {
      original_valid: false, valid_json: false, repaired: false,
      repairs_applied, ...buildDiff(repairs_applied), parse_error: e?.message || String(e), repaired_text: null,
    };
    if (return_parsed) core.parsed = null;
    return { result: core };
  }
}

function actions(r: RepairCore): string[] {
  if (r.original_valid) return ['Input was already valid JSON — no repair needed.'];
  if (r.valid_json) return [
    `Repaired: applied ${r.repairs_applied.length} fix(es) [${r.repairs_applied.join(', ')}] and re-serialized valid JSON.`,
    `Semantic risk: ${r.semantic_risk}.${r.semantic_risk === 'low' ? ' Repairs were cosmetic.' : ' Verify the parsed result against intent — see repaired_diff for the meaning-changing transforms.'}`,
  ];
  return [`Could not produce valid JSON: ${r.parse_error}. Inspect repaired_text=null and the original input.`];
}

const CHAIN_TO = [
  { api: 'function-arg-validator', reason: 'Validate the repaired JSON against the expected tool/function schema.' },
  { api: 'tool-schema-linter', reason: 'If this is a tool call, lint the target schema.' },
];
function conf(r: RepairCore): number { return r.original_valid ? 1 : r.valid_json ? 0.8 : 0.4; }
const INVALIDATORS = [
  'Repair is best-effort and heuristic — transforms (quote normalization, unquoted-value→string, Python-literal mapping, auto-closing) can change the intended meaning.',
  'Only the first balanced JSON value is parsed; additional trailing values are dropped (stripped_trailing_text).',
  'A valid_json:true result means it parses, not that it matches any expected schema — validate separately.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JSON Repair / Salvage API', version: '1.0.0',
    description: 'Deterministic best-effort JSON repair for malformed model output. A tolerant parser fixes code fences, leading/trailing prose, comments, single/smart quotes, unquoted keys, trailing commas, Python literals, non-finite numbers, and unclosed brackets, then re-serializes canonical JSON and reports every transform applied. No LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/json-repair/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/repair', summary: 'Repair malformed JSON', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL repair + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/repair', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/repair', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = repair(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: conf(r.result), confidence_per_section: { repair: conf(r.result) },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = repair(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: v.original_valid ? 'Input parsed as-is; no repair applied.' : v.valid_json ? `Applied ${v.repairs_applied.length} repair(s) and re-parsed successfully.` : `Repair failed: ${v.parse_error}.`,
      key_factors: [v.original_valid ? 'Original was valid JSON.' : `Original invalid; repairs: ${v.repairs_applied.join(', ') || 'none'}.`, `valid_json=${v.valid_json}; semantic_risk=${v.semantic_risk}.`, 'Output is canonical re-serialized JSON.'],
      invalidators: INVALIDATORS,
    },
    confidence_score: conf(v), confidence_per_section: { repair: conf(v) },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
