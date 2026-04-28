import axios from 'axios';

export class MarketSignalClient {
  constructor(private baseUrl: string, private timeout: number) {}

  async signal(ticker: string): Promise<unknown> {
    const res = await axios.get(`${this.baseUrl}/v1/signal/${ticker}`, { timeout: this.timeout });
    return res.data;
  }

  async batchSignal(assets: string[]): Promise<unknown> {
    const res = await axios.post(`${this.baseUrl}/v1/signal/batch`, { assets }, { timeout: this.timeout });
    return res.data;
  }
}
