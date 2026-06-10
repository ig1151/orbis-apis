import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// uuid v4 generator (reused from the original file's pattern)
const rid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// Bounded, timed HTTP GET against Apple's free iTunes API.
// 15s timeout + 2 retries on 429/5xx/timeout with ~500ms backoff so transient
// upstream failures surface as a caught error (→ 200 success:false) instead of a hang/500.
async function httpGet(url: string): Promise<any> {
  const MAX_RETRIES = 2;
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'orbis-app-store-lookup/1.0' },
        // iTunes RSS sometimes returns text/javascript; accept and parse defensively
        responseType: 'json',
        transformResponse: [(d) => {
          if (typeof d !== 'string') return d;
          try { return JSON.parse(d); } catch { return d; }
        }],
      });
      return res.data;
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable = !status || status === 429 || status >= 500 || e?.code === 'ECONNABORTED';
      if (attempt < MAX_RETRIES && retryable) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

const ITUNES = 'https://itunes.apple.com';
const isAllDigits = (s: string) => /^\d+$/.test(s.trim());

// Resolve a free-text name or numeric id to a single iTunes software result.
// Returns null when nothing matches (caller emits not_found).
async function resolveApp(input: string): Promise<any | null> {
  const term = String(input).trim();
  let results: any[] = [];
  if (isAllDigits(term)) {
    const d = await httpGet(`${ITUNES}/lookup?id=${encodeURIComponent(term)}&country=us`);
    results = Array.isArray(d?.results) ? d.results : [];
  } else {
    const d = await httpGet(
      `${ITUNES}/search?term=${encodeURIComponent(term)}&entity=software&limit=1&country=us`
    );
    results = Array.isArray(d?.results) ? d.results : [];
  }
  return results.length ? results[0] : null;
}

// Map a raw iTunes result into our data shape. Any field iTunes can't supply
// becomes null and is recorded in data_notes — never fabricated.
function mapApp(r: any): { app: Record<string, any>; notes: string[] } {
  const notes: string[] = [];
  const orNull = (v: any, label: string) => {
    if (v === undefined || v === null || v === '') { notes.push(`${label} not provided by iTunes for this app`); return null; }
    return v;
  };
  const fileSize = r.fileSizeBytes != null ? Number(r.fileSizeBytes) : null;
  const app = {
    track_id: orNull(r.trackId, 'track_id'),
    name: orNull(r.trackName, 'name'),
    seller_name: orNull(r.sellerName ?? r.artistName, 'seller_name'),
    primary_genre: orNull(r.primaryGenreName, 'primary_genre'),
    genres: Array.isArray(r.genres) ? r.genres : (orNull(undefined, 'genres'), []),
    average_user_rating: r.averageUserRating != null ? Number(r.averageUserRating) : (notes.push('average_user_rating not provided by iTunes for this app'), null),
    user_rating_count: r.userRatingCount != null ? Number(r.userRatingCount) : (notes.push('user_rating_count not provided by iTunes for this app'), null),
    formatted_price: orNull(r.formattedPrice, 'formatted_price'),
    price: r.price != null ? Number(r.price) : (notes.push('price not provided by iTunes for this app'), null),
    version: orNull(r.version, 'version'),
    release_date: orNull(r.releaseDate, 'release_date'),
    current_version_release_date: orNull(r.currentVersionReleaseDate, 'current_version_release_date'),
    description: orNull(r.description, 'description'),
    track_view_url: orNull(r.trackViewUrl, 'track_view_url'),
    artwork_url_512: orNull(r.artworkUrl512, 'artwork_url_512'),
    content_advisory_rating: orNull(r.contentAdvisoryRating, 'content_advisory_rating'),
    file_size_bytes: isNaN(fileSize as number) ? null : fileSize,
    minimum_os_version: orNull(r.minimumOsVersion, 'minimum_os_version'),
    bundle_id: orNull(r.bundleId, 'bundle_id'),
    screenshot_urls: Array.isArray(r.screenshotUrls) ? r.screenshotUrls : [],
  };
  return { app, notes };
}

// Deterministic 0-100 score from real rating + rating count.
// Rating contributes up to 80 (rating/5 * 80), volume confidence up to 20
// (log-scaled to 10k reviews). Returns null when rating data is absent.
function overallScore(rating: number | null, count: number | null): number | null {
  if (rating == null || count == null) return null;
  const ratingPart = Math.max(0, Math.min(5, rating)) / 5 * 80;
  const volumePart = Math.min(1, Math.log10(Math.max(1, count)) / 4) * 20;
  return Math.round(ratingPart + volumePart);
}

interface ReviewsResult { reviews: any[]; notes: string[]; }

// Fetch the customer-reviews RSS-as-JSON feed for a numeric app id.
// First feed.entry can be app metadata OR a review depending on the app, so we
// classify by presence of im:rating rather than blindly dropping entry[0].
async function fetchReviews(appId: number | string): Promise<ReviewsResult> {
  const notes: string[] = [];
  const url = `${ITUNES}/us/rss/customerreviews/id=${encodeURIComponent(String(appId))}/sortBy=mostRecent/json`;
  const feed = await httpGet(url);
  const rawEntry = feed?.feed?.entry;
  let entries: any[] = [];
  if (Array.isArray(rawEntry)) entries = rawEntry;
  else if (rawEntry) entries = [rawEntry];

  const reviews = entries
    .filter(e => e && e['im:rating'] && e.author?.name)
    .map(e => ({
      author: e.author?.name?.label ?? null,
      title: e.title?.label ?? null,
      rating: e['im:rating']?.label != null ? Number(e['im:rating'].label) : null,
      version: e['im:version']?.label ?? null,
      content: e.content?.label ?? null,
    }));

  if (reviews.length === 0) notes.push('No customer reviews returned by the iTunes reviews feed for this app');
  return { reviews, notes };
}

// Top apps in the same category (NOT Apple's official "you may also like").
async function similarApps(seed: any, limit = 8): Promise<{ apps: any[]; notes: string[] }> {
  const notes: string[] = [];
  const genre = seed?.primaryGenreName;
  if (!genre) { notes.push('similar apps unavailable: source app has no primary_genre'); return { apps: [], notes }; }
  const d = await httpGet(
    `${ITUNES}/search?term=${encodeURIComponent(genre)}&entity=software&limit=${limit + 4}&country=us`
  );
  const results: any[] = Array.isArray(d?.results) ? d.results : [];
  const apps = results
    .filter(r => r.trackId !== seed.trackId)
    .slice(0, limit)
    .map(r => ({
      track_id: r.trackId ?? null,
      name: r.trackName ?? null,
      seller_name: r.sellerName ?? r.artistName ?? null,
      primary_genre: r.primaryGenreName ?? null,
      average_user_rating: r.averageUserRating != null ? Number(r.averageUserRating) : null,
      user_rating_count: r.userRatingCount != null ? Number(r.userRatingCount) : null,
      formatted_price: r.formattedPrice ?? null,
      track_view_url: r.trackViewUrl ?? null,
      artwork_url_512: r.artworkUrl512 ?? null,
    }));
  return { apps, notes };
}

// Shared response envelope. provider/source_type/model fixed to the real source.
function envelope(opts: {
  data: Record<string, any>;
  confScore: number;
  confReason: string;
  perSection: Record<string, number>;
  ttl: number;
  startedAt: number;
  nextApi?: any[];
  actions?: any[];
}) {
  return {
    success: true,
    request_id: rid(),
    data: opts.data,
    confidence: { score: opts.confScore, reason: opts.confReason, per_section: opts.perSection },
    provenance: { provider: 'apple-itunes', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: true, cache_recommended: true },
    recommended_next_api: opts.nextApi ?? [
      { api: 'app-store-lookup', endpoint: '/app-intelligence', reason: 'One-call endpoint for full App Store intelligence' },
    ],
    recommended_actions_priority_order: opts.actions ?? [
      { priority: 'medium', action: 'Call /app-intelligence for combined lookup, reviews and similar apps', reason: 'Single request delivers all sections' },
    ],
    execution_metadata: { latency_ms: Date.now() - opts.startedAt, model: 'live-data', automation_safe: true },
  };
}

function notFound(startedAt: number) {
  return {
    success: false,
    error: 'not_found',
    request_id: rid(),
    data: {},
    confidence: { score: 0, reason: 'No matching app found on the iTunes App Store', per_section: {} },
    provenance: { provider: 'apple-itunes', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: 60, retryable: false, cache_recommended: false },
    recommended_next_api: [],
    recommended_actions_priority_order: [
      { priority: 'high', action: 'Refine the input — provide an exact app name or numeric App Store id', reason: 'iTunes search returned no results' },
    ],
    execution_metadata: { latency_ms: Date.now() - startedAt, model: 'live-data', automation_safe: true },
  };
}

const upstream = (e: any) => ({
  success: false,
  error: 'upstream_unavailable',
  detail: e?.message || String(e),
  retryable: true,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'App Store Lookup API', info: '/app-store-lookup/info', openapi: '/app-store-lookup/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const result = await resolveApp(input);
    if (!result) return res.status(200).json(notFound(startedAt));
    const { app, notes } = mapApp(result);
    res.status(200).json(envelope({
      data: { ...app, data_notes: notes },
      confScore: 0.97,
      confReason: 'Direct metadata from the Apple iTunes lookup/search API',
      perSection: { lookup: 0.97 },
      ttl: 21600,
      startedAt,
    }));
  } catch (e: any) {
    res.status(200).json(upstream(e));
  }
});

router.post('/reviews', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const result = await resolveApp(input);
    if (!result || result.trackId == null) return res.status(200).json(notFound(startedAt));
    const { reviews, notes } = await fetchReviews(result.trackId);
    const avg = result.averageUserRating != null ? Number(result.averageUserRating) : null;
    const count = result.userRatingCount != null ? Number(result.userRatingCount) : null;
    if (avg == null) notes.push('average_user_rating not provided by iTunes for this app');
    if (count == null) notes.push('user_rating_count not provided by iTunes for this app');
    res.status(200).json(envelope({
      data: {
        track_id: result.trackId,
        name: result.trackName ?? null,
        average_user_rating: avg,
        user_rating_count: count,
        recent_reviews: reviews,
        recent_reviews_count: reviews.length,
        data_notes: notes,
      },
      confScore: reviews.length ? 0.9 : 0.6,
      confReason: 'Aggregate rating from iTunes search/lookup; recent reviews from the iTunes customer-reviews RSS feed (most recent, not the full corpus)',
      perSection: { rating: avg != null ? 0.95 : 0, recent_reviews: reviews.length ? 0.85 : 0 },
      ttl: 3600,
      startedAt,
    }));
  } catch (e: any) {
    res.status(200).json(upstream(e));
  }
});

router.post('/similar', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const result = await resolveApp(input);
    if (!result) return res.status(200).json(notFound(startedAt));
    const { apps, notes } = await similarApps(result);
    res.status(200).json(envelope({
      data: {
        source_track_id: result.trackId ?? null,
        source_name: result.trackName ?? null,
        category: result.primaryGenreName ?? null,
        method: 'top apps in same App Store category (iTunes search by genre); not Apple\'s official "you may also like" recommendations',
        similar_apps: apps,
        similar_apps_count: apps.length,
        data_notes: notes,
      },
      confScore: apps.length ? 0.8 : 0.5,
      confReason: 'Top-ranked apps in the same iTunes category as the source app',
      perSection: { similar: apps.length ? 0.8 : 0 },
      ttl: 21600,
      startedAt,
    }));
  } catch (e: any) {
    res.status(200).json(upstream(e));
  }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true,
    request_id: rid(),
    execution_ready: true,
    input,
    objective: objective || 'lookup',
    next_api: 'app-store-lookup',
    next_endpoint: '/app-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'apple-itunes', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: 0, retryable: false, cache_recommended: false },
    recommended_next_api: [
      { api: 'app-store-lookup', endpoint: '/app-intelligence', reason: 'One-call endpoint for full App Store Lookup API intelligence' },
      { api: 'chrome-extension-lookup', endpoint: '/chrome-extension-lookup', reason: 'Next step in the pipeline' },
    ],
    recommended_actions_priority_order: [
      { priority: 'high', action: 'Call /app-intelligence for full intelligence', reason: 'One-call delivers all outputs in a single request' },
    ],
    execution_metadata: { latency_ms: Date.now() - startedAt, model: 'live-data', automation_safe: true },
  });
});

router.post('/app-intelligence', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const result = await resolveApp(input);
    if (!result) return res.status(200).json(notFound(startedAt));
    const { app, notes } = mapApp(result);

    // Reviews + similar fetched defensively — a failure of either degrades that
    // section rather than failing the whole intelligence call.
    let reviews: any[] = [];
    let similar: any[] = [];
    if (result.trackId != null) {
      try {
        const r = await fetchReviews(result.trackId);
        reviews = r.reviews;
        notes.push(...r.notes);
      } catch { notes.push('reviews section unavailable: iTunes reviews feed request failed'); }
    }
    try {
      const s = await similarApps(result);
      similar = s.apps;
      notes.push(...s.notes);
    } catch { notes.push('similar section unavailable: iTunes category search failed'); }

    const score = overallScore(app.average_user_rating, app.user_rating_count);
    if (score == null) notes.push('overall_score is null: requires both average_user_rating and user_rating_count');

    const key_findings: string[] = [];
    if (app.name) key_findings.push(`${app.name} by ${app.seller_name ?? 'unknown seller'} in category ${app.primary_genre ?? 'unknown'}`);
    if (app.average_user_rating != null && app.user_rating_count != null)
      key_findings.push(`Rated ${app.average_user_rating.toFixed(2)} from ${app.user_rating_count} ratings`);
    if (app.formatted_price) key_findings.push(`Price: ${app.formatted_price}`);
    if (app.current_version_release_date) key_findings.push(`Latest version ${app.version ?? ''} released ${app.current_version_release_date}`.trim());
    key_findings.push(`${reviews.length} recent review(s) and ${similar.length} same-category app(s) retrieved`);

    const summary = app.name
      ? `${app.name} (${app.primary_genre ?? 'category unknown'}) has a real iTunes rating of ${app.average_user_rating ?? 'n/a'} across ${app.user_rating_count ?? 'n/a'} ratings. Overall score ${score ?? 'n/a'}/100, derived deterministically from real rating data. ${reviews.length} recent reviews and ${similar.length} same-category apps were retrieved from Apple's iTunes API.`
      : 'App resolved but core metadata was unavailable from iTunes.';

    res.status(200).json(envelope({
      data: {
        ...app,
        overall_score: score,
        recent_reviews: reviews,
        recent_reviews_count: reviews.length,
        similar_apps: similar,
        similar_apps_count: similar.length,
        similar_apps_method: 'top apps in same App Store category (iTunes search by genre); not Apple\'s official recommendations',
        key_findings,
        summary,
        data_notes: notes,
      },
      confScore: 0.92,
      confReason: 'Combined lookup, recent reviews and same-category apps, all from the Apple iTunes API',
      perSection: {
        lookup: 0.97,
        reviews: reviews.length ? 0.85 : 0,
        similar: similar.length ? 0.8 : 0,
        overall_score: score != null ? 0.9 : 0,
      },
      ttl: 7200,
      startedAt,
      actions: [
        { priority: 'high', action: 'Review overall_score and key_findings for go/no-go', reason: 'Deterministic score derived from real rating data' },
        { priority: 'medium', action: 'Inspect recent_reviews for current sentiment signals', reason: 'Most-recent reviews from the iTunes RSS feed' },
      ],
    }));
  } catch (e: any) {
    res.status(200).json(upstream(e));
  }
});

export default router;
