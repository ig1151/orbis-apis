import axios from 'axios';

export class NewsImpactClient {
  constructor(private baseUrl: string, private timeout: number) {}

  async analyze(options: unknown): Promise<unknown> {
    const res = await axios.post(`${this.baseUrl}/v1/analyze`, options, { timeout: this.timeout });
    return res.data;
  }
}
