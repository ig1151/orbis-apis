// Generates all 20 *-api-openapi.json root files — v2: x-pricing, GET /, typed batch, required arrays, financial disclaimers
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'https://orbis-apis.onrender.com';
const sec = [{ ApiKeyAuth: [] }];
const components = { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } };

// Standard envelope fields (always on every response)
const env = {
  trace_id: { type: 'string' },
  computed_at: { type: 'string', format: 'date-time' },
  success: { type: 'boolean' },
  source_provenance: { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } },
  cache_ttl_seconds: { type: 'integer' },
  cache_recommended: { type: 'boolean' },
  recommended_next_api: { type: 'string' },
  recommended_next_endpoint: { type: 'string' },
  automation_safe: { type: 'boolean' }
};

// Additional fields on ONE-CALL intelligence endpoints
const extras = {
  confidence_per_section: { type: 'object', additionalProperties: { type: 'number' } },
  recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
  privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } }
};

// Build typed 200 response. requiredDomain = domain field names that agents MUST receive.
function r(props, intel = false, requiredDomain = []) {
  return {
    '200': {
      description: 'Success',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['trace_id', 'computed_at', 'success', ...requiredDomain],
            properties: { ...props, ...env, ...(intel ? extras : {}) }
          }
        }
      }
    }
  };
}

function body(required, props) {
  return { required: true, content: { 'application/json': { schema: { type: 'object', required, properties: props } } } };
}

// GET / discovery endpoint — identical shape for every API
function discovery(apiName, basePath, endpoints, onecall) {
  return {
    get: {
      operationId: 'discover',
      summary: 'API discovery — endpoints, pricing, rate limits',
      responses: {
        '200': {
          description: 'API metadata',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['api_name', 'version', 'base_url', 'endpoints', 'one_call_endpoint'],
                properties: {
                  api_name: { type: 'string' },
                  version: { type: 'string' },
                  base_url: { type: 'string' },
                  endpoints: { type: 'array', items: { type: 'string' } },
                  one_call_endpoint: { type: 'string' },
                  pricing: { type: 'object', additionalProperties: { type: 'string' } },
                  rate_limits: { type: 'object', properties: { free: { type: 'string' }, paid: { type: 'string' }, enterprise: { type: 'string' } } },
                  mcp_compatible: { type: 'boolean' },
                  agent_callable: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  };
}

// Read pricing from existing info.json (fails gracefully)
function pricing(slug) {
  try {
    return JSON.parse(readFileSync(`${slug}-api-info.json`)).pricing;
  } catch { return null; }
}

const str = { type: 'string' };
const num = { type: 'number' };
const bool = { type: 'boolean' };
const int = { type: 'integer' };
const strArr = { type: 'array', items: { type: 'string' } };

// Shorthand typed-object array builder
function arr(props) { return { type: 'array', items: { type: 'object', properties: props } }; }

// Financial / web3 disclaimer extension fields
const FIN = {
  'x-financial-disclaimer': 'Informational data only. Not financial or investment advice.',
  'x-human-approval-required': true,
  'x-execution-gate-required': true,
  'x-paper-mode-recommended': true
};
const CRYPTO = {
  'x-financial-disclaimer': 'Crypto data for informational purposes only. Not financial advice.',
  'x-execution-gate-required': true,
  'x-paper-mode-recommended': true
};
const COMPLIANCE = {
  'x-execution-gate-required': true,
  'x-human-approval-required': true
};

const specs = [
  // ── 1. CRM Contact Intelligence ──────────────────────────────────────────
  {
    file: 'crm-contact-intelligence-api-openapi.json',
    slug: 'crm-contact-intelligence',
    spec: {
      openapi: '3.1.0',
      info: { title: 'CRM Contact Intelligence API', version: '1.0.0', description: 'Enrich, score, and segment CRM contacts with AI-driven intelligence for sales and marketing automation agents', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/crm-contact-intelligence` }],
      security: sec,
      paths: {
        '/': discovery('CRM Contact Intelligence API', '/crm-contact-intelligence', ['/enrich','/score','/segment','/execution-gate','/contact-intelligence','/intent-signals','/batch'], '/contact-intelligence'),
        '/enrich': { post: { operationId: 'enrichContact', summary: 'Enrich a contact with professional data',
          requestBody: body(['email'], { email: str, company: str }),
          responses: r({ email: str, name: str, title: str, seniority: { type: 'string', enum: ['c-level','vp','director','manager','individual-contributor'] }, company: str, linkedin_url: str, phone: str, location: str }, false, ['email','name','title','seniority']) } },
        '/score': { post: { operationId: 'scoreContact', summary: 'Score contact for outreach priority',
          requestBody: body(['email'], { email: str, icp_criteria: { type: 'object' } }),
          responses: r({ outreach_score: { type: 'number', minimum: 0, maximum: 100 }, fit_score: { type: 'number', minimum: 0, maximum: 100 }, recommended_action: { type: 'string', enum: ['outreach-now','nurture','disqualify','research-more'] } }, false, ['outreach_score','fit_score','recommended_action']) } },
        '/segment': { post: { operationId: 'segmentContact', summary: 'Segment contact into buyer persona and stage',
          requestBody: body(['email'], { email: str }),
          responses: r({ persona: str, buyer_stage: { type: 'string', enum: ['awareness','consideration','decision','retention'] }, engagement_tier: { type: 'string', enum: ['high','medium','low'] } }, false, ['persona','buyer_stage','engagement_tier']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['email'], { email: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/contact-intelligence': { post: { operationId: 'contactIntelligence', summary: 'ONE-CALL: enrich + score + segment + intent', 'x-one-call': true,
          requestBody: body(['email'], { email: str, company: str }),
          responses: r({ enriched_profile: { type: 'object', required: ['name','title','seniority'], properties: { name: str, title: str, seniority: str, company: str, linkedin_url: str } }, outreach_score: { type: 'number', minimum: 0, maximum: 100 }, persona: str, recommended_action: str }, true, ['enriched_profile','outreach_score','persona','recommended_action']) } },
        '/intent-signals': { post: { operationId: 'intentSignals', summary: 'Detect buying intent signals for a contact',
          requestBody: body(['email'], { email: str }),
          responses: r({ intent_score: { type: 'number', minimum: 0, maximum: 100 }, intent_level: { type: 'string', enum: ['hot','warm','cold'] }, signals: strArr }, false, ['intent_score','intent_level']) } },
        '/batch': { post: { operationId: 'batchEnrich', summary: 'Batch enrich up to 20 contacts',
          requestBody: body(['contacts'], { contacts: { type: 'array', maxItems: 20, items: { type: 'object', required: ['email'], properties: { email: str, company: str } } } }),
          responses: r({ count: int, results: arr({ email: str, name: str, title: str, seniority: str, outreach_score: num }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 2. Founder Background ────────────────────────────────────────────────
  {
    file: 'founder-background-api-openapi.json',
    slug: 'founder-background',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Founder Background API', version: '1.0.0', description: 'Research founder credibility, track records, and investment signals for due diligence and investor intelligence agents', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/founder-background` }],
      security: sec,
      paths: {
        '/': discovery('Founder Background API', '/founder-background', ['/lookup','/score','/timeline','/execution-gate','/founder-intelligence','/track-record','/batch'], '/founder-intelligence'),
        '/lookup': { post: { operationId: 'lookupFounder', summary: 'Look up founder background and professional history',
          requestBody: body(['name'], { name: str, company: str, linkedin_url: str }),
          responses: r({ name: str, current_company: str, current_title: str, education: arr({ institution: str, degree: str, year: int }), previous_companies: strArr, background_summary: str, years_experience: int }, false, ['name','current_company','background_summary']) } },
        '/score': { post: { operationId: 'scoreFounder', summary: 'Score founder credibility and success likelihood',
          requestBody: body(['name'], { name: str, company: str }),
          responses: r({ credibility_score: { type: 'number', minimum: 0, maximum: 100 }, success_likelihood: { type: 'string', enum: ['high','medium','low'] }, investor_signal: { type: 'string', enum: ['strong-yes','yes','neutral','no'] } }, false, ['credibility_score','success_likelihood','investor_signal']) } },
        '/timeline': { post: { operationId: 'founderTimeline', summary: 'Get career and venture timeline',
          requestBody: body(['name'], { name: str, company: str }),
          responses: r({ timeline: arr({ year: int, event: str, company: str, type: str }), total_exits: int, total_years_founding: int }, false, ['timeline','total_exits']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['name'], { name: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/founder-intelligence': { post: { operationId: 'founderIntelligence', summary: 'ONE-CALL: lookup + score + timeline + diligence questions', 'x-one-call': true,
          requestBody: body(['name'], { name: str, company: str }),
          responses: r({ credibility_score: { type: 'number', minimum: 0, maximum: 100 }, investor_signal: { type: 'string', enum: ['strong-yes','yes','neutral','no'] }, diligence_verdict: str, due_diligence_questions: strArr }, true, ['credibility_score','investor_signal','diligence_verdict','due_diligence_questions']) } },
        '/track-record': { post: { operationId: 'trackRecord', summary: 'Analyze founder venture track record and patterns',
          requestBody: body(['name'], { name: str }),
          responses: r({ ventures: arr({ company: str, role: str, outcome: str, years: int }), track_record_score: { type: 'number', minimum: 0, maximum: 100 }, pattern: str, notable_exits: strArr }, false, ['ventures','track_record_score','pattern']) } },
        '/batch': { post: { operationId: 'batchFounders', summary: 'Batch research up to 10 founders',
          requestBody: body(['founders'], { founders: { type: 'array', maxItems: 10, items: { type: 'object', required: ['name'], properties: { name: str, company: str } } } }),
          responses: r({ count: int, results: arr({ name: str, credibility_score: num, investor_signal: str, diligence_verdict: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 3. Executive Risk ────────────────────────────────────────────────────
  {
    file: 'executive-risk-api-openapi.json',
    slug: 'executive-risk',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Executive Risk API', version: '1.0.0', description: 'Assess executive reputation risk, surface red flags, and monitor news signals for HR, compliance, and deal-management agents', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/executive-risk` }],
      security: sec,
      paths: {
        '/': discovery('Executive Risk API', '/executive-risk', ['/assess','/red-flags','/reputation','/execution-gate','/executive-intelligence','/news-signals','/batch'], '/executive-intelligence'),
        '/assess': { post: { operationId: 'assessRisk', summary: 'Assess overall executive risk profile',
          requestBody: body(['name'], { name: str, company: str, role: str }),
          responses: r({ overall_risk: { type: 'string', enum: ['low','medium','high','critical'] }, risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_dimensions: { type: 'object', properties: { reputational: num, financial: num, legal: num, operational: num } } }, false, ['overall_risk','risk_score']) } },
        '/red-flags': { post: { operationId: 'redFlags', summary: 'Surface executive red flags and risk indicators',
          requestBody: body(['name'], { name: str, company: str }),
          responses: r({ red_flags: arr({ flag: str, severity: { type: 'string', enum: ['critical','high','medium','low'] }, source: str }), flag_count: int, escalation_required: bool }, false, ['red_flags','flag_count','escalation_required']) } },
        '/reputation': { post: { operationId: 'reputationCheck', summary: 'Check executive public reputation and sentiment',
          requestBody: body(['name'], { name: str, company: str }),
          responses: r({ reputation_score: { type: 'number', minimum: 0, maximum: 100 }, industry_standing: { type: 'string', enum: ['excellent','good','neutral','poor'] }, media_sentiment: { type: 'string', enum: ['positive','neutral','negative'] } }, false, ['reputation_score','industry_standing','media_sentiment']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['name'], { name: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/executive-intelligence': { post: { operationId: 'executiveIntelligence', summary: 'ONE-CALL: risk + red-flags + reputation + recommendation', 'x-one-call': true,
          requestBody: body(['name'], { name: str, company: str, role: str }),
          responses: r({ overall_risk: { type: 'string', enum: ['low','medium','high','critical'] }, red_flags: arr({ flag: str, severity: str }), reputation_score: { type: 'number', minimum: 0, maximum: 100 }, engagement_recommendation: str }, true, ['overall_risk','red_flags','reputation_score','engagement_recommendation']) } },
        '/news-signals': { post: { operationId: 'newsSignals', summary: 'Monitor executive news risk signals',
          requestBody: body(['name'], { name: str, company: str, lookback_days: int }),
          responses: r({ news_risk_score: { type: 'number', minimum: 0, maximum: 100 }, recent_headlines: arr({ headline: str, source: str, date: str, sentiment: str }), alert_level: { type: 'string', enum: ['none','low','medium','high'] } }, false, ['news_risk_score','alert_level']) } },
        '/batch': { post: { operationId: 'batchAssess', summary: 'Batch assess up to 10 executives',
          requestBody: body(['executives'], { executives: { type: 'array', maxItems: 10, items: { type: 'object', required: ['name'], properties: { name: str, company: str } } } }),
          responses: r({ count: int, results: arr({ name: str, overall_risk: str, risk_score: num, escalation_required: bool }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 4. Decision-Maker Fit ────────────────────────────────────────────────
  {
    file: 'decision-maker-fit-api-openapi.json',
    slug: 'decision-maker-fit',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Decision-Maker Fit API', version: '1.0.0', description: 'Score decision-maker fit, identify buyer personas, craft outreach angles, and detect buying signals for B2B sales agents', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/decision-maker-fit` }],
      security: sec,
      paths: {
        '/': discovery('Decision-Maker Fit API', '/decision-maker-fit', ['/score','/persona','/outreach-angle','/execution-gate','/fit-intelligence','/buying-signals','/batch'], '/fit-intelligence'),
        '/score': { post: { operationId: 'scoreFit', summary: 'Score decision-maker fit for your ICP',
          requestBody: body(['contact_name','company'], { contact_name: str, company: str, title: str, icp_profile: { type: 'object' } }),
          responses: r({ fit_score: { type: 'number', minimum: 0, maximum: 100 }, authority_score: { type: 'number', minimum: 0, maximum: 100 }, role_alignment: { type: 'string', enum: ['champion','economic-buyer','influencer','blocker','end-user'] }, icp_match: { type: 'string', enum: ['strong','partial','weak'] } }, false, ['fit_score','authority_score','role_alignment','icp_match']) } },
        '/persona': { post: { operationId: 'buyerPersona', summary: 'Identify buyer archetype and behavioral profile',
          requestBody: body(['contact_name','company'], { contact_name: str, company: str, title: str }),
          responses: r({ archetype: str, primary_goals: strArr, pain_points: strArr, decision_style: { type: 'string', enum: ['analytical','consensus','autonomous','relationship'] } }, false, ['archetype','primary_goals','pain_points']) } },
        '/outreach-angle': { post: { operationId: 'outreachAngle', summary: 'Generate personalized outreach angles',
          requestBody: body(['contact_name','company'], { contact_name: str, company: str, title: str, product_context: str }),
          responses: r({ primary_angle: str, subject_line_ideas: strArr, value_proposition_framing: str, tone_recommendation: str }, false, ['primary_angle','subject_line_ideas','value_proposition_framing']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['contact_name'], { contact_name: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/fit-intelligence': { post: { operationId: 'fitIntelligence', summary: 'ONE-CALL: fit + persona + outreach + buying signals', 'x-one-call': true,
          requestBody: body(['contact_name','company'], { contact_name: str, company: str, title: str }),
          responses: r({ fit_score: { type: 'number', minimum: 0, maximum: 100 }, persona: str, outreach_angle: str, recommended_action: str }, true, ['fit_score','persona','outreach_angle','recommended_action']) } },
        '/buying-signals': { post: { operationId: 'buyingSignals', summary: 'Detect active buying signals and in-market indicators',
          requestBody: body(['contact_name','company'], { contact_name: str, company: str }),
          responses: r({ buying_signal_score: { type: 'number', minimum: 0, maximum: 100 }, in_market: bool, signals: strArr, urgency: { type: 'string', enum: ['immediate','near-term','long-term','none'] } }, false, ['buying_signal_score','in_market','urgency']) } },
        '/batch': { post: { operationId: 'batchScore', summary: 'Batch score up to 20 decision makers',
          requestBody: body(['contacts'], { contacts: { type: 'array', maxItems: 20, items: { type: 'object', required: ['contact_name','company'], properties: { contact_name: str, company: str, title: str } } } }),
          responses: r({ count: int, results: arr({ contact_name: str, fit_score: num, role_alignment: str, recommended_action: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 5. HTML to Markdown ──────────────────────────────────────────────────
  {
    file: 'html-to-markdown-api-openapi.json',
    slug: 'html-to-markdown',
    spec: {
      openapi: '3.1.0',
      info: { title: 'HTML to Markdown API', version: '1.0.0', description: 'Convert HTML to clean Markdown, extract structured content, and simplify web pages for RAG pipelines, crawler agents, and ingestion systems', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/html-to-markdown` }],
      security: sec,
      paths: {
        '/': discovery('HTML to Markdown API', '/html-to-markdown', ['/convert','/clean','/extract','/execution-gate','/html-intelligence','/simplify','/batch'], '/html-intelligence'),
        '/convert': { post: { operationId: 'convertHtml', summary: 'Convert HTML to clean Markdown',
          requestBody: body(['html'], { html: str, base_url: str, include_images: bool }),
          responses: r({ markdown: str, compression_ratio: num, word_count: int, image_count: int }, false, ['markdown','compression_ratio']) } },
        '/clean': { post: { operationId: 'cleanMarkdown', summary: 'Clean and normalize existing Markdown',
          requestBody: body(['markdown'], { markdown: str }),
          responses: r({ cleaned_markdown: str, issues_fixed: strArr, original_length: int, cleaned_length: int }, false, ['cleaned_markdown','issues_fixed']) } },
        '/extract': { post: { operationId: 'extractContent', summary: 'Extract structured content from HTML',
          requestBody: body(['html'], { html: str, base_url: str }),
          responses: r({ title: str, main_content: str, headings: strArr, links: arr({ text: str, url: str }), metadata: { type: 'object' } }, false, ['title','main_content','headings']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['html'], { html: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/html-intelligence': { post: { operationId: 'htmlIntelligence', summary: 'ONE-CALL: convert + extract + quality score', 'x-one-call': true,
          requestBody: body(['html'], { html: str, base_url: str }),
          responses: r({ markdown: str, title: str, content_type: { type: 'string', enum: ['article','product','documentation','landing-page','other'] }, quality_score: { type: 'number', minimum: 0, maximum: 100 }, word_count: int }, true, ['markdown','title','content_type','quality_score']) } },
        '/simplify': { post: { operationId: 'simplifyContent', summary: 'Simplify HTML to plain readable text',
          requestBody: body(['html'], { html: str, reading_level: str }),
          responses: r({ plain_text: str, simplified_markdown: str, readability_score: { type: 'number', minimum: 0, maximum: 100 } }, false, ['plain_text','readability_score']) } },
        '/batch': { post: { operationId: 'batchConvert', summary: 'Batch convert up to 10 HTML pages',
          requestBody: body(['pages'], { pages: { type: 'array', maxItems: 10, items: { type: 'object', required: ['html'], properties: { html: str, base_url: str } } } }),
          responses: r({ count: int, results: arr({ markdown: str, word_count: int, quality_score: num }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 6. URL Metadata ──────────────────────────────────────────────────────
  {
    file: 'url-metadata-api-openapi.json',
    slug: 'url-metadata',
    spec: {
      openapi: '3.1.0',
      info: { title: 'URL Metadata API', version: '1.0.0', description: 'Fetch URL metadata, Open Graph tags, safety scores, and link previews for research agents, content pipelines, and browser automation', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/url-metadata` }],
      security: sec,
      paths: {
        '/': discovery('URL Metadata API', '/url-metadata', ['/fetch','/og-tags','/analyze','/execution-gate','/url-intelligence','/link-preview','/batch'], '/url-intelligence'),
        '/fetch': { post: { operationId: 'fetchMetadata', summary: 'Fetch core metadata from a URL',
          requestBody: body(['url'], { url: str }),
          responses: r({ url: str, final_url: str, title: str, description: str, content_type: str, status_code: int, load_time_ms: int }, false, ['url','title','status_code']) } },
        '/og-tags': { post: { operationId: 'ogTags', summary: 'Extract Open Graph and social meta tags',
          requestBody: body(['url'], { url: str }),
          responses: r({ og: { type: 'object', properties: { title: str, description: str, image: str, type: str } }, twitter: { type: 'object', properties: { card: str, title: str, description: str } }, missing_tags: strArr }, false, ['og','missing_tags']) } },
        '/analyze': { post: { operationId: 'analyzeUrl', summary: 'Analyze URL safety and reputation',
          requestBody: body(['url'], { url: str }),
          responses: r({ safety_score: { type: 'number', minimum: 0, maximum: 100 }, is_safe: bool, malware_indicator: bool, phishing_indicator: bool, domain_age_days: int }, false, ['safety_score','is_safe','malware_indicator','phishing_indicator']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['url'], { url: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/url-intelligence': { post: { operationId: 'urlIntelligence', summary: 'ONE-CALL: fetch + OG + safety + preview', 'x-one-call': true,
          requestBody: body(['url'], { url: str }),
          responses: r({ title: str, description: str, og_image: str, is_safe: bool, social_preview: { type: 'object', required: ['title','description'], properties: { title: str, description: str, image: str } } }, true, ['title','is_safe','social_preview']) } },
        '/link-preview': { post: { operationId: 'linkPreview', summary: 'Generate rich link preview card data',
          requestBody: body(['url'], { url: str, theme: str }),
          responses: r({ preview: { type: 'object', required: ['title','domain'], properties: { title: str, description: str, image: str, favicon: str, domain: str } }, embed_html: str }, false, ['preview']) } },
        '/batch': { post: { operationId: 'batchFetch', summary: 'Batch fetch metadata for up to 20 URLs',
          requestBody: body(['urls'], { urls: { type: 'array', items: str, maxItems: 20 } }),
          responses: r({ count: int, results: arr({ url: str, title: str, is_safe: bool, status_code: int }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 7. Insider Trades ────────────────────────────────────────────────────
  {
    file: 'insider-trades-api-openapi.json',
    slug: 'insider-trades',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Insider Trades API', version: '1.0.0', description: 'Track insider buying and selling activity, detect momentum signals, and surface investment implications for trading and research agents', 'x-agent-callable': true, 'x-mcp-compatible': true, ...FIN },
      servers: [{ url: `${BASE}/insider-trades` }],
      security: sec,
      paths: {
        '/': discovery('Insider Trades API', '/insider-trades', ['/lookup','/signals','/summary','/execution-gate','/insider-intelligence','/trend','/batch'], '/insider-intelligence'),
        '/lookup': { post: { operationId: 'lookupTrades', summary: 'Look up recent insider trades for a ticker',
          requestBody: body(['ticker'], { ticker: str, lookback_days: int }),
          responses: r({ ticker: str, company_name: str, trades: arr({ insider_name: str, title: str, transaction_type: { type: 'string', enum: ['buy','sell'] }, shares: int, value_usd: num, date: str }), total_trades: int }, false, ['ticker','trades','total_trades']) } },
        '/signals': { post: { operationId: 'tradeSignals', summary: 'Get aggregated insider sentiment signal',
          requestBody: body(['ticker'], { ticker: str }),
          responses: r({ signal: { type: 'string', enum: ['bullish','bearish','neutral'] }, signal_strength: { type: 'string', enum: ['strong','moderate','weak'] }, buy_sell_ratio: num, net_value_usd: num }, false, ['signal','signal_strength','buy_sell_ratio']) } },
        '/summary': { post: { operationId: 'tradeSummary', summary: 'Get insider trade summary for a period',
          requestBody: body(['ticker'], { ticker: str, period: str }),
          responses: r({ total_buys: int, total_sells: int, net_activity_usd: num, most_active_insider: str }, false, ['total_buys','total_sells','net_activity_usd']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['ticker'], { ticker: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/insider-intelligence': { post: { operationId: 'insiderIntelligence', summary: 'ONE-CALL: trades + signals + summary + implication', 'x-one-call': true,
          requestBody: body(['ticker'], { ticker: str }),
          responses: r({ overall_signal: { type: 'string', enum: ['bullish','bearish','neutral'] }, notable_transactions: arr({ insider_name: str, transaction_type: str, value_usd: num }), investment_implication: str, confidence_level: { type: 'string', enum: ['high','medium','low'] } }, true, ['overall_signal','notable_transactions','investment_implication']) } },
        '/trend': { post: { operationId: 'insiderTrend', summary: 'Analyze insider trading trend over time',
          requestBody: body(['ticker'], { ticker: str, months: int }),
          responses: r({ trend: { type: 'string', enum: ['increasing-buys','increasing-sells','stable','mixed'] }, momentum_score: { type: 'number', minimum: 0, maximum: 100 }, predictive_signal: str }, false, ['trend','momentum_score']) } },
        '/batch': { post: { operationId: 'batchTrades', summary: 'Batch lookup up to 10 tickers',
          requestBody: body(['tickers'], { tickers: { type: 'array', items: str, maxItems: 10 } }),
          responses: r({ count: int, results: arr({ ticker: str, signal: str, net_value_usd: num }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 8. ETF Holdings ──────────────────────────────────────────────────────
  {
    file: 'etf-holdings-api-openapi.json',
    slug: 'etf-holdings',
    spec: {
      openapi: '3.1.0',
      info: { title: 'ETF Holdings API', version: '1.0.0', description: 'Look up ETF composition, sector breakdowns, top holdings, and compare funds for portfolio construction and investment research agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-financial-disclaimer': FIN['x-financial-disclaimer'] },
      servers: [{ url: `${BASE}/etf-holdings` }],
      security: sec,
      paths: {
        '/': discovery('ETF Holdings API', '/etf-holdings', ['/lookup','/top-holdings','/sector-breakdown','/execution-gate','/etf-intelligence','/compare','/batch'], '/etf-intelligence'),
        '/lookup': { post: { operationId: 'lookupEtf', summary: 'Look up ETF overview and key stats',
          requestBody: body(['ticker'], { ticker: str }),
          responses: r({ ticker: str, name: str, issuer: str, aum_usd: num, expense_ratio: num, inception_date: str, top_holdings: arr({ symbol: str, name: str, weight_pct: num }) }, false, ['ticker','name','aum_usd','expense_ratio']) } },
        '/top-holdings': { post: { operationId: 'topHoldings', summary: 'Get top holdings with weight percentages',
          requestBody: body(['ticker'], { ticker: str, limit: int }),
          responses: r({ ticker: str, top_holdings: arr({ symbol: str, name: str, weight_pct: num }), concentration_top10_pct: num }, false, ['ticker','top_holdings','concentration_top10_pct']) } },
        '/sector-breakdown': { post: { operationId: 'sectorBreakdown', summary: 'Get sector and geography allocation',
          requestBody: body(['ticker'], { ticker: str }),
          responses: r({ ticker: str, sector_allocation: arr({ sector: str, weight_pct: num }), geography_allocation: arr({ country: str, weight_pct: num }), top_sector: str, top_geography: str }, false, ['ticker','sector_allocation','geography_allocation']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['ticker'], { ticker: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/etf-intelligence': { post: { operationId: 'etfIntelligence', summary: 'ONE-CALL: overview + holdings + sectors + thesis', 'x-one-call': true,
          requestBody: body(['ticker'], { ticker: str }),
          responses: r({ name: str, expense_ratio: num, top_10_holdings: arr({ symbol: str, weight_pct: num }), sector_allocation: arr({ sector: str, weight_pct: num }), investment_thesis: str }, true, ['name','expense_ratio','top_10_holdings','investment_thesis']) } },
        '/compare': { post: { operationId: 'compareEtfs', summary: 'Compare two ETFs side by side',
          requestBody: body(['ticker_a','ticker_b'], { ticker_a: str, ticker_b: str }),
          responses: r({ comparison: { type: 'object', required: ['overlap_pct'], properties: { overlap_pct: num, expense_ratio_diff: num, performance_difference: str } }, recommendation: str }, false, ['comparison','recommendation']) } },
        '/batch': { post: { operationId: 'batchLookup', summary: 'Batch lookup up to 10 ETFs',
          requestBody: body(['tickers'], { tickers: { type: 'array', items: str, maxItems: 10 } }),
          responses: r({ count: int, results: arr({ ticker: str, name: str, aum_usd: num, expense_ratio: num }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 9. Wallet Balance ────────────────────────────────────────────────────
  {
    file: 'wallet-balance-api-openapi.json',
    slug: 'wallet-balance',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Wallet Balance API', version: '1.0.0', description: 'Look up wallet balances, token portfolios, and net worth across chains for DeFi agents, compliance tools, and crypto research workflows', 'x-agent-callable': true, 'x-mcp-compatible': true, ...CRYPTO },
      servers: [{ url: `${BASE}/wallet-balance` }],
      security: sec,
      paths: {
        '/': discovery('Wallet Balance API', '/wallet-balance', ['/lookup','/portfolio','/history','/execution-gate','/wallet-intelligence','/net-worth','/batch'], '/wallet-intelligence'),
        '/lookup': { post: { operationId: 'lookupWallet', summary: 'Look up native token balance for a wallet',
          requestBody: body(['address'], { address: str, chain: str }),
          responses: r({ address: str, chain: str, native_balance: str, native_balance_usd: num, token_count: int }, false, ['address','chain','native_balance_usd']) } },
        '/portfolio': { post: { operationId: 'walletPortfolio', summary: 'Get full token portfolio for a wallet',
          requestBody: body(['address'], { address: str, chain: str }),
          responses: r({ tokens: arr({ symbol: str, balance: str, value_usd: num, contract_address: str }), total_value_usd: num, chain_count: int }, false, ['tokens','total_value_usd']) } },
        '/history': { post: { operationId: 'walletHistory', summary: 'Get historical balance snapshots',
          requestBody: body(['address'], { address: str, chain: str, days: int }),
          responses: r({ history: arr({ date: str, value_usd: num }), peak_value_usd: num, current_value_usd: num, pnl_30d_pct: num }, false, ['history','peak_value_usd','current_value_usd']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['address'], { address: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/wallet-intelligence': { post: { operationId: 'walletIntelligence', summary: 'ONE-CALL: balance + portfolio + risk + labeling', 'x-one-call': true,
          requestBody: body(['address'], { address: str, chain: str }),
          responses: r({ total_value_usd: num, wallet_type: { type: 'string', enum: ['eoa','contract','multisig','exchange','defi'] }, risk_profile: { type: 'string', enum: ['conservative','moderate','aggressive','degen'] }, notable_holdings: strArr }, true, ['total_value_usd','wallet_type','risk_profile']) } },
        '/net-worth': { post: { operationId: 'netWorth', summary: 'Calculate total net worth across all chains',
          requestBody: body(['address'], { address: str }),
          responses: r({ net_worth_usd: num, breakdown: { type: 'object', required: ['tokens'], properties: { tokens: num, nfts: num, defi_positions: num } }, largest_position: { type: 'object', required: ['symbol','value_usd'], properties: { symbol: str, value_usd: num, pct_of_total: num } } }, false, ['net_worth_usd','breakdown']) } },
        '/batch': { post: { operationId: 'batchLookup', summary: 'Batch lookup up to 10 wallets',
          requestBody: body(['addresses'], { addresses: { type: 'array', items: str, maxItems: 10 } }),
          responses: r({ count: int, results: arr({ address: str, native_balance_usd: num, total_value_usd: num, wallet_type: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 10. Gas Fee ──────────────────────────────────────────────────────────
  {
    file: 'gas-fee-api-openapi.json',
    slug: 'gas-fee',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Gas Fee API', version: '1.0.0', description: 'Fetch real-time gas prices, estimate transaction costs, and optimize fee strategies for DeFi agents and transaction automation workflows', 'x-agent-callable': true, 'x-mcp-compatible': true, ...CRYPTO },
      servers: [{ url: `${BASE}/gas-fee` }],
      security: sec,
      paths: {
        '/': discovery('Gas Fee API', '/gas-fee', ['/current','/estimate','/history','/execution-gate','/gas-intelligence','/optimize','/batch'], '/gas-intelligence'),
        '/current': { post: { operationId: 'currentGas', summary: 'Get current gas prices for a chain',
          requestBody: body(['chain'], { chain: str }),
          responses: r({ chain: str, base_fee_gwei: num, priority_fee_gwei: { type: 'object', required: ['slow','standard','fast'], properties: { slow: num, standard: num, fast: num } }, network_congestion: { type: 'string', enum: ['low','moderate','high','extreme'] } }, false, ['chain','base_fee_gwei','network_congestion']) } },
        '/estimate': { post: { operationId: 'estimateGas', summary: 'Estimate gas cost for a transaction',
          requestBody: body(['chain','transaction_type'], { chain: str, transaction_type: str, contract_address: str }),
          responses: r({ estimates: { type: 'object', required: ['slow_usd','standard_usd','fast_usd'], properties: { slow_usd: num, standard_usd: num, fast_usd: num } }, recommended_speed: str, eth_price_usd: num }, false, ['estimates','recommended_speed']) } },
        '/history': { post: { operationId: 'gasHistory', summary: 'Get historical gas price patterns',
          requestBody: body(['chain'], { chain: str, hours: int }),
          responses: r({ average_gwei: num, cheapest_time: str, most_expensive_time: str, trend: { type: 'string', enum: ['rising','falling','stable'] } }, false, ['average_gwei','cheapest_time','trend']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['chain'], { chain: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/gas-intelligence': { post: { operationId: 'gasIntelligence', summary: 'ONE-CALL: current + estimate + optimize + timing', 'x-one-call': true,
          requestBody: body(['chain'], { chain: str, transaction_type: str }),
          responses: r({ recommended_fee_gwei: num, recommended_fee_usd: num, congestion: str, best_time_to_transact: str }, true, ['recommended_fee_gwei','recommended_fee_usd','congestion','best_time_to_transact']) } },
        '/optimize': { post: { operationId: 'optimizeGas', summary: 'Get gas optimization strategy for a transaction',
          requestBody: body(['chain','transaction_type'], { chain: str, transaction_type: str, urgency: str }),
          responses: r({ strategy: str, optimal_fee_usd: num, potential_savings_usd: num, wait_time_minutes: int }, false, ['strategy','optimal_fee_usd','potential_savings_usd']) } },
        '/batch': { post: { operationId: 'batchEstimate', summary: 'Batch estimate fees for up to 10 transactions',
          requestBody: body(['transactions'], { transactions: { type: 'array', maxItems: 10, items: { type: 'object', required: ['chain','transaction_type'], properties: { chain: str, transaction_type: str } } } }),
          responses: r({ count: int, results: arr({ chain: str, recommended_fee_usd: num, network_congestion: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 11. Token Metadata ───────────────────────────────────────────────────
  {
    file: 'token-metadata-api-openapi.json',
    slug: 'token-metadata',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Token Metadata API', version: '1.0.0', description: 'Look up token metadata, verify authenticity, check community health, and compare tokens for DeFi research and trading agents', 'x-agent-callable': true, 'x-mcp-compatible': true, ...CRYPTO },
      servers: [{ url: `${BASE}/token-metadata` }],
      security: sec,
      paths: {
        '/': discovery('Token Metadata API', '/token-metadata', ['/lookup','/verify','/social','/execution-gate','/token-intelligence','/compare','/batch'], '/token-intelligence'),
        '/lookup': { post: { operationId: 'lookupToken', summary: 'Look up token metadata by contract address',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ symbol: str, name: str, decimals: int, token_type: { type: 'string', enum: ['ERC-20','ERC-721','ERC-1155','BEP-20','SPL','other'] }, verified: bool, total_supply: str, contract_address: str }, false, ['symbol','name','decimals','token_type','verified']) } },
        '/verify': { post: { operationId: 'verifyToken', summary: 'Verify token authenticity and safety',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ is_verified: bool, honeypot_risk: bool, trust_score: { type: 'number', minimum: 0, maximum: 100 }, warnings: strArr }, false, ['is_verified','honeypot_risk','trust_score']) } },
        '/social': { post: { operationId: 'tokenSocial', summary: 'Get token community and social metrics',
          requestBody: body(['contract_address'], { contract_address: str }),
          responses: r({ twitter_followers: int, telegram_members: int, community_score: { type: 'number', minimum: 0, maximum: 100 }, developer_activity: { type: 'string', enum: ['high','moderate','low','none'] } }, false, ['community_score','developer_activity']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['contract_address'], { contract_address: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/token-intelligence': { post: { operationId: 'tokenIntelligence', summary: 'ONE-CALL: metadata + verify + social + risk summary', 'x-one-call': true,
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ is_verified: bool, trust_score: { type: 'number', minimum: 0, maximum: 100 }, risk_summary: str, key_risks: strArr }, true, ['is_verified','trust_score','risk_summary','key_risks']) } },
        '/compare': { post: { operationId: 'compareTokens', summary: 'Compare two tokens side by side',
          requestBody: body(['contract_address_a','contract_address_b'], { contract_address_a: str, contract_address_b: str, chain: str }),
          responses: r({ stronger_fundamentals: { type: 'string', enum: ['a','b','equal'] }, key_differences: strArr, recommendation: str }, false, ['stronger_fundamentals','key_differences']) } },
        '/batch': { post: { operationId: 'batchLookup', summary: 'Batch lookup up to 10 tokens',
          requestBody: body(['tokens'], { tokens: { type: 'array', maxItems: 10, items: { type: 'object', required: ['contract_address'], properties: { contract_address: str, chain: str } } } }),
          responses: r({ count: int, results: arr({ contract_address: str, symbol: str, is_verified: bool, trust_score: num }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 12. Markdown Cleaner ─────────────────────────────────────────────────
  {
    file: 'markdown-cleaner-api-openapi.json',
    slug: 'markdown-cleaner',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Markdown Cleaner API', version: '1.0.0', description: 'Clean, lint, format, and extract structure from Markdown documents for documentation agents, content pipelines, and knowledge base tools', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/markdown-cleaner` }],
      security: sec,
      paths: {
        '/': discovery('Markdown Cleaner API', '/markdown-cleaner', ['/clean','/format','/lint','/execution-gate','/markdown-intelligence','/extract-structure','/batch'], '/markdown-intelligence'),
        '/clean': { post: { operationId: 'cleanMarkdown', summary: 'Clean and normalize a Markdown document',
          requestBody: body(['markdown'], { markdown: str }),
          responses: r({ cleaned_markdown: str, changes_made: strArr, original_length: int, cleaned_length: int }, false, ['cleaned_markdown','changes_made']) } },
        '/format': { post: { operationId: 'formatMarkdown', summary: 'Format Markdown to a style standard',
          requestBody: body(['markdown'], { markdown: str, standard: str }),
          responses: r({ formatted_markdown: str, standard_applied: str, changes_count: int }, false, ['formatted_markdown','standard_applied']) } },
        '/lint': { post: { operationId: 'lintMarkdown', summary: 'Lint Markdown for errors and warnings',
          requestBody: body(['markdown'], { markdown: str }),
          responses: r({ lint_score: { type: 'number', minimum: 0, maximum: 100 }, issues: arr({ line: int, rule: str, severity: { type: 'string', enum: ['error','warning','info'] }, message: str }), error_count: int, warning_count: int, passed: bool }, false, ['lint_score','issues','error_count','passed']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['markdown'], { markdown: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/markdown-intelligence': { post: { operationId: 'markdownIntelligence', summary: 'ONE-CALL: clean + lint + format + structure extract', 'x-one-call': true,
          requestBody: body(['markdown'], { markdown: str }),
          responses: r({ cleaned_markdown: str, lint_score: { type: 'number', minimum: 0, maximum: 100 }, content_type: { type: 'string', enum: ['documentation','article','readme','notes','other'] }, quality_assessment: str }, true, ['cleaned_markdown','lint_score','content_type','quality_assessment']) } },
        '/extract-structure': { post: { operationId: 'extractStructure', summary: 'Extract document structure and table of contents',
          requestBody: body(['markdown'], { markdown: str }),
          responses: r({ table_of_contents: strArr, sections: arr({ heading: str, level: int, word_count: int }), heading_count: int }, false, ['table_of_contents','sections','heading_count']) } },
        '/batch': { post: { operationId: 'batchClean', summary: 'Batch clean up to 10 Markdown documents',
          requestBody: body(['documents'], { documents: { type: 'array', maxItems: 10, items: { type: 'object', required: ['markdown'], properties: { markdown: str } } } }),
          responses: r({ count: int, results: arr({ cleaned_markdown: str, lint_score: num, passed: bool }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 13. Thumbnail Analysis ───────────────────────────────────────────────
  {
    file: 'thumbnail-analysis-api-openapi.json',
    slug: 'thumbnail-analysis',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Thumbnail Analysis API', version: '1.0.0', description: 'Analyze thumbnail quality, score click-through potential, suggest improvements and compare thumbnails for content creators and media agents', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/thumbnail-analysis` }],
      security: sec,
      paths: {
        '/': discovery('Thumbnail Analysis API', '/thumbnail-analysis', ['/analyze','/score','/suggest','/execution-gate','/thumbnail-intelligence','/compare','/batch'], '/thumbnail-intelligence'),
        '/analyze': { post: { operationId: 'analyzeThumbnail', summary: 'Analyze thumbnail quality and composition',
          requestBody: body(['image_url'], { image_url: str, context: str }),
          responses: r({ visual_quality: { type: 'string', enum: ['excellent','good','fair','poor'] }, composition_score: { type: 'number', minimum: 0, maximum: 100 }, text_readability: { type: 'string', enum: ['high','medium','low','none'] }, color_contrast: { type: 'string', enum: ['strong','adequate','weak'] }, face_detected: bool }, false, ['visual_quality','composition_score','text_readability','color_contrast']) } },
        '/score': { post: { operationId: 'scoreThumbnail', summary: 'Score click-through potential 0-100',
          requestBody: body(['image_url'], { image_url: str, platform: str, niche: str }),
          responses: r({ ctr_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, score_breakdown: { type: 'object', required: ['visual_appeal','text_clarity'], properties: { visual_appeal: num, text_clarity: num, emotional_hook: num, platform_fit: num } } }, false, ['ctr_score','grade','score_breakdown']) } },
        '/suggest': { post: { operationId: 'suggestImprovements', summary: 'Suggest thumbnail improvements',
          requestBody: body(['image_url'], { image_url: str, goal: str }),
          responses: r({ suggestions: arr({ suggestion: str, impact: { type: 'string', enum: ['high','medium','low'] }, difficulty: { type: 'string', enum: ['easy','medium','hard'] } }), priority_fix: str, expected_improvement: str }, false, ['suggestions','priority_fix']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['image_url'], { image_url: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/thumbnail-intelligence': { post: { operationId: 'thumbnailIntelligence', summary: 'ONE-CALL: analyze + score + suggest + platform fit', 'x-one-call': true,
          requestBody: body(['image_url'], { image_url: str, platform: str }),
          responses: r({ ctr_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, top_issues: strArr, quick_wins: strArr, platform_fit: { type: 'string', enum: ['excellent','good','poor'] } }, true, ['ctr_score','grade','top_issues','quick_wins','platform_fit']) } },
        '/compare': { post: { operationId: 'compareThumbnails', summary: 'Compare two thumbnails head-to-head',
          requestBody: body(['image_url_a','image_url_b'], { image_url_a: str, image_url_b: str, platform: str }),
          responses: r({ winner: { type: 'string', enum: ['a','b','tie'] }, scores: { type: 'object', required: ['a','b'], properties: { a: num, b: num } }, win_reason: str }, false, ['winner','scores','win_reason']) } },
        '/batch': { post: { operationId: 'batchThumbnails', summary: 'Batch score up to 5 thumbnails',
          requestBody: body(['thumbnails'], { thumbnails: { type: 'array', maxItems: 5, items: { type: 'object', required: ['image_url'], properties: { image_url: str, platform: str } } } }),
          responses: r({ count: int, results: arr({ image_url: str, ctr_score: num, grade: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 14. Trend Velocity ───────────────────────────────────────────────────
  {
    file: 'trend-velocity-api-openapi.json',
    slug: 'trend-velocity',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Trend Velocity API', version: '1.0.0', description: 'Measure trend momentum, forecast growth trajectories, detect early signals and identify breakout topics for content and marketing agents', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/trend-velocity` }],
      security: sec,
      paths: {
        '/': discovery('Trend Velocity API', '/trend-velocity', ['/measure','/forecast','/signals','/execution-gate','/trend-intelligence','/breakout','/batch'], '/trend-intelligence'),
        '/measure': { post: { operationId: 'measureTrend', summary: 'Measure current trend velocity and momentum',
          requestBody: body(['topic'], { topic: str, region: str, timeframe: str }),
          responses: r({ velocity_score: { type: 'number', minimum: 0, maximum: 100 }, momentum: { type: 'string', enum: ['accelerating','stable','decelerating','declining'] }, growth_rate: num, peak_date: str }, false, ['velocity_score','momentum','growth_rate']) } },
        '/forecast': { post: { operationId: 'forecastTrend', summary: 'Forecast trend trajectory 7-30 days out',
          requestBody: body(['topic'], { topic: str, horizon_days: int }),
          responses: r({ forecast_direction: { type: 'string', enum: ['up','flat','down'] }, peak_window: str, confidence_level: { type: 'number', minimum: 0, maximum: 1 }, projected_growth_pct: num }, false, ['forecast_direction','peak_window','confidence_level']) } },
        '/signals': { post: { operationId: 'trendSignals', summary: 'Get early trend signals and leading indicators',
          requestBody: body(['topic'], { topic: str, signal_types: strArr }),
          responses: r({ signals: arr({ signal: str, source: str, strength: { type: 'string', enum: ['strong','moderate','weak'] } }), signal_strength: { type: 'string', enum: ['strong','moderate','weak'] }, actionable_insight: str }, false, ['signals','signal_strength','actionable_insight']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['topic'], { topic: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/trend-intelligence': { post: { operationId: 'trendIntelligence', summary: 'ONE-CALL: velocity + forecast + signals + opportunity window', 'x-one-call': true,
          requestBody: body(['topic'], { topic: str, region: str }),
          responses: r({ velocity_score: { type: 'number', minimum: 0, maximum: 100 }, momentum: { type: 'string', enum: ['accelerating','stable','decelerating','declining'] }, forecast_direction: { type: 'string', enum: ['up','flat','down'] }, opportunity_window: str, action_recommendation: str }, true, ['velocity_score','momentum','forecast_direction','opportunity_window','action_recommendation']) } },
        '/breakout': { post: { operationId: 'detectBreakout', summary: 'Detect breakout topics in a category',
          requestBody: body(['category'], { category: str, region: str, min_velocity: num }),
          responses: r({ breakout_topics: arr({ topic: str, velocity_score: num, growth_rate: num }), top_breakout: str }, false, ['breakout_topics','top_breakout']) } },
        '/batch': { post: { operationId: 'batchTrends', summary: 'Batch measure up to 10 topics',
          requestBody: body(['topics'], { topics: { type: 'array', items: str, maxItems: 10 } }),
          responses: r({ count: int, results: arr({ topic: str, velocity_score: num, momentum: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 15. Virality Score ───────────────────────────────────────────────────
  {
    file: 'virality-score-api-openapi.json',
    slug: 'virality-score',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Virality Score API', version: '1.0.0', description: 'Score content virality potential, predict share velocity, analyze emotional triggers and optimize for maximum reach in social media agent workflows', 'x-agent-callable': true, 'x-mcp-compatible': true },
      servers: [{ url: `${BASE}/virality-score` }],
      security: sec,
      paths: {
        '/': discovery('Virality Score API', '/virality-score', ['/score','/predict','/analyze','/execution-gate','/virality-intelligence','/optimize','/batch'], '/virality-intelligence'),
        '/score': { post: { operationId: 'scoreVirality', summary: 'Score content virality potential 0-100',
          requestBody: body(['content'], { content: str, platform: str, content_type: str }),
          responses: r({ virality_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, score_breakdown: { type: 'object', required: ['emotional_hook','shareability'], properties: { emotional_hook: num, shareability: num, novelty: num, timing: num } } }, false, ['virality_score','grade','score_breakdown']) } },
        '/predict': { post: { operationId: 'predictShares', summary: 'Predict share velocity and reach potential',
          requestBody: body(['content'], { content: str, platform: str, audience_size: int }),
          responses: r({ predicted_shares: int, share_velocity: { type: 'string', enum: ['explosive','fast','moderate','slow'] }, reach_multiplier: num, estimated_impressions: int }, false, ['predicted_shares','share_velocity','reach_multiplier']) } },
        '/analyze': { post: { operationId: 'analyzeEmotions', summary: 'Analyze emotional triggers and engagement drivers',
          requestBody: body(['content'], { content: str, platform: str }),
          responses: r({ primary_emotion: { type: 'string', enum: ['awe','anger','joy','fear','sadness','surprise','disgust'] }, emotion_scores: { type: 'object', additionalProperties: { type: 'number' } }, engagement_drivers: strArr }, false, ['primary_emotion','emotion_scores','engagement_drivers']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['content'], { content: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/virality-intelligence': { post: { operationId: 'viralityIntelligence', summary: 'ONE-CALL: score + predict + emotions + optimization', 'x-one-call': true,
          requestBody: body(['content'], { content: str, platform: str, content_type: str }),
          responses: r({ virality_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, primary_emotion: str, share_potential: { type: 'string', enum: ['viral','high','medium','low'] }, top_improvements: strArr }, true, ['virality_score','grade','primary_emotion','share_potential','top_improvements']) } },
        '/optimize': { post: { operationId: 'optimizeContent', summary: 'Get optimization suggestions to increase virality',
          requestBody: body(['content'], { content: str, platform: str, target_score: int }),
          responses: r({ suggestions: strArr, rewritten_hook: str, expected_improvement: str }, false, ['suggestions','rewritten_hook','expected_improvement']) } },
        '/batch': { post: { operationId: 'batchVirality', summary: 'Batch score up to 10 content pieces',
          requestBody: body(['items'], { items: { type: 'array', maxItems: 10, items: { type: 'object', required: ['content'], properties: { content: str, platform: str } } } }),
          responses: r({ count: int, results: arr({ virality_score: num, grade: str, primary_emotion: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 16. Blockchain TX Lookup ─────────────────────────────────────────────
  {
    file: 'blockchain-tx-lookup-api-openapi.json',
    slug: 'blockchain-tx-lookup',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Blockchain TX Lookup API', version: '1.0.0', description: 'Look up transaction details, decode calldata, trace internal flows, and assess transaction risk for blockchain analytics and compliance agents', 'x-agent-callable': true, 'x-mcp-compatible': true, ...COMPLIANCE },
      servers: [{ url: `${BASE}/blockchain-tx-lookup` }],
      security: sec,
      paths: {
        '/': discovery('Blockchain TX Lookup API', '/blockchain-tx-lookup', ['/lookup','/decode','/trace','/execution-gate','/tx-intelligence','/risk','/batch'], '/tx-intelligence'),
        '/lookup': { post: { operationId: 'lookupTx', summary: 'Look up a transaction by hash',
          requestBody: body(['tx_hash'], { tx_hash: str, chain: str }),
          responses: r({ tx_hash: str, status: { type: 'string', enum: ['confirmed','pending','failed','not-found'] }, value_usd: num, transaction_type: str, from_address: str, to_address: str, block_number: int, timestamp: str }, false, ['tx_hash','status','from_address','to_address']) } },
        '/decode': { post: { operationId: 'decodeTx', summary: 'Decode transaction calldata and function call',
          requestBody: body(['tx_hash'], { tx_hash: str, chain: str }),
          responses: r({ method_name: str, decoded_params: arr({ name: str, type: str, value: str }), protocol: str }, false, ['method_name','decoded_params']) } },
        '/trace': { post: { operationId: 'traceTx', summary: 'Trace internal transactions and token transfers',
          requestBody: body(['tx_hash'], { tx_hash: str, chain: str }),
          responses: r({ internal_txs: arr({ from: str, to: str, value_usd: num }), token_transfers: arr({ token: str, from: str, to: str, amount: str }), protocols_used: strArr }, false, ['internal_txs','token_transfers','protocols_used']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['tx_hash'], { tx_hash: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/tx-intelligence': { post: { operationId: 'txIntelligence', summary: 'ONE-CALL: lookup + decode + trace + risk assessment', 'x-one-call': true,
          requestBody: body(['tx_hash'], { tx_hash: str, chain: str }),
          responses: r({ status: { type: 'string', enum: ['confirmed','pending','failed','not-found'] }, action_summary: str, risk_level: { type: 'string', enum: ['safe','caution','high-risk','critical'] }, is_suspicious: bool }, true, ['status','action_summary','risk_level','is_suspicious']) } },
        '/risk': { post: { operationId: 'txRisk', summary: 'Assess transaction risk and flag suspicious activity',
          requestBody: body(['tx_hash'], { tx_hash: str, chain: str }),
          responses: r({ risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_level: { type: 'string', enum: ['safe','caution','high-risk','critical'] }, risk_flags: strArr, recommended_action: str }, false, ['risk_score','risk_level','risk_flags','recommended_action']) } },
        '/batch': { post: { operationId: 'batchLookup', summary: 'Batch lookup up to 10 transactions',
          requestBody: body(['tx_hashes'], { tx_hashes: { type: 'array', items: str, maxItems: 10 }, chain: str }),
          responses: r({ count: int, results: arr({ tx_hash: str, status: str, risk_level: str, is_suspicious: bool }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 17. DeFi Pool Data ───────────────────────────────────────────────────
  {
    file: 'defi-pool-data-api-openapi.json',
    slug: 'defi-pool-data',
    spec: {
      openapi: '3.1.0',
      info: { title: 'DeFi Pool Data API', version: '1.0.0', description: 'Look up DeFi pool liquidity, APY, risk metrics, and entry recommendations for yield farming agents and on-chain investment workflows', 'x-agent-callable': true, 'x-mcp-compatible': true, ...FIN },
      servers: [{ url: `${BASE}/defi-pool-data` }],
      security: sec,
      paths: {
        '/': discovery('DeFi Pool Data API', '/defi-pool-data', ['/lookup','/apy','/liquidity','/execution-gate','/pool-intelligence','/risk','/batch'], '/pool-intelligence'),
        '/lookup': { post: { operationId: 'lookupPool', summary: 'Look up a DeFi pool by address or pair',
          requestBody: body(['pool_address'], { pool_address: str, chain: str }),
          responses: r({ protocol: str, pair: str, tvl_usd: num, volume_24h_usd: num, apy_7d: num, fee_tier: num }, false, ['protocol','pair','tvl_usd','apy_7d']) } },
        '/apy': { post: { operationId: 'poolApy', summary: 'Get detailed APY breakdown and impermanent loss risk',
          requestBody: body(['pool_address'], { pool_address: str, chain: str }),
          responses: r({ apy_7d: num, apy_30d: num, fee_apy: num, reward_apy: num, impermanent_loss_risk: { type: 'string', enum: ['low','moderate','high'] } }, false, ['apy_7d','apy_30d','impermanent_loss_risk']) } },
        '/liquidity': { post: { operationId: 'poolLiquidity', summary: 'Get liquidity depth and slippage estimates',
          requestBody: body(['pool_address'], { pool_address: str, chain: str, amount_usd: num }),
          responses: r({ tvl_usd: num, liquidity_depth: { type: 'string', enum: ['deep','moderate','shallow'] }, slippage_1k: num, slippage_100k: num, slippage_1m: num }, false, ['tvl_usd','liquidity_depth','slippage_1k']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['pool_address'], { pool_address: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/pool-intelligence': { post: { operationId: 'poolIntelligence', summary: 'ONE-CALL: tvl + apy + risk + entry recommendation', 'x-one-call': true,
          requestBody: body(['pool_address'], { pool_address: str, chain: str }),
          responses: r({ tvl_usd: num, apy_7d: num, risk_score: { type: 'number', minimum: 0, maximum: 100 }, entry_recommendation: { type: 'string', enum: ['enter','wait','avoid'] } }, true, ['tvl_usd','apy_7d','risk_score','entry_recommendation']) } },
        '/risk': { post: { operationId: 'poolRisk', summary: 'Assess DeFi pool risk factors',
          requestBody: body(['pool_address'], { pool_address: str, chain: str }),
          responses: r({ risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_level: { type: 'string', enum: ['low','medium','high','critical'] }, smart_contract_risk: { type: 'string', enum: ['audited','unaudited','risky'] }, rug_pull_risk: { type: 'string', enum: ['low','moderate','high'] } }, false, ['risk_score','risk_level','smart_contract_risk','rug_pull_risk']) } },
        '/batch': { post: { operationId: 'batchLookup', summary: 'Batch lookup up to 10 pools',
          requestBody: body(['pools'], { pools: { type: 'array', maxItems: 10, items: { type: 'object', required: ['pool_address'], properties: { pool_address: str, chain: str } } } }),
          responses: r({ count: int, results: arr({ pool_address: str, tvl_usd: num, apy_7d: num, risk_level: str }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 18. Token Risk Lite ──────────────────────────────────────────────────
  {
    file: 'token-risk-lite-api-openapi.json',
    slug: 'token-risk-lite',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Token Risk Lite API', version: '1.0.0', description: 'Fast, lightweight token safety scoring — detect honeypots, rug pulls, and critical risk flags for high-frequency trading agents and DeFi safety checks', 'x-agent-callable': true, 'x-mcp-compatible': true, ...CRYPTO },
      servers: [{ url: `${BASE}/token-risk-lite` }],
      security: sec,
      paths: {
        '/': discovery('Token Risk Lite API', '/token-risk-lite', ['/assess','/score','/flags','/execution-gate','/risk-intelligence','/compare','/batch'], '/risk-intelligence'),
        '/assess': { post: { operationId: 'assessRisk', summary: 'Assess token risk with core safety checks',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_level: { type: 'string', enum: ['safe','caution','high-risk','critical'] }, honeypot: bool, rug_pull_risk: { type: 'string', enum: ['low','moderate','high'] } }, false, ['risk_score','risk_level','honeypot','rug_pull_risk']) } },
        '/score': { post: { operationId: 'scoreToken', summary: 'Get detailed token risk score with breakdown',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ risk_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, score_breakdown: { type: 'object', required: ['contract_safety','liquidity'], properties: { contract_safety: num, liquidity: num, ownership: num, trading_pattern: num } } }, false, ['risk_score','grade','score_breakdown']) } },
        '/flags': { post: { operationId: 'riskFlags', summary: 'Get specific risk flags for a token',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ flags: arr({ flag: str, severity: { type: 'string', enum: ['critical','high','medium','low'] }, description: str }), critical_count: int, overall_verdict: { type: 'string', enum: ['safe','risky','dangerous'] } }, false, ['flags','critical_count','overall_verdict']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['contract_address'], { contract_address: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/risk-intelligence': { post: { operationId: 'riskIntelligence', summary: 'ONE-CALL: assess + score + flags + explanation', 'x-one-call': true,
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ risk_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, honeypot: bool, critical_flags: strArr, user_verdict: str, explanation: str }, true, ['risk_score','grade','honeypot','critical_flags','user_verdict','explanation']) } },
        '/compare': { post: { operationId: 'compareRisk', summary: 'Compare risk between two tokens',
          requestBody: body(['contract_address_a','contract_address_b'], { contract_address_a: str, contract_address_b: str, chain: str }),
          responses: r({ risk_scores: { type: 'object', required: ['a','b'], properties: { a: num, b: num } }, grades: { type: 'object', required: ['a','b'], properties: { a: str, b: str } }, lower_risk: { type: 'string', enum: ['a','b','equal'] } }, false, ['risk_scores','grades','lower_risk']) } },
        '/batch': { post: { operationId: 'batchAssess', summary: 'Batch assess up to 20 tokens',
          requestBody: body(['tokens'], { tokens: { type: 'array', maxItems: 20, items: { type: 'object', required: ['contract_address'], properties: { contract_address: str, chain: str } } } }),
          responses: r({ count: int, results: arr({ contract_address: str, risk_score: num, grade: str, honeypot: bool }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 19. Onchain Labeling ─────────────────────────────────────────────────
  {
    file: 'onchain-labeling-api-openapi.json',
    slug: 'onchain-labeling',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Onchain Labeling API', version: '1.0.0', description: 'Label and classify blockchain addresses by entity type, risk category, and compliance status for AML, KYC, and compliance automation agents', 'x-agent-callable': true, 'x-mcp-compatible': true, ...COMPLIANCE },
      servers: [{ url: `${BASE}/onchain-labeling` }],
      security: sec,
      paths: {
        '/': discovery('Onchain Labeling API', '/onchain-labeling', ['/label','/classify','/verify','/execution-gate','/label-intelligence','/bulk-label','/batch'], '/label-intelligence'),
        '/label': { post: { operationId: 'labelAddress', summary: 'Label a blockchain address by entity',
          requestBody: body(['address'], { address: str, chain: str }),
          responses: r({ label: str, entity_name: str, entity_type: { type: 'string', enum: ['exchange','defi','whale','contract','miner','unknown','sanctioned'] }, confidence: { type: 'number', minimum: 0, maximum: 1 } }, false, ['label','entity_type','confidence']) } },
        '/classify': { post: { operationId: 'classifyAddress', summary: 'Classify address by risk and compliance category',
          requestBody: body(['address'], { address: str, chain: str }),
          responses: r({ entity_type: str, risk_category: { type: 'string', enum: ['low-risk','medium-risk','high-risk','sanctioned'] }, compliance_category: str }, false, ['entity_type','risk_category','compliance_category']) } },
        '/verify': { post: { operationId: 'verifyEntity', summary: 'Verify if address belongs to a known entity',
          requestBody: body(['address','expected_entity'], { address: str, expected_entity: str, chain: str }),
          responses: r({ is_known_entity: bool, entity_name: str, match_confidence: { type: 'number', minimum: 0, maximum: 1 } }, false, ['is_known_entity','match_confidence']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['address'], { address: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/label-intelligence': { post: { operationId: 'labelIntelligence', summary: 'ONE-CALL: label + classify + sanctions check + recommendation', 'x-one-call': true,
          requestBody: body(['address'], { address: str, chain: str }),
          responses: r({ label: str, entity_type: str, risk_category: str, is_sanctioned: bool, action_recommendation: str }, true, ['label','entity_type','risk_category','is_sanctioned','action_recommendation']) } },
        '/bulk-label': { post: { operationId: 'bulkLabel', summary: 'Bulk label up to 50 addresses',
          requestBody: body(['addresses'], { addresses: { type: 'array', items: str, maxItems: 50 }, chain: str }),
          responses: r({ count: int, results: arr({ address: str, label: str, entity_type: str, risk_category: str }) }, false, ['count','results']) } },
        '/batch': { post: { operationId: 'batchLabel', summary: 'Batch label addresses from multiple chains',
          requestBody: body(['addresses'], { addresses: { type: 'array', maxItems: 20, items: { type: 'object', required: ['address'], properties: { address: str, chain: str } } } }),
          responses: r({ count: int, results: arr({ address: str, label: str, entity_type: str, is_sanctioned: bool }) }, false, ['count','results']) } }
      },
      components
    }
  },

  // ── 20. Smart Contract Decoder ───────────────────────────────────────────
  {
    file: 'smart-contract-decoder-api-openapi.json',
    slug: 'smart-contract-decoder',
    spec: {
      openapi: '3.1.0',
      info: { title: 'Smart Contract Decoder API', version: '1.0.0', description: 'Decode contract ABIs, analyze contract purpose and risk, audit for vulnerabilities, and check interaction safety for DeFi and security agents', 'x-agent-callable': true, 'x-mcp-compatible': true, ...CRYPTO },
      servers: [{ url: `${BASE}/smart-contract-decoder` }],
      security: sec,
      paths: {
        '/': discovery('Smart Contract Decoder API', '/smart-contract-decoder', ['/decode','/analyze','/audit','/execution-gate','/contract-intelligence','/functions','/batch'], '/contract-intelligence'),
        '/decode': { post: { operationId: 'decodeContract', summary: 'Decode contract ABI and function signatures',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ contract_name: str, functions: arr({ name: str, signature: str, is_payable: bool }), is_proxy: bool, implementation_address: str }, false, ['contract_name','functions','is_proxy']) } },
        '/analyze': { post: { operationId: 'analyzeContract', summary: 'Analyze contract purpose and behavior',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ contract_type: str, purpose: str, admin_controls: { type: 'string', enum: ['none','minimal','moderate','extensive'] }, upgradability: { type: 'string', enum: ['immutable','upgradeable','proxy'] } }, false, ['contract_type','purpose','admin_controls','upgradability']) } },
        '/audit': { post: { operationId: 'auditContract', summary: 'Quick security audit for known vulnerabilities',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ risk_score: { type: 'number', minimum: 0, maximum: 100 }, is_verified: bool, vulnerabilities: arr({ type: str, severity: { type: 'string', enum: ['critical','high','medium','low'] }, description: str }) }, false, ['risk_score','is_verified','vulnerabilities']) } },
        '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check',
          requestBody: body(['contract_address'], { contract_address: str, objective: str }),
          responses: r({ ready: bool, gate_passed: bool, blocking_reason: str }, false, ['ready','gate_passed']) } },
        '/contract-intelligence': { post: { operationId: 'contractIntelligence', summary: 'ONE-CALL: decode + analyze + audit + interaction safety', 'x-one-call': true,
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ contract_type: str, risk_level: { type: 'string', enum: ['safe','caution','high-risk','critical'] }, safe_to_interact: bool, interaction_warnings: strArr }, true, ['contract_type','risk_level','safe_to_interact','interaction_warnings']) } },
        '/functions': { post: { operationId: 'listFunctions', summary: 'List all callable functions and admin functions',
          requestBody: body(['contract_address'], { contract_address: str, chain: str }),
          responses: r({ function_count: int, functions: arr({ name: str, signature: str, is_payable: bool, is_admin: bool }), admin_functions: strArr, dangerous_functions: strArr }, false, ['function_count','functions','admin_functions']) } },
        '/batch': { post: { operationId: 'batchDecode', summary: 'Batch decode up to 10 contracts',
          requestBody: body(['contracts'], { contracts: { type: 'array', maxItems: 10, items: { type: 'object', required: ['contract_address'], properties: { contract_address: str, chain: str } } } }),
          responses: r({ count: int, results: arr({ contract_address: str, contract_type: str, risk_level: str, safe_to_interact: bool }) }, false, ['count','results']) } }
      },
      components
    }
  }
];

let written = 0;
for (const { file, slug, spec } of specs) {
  // Inject x-pricing from info.json into the info object
  const p = pricing(slug);
  if (p) spec.info['x-pricing'] = p;
  writeFileSync(`/workspaces/orbis-apis/${file}`, JSON.stringify(spec, null, 2));
  const hasPricing = !!spec.info['x-pricing'];
  const hasDiscovery = !!spec.paths['/'];
  const hasDisclaimer = !!(spec.info['x-financial-disclaimer'] || spec.info['x-execution-gate-required']);
  console.log(`✓ ${file}  pricing=${hasPricing}  discovery=${hasDiscovery}  disclaimer=${hasDisclaimer}`);
  written++;
}
console.log(`\nDone — wrote ${written} files.`);
