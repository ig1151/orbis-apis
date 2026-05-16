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

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Audio Transcription API',
      version: '2.0.0',
      description: 'Transcribe audio files with emotion analysis, meeting intelligence, and timestamped segments for voice-driven automation agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 50, requests_per_month: 1500 },
        pay_per_call: { transcribe: '$0.004', timestamps: '$0.005', summary: '$0.004', 'execution-gate': '$0.001', analyze: '$0.009', 'emotion-analysis': '$0.005', 'meeting-intelligence': '$0.007', batch: '$0.015' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/audio-transcription' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/transcribe': {
        post: {
          operationId: 'transcribeAudio',
          summary: 'Transcribe audio file to text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, language: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Transcription result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      transcription: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string' }, word_count: { type: 'integer' }, duration_seconds: { type: 'number' }, confidence: { type: 'number', minimum: 0, maximum: 1 } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/timestamps': {
        post: {
          operationId: 'transcribeWithTimestamps',
          summary: 'Transcribe audio with word-level and segment timestamps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Timestamped transcript',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      timestamped_transcript: { type: 'object', properties: { segments: { type: 'array', items: { type: 'object', properties: { start_seconds: { type: 'number' }, end_seconds: { type: 'number' }, text: { type: 'string' }, confidence: { type: 'number' } } } }, word_timestamps: { type: 'array', items: { type: 'object', properties: { word: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' } } } }, language: { type: 'string' }, duration_seconds: { type: 'number' } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/summary': {
        post: {
          operationId: 'audioSummary',
          summary: 'Transcribe and summarize audio into bullet points and key topics',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Audio summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      summary: { type: 'object', properties: { paragraph: { type: 'string' }, bullet_points: { type: 'array', items: { type: 'string' } }, key_topics: { type: 'array', items: { type: 'string' } }, action_items: { type: 'array', items: { type: 'string' } }, duration_seconds: { type: 'number' } } },
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
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Gate result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy },
                  },
                },
              },
            },
          },
        },
      },
      '/analyze': {
        post: {
          operationId: 'analyzeAudio',
          summary: 'ONE-CALL: full audio intelligence — transcript + speakers + sentiment + action items',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full audio intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      transcription: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string' }, duration_seconds: { type: 'number' } } },
                      timestamped_segments: { type: 'array', items: { type: 'object', properties: { start_seconds: { type: 'number' }, end_seconds: { type: 'number' }, text: { type: 'string' } } } },
                      speakers: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, talk_time_seconds: { type: 'number' } } } },
                      summary: { type: 'string' },
                      action_items: { type: 'array', items: { type: 'string' } },
                      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                      topics: { type: 'array', items: { type: 'string' } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/emotion-analysis': {
        post: {
          operationId: 'emotionAnalysis',
          summary: 'Analyze emotional tone and speaker emotions in audio',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Emotion analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      emotions: { type: 'object', properties: { frustration_score: { type: 'number', minimum: 0, maximum: 1 }, confidence_score: { type: 'number', minimum: 0, maximum: 1 }, engagement_score: { type: 'number', minimum: 0, maximum: 1 } } },
                      speaker_segments: { type: 'array', items: { type: 'object', properties: { speaker: { type: 'string' }, start_seconds: { type: 'number' }, end_seconds: { type: 'number' }, emotions: { type: 'object', properties: { frustration_score: { type: 'number' }, confidence_score: { type: 'number' }, engagement_score: { type: 'number' } } } } } },
                      overall_tone: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/meeting-intelligence': {
        post: {
          operationId: 'meetingIntelligence',
          summary: 'Extract action items, decisions, and participants from meeting audio',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Meeting intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      audio_url: { type: 'string' },
                      action_items: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, owner: { type: 'string' }, due_date: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                      decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, made_by: { type: 'string' }, context: { type: 'string' } } } },
                      participants: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, talk_time_pct: { type: 'number' } } } },
                      follow_ups: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, assigned_to: { type: 'string' }, deadline: { type: 'string' } } } },
                      meeting_summary: { type: 'string' },
                      key_topics: { type: 'array', items: { type: 'string' } },
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
          operationId: 'batchTranscribe',
          summary: 'Batch transcribe multiple audio files (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { audio_url: { type: 'string' }, language: { type: 'string' } }, required: ['audio_url'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: {
            '200': {
              description: 'Batch transcription results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      batch_count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object', properties: { audio_url: { type: 'string' }, transcription: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string' }, word_count: { type: 'integer' }, duration_seconds: { type: 'number' }, confidence: { type: 'number' } } }, success: { type: 'boolean' }, error: { type: 'string' } } } },
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
