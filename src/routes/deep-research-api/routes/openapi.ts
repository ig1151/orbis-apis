import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Deep Research API',
      version: '1.0.0',
      description: 'AI-powered deep research synthesis for autonomous agents — research topics cross-source, extract facts, compare sources, score credibility, build timelines, generate citations and synthesize full research reports',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/deep-research' }],
    paths: {
      '/research-topic': {
        post: {
          operationId: 'researchTopic',
          summary: 'Cross-source research synthesis with key findings, subtopics, gaps and contradictions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, depth: { type: 'string', enum: ['surface','standard','deep'] }, sources: { type: 'array', items: { type: 'string' } }, focus_areas: { type: 'array', items: { type: 'string' } }, max_sources: { type: 'number' } } } } } },
          responses: {
            '200': {
              description: 'Research synthesis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                topic: { type: 'string' },
                summary: { type: 'string' },
                key_findings: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, supporting_sources: actions, consensus_level: { type: 'string', enum: ['high','medium','low','disputed'] } } } },
                subtopics: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, coverage: { type: 'string', enum: ['thorough','moderate','sparse'] }, key_points: actions } } },
                knowledge_gaps: { type: 'array', items: { type: 'object', properties: { gap: { type: 'string' }, importance: { type: 'string', enum: ['high','medium','low'] }, research_suggestion: { type: 'string' } } } },
                contradictions: { type: 'array', items: { type: 'object', properties: { claim_a: { type: 'string' }, claim_b: { type: 'string' }, resolution: { type: 'string' } } } },
                research_quality: { type: 'object', properties: { score: { type: 'number', minimum: 0, maximum: 100 }, strengths: actions, limitations: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing topic' }, '500': { description: 'Research failed' },
          },
        },
      },
      '/extract-facts': {
        post: {
          operationId: 'extractFacts',
          summary: 'Extract verified facts with type, confidence, verbatim quotes and entity recognition',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' }, fact_types: { type: 'array', items: { type: 'string' } }, min_confidence: { type: 'number' }, source_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Extracted facts result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                facts: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, fact_type: { type: 'string', enum: ['statistic','claim','date','entity','relationship','definition'] }, confidence: { type: 'number', minimum: 0, maximum: 1 }, verbatim_quote: { type: 'string' }, verifiable: { type: 'boolean' } } } },
                total_facts: { type: 'number' },
                high_confidence_facts: { type: 'number' },
                entities_mentioned: { type: 'array', items: { type: 'object', properties: { entity: { type: 'string' }, type: { type: 'string', enum: ['person','org','location','product','event','concept'] }, role: { type: 'string' } } } },
                temporal_markers: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, certainty: { type: 'string', enum: ['exact','approximate','relative'] } } } },
                source_quality_indicators: { type: 'object', properties: { specificity: { type: 'number', minimum: 0, maximum: 1 }, recency_signals: actions, authority_signals: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing content' }, '500': { description: 'Extraction failed' },
          },
        },
      },
      '/compare-sources': {
        post: {
          operationId: 'compareSources',
          summary: 'Compare multiple sources for consensus, divergence, unique insights and quality ranking',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sources'], properties: { sources: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, url: { type: 'string' }, date: { type: 'string' } } } }, comparison_angle: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Source comparison result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                sources_analyzed: { type: 'number' },
                consensus_claims: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, sources_agreeing: actions, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
                divergent_claims: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, source_positions: { type: 'array', items: { type: 'object', properties: { source_id: { type: 'string' }, position: { type: 'string' } } } }, divergence_reason: { type: 'string' } } } },
                unique_insights: { type: 'array', items: { type: 'object', properties: { source_id: { type: 'string' }, insight: { type: 'string' }, value: { type: 'string', enum: ['high','medium','low'] } } } },
                source_quality_ranking: { type: 'array', items: { type: 'object', properties: { source_id: { type: 'string' }, title: { type: 'string' }, quality_score: { type: 'number', minimum: 0, maximum: 100 }, strengths: actions, weaknesses: actions } } },
                synthesis: { type: 'string' },
                recommendation: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing sources' }, '500': { description: 'Comparison failed' },
          },
        },
      },
      '/credibility-analysis': {
        post: {
          operationId: 'credibilityAnalysis',
          summary: 'Score source credibility with bias detection, quality signals and recommended use',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content_sample'], properties: { source_url: { type: 'string' }, source_title: { type: 'string' }, author: { type: 'string' }, content_sample: { type: 'string' }, publication_date: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Credibility analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                credibility_score: { type: 'number', minimum: 0, maximum: 100 },
                credibility_tier: { type: 'string', enum: ['authoritative','reliable','mixed','questionable','unreliable'] },
                bias_indicators: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['political','commercial','cultural','confirmation'] }, severity: { type: 'string', enum: ['high','medium','low'] }, evidence: { type: 'string' } } } },
                quality_signals: { type: 'object', properties: { author_expertise: { type: 'string', enum: ['high','medium','low','unknown'] }, citations_present: { type: 'boolean' }, methodology_transparent: { type: 'boolean' }, peer_reviewed: { type: 'boolean' }, publication_reputation: { type: 'string' } } },
                red_flags: actions,
                trust_factors: actions,
                recommended_use: { type: 'string', enum: ['primary_source','supporting_source','background_only','avoid'] },
                fact_check_items: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, verification_priority: { type: 'string', enum: ['high','medium','low'] } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing content_sample' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/timeline-builder': {
        post: {
          operationId: 'timelineBuilder',
          summary: 'Build chronological timeline with events, turning points, patterns and future projections',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content','topic'], properties: { content: { type: 'string' }, topic: { type: 'string' }, timeline_type: { type: 'string', enum: ['chronological','causal','predictive'] }, start_date: { type: 'string' }, end_date: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Timeline result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                topic: { type: 'string' },
                timeline_type: { type: 'string' },
                events: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, significance: { type: 'string', enum: ['pivotal','major','minor'] }, actors: actions, consequences: actions, certainty: { type: 'string', enum: ['confirmed','probable','speculative'] } } } },
                total_events: { type: 'number' },
                date_range: { type: 'object', properties: { earliest: { type: 'string' }, latest: { type: 'string' }, span: { type: 'string' } } },
                turning_points: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, reason: { type: 'string' } } } },
                patterns: { type: 'array', items: { type: 'object', properties: { pattern: { type: 'string' }, period: { type: 'string' }, implications: { type: 'string' } } } },
                future_projections: { type: 'array', items: { type: 'object', properties: { timeframe: { type: 'string' }, prediction: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing content or topic' }, '500': { description: 'Timeline build failed' },
          },
        },
      },
      '/citation-builder': {
        post: {
          operationId: 'citationBuilder',
          summary: 'Format citations in APA, MLA, Chicago and Harvard styles with bibliography and in-text examples',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sources'], properties: { sources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, author: { type: 'string' }, url: { type: 'string' }, publication: { type: 'string' }, date: { type: 'string' }, accessed_date: { type: 'string' } } } }, citation_style: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Citations result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                citations: { type: 'array', items: { type: 'object', properties: { source_index: { type: 'number' }, title: { type: 'string' }, apa: { type: 'string' }, mla: { type: 'string' }, chicago: { type: 'string' }, harvard: { type: 'string' }, url_formatted: { type: 'string' } } } },
                bibliography_apa: { type: 'string' },
                bibliography_mla: { type: 'string' },
                in_text_examples: { type: 'array', items: { type: 'object', properties: { source_index: { type: 'number' }, apa: { type: 'string' }, mla: { type: 'string' } } } },
                source_count: { type: 'number' },
                formatting_notes: actions,
                missing_fields: { type: 'array', items: { type: 'object', properties: { source_index: { type: 'number' }, fields: actions } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing sources' }, '500': { description: 'Citation formatting failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'researchExecutionGate',
          summary: 'Gate research execution based on quality, completeness and risk score',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['research_context','intended_action'], properties: { research_context: { type: 'object' }, intended_action: { type: 'string' }, quality_threshold: { type: 'number' }, source_count: { type: 'number' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execute: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                blocking_flags: actions,
                warnings: actions,
                risk_score: { type: 'number', minimum: 0, maximum: 1 },
                recommended_action: { type: 'string' },
                chain_to: actions,
                research_quality: { type: 'string', enum: ['sufficient','marginal','insufficient'] },
                retry_after: { type: 'string', nullable: true },
                privacy,
              } } } },
            },
            '400': { description: 'Missing research_context or intended_action' }, '500': { description: 'Gate check failed' },
          },
        },
      },
      '/deep-research': {
        post: {
          operationId: 'deepResearch',
          summary: 'ONE-CALL: full research workflow — findings, facts, timeline, contradictions, gaps and report',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, depth: { type: 'string', enum: ['standard','deep','exhaustive'] }, focus_areas: { type: 'array', items: { type: 'string' } }, output_format: { type: 'string', enum: ['report','bullets','structured'] } } } } } },
          responses: {
            '200': {
              description: 'Full deep research report',
              content: { 'application/json': { schema: { type: 'object', properties: {
                research_id: { type: 'string' },
                topic: { type: 'string' },
                executive_summary: { type: 'string' },
                key_findings: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, importance: { type: 'string', enum: ['critical','high','medium','low'] } } } },
                fact_inventory: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, verifiable: { type: 'boolean' } } } },
                timeline: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, significance: { type: 'string', enum: ['pivotal','major','minor'] } } } },
                contradictions: { type: 'array', items: { type: 'object', properties: { claim_a: { type: 'string' }, claim_b: { type: 'string' }, resolution: { type: 'string' } } } },
                knowledge_gaps: actions,
                sources_synthesized: { type: 'number' },
                research_quality_score: { type: 'number', minimum: 0, maximum: 100 },
                report: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing topic' }, '500': { description: 'Research failed' },
          },
        },
      },
    },
  });
});

export default router;
