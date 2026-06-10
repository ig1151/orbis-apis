import { Router, Request, Response } from 'express';
const router = Router();

// Position Sizing API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Position Sizing API",
    "version": "1.0.0",
    "description": "Calculates risk-adjusted position size from volatility, stop-loss distance, portfolio size, and confidence — including Kelly fraction, volatility-adjusted size, and risk-of-ruin estimate. Gates execution on sizing approval.",
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
        "calculate": "$0.005",
        "simulate": "$0.008",
        "lookup": "$0.018"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-human-approval-required": false,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/position-sizing"
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
        "operationId": "positionSizingDiscovery",
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
                        "calculate": {
                          "type": "string"
                        },
                        "simulate": {
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
    "/calculate": {
      "post": {
        "operationId": "sizingCalculate",
        "summary": "Risk-adjusted position size with Kelly fraction and risk of ruin",
        "x-pricing": {
          "price": "$0.005",
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
                  "account_size_usd": {
                    "type": "number"
                  },
                  "risk_per_trade_pct": {
                    "type": "number"
                  },
                  "entry_price": {
                    "type": "number"
                  },
                  "stop_price": {
                    "type": "number"
                  },
                  "win_rate_pct": {
                    "type": "number"
                  },
                  "avg_win_loss_ratio": {
                    "type": "number"
                  },
                  "volatility_pct": {
                    "type": "number"
                  }
                },
                "required": [
                  "account_size_usd",
                  "entry_price",
                  "stop_price"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Risk-adjusted position size with Kelly fraction and risk of ruin",
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
                    "recommended_size_usd": {
                      "type": "number"
                    },
                    "recommended_size_pct": {
                      "type": "number"
                    },
                    "max_position_size": {
                      "type": "number"
                    },
                    "kelly_fraction": {
                      "type": "number"
                    },
                    "volatility_adjusted_size": {
                      "type": "number"
                    },
                    "stop_loss_distance": {
                      "type": "object",
                      "properties": {
                        "pct": {
                          "type": "number"
                        },
                        "price": {
                          "type": "number"
                        }
                      }
                    },
                    "risk_of_ruin_estimate": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "capital_at_risk_usd": {
                      "type": "number"
                    },
                    "expected_drawdown_pct": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "recommended_size_usd": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "kelly_fraction": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "risk_of_ruin_estimate": {
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
    "/simulate": {
      "post": {
        "operationId": "sizingSimulate",
        "summary": "Monte-Carlo-style scenario simulation of sizing outcomes",
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
                  "account_size_usd": {
                    "type": "number"
                  },
                  "risk_per_trade_pct": {
                    "type": "number"
                  },
                  "win_rate_pct": {
                    "type": "number"
                  },
                  "avg_win_loss_ratio": {
                    "type": "number"
                  },
                  "num_trades": {
                    "type": "integer"
                  }
                },
                "required": [
                  "account_size_usd"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Monte-Carlo-style scenario simulation of sizing outcomes",
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
                    "scenarios": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "label": {
                            "type": "string"
                          },
                          "win_rate_pct": {
                            "type": "number"
                          },
                          "avg_r_multiple": {
                            "type": "number"
                          },
                          "expected_value_usd": {
                            "type": "number"
                          },
                          "max_drawdown_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "recommended_size_usd": {
                      "type": "number"
                    },
                    "risk_of_ruin_estimate": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "scenarios": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "risk_of_ruin_estimate": {
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
        "operationId": "sizingLookup",
        "summary": "ONE-CALL: recommended size + Kelly + volatility-adjusted + risk of ruin",
        "x-pricing": {
          "price": "$0.018",
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
                  "account_size_usd": {
                    "type": "number"
                  },
                  "risk_per_trade_pct": {
                    "type": "number"
                  },
                  "entry_price": {
                    "type": "number"
                  },
                  "stop_price": {
                    "type": "number"
                  },
                  "win_rate_pct": {
                    "type": "number"
                  },
                  "volatility_pct": {
                    "type": "number"
                  }
                },
                "required": [
                  "account_size_usd"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: recommended size + Kelly + volatility-adjusted + risk of ruin",
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
                    "recommended_size_usd": {
                      "type": "number"
                    },
                    "recommended_size_pct": {
                      "type": "number"
                    },
                    "max_position_size": {
                      "type": "number"
                    },
                    "kelly_fraction": {
                      "type": "number"
                    },
                    "volatility_adjusted_size": {
                      "type": "number"
                    },
                    "stop_loss_distance": {
                      "type": "object",
                      "properties": {
                        "pct": {
                          "type": "number"
                        },
                        "price": {
                          "type": "number"
                        }
                      }
                    },
                    "risk_of_ruin_estimate": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "capital_at_risk_usd": {
                      "type": "number"
                    },
                    "expected_drawdown_pct": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "recommended_size_usd": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "kelly_fraction": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "risk_of_ruin_estimate": {
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
