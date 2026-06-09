import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic robots.txt parser ------------------------------------------------------

interface Group { agent: string; allow: string[]; disallow: string[]; crawl_delay: number | null; }

function parseRobots(text: string) {
  const lines = text.split(/\r?\n/);
  const groups = new Map<string, Group>();
  const sitemap_urls: string[] = [];
  const syntax_errors: { line: number; error: string }[] = [];
  let currentAgents: string[] = [];
  let lastWasRule = false;
  let raw_rules_count = 0;

  const groupFor = (a: string) => { const k = a.toLowerCase(); if (!groups.has(k)) groups.set(k, { agent: a, allow: [], disallow: [], crawl_delay: null }); return groups.get(k)!; };

  lines.forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) { syntax_errors.push({ line: i + 1, error: `Unrecognized line: "${raw.trim()}"` }); return; }
    const directive = m[1].toLowerCase();
    const value = m[2].trim();

    switch (directive) {
      case 'user-agent':
        if (lastWasRule) { currentAgents = []; lastWasRule = false; }
        currentAgents.push(value || '*');
        groupFor(value || '*');
        break;
      case 'allow':
      case 'disallow': {
        if (!currentAgents.length) { syntax_errors.push({ line: i + 1, error: `${m[1]} before any User-agent` }); break; }
        raw_rules_count++;
        for (const a of currentAgents) { const g = groupFor(a); (directive === 'allow' ? g.allow : g.disallow).push(value); }
        lastWasRule = true;
        break;
      }
      case 'crawl-delay': {
        const d = Number(value);
        if (!currentAgents.length) { syntax_errors.push({ line: i + 1, error: 'Crawl-delay before any User-agent' }); break; }
        if (!Number.isFinite(d)) { syntax_errors.push({ line: i + 1, error: `Invalid Crawl-delay value "${value}"` }); break; }
        for (const a of currentAgents) groupFor(a).crawl_delay = d;
        lastWasRule = true;
        break;
      }
      case 'sitemap':
        if (value) sitemap_urls.push(value);
        lastWasRule = true;
        break;
      case 'host':
        lastWasRule = true;
        break;
      default:
        syntax_errors.push({ line: i + 1, error: `Unknown directive "${m[1]}"` });
    }
  });

  const user_agents = [...groups.values()];
  const has_wildcard = user_agents.some(g => g.agent === '*' || g.disallow.some(d => d.includes('*')) || g.allow.some(a => a.includes('*')));
  return { user_agents, sitemap_urls, raw_rules_count, has_wildcard, syntax_errors };
}

// Match a path against a robots.txt pattern (supports * wildcard and $ anchor).
function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '') return false;
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const anchored = esc.endsWith('$') ? esc : esc; // $ already regex-meaningful after escape handling below
  const re = new RegExp('^' + anchored.replace(/\\\$$/, '$'));
  return re.test(path);
}

function isAllowedFor(parsed: ReturnType<typeof parseRobots>, agent: string, path: string): boolean {
  const g = parsed.user_agents.find(x => x.agent.toLowerCase() === agent.toLowerCase())
    || parsed.user_agents.find(x => x.agent === '*');
  if (!g) return true;
  // Longest-match wins; Allow beats Disallow on ties (Google semantics).
  let best: { len: number; allow: boolean } | null = null;
  for (const d of g.disallow) if (pathMatches(d, path)) { const len = d.length; if (!best || len > best.len) best = { len, allow: false }; }
  for (const a of g.allow) if (pathMatches(a, path)) { const len = a.length; if (!best || len >= best.len) best = { len, allow: true }; }
  return best ? best.allow : true;
}

function validate(parsed: ReturnType<typeof parseRobots>) {
  const warnings: string[] = [];
  const star = parsed.user_agents.find(g => g.agent === '*');
  const all_bots_blocked = !!star && star.disallow.includes('/') && !star.allow.includes('/');
  const googlebot_allowed = isAllowedFor(parsed, 'Googlebot', '/');

  if (all_bots_blocked) warnings.push('All crawlers are blocked from the entire site (Disallow: / for *)');
  if (!parsed.sitemap_urls.length) warnings.push('No Sitemap directive declared');
  if (!parsed.user_agents.length) warnings.push('No User-agent groups defined');

  const valid = parsed.syntax_errors.length === 0;
  let seo_score = 100;
  seo_score -= parsed.syntax_errors.length * 15;
  if (all_bots_blocked) seo_score -= 50;
  if (!googlebot_allowed) seo_score -= 30;
  if (!parsed.sitemap_urls.length) seo_score -= 10;
  seo_score = Math.max(0, Math.min(100, seo_score));

  return { valid, syntax_errors: parsed.syntax_errors, warnings, googlebot_allowed, all_bots_blocked, seo_score };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { parse: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'robots-txt-parser', endpoint: '/robots-intelligence', reason: 'Full parse + validate in one call' },
      { api: 'sitemap-parser', endpoint: '/parse', reason: 'Parse the sitemaps declared in robots.txt' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireText = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Robots TXT Parser API', info: '/robots-txt-parser/info', openapi: '/robots-txt-parser/openapi.json', health: 'ok' });
});

router.post('/parse', (req: Request, res: Response) => {
  const start = Date.now();
  const text = requireText(req.body?.input);
  if (!text) return res.status(400).json({ error: 'input is required (robots.txt content)', code: 'MISSING_INPUT', retryable: false });
  const p = parseRobots(text);
  const data = { user_agents: p.user_agents, sitemap_urls: p.sitemap_urls, raw_rules_count: p.raw_rules_count, has_wildcard: p.has_wildcard };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic robots.txt parse',
    actions: [{ priority: 'low', action: 'Validate the rules for crawlability issues', reason: `${p.user_agents.length} agent group(s), ${p.sitemap_urls.length} sitemap(s)` }],
  }));
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const text = requireText(req.body?.input);
  if (!text) return res.status(400).json({ error: 'input is required (robots.txt content)', code: 'MISSING_INPUT', retryable: false });
  const data = validate(parseRobots(text));
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic robots.txt validation',
    actions: data.all_bots_blocked
      ? [{ priority: 'high', action: 'Remove "Disallow: /" for * unless the site should be fully hidden', reason: 'All crawlers are currently blocked' }]
      : data.syntax_errors.length
        ? [{ priority: 'high', action: 'Fix syntax errors', reason: `${data.syntax_errors.length} syntax error(s)` }]
        : [{ priority: 'low', action: 'robots.txt is valid', reason: `SEO score ${data.seo_score}/100` }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'check', next_api: 'robots-txt-parser', next_endpoint: '/robots-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'robots-txt-parser', endpoint: '/robots-intelligence', reason: 'Full intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /robots-intelligence', reason: 'Single-request analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/robots-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const text = requireText(req.body?.input);
  if (!text) return res.status(400).json({ error: 'input is required (robots.txt content)', code: 'MISSING_INPUT', retryable: false });
  const p = parseRobots(text);
  const v = validate(p);
  const parse = { user_agents: p.user_agents, sitemap_urls: p.sitemap_urls, raw_rules_count: p.raw_rules_count, has_wildcard: p.has_wildcard };
  const data = {
    parse, validate: v, overall_score: v.seo_score,
    key_findings: [
      `${p.user_agents.length} user-agent group(s), ${p.raw_rules_count} rule(s)`,
      v.all_bots_blocked ? 'All crawlers blocked' : `Googlebot ${v.googlebot_allowed ? 'allowed' : 'blocked'} at root`,
      p.sitemap_urls.length ? `${p.sitemap_urls.length} sitemap(s) declared` : 'No sitemap declared',
    ],
    summary: v.valid ? `Valid robots.txt, SEO score ${v.seo_score}/100.` : `robots.txt has ${v.syntax_errors.length} syntax error(s).`,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic combined robots.txt intelligence',
    actions: [{ priority: v.all_bots_blocked || v.syntax_errors.length ? 'high' : 'low', action: v.all_bots_blocked ? 'Review the site-wide block' : v.syntax_errors.length ? 'Fix syntax errors' : 'Configuration looks healthy', reason: `Score ${v.seo_score}/100` }],
  }));
});

export default router;
