import { Router, Request, Response } from 'express';
const router = Router();

// Trade Execution Timing API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Trade Execution Timing API",
    "version": "1.0.0",
    "description": "Finds the best execution window using liquidity, volatility, spread, and slippage forecasts — with an avoid-until signal and urgency score. Real-time latency tier; gates execution on timing approval.",
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
        "window": "$0.005",
        "forecast": "$0.008",
        "lookup": "$0.018"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/trade-execution-timing"
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
        "operationId": "tradeExecutionTimingDiscovery",
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
                        "window": {
                          "type": "string"
                        },
                        "forecast": {
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
    "/window": {
      "post": {
        "operationId": "timingWindow",
        "summary": "Best execution window with avoid-until and urgency score",
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
                  "symbol": {
                    "type": "string"
                  },
                  "side": {
                    "type": "string",
                    "enum": [
                      "buy",
                      "sell"
                    ]
                  },
                  "order_size_usd": {
                    "type": "number"
                  },
                  "horizon_hours": {
                    "type": "number"
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
            "description": "Best execution window with avoid-until and urgency score",
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
                    "best_execution_window": {
                      "type": "object",
                      "properties": {
                        "start": {
                          "type": "string"
                        },
                        "end": {
                          "type": "string"
                        },
                        "score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100
                        }
                      }
                    },
                    "avoid_until": {
                      "type": "string"
                    },
                    "urgency_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "best_execution_window": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "urgency_score": {
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
    "/forecast": {
      "post": {
        "operationId": "timingForecast",
        "summary": "Spread, slippage, volatility, and liquidity forecasts over the horizon",
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
                  "symbol": {
                    "type": "string"
                  },
                  "order_size_usd": {
                    "type": "number"
                  },
                  "horizon_hours": {
                    "type": "number"
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
            "description": "Spread, slippage, volatility, and liquidity forecasts over the horizon",
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
                    "spread_forecast": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "time": {
                            "type": "string"
                          },
                          "spread_bps": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "slippage_forecast": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "order_size_usd": {
                            "type": "number"
                          },
                          "est_slippage_bps": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "volatility_forecast": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "time": {
                            "type": "string"
                          },
                          "expected_vol_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "liquidity_window": {
                      "type": "object",
                      "properties": {
                        "best_time": {
                          "type": "string"
                        },
                        "depth_usd": {
                          "type": "number"
                        }
                      }
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "spread_forecast": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "slippage_forecast": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "volatility_forecast": {
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
        "operationId": "timingLookup",
        "summary": "ONE-CALL: best window + spread/slippage/volatility forecast + urgency",
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
                  "symbol": {
                    "type": "string"
                  },
                  "side": {
                    "type": "string",
                    "enum": [
                      "buy",
                      "sell"
                    ]
                  },
                  "order_size_usd": {
                    "type": "number"
                  },
                  "horizon_hours": {
                    "type": "number"
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
            "description": "ONE-CALL: best window + spread/slippage/volatility forecast + urgency",
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
                    "best_execution_window": {
                      "type": "object",
                      "properties": {
                        "start": {
                          "type": "string"
                        },
                        "end": {
                          "type": "string"
                        },
                        "score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100
                        }
                      }
                    },
                    "spread_forecast": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "time": {
                            "type": "string"
                          },
                          "spread_bps": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "slippage_forecast": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "order_size_usd": {
                            "type": "number"
                          },
                          "est_slippage_bps": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "volatility_forecast": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "time": {
                            "type": "string"
                          },
                          "expected_vol_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "liquidity_window": {
                      "type": "object",
                      "properties": {
                        "best_time": {
                          "type": "string"
                        },
                        "depth_usd": {
                          "type": "number"
                        }
                      }
                    },
                    "avoid_until": {
                      "type": "string"
                    },
                    "urgency_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "latency_ms": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "best_execution_window": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "urgency_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "liquidity_window": {
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
