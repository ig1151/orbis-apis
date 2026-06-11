import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const CountryRecord = {
  type: 'object', required: ['name', 'iso2', 'iso3', 'numeric', 'dial_code', 'currency', 'region'], additionalProperties: false,
  properties: { name: { type: 'string' }, iso2: { type: 'string' }, iso3: { type: 'string' }, numeric: { type: 'string' }, dial_code: { type: 'string' }, currency: { type: 'string' }, region: { type: 'string' } },
};
const CurrencyRecord = {
  type: 'object', required: ['code', 'name', 'symbol', 'minor_units'], additionalProperties: false,
  properties: { code: { type: 'string' }, name: { type: 'string' }, symbol: { type: 'string' }, minor_units: { type: 'integer' } },
};
const nullableCountry = { oneOf: [{ $ref: '#/components/schemas/CountryRecord' }, { type: 'null' }] };
const nullableCurrency = { oneOf: [{ $ref: '#/components/schemas/CurrencyRecord' }, { type: 'null' }] };

const CountryCore = { type: 'object', required: ['found', 'query', 'country', 'currency'], properties: { found: { type: 'boolean' }, query: { type: 'string' }, country: nullableCountry, currency: nullableCurrency } };
const CurrencyCore = { type: 'object', required: ['found', 'query', 'currency', 'used_by'], properties: { found: { type: 'boolean' }, query: { type: 'string' }, currency: nullableCurrency, used_by: { type: 'array', items: { type: 'string' } } } };
const FormatCore = { type: 'object', required: ['amount', 'currency', 'formatted', 'minor_units'], properties: { amount: { type: 'number' }, currency: { $ref: '#/components/schemas/CurrencyRecord' }, formatted: { type: 'string' }, minor_units: { type: 'integer' } } };
const LookupCore = { type: 'object', required: ['country', 'currency', 'used_by', 'amount', 'formatted', 'reasoning'], properties: { country: nullableCountry, currency: nullableCurrency, used_by: { type: 'array', items: { type: 'string' } }, amount: { type: ['number', 'null'] }, formatted: { type: ['string', 'null'] }, reasoning: { $ref: '#/components/schemas/Reasoning' } } };

const tail = (acts: string[], cps: Record<string, number>) => ({
  confidence_score: 1, confidence_per_section: cps, recommended_actions_priority_order: acts,
  chain_to: [
    { api: 'data-validator', reason: 'Validate phone numbers against the country dial code (E.164) or IBANs by country.' },
    { api: 'currency-formatting', reason: 'Locale-specific number/date formatting beyond the symbol + minor units.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const JP = { name: 'Japan', iso2: 'JP', iso3: 'JPN', numeric: '392', dial_code: '+81', currency: 'JPY', region: 'Asia' };
const JPY = { code: 'JPY', name: 'Yen', symbol: '¥', minor_units: 0 };
const EUR = { code: 'EUR', name: 'Euro', symbol: '€', minor_units: 2 };
const USD = { code: 'USD', name: 'US Dollar', symbol: '$', minor_units: 2 };
const FR = { name: 'France', iso2: 'FR', iso3: 'FRA', numeric: '250', dial_code: '+33', currency: 'EUR', region: 'Europe' };
const EUR_USERS = ['DE', 'FR', 'IT', 'ES', 'NL', 'IE', 'PT', 'BE', 'AT', 'FI'];

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('lookup', 'formatting'), _Tail: Tail, CountryRecord, CurrencyRecord, CountryCore, CurrencyCore, FormatCore, LookupCore,
  DiscoveryResponse: discoverySchema(),
  CountryRequest: { type: 'object', additionalProperties: false, properties: { query: { type: 'string' }, country: { type: 'string', description: 'Alias for query.' } }, description: 'Country name, ISO2/ISO3, numeric code, or dial code.' },
  CurrencyRequest: { type: 'object', additionalProperties: false, properties: { code: { type: 'string' }, currency: { type: 'string', description: 'Alias for code.' } }, description: 'ISO-4217 currency code, e.g. USD.' },
  FormatRequest: { type: 'object', required: ['amount', 'currency'], additionalProperties: false, properties: { amount: { type: 'number' }, currency: { type: 'string' }, code: { type: 'string', description: 'Alias for currency.' } } },
  LookupRequest: { type: 'object', additionalProperties: false, properties: { country: { type: 'string' }, currency: { type: 'string' }, amount: { type: 'number' } }, description: 'Provide country and/or currency; optional amount to format.' },
  CountryResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CountryCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  CurrencyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CurrencyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  FormatResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FormatCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
};

const env = { trace_id: 'ccd-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/country', summary: 'Resolve a country record', operationId: 'country', priceUsdc: 0.004,
    requestSchemaRef: 'CountryRequest', responseSchemaRef: 'CountryResponse', requestExample: { query: 'JP' },
    responseExample: { ...env, found: true, query: 'JP', country: JP, currency: JPY, ...tail(['Japan (JP/JPN), dial +81, currency JPY.'], { lookup: 1 }) },
  },
  {
    method: 'post', path: '/currency', summary: 'Resolve a currency + countries using it', operationId: 'currency', priceUsdc: 0.004,
    requestSchemaRef: 'CurrencyRequest', responseSchemaRef: 'CurrencyResponse', requestExample: { code: 'EUR' },
    responseExample: { ...env, found: true, query: 'EUR', currency: EUR, used_by: EUR_USERS, ...tail(['EUR — Euro (€), 2 minor units; used by DE, FR, IT, ES, NL, IE, PT, BE, AT, FI.'], { lookup: 1 }) },
  },
  {
    method: 'post', path: '/format', summary: 'Format an amount in a currency', operationId: 'format', priceUsdc: 0.004,
    requestSchemaRef: 'FormatRequest', responseSchemaRef: 'FormatResponse', requestExample: { amount: 1234567.5, currency: 'USD' },
    responseExample: { ...env, amount: 1234567.5, currency: USD, formatted: '$1,234,567.50 USD', minor_units: 2, ...tail(['Formatted 1234567.5 as $1,234,567.50 USD.'], { formatting: 1 }) },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL country + currency + formatted amount', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { country: 'France', amount: 2500 },
    responseExample: {
      ...env, country: FR, currency: EUR, used_by: EUR_USERS, amount: 2500, formatted: '€2,500.00 EUR',
      reasoning: { why_result_generated: 'Resolved France and EUR from the static dataset; formatted 2500 as €2,500.00 EUR.', key_factors: ['Country: FR.', 'Currency: EUR.', 'Amount formatted: €2,500.00 EUR.'], invalidators: ['Dataset is curated and finite — uncommon countries/currencies may be absent.', 'Symbols/minor units follow ISO-4217 defaults, not locale-specific display conventions.', 'No FX rates here — amounts are formatted, not converted.'] },
      ...tail(['France (FR), dial +33.', 'Currency EUR (€) → €2,500.00 EUR.'], { lookup: 1, formatting: 1 }),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'country-currency-data', title: 'Country & Currency Data API', version: '1.0.0',
  description: 'Deterministic ISO-3166 / ISO-4217 reference + money formatter over a curated static dataset. Resolve a country by name/ISO2/ISO3/numeric/dial code, a currency (and which countries use it), and format monetary amounts with the correct symbol and minor units. No LLM, no network.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
