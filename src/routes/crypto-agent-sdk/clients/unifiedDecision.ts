import axios from 'axios';

export class UnifiedDecisionClient {
  constructor(private baseUrl: string, private timeout: number) {}

  async decide(options: unknown): Promise<unknown> {
    const res = await axios.post(`${this.baseUrl}/v1/decide`, options, { timeout: this.timeout });
    return res.data;
  }
}
