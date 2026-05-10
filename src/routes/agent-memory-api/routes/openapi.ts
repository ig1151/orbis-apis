import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Memory & Context Engine',
      version: '2.0.0',
      description: 'Foundational memory infrastructure for autonomous AI agents. Store, retrieve, compress and extract structured memories with semantic search, session tracking, and token-efficient reasoning.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/store': 0.0015, '/retrieve': 0.001, '/search': 0.001, '/compress': 0.002, '/extract': 0.0015, '/sessions': 0.0005 },
      privacy: { data_stored: false, retention: 'none' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-memory' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/store': { post: { operationId: 'storeMemory', summary: 'Store a memory entry with tags and importance score', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: {
          content: { type: 'string', description: 'Memory content to store' },
          agent_id: { type: 'string', description: 'Unique agent identifier' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Categorization tags' },
          importance: { type: 'number', minimum: 0, maximum: 1, description: 'Importance score 0-1' },
          scope: { type: 'string', enum: ['session', 'agent', 'global'], default: 'session' },
          expires_at: { type: 'string', format: 'date-time', description: 'Optional expiration timestamp' },
        }}}}},
        responses: { '200': { description: 'Memory stored', content: { 'application/json': { schema: { type: 'object', properties: {
          id: { type: 'string' },
          stored: { type: 'boolean' },
          scope: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
          confidence_per_section: { type: 'object', properties: { storage: { type: 'number', minimum: 0, maximum: 1 } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' }, description: 'Suggested next API endpoint' },
          privacy: { type: 'object', properties: {
          data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/retrieve': { post: { operationId: 'retrieveMemory', summary: 'Retrieve relevant memories by semantic query', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: {
          query: { type: 'string' },
          agent_id: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          scope: { type: 'string', enum: ['session', 'agent', 'global'] },
          min_importance: { type: 'number', minimum: 0, maximum: 1 },
          tags: { type: 'array', items: { type: 'string' } },
        }}}}},
        responses: { '200': { description: 'Matching memories', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          memories: { type: 'array', items: { type: 'object', properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            importance: { type: 'number' },
            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
            created_at: { type: 'string', format: 'date-time' },
          }}},
          count: { type: 'integer' },
          confidence_per_section: { type: 'object', properties: {
          retrieval: { type: 'number' }, relevance: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/search': { post: { operationId: 'searchMemory', summary: 'Keyword search across session memories', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: {
          query: { type: 'string' },
          session_id: { type: 'string' },
          limit: { type: 'integer', default: 10 },
        }}}}},
        responses: { '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: {
          results: { type: 'array', items: { type: 'object', properties: {
            id: { type: 'string' }, content: { type: 'string' }, score: { type: 'number' } } } },
          count: { type: 'integer' },
          confidence_per_section: { type: 'object' },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/compress': { post: { operationId: 'compressMemory', summary: 'Compress long memory history into structured summary', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
          session_id: { type: 'string' },
          agent_id: { type: 'string' },
          max_tokens: { type: 'integer', default: 500 },
        }}}}},
        responses: { '200': { description: 'Compressed summary', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          summary: { type: 'string' },
          original_count: { type: 'integer' },
          compressed_tokens: { type: 'integer' },
          compression_ratio: { type: 'number' },
          confidence_per_section: { type: 'object', properties: {
          compression: { type: 'number' } } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/extract': { post: { operationId: 'extractFromMemory', summary: 'Extract facts, entities or summary from memory content', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content', 'type'], properties: {
          content: { type: 'string' },
          type: { type: 'string', enum: ['facts', 'entities', 'summary'] },
          max_items: { type: 'integer', default: 10 },
        }}}}},
        responses: { '200': { description: 'Extracted data', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          type: { type: 'string' },
          items: { type: 'array', items: { type: 'object', properties: {
            value: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
          count: { type: 'integer' },
          confidence_per_section: { type: 'object', properties: {
          extraction: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/sessions': { get: { operationId: 'listSessions', summary: 'List all active memory sessions', 'x-agent-callable': true,
        responses: { '200': { description: 'Session list', content: { 'application/json': { schema: { type: 'object', properties: {
          sessions: { type: 'array', items: { type: 'object', properties: {
          id: { type: 'string' }, memory_count: { type: 'integer' }, created_at: { type: 'string', format: 'date-time' }, last_active: { type: 'string', format: 'date-time' } } } },
          count: { type: 'integer' },
        }}}}}}}},

      '/update': { post: { operationId: 'updateMemory', summary: 'Update an existing memory by ID', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id', 'session_id'], properties: {
          id: { type: 'string', description: 'Memory ID to update' },
          session_id: { type: 'string' },
          content: { type: 'string', description: 'New content (optional)' },
          tags: { type: 'array', items: { type: 'string' } },
          importance: { type: 'number', minimum: 0, maximum: 1 },
        }}}}},
        responses: { '200': { description: 'Memory updated', content: { 'application/json': { schema: { type: 'object', properties: {
          id: { type: 'string' }, updated: { type: 'boolean' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/delete': { post: { operationId: 'deleteMemory', summary: 'Delete a memory by ID', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id', 'session_id'], properties: {
          id: { type: 'string', description: 'Memory ID to delete' },
          session_id: { type: 'string' },
        }}}}},
        responses: { '200': { description: 'Memory deleted', content: { 'application/json': { schema: { type: 'object', properties: {
          id: { type: 'string' }, deleted: { type: 'boolean' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/merge': { post: { operationId: 'mergeMemories', summary: 'Merge duplicate or related memories into one', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ids', 'session_id'], properties: {
          ids: { type: 'array', items: { type: 'string' }, minItems: 2, description: 'Memory IDs to merge' },
          session_id: { type: 'string' },
          strategy: { type: 'string', enum: ['concatenate', 'summarize', 'deduplicate'], default: 'deduplicate' },
        }}}}},
        responses: { '200': { description: 'Merged memory', content: { 'application/json': { schema: { type: 'object', properties: {
          merged_id: { type: 'string' }, deleted_ids: { type: 'array', items: { type: 'string' } },
          content: { type: 'string' }, strategy_used: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/forget': { post: { operationId: 'forgetMemories', summary: 'Bulk forget memories by tag, scope, or age', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id'], properties: {
          session_id: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Delete all memories with these tags' },
          scope: { type: 'string', enum: ['session', 'agent', 'global'] },
          older_than_hours: { type: 'number', description: 'Delete memories older than N hours' },
          min_importance_below: { type: 'number', minimum: 0, maximum: 1, description: 'Delete memories with importance below this threshold' },
        }}}}},
        responses: { '200': { description: 'Memories forgotten', content: { 'application/json': { schema: { type: 'object', properties: {
          deleted_count: { type: 'integer' }, criteria_used: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/reflect': { post: { operationId: 'reflectOnMemory', summary: 'Analyze recent memories, identify failures, generate improved strategy', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id'], properties: {
          session_id: { type: 'string' },
          agent_id: { type: 'string' },
          window: { type: 'integer', default: 20, description: 'Number of recent memories to analyze' },
          focus: { type: 'string', enum: ['failures', 'patterns', 'strategy', 'all'], default: 'all' },
        }}}}},
        responses: { '200': { description: 'Reflection output', content: { 'application/json': { schema: { type: 'object', properties: {
          summary: { type: 'string', description: 'High-level reflection summary' },
          failures_identified: { type: 'array', items: { type: 'string' }, description: 'Identified failure patterns' },
          patterns: { type: 'array', items: { type: 'string' }, description: 'Recurring behavioral patterns' },
          improved_strategy: { type: 'string', description: 'Suggested improved strategy going forward' },
          memory_quality_score: { type: 'number', minimum: 0, maximum: 1, description: 'Overall quality score of memory set' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          confidence_per_section: { type: 'object', properties: { failures: { type: 'number' }, patterns: { type: 'number' }, strategy: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate agent action based on memory confidence and context', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'action'], properties: {
          agent_id: { type: 'string' },
          action: { type: 'string' },
          min_memory_confidence: { type: 'number', default: 0.7, minimum: 0, maximum: 1 },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
    },
  });
});
export default router;
