import { Router, Request, Response } from 'express';
const router = Router();

// AI Portfolio Hedging API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "AI Portfolio Hedging API",
    "version": "1.0.0",
    "description": "Recommends portfolio hedges using beta, correlation, volatility, and drawdown risk — with hedge candidates, sizing, stablecoin allocation, and options/perps notes. Human approval required before executing hedges.",
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
        "analyze": "$0.008",
        "hedges": "$0.010",
        "lookup": "$0.022"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-human-approval-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/ai-portfolio-hedging"
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
        "operationId": "aiPortfolioHedgingDiscovery",
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
                        "analyze": {
                          "type": "string"
                        },
                        "hedges": {
                          "type": "string"
                        },
                        "lookup": {
                          "type": "string"
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
    "/analyze": {
      "post": {
        "operationId": "hedgingAnalyze",
        "summary": "Portfolio beta, correlation summary, and drawdown risk",
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
            "description": "Portfolio beta, correlation summary, and drawdown risk",
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
                    "portfolio_beta": {
                      "type": "number"
                    },
                    "correlation_matrix_summary": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "pair": {
                            "type": "string"
                          },
                          "correlation": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "drawdown_risk": {
                      "type": "object",
                      "properties": {
                        "estimated_max_dd_pct": {
                          "type": "number"
                        },
                        "var_95_usd": {
                          "type": "number"
                        }
                      }
                    },
                    "net_exposure_usd": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "portfolio_beta": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "drawdown_risk": {
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
    "/hedges": {
      "post": {
        "operationId": "hedgingHedges",
        "summary": "Hedge candidates with sizing, stablecoin allocation, and options/perps notes",
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
                  },
                  "hedge_budget_pct": {
                    "type": "number"
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
            "description": "Hedge candidates with sizing, stablecoin allocation, and options/perps notes",
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
                    "hedge_candidates": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "instrument": {
                            "type": "string"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "perp",
                              "option",
                              "stablecoin",
                              "inverse_token"
                            ]
                          },
                          "hedge_ratio": {
                            "type": "number"
                          },
                          "est_cost_pct": {
                            "type": "number"
                          },
                          "rationale": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "hedge_size_recommendations": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "string"
                          },
                          "notional_usd": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "stablecoin_allocation": {
                      "type": "object",
                      "properties": {
                        "recommended_pct": {
                          "type": "number"
                        },
                        "usd": {
                          "type": "number"
                        }
                      }
                    },
                    "options_perps_notes": {
                      "type": "string"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "hedge_candidates": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "hedge_size_recommendations": {
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
        "operationId": "hedgingLookup",
        "summary": "ONE-CALL: beta + correlation + drawdown + hedge plan + stablecoin allocation",
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
            "description": "ONE-CALL: beta + correlation + drawdown + hedge plan + stablecoin allocation",
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
                    "portfolio_beta": {
                      "type": "number"
                    },
                    "correlation_matrix_summary": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "pair": {
                            "type": "string"
                          },
                          "correlation": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "drawdown_risk": {
                      "type": "object",
                      "properties": {
                        "estimated_max_dd_pct": {
                          "type": "number"
                        },
                        "var_95_usd": {
                          "type": "number"
                        }
                      }
                    },
                    "hedge_candidates": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "instrument": {
                            "type": "string"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "perp",
                              "option",
                              "stablecoin",
                              "inverse_token"
                            ]
                          },
                          "hedge_ratio": {
                            "type": "number"
                          },
                          "est_cost_pct": {
                            "type": "number"
                          },
                          "rationale": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "hedge_size_recommendations": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "string"
                          },
                          "notional_usd": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "stablecoin_allocation": {
                      "type": "object",
                      "properties": {
                        "recommended_pct": {
                          "type": "number"
                        },
                        "usd": {
                          "type": "number"
                        }
                      }
                    },
                    "options_perps_notes": {
                      "type": "string"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "portfolio_beta": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "hedge_candidates": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "drawdown_risk": {
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
