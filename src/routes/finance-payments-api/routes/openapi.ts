import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const AmortRow = { type: 'object', required: ['month', 'payment', 'principal', 'interest', 'balance'], additionalProperties: false, properties: { month: { type: 'integer' }, payment: { type: 'number' }, principal: { type: 'number' }, interest: { type: 'number' }, balance: { type: 'number' } } };
const InstallmentCore = {
  type: 'object', required: ['principal', 'apr', 'term_months', 'monthly_payment', 'total_paid', 'total_interest', 'schedule', 'schedule_truncated', 'financial_disclaimer'],
  properties: {
    principal: { type: 'number' }, apr: { type: 'number' }, term_months: { type: 'integer' }, monthly_payment: { type: 'number' },
    total_paid: { type: 'number' }, total_interest: { type: 'number' }, schedule: { type: 'array', items: { $ref: '#/components/schemas/AmortRow' } }, schedule_truncated: { type: 'boolean' }, financial_disclaimer: { type: 'string' },
  },
};
const FeeCore = {
  type: 'object', required: ['amount', 'fee_percent', 'fixed_fee', 'fee_total', 'net_amount', 'effective_fee_pct', 'gross_up_for_net', 'financial_disclaimer'],
  properties: { amount: { type: 'number' }, fee_percent: { type: 'number' }, fixed_fee: { type: 'number' }, fee_total: { type: 'number' }, net_amount: { type: 'number' }, effective_fee_pct: { type: 'number' }, gross_up_for_net: { type: ['number', 'null'] }, financial_disclaimer: { type: 'string' } },
};
const Allocation = { type: 'object', required: ['name', 'weight', 'share_pct', 'amount'], additionalProperties: false, properties: { name: { type: 'string' }, weight: { type: 'number' }, share_pct: { type: 'number' }, amount: { type: 'number' } } };
const SettlementCore = {
  type: 'object', required: ['amount', 'total_weight', 'allocations', 'allocated_total', 'financial_disclaimer'],
  properties: { amount: { type: 'number' }, total_weight: { type: 'number' }, allocations: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } }, allocated_total: { type: 'number' }, financial_disclaimer: { type: 'string' } },
};

const SCHEDULE = [
  { month: 1, payment: 860.66, principal: 810.66, interest: 50, balance: 9189.34 }, { month: 2, payment: 860.66, principal: 814.72, interest: 45.95, balance: 8374.62 },
  { month: 3, payment: 860.66, principal: 818.79, interest: 41.87, balance: 7555.83 }, { month: 4, payment: 860.66, principal: 822.89, interest: 37.78, balance: 6732.94 },
  { month: 5, payment: 860.66, principal: 827, interest: 33.66, balance: 5905.94 }, { month: 6, payment: 860.66, principal: 831.13, interest: 29.53, balance: 5074.81 },
  { month: 7, payment: 860.66, principal: 835.29, interest: 25.37, balance: 4239.52 }, { month: 8, payment: 860.66, principal: 839.47, interest: 21.2, balance: 3400.05 },
  { month: 9, payment: 860.66, principal: 843.66, interest: 17, balance: 2556.39 }, { month: 10, payment: 860.66, principal: 847.88, interest: 12.78, balance: 1708.5 },
  { month: 11, payment: 860.66, principal: 852.12, interest: 8.54, balance: 856.38 }, { month: 12, payment: 860.66, principal: 856.38, interest: 4.28, balance: 0 },
];
const DISC = 'Informational, deterministic payment math — not financial, tax, or legal advice.';
const INSTALL_EXAMPLE = { principal: 10000, apr: 6, term_months: 12, monthly_payment: 860.66, total_paid: 10327.97, total_interest: 327.97, schedule: SCHEDULE, schedule_truncated: false, financial_disclaimer: DISC };

const tail = (acts: string[], cps: Record<string, number>) => ({
  confidence_score: 1, confidence_per_section: cps, recommended_actions_priority_order: acts,
  chain_to: [
    { api: 'refinance-calculator', reason: 'Compare this installment plan against refinancing an existing loan.' },
    { api: 'dti-calculator', reason: "Check whether the monthly payment fits the borrower's debt-to-income limits." },
    { api: 'country-currency-data', reason: 'Format the resulting amounts in the right currency for display.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('amortization', 'fees', 'allocation'), _Tail: Tail, AmortRow, InstallmentCore, FeeCore, Allocation, SettlementCore,
  DiscoveryResponse: discoverySchema(),
  InstallmentRequest: { type: 'object', required: ['principal', 'apr', 'term_months'], additionalProperties: false, properties: { principal: { type: 'number', exclusiveMinimum: 0 }, apr: { type: 'number', minimum: 0 }, term_months: { type: 'integer', exclusiveMinimum: 0 } } },
  FeeRequest: { type: 'object', required: ['amount'], additionalProperties: false, properties: { amount: { type: 'number', minimum: 0 }, fee_percent: { type: 'number', minimum: 0, description: 'Default 2.9.' }, fixed_fee: { type: 'number', minimum: 0, description: 'Default 0.30.' }, target_net: { type: 'number', description: 'If set, returns the gross to charge to net this amount.' } } },
  SettlementRequest: { type: 'object', required: ['amount', 'parties'], additionalProperties: false, properties: { amount: { type: 'number', minimum: 0 }, parties: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, weight: { type: 'number', minimum: 0 }, share_pct: { type: 'number', minimum: 0 }, share: { type: 'number', minimum: 0 } } } } } },
  LookupRequest: { type: 'object', required: ['principal', 'apr', 'term_months'], additionalProperties: false, properties: { principal: { type: 'number', exclusiveMinimum: 0 }, apr: { type: 'number', minimum: 0 }, term_months: { type: 'integer', exclusiveMinimum: 0 }, fee_percent: { type: 'number', minimum: 0, description: 'Optional per-payment processor fee %.' }, fixed_fee: { type: 'number', minimum: 0, description: 'Optional per-payment fixed fee.' } } },
  InstallmentResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/InstallmentCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  FeeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FeeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  SettlementResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SettlementCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/InstallmentCore' },
      { type: 'object', required: ['per_payment_fee', 'net_per_payment', 'reasoning'], properties: { per_payment_fee: { type: ['number', 'null'] }, net_per_payment: { type: ['number', 'null'] }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'fp-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/installment', summary: 'Amortizing payment, total interest, schedule', operationId: 'installment', priceUsdc: 0.008,
    requestSchemaRef: 'InstallmentRequest', responseSchemaRef: 'InstallmentResponse', requestExample: { principal: 10000, apr: 6, term_months: 12 },
    responseExample: { ...env, ...INSTALL_EXAMPLE, ...tail(['Monthly payment 860.66 for 12 months; total interest 327.97, total paid 10327.97.'], { amortization: 1 }) },
  },
  {
    method: 'post', path: '/fee-split', summary: 'Processor fee, net settlement, gross-up', operationId: 'feeSplit', priceUsdc: 0.006,
    requestSchemaRef: 'FeeRequest', responseSchemaRef: 'FeeResponse', requestExample: { amount: 100, fee_percent: 2.9, fixed_fee: 0.3, target_net: 100 },
    responseExample: { ...env, amount: 100, fee_percent: 2.9, fixed_fee: 0.3, fee_total: 3.2, net_amount: 96.8, effective_fee_pct: 3.2, gross_up_for_net: 103.3, financial_disclaimer: DISC, ...tail(['Fee 3.2 (3.2% effective); net 96.8.', 'Charge 103.3 to net the requested amount.'], { fees: 1 }) },
  },
  {
    method: 'post', path: '/settlement', summary: 'Exact multi-party split (sums to the penny)', operationId: 'settlement', priceUsdc: 0.006,
    requestSchemaRef: 'SettlementRequest', responseSchemaRef: 'SettlementResponse', requestExample: { amount: 1000, parties: [{ name: 'alice', weight: 1 }, { name: 'bob', weight: 1 }, { name: 'carol', weight: 1 }] },
    responseExample: { ...env, amount: 1000, total_weight: 3, allocations: [{ name: 'alice', weight: 1, share_pct: 33.3333, amount: 333.34 }, { name: 'bob', weight: 1, share_pct: 33.3333, amount: 333.33 }, { name: 'carol', weight: 1, share_pct: 33.3333, amount: 333.33 }], allocated_total: 1000, financial_disclaimer: DISC, ...tail(['Split 1000 across 3 parties; allocated total 1000 (sums exactly).'], { allocation: 1 }) },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL installment + per-payment fee + reasoning', operationId: 'lookup', priceUsdc: 0.015, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { principal: 10000, apr: 6, term_months: 12, fee_percent: 2.9, fixed_fee: 0.3 },
    responseExample: {
      ...env, ...INSTALL_EXAMPLE, per_payment_fee: 25.26, net_per_payment: 835.4,
      reasoning: { why_result_generated: 'Amortized 10000 at 6% over 12 months → 860.66/mo, total interest 327.97.', key_factors: ['Monthly payment: 860.66.', 'Total paid: 10327.97.', 'Net per payment after fee: 835.4.'], invalidators: ['Assumes a fixed rate and equal monthly payments; variable-rate or irregular schedules differ.', 'Ignores taxes, insurance, and origination fees unless folded into principal.', 'The last payment is adjusted by cents to close the balance exactly.'] },
      ...tail(['Monthly 860.66 for 12 mo; total interest 327.97.', 'After processor fee, you net 835.4/payment.'], { amortization: 1, fees: 1 }),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'finance-payments', title: 'Finance Payments API', version: '1.0.0',
  description: 'Deterministic payments math: installment/amortization (payment, total interest, schedule), processor fee split + gross-up, and exact multi-party settlement (largest-remainder, sums to the penny). Real arithmetic — no LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
