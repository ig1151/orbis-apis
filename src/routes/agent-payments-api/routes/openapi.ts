import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Payments API',
      version: '1.0.0',
      description: 'AI-powered agent commerce and payments — create wallets, request and approve payments, execute transactions, manage escrow, subscriptions, usage billing, spending limits and autonomous execution gates for agent-to-agent commerce',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { create_wallet: '$0.005', request_payment: '$0.006', approve_spend: '$0.005', execute_payment: '$0.007', escrow: '$0.006', execution_gate: '$0.002', simulate_payment: '$0.004', verify_settlement: '$0.004', run_payment: '$0.018' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-payments' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': { get: { operationId: 'agentPaymentsDiscovery', summary: 'API discovery — returns name, version, endpoints and capabilities', responses: { '200': { description: 'API discovery info' } } } },
      '/create-wallet': {
        post: {
          operationId: 'createWallet',
          summary: 'Create an agent wallet with security config, spending limits and setup instructions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'wallet_type'],
                  properties: {
                    agent_id: { type: 'string' },
                    wallet_type: { type: 'string', enum: ['custodial', 'non_custodial', 'smart_contract'] },
                    network: { type: 'string', enum: ['base', 'ethereum', 'solana'] },
                    spending_limit_usdc: { type: 'number' },
                    owner_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Wallet created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      wallet_id: { type: 'string' },
                      wallet_type: { type: 'string', enum: ['custodial', 'non_custodial', 'smart_contract'] },
                      network: { type: 'string' },
                      address: { type: 'string' },
                      spending_limit_usdc: { type: 'number' },
                      daily_limit_usdc: { type: 'number' },
                      requires_approval_above_usdc: { type: 'number' },
                      multi_sig_required: { type: 'boolean' },
                      security_config: {
                        type: 'object',
                        properties: {
                          rate_limit: { type: 'string' },
                          whitelist_only: { type: 'boolean' },
                          require_2fa: { type: 'boolean' },
                        },
                      },
                      setup_steps: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or wallet_type' },
            '500': { description: 'Wallet creation failed' },
          },
        },
      },
      '/request-payment': {
        post: {
          operationId: 'requestPayment',
          summary: 'Request an agent-to-agent payment with risk scoring, approval routing and status',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['from_agent_id', 'to_agent_id', 'amount_usdc', 'purpose'],
                  properties: {
                    from_agent_id: { type: 'string' },
                    to_agent_id: { type: 'string' },
                    amount_usdc: { type: 'number' },
                    purpose: { type: 'string' },
                    metadata: { type: 'object' },
                    expires_in_minutes: { type: 'number' },
                    idempotency_key: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Payment request created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      payment_request_id: { type: 'string' },
                      from_agent_id: { type: 'string' },
                      to_agent_id: { type: 'string' },
                      amount_usdc: { type: 'number' },
                      purpose: { type: 'string' },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      risk_flags: actions,
                      approval_required: { type: 'boolean' },
                      approval_threshold_usdc: { type: 'number' },
                      expires_at: { type: 'string', format: 'date-time' },
                      payment_status: { type: 'string', enum: ['pending_approval', 'auto_approved', 'blocked'] },
                      routing: {
                        type: 'object',
                        properties: {
                          approver: { type: 'string' },
                          channel: { type: 'string' },
                          sla_minutes: { type: 'number' },
                        },
                      },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing required fields' },
            '500': { description: 'Payment request failed' },
          },
        },
      },
      '/approve-spend': {
        post: {
          operationId: 'approveSpend',
          summary: 'Approve, reject or modify a spend request with authority validation and audit trail',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['payment_request_id', 'approver_id', 'decision'],
                  properties: {
                    payment_request_id: { type: 'string' },
                    approver_id: { type: 'string' },
                    decision: { type: 'string', enum: ['approve', 'reject', 'modify'] },
                    modified_amount_usdc: { type: 'number' },
                    conditions: { type: 'array', items: { type: 'string' } },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Approval decision processed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      payment_request_id: { type: 'string' },
                      decision: { type: 'string', enum: ['approve', 'reject', 'modify'] },
                      approver_id: { type: 'string' },
                      approver_authority_level: { type: 'string' },
                      final_amount_usdc: { type: 'number' },
                      conditions_applied: actions,
                      audit_entry: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          action: { type: 'string' },
                          actor: { type: 'string' },
                          hash: { type: 'string' },
                        },
                      },
                      execution_ready: { type: 'boolean' },
                      expires_at: { type: 'string', format: 'date-time', nullable: true },
                      next_step: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing payment_request_id, approver_id or decision' },
            '500': { description: 'Approval processing failed' },
          },
        },
      },
      '/execute-payment': {
        post: {
          operationId: 'executePayment',
          summary: 'Execute a payment with gas optimization, pre-condition checks and rollback support',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['payment_request_id', 'wallet_id'],
                  properties: {
                    payment_request_id: { type: 'string' },
                    wallet_id: { type: 'string' },
                    network: { type: 'string' },
                    gas_strategy: { type: 'string', enum: ['fast', 'standard', 'economy'] },
                    simulate_first: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Payment executed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      payment_request_id: { type: 'string' },
                      transaction_id: { type: 'string' },
                      status: { type: 'string', enum: ['simulated', 'submitted', 'confirmed', 'failed'] },
                      amount_usdc: { type: 'number' },
                      network_fee_usdc: { type: 'number' },
                      total_cost_usdc: { type: 'number' },
                      gas_strategy: { type: 'string', enum: ['fast', 'standard', 'economy'] },
                      estimated_confirmation_ms: { type: 'number' },
                      pre_execution_checks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            check: { type: 'string' },
                            passed: { type: 'boolean' },
                          },
                        },
                      },
                      rollback_available: { type: 'boolean' },
                      receipt: {
                        type: 'object',
                        properties: {
                          block: { type: 'string' },
                          timestamp: { type: 'string', format: 'date-time' },
                          hash: { type: 'string' },
                        },
                      },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing payment_request_id or wallet_id' },
            '500': { description: 'Payment execution failed' },
          },
        },
      },
      '/escrow': {
        post: {
          operationId: 'escrow',
          summary: 'Create, release, refund or check agent-to-agent escrow with condition tracking and audit trail',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['create', 'release', 'refund', 'check'] },
                    escrow_id: { type: 'string' },
                    amount_usdc: { type: 'number' },
                    payer_id: { type: 'string' },
                    payee_id: { type: 'string' },
                    release_conditions: { type: 'array', items: { type: 'string' } },
                    expiry_hours: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Escrow action result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      escrow_id: { type: 'string' },
                      action: { type: 'string', enum: ['create', 'release', 'refund', 'check'] },
                      status: { type: 'string', enum: ['created', 'held', 'released', 'refunded', 'expired'] },
                      amount_usdc: { type: 'number' },
                      payer_id: { type: 'string' },
                      payee_id: { type: 'string' },
                      conditions_met: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            condition: { type: 'string' },
                            met: { type: 'boolean' },
                          },
                        },
                      },
                      all_conditions_met: { type: 'boolean' },
                      release_ready: { type: 'boolean' },
                      expiry_at: { type: 'string', format: 'date-time' },
                      audit_trail: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            timestamp: { type: 'string', format: 'date-time' },
                            event: { type: 'string' },
                            actor: { type: 'string' },
                          },
                        },
                      },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing action, escrow_id or amount_usdc' },
            '500': { description: 'Escrow operation failed' },
          },
        },
      },
      '/subscription-management': {
        post: {
          operationId: 'subscriptionManagement',
          summary: 'Create, cancel, upgrade, downgrade or check agent subscriptions with proration and feature gating',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action', 'subscription_id', 'agent_id'],
                  properties: {
                    action: { type: 'string', enum: ['create', 'cancel', 'upgrade', 'downgrade', 'check'] },
                    subscription_id: { type: 'string' },
                    agent_id: { type: 'string' },
                    plan: { type: 'string' },
                    amount_usdc_per_period: { type: 'number' },
                    period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                    features: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Subscription action result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      subscription_id: { type: 'string' },
                      agent_id: { type: 'string' },
                      action: { type: 'string' },
                      plan: { type: 'string' },
                      status: { type: 'string', enum: ['active', 'cancelled', 'paused', 'past_due'] },
                      amount_usdc_per_period: { type: 'number' },
                      period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                      next_billing_date: { type: 'string', format: 'date-time' },
                      proration_credit_usdc: { type: 'number' },
                      features_enabled: actions,
                      features_removed: actions,
                      cancellation_effective: { type: 'string', nullable: true },
                      renewal_instructions: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing action, subscription_id or agent_id' },
            '500': { description: 'Subscription management failed' },
          },
        },
      },
      '/usage-billing': {
        post: {
          operationId: 'usageBilling',
          summary: 'Calculate usage-based billing with tiered pricing, discounts, anomaly detection and invoice generation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'usage_records'],
                  properties: {
                    agent_id: { type: 'string' },
                    usage_records: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          resource: { type: 'string' },
                          quantity: { type: 'number' },
                          unit: { type: 'string' },
                        },
                      },
                    },
                    billing_period: { type: 'string' },
                    pricing_table: { type: 'object' },
                    apply_discounts: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Usage billing result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      billing_period: { type: 'string' },
                      line_items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            resource: { type: 'string' },
                            quantity: { type: 'number' },
                            unit: { type: 'string' },
                            unit_price_usdc: { type: 'number' },
                            subtotal_usdc: { type: 'number' },
                            tier: { type: 'string' },
                          },
                        },
                      },
                      subtotal_usdc: { type: 'number' },
                      discounts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            amount_usdc: { type: 'number' },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      total_usdc: { type: 'number' },
                      anomalies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            resource: { type: 'string' },
                            expected_range: { type: 'string' },
                            actual: { type: 'number' },
                            flag: { type: 'string' },
                          },
                        },
                      },
                      invoice_id: { type: 'string' },
                      due_date: { type: 'string', format: 'date-time' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or usage_records' },
            '500': { description: 'Billing calculation failed' },
          },
        },
      },
      '/spending-limits': {
        post: {
          operationId: 'spendingLimits',
          summary: 'Set, check, update or reset agent spending limits with utilization tracking and violation flags',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'action', 'wallet_id'],
                  properties: {
                    agent_id: { type: 'string' },
                    action: { type: 'string', enum: ['set', 'check', 'update', 'reset'] },
                    wallet_id: { type: 'string' },
                    daily_limit_usdc: { type: 'number' },
                    per_transaction_limit_usdc: { type: 'number' },
                    monthly_limit_usdc: { type: 'number' },
                    whitelist_addresses: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Spending limits result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      wallet_id: { type: 'string' },
                      action: { type: 'string' },
                      current_limits: {
                        type: 'object',
                        properties: {
                          daily: { type: 'number' },
                          per_transaction: { type: 'number' },
                          monthly: { type: 'number' },
                        },
                      },
                      current_spend: {
                        type: 'object',
                        properties: {
                          today_usdc: { type: 'number' },
                          this_month_usdc: { type: 'number' },
                        },
                      },
                      utilization: {
                        type: 'object',
                        properties: {
                          daily_pct: { type: 'number' },
                          monthly_pct: { type: 'number' },
                        },
                      },
                      headroom: {
                        type: 'object',
                        properties: {
                          daily_usdc: { type: 'number' },
                          monthly_usdc: { type: 'number' },
                        },
                      },
                      violations: actions,
                      at_risk: { type: 'boolean' },
                      recommended_action: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id, action or wallet_id' },
            '500': { description: 'Spending limits operation failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'paymentExecutionGate',
          summary: 'Gate autonomous payment execution with risk scoring, compliance check and human-approval routing',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['payment_action', 'payment_context'],
                  properties: {
                    payment_action: { type: 'string' },
                    payment_context: { type: 'object' },
                    risk_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    require_human_approval: { type: 'boolean' },
                    compliance_check: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Execution gate decision',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execute: { type: 'boolean' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      risk_level: { type: 'string', enum: ['high', 'medium', 'low'] },
                      blocking_flags: actions,
                      warnings: actions,
                      compliance_status: { type: 'string', enum: ['compliant', 'review_needed', 'blocked'] },
                      human_approval_required: { type: 'boolean' },
                      recommended_action: { type: 'string', enum: ['proceed', 'require_approval', 'block', 'escrow_first'] },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing payment_action or payment_context' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
