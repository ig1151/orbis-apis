import axios from 'axios';

export class PortfolioRebalanceClient {
  constructor(private baseUrl: string, private timeout: number) {}

  async rebalance(options: unknown): Promise<unknown> {
    const res = await axios.post(`${this.baseUrl}/v1/rebalance`, options, { timeout: this.timeout });
    return res.data;
  }

  async strategies(): Promise<unknown> {
    const res = await axios.get(`${this.baseUrl}/v1/strategies`, { timeout: this.timeout });
    return res.data;
  }
}
