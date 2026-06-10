import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import type { EnrichRequest, EnrichResponse, CompanyData } from '../types/index';

// Deterministic, real on-page extraction. No LLM, no API key.
const MODEL = 'deterministic-onpage-v1';
const FETCH_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PAID_PROVIDER_NOTE =
  'Fields industry, sub_industry, employee_count/range, revenue_range, funding_stage, founded_year and headquarters require a paid B2B data provider and are not present on the public website; returned as null to avoid fabrication.';

interface FetchedPage {
  url: string;
  html: string;
}

/** Fetch a URL with bounded retry on 429/5xx/timeout. Returns null on failure. */
async function fetchPage(url: string): Promise<FetchedPage | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: FETCH_TIMEOUT_MS,
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        maxRedirects: 5,
        responseType: 'text',
        transformResponse: [(d) => d],
        validateStatus: (s) => s < 400,
      });
      return { url: response.request?.res?.responseUrl ?? url, html: String(response.data ?? '') };
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      const isTimeout = err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT';
      const retryable = isTimeout || status === 429 || (typeof status === 'number' && status >= 500);
      if (attempt < MAX_RETRIES && retryable) {
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

const GENERIC_TITLE_SEGMENTS = new Set([
  'home',
  'homepage',
  'welcome',
  'official site',
  'official website',
  'index',
]);

/** Title-case the bare label of a domain, e.g. "anthropic.com" -> "Anthropic". */
function companyNameFromDomain(domain: string): string | undefined {
  const host = domain.replace(/^www\./i, '');
  const label = host.split('.')[0];
  if (!label) return undefined;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Pick the most company-like segment from a raw <title>.
 * Splits on |, -, –, —, and backslash; drops generic segments like
 * "Home"/"Welcome"; prefers the LAST non-generic segment (titles are
 * usually "Page - Company"). Returns undefined if nothing usable remains.
 */
function companyNameFromTitle(title: string): string | undefined {
  const segments = title
    .split(/[|\-–—\\]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return undefined;
  const nonGeneric = segments.filter((s) => !GENERIC_TITLE_SEGMENTS.has(s.toLowerCase()));
  if (nonGeneric.length === 0) return undefined;
  return nonGeneric[nonGeneric.length - 1];
}

function absoluteUrl(maybe: string | undefined, base: string): string | undefined {
  if (!maybe) return undefined;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return undefined;
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

interface ExtractedSite {
  company_name?: string;
  description?: string;
  logo?: string;
  headline?: string;
  social: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
    youtube?: string;
    instagram?: string;
  };
  emails: string[];
  phone?: string;
  technologies: string[];
  keywords: string[];
}

/** Parse a single HTML document for real, on-page lead signals. */
function extractFromHtml(html: string, baseUrl: string): ExtractedSite {
  const $ = cheerio.load(html);

  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  const title = $('title').first().text().trim();
  let schemaOrgName: string | undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (schemaOrgName) return;
    try {
      const parsed = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] ?? [])];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const t = node['@type'];
        const types = Array.isArray(t) ? t : [t];
        if (types.includes('Organization') || types.includes('Corporation') || types.includes('LocalBusiness')) {
          if (typeof node.name === 'string') { schemaOrgName = node.name.trim(); break; }
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });
  // Name precedence: og:site_name -> schema.org Organization name -> cleaned <title>.
  // Fall back to a cleaned domain label only if everything else is generic/empty.
  let baseHost = '';
  try {
    baseHost = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    /* ignore */
  }
  const company_name =
    ogSiteName ||
    schemaOrgName ||
    (title ? companyNameFromTitle(title) : undefined) ||
    (baseHost ? companyNameFromDomain(baseHost) : undefined) ||
    undefined;

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    undefined;

  const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
  const favicon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href');
  const logo = absoluteUrl(ogImage, baseUrl) || absoluteUrl(favicon, baseUrl);

  const headline =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().replace(/\s+/g, ' ').trim() ||
    undefined;

  const keywords = ($('meta[name="keywords"]').attr('content') ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 12);

  // Social profiles from anchor hrefs.
  const social: ExtractedSite['social'] = {};
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const u = absoluteUrl(href, baseUrl);
    if (!u) return;
    const low = u.toLowerCase();
    if (!social.linkedin && /linkedin\.com\/(company|in|school)\//.test(low)) social.linkedin = u;
    else if (!social.twitter && /(twitter\.com|x\.com)\//.test(low) && !/\/intent\//.test(low)) social.twitter = u;
    else if (!social.facebook && /facebook\.com\//.test(low) && !/sharer/.test(low)) social.facebook = u;
    else if (!social.github && /github\.com\//.test(low)) social.github = u;
    else if (!social.youtube && /(youtube\.com|youtu\.be)\//.test(low)) social.youtube = u;
    else if (!social.instagram && /instagram\.com\//.test(low)) social.instagram = u;
  });

  // Emails: mailto links + conservative regex over HTML.
  const emailSet = new Set<string>();
  $('a[href^="mailto:"]').each((_, el) => {
    const raw = ($(el).attr('href') ?? '').replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
    if (raw && EMAIL_RE.test(raw)) emailSet.add(raw);
    EMAIL_RE.lastIndex = 0;
  });
  const bodyMatches = html.match(EMAIL_RE) ?? [];
  for (const m of bodyMatches) {
    const e = m.toLowerCase();
    // Drop obvious asset/noise matches (sentry, wixpress, example, image hashes).
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/.test(e)) continue;
    if (/(sentry|wixpress|example\.com|\.png|\.jpg)/.test(e)) continue;
    emailSet.add(e);
    if (emailSet.size >= 5) break;
  }
  const emails = Array.from(emailSet).slice(0, 5);

  // Phone: ONLY from an explicit tel: link. We never regex-scrape arbitrary
  // digit runs from the page body — a wrong number is worse than null.
  let phone: string | undefined;
  const telHref = $('a[href^="tel:"]').first().attr('href');
  if (telHref) {
    const normalized = telHref
      .replace(/^tel:/i, '')
      .replace(/[^\d+]/g, '') // keep digits and a leading +
      .replace(/(?!^)\+/g, ''); // strip any non-leading + signs
    if (normalized.replace(/\D/g, '').length >= 7) phone = normalized;
  }

  // Tech hints: only clearly-present markers.
  const technologies: string[] = [];
  const lowHtml = html.toLowerCase();
  const addTech = (name: string, present: boolean) => {
    if (present && !technologies.includes(name)) technologies.push(name);
  };
  addTech('Shopify', /cdn\.shopify\.com|shopify\.com\/s\/|x-shopify/.test(lowHtml));
  addTech('HubSpot', /js\.hs-scripts\.com|hs-analytics|hubspot/.test(lowHtml));
  addTech('Google Analytics', /google-analytics\.com\/(analytics|ga)\.js|gtag\(|googletagmanager\.com\/gtag/.test(lowHtml));
  addTech('Google Tag Manager', /googletagmanager\.com\/gtm\.js/.test(lowHtml));
  addTech('React', /data-reactroot|__next_data__|react(-dom)?(\.production)?\.min\.js/.test(lowHtml));
  addTech('Next.js', /\/_next\/static\/|__next_data__/.test(lowHtml));
  addTech('Vue.js', /data-v-[0-9a-f]{8}|vue(\.runtime)?(\.min)?\.js/.test(lowHtml));
  addTech('WordPress', /wp-content\/|wp-includes\/|wordpress/.test(lowHtml));
  addTech('Wix', /static\.parastorage\.com|wix\.com/.test(lowHtml));
  addTech('Webflow', /assets\.website-files\.com|webflow\.js|wf-/.test(lowHtml));
  addTech('Squarespace', /squarespace\.com|static1\.squarespace/.test(lowHtml));
  addTech('Cloudflare', /cdnjs\.cloudflare\.com|cf-ray/.test(lowHtml));
  addTech('Intercom', /widget\.intercom\.io|intercomcdn/.test(lowHtml));
  addTech('Segment', /cdn\.segment\.com\/analytics\.js/.test(lowHtml));
  addTech('Stripe', /js\.stripe\.com/.test(lowHtml));

  return { company_name, description, logo, headline, social, emails, phone, technologies, keywords };
}

function extractDomainFromEmail(email?: string): string | null {
  if (!email) return null;
  const parts = email.split('@');
  return parts.length === 2 && parts[1] ? parts[1].trim().toLowerCase() : null;
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

/**
 * Deterministically enrich a lead from the company's own public website.
 * No LLM, no external API key. Returns the same EnrichResponse shape as before;
 * fields requiring a paid B2B provider are returned as null with a data_note.
 */
export async function enrichLead(req: EnrichRequest): Promise<EnrichResponse> {
  const id = `req_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const t0 = Date.now();

  const rawDomain = req.domain ?? extractDomainFromEmail(req.email) ?? '';
  const domain = rawDomain ? normalizeDomain(rawDomain) : '';

  logger.info({ id, domain, company: req.company_name }, 'Starting deterministic lead enrichment');

  if (!domain) {
    // No site to inspect; degrade gracefully (route returns this verbatim via 200).
    throw new Error('No domain available: provide `domain` or an `email` to enrich from a website');
  }

  // Fetch homepage; opportunistically try /about and merge missing fields.
  const home = await fetchPage(`https://${domain}`);
  if (!home) {
    throw new Error(`Unable to fetch website for ${domain}`);
  }

  const merged = extractFromHtml(home.html, home.url);

  if (!merged.description || merged.emails.length === 0 || !merged.phone) {
    const about = await fetchPage(`https://${domain}/about`);
    if (about) {
      const a = extractFromHtml(about.html, about.url);
      merged.company_name = merged.company_name ?? a.company_name;
      merged.description = merged.description ?? a.description;
      merged.logo = merged.logo ?? a.logo;
      merged.headline = merged.headline ?? a.headline;
      merged.phone = merged.phone ?? a.phone;
      for (const k of Object.keys(a.social) as (keyof ExtractedSite['social'])[]) {
        if (!merged.social[k] && a.social[k]) merged.social[k] = a.social[k];
      }
      const emailSet = new Set([...merged.emails, ...a.emails]);
      merged.emails = Array.from(emailSet).slice(0, 5);
      for (const t of a.technologies) if (!merged.technologies.includes(t)) merged.technologies.push(t);
      if (merged.keywords.length === 0) merged.keywords = a.keywords;
    }
  }

  // Derive an email pattern only if a real email on the same domain was found.
  const sameDomainEmail = merged.emails.find((e) => e.endsWith(`@${domain}`));
  const email_pattern = sameDomainEmail ? `{local}@${domain}` : undefined;

  const company: CompanyData = {
    name: merged.company_name ?? req.company_name,
    domain,
    description: merged.description,
    // Paid-provider fields — not fabricated.
    industry: undefined,
    sub_industry: undefined,
    employee_count: undefined,
    employee_range: undefined,
    founded_year: undefined,
    headquarters: undefined,
    company_type: undefined,
    revenue_range: undefined,
    funding_stage: undefined,
    funding_total: undefined,
    linkedin_url: merged.social.linkedin ?? req.linkedin_url,
    twitter_url: merged.social.twitter,
    facebook_url: merged.social.facebook,
    phone: merged.phone,
    email_pattern,
    technologies: req.include_tech_stack === false ? undefined : (merged.technologies.length ? merged.technologies : undefined),
    keywords: merged.keywords.length ? merged.keywords : undefined,
  };

  logger.info({ id, latency: Date.now() - t0 }, 'Deterministic enrichment complete');

  return {
    id,
    status: 'success',
    model: MODEL,
    domain,
    company,
    website: home.url,
    logo: merged.logo,
    headline: merged.headline,
    emails: merged.emails.length ? merged.emails : undefined,
    social_profiles: Object.values(merged.social).some(Boolean) ? merged.social : undefined,
    data_notes: [PAID_PROVIDER_NOTE],
    latency_ms: Date.now() - t0,
    usage: { input_tokens: 0, output_tokens: 0 },
    created_at: new Date().toISOString(),
  };
}
