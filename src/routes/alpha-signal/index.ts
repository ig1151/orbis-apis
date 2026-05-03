import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();

const SUPPORTED = [
  'ETH', 'BNB', 'SOL', 'BTC', 'AVAX', 'ARB', 'OP', 'MATIC', 'LINK', 'UNI',
  'AAVE', 'CRV', 'MKR', 'SNX', 'INJ', 'TIA', 'JUP', 'WIF', 'BONK', 'PENDLE'
];

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana', BTC: 'bitcoin',
  AVAX: 'avalanche-2', ARB: 'arbitrum', OP: 'optimism', MATIC: 'matic-network',
  LINK: 'chainlink', UNI: 'uniswap', AAVE: 'aave', CRV: 'curve-dao-token',
  MKR: 'maker', SNX: 'havven', INJ: 'injective-protocol', TIA: 'celestia',
  JUP: 'jupiter-exchange-solana', WIF: 'dogwifcoin', BONK: 'bonk', PENDLE: 'pendle'
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
    change_1h: m.price_change_percentage_1h_in_currency?.usd ?? null,
    change_24h: m.price_change_percentage_24h,
    change_7d: m.price_change_percentage_7d,
    volume_24h: m.total_volume.usd,
    market_cap: m.market_cap.usd,
    ath_change: m.ath_change_percentage.usd,
    high_24h: m.high_24h.usd,
    low_24h: m.low_24h.usd
  };
}

async function fetchNews(symbol: string) {
  const { data } = await axios.post('https://api.tavily.com/search', {
    api_key: TAVILY_API_KEY,
    query: `${symbol} cryptocurrency price news today`,
    search_depth: 'basic',
    max_results: 5,
    include_answer: true
  }, { timeout: 10000 });
  const headlines = (data.results || []).map((r: any) => r.title).join(' | ');
  return { headlines, answer: data.answer || '' };
}

async function callAI(prompt: string): Promise<any> {
  const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'anthropic/claude-sonnet-4-5',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.3
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 15000
  });
  const raw = data.choices[0].message.content.trim();
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// POST /scan-signals
router.post('/scan-signals', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbols: Joi.array().items(Joi.string().uppercase().valid(...SUPPORTED)).min(1).max(10).default(['ETH', 'BTC', 'SOL']),
    timeframe: Joi.string().valid('1m', '5m', '15m', '1h', '4h', '1d').default('5m'),
    min_confidence: Joi.number().min(0).max(1).default(0),
    signal_types: Joi.array().items(Joi.string().valid('breakout', 'momentum', 'reversal', 'accumulation', 'distribution', 'squeeze')).default(['breakout', 'momentum', 'reversal', 'accumulation', 'distribution', 'squeeze'])
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { symbols, timeframe, min_confidence, signal_types } = value;
  try {
    const results = await Promise.allSettled(
      symbols.map(async (symbol: string) => {
        const price = await fetchPrice(symbol);
        const prompt = `You are a quantitative trading system. Analyze ${symbol} and return ONLY valid JSON, no markdown.
PRICE: $${price.price_usd} | 1h: ${price.change_1h?.toFixed(2) ?? 'N/A'}% | 24h: ${price.change_24h?.toFixed(2)}% | 7d: ${price.change_7d?.toFixed(2)}%
Volume 24h: $${(price.volume_24h / 1e9).toFixed(2)}B | High: $${price.high_24h} | Low: $${price.low_24h}
Timeframe: ${timeframe} | Valid signal_types: ${signal_types.join(', ')}
Return: {"symbol":"${symbol}","signal_type":"breakout|momentum|reversal|accumulation|distribution|squeeze","action":"buy|sell|hold","confidence":0.0,"urgency":"low|medium|high|critical","entry_zone":{"low":0,"high":0},"stop_loss":0,"take_profit":0,"timeframe":"${timeframe}","trend":"bullish|bearish|neutral","volatility":0.0,"volume_signal":"rising|falling|neutral","reasoning":"one sentence"}`;
        const ai = await callAI(prompt);
        return { ...ai, price_usd: price.price_usd, timestamp: new Date().toISOString() };
      })
    );
    const pollMs: Record<string, number> = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
    const signals = results
      .map((r, i) => r.status === 'fulfilled' ? r.value : { symbol: symbols[i], error: 'fetch_failed' })
      .filter((s: any) => !s.error && s.confidence >= min_confidence);
    return res.json({ signals, count: signals.length, timeframe, scanned: symbols.length, timestamp: new Date().toISOString(), next_poll_ms: pollMs[timeframe] ?? 300000 });
  } catch (err: any) {
    return res.status(500).json({ error: 'scan_failed', message: err.message });
  }
});

// POST /score-asset
router.post('/score-asset', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().valid(...SUPPORTED).required(),
    include_news: Joi.boolean().default(false)
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const price = await fetchPrice(value.symbol);
    const news = value.include_news ? await fetchNews(value.symbol) : null;
    const prompt = `You are a quantitative asset scoring engine. Score ${value.symbol} and return ONLY valid JSON, no markdown.
PRICE: $${price.price_usd} | 1h: ${price.change_1h?.toFixed(2) ?? 'N/A'}% | 24h: ${price.change_24h?.toFixed(2)}% | 7d: ${price.change_7d?.toFixed(2)}%
Volume: $${(price.volume_24h / 1e9).toFixed(2)}B | ATH Change: ${price.ath_change?.toFixed(2)}%${news ? ` | News: ${news.answer}` : ''}
Return: {"symbol":"${value.symbol}","composite_score":0.0,"trend_score":0.0,"momentum_score":0.0,"volume_score":0.0,"sentiment_score":0.0,"trend":"bullish|bearish|neutral","volatility":0.0,"regime":"trending|ranging|breakout|breakdown|accumulation|distribution","bias":"long|short|neutral","strength":"strong|moderate|weak","risk_rating":"low|medium|high|extreme"}`;
    const ai = await callAI(prompt);
    return res.json({ ...ai, price_usd: price.price_usd, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'score_failed', message: err.message });
  }
});

// POST /detect-event
router.post('/detect-event', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().valid(...SUPPORTED).required(),
    include_news: Joi.boolean().default(true)
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const price = await fetchPrice(value.symbol);
    const news = value.include_news ? await fetchNews(value.symbol) : null;
    const prompt = `You are a market event detection engine. Detect the most significant event for ${value.symbol} and return ONLY valid JSON, no markdown.
PRICE: $${price.price_usd} | 1h: ${price.change_1h?.toFixed(2) ?? 'N/A'}% | 24h: ${price.change_24h?.toFixed(2)}% | 7d: ${price.change_7d?.toFixed(2)}%
Volume: $${(price.volume_24h / 1e9).toFixed(2)}B | High: $${price.high_24h} | Low: $${price.low_24h}${news ? ` | News: ${news.answer} | Headlines: ${news.headlines}` : ''}
Return: {"symbol":"${value.symbol}","event_detected":true,"event_type":"volume_spike|price_breakout|flash_crash|accumulation|whale_move|sentiment_shift|liquidation_cascade|none","impact_score":0.0,"direction":"bullish|bearish|neutral","urgency":"low|medium|high|critical","confidence":0.0,"price_level":0,"description":"one sentence","chain_to":["score-asset","scan-signals","rank-opportunities"]}`;
    const ai = await callAI(prompt);
    return res.json({ ...ai, price_usd: price.price_usd, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'event_detection_failed', message: err.message });
  }
});

// POST /rank-opportunities
router.post('/rank-opportunities', async (req: Request, res: Response) => {
  const schema = Joi.object({
    universe: Joi.array().items(Joi.string().valid('crypto', 'defi', 'l1', 'l2', 'meme', 'custom')).default(['crypto']),
    custom_symbols: Joi.array().items(Joi.string().uppercase().valid(...SUPPORTED)).max(10).default([]),
    top_n: Joi.number().integer().min(1).max(10).default(5),
    min_score: Joi.number().min(0).max(1).default(0.5)
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const universeMap: Record<string, string[]> = {
    crypto: ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX'],
    defi: ['AAVE', 'UNI', 'CRV', 'MKR', 'PENDLE'],
    l1: ['ETH', 'SOL', 'AVAX', 'BNB', 'INJ'],
    l2: ['ARB', 'OP', 'MATIC'],
    meme: ['WIF', 'BONK'],
    custom: value.custom_symbols
  };
  const symbols: string[] = [...new Set<string>(
    value.universe.flatMap((u: string) => universeMap[u] || []).concat(value.custom_symbols)
  )].slice(0, 10);
  if (!symbols.length) return res.status(400).json({ error: 'No symbols resolved from universe' });
  try {
    const scores = await Promise.allSettled(
      symbols.map(async (symbol: string) => {
        const price = await fetchPrice(symbol);
        const prompt = `Score ${symbol} for trading opportunity. Return ONLY valid JSON, no markdown.
PRICE: $${price.price_usd} | 1h: ${price.change_1h?.toFixed(2) ?? 'N/A'}% | 24h: ${price.change_24h?.toFixed(2)}% | 7d: ${price.change_7d?.toFixed(2)}% | Vol: $${(price.volume_24h / 1e9).toFixed(2)}B
Return: {"symbol":"${symbol}","opportunity_score":0.0,"trend":"bullish|bearish|neutral","action":"buy|sell|hold","confidence":0.0,"risk_reward":0.0,"timeframe":"short|medium|long","catalyst":"one word"}`;
        const ai = await callAI(prompt);
        return { ...ai, price_usd: price.price_usd };
      })
    );
    const ranked = scores
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(s => s.opportunity_score >= value.min_score)
      .sort((a, b) => b.opportunity_score - a.opportunity_score)
      .slice(0, value.top_n);
    return res.json({ top: ranked, count: ranked.length, universe: value.universe, scanned: symbols.length, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'ranking_failed', message: err.message });
  }
});

// Legacy GET /signal/batch
router.get('/signal/batch', async (_req: Request, res: Response) => {
  try {
    const results = await Promise.allSettled(
      ['ETH', 'BNB', 'SOL'].map(async (symbol) => {
        const price = await fetchPrice(symbol);
        const news = await fetchNews(symbol);
        const prompt = `Trading signal for ${symbol}. Return ONLY valid JSON, no markdown.
PRICE: $${price.price_usd} | 24h: ${price.change_24h?.toFixed(2)}% | News: ${news.answer}
Return: {"signal":"buy|sell|hold","confidence":0.0,"sentiment":"bullish|bearish|neutral","momentum":"strong|moderate|weak","risk_level":"low|medium|high","reasoning":"brief","key_factors":["f1","f2","f3"]}`;
        const ai = await callAI(prompt);
        return { symbol, ...ai, price_data: price, timestamp: new Date().toISOString() };
      })
    );
    const signals = results.map((r, i) => r.status === 'fulfilled' ? r.value : { symbol: ['ETH','BNB','SOL'][i], error: 'Failed' });
    return res.json({ signals, count: signals.length, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate batch signals' });
  }
});

// Legacy GET /signal/:symbol
router.get('/signal/:symbol', async (req: Request, res: Response) => {
  const sym = req.params.symbol.toUpperCase();
  if (!SUPPORTED.includes(sym)) return res.status(400).json({ error: `Unsupported symbol. Use: ${SUPPORTED.join(', ')}` });
  try {
    const price = await fetchPrice(sym);
    const news = await fetchNews(sym);
    const prompt = `Trading signal for ${sym}. Return ONLY valid JSON, no markdown.
PRICE: $${price.price_usd} | 24h: ${price.change_24h?.toFixed(2)}% | News: ${news.answer}
Return: {"signal":"buy|sell|hold","confidence":0.0,"sentiment":"bullish|bearish|neutral","momentum":"strong|moderate|weak","risk_level":"low|medium|high","reasoning":"brief","key_factors":["f1","f2","f3"]}`;
    const ai = await callAI(prompt);
    return res.json({ symbol: sym, ...ai, price_data: price, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate signal' });
  }
});

export default router;
