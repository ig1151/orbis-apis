import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { COUNTRIES, CURRENCIES, Country, Currency } from './data';

// Deterministic ISO-3166 / ISO-4217 reference + money formatter. Static curated
// dataset + pure string math — no LLM, no network. Resolves countries (by name/
// ISO2/ISO3/numeric/dial), currencies (+ which countries use them), and formats
// monetary amounts with the correct symbol and minor units.

const router = Router();

export function findCountry(q: string): Country | undefined {
  const s = q.trim().toLowerCase();
  return COUNTRIES.find((c) =>
    c.iso2.toLowerCase() === s || c.iso3.toLowerCase() === s || c.numeric === s ||
    c.name.toLowerCase() === s || c.dial_code === (s.startsWith('+') ? s : '+' + s) ||
    c.name.toLowerCase().includes(s) && s.length >= 4);
}
export function findCurrency(code: string): Currency | undefined {
  return CURRENCIES[code.trim().toUpperCase()];
}

// Deterministic grouping format (no ICU dependency): symbol + grouped amount + code.
export function formatMoney(amount: number, cur: Currency): string {
  const neg = amount < 0;
  const fixed = Math.abs(amount).toFixed(cur.minor_units);
  const [intPart, frac] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = frac ? `${grouped}.${frac}` : grouped;
  return `${neg ? '-' : ''}${cur.symbol}${body} ${cur.code}`;
}

function countriesUsing(code: string): string[] {
  return COUNTRIES.filter((c) => c.currency === code).map((c) => c.iso2);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Country & Currency Data API', version: '1.0.0',
    description: `Deterministic ISO-3166 / ISO-4217 reference + money formatter over a curated static dataset (${COUNTRIES.length} countries, ${Object.keys(CURRENCIES).length} currencies). Resolve a country by name/ISO2/ISO3/numeric/dial code, a currency (and which countries use it), and format monetary amounts with the correct symbol and minor units. No LLM, no network.`,
    openapi_url: 'https://orbis-apis.onrender.com/country-currency-data/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/country', summary: 'Resolve a country record', price_usdc: 0.004 },
      { method: 'POST', path: '/currency', summary: 'Resolve a currency + countries using it', price_usdc: 0.004 },
      { method: 'POST', path: '/format', summary: 'Format an amount in a currency', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL country + currency + formatted amount', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/country', price_usdc: 0.004, currency: 'USDC' },
      { path: '/currency', price_usdc: 0.004, currency: 'USDC' },
      { path: '/format', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const CHAIN_TO = [
  { api: 'data-validator', reason: 'Validate phone numbers against the country dial code (E.164) or IBANs by country.' },
  { api: 'currency-formatting', reason: 'Locale-specific number/date formatting beyond the symbol + minor units.' },
];

router.post('/country', (req: Request, res: Response) => {
  const t0 = Date.now();
  const q = str(req.body?.query ?? req.body?.country);
  if (q === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "query" (name, ISO2/ISO3, numeric, or dial code).');
  const c = findCountry(q);
  if (!c) return respond(res, t0, { found: false, query: q, country: null, currency: null, confidence_score: 1.0, confidence_per_section: { lookup: 1 }, recommended_actions_priority_order: [`No country matched "${q}" in the curated dataset.`, 'Use an ISO-3166 alpha-2 code (e.g. "US") for an exact match.'], chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA });
  respond(res, t0, {
    found: true, query: q, country: c, currency: CURRENCIES[c.currency] ?? null,
    confidence_score: 1.0, confidence_per_section: { lookup: 1 },
    recommended_actions_priority_order: [`${c.name} (${c.iso2}/${c.iso3}), dial ${c.dial_code}, currency ${c.currency}.`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/currency', (req: Request, res: Response) => {
  const t0 = Date.now();
  const code = str(req.body?.code ?? req.body?.currency);
  if (code === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "code" (ISO-4217, e.g. "USD").');
  const cur = findCurrency(code);
  if (!cur) return respond(res, t0, { found: false, query: code, currency: null, used_by: [], confidence_score: 1.0, confidence_per_section: { lookup: 1 }, recommended_actions_priority_order: [`No currency matched "${code}" in the curated dataset.`], chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA });
  respond(res, t0, {
    found: true, query: code, currency: cur, used_by: countriesUsing(cur.code),
    confidence_score: 1.0, confidence_per_section: { lookup: 1 },
    recommended_actions_priority_order: [`${cur.code} — ${cur.name} (${cur.symbol}), ${cur.minor_units} minor units; used by ${countriesUsing(cur.code).join(', ') || 'no listed country'}.`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/format', (req: Request, res: Response) => {
  const t0 = Date.now();
  const amount = num(req.body?.amount);
  const code = str(req.body?.currency ?? req.body?.code);
  if (amount === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "amount" as a number.');
  if (code === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "currency" (ISO-4217 code).');
  const cur = findCurrency(code);
  if (!cur) return fail(res, t0, 400, 'invalid_request', `Unknown currency "${code}".`);
  const formatted = formatMoney(amount, cur);
  respond(res, t0, {
    amount, currency: cur, formatted, minor_units: cur.minor_units,
    confidence_score: 1.0, confidence_per_section: { formatting: 1 },
    recommended_actions_priority_order: [`Formatted ${amount} as ${formatted}.`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const cq = str(req.body?.country);
  const curq = str(req.body?.currency);
  if (cq === undefined && curq === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "country" and/or "currency".');
  const country = cq ? findCountry(cq) ?? null : null;
  let cur: Currency | null = curq ? findCurrency(curq) ?? null : null;
  if (!cur && country) cur = CURRENCIES[country.currency] ?? null;
  const amount = num(req.body?.amount);
  const formatted = amount !== undefined && cur ? formatMoney(amount, cur) : null;
  respond(res, t0, {
    country, currency: cur, used_by: cur ? countriesUsing(cur.code) : [],
    amount: amount ?? null, formatted,
    reasoning: {
      why_result_generated: `Resolved ${country ? country.name : 'no country'} and ${cur ? cur.code : 'no currency'} from the static dataset${formatted ? `; formatted ${amount} as ${formatted}` : ''}.`,
      key_factors: [`Country: ${country ? country.iso2 : 'n/a'}.`, `Currency: ${cur ? cur.code : 'n/a'}.`, `Amount formatted: ${formatted ?? 'n/a'}.`],
      invalidators: ['Dataset is curated and finite — uncommon countries/currencies may be absent.', 'Symbols/minor units follow ISO-4217 defaults, not locale-specific display conventions.', 'No FX rates here — amounts are formatted, not converted.'],
    },
    confidence_score: 1.0, confidence_per_section: { lookup: 1, formatting: 1 },
    recommended_actions_priority_order: [
      country ? `${country.name} (${country.iso2}), dial ${country.dial_code}.` : 'No country resolved.',
      cur ? `Currency ${cur.code} (${cur.symbol})${formatted ? ` → ${formatted}` : ''}.` : 'No currency resolved.',
    ],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
