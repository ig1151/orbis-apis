import { Router, Request, Response } from 'express';
const router = Router();

const privacy = {
  type: 'object',
  properties: {
    data_stored: { type: 'boolean' },
    retention: { type: 'string' },
  },
};
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const strArr = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Supply Chain Risk API',
      version: '1.0.0',
      description:
        'Assess supplier risk, model disruption scenarios, map geopolitical exposure, quantify concentration risk, analyze logistics dependencies, and generate full supply chain intelligence reports.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        supplier_risk: 0.007,
        disruption_analysis: 0.007,
        geopolitical_exposure: 0.008,
        concentration_risk: 0.006,
        logistics_analysis: 0.006,
        dependency_mapping: 0.007,
        execution_gate: 0.001,
        assess: 0.014,
        high_volume_discount: '~35%',
        notes: 'High-volume discounts available. Contact for enterprise pricing.',
      },
    },
    servers: [
      {
        url: 'https://orbis-apis.onrender.com/supply-chain-risk',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        OverallSupplyRisk: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        Privacy: privacy,
        ConfidencePerSection: confidence,
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/supplier-risk': {
        post: {
          operationId: 'supplierRisk',
          summary: 'Assess risk profile of a company\'s key suppliers including financial, operational, and geopolitical exposure',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  oneOf: [
                    {
                      required: ['company'],
                      properties: {
                        company: { type: 'string', description: 'Company name to assess supplier risk for' },
                        tier: { type: 'number', description: 'Supplier tier depth to analyze (default: 1)' },
                      },
                    },
                    {
                      required: ['suppliers'],
                      properties: {
                        suppliers: {
                          oneOf: [
                            { type: 'string', description: 'Comma-separated supplier names' },
                            { type: 'array', items: { type: 'string' }, description: 'List of supplier names' },
                          ],
                        },
                        company: { type: 'string', description: 'Buying company for context' },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Supplier risk assessment with individual and aggregate ratings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      supplier_assessments: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            supplier_name: { type: 'string' },
                            risk_score: { type: 'number', minimum: 0, maximum: 100 },
                            overall_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                            financial_risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            operational_risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            geopolitical_risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            key_risks: strArr,
                            single_source_flag: { type: 'boolean' },
                          },
                        },
                      },
                      aggregate_risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      overall_supply_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      critical_suppliers: strArr,
                      high_risk_suppliers: strArr,
                      recommended_actions: strArr,
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company or suppliers' },
            '500': { description: 'Assessment failed' },
          },
        },
      },
      '/disruption-analysis': {
        post: {
          operationId: 'disruptionAnalysis',
          summary: 'Model supply chain disruption scenarios and quantify business impact for a company',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to model disruption scenarios for' },
                    supply_chain_data: {
                      type: 'string',
                      description: 'Optional supply chain description or filing text for more accurate modeling',
                    },
                    disruption_types: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Disruption types to model, e.g. ["natural_disaster", "geopolitical", "cyber", "logistics"]',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Disruption scenario analysis with impact quantification and mitigation strategies',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      disruption_scenarios: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            scenario: { type: 'string' },
                            type: { type: 'string' },
                            probability: { type: 'string', enum: ['very_high', 'high', 'moderate', 'low', 'very_low'] },
                            impact_severity: { type: 'string', enum: ['catastrophic', 'severe', 'moderate', 'minor'] },
                            estimated_downtime_days: { type: 'number', nullable: true },
                            revenue_at_risk_pct: { type: 'number', nullable: true },
                            recovery_complexity: { type: 'string', enum: ['very_high', 'high', 'moderate', 'low'] },
                            mitigation_strategies: strArr,
                          },
                        },
                      },
                      highest_probability_disruption: { type: 'string' },
                      highest_impact_disruption: { type: 'string' },
                      overall_disruption_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      top_mitigation_priorities: strArr,
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/geopolitical-exposure': {
        post: {
          operationId: 'geopoliticalExposure',
          summary: 'Map geopolitical risk exposure across a company\'s supply chain countries and regions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to assess geopolitical exposure for' },
                    suppliers: {
                      oneOf: [
                        { type: 'string', description: 'Known supplier names or regions as text' },
                        { type: 'array', items: { type: 'string' }, description: 'List of supplier names or countries' },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Geopolitical risk map with country/region exposure and escalation scenarios',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      geopolitical_risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      overall_exposure: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      country_exposures: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            country: { type: 'string' },
                            region: { type: 'string' },
                            risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            risk_factors: strArr,
                            supply_dependency_pct: { type: 'number', nullable: true },
                            active_tensions: { type: 'boolean' },
                            sanctions_risk: { type: 'boolean' },
                          },
                        },
                      },
                      high_risk_regions: strArr,
                      active_conflict_exposure: { type: 'boolean' },
                      sanctions_exposure: { type: 'boolean' },
                      diversification_recommendations: strArr,
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/concentration-risk': {
        post: {
          operationId: 'concentrationRisk',
          summary: 'Quantify supplier, geographic, and category concentration risk and single points of failure',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to assess concentration risk for' },
                    industry: { type: 'string', description: 'Industry for benchmarking concentration levels' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Concentration risk report with single-source flags and diversification gaps',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      concentration_risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      overall_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      supplier_concentration: {
                        type: 'object',
                        properties: {
                          top_supplier_share_pct: { type: 'number', nullable: true },
                          top_3_supplier_share_pct: { type: 'number', nullable: true },
                          single_source_categories: strArr,
                          hhi_score: { type: 'number', nullable: true, description: 'Herfindahl-Hirschman Index' },
                        },
                      },
                      geographic_concentration: {
                        type: 'object',
                        properties: {
                          top_country_share_pct: { type: 'number', nullable: true },
                          single_country_dependencies: strArr,
                        },
                      },
                      critical_single_points_of_failure: strArr,
                      diversification_score: { type: 'number', minimum: 0, maximum: 100 },
                      recommended_diversification: strArr,
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/logistics-analysis': {
        post: {
          operationId: 'logisticsAnalysis',
          summary: 'Analyze logistics network risk including transportation modes, chokepoints, and lead time vulnerabilities',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to assess logistics network for' },
                    transportation_modes: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Known modes, e.g. ["ocean", "air", "rail", "truck"]',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Logistics risk analysis with chokepoints, lead time risks, and contingency options',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      logistics_risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      overall_logistics_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      transportation_risks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            mode: { type: 'string' },
                            risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            key_vulnerabilities: strArr,
                            alternative_available: { type: 'boolean' },
                          },
                        },
                      },
                      critical_chokepoints: strArr,
                      average_lead_time_risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                      port_dependency_risk: { type: 'boolean' },
                      contingency_options: strArr,
                      recommended_actions: strArr,
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/dependency-mapping': {
        post: {
          operationId: 'dependencyMapping',
          summary: 'Generate a structured supply chain dependency map with tier relationships and risk nodes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to map supply chain dependencies for' },
                    depth: { type: 'number', description: 'Tier depth to map (default: 2, max: 3)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Supply chain dependency map with tier relationships and risk nodes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      dependency_map: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tier: { type: 'number' },
                            entity: { type: 'string' },
                            category: { type: 'string' },
                            dependency_type: {
                              type: 'string',
                              enum: ['sole_source', 'primary', 'secondary', 'tertiary'],
                            },
                            risk_node: { type: 'boolean' },
                            risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            parent_entity: { type: 'string', nullable: true },
                          },
                        },
                      },
                      total_nodes: { type: 'number' },
                      critical_nodes: { type: 'number' },
                      risk_node_entities: strArr,
                      overall_supply_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Mapping failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Pre-flight readiness check before running supply chain analysis — routes to optimal endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to check analysis readiness for' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Execution gate result with recommended workflow',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execution_ready: { type: 'boolean' },
                      company: { type: 'string' },
                      recommended_workflow: strArr,
                      next_api: { type: 'string' },
                      next_endpoint: { type: 'string' },
                      blocking_flags: strArr,
                      flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
      '/assess': {
        post: {
          operationId: 'assess',
          summary: 'ONE-CALL: full supply chain risk assessment — suppliers, disruption, geopolitics, concentration, logistics',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company'],
                  properties: {
                    company: { type: 'string', description: 'Company to assess supply chain risk for' },
                    industry: { type: 'string', description: 'Industry for benchmarking' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full supply chain risk assessment report',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      overall_supply_risk: { $ref: '#/components/schemas/OverallSupplyRisk' },
                      risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      executive_summary: { type: 'string' },
                      top_risks: strArr,
                      critical_suppliers: strArr,
                      geopolitical_hot_spots: strArr,
                      single_points_of_failure: strArr,
                      logistics_chokepoints: strArr,
                      concentration_flags: strArr,
                      immediate_action_items: strArr,
                      recommended_actions: strArr,
                      confidence_per_section: confidence,
                      trace_id: { type: 'string' },
                      computed_at: { type: 'string', format: 'date-time' },
                      privacy: privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing company' },
            '500': { description: 'Assessment failed' },
          },
        },
      },
    },
  });
});

export default router;
