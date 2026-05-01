import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export interface TokenScore {
  overall: number;
  label: string;
  breakdown: {
    supplyHealth: number;
    inflationRisk: number;
    vestingRisk: number;
    distributionFairness: number;
  };
  inflation_risk: string;
  unlock_pressure: string;
  allocation_risk: string;
  valuation: string;
  long_term_outlook: string;
  confidence: number;
  verdict: string;
}

export function ruleBasedScore(tokenomics: any): TokenScore {
  let supplyHealth = 50;
  let inflationRisk = 50;
  let vestingRisk = 70;
  let distributionFairness = 50;

  if (tokenomics.max !== null) {
    supplyHealth = 90;
    if (tokenomics.circulatingPct && tokenomics.circulatingPct > 80) supplyHealth = 95;
    else if (tokenomics.circulatingPct && tokenomics.circulatingPct < 30) supplyHealth = 60;
  } else {
    supplyHealth = 40;
  }

  if (tokenomics.inflationRate === null) {
    inflationRisk = 50;
  } else if (tokenomics.inflationRate < 2) {
    inflationRisk = 90;
  } else if (tokenomics.inflationRate < 5) {
    inflationRisk = 75;
  } else if (tokenomics.inflationRate < 10) {
    inflationRisk = 55;
  } else {
    inflationRisk = 30;
  }

  if (tokenomics.fdvToMcapRatio !== null) {
    if (tokenomics.fdvToMcapRatio < 1.2) vestingRisk = 90;
    else if (tokenomics.fdvToMcapRatio < 2) vestingRisk = 70;
    else if (tokenomics.fdvToMcapRatio < 5) vestingRisk = 45;
    else vestingRisk = 20;
  }

  if (tokenomics.circulatingPct !== null) {
    if (tokenomics.circulatingPct > 70) distributionFairness = 85;
    else if (tokenomics.circulatingPct > 40) distributionFairness = 65;
    else distributionFairness = 40;
  }

  const overall = Math.round(
    supplyHealth * 0.3 +
    inflationRisk * 0.3 +
    vestingRisk * 0.25 +
    distributionFairness * 0.15
  );

  const label =
    overall >= 80 ? 'excellent' :
    overall >= 65 ? 'good' :
    overall >= 50 ? 'fair' :
    overall >= 35 ? 'poor' : 'very poor';

  // ── Intelligence fields ─────────────────────────────────────────────────
  const inflation_risk =
    tokenomics.inflationRate === null ? 'unknown' :
    tokenomics.inflationRate < 2 ? 'low' :
    tokenomics.inflationRate < 7 ? 'medium' : 'high';

  const fdv = tokenomics.fdvToMcapRatio;
  const unlock_pressure =
    fdv === null ? 'unknown' :
    fdv < 1.2 ? 'stable' :
    fdv < 3 ? 'increasing' : 'critical';

  const circ = tokenomics.circulatingPct;
  const allocation_risk =
    circ === null ? 'unknown' :
    circ > 70 ? 'fair' :
    circ > 40 ? 'team_heavy' : 'vc_heavy';

  // Valuation proxy — FDV vs market cap
  const valuation =
    fdv === null ? 'unknown' :
    fdv < 1.1 ? 'fair' :
    fdv < 2 ? 'slightly_overvalued' : 'overvalued';

  const long_term_outlook =
    overall >= 75 && inflation_risk === 'low' ? 'bullish' :
    overall >= 55 ? 'neutral' : 'bearish';

  const confidence = Math.round(Math.min(0.95, (overall / 100) * 0.7 + 0.25) * 100) / 100;

  return {
    overall,
    label,
    breakdown: { supplyHealth, inflationRisk, vestingRisk, distributionFairness },
    inflation_risk,
    unlock_pressure,
    allocation_risk,
    valuation,
    long_term_outlook,
    confidence,
    verdict: '',
  };
}

export async function aiScore(token: string, tokenomics: any, ruleScore: TokenScore): Promise<TokenScore> {
  if (!OPENROUTER_API_KEY) return ruleScore;

  const prompt = `You are a crypto tokenomics analyst. Score the tokenomics of ${tokenomics.name} (${token}) and write a 2-sentence verdict.

Data:
- Circulating supply: ${tokenomics.circulating?.toLocaleString()}
- Max supply: ${tokenomics.max ? tokenomics.max.toLocaleString() : 'unlimited'}
- Circulating %: ${tokenomics.circulatingPct}%
- Inflation rate: ${tokenomics.inflationRate !== null ? tokenomics.inflationRate + '%' : 'unknown'}
- FDV/Mcap ratio: ${tokenomics.fdvToMcapRatio || 'unknown'}
- Inflation risk: ${ruleScore.inflation_risk}
- Unlock pressure: ${ruleScore.unlock_pressure}
- Allocation risk: ${ruleScore.allocation_risk}
- Valuation: ${ruleScore.valuation}
- Long term outlook: ${ruleScore.long_term_outlook}
- Rule-based score: ${ruleScore.overall}/100

Respond ONLY in this JSON format, no markdown:
{
  "verdict": "2 sentence verdict here"
}`;

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: 'anthropic/claude-sonnet-4-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }] },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, timeout: 15000 }
    );
    const text = res.data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { ...ruleScore, verdict: parsed.verdict };
  } catch (err: any) {
    console.error('[aiScore]', err.message);
    return { ...ruleScore, verdict: `${tokenomics.name} has ${ruleScore.label} tokenomics with a score of ${ruleScore.overall}/100. Long-term outlook is ${ruleScore.long_term_outlook}.` };
  }
}
