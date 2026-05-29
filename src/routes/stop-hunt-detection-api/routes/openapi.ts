import { Router, Request, Response } from 'express';
const router = Router();

// Stop Hunt Detection API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Stop Hunt Detection API",
    "version": "1.0.0",
    "description": "Identifies stop-loss clusters, liquidity-grab probability, trap direction, and false-breakout risk with recent wick analysis. Gates entries against manipulation-driven liquidity sweeps.",
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
        "clusters": "$0.005",
        "detect": "$0.007",
        "lookup": "$0.016"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-execution-gate-required": true,
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/stop-hunt-detection"
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
        "operationId": "stopHuntDetectionDiscovery",
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
                        "clusters": {
                          "type": "string"
                        },
                        "detect": {
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
    "/clusters": {
      "post": {
        "operationId": "stopClusters",
        "summary": "Stop-loss cluster levels by side with estimated size and distance",
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
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "5m",
                      "15m",
                      "1h",
                      "4h"
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
            "description": "Stop-loss cluster levels by side with estimated size and distance",
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
                    "stop_cluster_levels": {
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
                              "long_stops",
                              "short_stops"
                            ]
                          },
                          "estimated_size_usd": {
                            "type": "number"
                          },
                          "distance_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "nearest_cluster": {
                      "type": "number"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "stop_cluster_levels": {
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
    "/detect": {
      "post": {
        "operationId": "stopHuntDetect",
        "summary": "Liquidity-grab probability, trap direction, false-breakout risk, wick analysis",
        "x-pricing": {
          "price": "$0.007",
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
                      "5m",
                      "15m",
                      "1h",
                      "4h"
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
            "description": "Liquidity-grab probability, trap direction, false-breakout risk, wick analysis",
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
                    "liquidity_grab_probability_pct": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "trap_direction": {
                      "type": "string",
                      "enum": [
                        "bull_trap",
                        "bear_trap",
                        "none"
                      ]
                    },
                    "false_breakout_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "recent_wick_analysis": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timeframe": {
                            "type": "string"
                          },
                          "wick_type": {
                            "type": "string",
                            "enum": [
                              "upper",
                              "lower"
                            ]
                          },
                          "rejection_strength": {
                            "type": "string",
                            "enum": [
                              "weak",
                              "moderate",
                              "strong"
                            ]
                          }
                        }
                      }
                    },
                    "historical_accuracy": {
                      "type": "object",
                      "properties": {
                        "stop_hunt_detection_accuracy_30d": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "liquidity_grab_probability": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "trap_direction": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "false_breakout_risk": {
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
        "operationId": "stopHuntLookup",
        "summary": "ONE-CALL: stop clusters + grab probability + trap direction + breakout risk",
        "x-pricing": {
          "price": "$0.016",
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
                      "5m",
                      "15m",
                      "1h",
                      "4h"
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
            "description": "ONE-CALL: stop clusters + grab probability + trap direction + breakout risk",
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
                    "stop_cluster_levels": {
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
                              "long_stops",
                              "short_stops"
                            ]
                          },
                          "estimated_size_usd": {
                            "type": "number"
                          },
                          "distance_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "liquidity_grab_probability_pct": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "trap_direction": {
                      "type": "string",
                      "enum": [
                        "bull_trap",
                        "bear_trap",
                        "none"
                      ]
                    },
                    "false_breakout_risk": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "recent_wick_analysis": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timeframe": {
                            "type": "string"
                          },
                          "wick_type": {
                            "type": "string",
                            "enum": [
                              "upper",
                              "lower"
                            ]
                          },
                          "rejection_strength": {
                            "type": "string",
                            "enum": [
                              "weak",
                              "moderate",
                              "strong"
                            ]
                          }
                        }
                      }
                    },
                    "historical_accuracy": {
                      "type": "object",
                      "properties": {
                        "stop_hunt_detection_accuracy_30d": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "liquidity_grab_probability": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "trap_direction": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "false_breakout_risk": {
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
