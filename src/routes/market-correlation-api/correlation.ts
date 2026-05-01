export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;
  const xs = x.slice(-n);
  const ys = y.slice(-n);
  const rx = returns(xs);
  const ry = returns(ys);
  const len = Math.min(rx.length, ry.length);
  const rxs = rx.slice(-len);
  const rys = ry.slice(-len);
  const meanX = rxs.reduce((a, b) => a + b, 0) / len;
  const meanY = rys.reduce((a, b) => a + b, 0) / len;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < len; i++) {
    const dx = rxs[i] - meanX;
    const dy = rys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return 0;
  return Math.round((num / denom) * 1000) / 1000;
}

function returns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    r.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return r;
}

export function correlationLabel(score: number): string {
  const abs = Math.abs(score);
  const dir = score >= 0 ? 'positive' : 'negative';
  if (abs >= 0.7) return `strong ${dir}`;
  if (abs >= 0.4) return `moderate ${dir}`;
  if (abs >= 0.2) return `weak ${dir}`;
  return 'negligible';
}

export function interpretCorrelation(asset: string, macro: string, score: number): string {
  const abs = Math.abs(score);
  const dir = score >= 0 ? 'moves with' : 'moves inverse to';
  if (abs < 0.2) return `${asset} shows negligible correlation with ${macro}`;
  return `${asset} ${dir} ${macro} (${(abs * 100).toFixed(0)}% correlation strength)`;
}

export function detectRiskMode(spyCorr: number, dxyCorr: number): string {
  if (spyCorr > 0.5 && dxyCorr < -0.3) return 'risk-on';
  if (spyCorr < -0.3 && dxyCorr > 0.3) return 'risk-off';
  if (spyCorr > 0.4) return 'equity-driven';
  if (dxyCorr < -0.4) return 'dollar-driven';
  return 'decoupled';
}

export function detectMarketStructure(cryptoCorrelations: Record<string, number>): string {
  const avg = Object.values(cryptoCorrelations).reduce((a, b) => a + Math.abs(b), 0) / Object.values(cryptoCorrelations).length;
  if (avg >= 0.7) return 'highly correlated';
  if (avg >= 0.4) return 'moderately correlated';
  if (avg >= 0.2) return 'weakly correlated';
  return 'decoupled';
}

export function detectDivergence(scores: Record<string, number>, prevScores?: Record<string, number>): {
  detected: boolean;
  assets: string[];
  implication: string;
} {
  // Detect divergence when key correlations flip sign or change significantly
  const divergentAssets: string[] = [];

  if (Math.abs(scores.SPY) > 0.3 && Math.abs(scores.DXY) > 0.3) {
    if (Math.sign(scores.SPY) === Math.sign(scores.DXY)) {
      divergentAssets.push('SPY-DXY');
    }
  }

  // Flag if crypto is moving opposite to both equity and gold (unusual)
  if (scores.SPY < -0.3 && scores.GLD < -0.3) {
    divergentAssets.push('equity-gold');
  }

  const detected = divergentAssets.length > 0;
  const implication = detected
    ? `Unusual cross-asset divergence detected — potential volatility regime change`
    : scores.SPY < 0.2 && scores.DXY < 0.2
    ? 'Crypto trading on independent catalysts — macro correlations unreliable'
    : 'Normal cross-asset relationships intact';

  return { detected, assets: divergentAssets, implication };
}

export function calcConfidence(scores: Record<string, number>, dataPoints: number): number {
  // Higher confidence with more data points and stronger correlations
  const avgAbs = Object.values(scores).reduce((a, b) => a + Math.abs(b), 0) / Object.values(scores).length;
  const dataPenalty = Math.min(1, dataPoints / 30);
  return Math.round(Math.min(0.95, avgAbs * dataPenalty + 0.3) * 100) / 100;
}
