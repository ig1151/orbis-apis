import axios from 'axios';
import { PriceData } from '../types';

const BASE_URL = 'https://www.alphavantage.co/query';

export async function getDailyPrices(ticker: string): Promise<PriceData[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not configured');

  const response = await axios.get(BASE_URL, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol: ticker.toUpperCase(),
      outputsize: 'compact',
      apikey: apiKey
    },
    timeout: 15000
  });

  const timeSeries = response.data['Time Series (Daily)'];
  if (!timeSeries) {
    const note = response.data['Note'] || response.data['Information'];
    if (note) throw new Error(`Alpha Vantage rate limit: ${note}`);
    throw new Error(`No data found for ticker: ${ticker.toUpperCase()}`);
  }

  return Object.entries(timeSeries)
    .slice(0, 60)
    .map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10)
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
