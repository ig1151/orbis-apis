import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = {
  source_provenance: provenance,
  cache_ttl_seconds: { type: 'integer' },
  cache_recommended: { type: 'boolean' },
  recommended_next_api: { type: 'string' },
  recommended_next_endpoint: { type: 'string' },
  automation_safe: { type: 'boolean' },
};

const segmentItem = {
  type: 'object',
  properties: {
    start_seconds: { type: 'number' },
    end_seconds: { type: 'number' },
    text: { type: 'string' },
    speaker: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Transcript Extraction API',
      version: '2.0.0',
      description: 'Extract, chunk, and analyze transcripts from YouTube videos, podcasts, and audio URLs for content intelligence and knowledge retrieval agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 50, requests_per_month: 1500 },
        pay_per_call: { youtube: '$0.004', podcast: '$0.004', 'audio-url': '$0.004', 'execution-gate': '$0.001', extract: '$0.008', 'semantic-chunks': '$0.005', 'speaker-analysis': '$0.005', batch: '$0.015' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/transcript-extraction' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/youtube': {
        post: {
          operationId: 'extractYoutube',
          summary: 'Extract transcript from a YouTube video URL',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' }, language: { type: 'string' } } } } },
          },
          responses: {
            '200': {
              description: 'YouTube transcript',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      video_url: { type: 'string' },
                      transcript: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string' }, word_count: { type: 'integer' }, duration_seconds: { type: 'number' }, segments: { type: 'array', items: segmentItem } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/podcast': {
        post: {
          operationId: 'extractPodcast',
          summary: 'Extract transcript from a podcast RSS or episode URL',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['podcast_url'], properties: { podcast_url: { type: 'string' }, episode_index: { type: 'integer', minimum: 0 } } } } },
          },
          responses: {
            '200': {
              description: 'Podcast transcript',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      podcast_url: { type: 'string' },
                      transcript: { type: 'object', properties: { text: { type: 'string' }, title: { type: 'string' }, language: { type: 'string' }, word_count: { type: 'integer' }, duration_seconds: { type: 'number' }, guests: { type: 'array', items: { type: 'string' } }, segments: { type: 'array', items: segmentItem } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/audio-url': {
        post: {
          operationId: 'extractAudioUrl',
          summary: 'Extract transcript from any audio file URL',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, language: { type: 'string' } } } } },
          },
          responses: {
            '200': {
              description: 'Audio transcript',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      transcript: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string' }, word_count: { type: 'integer' }, duration_seconds: { type: 'number' }, confidence: { type: 'number', minimum: 0, maximum: 1 } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['source_url'], properties: { source_url: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Gate result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { ...traceFields, execution_ready: { type: 'boolean' }, source_type: { type: 'string', enum: ['youtube', 'podcast', 'audio-url', 'unknown'] }, next_api: { type: 'string' }, blocking_flags: actions, ...chainFields, confidence_per_section: confidence, privacy },
                  },
                },
              },
            },
          },
        },
      },
      '/extract': {
        post: {
          operationId: 'extractOneCall',
          summary: 'ONE-CALL: extract transcript + semantic chunks + speaker analysis',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['source_url'], properties: { source_url: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full transcript intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      source_url: { type: 'string' },
                      transcript: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string' }, word_count: { type: 'integer' }, duration_seconds: { type: 'number' } } },
                      semantic_chunks: { type: 'array', items: { type: 'object', properties: { chunk_id: { type: 'integer' }, text: { type: 'string' }, topic: { type: 'string' }, start_seconds: { type: 'number' }, end_seconds: { type: 'number' } } } },
                      speakers: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, talk_time_pct: { type: 'number' }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] } } } },
                      key_topics: { type: 'array', items: { type: 'string' } },
                      summary: { type: 'string' },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/semantic-chunks': {
        post: {
          operationId: 'semanticChunks',
          summary: 'Split transcript into semantically coherent chunks for RAG/retrieval',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['source_url'], properties: { source_url: { type: 'string' }, chunk_size: { type: 'integer', minimum: 50, maximum: 2000 } } } } } },
          responses: {
            '200': {
              description: 'Semantic chunks',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      source_url: { type: 'string' },
                      chunks: { type: 'array', items: { type: 'object', properties: { chunk_id: { type: 'integer' }, text: { type: 'string' }, topic: { type: 'string' }, start_seconds: { type: 'number' }, end_seconds: { type: 'number' }, keywords: { type: 'array', items: { type: 'string' } } } } },
                      total_chunks: { type: 'integer' },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/speaker-analysis': {
        post: {
          operationId: 'speakerAnalysis',
          summary: 'Diarize speakers and analyze their talk patterns',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['source_url'], properties: { source_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Speaker analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      source_url: { type: 'string' },
                      speakers: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, name_guess: { type: 'string' }, talk_time_seconds: { type: 'number' }, talk_time_pct: { type: 'number' }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, segments: { type: 'array', items: segmentItem } } } },
                      total_speakers: { type: 'integer' },
                      dominant_speaker: { type: 'string' },
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
          operationId: 'batchExtract',
          summary: 'Batch extract transcripts from multiple sources (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { source_url: { type: 'string' }, language: { type: 'string' } }, required: ['source_url'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: {
            '200': {
              description: 'Batch transcript results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      batch_count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object', properties: { source_url: { type: 'string' }, text: { type: 'string' }, word_count: { type: 'integer' }, language: { type: 'string' }, success: { type: 'boolean' }, error: { type: 'string' } } } },
                      ...chainFields,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
