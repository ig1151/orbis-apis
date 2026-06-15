import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { runExample, lookupExample } from './examples';

const ASSERT_TYPE_ENUM = ['exists', 'count', 'min_count', 'max_count', 'equals', 'contains', 'matches', 'non_empty'];
const Scalar = { type: ['string', 'number', 'boolean', 'null'] };

const AssertSpec = {
  type: 'object', additionalProperties: false,
  description: 'Assertions for one selector. Any subset; with none provided, an implicit exists=true is checked.',
  properties: {
    exists: { type: 'boolean', description: 'Whether the selector should match ≥1 element.' },
    count: { type: 'integer', minimum: 0, description: 'Exact match count.' },
    min_count: { type: 'integer', minimum: 0 },
    max_count: { type: 'integer', minimum: 0 },
    equals: { type: 'string', description: 'Extracted value must equal this exactly.' },
    contains: { type: 'string', description: 'Extracted value must contain this substring.' },
    matches: { type: 'string', description: 'Extracted value must match this regex (≤300 chars, no nested unbounded quantifiers).' },
    attr: { type: 'string', description: 'Extract this attribute of the first match instead of its text.' },
    non_empty: { type: 'boolean', description: 'Whether the extracted value must be non-empty.' },
  },
};
const TestSpec = {
  type: 'object', required: ['name', 'selector'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Unique test name.' },
    selector: { type: 'string', description: 'CSS selector to evaluate.' },
    assert: AssertSpec,
  },
};
const RunRequest = {
  type: 'object', required: ['html', 'tests'], additionalProperties: false,
  properties: {
    html: { type: 'string', description: 'HTML snapshot to test against (≤1,000,000 chars).' },
    tests: { type: 'array', minItems: 1, items: TestSpec, description: 'Selector tests with assertions.' },
  },
};

const AssertionResult = {
  type: 'object', required: ['type', 'expected', 'actual', 'pass'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ASSERT_TYPE_ENUM },
    expected: Scalar,
    actual: Scalar,
    pass: { type: 'boolean' },
  },
};
const TestResult = {
  type: 'object', required: ['name', 'selector', 'extraction_mode', 'matched_count', 'extracted_value', 'sample_values', 'assertions', 'error', 'passed'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    selector: { type: 'string' },
    extraction_mode: { type: 'string', description: '"text" or "attr:<name>".' },
    matched_count: { type: 'integer', minimum: 0 },
    extracted_value: { type: ['string', 'null'], description: 'Value from the first matched element (text or attribute).' },
    sample_values: { type: 'array', items: { type: ['string', 'null'] }, description: 'Up to 50 extracted values.' },
    assertions: { type: 'array', items: AssertionResult },
    error: { type: ['string', 'null'], description: 'Non-null when the selector itself is invalid.' },
    passed: { type: 'boolean' },
  },
};
const SuiteCore = {
  type: 'object', required: ['test_count', 'passed_count', 'failed_count', 'all_passed', 'score', 'grade', 'results'],
  properties: {
    test_count: { type: 'integer', minimum: 0 },
    passed_count: { type: 'integer', minimum: 0 },
    failed_count: { type: 'integer', minimum: 0 },
    all_passed: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    results: { type: 'array', items: TestResult },
  },
};

const reqEx = {
  html: '<html><body><h1 class="title">Hello World</h1><a class="nav" href="/about">About</a><a class="nav" href="/contact">Contact</a><p class="price">$19.99</p></body></html>',
  tests: [
    { name: 'title_text', selector: 'h1.title', assert: { exists: true, count: 1, equals: 'Hello World' } },
    { name: 'nav_links', selector: 'a.nav', assert: { min_count: 2, attr: 'href', non_empty: true } },
    { name: 'price_format', selector: 'p.price', assert: { matches: '^\\$\\d+\\.\\d{2}$' } },
    { name: 'no_banner', selector: '.promo-banner', assert: { exists: false } },
  ],
};
const disc = {
  name: 'Web Scraper Test Suite & Validator API', version: '1.0.0',
  description: 'Deterministic scraper test suite. Parses a supplied HTML snapshot with a real HTML parser (cheerio) and runs selector assertions (exists/count/equals/contains/matches/non_empty, optionally on an attribute), returning per-test pass/fail, extracted values, score and grade. No fetching, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scraper-test-suite/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/run', summary: 'Run selector assertions against sample HTML', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL run + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/run', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('extraction', 'assertions'), _Tail: Tail,
  AssertSpec, TestSpec, RunRequest, AssertionResult, TestResult, SuiteCore, DiscoveryResponse: discoverySchema(),
  RunResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SuiteCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SuiteCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/run', summary: 'Run selector assertions against sample HTML', operationId: 'run', priceUsdc: 0.008,
    requestSchemaRef: 'RunRequest', responseSchemaRef: 'RunResponse', requestExample: reqEx,
    responseExample: runExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL run + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true,
    requestSchemaRef: 'RunRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'scraper-test-suite', title: 'Web Scraper Test Suite & Validator API', version: '1.0.0',
  description: 'Deterministic scraper test suite — sample HTML + selector assertions → per-test pass/fail, extracted values, score and grade (cheerio-parsed). No fetching, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
