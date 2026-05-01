export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type MarketImpact = 'neutral' | 'mild_downside_pressure' | 'strong_downside_pressure' | 'cascading_risk' | 'mild_upside_pressure' | 'strong_upside_pressure';

export interface EnrichedEvent {
  protocol: string; chain: string; txHash: string; blockNumber: number; timestamp: number;
  borrower: string; collateralAsset: string; debtAsset: string;
  collateralAmountUSD: number; debtAmountUSD: number; liquidator: string;
  healthFactorBefore: number | null; source: string;
  liquidation_type: 'long' | 'short' | 'unknown';
  severity: Severity; cluster_detected: boolean; cluster_size: number;
  market_impact: MarketImpact; confidence: number; risk_notes: string[];
}

export function classifyLiquidationType(collateralAsset: string, debtAsset: string): 'long' | 'short' | 'unknown' {
  const stables = ['USDC','USDT','DAI','FRAX','LUSD','BUSD','TUSD','USDD','GUSD'];
  const collIsStable = stables.includes(collateralAsset.toUpperCase());
  const debtIsStable = stables.includes(debtAsset.toUpperCase());
  if (!collIsStable && debtIsStable) return 'long';
  if (collIsStable && !debtIsStable) return 'short';
  return 'unknown';
}

export function scoreSeverity(usd: number): Severity {
  if (usd >= 500000) return 'critical';
  if (usd >= 100000) return 'high';
  if (usd >= 20000) return 'medium';
  return 'low';
}

export function detectClusters(events: Array<{ collateralAsset: string; timestamp: number; blockNumber: number; txHash?: string }>): Map<string, number> {
  const WINDOW = 60;
  const clusterMap = new Map<string, number>();
  for (const ev of events) {
    const key = ev.collateralAsset.toUpperCase();
    const peers = events.filter(e => e.collateralAsset.toUpperCase() === key && Math.abs(e.timestamp - ev.timestamp) <= WINDOW);
    clusterMap.set(`${ev.collateralAsset}:${ev.txHash || ev.blockNumber}`, peers.length);
  }
  return clusterMap;
}

export function scoreMarketImpact(liquidationType: 'long' | 'short' | 'unknown', severity: Severity, clusterSize: number): MarketImpact {
  const score = (severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1) + Math.min(clusterSize - 1, 3);
  if (liquidationType === 'long') {
    if (score >= 6) return 'cascading_risk';
    if (score >= 4) return 'strong_downside_pressure';
    if (score >= 2) return 'mild_downside_pressure';
    return 'neutral';
  }
  if (liquidationType === 'short') {
    if (score >= 6) return 'cascading_risk';
    if (score >= 4) return 'strong_upside_pressure';
    if (score >= 2) return 'mild_upside_pressure';
    return 'neutral';
  }
  return 'neutral';
}

export function scoreConfidence(source: string, liquidationType: 'long' | 'short' | 'unknown', clusterSize: number, healthFactor: number | null): number {
  let s = 0.5;
  if (source === 'defillama') s += 0.2;
  if (liquidationType !== 'unknown') s += 0.1;
  if (clusterSize > 1) s += Math.min((clusterSize - 1) * 0.04, 0.12);
  if (healthFactor !== null) s += 0.08;
  return parseFloat(Math.min(s, 0.97).toFixed(2));
}

export function buildRiskNotes(severity: Severity, liquidationType: 'long' | 'short' | 'unknown', clusterDetected: boolean, clusterSize: number, marketImpact: MarketImpact, collateralAsset: string): string[] {
  const notes: string[] = [];
  if (severity === 'critical') notes.push(`Critical-size liquidation (>$500K) on ${collateralAsset}`);
  if (severity === 'high') notes.push(`Large liquidation (>$100K) may move ${collateralAsset} price`);
  if (clusterDetected && clusterSize >= 5) notes.push(`Liquidation cascade detected: ${clusterSize} events on ${collateralAsset} within 60s`);
  else if (clusterDetected) notes.push(`Cluster of ${clusterSize} liquidations on ${collateralAsset} within 60s window`);
  if (marketImpact === 'cascading_risk') notes.push('Cascading liquidation risk — forced selling may trigger further liquidations');
  if (marketImpact === 'strong_downside_pressure') notes.push('Strong downside pressure expected as collateral is sold');
  if (marketImpact === 'strong_upside_pressure') notes.push('Short squeeze risk — debt asset buying pressure elevated');
  if (liquidationType === 'long') notes.push('Long position liquidated — collateral being sold into market');
  if (liquidationType === 'short') notes.push('Short position liquidated — debt asset being bought to cover');
  return notes;
}

export function enrichEvents(rawEvents: any[]): EnrichedEvent[] {
  const clusterMap = detectClusters(rawEvents);
  return rawEvents.map(ev => {
    const liquidation_type = classifyLiquidationType(ev.collateralAsset, ev.debtAsset);
    const severity = scoreSeverity(ev.collateralAmountUSD);
    const eventKey = `${ev.collateralAsset}:${ev.txHash || ev.blockNumber}`;
    const clusterSize = clusterMap.get(eventKey) ?? 1;
    const cluster_detected = clusterSize > 1;
    const market_impact = scoreMarketImpact(liquidation_type, severity, clusterSize);
    const confidence = scoreConfidence(ev.source, liquidation_type, clusterSize, ev.healthFactorBefore);
    const risk_notes = buildRiskNotes(severity, liquidation_type, cluster_detected, clusterSize, market_impact, ev.collateralAsset);
    return { ...ev, liquidation_type, severity, cluster_detected, cluster_size: clusterSize, market_impact, confidence, risk_notes };
  });
}

export function buildIntelligenceSummary(events: EnrichedEvent[]) {
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  const impactCounts: Record<string, number> = {};
  const assetMap: Record<string, number> = {};
  for (const ev of events) {
    severityCounts[ev.severity]++;
    impactCounts[ev.market_impact] = (impactCounts[ev.market_impact] || 0) + 1;
    assetMap[ev.collateralAsset] = (assetMap[ev.collateralAsset] || 0) + ev.collateralAmountUSD;
  }
  const dominantImpact = Object.entries(impactCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  const topAsset = Object.entries(assetMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const clusteredCount = events.filter(e => e.cluster_detected).length;
  const avgConfidence = events.length ? parseFloat((events.reduce((s, e) => s + e.confidence, 0) / events.length).toFixed(2)) : 0;
  return {
    severity_breakdown: severityCounts,
    dominant_market_impact: dominantImpact,
    top_liquidated_asset: topAsset,
    clustered_events: clusteredCount,
    avg_confidence: avgConfidence,
    alert_level: severityCounts.critical > 0 ? 'critical' : severityCounts.high > 3 ? 'high' : severityCounts.high > 0 ? 'elevated' : 'normal',
  };
}
