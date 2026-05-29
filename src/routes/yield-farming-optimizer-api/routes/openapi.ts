import { Router, Request, Response } from 'express';
const router = Router();

// Yield Farming Optimizer API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Yield Farming Optimizer API",
    "version": "1.0.0",
    "description": "Ranks DeFi yield opportunities by risk-adjusted APY, sustainability, protocol and liquidity risk, withdrawal delay, and impermanent-loss risk — with a recommended action. Human approval required before acting on deposit recommendations.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-latency-tier": "standard",
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 100,
        "requests_per_month": 3000
      },
      "pay_per_call": {
        "opportunities": "$0.006",
        "compare": "$0.008",
        "lookup": "$0.022"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-human-approval-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/yield-farming-optimizer"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "yieldFarmingOptimizerDiscovery",
        "summary": "API discovery — endpoints, pricing, and capabilities",
        "security": [],
        "responses": {
          "200": {
            "description": "Discovery info",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "openapi_url": {
                      "type": "string"
                    },
                    "x-agent-callable": {
                      "type": "boolean"
                    },
                    "x-mcp-compatible": {
                      "type": "boolean"
                    },
                    "x402-compatible": {
                      "type": "boolean"
                    },
                    "x-latency-tier": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "method": {
                            "type": "string"
                          },
                          "path": {
                            "type": "string"
                          },
                          "description": {
                            "type": "string"
                          },
                          "price": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "pricing": {
                      "type": "object",
                      "properties": {
                        "opportunities": {
                          "type": "string"
                        },
                        "compare": {
                          "type": "string"
                        },
                        "lookup": {
                          "type": "string"
                        }
                      }
                    },
                    "recommended_workflows": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/opportunities": {
      "post": {
        "operationId": "yieldOpportunities",
        "summary": "Ranked yield opportunities by risk-adjusted APY and sustainability",
        "x-pricing": {
          "price": "$0.006",
          "model": "per_call",
          "currency": "USDC"
        },
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "chains": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "asset": {
                    "type": "string"
                  },
                  "min_apy_pct": {
                    "type": "number"
                  },
                  "min_tvl_usd": {
                    "type": "number"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ranked yield opportunities by risk-adjusted APY and sustainability",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "trace_id": {
                      "type": "string"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "overall_confidence": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "data_timestamp": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "data_age_seconds": {
                      "type": "integer"
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "sources": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "provider": {
                            "type": "string"
                          },
                          "confidence": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          }
                        }
                      }
                    },
                    "opportunities": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "protocol": {
                            "type": "string"
                          },
                          "pool": {
                            "type": "string"
                          },
                          "chain": {
                            "type": "string"
                          },
                          "raw_apy": {
                            "type": "number"
                          },
                          "risk_adjusted_apy": {
                            "type": "number"
                          },
                          "tvl_usd": {
                            "type": "number"
                          },
                          "sustainability_score": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 100
                          }
                        }
                      }
                    },
                    "count": {
                      "type": "integer"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "opportunities": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    },
                    "privacy": {
                      "type": "object",
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    },
                    "human_approval_required": {
                      "type": "boolean"
                    },
                    "paper_mode_recommended": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/compare": {
      "post": {
        "operationId": "yieldCompare",
        "summary": "Side-by-side comparison with protocol/liquidity/IL risk and best pick",
        "x-pricing": {
          "price": "$0.008",
          "model": "per_call",
          "currency": "USDC"
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "pools": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "protocol": {
                          "type": "string"
                        },
                        "pool": {
                          "type": "string"
                        },
                        "chain": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "required": [
                  "pools"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Side-by-side comparison with protocol/liquidity/IL risk and best pick",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "trace_id": {
                      "type": "string"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "overall_confidence": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "data_timestamp": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "data_age_seconds": {
                      "type": "integer"
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "sources": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "provider": {
                            "type": "string"
                          },
                          "confidence": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          }
                        }
                      }
                    },
                    "comparison": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "protocol": {
                            "type": "string"
                          },
                          "pool": {
                            "type": "string"
                          },
                          "raw_apy": {
                            "type": "number"
                          },
                          "risk_adjusted_apy": {
                            "type": "number"
                          },
                          "protocol_risk": {
                            "type": "string",
                            "enum": [
                              "low",
                              "medium",
                              "high"
                            ]
                          },
                          "liquidity_risk": {
                            "type": "string",
                            "enum": [
                              "low",
                              "medium",
                              "high"
                            ]
                          },
                          "withdrawal_delay": {
                            "type": "string"
                          },
                          "impermanent_loss_risk": {
                            "type": "string",
                            "enum": [
                              "none",
                              "low",
                              "medium",
                              "high"
                            ]
                          }
                        }
                      }
                    },
                    "best_pick": {
                      "type": "object",
                      "properties": {
                        "protocol": {
                          "type": "string"
                        },
                        "pool": {
                          "type": "string"
                        },
                        "reason": {
                          "type": "string"
                        }
                      }
                    },
                    "reward_token_sell_pressure": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "apy_decay_probability": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "strategy_complexity": {
                      "type": "string",
                      "enum": [
                        "simple",
                        "moderate",
                        "complex"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "comparison": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "best_pick": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    },
                    "privacy": {
                      "type": "object",
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    },
                    "human_approval_required": {
                      "type": "boolean"
                    },
                    "paper_mode_recommended": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "yieldLookup",
        "summary": "ONE-CALL: APY + sustainability + protocol/liquidity/IL risk + recommended action",
        "x-pricing": {
          "price": "$0.022",
          "model": "per_call",
          "currency": "USDC"
        },
        "x-one-call": true,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "protocol": {
                    "type": "string"
                  },
                  "pool": {
                    "type": "string"
                  },
                  "chain": {
                    "type": "string"
                  }
                },
                "required": [
                  "protocol"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: APY + sustainability + protocol/liquidity/IL risk + recommended action",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "trace_id": {
                      "type": "string"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "overall_confidence": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "data_timestamp": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "data_age_seconds": {
                      "type": "integer"
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "sources": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "provider": {
                            "type": "string"
                          },
                          "confidence": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          }
                        }
                      }
                    },
                    "raw_apy": {
                      "type": "number"
                    },
                    "risk_adjusted_apy": {
                      "type": "number"
                    },
                    "sustainability_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "protocol_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "liquidity_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "withdrawal_delay": {
                      "type": "string"
                    },
                    "impermanent_loss_risk": {
                      "type": "string",
                      "enum": [
                        "none",
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "recommended_action": {
                      "type": "object",
                      "properties": {
                        "action": {
                          "type": "string",
                          "enum": [
                            "deposit",
                            "wait",
                            "avoid"
                          ]
                        },
                        "rationale": {
                          "type": "string"
                        }
                      }
                    },
                    "reward_token_sell_pressure": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "apy_decay_probability": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "strategy_complexity": {
                      "type": "string",
                      "enum": [
                        "simple",
                        "moderate",
                        "complex"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "risk_adjusted_apy": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "sustainability_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "recommended_action": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "reasoning": {
                      "type": "object",
                      "properties": {
                        "why_signal_generated": {
                          "type": "string"
                        },
                        "key_factors": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "invalidators": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    },
                    "privacy": {
                      "type": "object",
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    },
                    "human_approval_required": {
                      "type": "boolean"
                    },
                    "paper_mode_recommended": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  }
};

router.get('/', (_req: Request, res: Response) => { res.json(SPEC); });

export default router;
