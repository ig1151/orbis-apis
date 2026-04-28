import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();
const SUPPORTED = ['ETH', 'BNB', 'SOL'];
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana'
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

async function fetchPrice(symbol: string) {
  const id = COINGECKO_IDS[symbol];
  const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;
  const { data } = await axios.get(url, { timeout: 8000 });
  const m = data.market_data;
  return {
    price_usd: m.current_price.usd,
    change_24h: m.price_change_percentage_24h,
    change_7d: m.price_change_percentage_7d,
    volume_24h: m.total_volume.usd,
    market_cap: m.market_cap.usd,
    ath_change: m.ath_change_percentage.usd
  };
}

async function fetchNewsSentiment(symbol: string) {
  const { data } = await axios.post('https://api.tavily.com/search', {
    api_key: TAVILY_API_KEY,
    query: `${symbol} cryptocurrency price prediction news today`,
    search_depth: 'basic',
    max_results: 5,
    include_answer: true
  }, { timeout: 10000 });
  const headlines = (data.results || []).map((r: any) => r.title).join(' | ');
  return { headlines, answer: data.answer || '' };
}

async function generateSignal(symbol: string, price: any, news: any) {
  const prompt = `You are a professional crypto trading analyst. Analyze the following data for ${symbol} and generate a trading signal.

PRICE DATA:
- Current Price: $${price.price_usd}
- 24h Change: ${price.change_24h?.toFixed(2)}%
- 7d Change: ${price.change_7d?.toFixed(2)}%
- 24h Volume: $${(price.volume_24h / 1e9).toFixed(2)}B
- Market Cap: $${(price.market_cap / 1e9).toFixed(2)}B
- ATH Change: ${price.ath_change?.toFixed(2)}%

NEWS SUMMARY:
${news.answer || 'No summary available'}

HEADLINES:
${news.headlines || 'No headlines available'}

Respond ONLY with a valid JSON object, no markdown, no explanation:
{
  "signal": "buy" | "sell" | "hold",
  "confidence": 0.0-1.0,
  "sentiment": "bullish" | "bearish" | "neutral",
  "momentum": "strong" | "moderate" | "weak",
  "risk_level": "low" | "medium" | "high",
  "reasoning": "2-3 sentence explanation",
  "key_factors": ["factor1", "factor2", "factor3"]
}`;

  const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'anthropic/claude-sonnet-4-5',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.3
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 15000
  });

  const raw = data.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

router.get('/signal/batch', async (_req: Request, res: Response) => {
  try {
    console.log('[signal/batch] fetching all symbols');
    const results = await Promise.allSettled(
      SUPPORTED.map(async (symbol) => {
        const [price, news] = await Promise.all([fetchPrice(symbol), fetchNewsSentiment(symbol)]);
        const ai = await generateSignal(symbol, price, news);
        return { symbol, signal: ai.signal, confidence: ai.confidence, sentiment: ai.sentiment, momentum: ai.momentum, risk_level: ai.risk_level, reasoning: ai.reasoning, key_factors: ai.key_factors, price_data: price, timestamp: new Date().toISOString() };
      })
    );
    const signals = results.map((r, i) => r.status === 'fulfilled' ? r.value : { symbol: SUPPORTED[i], error: 'Failed' });
    return res.json({ signals, count: signals.length, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[signal/batch] error:', err.message);
    return res.status(500).json({ error: 'Failed to generate batch signals' });
  }
});

router.get('/signal/:symbol', async (req: Request, res: Response) => {
  const schema = Joi.object({ symbol: Joi.string().uppercase().valid(...SUPPORTED).required() });
  const { error, value } = schema.validate({ symbol: req.params.symbol.toUpperCase() });
  if (error) return res.status(400).json({ error: `Unsupported symbol. Use: ${SUPPORTED.join(', ')}` });
  try {
    console.log(`[signal] symbol=${value.symbol}`);
    const [price, news] = await Promise.all([fetchPrice(value.symbol), fetchNewsSentiment(value.symbol)]);
    const ai = await generateSignal(value.symbol, price, news);
    return res.json({ symbol: value.symbol, signal: ai.signal, confidence: ai.confidence, sentiment: ai.sentiment, momentum: ai.momentum, risk_level: ai.risk_level, reasoning: ai.reasoning, key_factors: ai.key_factors, price_data: price, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error(`[signal] error:`, err.message);
    return res.status(500).json({ error: 'Failed to generate signal' });
  }
});

export default router;
