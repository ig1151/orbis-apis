import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const entityItem = { type: 'object', properties: { text: { type: 'string' }, type: { type: 'string', enum: ['PERSON', 'ORG', 'LOCATION', 'DATE', 'MONEY', 'PRODUCT', 'EVENT', 'OTHER'] }, confidence: { type: 'number', minimum: 0, maximum: 1 }, start_char: { type: 'integer' }, end_char: { type: 'integer' }, knowledge_base_id: { type: 'string' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Entity Extraction API',
      version: '2.0.0',
      description: 'Extract named entities, map relationships, identify topics, and build knowledge graphs for research, compliance, and data enrichment agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { entities: '$0.001', relationships: '$0.002', topics: '$0.001', 'execution-gate': '$0.001', 'entity-intelligence': '$0.005', 'relationship-extraction': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/entity-extraction' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/entities': {
        post: {
          operationId: 'extractEntities',
          summary: 'Extract named entities from text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, types: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': { description: 'Extracted entities', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, entities: { type: 'array', items: entityItem }, entity_count: { type: 'integer' }, unique_types: { type: 'array', items: { type: 'string' } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/relationships': {
        post: {
          operationId: 'extractRelationships',
          summary: 'Extract relationships between entities in text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, focus_entity: { type: 'string' } } } } } },
          responses: { '200': { description: 'Entity relationships', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, relationships: { type: 'array', items: { type: 'object', properties: { subject: { type: 'string' }, predicate: { type: 'string' }, object: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, sentence: { type: 'string' } } } }, entity_count: { type: 'integer' }, relationship_count: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/topics': {
        post: {
          operationId: 'extractTopics',
          summary: 'Extract key topics and themes from text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, max_topics: { type: 'integer', minimum: 1, maximum: 20 } } } } } },
          responses: { '200': { description: 'Extracted topics', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, relevance_score: { type: 'number', minimum: 0, maximum: 1 }, subtopics: { type: 'array', items: { type: 'string' } }, mentions: { type: 'integer' } } } }, dominant_topic: { type: 'string' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/entity-intelligence': {
        post: {
          operationId: 'entityIntelligence',
          summary: 'ONE-CALL: entities + relationships + topics + knowledge graph summary',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full entity intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, entities: { type: 'array', items: entityItem }, top_relationships: { type: 'array', items: { type: 'object', properties: { subject: { type: 'string' }, predicate: { type: 'string' }, object: { type: 'string' } } } }, dominant_topic: { type: 'string' }, topics: { type: 'array', items: { type: 'string' } }, knowledge_graph_nodes: { type: 'integer' }, knowledge_graph_edges: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/relationship-extraction': {
        post: {
          operationId: 'relationshipExtraction',
          summary: 'Deep relationship extraction with knowledge base matching and entity linking',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, entity_types: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Deep relationship extraction',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      linked_entities: { type: 'array', items: { type: 'object', properties: { entity_id: { type: 'string' }, text: { type: 'string' }, type: { type: 'string' }, related_to: { type: 'array', items: { type: 'string' } }, knowledge_base_match: { type: 'object', properties: { matched: { type: 'boolean' }, source: { type: 'string' }, uri: { type: 'string' } } } } } },
                      co_occurrence_matrix: { type: 'array', items: { type: 'object', properties: { entity_a: { type: 'string' }, entity_b: { type: 'string' }, co_occurrences: { type: 'integer' } } } },
                      central_entities: { type: 'array', items: { type: 'string' } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/batch': {
        post: {
          operationId: 'batchEntities',
          summary: 'Batch extract entities from multiple texts (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch entity results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { text_snippet: { type: 'string' }, entities: { type: 'array', items: entityItem }, entity_count: { type: 'integer' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
