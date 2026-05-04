import axios from 'axios';
import { ProductData } from './types';

export async function scrapeShopify(url: string): Promise<ProductData | null> {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const handle = parts[parts.indexOf('products') + 1]?.split('?')[0];
    if (!handle) return null;

    const apiUrl = u.origin + '/products/' + handle + '.json';
    const { data } = await axios.get(apiUrl, {
      timeout: 8000,
      headers: { 'User-Agent': 'OrbisProductBot/2.0' },
    });

    const p = data?.product;
    if (!p) return null;

    const variant = p.variants?.[0] ?? {};
    return {
      title:        p.title || null,
      price:        variant.price ? parseFloat(variant.price) : null,
      currency:     'USD',
      availability: variant.available ? 'in_stock' : 'out_of_stock',
      images:       (p.images || []).map((i: any) => i.src).filter(Boolean),
      brand:        p.vendor || null,
      sku:          variant.sku || null,
      description:  p.body_html?.replace(/<[^>]+>/g, ' ').trim() || null,
      rating:       null,
      review_count: null,
      source:       'shopify_api',
    };
  } catch {
    return null;
  }
}
