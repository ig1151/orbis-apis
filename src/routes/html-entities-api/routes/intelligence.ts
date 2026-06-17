import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic HTML-entity encoder/decoder. /encode escapes HTML-special characters
// (and, in non_ascii mode, every non-ASCII codepoint as a numeric reference); /decode
// resolves numeric references (&#NN; / &#xHH;) and a curated set of named entities back
// to text. Pure string computation — no LLM, nothing stored.

const router = Router();

const MAX_LEN = 200_000;

// Named → codepoint map for decoding (and the small reverse map for encoding).
const NAMED: Record<string, number> = {
  amp: 38, lt: 60, gt: 62, quot: 34, apos: 39, nbsp: 160, copy: 169, reg: 174, trade: 8482,
  hellip: 8230, mdash: 8212, ndash: 8211, lsquo: 8216, rsquo: 8217, ldquo: 8220, rdquo: 8221,
  laquo: 171, raquo: 187, bull: 8226, dagger: 8224, Dagger: 8225, permil: 8240, prime: 8242, Prime: 8243,
  euro: 8364, pound: 163, yen: 165, cent: 162, curren: 164, sect: 167, para: 182, middot: 183,
  deg: 176, plusmn: 177, times: 215, divide: 247, frac12: 189, frac14: 188, frac34: 190, sup1: 185, sup2: 178, sup3: 179,
  micro: 181, iexcl: 161, iquest: 191, brvbar: 166, uml: 168, macr: 175, acute: 180, cedil: 184, ordf: 170, ordm: 186, not: 172, shy: 173,
  agrave: 224, aacute: 225, acirc: 226, atilde: 227, auml: 228, aring: 229, aelig: 230, ccedil: 231,
  egrave: 232, eacute: 233, ecirc: 234, euml: 235, igrave: 236, iacute: 237, icirc: 238, iuml: 239,
  ntilde: 241, ograve: 242, oacute: 243, ocirc: 244, otilde: 245, ouml: 246, oslash: 248,
  ugrave: 249, uacute: 250, ucirc: 251, uuml: 252, yacute: 253, yuml: 255, szlig: 223,
  Agrave: 192, Aacute: 193, Acirc: 194, Atilde: 195, Auml: 196, Aring: 197, AElig: 198, Ccedil: 199,
  Egrave: 200, Eacute: 201, Ecirc: 202, Euml: 203, Igrave: 204, Iacute: 205, Icirc: 206, Iuml: 207,
  Ntilde: 209, Ograve: 210, Oacute: 211, Ocirc: 212, Otilde: 213, Ouml: 214, Oslash: 216,
  Ugrave: 217, Uacute: 218, Ucirc: 219, Uuml: 220, Yacute: 221,
  alpha: 945, beta: 946, gamma: 947, delta: 948, pi: 960, sigma: 963, omega: 969, mu: 956, lambda: 955,
  larr: 8592, uarr: 8593, rarr: 8594, darr: 8595, harr: 8596, infin: 8734, ne: 8800, le: 8804, ge: 8805, sum: 8721, radic: 8730,
};
// Encode named map (named output for the 5 HTML specials + a few common ones).
const ENCODE_NAMED: Record<number, string> = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '#39' };

type Mode = 'minimal' | 'non_ascii';

function encode(text: string, mode: Mode, numeric: boolean): { encoded: string; replaced_count: number } {
  let out = '';
  let replaced = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const special = cp === 38 || cp === 60 || cp === 62 || cp === 34 || cp === 39;
    if (special) {
      replaced++;
      if (numeric) out += `&#${cp};`;
      else out += `&${ENCODE_NAMED[cp]};`;
      continue;
    }
    if (mode === 'non_ascii' && cp > 127) { replaced++; out += `&#${cp};`; continue; }
    out += ch;
  }
  return { encoded: out, replaced_count: replaced };
}

function decode(text: string): { decoded: string; replaced_count: number } {
  let replaced = 0;
  const decoded = text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, ref: string) => {
    let cp: number | null = null;
    if (ref[0] === '#') {
      cp = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    } else if (Object.prototype.hasOwnProperty.call(NAMED, ref)) {
      cp = NAMED[ref];
    }
    if (cp === null || !Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return whole; // unknown/invalid → leave verbatim
    replaced++;
    return String.fromCodePoint(cp);
  });
  return { decoded, replaced_count: replaced };
}

function readText(raw: unknown): { error: string } | { text: string } {
  if (typeof raw !== 'string') return { error: '"text" must be a string.' };
  if (raw.length > MAX_LEN) return { error: `"text" exceeds the ${MAX_LEN}-character limit.` };
  return { text: raw };
}

const CHAIN_TO = [
  { api: 'sensitive-data-detector', reason: 'Scan decoded text for PII before rendering or storing it.' },
  { api: 'table-formatter', reason: 'Encode cell content before embedding it in generated HTML/Markdown tables.' },
];
const INVALIDATORS = [
  '/encode (minimal) escapes only the five HTML-special characters & < > " \'. In non_ascii mode it additionally escapes every codepoint > 127 as a numeric reference. The single quote is emitted as &#39; (numeric) in named mode for maximum HTML compatibility.',
  '/decode resolves ALL numeric references (&#NN; decimal and &#xHH; hex) and a curated set of common named entities. An unrecognized named entity (e.g. a rare HTML5 ref not in the set) is left verbatim — it is NOT an error and is not counted in replaced_count.',
  'Encoding is reversible by /decode for everything it produces. Decoding is not guaranteed to round-trip back to the exact original markup because multiple inputs (named vs numeric for the same character) decode to the same text.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'HTML Entities API', version: '1.0.0',
  description: 'Deterministic HTML-entity encoder/decoder. /encode escapes HTML-special characters (and, in non_ascii mode, every non-ASCII codepoint as a numeric reference); /decode resolves numeric references and a curated set of named entities back to text. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/html-entities/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['html_encode', 'html_decode', 'numeric_references', 'named_entities', 'xss_safe_escaping'],
  typical_use_cases: [
    'Escape user-supplied text before embedding it in an HTML page or template',
    'Decode HTML entities from scraped or stored content back to plain text',
    'Convert non-ASCII text to numeric references for legacy/ASCII-only channels',
  ],
  input_examples: [
    { endpoint: '/encode', body: { text: '<a href="x">© 5</a>' } },
    { endpoint: '/decode', body: { text: '&lt;a&gt;&copy;&#48;' } },
  ],
  output_examples: [
    { endpoint: '/encode', response: { mode: 'minimal', encoded: '&lt;a href=&quot;x&quot;&gt;© 5&lt;/a&gt;', replaced_count: 6 } },
    { endpoint: '/decode', response: { decoded: '<a>©0', replaced_count: 4 } },
  ],
  endpoints: [
    { method: 'POST', path: '/encode', summary: 'Escape text to HTML entities', price_usdc: 0.004 },
    { method: 'POST', path: '/decode', summary: 'Resolve HTML entities back to text', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL encode + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/encode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/decode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};

function readMode(raw: unknown): { error: string } | { mode: Mode } {
  if (raw === undefined) return { mode: 'minimal' };
  if (raw !== 'minimal' && raw !== 'non_ascii') return { error: '"mode" must be "minimal" or "non_ascii".' };
  return { mode: raw };
}

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/encode', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readText(b.text);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const m = readMode(b.mode);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  if (b.numeric !== undefined && typeof b.numeric !== 'boolean') return fail(res, t0, 400, 'invalid_request', '"numeric" must be a boolean.');
  const numeric = b.numeric ?? false;
  const { encoded, replaced_count } = encode(r.text, m.mode, numeric);
  respond(res, t0, { input: r.text, encoded, mode: m.mode, numeric, replaced_count, ...TAIL({ encoding: 1 }, [`Encoded ${replaced_count} character(s) to HTML entities.`]) });
});

router.post('/decode', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readText(b.text);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const { decoded, replaced_count } = decode(r.text);
  respond(res, t0, { input: r.text, decoded, replaced_count, ...TAIL({ decoding: 1 }, [`Resolved ${replaced_count} entity reference(s).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readText(b.text);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const m = readMode(b.mode);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  if (b.numeric !== undefined && typeof b.numeric !== 'boolean') return fail(res, t0, 400, 'invalid_request', '"numeric" must be a boolean.');
  const numeric = b.numeric ?? false;
  const { encoded, replaced_count } = encode(r.text, m.mode, numeric);
  respond(res, t0, {
    input: r.text, encoded, mode: m.mode, numeric, replaced_count,
    reasoning: {
      why_result_generated: `Escaped ${replaced_count} character(s) in ${m.mode} mode (numeric=${numeric}); the result is safe to embed in HTML text content.`,
      key_factors: [`Mode: ${m.mode}.`, `Numeric special chars: ${numeric}.`, `Characters replaced: ${replaced_count}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ encoding: 1 }, [`Encoded ${replaced_count} character(s) to HTML entities.`]),
  });
});

export default router;
