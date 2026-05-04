import { ProductData } from '../scraper/types';

export function scoreListingQuality(p: ProductData): number {
  let score = 0;
  if (p.title)             score += 20;
  if (p.price)             score += 20;
  if (p.currency)          score += 10;
  if (p.availability)      score += 15;
  if (p.images.length > 0) score += 15;
  if (p.brand)             score += 10;
  if (p.description)       score += 5;
  if (p.sku)               score += 5;
  return score;
}

export function deriveUrgency(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function productId(url: string): string {
  try {
    const u = new URL(url);
    return Buffer.from(u.hostname + u.pathname).toString('base64').slice(0, 16);
  } catch { return Buffer.from(url).toString('base64').slice(0, 16); }
}

export function agentBrief(p: ProductData, url: string): string {
  return (p.title || 'Unknown') + ' | ' +
    (p.price ? (p.currency || '') + ' ' + p.price : 'no price') + ' | ' +
    (p.availability ?? 'unknown availability') + ' | source: ' + p.source;
}
