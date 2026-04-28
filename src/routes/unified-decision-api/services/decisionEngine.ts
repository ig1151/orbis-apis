import { DecideRequest, DecideResponse, MarketContext, NewsContext, PortfolioContext } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

export async function buildDecision(
  request: DecideRequest,
  primaryAsset: string,
  market: MarketContext | null,
  news: NewsContext | null,
  portfolio: PortfolioContext | null
): Promise<DecideResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const signalsUsed: string[] = [];
  if (market) signalsUsed.push('market_signal');
  if (news) signalsUsed.push('news_impact');
  if (portfolio) signalsUsed.push('portfolio_rebalance');

  const prompt = `You are a unified trading decision engine. Combine all available signals and generate a final actionable decision.
Asset: ${primaryAsset}
Risk tolerance: ${request.risk_tolerance}
Portfolio value: $${request.portfolio.reduce((s, p) => s + p.value, 0)}
Market signal: ${market ? JSON.stringify(market) : 'unavailable'}
News impact: ${news ? JSON.stringify(news) : 'unavailable'}
Portfolio context: ${portfolio ? JSON.stringify({ health_score: portfolio.health_score, rebalance_score: portfolio.rebalance_score, trigger: portfolio.trigger, current_allocations: portfolio.current_allocations, target_allocations: portfolio.target_allocations }) : 'unavailable'}
Return ONLY valid JSON:
{
  "final_decision": "short snake_case decision e.g. buy_and_rebalance, hold_and_monitor, reduce_and_rebalance, strong_buy, avoid",
  "confidence": number 0-1,
  "urgency": "high" | "medium" | "low",
  "summary": "2-3 sentence plain-English summary of what to do and why",
  "actions": [
    {
      "asset": "TICKER",
      "action": "buy" | "sell" | "hold" | "watch",
      "amount_usd": number or null,
      "reason": "one sentence",
      "priority": "high" | "medium" | "low"
    }
  ]
}
Rules:
- Combine all signals holistically — if news is bearish but market is bullish, reflect the conflict in confidence
- If portfolio trigger is true, always include rebalance actions
- urgency high = act now, medium = act today, low = monitor
- Return ONLY JSON`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);

  return {
    primary_asset: primaryAsset,
    final_decision: parsed.final_decision,
    confidence: parsed.confidence,
    urgency: parsed.urgency,
    summary: parsed.summary,
    market_context: market,
    news_context: news,
    portfolio_context: portfolio,
    actions: parsed.actions ?? [],
    signals_used: signalsUsed,
    analyzedAt: new Date().toISOString()
  };
}
