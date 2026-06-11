import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const CATEGORY_ENUM = ['image', 'video', 'audio', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive', 'code', 'data', 'webpage', 'feed', 'font', 'executable', 'text', 'unknown'];

const ClassifyCore = {
  type: 'object', required: ['category', 'mime', 'detected_extension', 'is_binary', 'is_text', 'source', 'typical_handling'],
  properties: {
    category: { type: 'string', enum: CATEGORY_ENUM },
    mime: { type: ['string', 'null'] },
    detected_extension: { type: ['string', 'null'] },
    is_binary: { type: 'boolean' }, is_text: { type: 'boolean' },
    source: { type: 'string', enum: ['mime', 'extension', 'url_heuristic', 'unknown'], description: 'Which signal drove the classification (mime=authoritative, extension=can lie, url_heuristic=extension-less URL guessed as webpage, unknown=unresolved).' },
    typical_handling: { type: 'string', description: 'How an agent should typically handle this content type.' },
  },
};

const ClassifyRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    url: { type: 'string', description: 'A URL; the path extension is used if present.' },
    filename: { type: 'string', description: 'A filename or path.' },
    extension: { type: 'string', description: 'A bare extension, e.g. "pdf" or ".pdf".' },
    mime: { type: 'string', description: 'A MIME / Content-Type string; takes priority when supplied.' },
    content_type: { type: 'string', description: 'Alias for mime.' },
  },
  description: 'Provide at least one of url, filename, extension, or mime/content_type.',
};

const CORE_EXAMPLE = { category: 'pdf', mime: 'application/pdf', detected_extension: 'pdf', is_binary: true, is_text: false, source: 'extension', typical_handling: 'Extract text/tables via a PDF parser before reasoning.' };
const ACTS = ['Classified as pdf (application/pdf) via extension.', 'Extract text/tables via a PDF parser before reasoning.', 'Treat as binary content downstream.'];
const TAIL = {
  confidence_score: 0.85, confidence_per_section: { classification: 0.85 },
  recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-archive-url-builder', reason: 'Once you know it is a webpage, build a Wayback/cache URL to fetch a stable snapshot.' },
    { api: 'pdf-extraction', reason: 'For pdf results, extract text/tables before reasoning over the content.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('classification'), _Tail: Tail, ClassifyCore, ClassifyRequest,
  DiscoveryResponse: discoverySchema(),
  ClassifyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ClassifyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ClassifyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { url: 'https://example.com/report.pdf' };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/classify', summary: 'Classify a URL/filename/extension/MIME → category', operationId: 'classify', priceUsdc: 0.005,
    requestSchemaRef: 'ClassifyRequest', responseSchemaRef: 'ClassifyResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wct1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL classify + reasoning + handling guidance', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'ClassifyRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wct2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Resolved category "pdf" from the extension signal (extension .pdf).', key_factors: ['Source: extension.', 'MIME: application/pdf.', 'Binary: true.'], invalidators: ['MIME from a server can be wrong or generic (application/octet-stream); the extension may lie.', 'Extension-only classification cannot detect a renamed/mismatched file.', 'A URL without an extension is assumed to be a webpage — an API route or download could break that assumption.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-content-type-classifier', title: 'Web Content Type Classifier API', version: '1.0.0',
  description: 'Deterministic content-type classifier from a URL, filename, extension, and/or MIME string. Resolves a canonical category, MIME, binary-vs-text nature, and typical agent handling. Lookup tables only — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
