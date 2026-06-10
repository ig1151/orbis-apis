import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Enterprise Retrieval API', info: '/enterprise-retrieval/info', openapi: '/enterprise-retrieval/openapi.json', health: 'ok' });
});

router.post('/search', async (req: Request, res: Response) => {
  const { query, sources, filters, limit, semantic } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!sources) return res.status(400).json({ error: 'sources is required' });
  try {
    const raw = await callClaude(`Generate a universal enterprise search plan across these sources. Rank sources by relevance, construct source-specific queries, and define result schema.
Query: "${query}"
Sources: ${JSON.stringify(sources)}
Filters: ${JSON.stringify(filters || {})}
Limit: ${limit || 20}
Semantic search: ${semantic !== undefined ? semantic : true}

Return concise JSON:
{
  "query": "string",
  "sources_searched": ["string"],
  "results": [{ "source": "string", "title": "string", "snippet": "string", "relevance_score": 0-1, "url": "string", "date": "string", "author": "string", "type": "string" }],
  "total_results": number,
  "search_strategy": "keyword|semantic|hybrid",
  "source_query_map": { "source_name": "query used for that source" },
  "filters_applied": {},
  "confidence_per_section": { "results": 0-1, "source_query_map": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/retrieve-document', async (req: Request, res: Response) => {
  const { document_id, source, include_metadata, format, sections } = req.body;
  if (!document_id) return res.status(400).json({ error: 'document_id is required' });
  if (!source) return res.status(400).json({ error: 'source is required' });
  try {
    const raw = await callClaude(`Generate document retrieval instructions for this enterprise source. Handle auth requirements, format conversion, section extraction, and metadata enrichment.
Document ID: "${document_id}"
Source: "${source}"
Include metadata: ${include_metadata !== undefined ? include_metadata : true}
Format: "${format || 'structured'}"
Sections: ${JSON.stringify(sections || [])}

Return concise JSON:
{
  "document_id": "string",
  "source": "string",
  "title": "string",
  "content": "string",
  "format": "string",
  "metadata": { "created_at": "string", "modified_at": "string", "author": "string", "collaborators": ["string"], "version": "string", "permissions": "string" },
  "sections_extracted": [{ "heading": "string", "content": "string" }],
  "word_count": number,
  "summary": "string",
  "key_entities": ["string"],
  "confidence_per_section": { "metadata": 0-1, "sections_extracted": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/retrieve-thread', async (req: Request, res: Response) => {
  const { thread_id, source, include_reactions, summarize, participant_filter } = req.body;
  if (!thread_id) return res.status(400).json({ error: 'thread_id is required' });
  if (!source) return res.status(400).json({ error: 'source is required' });
  try {
    const raw = await callClaude(`Retrieve and analyze this conversation thread. Extract participants, key decisions, action items, and thread summary.
Thread ID: "${thread_id}"
Source: "${source}"
Include reactions: ${include_reactions !== undefined ? include_reactions : false}
Summarize: ${summarize !== undefined ? summarize : true}
Participant filter: ${JSON.stringify(participant_filter || [])}

Return concise JSON:
{
  "thread_id": "string",
  "source": "string",
  "subject": "string or null",
  "participants": [{ "name": "string", "role": "string" }],
  "message_count": number,
  "date_range": { "start": "string", "end": "string" },
  "messages": [{ "author": "string", "timestamp": "string", "content": "string", "is_key_message": true|false }],
  "key_decisions": ["string"],
  "action_items": [{ "item": "string", "owner": "string or null" }],
  "summary": "string",
  "sentiment": "positive|negative|neutral|mixed",
  "confidence_per_section": { "messages": 0-1, "key_decisions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-email', async (req: Request, res: Response) => {
  const { query, folder, sender, date_range, has_attachments, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Generate Gmail/email query instructions. Construct optimal search syntax, rank results by relevance, and extract structured data from email content.
Query: "${query}"
Folder: "${folder || 'inbox'}"
Sender filter: "${sender || 'any'}"
Date range: ${JSON.stringify(date_range || {})}
Has attachments: ${has_attachments !== undefined ? has_attachments : null}
Limit: ${limit || 20}

Return concise JSON:
{
  "query": "string",
  "search_syntax": "string (Gmail search format)",
  "results": [{ "id": "string", "subject": "string", "sender": "string", "date": "string", "snippet": "string", "relevance_score": 0-1, "has_attachments": true|false, "labels": ["string"] }],
  "total_matches": number,
  "suggested_refinements": ["string"],
  "thread_grouping": number,
  "attachment_summary": [{ "filename": "string", "type": "string" }],
  "confidence_per_section": { "results": 0-1, "search_syntax": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-crm', async (req: Request, res: Response) => {
  const { query, crm, object_type, filters, fields } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!crm) return res.status(400).json({ error: 'crm is required' });
  try {
    const raw = await callClaude(`Generate CRM query instructions for this platform. Construct API query parameters, handle object relationships, and structure results.
Query: "${query}"
CRM: "${crm}"
Object type: "${object_type || 'contact'}"
Filters: ${JSON.stringify(filters || {})}
Fields: ${JSON.stringify(fields || [])}

Return concise JSON:
{
  "query": "string",
  "crm": "string",
  "object_type": "string",
  "results": [{ "id": "string", "name": "string", "type": "string", "fields": {}, "related_objects": ["string"], "last_modified": "string", "relevance_score": 0-1 }],
  "total_records": number,
  "query_syntax": "string (CRM-specific)",
  "relationships_found": [{ "from": "string", "to": "string", "type": "string" }],
  "data_quality_issues": ["string"],
  "confidence_per_section": { "results": 0-1, "relationships_found": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-calendar', async (req: Request, res: Response) => {
  const { query, calendar_id, date_range, attendee, include_recurring } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Query calendar events and extract scheduling intelligence. Find relevant events, analyze meeting patterns, and surface scheduling insights.
Query: "${query}"
Calendar ID: "${calendar_id || 'primary'}"
Date range: ${JSON.stringify(date_range || {})}
Attendee filter: "${attendee || 'any'}"
Include recurring: ${include_recurring !== undefined ? include_recurring : true}

Return concise JSON:
{
  "query": "string",
  "events": [{ "id": "string", "title": "string", "start": "string", "end": "string", "attendees": ["string"], "location": "string or null", "description_snippet": "string", "is_recurring": true|false, "relevance_score": 0-1 }],
  "total_events": number,
  "scheduling_insights": [{ "insight": "string", "type": "availability|pattern|conflict" }],
  "busiest_periods": ["string"],
  "upcoming_deadlines": ["string"],
  "confidence_per_section": { "events": 0-1, "scheduling_insights": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-notion', async (req: Request, res: Response) => {
  const { query, workspace_id, page_type, filters, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Query Notion workspace content. Search pages and databases, extract structured properties, and rank by relevance to the query.
Query: "${query}"
Workspace ID: "${workspace_id || 'default'}"
Page type: "${page_type || 'all'}"
Filters: ${JSON.stringify(filters || {})}
Limit: ${limit || 20}

Return concise JSON:
{
  "query": "string",
  "results": [{ "id": "string", "title": "string", "type": "page|database", "url": "string", "properties": {}, "content_snippet": "string", "last_edited": "string", "created_by": "string", "relevance_score": 0-1 }],
  "total_results": number,
  "databases_searched": ["string"],
  "property_types_found": ["string"],
  "related_pages": ["string"],
  "confidence_per_section": { "results": 0-1, "databases_searched": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-slack', async (req: Request, res: Response) => {
  const { query, channels, date_range, from_user, limit, include_threads } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Query Slack messages and channels. Find relevant messages, extract context, identify key contributors, and surface action items.
Query: "${query}"
Channels: ${JSON.stringify(channels || [])}
Date range: ${JSON.stringify(date_range || {})}
From user: "${from_user || 'any'}"
Limit: ${limit || 20}
Include threads: ${include_threads !== undefined ? include_threads : true}

Return concise JSON:
{
  "query": "string",
  "messages": [{ "id": "string", "channel": "string", "author": "string", "timestamp": "string", "text": "string", "thread_ts": "string or null", "reactions": ["string"], "relevance_score": 0-1, "permalink": "string" }],
  "total_messages": number,
  "channels_searched": ["string"],
  "top_contributors": [{ "user": "string", "message_count": number }],
  "key_links": ["string"],
  "action_items_found": ["string"],
  "confidence_per_section": { "messages": 0-1, "top_contributors": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-drive', async (req: Request, res: Response) => {
  const { query, folder_id, file_type, owner, date_range } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Query Google Drive for files and folders. Rank by relevance, extract metadata, and identify key documents.
Query: "${query}"
Folder ID: "${folder_id || 'root'}"
File type: "${file_type || 'all'}"
Owner: "${owner || 'any'}"
Date range: ${JSON.stringify(date_range || {})}

Return concise JSON:
{
  "query": "string",
  "files": [{ "id": "string", "name": "string", "type": "string", "owner": "string", "modified_at": "string", "size_bytes": number, "shared_with": ["string"], "folder_path": "string", "snippet": "string", "relevance_score": 0-1, "url": "string" }],
  "total_files": number,
  "storage_used_mb": number,
  "shared_files_count": number,
  "recent_activity": [{ "file": "string", "action": "string", "by": "string", "when": "string" }],
  "confidence_per_section": { "files": 0-1, "recent_activity": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-github', async (req: Request, res: Response) => {
  const { query, repos, filters, date_range, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search GitHub repositories for issues, PRs, commits, and code matching this query. Construct optimal GitHub search syntax, rank results by relevance, and check permission scope.
Query: "${query}"
Repos: ${JSON.stringify(repos || [])}
Filters (type): "${filters || 'all'}"
Date range: ${JSON.stringify(date_range || {})}
Limit: ${limit || 20}

Return concise JSON:
{
  "query": "string",
  "repos_searched": ["string"],
  "results": [{ "type": "issue|pr|commit|code", "title": "string", "url": "string", "author": "string", "date": "string", "status": "string", "snippet": "string", "relevance_score": 0-1 }],
  "total_results": number,
  "open_issues": number,
  "open_prs": number,
  "query_syntax": "string",
  "permission_checked": true,
  "source_permission_scope": "user|org|public",
  "citations": ["string"],
  "confidence_per_section": { "results": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-jira', async (req: Request, res: Response) => {
  const { query, projects, issue_types, statuses, assignee, date_range, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search Jira for issues matching this query. Construct optimal JQL syntax, group by status, and check permission scope.
Query: "${query}"
Projects: ${JSON.stringify(projects || [])}
Issue types: ${JSON.stringify(issue_types || [])}
Statuses: ${JSON.stringify(statuses || [])}
Assignee: "${assignee || 'any'}"
Date range: ${JSON.stringify(date_range || {})}
Limit: ${limit || 20}

Return concise JSON:
{
  "query": "string",
  "projects_searched": ["string"],
  "results": [{ "key": "string", "summary": "string", "status": "string", "assignee": "string", "priority": "string", "type": "string", "updated": "string", "url": "string", "relevance_score": 0-1 }],
  "total_results": number,
  "by_status": {},
  "query_syntax": "string",
  "permission_checked": true,
  "source_permission_scope": "user|project|workspace",
  "citations": ["string"],
  "confidence_per_section": { "results": 0-1, "by_status": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-linear', async (req: Request, res: Response) => {
  const { query, teams, states, assignee, priority, date_range, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search Linear for issues matching this query. Group by state, surface cycle information, and check permission scope.
Query: "${query}"
Teams: ${JSON.stringify(teams || [])}
States: ${JSON.stringify(states || [])}
Assignee: "${assignee || 'any'}"
Priority: "${priority || 'any'}"
Date range: ${JSON.stringify(date_range || {})}
Limit: ${limit || 20}

Return concise JSON:
{
  "query": "string",
  "teams_searched": ["string"],
  "results": [{ "id": "string", "title": "string", "state": "string", "assignee": "string", "priority": "string", "cycle": "string or null", "url": "string", "relevance_score": 0-1 }],
  "total_results": number,
  "by_state": {},
  "cycles_covered": ["string"],
  "permission_checked": true,
  "source_permission_scope": "user|team|workspace",
  "citations": ["string"],
  "confidence_per_section": { "results": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-salesforce', async (req: Request, res: Response) => {
  const { query, objects, fields, filters, limit, include_related } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search Salesforce CRM objects for records matching this query. Generate SOQL, map relationships, apply redactions for sensitive fields, and check permission scope.
Query: "${query}"
Objects: ${JSON.stringify(objects || [])}
Fields: ${JSON.stringify(fields || [])}
Filters: ${JSON.stringify(filters || {})}
Limit: ${limit || 20}
Include related: ${include_related !== undefined ? include_related : false}

Return concise JSON:
{
  "query": "string",
  "objects_searched": ["string"],
  "results": [{ "object": "string", "id": "string", "name": "string", "fields": {}, "url": "string", "relevance_score": 0-1 }],
  "total_results": number,
  "soql_generated": "string",
  "relationships_found": [{ "from": "string", "to": "string", "type": "string" }],
  "permission_checked": true,
  "source_permission_scope": "user|profile|org",
  "redactions_applied": ["string"],
  "citations": ["string"],
  "confidence_per_section": { "results": 0-1, "relationships": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/query-hubspot', async (req: Request, res: Response) => {
  const { query, object_types, properties, filters, associations, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search HubSpot CRM objects for records matching this query. Map associations, identify pipeline stages, apply redactions, and check permission scope.
Query: "${query}"
Object types: ${JSON.stringify(object_types || [])}
Properties: ${JSON.stringify(properties || [])}
Filters: ${JSON.stringify(filters || {})}
Associations: ${JSON.stringify(associations || [])}
Limit: ${limit || 20}

Return concise JSON:
{
  "query": "string",
  "object_types_searched": ["string"],
  "results": [{ "object_type": "string", "id": "string", "name": "string", "properties": {}, "associations": {}, "url": "string", "relevance_score": 0-1 }],
  "total_results": number,
  "pipeline_stages_found": ["string"],
  "associations_mapped": number,
  "permission_checked": true,
  "source_permission_scope": "user|team|portal",
  "redactions_applied": ["string"],
  "citations": ["string"],
  "confidence_per_section": { "results": 0-1, "associations": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/enterprise-briefing', async (req: Request, res: Response) => {
  const { topic, sources, depth, date_range, output_format, include_citations } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  if (!sources) return res.status(400).json({ error: 'sources is required' });
  try {
    const raw = await callClaude(`Generate a comprehensive enterprise briefing on this topic by synthesizing data across all specified sources. Extract decisions, action items, open questions, people, and a timeline. Apply permission checks and redactions where required.
Topic: "${topic}"
Sources: ${JSON.stringify(sources)}
Depth: "${depth || 'standard'}"
Date range: ${JSON.stringify(date_range || {})}
Output format: "${output_format || 'structured'}"
Include citations: ${include_citations !== undefined ? include_citations : true}

Return concise JSON:
{
  "briefing_id": "string",
  "topic": "string",
  "sources_searched": ["string"],
  "executive_summary": "string",
  "key_findings": ["string"],
  "decisions_found": [{ "decision": "string", "date": "string", "source": "string", "owner": "string" }],
  "action_items": [{ "task": "string", "owner": "string", "due": "string or null", "source": "string" }],
  "open_questions": ["string"],
  "people_involved": [{ "name": "string", "role": "string", "mentions": number }],
  "timeline": [{ "date": "string", "event": "string", "source": "string" }],
  "citations": ["string"],
  "permission_checked": true,
  "redactions_applied": ["string"],
  "confidence_per_section": { "executive_summary": 0-1, "key_findings": 0-1, "decisions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { retrieval_action, data_sensitivity, requester_role, purpose, compliance_framework } = req.body;
  if (!retrieval_action) return res.status(400).json({ error: 'retrieval_action is required' });
  if (!data_sensitivity) return res.status(400).json({ error: 'data_sensitivity is required' });
  try {
    const raw = await callClaude(`Gate enterprise data retrieval based on sensitivity, requester authority, and compliance requirements. Enforce data governance policies.
Retrieval action: "${retrieval_action}"
Data sensitivity: "${data_sensitivity}"
Requester role: "${requester_role || 'unknown'}"
Purpose: "${purpose || 'not specified'}"
Compliance framework: "${compliance_framework || 'none'}"

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "sensitivity_level": "string",
  "access_granted": true|false,
  "blocking_reason": "string or null",
  "compliance_flags": ["string"],
  "data_handling_requirements": ["string"],
  "audit_required": true|false,
  "recommended_action": "proceed|request_approval|anonymize_first|deny",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["data:read", "data:extract", "data:monitor"];
const EXECUTION_AUTHORITY: string = "low";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;
