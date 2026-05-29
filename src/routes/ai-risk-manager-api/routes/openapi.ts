import { Router, Request, Response } from 'express';
const router = Router();

// AI Risk Manager API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "AI Risk Manager API",
    "version": "1.0.0",
    "description": "Scores trade and portfolio risk before execution: risk score, max-loss estimate, volatility context, correlation risk, exposure breakdown, and recommended position adjustments. Human approval is mandatory before acting.",
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
        "trade": "$0.006",
        "portfolio": "$0.010",
        "lookup": "$0.025"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-human-approval-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/ai-risk-manager"
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
        "operationId": "aiRiskManagerDiscovery",
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
                        "trade": {
                          "type": "string"
                        },
                        "portfolio": {
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
    "/trade": {
      "post": {
        "operationId": "riskTrade",
        "summary": "Pre-trade risk score with max loss, volatility, and position adjustment",
        "x-pricing": {
          "price": "$0.006",
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
                  "symbol": {
                    "type": "string"
                  },
                  "side": {
                    "type": "string",
                    "enum": [
                      "long",
                      "short"
                    ]
                  },
                  "size_usd": {
                    "type": "number"
                  },
                  "leverage": {
                    "type": "number"
                  },
                  "entry_price": {
                    "type": "number"
                  },
                  "stop_price": {
                    "type": "number"
                  }
                },
                "required": [
                  "symbol",
                  "side",
                  "size_usd"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Pre-trade risk score with max loss, volatility, and position adjustment",
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
                    "risk_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "max_loss_estimate": {
                      "type": "object",
                      "properties": {
                        "usd": {
                          "type": "number"
                        },
                        "pct": {
                          "type": "number"
                        }
                      }
                    },
                    "volatility_context": {
                      "type": "object",
                      "properties": {
                        "atr_pct": {
                          "type": "number"
                        },
                        "regime": {
                          "type": "string",
                          "enum": [
                            "low",
                            "normal",
                            "elevated",
                            "extreme"
                          ]
                        }
                      }
                    },
                    "correlation_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "recommended_position_adjustment": {
                      "type": "object",
                      "properties": {
                        "action": {
                          "type": "string",
                          "enum": [
                            "reduce",
                            "hold",
                            "increase",
                            "close"
                          ]
                        },
                        "suggested_size_pct": {
                          "type": "number"
                        },
                        "rationale": {
                          "type": "string"
                        }
                      }
                    },
                    "risk_factor_breakdown": {
                      "type": "object",
                      "properties": {
                        "volatility": {
                          "type": "number"
                        },
                        "correlation": {
                          "type": "number"
                        },
                        "liquidity": {
                          "type": "number"
                        },
                        "concentration": {
                          "type": "number"
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "risk_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "volatility_context": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "recommended_position_adjustment": {
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
                    "execution_gate_required": {
                      "type": "boolean"
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
    "/portfolio": {
      "post": {
        "operationId": "riskPortfolio",
        "summary": "Portfolio health score with exposure breakdown and rebalancing actions",
        "x-pricing": {
          "price": "$0.010",
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
                  "positions": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "symbol": {
                          "type": "string"
                        },
                        "size_usd": {
                          "type": "number"
                        },
                        "side": {
                          "type": "string",
                          "enum": [
                            "long",
                            "short"
                          ]
                        }
                      }
                    }
                  }
                },
                "required": [
                  "positions"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Portfolio health score with exposure breakdown and rebalancing actions",
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
                    "portfolio_health_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "exposure_breakdown": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "string"
                          },
                          "weight_pct": {
                            "type": "number"
                          },
                          "risk_contribution_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "correlation_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "max_loss_estimate": {
                      "type": "object",
                      "properties": {
                        "usd": {
                          "type": "number"
                        },
                        "pct": {
                          "type": "number"
                        }
                      }
                    },
                    "recommended_position_adjustment": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "string"
                          },
                          "action": {
                            "type": "string",
                            "enum": [
                              "reduce",
                              "hold",
                              "increase",
                              "close"
                            ]
                          },
                          "target_weight_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "portfolio_health_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "exposure_breakdown": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "recommended_position_adjustment": {
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
                    "execution_gate_required": {
                      "type": "boolean"
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
        "operationId": "riskLookup",
        "summary": "ONE-CALL: trade + portfolio risk with full exposure and adjustment plan",
        "x-pricing": {
          "price": "$0.025",
          "model": "per_call",
          "currency": "USDC"
        },
        "x-one-call": true,
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "symbol": {
                    "type": "string"
                  },
                  "positions": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "symbol": {
                          "type": "string"
                        },
                        "size_usd": {
                          "type": "number"
                        },
                        "side": {
                          "type": "string",
                          "enum": [
                            "long",
                            "short"
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: trade + portfolio risk with full exposure and adjustment plan",
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
                    "risk_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "portfolio_health_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "max_loss_estimate": {
                      "type": "object",
                      "properties": {
                        "usd": {
                          "type": "number"
                        },
                        "pct": {
                          "type": "number"
                        }
                      }
                    },
                    "volatility_context": {
                      "type": "object",
                      "properties": {
                        "atr_pct": {
                          "type": "number"
                        },
                        "regime": {
                          "type": "string",
                          "enum": [
                            "low",
                            "normal",
                            "elevated",
                            "extreme"
                          ]
                        }
                      }
                    },
                    "correlation_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "exposure_breakdown": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "string"
                          },
                          "weight_pct": {
                            "type": "number"
                          },
                          "risk_contribution_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "recommended_position_adjustment": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "string"
                          },
                          "action": {
                            "type": "string",
                            "enum": [
                              "reduce",
                              "hold",
                              "increase",
                              "close"
                            ]
                          },
                          "target_weight_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "risk_factor_breakdown": {
                      "type": "object",
                      "properties": {
                        "volatility": {
                          "type": "number"
                        },
                        "correlation": {
                          "type": "number"
                        },
                        "liquidity": {
                          "type": "number"
                        },
                        "concentration": {
                          "type": "number"
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "risk_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "portfolio_health_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "recommended_position_adjustment": {
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
                    "execution_gate_required": {
                      "type": "boolean"
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
