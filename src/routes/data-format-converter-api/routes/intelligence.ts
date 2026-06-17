import { Router, Request, Response } from 'express';
import YAML from 'yaml';
import TOML from '@iarna/toml';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic config/data format converter. /convert parses the input in `from`
// (json | yaml | toml) and re-serializes it as `to`; /detect reports which of the
// three formats the input parses as. Pure parse/serialize via the `yaml` and
// `@iarna/toml` libraries + native JSON — no LLM, nothing stored.

const router = Router();

const MAX_INPUT_LEN = 1_000_000; // characters of the input string
const FORMATS = ['json', 'yaml', 'toml'] as const;
type Format = (typeof FORMATS)[number];
const FORMAT_SET = new Set<string>(FORMATS);

function parseFormat(data: string, fmt: Format): unknown {
  if (fmt === 'json') return JSON.parse(data);
  if (fmt === 'yaml') return YAML.parse(data);
  return TOML.parse(data);
}

function serializeFormat(value: unknown, fmt: Format, indent: number): string {
  if (fmt === 'json') return JSON.stringify(value, null, indent);
  if (fmt === 'yaml') return YAML.stringify(value);
  // @iarna/toml requires a plain-object (table) document; it throws on arrays/scalars/null.
  return TOML.stringify(value as TOML.JsonMap);
}

function valueType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // object | string | number | boolean | undefined
}

export interface ConvertCore { from: Format; to: Format; value_type: string; output: string; output_length: number }
export interface DetectCore { detected_format: Format | null; parses_as: Record<Format, boolean> }

function detect(data: string): DetectCore {
  const parses_as = { json: false, yaml: false, toml: false } as Record<Format, boolean>;
  for (const f of FORMATS) { try { parseFormat(data, f); parses_as[f] = true; } catch { /* not this format */ } }
  // Prefer the most specific format. JSON is the strictest; YAML is a JSON superset, so a
  // pure-JSON document also parses as YAML. TOML is distinct. Order: json → toml → yaml.
  const detected_format: Format | null = parses_as.json ? 'json' : parses_as.toml ? 'toml' : parses_as.yaml ? 'yaml' : null;
  return { detected_format, parses_as };
}

function readConvert(b: Record<string, unknown>): { error: string } | { data: string; from: Format; to: Format; indent: number } {
  if (typeof b.data !== 'string') return { error: '"data" must be a string.' };
  if (b.data.length > MAX_INPUT_LEN) return { error: `"data" exceeds the ${MAX_INPUT_LEN}-character limit.` };
  if (typeof b.from !== 'string' || !FORMAT_SET.has(b.from)) return { error: `"from" must be one of ${FORMATS.join(', ')}.` };
  if (typeof b.to !== 'string' || !FORMAT_SET.has(b.to)) return { error: `"to" must be one of ${FORMATS.join(', ')}.` };
  let indent = 2;
  if (b.indent !== undefined) {
    if (typeof b.indent !== 'number' || !Number.isInteger(b.indent) || b.indent < 0 || b.indent > 10) return { error: '"indent" must be an integer between 0 and 10.' };
    indent = b.indent;
  }
  return { data: b.data, from: b.from as Format, to: b.to as Format, indent };
}

function runConvert(data: string, from: Format, to: Format, indent: number): { error: string } | ConvertCore {
  let value: unknown;
  try { value = parseFormat(data, from); }
  catch (e) { return { error: `Input is not valid ${from}: ${(e as Error).message}` }; }
  let output: string;
  try { output = serializeFormat(value, to, indent); }
  catch (e) { return { error: `Cannot serialize the parsed value to ${to}: ${(e as Error).message}` }; }
  return { from, to, value_type: valueType(value), output, output_length: output.length };
}

const CHAIN_TO = [
  { api: 'json-validator', reason: 'Validate the converted JSON against a JSON Schema before using it.' },
  { api: 'jsonpath', reason: 'Query or extract fields from the converted structure.' },
];
const INVALIDATORS = [
  'Conversion is structural: it round-trips the parsed data model, not byte-for-byte formatting. Comments, key ordering nuances, anchors/aliases, and whitespace are NOT preserved.',
  'TOML can only represent a top-level table (object) with no null values; converting an array, scalar, or a structure containing null TO toml fails with an explicit error.',
  'YAML is a superset of JSON, so a pure-JSON document also parses as YAML; /detect therefore reports json first when the input is valid JSON.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Data Format Converter API', version: '1.0.0',
  description: 'Deterministic config/data format converter. /convert parses the input as JSON, YAML or TOML and re-serializes it to another of those formats; /detect reports which formats the input parses as. Structural round-trip via the yaml and @iarna/toml libraries — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-format-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['json_to_yaml', 'yaml_to_json', 'json_to_toml', 'toml_to_json', 'yaml_to_toml', 'format_detection'],
  typical_use_cases: [
    'Convert a YAML or TOML config file into JSON for programmatic consumption',
    'Emit a human-friendly YAML version of a JSON payload for a PR or docs',
    'Detect whether an unknown config blob is JSON, YAML or TOML before parsing it',
  ],
  input_examples: [
    { endpoint: '/convert', body: { data: 'name = "demo"\nport = 8080', from: 'toml', to: 'json' } },
    { endpoint: '/detect', body: { data: 'name: demo\nport: 8080' } },
  ],
  output_examples: [
    { endpoint: '/convert', response: { from: 'toml', to: 'json', value_type: 'object', output: '{\n  "name": "demo",\n  "port": 8080\n}' } },
    { endpoint: '/detect', response: { detected_format: 'yaml', parses_as: { json: false, yaml: true, toml: false } } },
  ],
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert between JSON, YAML and TOML', price_usdc: 0.006 },
    { method: 'POST', path: '/detect', summary: 'Detect which formats the input parses as', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.006, currency: 'USDC' },
    { path: '/detect', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide "data", "from" and "to".');
  const r = readConvert(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const out = runConvert(r.data, r.from, r.to, r.indent);
  if ('error' in out) return fail(res, t0, 400, 'invalid_request', out.error);
  respond(res, t0, { ...out, ...TAIL({ conversion: 1 }, [`Converted ${out.from} → ${out.to} (${out.output_length} chars).`]) });
});

router.post('/detect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "data" string.');
  if (typeof b.data !== 'string') return fail(res, t0, 400, 'invalid_request', '"data" must be a string.');
  if (b.data.length > MAX_INPUT_LEN) return fail(res, t0, 400, 'invalid_request', `"data" exceeds the ${MAX_INPUT_LEN}-character limit.`);
  const core = detect(b.data);
  respond(res, t0, { ...core, ...TAIL({ detection: 1 }, [core.detected_format ? `Input parses as ${core.detected_format}.` : 'Input does not parse as JSON, YAML or TOML.']) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide "data", "from" and "to".');
  const r = readConvert(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const out = runConvert(r.data, r.from, r.to, r.indent);
  if ('error' in out) return fail(res, t0, 400, 'invalid_request', out.error);
  respond(res, t0, {
    ...out,
    reasoning: {
      why_result_generated: `Parsed the input as ${out.from} (top-level ${out.value_type}) and re-serialized it as ${out.to}, producing ${out.output_length} character(s).`,
      key_factors: [`Source format: ${out.from}.`, `Target format: ${out.to}.`, `Top-level value type: ${out.value_type}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Converted ${out.from} → ${out.to} (${out.output_length} chars).`]),
  });
});

export default router;
