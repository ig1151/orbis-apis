import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Meeting Analyzer API',
      version: '1.0.0',
      description: 'AI-powered meeting analysis, action item extraction, decision tracking and follow-up automation for autonomous agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/meeting-analyzer' }],
    paths: {
      '/extract-action-items': {
        post: {
          operationId: 'extractActionItems',
          summary: 'Extract action items from transcript with owner, due date and priority',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': { description: 'Action items by owner with overdue risk flags' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/summarize-meeting': {
        post: {
          operationId: 'summarizeMeeting',
          summary: 'Executive summary, key points, topics covered, decisions and open questions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, audience: { type: 'string' } } } } } },
          responses: { '200': { description: 'Meeting summary with key points, decisions, open questions and sentiment' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/extract-decisions': {
        post: {
          operationId: 'extractDecisions',
          summary: 'Extract all decisions, deferred items and contested points from transcript',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' } } } } } },
          responses: { '200': { description: 'Decisions with rationale, deferred items and contested points' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/follow-up-email': {
        post: {
          operationId: 'followUpEmail',
          summary: 'Generate ready-to-send follow-up email with subject, body and send timing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, sender_name: { type: 'string' }, recipient_type: { type: 'string' }, meeting_type: { type: 'string' } } } } } },
          responses: { '200': { description: 'Follow-up email with subject, body, tone and send timing' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/sentiment-analysis': {
        post: {
          operationId: 'sentimentAnalysis',
          summary: 'Meeting sentiment, participant engagement, tension points and meeting health score',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, meeting_type: { type: 'string' } } } } } },
          responses: { '200': { description: 'Sentiment analysis with participant breakdown, tension points and meeting health score' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/risk-flags': {
        post: {
          operationId: 'riskFlags',
          summary: 'Identify risks, blockers, unresolved issues and escalation needs from transcript',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, project_context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Risk flags with severity, blockers, unresolved issues and escalation needs' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/agenda-generator': {
        post: {
          operationId: 'agendaGenerator',
          summary: 'Generate structured meeting agenda with timing, owners and success criteria',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['meeting_objective'], properties: { meeting_objective: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, duration_minutes: { type: 'number' }, previous_transcript: { type: 'string' } } } } } },
          responses: { '200': { description: 'Structured agenda with timings, owners, success criteria and pre-reads' }, '400': { description: 'Missing meeting_objective' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check with blocking flags and next API chaining',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution readiness, blocking flags and next API recommendation' }, '400': { description: 'Missing transcript' }, '500': { description: 'Gate check failed' } },
        },
      },
      '/analyze-meeting': {
        post: {
          operationId: 'analyzeMeeting',
          summary: 'ONE-CALL: full meeting workflow — summary, actions, decisions, risks, sentiment and follow-up email',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, sender_name: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full meeting report: summary, action items, decisions, risks, sentiment, follow-up email and next steps' }, '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
