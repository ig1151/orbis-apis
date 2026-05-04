import axios from 'axios';
import * as cheerio from 'cheerio';
import { ProductData } from './types';

function parseMaybeJson(text: string | null): any {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

function flattenLd(entry: any): any[] {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry.flatMap(flattenLd);
  if (entry['@graph']) return flattenLd(entry['@graph']);
  return [entry];
}

function fromLd(product: any): ProductData {
  const offers = Array.isArray(product.offers) ? product.offers[0] : (product.offers || {});
  const availability = offers.availability
    ? (String(offers.availability).includes('InStock') ? 'in_stock' : 'out_of_stock')
    : null;
  let brand: string | null = null;
  if (typeof product.brand === 'string') brand = product.brand;
  if (product.brand && typeof product.brand === 'object') brand = product.brand.name || null;
  return {
    title:        product.name || null,
    price:        offers.price ? parseFloat(offers.price) : null,
    currency:     offers.priceCurrency || null,
    availability,
    images:       [product.image].flat().filter(Boolean),
    brand,
    sku:          product.sku || null,
    description:  product.description || null,
    rating:       product.aggregateRating?.ratingValue ? parseFloat(product.aggregateRating.ratingValue) : null,
    review_count: product.aggregateRating?.reviewCount ? parseInt(product.aggregateRating.reviewCount) : null,
    source:       'ld_json',
  };
}

export async function scrapeGeneric(url: string): Promise<ProductData> {
  const { data: html } = await axios.get(url, {
    timeout: 12000,
    headers: { 'User-Agent': 'OrbisProductBot/2.0', 'Accept': 'text/html' },
  });

  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();
  const ldEntries = scripts
    .map(el => parseMaybeJson($(el).html()))
    .filter(Boolean)
    .flatMap(flattenLd);

  const product = ldEntries.find((d: any) => {
    const type = d?.['@type'];
    return Array.isArray(type) ? type.includes('Product') : type === 'Product';
  });

  if (product) return fromLd(product);

  const meta = (name: string, attr = 'property') =>
    $('meta[' + attr + '="' + name + '"]').attr('content') || null;

  const title = meta('og:title') || $('h1').first().text().trim() || null;
  const priceRaw = meta('product:price:amount') || meta('og:price:amount') || meta('twitter:data1', 'name');

  return {
    title,
    price:        priceRaw ? parseFloat(String(priceRaw).replace(/[^0-9.]/g, '')) || null : null,
    currency:     meta('product:price:currency'),
    availability: null,
    images:       [meta('og:image')].filter(Boolean) as string[],
    brand:        meta('og:site_name'),
    sku:          null,
    description:  meta('og:description'),
    rating:       null,
    review_count: null,
    source:       'generic_html',
  };
}
