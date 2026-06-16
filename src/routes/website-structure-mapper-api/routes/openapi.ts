import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { mapExample, lookupExample } from './examples';

const ROLE_ENUM = ['home', 'hub', 'orphan', 'dead_end', 'normal'];

const NodeInfo = {
  type: 'object', required: ['url', 'path', 'section', 'depth', 'in_degree', 'out_degree', 'role', 'reachable'], additionalProperties: false,
  properties: {
    url: { type: 'string' },
    path: { type: 'string' },
    section: { type: 'string', description: 'Top-level path segment, or "(root)" for the site root.' },
    depth: { type: ['integer', 'null'], minimum: 0, description: 'Click depth from home over internal links; null if unreachable from home.' },
    in_degree: { type: 'integer', minimum: 0 },
    out_degree: { type: 'integer', minimum: 0 },
    role: { type: 'string', enum: ROLE_ENUM },
    reachable: { type: 'boolean' },
  },
};
const Edge = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: { from: { type: 'string' }, to: { type: 'string' } },
};
const SectionCount = {
  type: 'object', required: ['section', 'page_count'], additionalProperties: false,
  properties: { section: { type: 'string' }, page_count: { type: 'integer', minimum: 0 } },
};
const DanglingLink = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: { from: { type: 'string' }, to: { type: 'string', description: 'Same-host URL not among the supplied pages.' } },
};
const SitemapDiff = {
  type: 'object', required: ['provided', 'missing_from_sitemap', 'missing_from_crawl'], additionalProperties: false,
  properties: {
    provided: { type: 'boolean' },
    missing_from_sitemap: { type: 'array', items: { type: 'string' }, description: 'Crawled pages absent from the declared sitemap.' },
    missing_from_crawl: { type: 'array', items: { type: 'string' }, description: 'Sitemap URLs not present among crawled pages.' },
  },
};
const NormalizationInfo = {
  type: 'object', required: ['ignore_query', 'strip_query_params'], additionalProperties: false,
  properties: {
    ignore_query: { type: 'boolean', description: 'Whether the entire query string was dropped during normalization.' },
    strip_query_params: { type: 'array', items: { type: 'string' }, description: 'Query-param name patterns removed during normalization (trailing "*" = prefix match).' },
  },
};
const StructureCore = {
  type: 'object',
  required: ['host', 'page_count', 'internal_link_count', 'external_link_count', 'invalid_link_count', 'home_url', 'home_inferred', 'max_depth', 'sections', 'orphan_pages', 'dead_end_pages', 'hub_pages', 'unreachable_pages', 'dangling_internal_links', 'nodes', 'edges', 'sitemap_diff', 'normalization'],
  properties: {
    host: { type: 'string' },
    page_count: { type: 'integer', minimum: 0 },
    internal_link_count: { type: 'integer', minimum: 0 },
    external_link_count: { type: 'integer', minimum: 0 },
    invalid_link_count: { type: 'integer', minimum: 0 },
    home_url: { type: 'string' },
    home_inferred: { type: 'boolean' },
    max_depth: { type: 'integer', minimum: 0 },
    sections: { type: 'array', items: SectionCount },
    orphan_pages: { type: 'array', items: { type: 'string' } },
    dead_end_pages: { type: 'array', items: { type: 'string' } },
    hub_pages: { type: 'array', items: { type: 'string' } },
    unreachable_pages: { type: 'array', items: { type: 'string' } },
    dangling_internal_links: { type: 'array', items: DanglingLink },
    nodes: { type: 'array', items: NodeInfo },
    edges: { type: 'array', items: Edge },
    sitemap_diff: SitemapDiff,
    normalization: NormalizationInfo,
  },
};
const PageInput = {
  type: 'object', required: ['url'], additionalProperties: false,
  properties: {
    url: { type: 'string', description: 'Absolute http(s) page URL.' },
    links: { type: 'array', items: { type: 'string' }, description: 'Outbound link URLs found on the page (absolute or relative to url).' },
  },
};
const MapRequest = {
  type: 'object', required: ['pages'], additionalProperties: false,
  properties: {
    pages: { type: 'array', minItems: 1, items: PageInput, description: 'Crawl manifest: each page with its outbound links.' },
    home_url: { type: 'string', description: 'Optional entry/home URL (fixes the depth-0 root). Inferred when omitted.' },
    sitemap: { type: 'array', items: { type: 'string' }, description: 'Optional declared sitemap URLs to diff against the crawl.' },
    hub_min_out_degree: { type: 'integer', minimum: 1, description: 'Out-degree at/above which a page is labeled a hub (default 5).' },
    ignore_query: { type: 'boolean', description: 'Drop the entire query string when normalizing URLs (default false).' },
    strip_query_params: { type: 'array', items: { type: 'string' }, description: 'Query-param names to strip during normalization; a trailing "*" matches by prefix (e.g. "utm_*"). Case-insensitive.' },
  },
};

// Examples are filled from live output (drift-guarded by the smoke test).
const reqEx = {
  pages: [
    { url: 'https://shop.example.com/', links: ['/products', '/about', 'https://twitter.com/shop'] },
    { url: 'https://shop.example.com/products', links: ['/', '/products/widget', '/products/gadget'] },
    { url: 'https://shop.example.com/products/widget', links: ['/products'] },
    { url: 'https://shop.example.com/products/gadget', links: ['/products', '/missing-page'] },
    { url: 'https://shop.example.com/about', links: ['/'] },
    { url: 'https://shop.example.com/legacy', links: [] },
  ],
  home_url: 'https://shop.example.com/',
  sitemap: ['https://shop.example.com/', 'https://shop.example.com/products', 'https://shop.example.com/contact'],
};
const disc = {
  name: 'Website Structure & Navigation Mapper API', version: '1.0.0',
  description: 'Deterministic website structure & navigation mapper. Turns a crawl manifest (pages + their outbound links, optional sitemap) into an internal navigation graph: click depth from home, in/out degree, page roles (home/hub/orphan/dead_end), top-level sections, unreachable pages, dangling links, and a sitemap diff. No fetching, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/website-structure-mapper/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/map', summary: 'Build a navigation graph from a crawl manifest', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL structure map + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/map', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('structure', 'navigation'), _Tail: Tail,
  NodeInfo, Edge, SectionCount, DanglingLink, SitemapDiff, StructureCore, PageInput, MapRequest, DiscoveryResponse: discoverySchema(),
  MapResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/StructureCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/StructureCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/map', summary: 'Build a navigation graph from a crawl manifest', operationId: 'map', priceUsdc: 0.008,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'MapResponse', requestExample: reqEx,
    responseExample: mapExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL structure map + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'website-structure-mapper', title: 'Website Structure & Navigation Mapper API', version: '1.0.0',
  description: 'Deterministic website structure & navigation mapper — crawl manifest → internal navigation graph (click depth, roles, sections, orphans, dead-ends, dangling links, sitemap diff). No fetching, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
