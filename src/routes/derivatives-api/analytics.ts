import { InstrumentTicker } from './deribit';

// ── Put/Call Ratio ─────────────────────────────────────────────────────────
export function calcPutCallRatio(instruments: InstrumentTicker[]) {
  let callOI = 0, putOI = 0, callVol = 0, putVol = 0;
  for (const i of instruments) {
    if (i.type === 'call') { callOI += i.openInterest; callVol += i.volume24h; }
    else                   { putOI  += i.openInterest; putVol  += i.volume24h; }
  }
  return {
    byOI:     callOI > 0 ? round(putOI / callOI, 4) : 0,
    byVolume: callVol > 0 ? round(putVol / callVol, 4) : 0,
  };
}

// ── Aggregate Open Interest ────────────────────────────────────────────────
export function aggregateOI(instruments: InstrumentTicker[]) {
  let totalCallOI = 0, totalPutOI = 0;
  const byExpiry: Record<string, { callOI: number; putOI: number }> = {};

  for (const i of instruments) {
    if (i.type === 'call') totalCallOI += i.openInterest;
    else                   totalPutOI  += i.openInterest;

    if (!byExpiry[i.expiry]) byExpiry[i.expiry] = { callOI: 0, putOI: 0 };
    if (i.type === 'call') byExpiry[i.expiry].callOI += i.openInterest;
    else                   byExpiry[i.expiry].putOI  += i.openInterest;
  }

  return {
    totalCallOI: round(totalCallOI, 2),
    totalPutOI:  round(totalPutOI, 2),
    byExpiry,
  };
}

// ── Max Pain ───────────────────────────────────────────────────────────────
// Max pain = strike price where total option value (to holders) is minimised
// i.e. where option writers (market makers) lose the least
export function calcMaxPain(instruments: InstrumentTicker[]) {
  // Group by expiry
  const byExpiry: Record<string, InstrumentTicker[]> = {};
  for (const i of instruments) {
    if (!byExpiry[i.expiry]) byExpiry[i.expiry] = [];
    byExpiry[i.expiry].push(i);
  }

  const result: Record<string, { maxPain: number; totalNotional: number }> = {};

  for (const [expiry, opts] of Object.entries(byExpiry)) {
    const strikes = [...new Set(opts.map((o) => o.strike))].sort((a, b) => a - b);
    if (strikes.length === 0) continue;

    let minPain = Infinity;
    let maxPainStrike = strikes[0];
    let totalNotional = 0;

    for (const candidate of strikes) {
      let pain = 0;
      for (const opt of opts) {
        if (opt.type === 'call' && candidate > opt.strike) {
          pain += (candidate - opt.strike) * opt.openInterest;
        } else if (opt.type === 'put' && candidate < opt.strike) {
          pain += (opt.strike - candidate) * opt.openInterest;
        }
      }
      if (pain < minPain) {
        minPain = pain;
        maxPainStrike = candidate;
      }
    }

    // Notional = total OI * underlying price (rough USD value)
    const underlying = opts[0]?.underlyingPrice ?? 0;
    totalNotional = opts.reduce((s, o) => s + o.openInterest, 0) * underlying;

    result[expiry] = {
      maxPain: maxPainStrike,
      totalNotional: Math.round(totalNotional),
    };
  }

  return result;
}

function round(n: number, dp: number) {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}
