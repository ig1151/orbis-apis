import { Router, Request, Response } from 'express';

// Deterministic currency formatting via Intl.NumberFormat / Intl.DisplayNames +
// a bundled ISO 4217 table. No LLM. FX conversion is NOT fabricated: a real rate
// must be supplied, else rate=null with a chain_to the fx-rates API.
const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const DISCLAIMER = 'Exchange rates are not fabricated here. Supply a rate or call the fx-rates API for live rates.';
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

const ISO: Record<string, { name: string; symbol_native: string; decimal_digits: number; countries: string[] }> = {
  USD: { name: 'US Dollar', symbol_native: '$', decimal_digits: 2, countries: ['United States', 'Ecuador', 'El Salvador'] },
  EUR: { name: 'Euro', symbol_native: '€', decimal_digits: 2, countries: ['Germany', 'France', 'Spain', 'Italy', 'Ireland', 'Netherlands'] },
  GBP: { name: 'British Pound', symbol_native: '£', decimal_digits: 2, countries: ['United Kingdom'] },
  JPY: { name: 'Japanese Yen', symbol_native: '¥', decimal_digits: 0, countries: ['Japan'] },
  CNY: { name: 'Chinese Yuan', symbol_native: '¥', decimal_digits: 2, countries: ['China'] },
  INR: { name: 'Indian Rupee', symbol_native: '₹', decimal_digits: 2, countries: ['India'] },
  CAD: { name: 'Canadian Dollar', symbol_native: '$', decimal_digits: 2, countries: ['Canada'] },
  AUD: { name: 'Australian Dollar', symbol_native: '$', decimal_digits: 2, countries: ['Australia'] },
  CHF: { name: 'Swiss Franc', symbol_native: 'CHF', decimal_digits: 2, countries: ['Switzerland'] },
  HKD: { name: 'Hong Kong Dollar', symbol_native: '$', decimal_digits: 2, countries: ['Hong Kong'] },
  SGD: { name: 'Singapore Dollar', symbol_native: '$', decimal_digits: 2, countries: ['Singapore'] },
  KRW: { name: 'South Korean Won', symbol_native: '₩', decimal_digits: 0, countries: ['South Korea'] },
  BRL: { name: 'Brazilian Real', symbol_native: 'R$', decimal_digits: 2, countries: ['Brazil'] },
  MXN: { name: 'Mexican Peso', symbol_native: '$', decimal_digits: 2, countries: ['Mexico'] },
  ZAR: { name: 'South African Rand', symbol_native: 'R', decimal_digits: 2, countries: ['South Africa'] },
  AED: { name: 'UAE Dirham', symbol_native: 'د.إ', decimal_digits: 2, countries: ['United Arab Emirates'] },
  SEK: { name: 'Swedish Krona', symbol_native: 'kr', decimal_digits: 2, countries: ['Sweden'] },
  NOK: { name: 'Norwegian Krone', symbol_native: 'kr', decimal_digits: 2, countries: ['Norway'] },
  NZD: { name: 'New Zealand Dollar', symbol_native: '$', decimal_digits: 2, countries: ['New Zealand'] },
  RUB: { name: 'Russian Ruble', symbol_native: '₽', decimal_digits: 2, countries: ['Russia'] },
  TRY: { name: 'Turkish Lira', symbol_native: '₺', decimal_digits: 2, countries: ['Turkey'] },
};
const currencyName = (() => { try { return new Intl.DisplayNames(['en'], { type: 'currency' }); } catch { return null; } })();

// Intl.NumberFormat only checks the 3-letter *format*, not real ISO 4217
// membership, so validate against the ICU-supported currency set.
const SUPPORTED: Set<string> | null = (() => { try { return new Set((Intl as any).supportedValuesOf('currency') as string[]); } catch { return null; } })();
function validCurrency(code: string): boolean {
  if (!/^[A-Za-z]{3}$/.test(code)) return false;
  const c = code.toUpperCase();
  if (SUPPORTED) return SUPPORTED.has(c);
  if (c in ISO) return true;
  try { new Intl.NumberFormat('en-US', { style: 'currency', currency: c }); return true; } catch { return false; }
}
function fmtParts(amount: number, currency: string, locale: string) {
  const nf = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const parts = nf.formatToParts(amount);
  const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency;
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';
  const ci = parts.findIndex((p) => p.type === 'currency');
  const ni = parts.findIndex((p) => p.type === 'integer');
  const decimal_places = nf.resolvedOptions().maximumFractionDigits;
  return { formatted: nf.format(amount), symbol, decimal_separator: decimal, thousands_separator: group, decimal_places, symbol_position: ci < ni ? 'before' : 'after' };
}
function compact(amount: number, currency: string, locale: string) {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact' }).format(amount); } catch { return undefined; }
}
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function under1000(n: number): string { let s = ''; if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' hundred'; n %= 100; if (n) s += ' '; } if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; } else if (n > 0) s += ONES[n]; return s; }
function toWords(n: number): string {
  if (n === 0) return 'zero';
  const scales = ['', ' thousand', ' million', ' billion', ' trillion']; let i = 0; const parts: string[] = []; let x = Math.floor(Math.abs(n));
  if (x === 0) parts.push('zero');
  while (x > 0) { const c = x % 1000; if (c) parts.unshift(under1000(c) + scales[i]); x = Math.floor(x / 1000); i++; }
  return (n < 0 ? 'negative ' : '') + parts.join(' ').trim();
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Currency Formatting API', info: '/currency-formatting/info', openapi: '/currency-formatting/openapi.json', health: 'ok' });
});

router.post('/format', (req: Request, res: Response) => {
  const { amount, currency, locale } = req.body || {};
  if (amount === undefined || !currency) return res.status(400).json({ error: 'amount and currency are required' });
  const amt = Number(amount); const cur = String(currency).toUpperCase(); const loc = locale || 'en-US';
  if (!Number.isFinite(amt)) return res.status(400).json({ error: 'amount must be a number' });
  if (!validCurrency(cur)) return res.status(400).json({ error: `invalid ISO 4217 currency code: ${currency}` });
  const p = fmtParts(amt, cur, loc);
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    amount: amt, currency: cur, locale: loc,
    formatted: p.formatted, formatted_compact: compact(amt, cur, loc) ?? p.formatted,
    symbol: p.symbol, symbol_position: p.symbol_position, decimal_separator: p.decimal_separator,
    thousands_separator: p.thousands_separator, decimal_places: p.decimal_places,
    words: `${toWords(amt)} ${(ISO[cur]?.name || currencyName?.of(cur) || cur).toLowerCase()}`,
    confidence_per_section: { formatted: 1.0, symbol: 1.0 },
    recommended_actions_priority_order: ['Use the formatted string for display.', 'Store the raw amount + ISO code for calculations.'],
    privacy: PRIVACY,
  });
});

router.post('/convert', (req: Request, res: Response) => {
  const { amount, from_currency, to_currency, rate } = req.body || {};
  if (amount === undefined || !from_currency || !to_currency) return res.status(400).json({ error: 'amount, from_currency, and to_currency are required' });
  const amt = Number(amount); const fc = String(from_currency).toUpperCase(); const tc = String(to_currency).toUpperCase();
  if (!Number.isFinite(amt)) return res.status(400).json({ error: 'amount must be a number' });
  if (!validCurrency(fc)) return res.status(400).json({ error: `invalid currency: ${from_currency}` });
  if (!validCurrency(tc)) return res.status(400).json({ error: `invalid currency: ${to_currency}` });
  const r = rate != null && Number.isFinite(Number(rate)) ? Number(rate) : null;
  const conv = r != null ? amt * r : null;
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    original: { amount: amt, currency: fc, formatted: fmtParts(amt, fc, 'en-US').formatted },
    converted: r != null
      ? { amount: conv, currency: tc, formatted: fmtParts(conv as number, tc, 'en-US').formatted, formatted_compact: compact(conv as number, tc, 'en-US') }
      : { amount: null, currency: tc, formatted: null, formatted_compact: null },
    exchange_rate: r, rate_source: r != null ? 'caller_supplied' : null,
    rate_timestamp: r != null ? new Date().toISOString() : null,
    inverse_rate: r != null && r !== 0 ? 1 / r : null,
    rate_available: r != null,
    financial_disclaimer: DISCLAIMER,
    chain_to: r != null ? [] : [{ api: 'fx-rates', reason: `Fetch a live ${fc}->${tc} rate, then re-call /convert with rate.` }],
    confidence_per_section: { converted: r != null ? 1.0 : 0, formatting: 1.0 },
    recommended_actions_priority_order: r != null ? ['Apply currency-appropriate rounding to the converted amount.'] : ['Call the fx-rates API for a live rate, then pass it as "rate".'],
    privacy: PRIVACY,
  });
});

router.post('/symbols', (req: Request, res: Response) => {
  const { region } = req.body || {};
  const entries = Object.entries(ISO).map(([code, m]) => ({
    code, name: m.name, symbol: fmtParts(0, code, 'en-US').symbol, symbol_native: m.symbol_native,
    decimal_digits: m.decimal_digits, rounding: 0, country: m.countries[0], country_code: null,
    countries: m.countries,
  }));
  const filtered = region ? entries.filter((e) => e.countries.some((c) => c.toLowerCase().includes(String(region).toLowerCase())) || e.code === String(region).toUpperCase()) : entries;
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    region: region || 'global', currencies: filtered, total: filtered.length,
    confidence_per_section: { currencies: 1.0 },
    recommended_actions_priority_order: ['Cache currency metadata — it rarely changes.', 'Use the ISO 4217 code, not the symbol, for storage.'],
    privacy: PRIVACY,
  });
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { currency, objective } = req.body || {};
  if (!currency) return res.status(400).json({ error: 'currency is required' });
  const valid = validCurrency(String(currency).toUpperCase());
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: valid, currency, objective: objective || 'currency_format',
    next_api: 'fx-rates', next_endpoint: '/convert',
    blocking_flags: valid ? [] : ['INVALID_CURRENCY'],
    flag_definitions: { NO_CURRENCY: 'No currency code provided', INVALID_CURRENCY: 'Currency code is not a valid ISO 4217 code' },
    confidence_per_section: { execution_ready: 1.0, blocking_flags: 1.0 },
    recommended_actions_priority_order: ['Validate currency code', 'Get symbol metadata', 'Format for display locale'],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const { currency } = req.body || {};
  if (!currency) return res.status(400).json({ error: 'currency is required' });
  const cur = String(currency).toUpperCase();
  if (!validCurrency(cur)) return res.status(400).json({ error: `invalid ISO 4217 currency code: ${currency}` });
  const meta = ISO[cur];
  const p = fmtParts(1234567.89, cur, 'en-US');
  const examples = ['en-US', 'de-DE', 'ja-JP', 'en-IN'].map((loc) => ({ locale: loc, amount: 1234567.89, formatted: fmtParts(1234567.89, cur, loc).formatted }));
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    currency: cur,
    metadata: {
      name: meta?.name || currencyName?.of(cur) || cur, symbol: p.symbol, symbol_native: meta?.symbol_native || p.symbol,
      decimal_digits: p.decimal_places, rounding: 0, iso_4217: cur,
    },
    countries_using: meta?.countries || [],
    formatting_examples: examples,
    major_pairs: ['USD', 'EUR', 'GBP', 'JPY'].filter((q) => q !== cur).map((q) => ({ pair: `${cur}/${q}`, indicative_rate: null })),
    financial_disclaimer: DISCLAIMER,
    chain_to: [{ api: 'fx-rates', reason: 'Fetch live exchange rates for the listed pairs.' }],
    confidence_per_section: { metadata: 1.0, countries_using: meta ? 1.0 : 0, major_pairs: 0 },
    recommended_actions_priority_order: ['Use the ISO 4217 code for all storage.', 'Apply locale-specific formatting for display.', 'Call fx-rates for any actual conversion.'],
    privacy: PRIVACY,
  });
});

export default router;
