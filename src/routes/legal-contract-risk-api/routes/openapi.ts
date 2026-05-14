import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const legalMeta = {
  legal_disclaimer: { type: 'string' },
  requires_licensed_attorney_review: { type: 'boolean' },
  jurisdiction_scope: { type: 'object', properties: { coverage: { type: 'string' }, limitations: actions, recommended_review: { type: 'string' } } },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Legal Contract Risk API',
      version: '1.0.0',
      description: 'Extract clauses, score risk, flag dangerous terms, identify missing protections, compare contracts, and generate negotiation strategies. Replaces expensive legal reasoning at agent call speed.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/legal-contract-risk' }],
    paths: {
      '/extract-clauses': {
        post: {
          operationId: 'extractClauses',
          summary: 'Extract all clauses from a contract with category, importance, and text excerpts',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, contract_type: { type: 'string' }, jurisdiction: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Extracted contract clauses',
              content: { 'application/json': { schema: { type: 'object', properties: {
                clauses: { type: 'array', items: { type: 'object', properties: { clause_id: { type: 'string' }, title: { type: 'string' }, category: { type: 'string' }, text_excerpt: { type: 'string' }, citation: { type: 'object', properties: { char_start: { type: 'number', nullable: true }, char_end: { type: 'number', nullable: true }, page_ref: { type: 'string', nullable: true }, section_ref: { type: 'string', nullable: true } } }, importance: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } } } },
                total_clauses: { type: 'number' },
                categories_found: actions,
                contract_type_detected: { type: 'string' },
                jurisdiction_detected: { type: 'string', nullable: true },
                contract_summary: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Extraction failed' },
          },
        },
      },
      '/risk-score': {
        post: {
          operationId: 'riskScore',
          summary: 'Score overall contract risk by category from a specific party perspective with sign recommendation',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, party_role: { type: 'string' }, contract_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Contract risk score and signing recommendation',
              content: { 'application/json': { schema: { type: 'object', properties: {
                overall_risk_score: { type: 'number', minimum: 0, maximum: 100 },
                risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                risk_grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
                risk_by_category: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, score: { type: 'number' }, level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, primary_risk: { type: 'string' } } } },
                top_risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, category: { type: 'string' }, impact: { type: 'string' }, likelihood: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                favorable_terms: actions,
                unfavorable_terms: actions,
                balance_assessment: { type: 'string', enum: ['strongly_favorable', 'favorable', 'balanced', 'unfavorable', 'strongly_unfavorable'] },
                sign_recommendation: { type: 'string', enum: ['safe_to_sign', 'review_first', 'negotiate', 'do_not_sign'] },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Scoring failed' },
          },
        },
      },
      '/flag-risks': {
        post: {
          operationId: 'flagRisks',
          summary: 'Flag risky clauses with severity, explanation, impact, and suggested revision language',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, party_role: { type: 'string' }, risk_categories: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Risk flags with suggested revisions',
              content: { 'application/json': { schema: { type: 'object', properties: {
                risk_flags: { type: 'array', items: { type: 'object', properties: { clause_title: { type: 'string' }, risk_type: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, text_excerpt: { type: 'string' }, explanation: { type: 'string' }, impact: { type: 'string' }, suggested_revision: { type: 'string' } } } },
                critical_count: { type: 'number' },
                high_count: { type: 'number' },
                medium_count: { type: 'number' },
                low_count: { type: 'number' },
                red_flags: actions,
                immediate_action_required: { type: 'boolean' },
                categories_checked: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/missing-clauses': {
        post: {
          operationId: 'missingClauses',
          summary: 'Identify standard clauses missing from the contract with risk of omission and suggested language',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, contract_type: { type: 'string' }, jurisdiction: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Missing clause analysis',
              content: { 'application/json': { schema: { type: 'object', properties: {
                missing_clauses: { type: 'array', items: { type: 'object', properties: { clause_name: { type: 'string' }, importance: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, why_needed: { type: 'string' }, risk_of_omission: { type: 'string' }, suggested_language: { type: 'string' } } } },
                present_standard_clauses: actions,
                completeness_score: { type: 'number' },
                critical_missing_count: { type: 'number' },
                high_missing_count: { type: 'number' },
                most_urgent_addition: { type: 'string' },
                industry_standard_gaps: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/compare-contracts': {
        post: {
          operationId: 'compareContracts',
          summary: 'Compare two contracts for material differences, identify which is more favorable, and surface negotiation gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract_a', 'contract_b'], properties: { contract_a: { type: 'string' }, contract_b: { type: 'string' }, comparison_focus: { type: 'string', enum: ['all', 'financial', 'termination', 'liability', 'ip'] } } } } } },
          responses: {
            '200': {
              description: 'Contract comparison result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                material_differences: { type: 'array', items: { type: 'object', properties: { clause: { type: 'string' }, contract_a_position: { type: 'string' }, contract_b_position: { type: 'string' }, significance: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, favors: { type: 'string', enum: ['contract_a', 'contract_b', 'neutral'] } } } },
                clauses_only_in_a: actions,
                clauses_only_in_b: actions,
                matching_clauses: actions,
                overall_similarity_pct: { type: 'number' },
                better_for_buyer: { type: 'string', enum: ['contract_a', 'contract_b', 'equivalent'] },
                key_negotiation_differences: actions,
                recommendation: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract_a or contract_b' }, '500': { description: 'Comparison failed' },
          },
        },
      },
      '/summarize-contract': {
        post: {
          operationId: 'summarizeContract',
          summary: 'Executive summary of contract terms including parties, key dates, payment terms, and obligations',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, audience: { type: 'string', enum: ['executive', 'legal', 'technical', 'non-technical'] }, contract_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Contract summary',
              content: { 'application/json': { schema: { type: 'object', properties: {
                executive_summary: { type: 'string' },
                parties: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, obligations: actions } } },
                key_terms: { type: 'array', items: { type: 'object', properties: { term: { type: 'string' }, value: { type: 'string' }, notes: { type: 'string' } } } },
                effective_date: { type: 'string', nullable: true },
                expiration_date: { type: 'string', nullable: true },
                renewal_terms: { type: 'string', nullable: true },
                payment_terms: { type: 'string', nullable: true },
                termination_conditions: actions,
                key_obligations: { type: 'array', items: { type: 'object', properties: { party: { type: 'string' }, obligation: { type: 'string' }, deadline: { type: 'string', nullable: true } } } },
                governing_law: { type: 'string', nullable: true },
                important_dates: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Summarization failed' },
          },
        },
      },
      '/negotiation-points': {
        post: {
          operationId: 'negotiationPoints',
          summary: 'Identify negotiation opportunities, walk-away conditions, leverage points, and concessions to offer',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, party_role: { type: 'string' }, priorities: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Negotiation strategy',
              content: { 'application/json': { schema: { type: 'object', properties: {
                negotiation_points: { type: 'array', items: { type: 'object', properties: { clause: { type: 'string' }, current_language: { type: 'string' }, proposed_change: { type: 'string' }, rationale: { type: 'string' }, priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, likelihood_of_success: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                walk_away_conditions: actions,
                quick_wins: actions,
                leverage_points: actions,
                concessions_to_offer: actions,
                recommended_negotiation_sequence: actions,
                overall_negotiation_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before contract signing with recommended analysis workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, party_role: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execution_ready: { type: 'boolean' },
                party_role: { type: 'string' },
                contract_length: { type: 'number' },
                recommended_workflow: actions,
                next_api: { type: 'string' },
                next_endpoint: { type: 'string' },
                blocking_flags: actions,
                flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                confidence_per_section: confidence,
                privacy,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Gate check failed' },
          },
        },
      },
      '/analyze-contract': {
        post: {
          operationId: 'analyzeContract',
          summary: 'ONE-CALL: full contract analysis — risk score, top risks, missing clauses, negotiation points, and signing recommendation',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, party_role: { type: 'string' }, contract_type: { type: 'string' }, jurisdiction: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full contract analysis report',
              content: { 'application/json': { schema: { type: 'object', properties: {
                executive_summary: { type: 'string' },
                overall_risk_score: { type: 'number' },
                risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                sign_recommendation: { type: 'string', enum: ['safe_to_sign', 'review_first', 'negotiate', 'do_not_sign'] },
                top_risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, clause: { type: 'string' } } } },
                missing_critical_clauses: actions,
                top_negotiation_points: { type: 'array', items: { type: 'object', properties: { clause: { type: 'string' }, change: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                key_terms: { type: 'array', items: { type: 'object', properties: { term: { type: 'string' }, value: { type: 'string' } } } },
                effective_date: { type: 'string', nullable: true },
                expiration_date: { type: 'string', nullable: true },
                governing_law: { type: 'string', nullable: true },
                parties: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } } },
                immediate_action_items: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
                ...legalMeta,
              } } } },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Analysis failed' },
          },
        },
      },
    },
  });
});

export default router;
