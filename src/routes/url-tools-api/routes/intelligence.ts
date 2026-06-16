import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic URL parser / builder / normalizer built on the WHATWG URL API.
// /parse decomposes a URL into its components (with the query string expanded into
// an object, repeated keys as arrays); /build assembles a URL from components
// (optionally over a base); /lookup parses and returns a normalized canonical form.
// No LLM, nothing fetched, nothing stored.

const router = Router();

const MAX_URL_LEN = 8192;
const DEFAULT_PORTS: { [proto: string]: string } = { 'http:': '80', 'https:': '443', 'ftp:': '21', 'ws:': '80', 'wss:': '443' };

type QueryValue = string | string[];

function queryObject(sp: URLSearchParams): { [k: string]: QueryValue } {
  const out: { [k: string]: QueryValue } = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length === 1 ? all[0] : all;
  }
  return out;
}

export interface UrlComponents {
  href: string;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  origin: string;
  pathname: string;
  path_segments: string[];
  search: string;
  query: { [k: string]: QueryValue };
  hash: string;
}

function components(u: URL): UrlComponents {
  return {
    href: u.href,
    protocol: u.protocol,
    username: u.username,
    password: u.password,
    host: u.host,
    hostname: u.hostname,
    port: u.port,
    origin: u.origin,
    pathname: u.pathname,
    path_segments: u.pathname.split('/').filter((s) => s.length > 0),
    search: u.search,
    query: queryObject(u.searchParams),
    hash: u.hash,
  };
}

function makeUrl(raw: unknown, base: unknown): { error: string } | { url: URL } {
  if (typeof raw !== 'string' || raw === '') return { error: '"url" must be a non-empty string.' };
  if (raw.length > MAX_URL_LEN) return { error: `"url" exceeds the ${MAX_URL_LEN}-character limit.` };
  if (base !== undefined && typeof base !== 'string') return { error: '"base" must be a string when provided.' };
  try {
    return { url: base ? new URL(raw, base as string) : new URL(raw) };
  } catch {
    return { error: `"${raw}" is not a valid URL${base ? ' relative to the given base' : ' (provide a "base" to resolve a relative URL)'}.` };
  }
}

// Canonical normalization: lowercase scheme+host (WHATWG already does), drop the
// default port, sort query parameters by key (then value), and drop an empty
// fragment/query. Path case and percent-encoding are preserved.
function normalize(u: URL): string {
  const n = new URL(u.href);
  if (DEFAULT_PORTS[n.protocol] === n.port) n.port = '';
  const entries = [...n.searchParams.entries()].sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
  n.search = '';
  for (const [k, v] of entries) n.searchParams.append(k, v);
  let href = n.href;
  if (href.endsWith('#')) href = href.slice(0, -1);
  if (href.endsWith('?')) href = href.slice(0, -1);
  return href;
}

function doParse(body: any): { error: string } | { result: { input: string; components: UrlComponents; normalized: string } } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "url" string.' };
  const m = makeUrl(body.url, body.base);
  if ('error' in m) return { error: m.error };
  return { result: { input: String(body.url), components: components(m.url), normalized: normalize(m.url) } };
}

const SCALAR = (v: unknown) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

function doBuild(body: any): { error: string } | { result: { href: string; components: UrlComponents } } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide URL components (a "base" or a "protocol" + "hostname").' };
  let u: URL;
  try {
    if (typeof body.base === 'string' && body.base) {
      u = new URL(body.base);
    } else {
      if (typeof body.protocol !== 'string' || typeof body.hostname !== 'string') return { error: 'Provide either a "base" URL or both "protocol" and "hostname".' };
      const proto = body.protocol.endsWith(':') ? body.protocol : body.protocol + ':';
      u = new URL(`${proto}//${body.hostname}`);
    }
  } catch {
    return { error: 'Could not construct a base URL from the provided "base"/"protocol"/"hostname".' };
  }
  if (typeof body.hostname === 'string') u.hostname = body.hostname;
  if (body.port !== undefined) u.port = String(body.port);
  if (typeof body.pathname === 'string') u.pathname = body.pathname;
  if (typeof body.hash === 'string') u.hash = body.hash;
  if (typeof body.username === 'string') u.username = body.username;
  if (typeof body.password === 'string') u.password = body.password;
  if (body.query !== undefined) {
    if (body.query === null || typeof body.query !== 'object' || Array.isArray(body.query)) return { error: '"query" must be an object mapping keys to string/number/boolean or arrays thereof.' };
    u.search = '';
    for (const [k, v] of Object.entries(body.query)) {
      if (Array.isArray(v)) {
        for (const item of v) { if (!SCALAR(item)) return { error: `query["${k}"] array items must be string/number/boolean.` }; u.searchParams.append(k, String(item)); }
      } else if (SCALAR(v)) {
        u.searchParams.append(k, String(v));
      } else {
        return { error: `query["${k}"] must be a string/number/boolean or an array thereof.` };
      }
    }
  }
  return { result: { href: u.href, components: components(u) } };
}

const CHAIN_TO = [{ api: 'web-content-type-classifier', reason: 'Classify the resource a built/parsed URL points to.' }];
const INVALIDATORS = [
  'Parsing follows the WHATWG URL Standard (the same parser browsers use); component values are exact. Relative URLs require a "base" to resolve.',
  'The query object collapses a single occurrence of a key to a string and multiple occurrences to an array — order within an array is preserved, but two semantically different encodings (e.g. "a=1&a=2" vs "a[]=1&a[]=2") are NOT unified.',
  'Normalization lowercases scheme+host (per the URL spec), drops the protocol default port, sorts query params by key then value, and trims an empty "?"/"#". It does NOT collapse "." / ".." path segments beyond what the URL parser already resolves, nor change path case or percent-encoding — so it is a conservative canonical form, not an aggressive one.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

const DISCOVERY = {
  name: 'URL Tools API', version: '1.0.0',
  description: 'Deterministic URL parser / builder / normalizer on the WHATWG URL API. /parse decomposes a URL (query expanded to an object, repeated keys as arrays); /build assembles a URL from components over an optional base; /lookup parses and returns a normalized canonical form. No LLM, nothing fetched, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/url-tools/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/parse', summary: 'Decompose a URL into components', price_usdc: 0.005 },
    { method: 'POST', path: '/build', summary: 'Assemble a URL from components', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL parse + normalize + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/parse', price_usdc: 0.005, currency: 'USDC' },
    { path: '/build', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/parse', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doParse(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ parse: 1 }, [`Parsed ${v.components.protocol}//${v.components.host}${v.components.pathname} with ${Object.keys(v.components.query).length} query key(s).`]) });
});

router.post('/build', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doBuild(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ build: 1 }, [`Built ${v.href}.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doParse(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Parsed "${v.input}" with the WHATWG URL parser and produced a conservative canonical form.`,
      key_factors: [
        `Origin: ${v.components.origin}.`,
        `Path segments: ${v.components.path_segments.length}; query keys: ${Object.keys(v.components.query).length}.`,
        `Normalized: ${v.normalized}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ parse: 1 }, [`Normalized to ${v.normalized}.`]),
  });
});

export default router;
