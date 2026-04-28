import axios from 'axios';
import {
  ExecuteStrategyOptions,
  StrategyResult,
  BacktestResult,
  StrategyDefinition,
} from '../types';

export class StrategyExecutionClient {
  constructor(private baseUrl: string, private timeout: number) {}

  async execute(options: ExecuteStrategyOptions): Promise<StrategyResult> {
    const res = await axios.post(`${this.baseUrl}/v1/strategy/execute`, options, { timeout: this.timeout });
    return res.data as StrategyResult;
  }

  async backtest(options: ExecuteStrategyOptions): Promise<BacktestResult> {
    const res = await axios.post(`${this.baseUrl}/v1/strategy/backtest`, options, { timeout: this.timeout });
    return res.data as BacktestResult;
  }

  async list(): Promise<{ strategies: StrategyDefinition[]; count: number }> {
    const res = await axios.get(`${this.baseUrl}/v1/strategy/list`, { timeout: this.timeout });
    return res.data;
  }
}
