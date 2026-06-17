import { Router, Request, Response } from 'express';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic XML ⇄ JSON converter. /to-json validates and parses XML into a JSON
// object (attributes preserved with an "@_" prefix); /to-xml serializes a JSON object
// back into XML. Pure parse/build via fast-xml-parser — no LLM, nothing stored.

const router = Router();

const MAX_INPUT_LEN = 1_000_000; // characters of the input string
const ATTR_PREFIX = '@_';

export interface ToJsonCore { json: unknown; source_length: number; root_elements: string[]; attributes_preserved: boolean }
export interface ToXmlCore { xml: string; xml_length: number }

function makeParser(preserveAttributes: boolean): XMLParser {
  return new XMLParser({ ignoreAttributes: !preserveAttributes, attributeNamePrefix: ATTR_PREFIX, parseAttributeValue: true });
}

function toJson(xml: string, preserveAttributes: boolean): { error: string } | ToJsonCore {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) {
    const e = valid.err;
    return { error: `Input is not well-formed XML: ${e.msg}${e.line ? ` (line ${e.line})` : ''}.` };
  }
  let json: unknown;
  try { json = makeParser(preserveAttributes).parse(xml); }
  catch (e) { return { error: `Failed to parse XML: ${(e as Error).message}` }; }
  const root_elements = json && typeof json === 'object' && !Array.isArray(json)
    ? Object.keys(json as Record<string, unknown>).filter((k) => k !== '?xml')
    : [];
  return { json, source_length: xml.length, root_elements, attributes_preserved: preserveAttributes };
}

function toXml(value: unknown, format: boolean): { error: string } | ToXmlCore {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '"json" must be a JSON object (or a JSON string that parses to an object).' };
  }
  let xml: string;
  try {
    const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: ATTR_PREFIX, format, indentBy: '  ' });
    xml = builder.build(value);
  } catch (e) { return { error: `Failed to build XML: ${(e as Error).message}` }; }
  return { xml, xml_length: xml.length };
}

// Accept a JSON object directly, or a JSON string that parses to an object.
function coerceJson(raw: unknown): { error: string } | { value: unknown } {
  if (typeof raw === 'string') {
    try { return { value: JSON.parse(raw) }; }
    catch (e) { return { error: `"json" is a string but not valid JSON: ${(e as Error).message}` }; }
  }
  return { value: raw };
}

const CHAIN_TO = [
  { api: 'data-format-converter', reason: 'Convert the resulting JSON onward to YAML or TOML.' },
  { api: 'jsonpath', reason: 'Query or extract fields from the converted JSON structure.' },
];
const INVALIDATORS = [
  'XML attributes are preserved on the JSON side with the "@_" prefix (e.g. <a id="1"/> → {"a":{"@_id":"1"}}); set preserve_attributes:false on /to-json to drop them.',
  'Conversion follows the fast-xml-parser data model: repeated sibling elements collapse into an array, text content uses the "#text" key alongside attributes, and the model is NOT guaranteed to round-trip byte-for-byte (whitespace, comments, CDATA framing and namespace prefixes may shift).',
  '/to-xml requires a JSON object at the top level; arrays or scalars are rejected. Numeric/boolean attribute values are parsed on the way in.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'XML JSON Converter API', version: '1.0.0',
  description: 'Deterministic XML ⇄ JSON converter. /to-json validates and parses XML into JSON (attributes preserved with an "@_" prefix); /to-xml serializes a JSON object back into XML. Structural conversion via fast-xml-parser — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/xml-json-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['xml_to_json', 'json_to_xml', 'xml_validation', 'attribute_preservation'],
  typical_use_cases: [
    'Parse an XML API response or feed into JSON for programmatic use',
    'Serialize a JSON object back into XML for a legacy/SOAP endpoint',
    'Validate that a string is well-formed XML before processing it',
  ],
  input_examples: [
    { endpoint: '/to-json', body: { xml: '<note id="1"><to>Ada</to><body>Hi</body></note>' } },
    { endpoint: '/to-xml', body: { json: { note: { '@_id': '1', to: 'Ada', body: 'Hi' } } } },
  ],
  output_examples: [
    { endpoint: '/to-json', response: { json: { note: { to: 'Ada', body: 'Hi', '@_id': 1 } }, source_length: 47, root_elements: ['note'], attributes_preserved: true } },
    { endpoint: '/to-xml', response: { xml: '<note id="1">\n  <to>Ada</to>\n  <body>Hi</body>\n</note>\n', xml_length: 55 } },
  ],
  endpoints: [
    { method: 'POST', path: '/to-json', summary: 'Convert XML to JSON', price_usdc: 0.006 },
    { method: 'POST', path: '/to-xml', summary: 'Convert a JSON object to XML', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL XML→JSON + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/to-json', price_usdc: 0.006, currency: 'USDC' },
    { path: '/to-xml', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

function readXml(b: Record<string, unknown>): { error: string } | { xml: string; preserve: boolean } {
  if (typeof b.xml !== 'string') return { error: '"xml" must be a string.' };
  if (b.xml.length > MAX_INPUT_LEN) return { error: `"xml" exceeds the ${MAX_INPUT_LEN}-character limit.` };
  let preserve = true;
  if (b.preserve_attributes !== undefined) {
    if (typeof b.preserve_attributes !== 'boolean') return { error: '"preserve_attributes" must be a boolean.' };
    preserve = b.preserve_attributes;
  }
  return { xml: b.xml, preserve };
}

router.post('/to-json', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with an "xml" string.');
  const r = readXml(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = toJson(r.xml, r.preserve);
  if ('error' in core) return fail(res, t0, 400, 'invalid_request', core.error);
  respond(res, t0, { ...core, ...TAIL({ conversion: 1 }, [`Parsed XML into JSON with ${core.root_elements.length} root element(s).`]) });
});

router.post('/to-xml', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "json" object.');
  if (b.json === undefined) return fail(res, t0, 400, 'invalid_request', '"json" is required.');
  let format = true;
  if (b.format !== undefined) {
    if (typeof b.format !== 'boolean') return fail(res, t0, 400, 'invalid_request', '"format" must be a boolean.');
    format = b.format;
  }
  const coerced = coerceJson(b.json);
  if ('error' in coerced) return fail(res, t0, 400, 'invalid_request', coerced.error);
  const core = toXml(coerced.value, format);
  if ('error' in core) return fail(res, t0, 400, 'invalid_request', core.error);
  respond(res, t0, { ...core, ...TAIL({ conversion: 1 }, [`Serialized JSON into ${core.xml_length} characters of XML.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with an "xml" string.');
  const r = readXml(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = toJson(r.xml, r.preserve);
  if ('error' in core) return fail(res, t0, 400, 'invalid_request', core.error);
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Validated the input as well-formed XML and parsed it into JSON with ${core.root_elements.length} root element(s)${core.attributes_preserved ? ', preserving attributes under the "@_" prefix' : ', dropping attributes'}.`,
      key_factors: [`Source length: ${core.source_length} chars.`, `Root elements: ${core.root_elements.join(', ') || 'none'}.`, `Attributes preserved: ${core.attributes_preserved}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Parsed XML into JSON with ${core.root_elements.length} root element(s).`]),
  });
});

export default router;
