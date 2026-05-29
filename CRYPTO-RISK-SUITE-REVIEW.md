# Crypto Risk & Execution Suite — 11 APIs for Review

These are 11 A+ Orbis-marketplace crypto APIs. Each API below has two parts:
1. **Marketplace Listing (info)** — category, pricing, tags, endpoints.
2. **OpenAPI 3.1 Specification** — full typed request/response schemas.

Please review for: schema completeness, agent/x402 readiness, pricing sanity, decision-oriented outputs, risk/execution gating, and anything missing for an A+ rating.

---

## Table of Contents

1. [Liquidation Cascade API](#1-liquidation-cascade)
2. [Funding Rate Divergence API](#2-funding-rate-divergence)
3. [Open Interest Intelligence API](#3-open-interest-intelligence)
4. [Orderbook Imbalance API](#4-orderbook-imbalance)
5. [Stop Hunt Detection API](#5-stop-hunt-detection)
6. [AI Risk Manager API](#6-ai-risk-manager)
7. [Position Sizing API](#7-position-sizing)
8. [AI Portfolio Hedging API](#8-ai-portfolio-hedging)
9. [Trade Execution Timing API](#9-trade-execution-timing)
10. [Smart Money Rotation API](#10-smart-money-rotation)
11. [Yield Farming Optimizer API](#11-yield-farming-optimizer)

---

## 1. Liquidation Cascade API
<a name="1-liquidation-cascade"></a>

**Slug:** `liquidation-cascade` · **Category:** derivatives · **Latency tier:** fast · **Base URL:** https://orbis-apis.onrender.com/liquidation-cascade

Detects liquidation clusters across leverage bands, estimates cascade probability, and quantifies long vs short liquidation risk with price levels and expected cascade size. Built for trading agents that must gate execution against forced-liquidation risk.

**Gating:** execution-gate-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Liquidation Cascade API",
  "shortDescription": "Detect liquidation clusters, cascade probability, and long/short liquidation risk",
  "description": "Detects liquidation clusters across leverage bands, estimates cascade probability, and quantifies long vs short liquidation risk with price levels and expected cascade size. Built for trading agents that must gate execution against forced-liquidation risk.",
  "category": "derivatives",
  "baseUrl": "https://orbis-apis.onrender.com/liquidation-cascade",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/liquidation-cascade/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/liquidation-cascade/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "liquidation",
    "cascade",
    "derivatives",
    "risk",
    "perpetuals"
  ],
  "keywords": [
    "liquidation cascade api",
    "liquidation heatmap api",
    "crypto liquidation risk",
    "long short liquidation",
    "cascade probability"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.018,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/clusters",
          "pricePerCallUsdc": 0.006,
          "description": "Liquidation cluster map across price levels and leverage bands"
        },
        {
          "method": "POST",
          "pathPattern": "/heatmap",
          "pricePerCallUsdc": 0.008,
          "description": "Liquidation heatmap with long/short intensity per price level"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.018,
          "description": "ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/clusters",
      "description": "Liquidation cluster map across price levels and leverage bands"
    },
    {
      "method": "POST",
      "path": "/heatmap",
      "description": "Liquidation heatmap with long/short intensity per price level"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 2. Funding Rate Divergence API
<a name="2-funding-rate-divergence"></a>

**Slug:** `funding-rate-divergence` · **Category:** derivatives · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/funding-rate-divergence

Detects abnormal perpetual funding, spot/perp basis divergence, crowded positioning, and squeeze probability across exchanges. Returns funding by exchange, historical percentile, crowding score, and long/short bias for squeeze-trade agents.

**Gating:** paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Funding Rate Divergence API",
  "shortDescription": "Detect abnormal perp funding, spot/perp divergence, crowded positioning, and squeeze risk",
  "description": "Detects abnormal perpetual funding, spot/perp basis divergence, crowded positioning, and squeeze probability across exchanges. Returns funding by exchange, historical percentile, crowding score, and long/short bias for squeeze-trade agents.",
  "category": "derivatives",
  "baseUrl": "https://orbis-apis.onrender.com/funding-rate-divergence",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/funding-rate-divergence/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/funding-rate-divergence/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "funding-rate",
    "perpetuals",
    "basis",
    "squeeze",
    "derivatives"
  ],
  "keywords": [
    "funding rate api",
    "spot perp basis api",
    "funding divergence",
    "squeeze probability",
    "crowded positioning crypto"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.015,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/rates",
          "pricePerCallUsdc": 0.004,
          "description": "Funding rates by exchange with annualized rate and next funding window"
        },
        {
          "method": "POST",
          "pathPattern": "/divergence",
          "pricePerCallUsdc": 0.007,
          "description": "Spot/perp basis divergence with historical percentile and crowding score"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.015,
          "description": "ONE-CALL: funding by exchange + divergence + crowding + squeeze probability"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/rates",
      "description": "Funding rates by exchange with annualized rate and next funding window"
    },
    {
      "method": "POST",
      "path": "/divergence",
      "description": "Spot/perp basis divergence with historical percentile and crowding score"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: funding by exchange + divergence + crowding + squeeze probability"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 3. Open Interest Intelligence API
<a name="3-open-interest-intelligence"></a>

**Slug:** `open-interest-intelligence` · **Category:** derivatives · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/open-interest-intelligence

Analyzes open interest expansion and contraction against price to interpret new longs/shorts vs covering, leverage buildup, and trend conviction. Returns liquidation-risk context for agents gating leveraged entries.

**Gating:** execution-gate-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Open Interest Intelligence API",
  "shortDescription": "Analyze open interest expansion, contraction, leverage buildup, and trend conviction",
  "description": "Analyzes open interest expansion and contraction against price to interpret new longs/shorts vs covering, leverage buildup, and trend conviction. Returns liquidation-risk context for agents gating leveraged entries.",
  "category": "derivatives",
  "baseUrl": "https://orbis-apis.onrender.com/open-interest-intelligence",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/open-interest-intelligence/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/open-interest-intelligence/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "open-interest",
    "leverage",
    "derivatives",
    "trend",
    "perpetuals"
  ],
  "keywords": [
    "open interest api",
    "oi change api",
    "leverage buildup",
    "price vs oi",
    "trend conviction crypto"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.015,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/oi",
          "pricePerCallUsdc": 0.004,
          "description": "Aggregate and per-exchange open interest snapshot"
        },
        {
          "method": "POST",
          "pathPattern": "/changes",
          "pricePerCallUsdc": 0.006,
          "description": "OI change vs price change with new-longs/shorts interpretation"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.015,
          "description": "ONE-CALL: OI + change interpretation + leverage buildup + trend conviction"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/oi",
      "description": "Aggregate and per-exchange open interest snapshot"
    },
    {
      "method": "POST",
      "path": "/changes",
      "description": "OI change vs price change with new-longs/shorts interpretation"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: OI + change interpretation + leverage buildup + trend conviction"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 4. Orderbook Imbalance API
<a name="4-orderbook-imbalance"></a>

**Slug:** `orderbook-imbalance` · **Category:** market-data · **Latency tier:** real-time · **Base URL:** https://orbis-apis.onrender.com/orderbook-imbalance

Detects bid/ask depth imbalance, liquidity walls, spoofing risk, and short-term directional pressure with slippage estimates. Real-time latency tier for execution-aware agents.

**Gating:** paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Orderbook Imbalance API",
  "shortDescription": "Detect bid/ask pressure, liquidity walls, spoof risk, and short-term directional pressure",
  "description": "Detects bid/ask depth imbalance, liquidity walls, spoofing risk, and short-term directional pressure with slippage estimates. Real-time latency tier for execution-aware agents.",
  "category": "market-data",
  "baseUrl": "https://orbis-apis.onrender.com/orderbook-imbalance",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/orderbook-imbalance/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/orderbook-imbalance/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "orderbook",
    "liquidity",
    "imbalance",
    "spoofing",
    "market-microstructure"
  ],
  "keywords": [
    "orderbook imbalance api",
    "liquidity walls api",
    "bid ask pressure",
    "spoofing detection crypto",
    "slippage estimate api"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.015,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/depth",
          "pricePerCallUsdc": 0.004,
          "description": "Bid/ask depth with cumulative size per level and spread"
        },
        {
          "method": "POST",
          "pathPattern": "/imbalance",
          "pricePerCallUsdc": 0.006,
          "description": "Imbalance ratio, liquidity walls, spoofing risk, short-term bias"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.015,
          "description": "ONE-CALL: depth + imbalance + walls + spoof risk + slippage estimates"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/depth",
      "description": "Bid/ask depth with cumulative size per level and spread"
    },
    {
      "method": "POST",
      "path": "/imbalance",
      "description": "Imbalance ratio, liquidity walls, spoofing risk, short-term bias"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: depth + imbalance + walls + spoof risk + slippage estimates"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 5. Stop Hunt Detection API
<a name="5-stop-hunt-detection"></a>

**Slug:** `stop-hunt-detection` · **Category:** market-data · **Latency tier:** fast · **Base URL:** https://orbis-apis.onrender.com/stop-hunt-detection

Identifies stop-loss clusters, liquidity-grab probability, trap direction, and false-breakout risk with recent wick analysis. Gates entries against manipulation-driven liquidity sweeps.

**Gating:** execution-gate-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Stop Hunt Detection API",
  "shortDescription": "Identify liquidity grabs, stop clusters, trap setups, and false breakout risk",
  "description": "Identifies stop-loss clusters, liquidity-grab probability, trap direction, and false-breakout risk with recent wick analysis. Gates entries against manipulation-driven liquidity sweeps.",
  "category": "market-data",
  "baseUrl": "https://orbis-apis.onrender.com/stop-hunt-detection",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/stop-hunt-detection/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/stop-hunt-detection/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "stop-hunt",
    "liquidity-grab",
    "trap",
    "false-breakout",
    "market-microstructure"
  ],
  "keywords": [
    "stop hunt detection api",
    "liquidity grab api",
    "bull trap bear trap",
    "false breakout risk",
    "stop cluster api"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.016,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/clusters",
          "pricePerCallUsdc": 0.005,
          "description": "Stop-loss cluster levels by side with estimated size and distance"
        },
        {
          "method": "POST",
          "pathPattern": "/detect",
          "pricePerCallUsdc": 0.007,
          "description": "Liquidity-grab probability, trap direction, false-breakout risk, wick analysis"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.016,
          "description": "ONE-CALL: stop clusters + grab probability + trap direction + breakout risk"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/clusters",
      "description": "Stop-loss cluster levels by side with estimated size and distance"
    },
    {
      "method": "POST",
      "path": "/detect",
      "description": "Liquidity-grab probability, trap direction, false-breakout risk, wick analysis"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: stop clusters + grab probability + trap direction + breakout risk"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 6. AI Risk Manager API
<a name="6-ai-risk-manager"></a>

**Slug:** `ai-risk-manager` · **Category:** risk · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/ai-risk-manager

Scores trade and portfolio risk before execution: risk score, max-loss estimate, volatility context, correlation risk, exposure breakdown, and recommended position adjustments. Human approval is mandatory before acting.

**Gating:** execution-gate-required, human-approval-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "AI Risk Manager API",
  "shortDescription": "Score trade and portfolio risk before execution",
  "description": "Scores trade and portfolio risk before execution: risk score, max-loss estimate, volatility context, correlation risk, exposure breakdown, and recommended position adjustments. Human approval is mandatory before acting.",
  "category": "risk",
  "baseUrl": "https://orbis-apis.onrender.com/ai-risk-manager",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/ai-risk-manager/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/ai-risk-manager/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "risk-management",
    "portfolio-risk",
    "trade-risk",
    "pre-trade",
    "execution-gate"
  ],
  "keywords": [
    "ai risk manager api",
    "trade risk score",
    "portfolio risk api",
    "max loss estimate",
    "pre-trade risk check"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.02,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/trade",
          "pricePerCallUsdc": 0.006,
          "description": "Pre-trade risk score with max loss, volatility, and position adjustment"
        },
        {
          "method": "POST",
          "pathPattern": "/portfolio",
          "pricePerCallUsdc": 0.01,
          "description": "Portfolio health score with exposure breakdown and rebalancing actions"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.02,
          "description": "ONE-CALL: trade + portfolio risk with full exposure and adjustment plan"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/trade",
      "description": "Pre-trade risk score with max loss, volatility, and position adjustment"
    },
    {
      "method": "POST",
      "path": "/portfolio",
      "description": "Portfolio health score with exposure breakdown and rebalancing actions"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: trade + portfolio risk with full exposure and adjustment plan"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
        "lookup": "$0.020"
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
          "price": "$0.020",
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
}
```

---

## 7. Position Sizing API
<a name="7-position-sizing"></a>

**Slug:** `position-sizing` · **Category:** risk · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/position-sizing

Calculates risk-adjusted position size from volatility, stop-loss distance, portfolio size, and confidence — including Kelly fraction, volatility-adjusted size, and risk-of-ruin estimate. Gates execution on sizing approval.

**Gating:** execution-gate-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Position Sizing API",
  "shortDescription": "Calculate risk-adjusted position size using volatility, stop loss, portfolio size, and confidence",
  "description": "Calculates risk-adjusted position size from volatility, stop-loss distance, portfolio size, and confidence — including Kelly fraction, volatility-adjusted size, and risk-of-ruin estimate. Gates execution on sizing approval.",
  "category": "risk",
  "baseUrl": "https://orbis-apis.onrender.com/position-sizing",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/position-sizing/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/position-sizing/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "position-sizing",
    "kelly",
    "risk-of-ruin",
    "volatility",
    "money-management"
  ],
  "keywords": [
    "position sizing api",
    "kelly fraction api",
    "risk of ruin",
    "volatility adjusted size",
    "stop loss sizing"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.018,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/calculate",
          "pricePerCallUsdc": 0.005,
          "description": "Risk-adjusted position size with Kelly fraction and risk of ruin"
        },
        {
          "method": "POST",
          "pathPattern": "/simulate",
          "pricePerCallUsdc": 0.008,
          "description": "Monte-Carlo-style scenario simulation of sizing outcomes"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.018,
          "description": "ONE-CALL: recommended size + Kelly + volatility-adjusted + risk of ruin"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/calculate",
      "description": "Risk-adjusted position size with Kelly fraction and risk of ruin"
    },
    {
      "method": "POST",
      "path": "/simulate",
      "description": "Monte-Carlo-style scenario simulation of sizing outcomes"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: recommended size + Kelly + volatility-adjusted + risk of ruin"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 8. AI Portfolio Hedging API
<a name="8-ai-portfolio-hedging"></a>

**Slug:** `ai-portfolio-hedging` · **Category:** risk · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/ai-portfolio-hedging

Recommends portfolio hedges using beta, correlation, volatility, and drawdown risk — with hedge candidates, sizing, stablecoin allocation, and options/perps notes. Human approval required before executing hedges.

**Gating:** execution-gate-required, human-approval-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "AI Portfolio Hedging API",
  "shortDescription": "Recommend portfolio hedges using correlation, volatility, beta, and drawdown risk",
  "description": "Recommends portfolio hedges using beta, correlation, volatility, and drawdown risk — with hedge candidates, sizing, stablecoin allocation, and options/perps notes. Human approval required before executing hedges.",
  "category": "risk",
  "baseUrl": "https://orbis-apis.onrender.com/ai-portfolio-hedging",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/ai-portfolio-hedging/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/ai-portfolio-hedging/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "hedging",
    "portfolio",
    "beta",
    "correlation",
    "drawdown"
  ],
  "keywords": [
    "portfolio hedging api",
    "crypto hedge api",
    "portfolio beta",
    "correlation matrix",
    "drawdown hedge"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.022,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/analyze",
          "pricePerCallUsdc": 0.008,
          "description": "Portfolio beta, correlation summary, and drawdown risk"
        },
        {
          "method": "POST",
          "pathPattern": "/hedges",
          "pricePerCallUsdc": 0.01,
          "description": "Hedge candidates with sizing, stablecoin allocation, and options/perps notes"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.022,
          "description": "ONE-CALL: beta + correlation + drawdown + hedge plan + stablecoin allocation"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/analyze",
      "description": "Portfolio beta, correlation summary, and drawdown risk"
    },
    {
      "method": "POST",
      "path": "/hedges",
      "description": "Hedge candidates with sizing, stablecoin allocation, and options/perps notes"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: beta + correlation + drawdown + hedge plan + stablecoin allocation"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 9. Trade Execution Timing API
<a name="9-trade-execution-timing"></a>

**Slug:** `trade-execution-timing` · **Category:** market-data · **Latency tier:** real-time · **Base URL:** https://orbis-apis.onrender.com/trade-execution-timing

Finds the best execution window using liquidity, volatility, spread, and slippage forecasts — with an avoid-until signal and urgency score. Real-time latency tier; gates execution on timing approval.

**Gating:** execution-gate-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Trade Execution Timing API",
  "shortDescription": "Find best timing windows for execution based on liquidity, volatility, spread, and slippage",
  "description": "Finds the best execution window using liquidity, volatility, spread, and slippage forecasts — with an avoid-until signal and urgency score. Real-time latency tier; gates execution on timing approval.",
  "category": "market-data",
  "baseUrl": "https://orbis-apis.onrender.com/trade-execution-timing",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/trade-execution-timing/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/trade-execution-timing/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "execution",
    "timing",
    "slippage",
    "liquidity",
    "spread"
  ],
  "keywords": [
    "trade execution timing api",
    "best execution window",
    "slippage forecast api",
    "liquidity window",
    "execution urgency"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.018,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/window",
          "pricePerCallUsdc": 0.005,
          "description": "Best execution window with avoid-until and urgency score"
        },
        {
          "method": "POST",
          "pathPattern": "/forecast",
          "pricePerCallUsdc": 0.008,
          "description": "Spread, slippage, volatility, and liquidity forecasts over the horizon"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.018,
          "description": "ONE-CALL: best window + spread/slippage/volatility forecast + urgency"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/window",
      "description": "Best execution window with avoid-until and urgency score"
    },
    {
      "method": "POST",
      "path": "/forecast",
      "description": "Spread, slippage, volatility, and liquidity forecasts over the horizon"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: best window + spread/slippage/volatility forecast + urgency"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
}
```

---

## 10. Smart Money Rotation API
<a name="10-smart-money-rotation"></a>

**Slug:** `smart-money-rotation` · **Category:** on-chain · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/smart-money-rotation

Tracks smart-money rotation across sectors and narratives — inflow/outflow by sector, narrative rotation score, top accumulated tokens, smart-wallet participation, and rotation stage. For agents front-running capital rotation.

**Gating:** paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Smart Money Rotation API",
  "shortDescription": "Track smart-money rotation across sectors, narratives, chains, and tokens",
  "description": "Tracks smart-money rotation across sectors and narratives — inflow/outflow by sector, narrative rotation score, top accumulated tokens, smart-wallet participation, and rotation stage. For agents front-running capital rotation.",
  "category": "on-chain",
  "baseUrl": "https://orbis-apis.onrender.com/smart-money-rotation",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/smart-money-rotation/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/smart-money-rotation/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "smart-money",
    "rotation",
    "narratives",
    "sectors",
    "on-chain"
  ],
  "keywords": [
    "smart money rotation api",
    "sector rotation crypto",
    "narrative rotation",
    "smart wallet participation",
    "capital flow api"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.018,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/sectors",
          "pricePerCallUsdc": 0.006,
          "description": "Inflow/outflow by sector with net rotation"
        },
        {
          "method": "POST",
          "pathPattern": "/narratives",
          "pricePerCallUsdc": 0.008,
          "description": "Narrative rotation score, momentum per narrative, and rotation stage"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.018,
          "description": "ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/sectors",
      "description": "Inflow/outflow by sector with net rotation"
    },
    {
      "method": "POST",
      "path": "/narratives",
      "description": "Narrative rotation score, momentum per narrative, and rotation stage"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Smart Money Rotation API",
    "version": "1.0.0",
    "description": "Tracks smart-money rotation across sectors and narratives — inflow/outflow by sector, narrative rotation score, top accumulated tokens, smart-wallet participation, and rotation stage. For agents front-running capital rotation.",
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
        "sectors": "$0.006",
        "narratives": "$0.008",
        "lookup": "$0.018"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/smart-money-rotation"
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
        "operationId": "smartMoneyRotationDiscovery",
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
                        "sectors": {
                          "type": "string"
                        },
                        "narratives": {
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
    "/sectors": {
      "post": {
        "operationId": "rotationSectors",
        "summary": "Inflow/outflow by sector with net rotation",
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
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "24h",
                      "7d",
                      "30d"
                    ]
                  },
                  "chains": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Inflow/outflow by sector with net rotation",
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
                    "inflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "inflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "outflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "outflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "net_rotation": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "net_flow_usd": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "inflow_by_sector": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "net_rotation": {
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
    "/narratives": {
      "post": {
        "operationId": "rotationNarratives",
        "summary": "Narrative rotation score, momentum per narrative, and rotation stage",
        "x-pricing": {
          "price": "$0.008",
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
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "24h",
                      "7d",
                      "30d"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Narrative rotation score, momentum per narrative, and rotation stage",
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
                    "narrative_rotation_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "narratives": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "narrative": {
                            "type": "string"
                          },
                          "momentum": {
                            "type": "string",
                            "enum": [
                              "rising",
                              "peaking",
                              "fading"
                            ]
                          },
                          "inflow_usd": {
                            "type": "number"
                          },
                          "smart_wallet_count": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "rotation_stage": {
                      "type": "string",
                      "enum": [
                        "early",
                        "mid",
                        "late",
                        "exhausted"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "narrative_rotation_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "rotation_stage": {
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
        "operationId": "rotationLookup",
        "summary": "ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage",
        "x-pricing": {
          "price": "$0.018",
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
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "24h",
                      "7d",
                      "30d"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage",
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
                    "inflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "inflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "outflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "outflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "narrative_rotation_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "top_accumulated_tokens": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "symbol": {
                            "type": "string"
                          },
                          "net_accumulation_usd": {
                            "type": "number"
                          },
                          "smart_wallet_count": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "smart_wallet_participation": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "rotation_stage": {
                      "type": "string",
                      "enum": [
                        "early",
                        "mid",
                        "late",
                        "exhausted"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "narrative_rotation_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "rotation_stage": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "smart_wallet_participation": {
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
}
```

---

## 11. Yield Farming Optimizer API
<a name="11-yield-farming-optimizer"></a>

**Slug:** `yield-farming-optimizer` · **Category:** defi · **Latency tier:** standard · **Base URL:** https://orbis-apis.onrender.com/yield-farming-optimizer

Ranks DeFi yield opportunities by risk-adjusted APY, sustainability, protocol and liquidity risk, withdrawal delay, and impermanent-loss risk — with a recommended action. Human approval required before acting on deposit recommendations.

**Gating:** human-approval-required, paper-mode-recommended

### Marketplace Listing (info)

```json
{
  "name": "Yield Farming Optimizer API",
  "shortDescription": "Rank DeFi yield opportunities by APY sustainability, protocol risk, liquidity, and withdrawal friction",
  "description": "Ranks DeFi yield opportunities by risk-adjusted APY, sustainability, protocol and liquidity risk, withdrawal delay, and impermanent-loss risk — with a recommended action. Human approval required before acting on deposit recommendations.",
  "category": "defi",
  "baseUrl": "https://orbis-apis.onrender.com/yield-farming-optimizer",
  "websiteUrl": "https://orbis-apis.onrender.com",
  "docsUrl": "https://orbis-apis.onrender.com/yield-farming-optimizer/openapi.json",
  "openApiSpecUrl": "https://orbis-apis.onrender.com/yield-farming-optimizer/openapi.json",
  "logoUrl": "https://orbis-apis.onrender.com/logo.png",
  "tags": [
    "yield-farming",
    "defi",
    "apy",
    "sustainability",
    "impermanent-loss"
  ],
  "keywords": [
    "yield farming optimizer api",
    "risk adjusted apy",
    "defi yield api",
    "apy sustainability",
    "impermanent loss risk"
  ],
  "tiers": [
    {
      "name": "Free",
      "isFree": true,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000
    },
    {
      "name": "Pay Per Call",
      "isFree": false,
      "pricingType": "per_call",
      "pricePerCall": 0.018,
      "requestsPerDay": 50000,
      "requestsPerMonth": 1500000,
      "endpointPricing": [
        {
          "method": "POST",
          "pathPattern": "/opportunities",
          "pricePerCallUsdc": 0.006,
          "description": "Ranked yield opportunities by risk-adjusted APY and sustainability"
        },
        {
          "method": "POST",
          "pathPattern": "/compare",
          "pricePerCallUsdc": 0.008,
          "description": "Side-by-side comparison with protocol/liquidity/IL risk and best pick"
        },
        {
          "method": "POST",
          "pathPattern": "/lookup",
          "pricePerCallUsdc": 0.018,
          "description": "ONE-CALL: APY + sustainability + protocol/liquidity/IL risk + recommended action"
        }
      ]
    }
  ],
  "endpoints": [
    {
      "method": "POST",
      "path": "/opportunities",
      "description": "Ranked yield opportunities by risk-adjusted APY and sustainability"
    },
    {
      "method": "POST",
      "path": "/compare",
      "description": "Side-by-side comparison with protocol/liquidity/IL risk and best pick"
    },
    {
      "method": "POST",
      "path": "/lookup",
      "description": "ONE-CALL: APY + sustainability + protocol/liquidity/IL risk + recommended action"
    }
  ]
}
```

### OpenAPI 3.1 Specification

```json
{
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
        "lookup": "$0.018"
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
}
```

---
