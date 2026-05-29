import { Router, Request, Response } from 'express';
const router = Router();

// Liquidation Cascade API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Liquidation Cascade API",
    "version": "1.0.0",
    "description": "Detects liquidation clusters across leverage bands, estimates cascade probability, and quantifies long vs short liquidation risk with price levels and expected cascade size. Built for trading agents that must gate execution against forced-liquidation risk.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-latency-tier": "fast",
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 100,
        "requests_per_month": 3000
      },
      "pay_per_call": {
        "clusters": "$0.006",
        "heatmap": "$0.008",
        "lookup": "$0.018"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/liquidation-cascade"
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
        "operationId": "liquidationCascadeDiscovery",
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
                        "clusters": {
                          "type": "string"
                        },
                        "heatmap": {
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
    "/clusters": {
      "post": {
        "operationId": "liquidationClusters",
        "summary": "Liquidation cluster map across price levels and leverage bands",
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
                  },
                  "leverage_filter": {
                    "type": "string",
                    "enum": [
                      "all",
                      "5x",
                      "10x",
                      "25x",
                      "50x",
                      "100x"
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
            "description": "Liquidation cluster map across price levels and leverage bands",
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
                    "liquidation_cluster_map": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "price_level": {
                            "type": "number"
                          },
                          "side": {
                            "type": "string",
                            "enum": [
                              "long",
                              "short"
                            ]
                          },
                          "notional_usd": {
                            "type": "number"
                          },
                          "leverage_band": {
                            "type": "string"
                          },
                          "distance_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "total_clusters": {
                      "type": "integer"
                    },
                    "nearest_cluster_usd": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "liquidation_cluster_map": {
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
    "/heatmap": {
      "post": {
        "operationId": "liquidationHeatmap",
        "summary": "Liquidation heatmap with long/short intensity per price level",
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
                  "exchange": {
                    "type": "string"
                  },
                  "price_range_pct": {
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
            "description": "Liquidation heatmap with long/short intensity per price level",
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
                    "heatmap": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "price_level": {
                            "type": "number"
                          },
                          "long_liquidations_usd": {
                            "type": "number"
                          },
                          "short_liquidations_usd": {
                            "type": "number"
                          },
                          "intensity": {
                            "type": "string",
                            "enum": [
                              "low",
                              "medium",
                              "high",
                              "extreme"
                            ]
                          }
                        }
                      }
                    },
                    "price_range": {
                      "type": "object",
                      "properties": {
                        "low": {
                          "type": "number"
                        },
                        "high": {
                          "type": "number"
                        }
                      }
                    },
                    "peak_zone_usd": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "heatmap": {
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
        "operationId": "liquidationLookup",
        "summary": "ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels",
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
            "description": "ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels",
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
                    "cascade_probability_pct": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "long_liquidation_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high",
                        "critical"
                      ]
                    },
                    "short_liquidation_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high",
                        "critical"
                      ]
                    },
                    "liquidation_cluster_map": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "price_level": {
                            "type": "number"
                          },
                          "side": {
                            "type": "string",
                            "enum": [
                              "long",
                              "short"
                            ]
                          },
                          "notional_usd": {
                            "type": "number"
                          },
                          "distance_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "price_levels": {
                      "type": "object",
                      "properties": {
                        "current_price": {
                          "type": "number"
                        },
                        "nearest_long_cluster": {
                          "type": "number"
                        },
                        "nearest_short_cluster": {
                          "type": "number"
                        },
                        "cascade_trigger_long": {
                          "type": "number"
                        },
                        "cascade_trigger_short": {
                          "type": "number"
                        }
                      }
                    },
                    "expected_cascade_size_usd": {
                      "type": "number"
                    },
                    "invalidation_levels": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "level": {
                            "type": "number"
                          },
                          "condition": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "directional_bias": {
                      "type": "string",
                      "enum": [
                        "long_squeeze",
                        "short_squeeze",
                        "neutral"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "cascade_probability": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "cluster_map": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "directional_bias": {
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
