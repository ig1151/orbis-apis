import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { monthlyPayment, monthlyRate, round, num } from '../../_aplus/finance';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic payments math: installment/amortization, processor fee split +
// gross-up, and exact multi-party settlement (largest-remainder, sums to the
// penny). Real arithmetic — no LLM. Informational, not financial advice.

const router = Router();
const FINANCIAL_DISCLAIMER = 'Informational, deterministic payment math — not financial, tax, or legal advice.';
const MAX_SCHEDULE_ROWS = 12;

export interface AmortRow { month: number; payment: number; principal: number; interest: number; balance: number; }
export interface InstallmentResult { principal: number; apr: number; term_months: number; monthly_payment: number; total_paid: number; total_interest: number; schedule: AmortRow[]; schedule_truncated: boolean; }

export function installment(body: any): { error: string } | { result: InstallmentResult } {
  const principal = num(body?.principal);
  const apr = num(body?.apr);
  const term_months = num(body?.term_months);
  if (principal === undefined || principal <= 0) return { error: 'Provide "principal" as a positive number.' };
  if (apr === undefined || apr < 0) return { error: 'Provide "apr" (annual % rate) as 0 or greater.' };
  if (term_months === undefined || term_months <= 0 || !Number.isInteger(term_months)) return { error: 'Provide "term_months" as a positive integer.' };

  const pay = monthlyPayment(principal, apr, term_months);
  const r = monthlyRate(apr);
  const schedule: AmortRow[] = [];
  let bal = principal, totalInterest = 0;
  for (let m = 1; m <= term_months; m++) {
    const interest = bal * r;
    let principalPaid = pay - interest;
    if (m === term_months) principalPaid = bal; // close out rounding on the last row
    bal = Math.max(0, bal - principalPaid);
    totalInterest += interest;
    if (m <= MAX_SCHEDULE_ROWS) schedule.push({ month: m, payment: round(m === term_months ? principalPaid + interest : pay), principal: round(principalPaid), interest: round(interest), balance: round(bal) });
  }
  const monthly_payment = round(pay);
  const total_paid = round(monthly_payment * (term_months - 1) + (schedule.length === term_months ? schedule[term_months - 1].payment : monthly_payment));
  return {
    result: {
      principal: round(principal), apr, term_months, monthly_payment,
      total_paid: round(principal + totalInterest), total_interest: round(totalInterest),
      schedule, schedule_truncated: term_months > MAX_SCHEDULE_ROWS,
    },
  };
}

export interface FeeResult { amount: number; fee_percent: number; fixed_fee: number; fee_total: number; net_amount: number; effective_fee_pct: number; gross_up_for_net: number | null; }
export function feeSplit(body: any): { error: string } | { result: FeeResult } {
  const amount = num(body?.amount);
  if (amount === undefined || amount < 0) return { error: 'Provide "amount" as a non-negative number.' };
  const fee_percent = num(body?.fee_percent) ?? 2.9;
  const fixed_fee = num(body?.fixed_fee) ?? 0.3;
  if (fee_percent < 0 || fee_percent >= 100) return { error: '"fee_percent" must be in [0, 100).' };
  if (fixed_fee < 0) return { error: '"fixed_fee" must be 0 or greater.' };
  const fee_total = round(amount * (fee_percent / 100) + fixed_fee);
  const net_amount = round(amount - fee_total);
  const target_net = num(body?.target_net);
  const gross_up_for_net = target_net !== undefined ? round((target_net + fixed_fee) / (1 - fee_percent / 100)) : null;
  return { result: { amount: round(amount), fee_percent, fixed_fee: round(fixed_fee), fee_total, net_amount, effective_fee_pct: amount > 0 ? round((fee_total / amount) * 100, 3) : 0, gross_up_for_net } };
}

export interface Allocation { name: string; weight: number; share_pct: number; amount: number; }
export interface SettlementResult { amount: number; total_weight: number; allocations: Allocation[]; allocated_total: number; }
export function settlement(body: any): { error: string } | { result: SettlementResult } {
  const amount = num(body?.amount);
  if (amount === undefined || amount < 0) return { error: 'Provide "amount" as a non-negative number.' };
  const parties = body?.parties;
  if (!Array.isArray(parties) || parties.length === 0) return { error: 'Provide "parties" as a non-empty array of {name, weight} (or {name, share_pct}).' };
  const weights: { name: string; weight: number }[] = [];
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    const w = num(p?.weight) ?? num(p?.share_pct) ?? num(p?.share);
    if (w === undefined || w < 0) return { error: `Party ${i} needs a non-negative "weight" or "share_pct".` };
    weights.push({ name: str(p?.name) ?? `party_${i + 1}`, weight: w });
  }
  const total_weight = weights.reduce((s, w) => s + w.weight, 0);
  if (total_weight <= 0) return { error: 'Total weight across parties must be greater than 0.' };

  // Allocate in integer cents with largest-remainder so the split sums exactly.
  const totalCents = Math.round(amount * 100);
  const raw = weights.map((w) => (totalCents * w.weight) / total_weight);
  const floors = raw.map((x) => Math.floor(x));
  let remainder = totalCents - floors.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  const cents = [...floors];
  for (let k = 0; k < remainder; k++) cents[order[k % order.length].i] += 1;
  const allocations: Allocation[] = weights.map((w, i) => ({ name: w.name, weight: w.weight, share_pct: round((w.weight / total_weight) * 100, 4), amount: round(cents[i] / 100) }));
  return { result: { amount: round(amount), total_weight: round(total_weight, 6), allocations, allocated_total: round(cents.reduce((s, c) => s + c, 0) / 100) } };
}

const CHAIN_TO = [
  { api: 'refinance-calculator', reason: 'Compare this installment plan against refinancing an existing loan.' },
  { api: 'dti-calculator', reason: 'Check whether the monthly payment fits the borrower\'s debt-to-income limits.' },
  { api: 'country-currency-data', reason: 'Format the resulting amounts in the right currency for display.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Finance Payments API', version: '1.0.0',
    description: 'Deterministic payments math: installment/amortization (payment, total interest, schedule), processor fee split + gross-up, and exact multi-party settlement (largest-remainder, sums to the penny). Real arithmetic — no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/finance-payments/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/installment', summary: 'Amortizing payment, total interest, schedule', price_usdc: 0.008 },
      { method: 'POST', path: '/fee-split', summary: 'Processor fee, net settlement, gross-up', price_usdc: 0.006 },
      { method: 'POST', path: '/settlement', summary: 'Exact multi-party split (sums to the penny)', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL installment + per-payment fee + reasoning', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/installment', price_usdc: 0.008, currency: 'USDC' },
      { path: '/fee-split', price_usdc: 0.006, currency: 'USDC' },
      { path: '/settlement', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/installment', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = installment(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, financial_disclaimer: FINANCIAL_DISCLAIMER,
    confidence_score: 1.0, confidence_per_section: { amortization: 1 },
    recommended_actions_priority_order: [`Monthly payment ${v.monthly_payment} for ${v.term_months} months; total interest ${v.total_interest}, total paid ${v.total_paid}.`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/fee-split', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = feeSplit(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, financial_disclaimer: FINANCIAL_DISCLAIMER,
    confidence_score: 1.0, confidence_per_section: { fees: 1 },
    recommended_actions_priority_order: [`Fee ${v.fee_total} (${v.effective_fee_pct}% effective); net ${v.net_amount}.`, ...(v.gross_up_for_net !== null ? [`Charge ${v.gross_up_for_net} to net the requested amount.`] : [])],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/settlement', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = settlement(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, financial_disclaimer: FINANCIAL_DISCLAIMER,
    confidence_score: 1.0, confidence_per_section: { allocation: 1 },
    recommended_actions_priority_order: [`Split ${v.amount} across ${v.allocations.length} parties; allocated total ${v.allocated_total} (sums exactly).`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = installment(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  // Optional per-payment processor fee.
  const feePct = num(req.body?.fee_percent);
  const fixed = num(req.body?.fixed_fee);
  const hasFee = feePct !== undefined || fixed !== undefined;
  const per_payment_fee = hasFee ? round(v.monthly_payment * ((feePct ?? 0) / 100) + (fixed ?? 0)) : null;
  const net_per_payment = per_payment_fee !== null ? round(v.monthly_payment - per_payment_fee) : null;
  respond(res, t0, {
    ...v, per_payment_fee, net_per_payment, financial_disclaimer: FINANCIAL_DISCLAIMER,
    reasoning: {
      why_result_generated: `Amortized ${v.principal} at ${v.apr}% over ${v.term_months} months → ${v.monthly_payment}/mo, total interest ${v.total_interest}.`,
      key_factors: [`Monthly payment: ${v.monthly_payment}.`, `Total paid: ${v.total_paid}.`, hasFee ? `Net per payment after fee: ${net_per_payment}.` : 'No processor fee applied.'],
      invalidators: ['Assumes a fixed rate and equal monthly payments; variable-rate or irregular schedules differ.', 'Ignores taxes, insurance, and origination fees unless folded into principal.', 'The last payment is adjusted by cents to close the balance exactly.'],
    },
    confidence_score: 1.0, confidence_per_section: { amortization: 1, fees: hasFee ? 1 : 1 },
    recommended_actions_priority_order: [`Monthly ${v.monthly_payment} for ${v.term_months} mo; total interest ${v.total_interest}.`, ...(net_per_payment !== null ? [`After processor fee, you net ${net_per_payment}/payment.`] : [])],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
