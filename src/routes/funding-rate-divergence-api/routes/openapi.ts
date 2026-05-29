import { Router, Request, Response } from 'express';
const router = Router();

// Funding Rate Divergence API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Funding Rate Divergence API",
    "version": "1.0.0",
    "description": "Detects abnormal perpetual funding, spot/perp basis divergence, crowded positioning, and squeeze probability across exchanges. Returns funding by exchange, historical percentile, crowding score, and long/short bias for squeeze-trade agents.",
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
        "rates": "$0.004",
        "divergence": "$0.007",
        "lookup": "$0.015"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/funding-rate-divergence"
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
        "operationId": "fundingRateDivergenceDiscovery",
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
                        "rates": {
                          "type": "string"
                        },
                        "divergence": {
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
    "/rates": {
      "post": {
        "operationId": "fundingRates",
        "summary": "Funding rates by exchange with annualized rate and next funding window",
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
            "description": "Funding rates by exchange with annualized rate and next funding window",
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
                    "funding_by_exchange": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "exchange": {
                            "type": "string"
                          },
                          "funding_rate_pct": {
                            "type": "number"
                          },
                          "next_funding_in_min": {
                            "type": "integer"
                          },
                          "annualized_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "aggregate_funding_pct": {
                      "type": "number"
                    },
                    "regime": {
                      "type": "string",
                      "enum": [
                        "positive",
                        "negative",
                        "neutral"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "funding_by_exchange": {
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
    "/divergence": {
      "post": {
        "operationId": "fundingDivergence",
        "summary": "Spot/perp basis divergence with historical percentile and crowding score",
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
            "description": "Spot/perp basis divergence with historical percentile and crowding score",
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
                    "spot_perp_basis": {
                      "type": "number"
                    },
                    "basis_pct": {
                      "type": "number"
                    },
                    "historical_percentile": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "divergence_signal": {
                      "type": "string",
                      "enum": [
                        "converging",
                        "diverging",
                        "extreme"
                      ]
                    },
                    "crowding_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "long_short_bias": {
                      "type": "string",
                      "enum": [
                        "long_crowded",
                        "short_crowded",
                        "balanced"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "divergence_signal": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "crowding_score": {
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
        "operationId": "fundingLookup",
        "summary": "ONE-CALL: funding by exchange + divergence + crowding + squeeze probability",
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
            "description": "ONE-CALL: funding by exchange + divergence + crowding + squeeze probability",
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
                    "funding_by_exchange": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "exchange": {
                            "type": "string"
                          },
                          "funding_rate_pct": {
                            "type": "number"
                          },
                          "annualized_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "historical_percentile": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "spot_perp_basis": {
                      "type": "number"
                    },
                    "crowding_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "squeeze_probability_pct": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "long_short_bias": {
                      "type": "string",
                      "enum": [
                        "long_crowded",
                        "short_crowded",
                        "balanced"
                      ]
                    },
                    "squeeze_direction": {
                      "type": "string",
                      "enum": [
                        "long_squeeze",
                        "short_squeeze",
                        "none"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "squeeze_probability": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "crowding_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "long_short_bias": {
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
