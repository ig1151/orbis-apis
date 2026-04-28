import axios from 'axios';

export class MarketTriggerClient {
  constructor(private baseUrl: string, private timeout: number) {}

  async evaluate(options: unknown): Promise<unknown> {
    const res = await axios.post(`${this.baseUrl}/v1/trigger`, options, { timeout: this.timeout });
    return res.data;
  }
}
