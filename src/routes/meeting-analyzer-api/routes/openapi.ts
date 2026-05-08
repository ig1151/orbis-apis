import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

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
          responses: {
            '200': {
              description: 'Extracted action items',
              content: { 'application/json': { schema: { type: 'object', properties: {
                action_items: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, owner: { type: 'string' }, due_date: { type: 'string' }, priority: { type: 'string', enum: ['high','medium','low'] }, dependencies: actions } } },
                total_count: { type: 'number' },
                by_owner: { type: 'array', items: { type: 'object', properties: { owner: { type: 'string' }, count: { type: 'number' }, items: actions } } },
                overdue_risk: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, risk_reason: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/summarize-meeting': {
        post: {
          operationId: 'summarizeMeeting',
          summary: 'Executive summary, key points, topics covered, decisions and open questions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, audience: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Meeting summary',
              content: { 'application/json': { schema: { type: 'object', properties: {
                executive_summary: { type: 'string' },
                key_points: actions,
                topics_covered: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, time_spent: { type: 'string' }, outcome: { type: 'string' } } } },
                decisions_made: actions,
                open_questions: actions,
                sentiment: { type: 'object', properties: { overall: { type: 'string', enum: ['positive','neutral','negative','mixed'] }, energy_level: { type: 'string', enum: ['high','medium','low'] }, alignment: { type: 'string', enum: ['high','medium','low'] } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/extract-decisions': {
        post: {
          operationId: 'extractDecisions',
          summary: 'Extract all decisions, deferred items and contested points',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Extracted decisions',
              content: { 'application/json': { schema: { type: 'object', properties: {
                decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, rationale: { type: 'string' }, decided_by: { type: 'string' }, impact: { type: 'string', enum: ['high','medium','low'] }, reversible: { type: 'boolean' } } } },
                total_count: { type: 'number' },
                deferred_decisions: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, reason: { type: 'string' }, next_step: { type: 'string' } } } },
                contested_points: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, perspectives: actions } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/follow-up-email': {
        post: {
          operationId: 'followUpEmail',
          summary: 'Generate ready-to-send follow-up email with subject, body and send timing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, sender_name: { type: 'string' }, recipient_type: { type: 'string' }, meeting_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Follow-up email content',
              content: { 'application/json': { schema: { type: 'object', properties: {
                subject_line: { type: 'string' },
                email_body: { type: 'string' },
                tone: { type: 'string', enum: ['formal','semi-formal','casual'] },
                key_callouts: actions,
                alternative_subjects: actions,
                send_timing: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/sentiment-analysis': {
        post: {
          operationId: 'sentimentAnalysis',
          summary: 'Meeting sentiment, participant engagement, tension points and health score',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, meeting_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Sentiment analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                overall_sentiment: { type: 'object', properties: { score: { type: 'number', minimum: -1, maximum: 1 }, label: { type: 'string', enum: ['very_positive','positive','neutral','negative','very_negative'] }, summary: { type: 'string' } } },
                participant_sentiment: { type: 'array', items: { type: 'object', properties: { participant: { type: 'string' }, sentiment: { type: 'string' }, engagement: { type: 'string', enum: ['high','medium','low'] }, key_moments: actions } } },
                tension_points: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, intensity: { type: 'string', enum: ['high','medium','low'] }, resolution: { type: 'string', enum: ['resolved','unresolved','deferred'] } } } },
                engagement_signals: { type: 'object', properties: { most_engaged: { type: 'string' }, least_engaged: { type: 'string' }, dominant_speaker: { type: 'string' } } },
                meeting_health: { type: 'object', properties: { score: { type: 'number' }, psychological_safety: { type: 'string', enum: ['high','medium','low'] }, recommendations: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/risk-flags': {
        post: {
          operationId: 'riskFlags',
          summary: 'Identify risks, blockers, unresolved issues and escalation needs',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, project_context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Risk flags result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                risk_flags: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, category: { type: 'string', enum: ['timeline','budget','scope','people','technical','compliance'] }, severity: { type: 'string', enum: ['critical','high','medium','low'] }, mitigation: { type: 'string' } } } },
                blockers: { type: 'array', items: { type: 'object', properties: { blocker: { type: 'string' }, owner: { type: 'string' }, impact: { type: 'string' }, resolution_path: { type: 'string' } } } },
                unresolved_issues: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, open_since: { type: 'string' }, next_step: { type: 'string' } } } },
                escalation_needed: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, escalate_to: { type: 'string' }, urgency: { type: 'string', enum: ['immediate','soon','when_possible'] } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/agenda-generator': {
        post: {
          operationId: 'agendaGenerator',
          summary: 'Generate structured meeting agenda with timing, owners and success criteria',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['meeting_objective'], properties: { meeting_objective: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, duration_minutes: { type: 'number' }, previous_transcript: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Generated meeting agenda',
              content: { 'application/json': { schema: { type: 'object', properties: {
                agenda: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, duration_minutes: { type: 'number' }, owner: { type: 'string' }, type: { type: 'string', enum: ['discussion','decision','update','brainstorm'] }, materials_needed: actions } } },
                total_duration: { type: 'number' },
                pre_read_materials: actions,
                success_criteria: actions,
                parking_lot_topics: actions,
                recommended_attendees: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing meeting_objective' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check with blocking flags and next API chaining',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execution_ready: { type: 'boolean' },
                meeting_type: { type: 'string' },
                transcript_length: { type: 'number' },
                next_api: { type: 'string' },
                next_endpoint: { type: 'string' },
                blocking_flags: { type: 'array', items: { type: 'string' } },
                flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                confidence_per_section: confidence,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Gate check failed' },
          },
        },
      },
      '/analyze-meeting': {
        post: {
          operationId: 'analyzeMeeting',
          summary: 'ONE-CALL: full meeting workflow — summary, actions, decisions, risks, sentiment and follow-up email',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transcript'], properties: { transcript: { type: 'string' }, meeting_type: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, sender_name: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full meeting analysis report',
              content: { 'application/json': { schema: { type: 'object', properties: {
                executive_summary: { type: 'string' },
                meeting_health: { type: 'object', properties: { score: { type: 'number' }, grade: { type: 'string' }, effectiveness: { type: 'string' } } },
                action_items: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, owner: { type: 'string' }, due_date: { type: 'string' }, priority: { type: 'string', enum: ['high','medium','low'] } } } },
                decisions: actions,
                risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, severity: { type: 'string', enum: ['high','medium','low'] }, mitigation: { type: 'string' } } } },
                sentiment: { type: 'object', properties: { overall: { type: 'string', enum: ['positive','neutral','negative','mixed'] }, alignment: { type: 'string', enum: ['high','medium','low'] } } },
                follow_up_email: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } } },
                next_steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, owner: { type: 'string' }, timeline: { type: 'string' } } } },
                open_questions: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing transcript' }, '500': { description: 'Analysis failed' },
          },
        },
      },
    },
  });
});

export default router;
