import { Router, Request, Response } from 'express';
const router = Router();

// Orderbook Imbalance API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Orderbook Imbalance API",
    "version": "1.0.0",
    "description": "Detects bid/ask depth imbalance, liquidity walls, spoofing risk, and short-term directional pressure with slippage estimates. Real-time latency tier for execution-aware agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-latency-tier": "real-time",
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 100,
        "requests_per_month": 3000
      },
      "pay_per_call": {
        "depth": "$0.004",
        "imbalance": "$0.006",
        "lookup": "$0.015"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/orderbook-imbalance"
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
        "operationId": "orderbookImbalanceDiscovery",
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
                        "depth": {
                          "type": "string"
                        },
                        "imbalance": {
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
    "/depth": {
      "post": {
        "operationId": "orderbookDepth",
        "summary": "Bid/ask depth with cumulative size per level and spread",
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
                  "exchange": {
                    "type": "string"
                  },
                  "levels": {
                    "type": "integer"
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
            "description": "Bid/ask depth with cumulative size per level and spread",
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
                    "bid_depth_usd": {
                      "type": "number"
                    },
                    "ask_depth_usd": {
                      "type": "number"
                    },
                    "depth_levels": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "price": {
                            "type": "number"
                          },
                          "side": {
                            "type": "string",
                            "enum": [
                              "bid",
                              "ask"
                            ]
                          },
                          "size_usd": {
                            "type": "number"
                          },
                          "cumulative_usd": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "mid_price": {
                      "type": "number"
                    },
                    "spread_bps": {
                      "type": "number"
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "depth_levels": {
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
    "/imbalance": {
      "post": {
        "operationId": "orderbookImbalance",
        "summary": "Imbalance ratio, liquidity walls, spoofing risk, short-term bias",
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
                  "exchange": {
                    "type": "string"
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
            "description": "Imbalance ratio, liquidity walls, spoofing risk, short-term bias",
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
                    "imbalance_ratio": {
                      "type": "number"
                    },
                    "bid_pressure_pct": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "ask_pressure_pct": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "liquidity_walls": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "price": {
                            "type": "number"
                          },
                          "side": {
                            "type": "string",
                            "enum": [
                              "bid",
                              "ask"
                            ]
                          },
                          "size_usd": {
                            "type": "number"
                          },
                          "distance_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "spoofing_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "short_term_bias": {
                      "type": "string",
                      "enum": [
                        "bullish",
                        "bearish",
                        "neutral"
                      ]
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "imbalance_ratio": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "spoofing_risk": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "short_term_bias": {
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
        "operationId": "orderbookLookup",
        "summary": "ONE-CALL: depth + imbalance + walls + spoof risk + slippage estimates",
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
                  "exchange": {
                    "type": "string"
                  },
                  "order_sizes_usd": {
                    "type": "array",
                    "items": {
                      "type": "number"
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
            "description": "ONE-CALL: depth + imbalance + walls + spoof risk + slippage estimates",
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
                    "bid_depth_usd": {
                      "type": "number"
                    },
                    "ask_depth_usd": {
                      "type": "number"
                    },
                    "imbalance_ratio": {
                      "type": "number"
                    },
                    "liquidity_walls": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "price": {
                            "type": "number"
                          },
                          "side": {
                            "type": "string",
                            "enum": [
                              "bid",
                              "ask"
                            ]
                          },
                          "size_usd": {
                            "type": "number"
                          },
                          "distance_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "spoofing_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "slippage_estimates": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "order_size_usd": {
                            "type": "number"
                          },
                          "side": {
                            "type": "string",
                            "enum": [
                              "buy",
                              "sell"
                            ]
                          },
                          "est_slippage_bps": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "short_term_bias": {
                      "type": "string",
                      "enum": [
                        "bullish",
                        "bearish",
                        "neutral"
                      ]
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "imbalance_ratio": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "spoofing_risk": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "short_term_bias": {
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
