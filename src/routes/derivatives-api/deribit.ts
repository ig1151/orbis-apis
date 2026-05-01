import axios from 'axios';

const BASE = 'https://www.deribit.com/api/v2/public';

export interface InstrumentTicker {
  instrument_name: string;   // e.g. BTC-15JAN25-40000-C
  expiry: string;            // e.g. 15JAN25
  strike: number;
  type: 'call' | 'put';
  openInterest: number;      // in contracts (1 contract = 1 BTC or 1 ETH)
  volume24h: number;
  underlyingPrice: number;
}

// Fetch all active option instruments + their tickers for a currency
export async function fetchOptionsData(currency: string): Promise<InstrumentTicker[]> {
  // 1. Get all active option instruments
  const instrRes = await axios.get(`${BASE}/get_instruments`, {
    params: { currency, kind: 'option', expired: false },
    timeout: 10000,
  });

  const instruments: any[] = instrRes.data.result;

  // Limit to nearest 6 expiries to stay within reasonable response time
  const expirySet = new Set<string>();
  const filtered = instruments.filter((i) => {
    const parts = i.instrument_name.split('-');
    const expiry = parts[1];
    if (expirySet.size < 6 || expirySet.has(expiry)) {
      expirySet.add(expiry);
      return true;
    }
    return false;
  });

  // 2. Fetch tickers in batches (Deribit allows individual ticker calls)
  const results: InstrumentTicker[] = [];

  // Use book_summary_by_currency for efficiency — one call gets all
  const summaryRes = await axios.get(`${BASE}/get_book_summary_by_currency`, {
    params: { currency, kind: 'option' },
    timeout: 15000,
  });

  const summaries: any[] = summaryRes.data.result;
  const summaryMap = new Map<string, any>();
  for (const s of summaries) {
    summaryMap.set(s.instrument_name, s);
  }

  for (const instr of filtered) {
    const parts = instr.instrument_name.split('-'); // BTC-15JAN25-40000-C
    if (parts.length !== 4) continue;
    const [, expiry, strikeStr, typeChar] = parts;
    const strike = parseFloat(strikeStr);
    const type = typeChar === 'C' ? 'call' : 'put';
    const summary = summaryMap.get(instr.instrument_name);
    if (!summary) continue;

    results.push({
      instrument_name: instr.instrument_name,
      expiry,
      strike,
      type,
      openInterest: summary.open_interest ?? 0,
      volume24h: summary.volume ?? 0,
      underlyingPrice: summary.underlying_price ?? 0,
    });
  }

  return results;
}
