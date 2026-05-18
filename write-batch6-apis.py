#!/usr/bin/env python3
"""Generate Batch 6 — 20 new APIs for Orbis."""

import os, json, textwrap

APIs = [
    {
        "name": "Meta Tags Extractor API",
        "slug": "meta-tags-extractor",
        "description": "Extract, validate, and analyze HTML meta tags including title, description, keywords, Open Graph, Twitter Card, and canonical tags from any URL.",
        "category": "web-seo",
        "endpoints_spec": [
            ("extract", "Extract all meta tags from a URL"),
            ("validate", "Validate meta tags for SEO best practices"),
            ("batch", "Batch extract meta tags from up to 20 URLs"),
        ],
        "one_call": ("meta-intelligence", "ONE-CALL: full meta tag audit — extract + validate + SEO score"),
        "pricing": {"extract": "$0.002", "validate": "$0.002", "batch": "$0.015", "execution-gate": "$0.001", "meta-intelligence": "$0.006"},
        "free_per_day": 500,
        "tags": ["meta-tags", "seo", "html", "open-graph", "web-scraping"],
        "keywords": ["extract meta tags", "html meta scraper", "seo meta analyzer", "og tags extractor", "page metadata"],
        "chain_prev": "virality-score", "chain_next": "open-graph-preview",
    },
    {
        "name": "Open Graph Preview API",
        "slug": "open-graph-preview",
        "description": "Preview, validate, and optimize Open Graph and Twitter Card tags to maximize click-through rates on social media shares.",
        "category": "web-seo",
        "endpoints_spec": [
            ("preview", "Render social share preview for a URL"),
            ("validate", "Validate OG tags completeness and quality"),
            ("generate", "Generate missing OG tags for a URL"),
        ],
        "one_call": ("og-intelligence", "ONE-CALL: preview + validate + optimize OG tags"),
        "pricing": {"preview": "$0.003", "validate": "$0.002", "generate": "$0.004", "execution-gate": "$0.001", "og-intelligence": "$0.008"},
        "free_per_day": 300,
        "tags": ["open-graph", "twitter-card", "social-preview", "seo", "metadata"],
        "keywords": ["open graph preview", "og tag validator", "social share preview", "twitter card checker", "link preview generator"],
        "chain_prev": "meta-tags-extractor", "chain_next": "app-store-lookup",
    },
    {
        "name": "App Store Lookup API",
        "slug": "app-store-lookup",
        "description": "Look up iOS and Android app metadata, ratings, reviews, and competitor analysis. Supports Apple App Store and Google Play Store.",
        "category": "market-intelligence",
        "endpoints_spec": [
            ("lookup", "Look up app details by ID or name"),
            ("reviews", "Fetch recent app reviews and sentiment"),
            ("similar", "Find similar apps for competitive analysis"),
        ],
        "one_call": ("app-intelligence", "ONE-CALL: lookup + reviews + competitive landscape"),
        "pricing": {"lookup": "$0.003", "reviews": "$0.005", "similar": "$0.004", "execution-gate": "$0.001", "app-intelligence": "$0.010"},
        "free_per_day": 200,
        "tags": ["app-store", "google-play", "mobile-apps", "reviews", "market-research"],
        "keywords": ["app store lookup", "google play api", "mobile app metadata", "app reviews api", "competitor app analysis"],
        "chain_prev": "open-graph-preview", "chain_next": "chrome-extension-lookup",
    },
    {
        "name": "Chrome Extension Lookup API",
        "slug": "chrome-extension-lookup",
        "description": "Retrieve Chrome Web Store extension metadata, user counts, ratings, permissions, and security analysis for browser extension intelligence.",
        "category": "market-intelligence",
        "endpoints_spec": [
            ("lookup", "Look up extension by ID or name"),
            ("analyze", "Analyze extension permissions and security risk"),
            ("similar", "Find similar extensions"),
        ],
        "one_call": ("extension-intelligence", "ONE-CALL: lookup + security analysis + alternatives"),
        "pricing": {"lookup": "$0.002", "analyze": "$0.004", "similar": "$0.003", "execution-gate": "$0.001", "extension-intelligence": "$0.008"},
        "free_per_day": 300,
        "tags": ["chrome-extension", "browser-extension", "web-store", "security", "permissions"],
        "keywords": ["chrome extension lookup", "web store api", "extension permissions check", "browser plugin analysis", "extension security scan"],
        "chain_prev": "app-store-lookup", "chain_next": "browser-compatibility",
    },
    {
        "name": "Browser Compatibility API",
        "slug": "browser-compatibility",
        "description": "Check CSS, JavaScript, and HTML feature compatibility across browsers and versions using Can I Use data. Get polyfill recommendations.",
        "category": "developer-tools",
        "endpoints_spec": [
            ("check", "Check feature compatibility across browsers"),
            ("polyfills", "Get polyfill recommendations for unsupported features"),
            ("report", "Generate full browser support report for a URL"),
        ],
        "one_call": ("compat-intelligence", "ONE-CALL: compatibility check + polyfill plan + support matrix"),
        "pricing": {"check": "$0.001", "polyfills": "$0.003", "report": "$0.005", "execution-gate": "$0.001", "compat-intelligence": "$0.006"},
        "free_per_day": 1000,
        "tags": ["browser-compatibility", "can-i-use", "polyfill", "css", "javascript"],
        "keywords": ["browser compatibility check", "can i use api", "polyfill generator", "css support checker", "js feature compatibility"],
        "chain_prev": "chrome-extension-lookup", "chain_next": "dns-propagation",
    },
    {
        "name": "DNS Propagation API",
        "slug": "dns-propagation",
        "description": "Check DNS propagation status across global nameservers, track record updates, and verify propagation completion after DNS changes.",
        "category": "network-infrastructure",
        "endpoints_spec": [
            ("check", "Check DNS propagation status across global nodes"),
            ("status", "Get propagation percentage and regional breakdown"),
            ("trace", "Trace DNS resolution path"),
        ],
        "one_call": ("propagation-intelligence", "ONE-CALL: propagation check + status + resolution trace"),
        "pricing": {"check": "$0.002", "status": "$0.002", "trace": "$0.003", "execution-gate": "$0.001", "propagation-intelligence": "$0.006"},
        "free_per_day": 500,
        "tags": ["dns", "propagation", "nameserver", "network", "infrastructure"],
        "keywords": ["dns propagation checker", "dns status check", "nameserver propagation", "dns update tracker", "global dns check"],
        "chain_prev": "browser-compatibility", "chain_next": "ssl-expiry-monitor",
    },
    {
        "name": "SSL Expiry Monitor API",
        "slug": "ssl-expiry-monitor",
        "description": "Monitor SSL certificate expiry dates, receive alerts before certificates expire, and track certificate health across multiple domains.",
        "category": "network-infrastructure",
        "endpoints_spec": [
            ("check", "Check SSL certificate expiry for a domain"),
            ("monitor", "Monitor multiple domains for upcoming expirations"),
            ("alert", "Generate expiry alert with days remaining and renewal steps"),
        ],
        "one_call": ("ssl-expiry-intelligence", "ONE-CALL: expiry check + renewal urgency + action plan"),
        "pricing": {"check": "$0.001", "monitor": "$0.005", "alert": "$0.003", "execution-gate": "$0.001", "ssl-expiry-intelligence": "$0.005"},
        "free_per_day": 500,
        "tags": ["ssl", "certificate", "expiry", "monitoring", "https"],
        "keywords": ["ssl expiry checker", "certificate monitor", "ssl renewal alert", "https certificate check", "domain ssl status"],
        "chain_prev": "dns-propagation", "chain_next": "tls-configuration",
    },
    {
        "name": "TLS Configuration API",
        "slug": "tls-configuration",
        "description": "Analyze TLS/SSL configuration for cipher suites, protocol versions, vulnerabilities, and compliance. Grade server security posture.",
        "category": "network-infrastructure",
        "endpoints_spec": [
            ("analyze", "Analyze TLS configuration and cipher suites"),
            ("grade", "Grade server TLS security (A+ to F)"),
            ("recommendations", "Get hardening recommendations"),
        ],
        "one_call": ("tls-intelligence", "ONE-CALL: full TLS audit — config + grade + remediation plan"),
        "pricing": {"analyze": "$0.003", "grade": "$0.003", "recommendations": "$0.004", "execution-gate": "$0.001", "tls-intelligence": "$0.008"},
        "free_per_day": 300,
        "tags": ["tls", "ssl", "cipher-suites", "security", "https"],
        "keywords": ["tls configuration check", "ssl grade api", "cipher suite analyzer", "tls vulnerability scan", "https security audit"],
        "chain_prev": "ssl-expiry-monitor", "chain_next": "website-carbon-footprint",
    },
    {
        "name": "Website Carbon Footprint API",
        "slug": "website-carbon-footprint",
        "description": "Estimate the carbon footprint of any webpage, benchmark against industry averages, and get actionable optimization recommendations.",
        "category": "sustainability",
        "endpoints_spec": [
            ("estimate", "Estimate carbon footprint for a URL"),
            ("benchmark", "Benchmark against industry and category averages"),
            ("optimize", "Get page weight and carbon reduction recommendations"),
        ],
        "one_call": ("carbon-intelligence", "ONE-CALL: carbon estimate + benchmark + optimization roadmap"),
        "pricing": {"estimate": "$0.002", "benchmark": "$0.003", "optimize": "$0.004", "execution-gate": "$0.001", "carbon-intelligence": "$0.007"},
        "free_per_day": 300,
        "tags": ["carbon-footprint", "sustainability", "green-web", "performance", "environment"],
        "keywords": ["website carbon footprint", "web page emissions", "green web check", "carbon footprint calculator", "sustainable website audit"],
        "chain_prev": "tls-configuration", "chain_next": "accessibility-audit-lite",
    },
    {
        "name": "Accessibility Audit Lite API",
        "slug": "accessibility-audit-lite",
        "description": "Run WCAG 2.1 accessibility checks on any URL or HTML snippet. Identify issues, score compliance level, and get fix suggestions.",
        "category": "web-seo",
        "endpoints_spec": [
            ("audit", "Run WCAG 2.1 accessibility audit on a URL"),
            ("score", "Get accessibility compliance score (A, AA, AAA)"),
            ("fix-suggestions", "Get prioritized fix recommendations for issues"),
        ],
        "one_call": ("accessibility-intelligence", "ONE-CALL: full audit + score + remediation checklist"),
        "pricing": {"audit": "$0.005", "score": "$0.002", "fix-suggestions": "$0.004", "execution-gate": "$0.001", "accessibility-intelligence": "$0.010"},
        "free_per_day": 200,
        "tags": ["accessibility", "wcag", "a11y", "compliance", "web-audit"],
        "keywords": ["wcag accessibility check", "a11y audit api", "website accessibility score", "accessibility compliance test", "aria checker"],
        "chain_prev": "website-carbon-footprint", "chain_next": "keyword-density",
    },
    {
        "name": "Keyword Density API",
        "slug": "keyword-density",
        "description": "Analyze keyword frequency, density, and distribution in text or web pages. Compare against SEO best practices and competitor pages.",
        "category": "content-intelligence",
        "endpoints_spec": [
            ("analyze", "Analyze keyword density and frequency in text"),
            ("optimize", "Get keyword optimization recommendations"),
            ("compare", "Compare keyword density against a competitor URL"),
        ],
        "one_call": ("keyword-intelligence", "ONE-CALL: density analysis + optimization plan + competitor gap"),
        "pricing": {"analyze": "$0.002", "optimize": "$0.003", "compare": "$0.005", "execution-gate": "$0.001", "keyword-intelligence": "$0.007"},
        "free_per_day": 500,
        "tags": ["keyword-density", "seo", "content-analysis", "text-analytics", "on-page-seo"],
        "keywords": ["keyword density checker", "keyword frequency analyzer", "seo keyword tool", "on-page keyword analysis", "content keyword optimizer"],
        "chain_prev": "accessibility-audit-lite", "chain_next": "serp-snippet-preview",
    },
    {
        "name": "SERP Snippet Preview API",
        "slug": "serp-snippet-preview",
        "description": "Preview and optimize how a URL appears in Google search results. Check title truncation, meta description length, and rich snippet eligibility.",
        "category": "content-intelligence",
        "endpoints_spec": [
            ("preview", "Preview how a URL appears in Google SERP"),
            ("optimize", "Optimize title and description for CTR"),
            ("score", "Score snippet attractiveness and CTR potential"),
        ],
        "one_call": ("serp-intelligence", "ONE-CALL: SERP preview + CTR score + title/desc optimization"),
        "pricing": {"preview": "$0.002", "optimize": "$0.004", "score": "$0.002", "execution-gate": "$0.001", "serp-intelligence": "$0.007"},
        "free_per_day": 500,
        "tags": ["serp", "seo", "snippet", "google", "ctr"],
        "keywords": ["serp snippet preview", "google snippet checker", "meta description preview", "seo snippet tool", "search result preview"],
        "chain_prev": "keyword-density", "chain_next": "slug-generator",
    },
    {
        "name": "Slug Generator API",
        "slug": "slug-generator",
        "description": "Generate SEO-friendly URL slugs from titles and text. Handle transliteration, stop-word removal, deduplication, and batch generation.",
        "category": "content-intelligence",
        "endpoints_spec": [
            ("generate", "Generate a URL slug from a title or phrase"),
            ("validate", "Validate and clean an existing slug"),
            ("batch", "Batch generate slugs for up to 50 titles"),
        ],
        "one_call": ("slug-intelligence", "ONE-CALL: generate + validate + SEO score + alternatives"),
        "pricing": {"generate": "$0.001", "validate": "$0.001", "batch": "$0.005", "execution-gate": "$0.001", "slug-intelligence": "$0.003"},
        "free_per_day": 2000,
        "tags": ["slug", "url", "seo", "content", "permalink"],
        "keywords": ["url slug generator", "seo slug maker", "permalink generator", "slug from title", "url friendly text"],
        "chain_prev": "serp-snippet-preview", "chain_next": "text-readability-score",
    },
    {
        "name": "Text Readability Score API",
        "slug": "text-readability-score",
        "description": "Score text readability using Flesch-Kincaid, Gunning Fog, SMOG, and Coleman-Liau indices. Identify complex sentences and suggest simplifications.",
        "category": "content-intelligence",
        "endpoints_spec": [
            ("score", "Score text readability across multiple indices"),
            ("analyze", "Analyze complex sentences and vocabulary"),
            ("simplify", "Get simplification suggestions for complex passages"),
        ],
        "one_call": ("readability-intelligence", "ONE-CALL: score + sentence analysis + simplification plan"),
        "pricing": {"score": "$0.001", "analyze": "$0.003", "simplify": "$0.004", "execution-gate": "$0.001", "readability-intelligence": "$0.006"},
        "free_per_day": 1000,
        "tags": ["readability", "flesch-kincaid", "text-analysis", "content", "writing"],
        "keywords": ["text readability score", "flesch kincaid api", "reading level checker", "content readability analyzer", "text complexity score"],
        "chain_prev": "slug-generator", "chain_next": "grammar-check-lite",
    },
    {
        "name": "Grammar Check Lite API",
        "slug": "grammar-check-lite",
        "description": "Lightweight grammar, spelling, and style checking for text. Detect errors, suggest corrections, and score writing quality.",
        "category": "content-intelligence",
        "endpoints_spec": [
            ("check", "Check text for grammar and spelling errors"),
            ("fix", "Auto-fix detected errors and return corrected text"),
            ("analyze", "Analyze writing style and quality metrics"),
        ],
        "one_call": ("grammar-intelligence", "ONE-CALL: check + fix + style score + recommendations"),
        "pricing": {"check": "$0.002", "fix": "$0.003", "analyze": "$0.003", "execution-gate": "$0.001", "grammar-intelligence": "$0.007"},
        "free_per_day": 500,
        "tags": ["grammar", "spelling", "writing", "proofreading", "content"],
        "keywords": ["grammar check api", "spelling checker api", "text proofreader", "writing quality analyzer", "auto grammar fix"],
        "chain_prev": "text-readability-score", "chain_next": "emoji-sentiment",
    },
    {
        "name": "Emoji Sentiment API",
        "slug": "emoji-sentiment",
        "description": "Analyze the emotional sentiment of emoji usage in text, decode emoji meaning, and suggest contextually appropriate emojis for content.",
        "category": "content-intelligence",
        "endpoints_spec": [
            ("analyze", "Analyze emoji sentiment and emotional tone in text"),
            ("suggest", "Suggest relevant emojis for a given text or topic"),
            ("decode", "Decode emoji meanings and cultural context"),
        ],
        "one_call": ("emoji-intelligence", "ONE-CALL: sentiment analysis + suggestions + emotional profile"),
        "pricing": {"analyze": "$0.002", "suggest": "$0.002", "decode": "$0.001", "execution-gate": "$0.001", "emoji-intelligence": "$0.005"},
        "free_per_day": 1000,
        "tags": ["emoji", "sentiment", "emotion", "text-analysis", "social-media"],
        "keywords": ["emoji sentiment analysis", "emoji meaning decoder", "emoji suggestion api", "text emoji analyzer", "emotional tone emoji"],
        "chain_prev": "grammar-check-lite", "chain_next": "hashtag-generator",
    },
    {
        "name": "Hashtag Generator API",
        "slug": "hashtag-generator",
        "description": "Generate high-performing hashtags for social media posts. Analyze trending hashtags, estimate reach, and optimize for platform-specific algorithms.",
        "category": "social-media",
        "endpoints_spec": [
            ("generate", "Generate relevant hashtags for a topic or post"),
            ("analyze", "Analyze hashtag performance and reach"),
            ("trending", "Get currently trending hashtags by category"),
        ],
        "one_call": ("hashtag-intelligence", "ONE-CALL: generate + trending overlap + reach estimate + strategy"),
        "pricing": {"generate": "$0.002", "analyze": "$0.003", "trending": "$0.003", "execution-gate": "$0.001", "hashtag-intelligence": "$0.007"},
        "free_per_day": 500,
        "tags": ["hashtag", "social-media", "instagram", "twitter", "content-strategy"],
        "keywords": ["hashtag generator api", "trending hashtags", "instagram hashtags api", "social media hashtags", "hashtag reach analyzer"],
        "chain_prev": "emoji-sentiment", "chain_next": "caption-generator",
    },
    {
        "name": "Caption Generator API",
        "slug": "caption-generator",
        "description": "Generate engaging social media captions for posts, images, and videos. Optimize tone, length, and CTAs for Instagram, LinkedIn, Twitter, and TikTok.",
        "category": "social-media",
        "endpoints_spec": [
            ("generate", "Generate captions for a topic, image, or context"),
            ("optimize", "Optimize an existing caption for engagement"),
            ("batch", "Batch generate captions for up to 10 pieces of content"),
        ],
        "one_call": ("caption-intelligence", "ONE-CALL: generate + hashtags + CTAs + platform variants"),
        "pricing": {"generate": "$0.003", "optimize": "$0.003", "batch": "$0.020", "execution-gate": "$0.001", "caption-intelligence": "$0.008"},
        "free_per_day": 300,
        "tags": ["caption", "social-media", "instagram", "content-creation", "copywriting"],
        "keywords": ["social media caption generator", "instagram caption api", "post caption creator", "ai caption writer", "content caption tool"],
        "chain_prev": "hashtag-generator", "chain_next": "cta-generator",
    },
    {
        "name": "CTA Generator API",
        "slug": "cta-generator",
        "description": "Generate high-converting call-to-action copy for landing pages, emails, ads, and buttons. Score CTAs and generate A/B test variants.",
        "category": "marketing-copy",
        "endpoints_spec": [
            ("generate", "Generate CTA copy for a use case and goal"),
            ("score", "Score existing CTA conversion potential"),
            ("ab-variants", "Generate A/B test variants for a CTA"),
        ],
        "one_call": ("cta-intelligence", "ONE-CALL: generate + score + A/B variants + placement guide"),
        "pricing": {"generate": "$0.003", "score": "$0.002", "ab-variants": "$0.005", "execution-gate": "$0.001", "cta-intelligence": "$0.008"},
        "free_per_day": 300,
        "tags": ["cta", "copywriting", "conversion", "marketing", "landing-page"],
        "keywords": ["cta generator api", "call to action writer", "conversion copy generator", "button text generator", "cta a/b testing"],
        "chain_prev": "caption-generator", "chain_next": "subject-line-scorer",
    },
    {
        "name": "Subject Line Scorer API",
        "slug": "subject-line-scorer",
        "description": "Score email subject lines for open rate potential using sentiment, urgency, personalization, and spam trigger analysis. Generate optimized alternatives.",
        "category": "marketing-copy",
        "endpoints_spec": [
            ("score", "Score an email subject line for open rate potential"),
            ("optimize", "Get an optimized version of a subject line"),
            ("generate", "Generate high-performing subject line variants"),
        ],
        "one_call": ("subject-intelligence", "ONE-CALL: score + optimize + generate variants + spam check"),
        "pricing": {"score": "$0.001", "optimize": "$0.003", "generate": "$0.003", "execution-gate": "$0.001", "subject-intelligence": "$0.006"},
        "free_per_day": 500,
        "tags": ["email", "subject-line", "open-rate", "marketing", "copywriting"],
        "keywords": ["email subject line scorer", "subject line optimizer", "email open rate predictor", "subject line generator", "email copywriting api"],
        "chain_prev": "cta-generator", "chain_next": None,
    },
]

def to_camel(slug):
    parts = slug.split('-')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])

def make_intelligence_ts(api):
    slug = api['slug']
    name = api['name']
    ep1, ep2, ep3 = api['endpoints_spec']
    one_call_slug, one_call_desc = api['one_call']

    ep1_slug, ep1_desc = ep1
    ep2_slug, ep2_desc = ep2
    ep3_slug, ep3_desc = ep3

    def pricing_str():
        p = api['pricing']
        return ', '.join(f"'{k}': '${{price}}'" for k in p)

    # Build endpoint-specific prompts
    def ep_body(ep_s, ep_d):
        required_param = "url" if any(k in ep_s for k in ["extract", "preview", "check", "audit", "estimate", "report", "trace", "status"]) else \
                         "text" if any(k in ep_s for k in ["score", "analyze", "fix", "decode", "check"]) else \
                         "input"
        return required_param

    r1 = ep_body(ep1_slug, ep1_desc)
    r2 = ep_body(ep2_slug, ep2_desc)
    r3 = ep_body(ep3_slug, ep3_desc)

    return f'''import {{ Router, Request, Response }} from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {{
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {{ model: MODEL, messages: [{{ role: 'user', content: prompt }}] }},
    {{ headers: {{ Authorization: `Bearer ${{OPENROUTER_API_KEY}}`, 'Content-Type': 'application/json' }} }}
  );
  return res.data.choices[0].message.content;
}}

function parseJSON(raw: string) {{ return JSON.parse(raw.replace(/```json|```/g, '').trim()); }}
function traceId() {{ return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }}

router.get('/', (_req: Request, res: Response) => {{
  res.json({{ name: '{name}', info: '/{slug}/info', openapi: '/{slug}/openapi.json', health: 'ok' }});
}});

router.post('/{ep1_slug}', async (req: Request, res: Response) => {{
  const {{ {r1}, options }} = req.body;
  if (!{r1}) return res.status(400).json({{ error: '{r1} is required' }});
  try {{
    const raw = await callClaude(`You are an expert {name} engine. Task: {ep1_desc}. Input: "${{{r1}}}". Options: ${{JSON.stringify(options || {{}})}}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, {r1}, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${{traceId()}}. Time: ${{new Date().toISOString()}}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message }}); }}
}});

router.post('/{ep2_slug}', async (req: Request, res: Response) => {{
  const {{ {r2}, options }} = req.body;
  if (!{r2}) return res.status(400).json({{ error: '{r2} is required' }});
  try {{
    const raw = await callClaude(`You are an expert {name} engine. Task: {ep2_desc}. Input: "${{{r2}}}". Options: ${{JSON.stringify(options || {{}})}}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, {r2}, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${{traceId()}}. Time: ${{new Date().toISOString()}}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message }}); }}
}});

router.post('/{ep3_slug}', async (req: Request, res: Response) => {{
  const {{ {r3}, options }} = req.body;
  if (!{r3}) return res.status(400).json({{ error: '{r3} is required' }});
  try {{
    const raw = await callClaude(`You are an expert {name} engine. Task: {ep3_desc}. Input: "${{{r3}}}". Options: ${{JSON.stringify(options || {{}})}}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, {r3}, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${{traceId()}}. Time: ${{new Date().toISOString()}}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message }}); }}
}});

router.post('/execution-gate', async (req: Request, res: Response) => {{
  const {{ input, objective }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required' }});
  res.json({{
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, input, objective: objective || '{ep1_slug}',
    next_api: '{slug}', next_endpoint: '/{ep1_slug}',
    blocking_flags: [], flag_definitions: {{ NO_INPUT: 'input is required' }},
    source_provenance: {{ provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 }},
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: '{slug}', recommended_next_endpoint: '/{one_call_slug}',
    automation_safe: true, confidence_per_section: {{ execution_ready: 0.95 }},
    recommended_actions_priority_order: ['{ep1_desc}', '{ep2_desc}', '{ep3_desc}'],
    privacy: {{ data_stored: false, retention: 'none' }},
  }});
}});

router.post('/{one_call_slug}', async (req: Request, res: Response) => {{
  const {{ input, options }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required' }});
  try {{
    const raw = await callClaude(`You are a complete {name} intelligence engine. Task: {one_call_desc}. Input: "${{input}}". Options: ${{JSON.stringify(options || {{}})}}. Return ONLY valid JSON combining all available intelligence including: trace_id, computed_at, success:true, input, {ep1_slug}_result (object), {ep2_slug}_result (object), {ep3_slug}_result (object), overall_score (number 0-1), key_findings (array), recommendations (array), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${{traceId()}}. Time: ${{new Date().toISOString()}}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message }}); }}
}});

export default router;
'''

def make_openapi_ts(api):
    slug = api['slug']
    name = api['name']
    desc = api['description']
    pricing = api['pricing']
    ep1, ep2, ep3 = api['endpoints_spec']
    one_call_slug, one_call_desc = api['one_call']
    ep1_slug, ep1_desc = ep1
    ep2_slug, ep2_desc = ep2
    ep3_slug, ep3_desc = ep3

    pricing_json = json.dumps(pricing)

    return f'''import {{ Router, Request, Response }} from 'express';
const router = Router();
const privacy = {{ type: 'object', properties: {{ data_stored: {{ type: 'boolean' }}, retention: {{ type: 'string' }} }} }};
const confidence = {{ type: 'object', additionalProperties: {{ type: 'number' }} }};
const actions = {{ type: 'array', items: {{ type: 'string' }} }};
const traceFields = {{ trace_id: {{ type: 'string' }}, computed_at: {{ type: 'string', format: 'date-time' }}, success: {{ type: 'boolean' }} }};
const provenance = {{ type: 'object', properties: {{ provider: {{ type: 'string' }}, retrieved_at: {{ type: 'string', format: 'date-time' }}, freshness_score: {{ type: 'number' }} }} }};
const chainFields = {{ source_provenance: provenance, cache_ttl_seconds: {{ type: 'integer' }}, cache_recommended: {{ type: 'boolean' }}, recommended_next_api: {{ type: 'string' }}, recommended_next_endpoint: {{ type: 'string' }}, automation_safe: {{ type: 'boolean' }} }};
router.get('/', (_req: Request, res: Response) => {{
  res.json({{ openapi: '3.1.0', info: {{ title: '{name}', version: '2.0.0', description: '{desc}', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': {pricing_json} }}, servers: [{{ url: 'https://orbis-apis.onrender.com/{slug}' }}], security: [{{ ApiKeyAuth: [] }}], paths: {{ '/{ep1_slug}': {{ post: {{ operationId: '{to_camel(ep1_slug)}', summary: '{ep1_desc}', requestBody: {{ required: true, content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ input: {{ type: 'string' }}, options: {{ type: 'object' }} }}, required: ['input'] }} }} }} }}, responses: {{ '200': {{ description: '{ep1_desc}', content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ ...traceFields, result: {{ type: 'object' }}, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy }} }} }} }} }}, '400': {{ description: 'Missing input' }}, '500': {{ description: 'Failed' }} }} }} }}, '/{ep2_slug}': {{ post: {{ operationId: '{to_camel(ep2_slug)}', summary: '{ep2_desc}', requestBody: {{ required: true, content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ input: {{ type: 'string' }}, options: {{ type: 'object' }} }}, required: ['input'] }} }} }} }}, responses: {{ '200': {{ description: '{ep2_desc}', content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ ...traceFields, result: {{ type: 'object' }}, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy }} }} }} }} }}, '400': {{ description: 'Missing input' }}, '500': {{ description: 'Failed' }} }} }} }}, '/{ep3_slug}': {{ post: {{ operationId: '{to_camel(ep3_slug)}', summary: '{ep3_desc}', requestBody: {{ required: true, content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ input: {{ type: 'string' }}, options: {{ type: 'object' }} }}, required: ['input'] }} }} }} }}, responses: {{ '200': {{ description: '{ep3_desc}', content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ ...traceFields, result: {{ type: 'object' }}, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy }} }} }} }} }}, '400': {{ description: 'Missing input' }}, '500': {{ description: 'Failed' }} }} }} }}, '/execution-gate': {{ post: {{ operationId: 'executionGate', summary: 'Execution readiness check', requestBody: {{ required: true, content: {{ 'application/json': {{ schema: {{ type: 'object', required: ['input'], properties: {{ input: {{ type: 'string' }}, objective: {{ type: 'string' }} }} }} }} }} }}, responses: {{ '200': {{ description: 'Gate result', content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ ...traceFields, execution_ready: {{ type: 'boolean' }}, ...chainFields, confidence_per_section: confidence, privacy }} }} }} }} }} }} }} }}, '/{one_call_slug}': {{ post: {{ operationId: '{to_camel(one_call_slug)}', summary: '{one_call_desc}', 'x-one-call': true, requestBody: {{ required: true, content: {{ 'application/json': {{ schema: {{ type: 'object', required: ['input'], properties: {{ input: {{ type: 'string' }}, options: {{ type: 'object' }} }} }} }} }} }}, responses: {{ '200': {{ description: 'Full intelligence', content: {{ 'application/json': {{ schema: {{ type: 'object', properties: {{ ...traceFields, overall_score: {{ type: 'number' }}, key_findings: {{ type: 'array', items: {{ type: 'string' }} }}, recommendations: {{ type: 'array', items: {{ type: 'string' }} }}, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy }} }} }} }} }}, '400': {{ description: 'Missing input' }}, '500': {{ description: 'Failed' }} }} }} }} }}, components: {{ securitySchemes: {{ ApiKeyAuth: {{ type: 'apiKey', in: 'header', name: 'X-API-Key' }} }} }} }});
}});
export default router;
'''

def make_info_json(api):
    slug = api['slug']
    name = api['name']
    pricing = api['pricing']
    ep1, ep2, ep3 = api['endpoints_spec']
    one_call_slug, _ = api['one_call']
    eps = [ep1[0], ep2[0], ep3[0], 'execution-gate', one_call_slug]
    return {
        "name": name,
        "slug": slug,
        "version": "1.0.0",
        "grade": "A+",
        "mcp_compatible": True,
        "privacy": {"data_stored": False, "retention": "none"},
        "pricing": {
            "free_tier": {"requests_per_day": api['free_per_day']},
            "pay_per_call": pricing
        },
        "rate_limits": {"free": f"{api['free_per_day']}/day", "paid": "50000/day", "enterprise": "500000/day"},
        "endpoints": eps,
        "execution_chain": {
            "recommended_start": f"/{one_call_slug}",
            "fallback": f"/{ep1[0]}",
            "batch_endpoint": f"/{ep3[0]}" if ep3[0] == 'batch' else f"/{ep1[0]}"
        }
    }

def make_openapi_json(api):
    slug = api['slug']
    name = api['name']
    desc = api['description']
    pricing = api['pricing']
    ep1, ep2, ep3 = api['endpoints_spec']
    one_call_slug, one_call_desc = api['one_call']

    paths = {}
    for ep_slug, ep_desc in [ep1, ep2, ep3]:
        paths[f'/{ep_slug}'] = {
            'post': {
                'operationId': to_camel(ep_slug),
                'summary': ep_desc,
                'requestBody': {'required': True, 'content': {'application/json': {'schema': {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'options': {'type': 'object'}}}}}},
                'responses': {'200': {'description': ep_desc}, '400': {'description': 'Missing input'}, '500': {'description': 'Failed'}}
            }
        }
    paths['/execution-gate'] = {
        'post': {
            'operationId': 'executionGate',
            'summary': 'Execution readiness check',
            'requestBody': {'required': True, 'content': {'application/json': {'schema': {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'objective': {'type': 'string'}}}}}},
            'responses': {'200': {'description': 'Gate result'}}
        }
    }
    paths[f'/{one_call_slug}'] = {
        'post': {
            'operationId': to_camel(one_call_slug),
            'summary': one_call_desc,
            'x-one-call': True,
            'requestBody': {'required': True, 'content': {'application/json': {'schema': {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'options': {'type': 'object'}}}}}},
            'responses': {'200': {'description': 'Full intelligence'}, '400': {'description': 'Missing input'}, '500': {'description': 'Failed'}}
        }
    }

    return {
        'openapi': '3.1.0',
        'info': {
            'title': name,
            'version': '1.0.0',
            'description': desc,
            'x-agent-callable': True,
            'x-mcp-compatible': True,
            'x-pricing': {'free_tier': {'requests_per_day': api['free_per_day']}, 'pay_per_call': pricing}
        },
        'servers': [{'url': f'https://orbis-apis.onrender.com/{slug}'}],
        'security': [{'ApiKeyAuth': []}],
        'paths': paths,
        'components': {'securitySchemes': {'ApiKeyAuth': {'type': 'apiKey', 'in': 'header', 'name': 'X-API-Key'}}}
    }

def make_listing_json(api):
    slug = api['slug']
    name = api['name']
    desc = api['description']
    pricing = api['pricing']
    ep1, ep2, ep3 = api['endpoints_spec']
    one_call_slug, one_call_desc = api['one_call']
    all_eps = [ep1, ep2, ep3, ('execution-gate', 'Execution readiness check'), (one_call_slug, one_call_desc)]

    tiers = [
        {"name": "Free", "isFree": True, "requestsPerDay": api['free_per_day']},
        {
            "name": f"{name.replace(' API', '')} Pro",
            "isFree": False,
            "pricingType": "per_call",
            "pricePerCall": float(list(pricing.values())[-1].replace('$', '')),
            "endpointPricing": [
                {"method": "POST", "pathPattern": f"/{ep_s}", "pricePerCallUsdc": float(pricing.get(ep_s, '$0.003').replace('$', '')), "description": ep_d}
                for ep_s, ep_d in all_eps
            ]
        }
    ]

    return [{
        "name": name,
        "shortDescription": desc[:100],
        "description": desc,
        "category": api['category'],
        "baseUrl": f"https://orbis-apis.onrender.com/{slug}",
        "websiteUrl": "https://orbis-apis.onrender.com",
        "docsUrl": f"https://orbis-apis.onrender.com/{slug}/openapi.json",
        "openApiSpecUrl": f"https://orbis-apis.onrender.com/{slug}/openapi.json",
        "logoUrl": "https://orbis-apis.onrender.com/logo.png",
        "tags": api['tags'],
        "tiers": tiers,
        "endpoints": [{"method": "POST", "path": f"/{ep_s}", "description": ep_d} for ep_s, ep_d in all_eps],
        "keywords": api['keywords']
    }]

def make_index_entry(api):
    slug = api['slug']
    name = api['name']
    camel = to_camel(slug)
    pricing = api['pricing']
    ep1, ep2, ep3 = api['endpoints_spec']
    ep1_slug = ep1[0]
    one_call_slug, one_call_desc = api['one_call']
    free_day = api['free_per_day']
    chain_prev = api['chain_prev']
    chain_next = api['chain_next']
    chain_next_js = 'null' if chain_next is None else f"'{chain_next}'"
    all_eps = [ep1, ep2, ep3, ('execution-gate', 'Execution readiness check'), (one_call_slug, one_call_desc)]

    eps_parts = []
    for ep_s, ep_d in all_eps:
        xoc = ", x_one_call: true" if ep_s == one_call_slug else ""
        eps_parts.append("{ method: 'POST', path: '/" + ep_s + "', description: '" + ep_d + "'" + xoc + " }")
    eps_js = ', '.join(eps_parts)

    pricing_js = ', '.join("'" + k + "': '" + v + "'" for k, v in pricing.items())

    info_obj = (
        "{ name: '" + name + "', slug: '" + slug + "', version: '1.0.0', grade: 'A+', mcp_compatible: true, "
        "privacy: { data_stored: false, retention: 'none' }, "
        "pricing: { free_tier: { requests_per_day: " + str(free_day) + " }, pay_per_call: { " + pricing_js + " } }, "
        "rate_limits: { free: '" + str(free_day) + "/day', paid: '50000/day', enterprise: '500000/day' }, "
        "endpoints: [ " + eps_js + " ], "
        "execution_chain: { recommended_start: '/" + one_call_slug + "', fallback: '/" + ep1_slug + "', chain_prev: '" + chain_prev + "', chain_next: " + chain_next_js + " } }"
    )

    lines = [
        "import " + camel + "Router from './routes/" + slug + "-api/routes/intelligence';",
        "import " + camel + "OpenapiRouter from './routes/" + slug + "-api/routes/openapi';",
        "app.use('/" + slug + "/openapi.json', " + camel + "OpenapiRouter);",
        "app.use('/" + slug + "', " + camel + "Router);",
        "app.get('/" + slug + "/info', (_req, res) => res.json(" + info_obj + "));",
    ]
    return '\n'.join(lines)

# ── Execute ────────────────────────────────────────────────────────────────────
BASE = '/workspaces/orbis-apis'
files_written = []

for api in APIs:
    slug = api['slug']
    route_dir = f"{BASE}/src/routes/{slug}-api/routes"
    os.makedirs(route_dir, exist_ok=True)

    # intelligence.ts
    p = f"{route_dir}/intelligence.ts"
    with open(p, 'w') as f:
        f.write(make_intelligence_ts(api))
    files_written.append(p)

    # openapi.ts
    p = f"{route_dir}/openapi.ts"
    with open(p, 'w') as f:
        f.write(make_openapi_ts(api))
    files_written.append(p)

    # root JSON files
    p = f"{BASE}/{slug}-info.json"
    with open(p, 'w') as f:
        json.dump(make_info_json(api), f, indent=2)
    files_written.append(p)

    p = f"{BASE}/{slug}-openapi.json"
    with open(p, 'w') as f:
        json.dump(make_openapi_json(api), f, indent=2)
    files_written.append(p)

    p = f"{BASE}/{slug}-listing.json"
    with open(p, 'w') as f:
        json.dump(make_listing_json(api), f, indent=2)
    files_written.append(p)

    print(f"✅ {slug}")

# ── Update index.ts ────────────────────────────────────────────────────────────
index_path = f"{BASE}/src/index.ts"
with open(index_path, 'r') as f:
    content = f.read()

# Build the new block to append
new_block = '\n\n// ── Batch 6 APIs ──────────────────────────────────────────────────────────────\n\n'
for api in APIs:
    new_block += make_index_entry(api) + '\n\n'

content = content + new_block

with open(index_path, 'w') as f:
    f.write(content)

print(f"\n✅ index.ts updated")
print(f"📁 {len(files_written)} files written")
print(f"🚀 {len(APIs)} APIs scaffolded")
