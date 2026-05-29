import { Router, Request, Response } from 'express';
const router = Router();

// Open Interest Intelligence API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Open Interest Intelligence API",
    "version": "1.0.0",
    "description": "Analyzes open interest expansion and contraction against price to interpret new longs/shorts vs covering, leverage buildup, and trend conviction. Returns liquidation-risk context for agents gating leveraged entries.",
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
        "oi": "$0.004",
        "changes": "$0.006",
        "lookup": "$0.015"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/open-interest-intelligence"
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
        "operationId": "openInterestIntelligenceDiscovery",
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
                        "oi": {
                          "type": "string"
                        },
                        "changes": {
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
    "/oi": {
      "post": {
        "operationId": "openInterest",
        "summary": "Aggregate and per-exchange open interest snapshot",
        "x-pricing": {
          "price": "$0.004",
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
                  "exchanges": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "symbol"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Aggregate and per-exchange open interest snapshot",
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
                    "open_interest_usd": {
                      "type": "number"
                    },
                    "oi_by_exchange": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "exchange": {
                            "type": "string"
                          },
                          "oi_usd": {
                            "type": "number"
                          },
                          "share_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "oi_24h_ago_usd": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "open_interest": {
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
    "/changes": {
      "post": {
        "operationId": "oiChanges",
        "summary": "OI change vs price change with new-longs/shorts interpretation",
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
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "1h",
                      "4h",
                      "24h",
                      "7d"
                    ]
                  }
                },
                "required": [
                  "symbol"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OI change vs price change with new-longs/shorts interpretation",
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
                    "oi_change_pct": {
                      "type": "number"
                    },
                    "oi_change_usd": {
                      "type": "number"
                    },
                    "price_change_pct": {
                      "type": "number"
                    },
                    "price_vs_oi_interpretation": {
                      "type": "string",
                      "enum": [
                        "new_longs",
                        "new_shorts",
                        "long_covering",
                        "short_covering"
                      ]
                    },
                    "leverage_buildup_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "price_vs_oi_interpretation": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "leverage_buildup_score": {
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
        "operationId": "oiLookup",
        "summary": "ONE-CALL: OI + change interpretation + leverage buildup + trend conviction",
        "x-pricing": {
          "price": "$0.015",
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
                  "symbol": {
                    "type": "string"
                  },
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "1h",
                      "4h",
                      "24h",
                      "7d"
                    ]
                  }
                },
                "required": [
                  "symbol"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: OI + change interpretation + leverage buildup + trend conviction",
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
                    "open_interest_usd": {
                      "type": "number"
                    },
                    "oi_change_pct": {
                      "type": "number"
                    },
                    "price_vs_oi_interpretation": {
                      "type": "string",
                      "enum": [
                        "new_longs",
                        "new_shorts",
                        "long_covering",
                        "short_covering"
                      ]
                    },
                    "leverage_buildup_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "trend_conviction": {
                      "type": "string",
                      "enum": [
                        "strong",
                        "moderate",
                        "weak",
                        "diverging"
                      ]
                    },
                    "liquidation_risk_context": {
                      "type": "object",
                      "properties": {
                        "risk_level": {
                          "type": "string",
                          "enum": [
                            "low",
                            "medium",
                            "high"
                          ]
                        },
                        "note": {
                          "type": "string"
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "trend_conviction": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "leverage_buildup_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "liquidation_risk_context": {
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
