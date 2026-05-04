import { isShopify } from './detect';
import { scrapeShopify } from './shopify';
import { scrapeGeneric } from './generic';
import { ProductData } from './types';

export { ProductData };

export async function scrape(url: string): Promise<ProductData> {
  const { hostname } = new URL(url);
  const shopify = await isShopify(hostname);

  if (shopify) {
    try {
      const data = await scrapeShopify(url);
      if (data?.title) return data;
    } catch (err: any) {
      console.warn('[scraper] Shopify failed, falling back:', err.message);
    }
  }

  const data = await scrapeGeneric(url);
  if (!data?.title) {
    const error: any = new Error('Could not extract product data');
    error.code = 'PARSE_FAILURE';
    throw error;
  }
  return data;
}

export function validUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol);
  } catch { return false; }
}
