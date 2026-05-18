import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "App Store Lookup API",
    "version": "2.0.0",
    "description": "Look up iOS and Android app metadata, ratings, reviews, and competitor analysis.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 200
      },
      "pay_per_call": {
        "lookup": "$0.003",
        "reviews": "$0.005",
        "similar": "$0.004",
        "execution-gate": "$0.001",
        "app-intelligence": "$0.010"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/app-store-lookup",
      "description": "Production"
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
        "operationId": "discover",
        "summary": "Discovery \u2014 endpoints, pricing, rate limits",
        "tags": [
          "Discovery"
        ],
        "security": [],
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "name": "App Store Lookup API",
                  "version": "2.0.0",
                  "description": "Look up iOS and Android app metadata, ratings, reviews, and competitor analysis.",
                  "base_url": "https://orbis-apis.onrender.com/app-store-lookup",
                  "docs_url": "https://orbis-apis.onrender.com/app-store-lookup/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 200
                    },
                    "pay_per_call": {
                      "lookup": "$0.003",
                      "reviews": "$0.005",
                      "similar": "$0.004",
                      "execution-gate": "$0.001",
                      "app-intelligence": "$0.010"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "Lookup",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/reviews",
                      "summary": "Reviews",
                      "price_usd": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/similar",
                      "summary": "Similar",
                      "price_usd": 0.004
                    },
                    {
                      "method": "POST",
                      "path": "/app-intelligence",
                      "summary": "App Intelligence",
                      "price_usd": 0.01
                    },
                    {
                      "method": "POST",
                      "path": "/execution-gate",
                      "summary": "Execution Gate",
                      "price_usd": 0.001
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "Lookup",
        "tags": [
          "Intelligence"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "app_name_or_id"
                ],
                "properties": {
                  "app_name_or_id": {
                    "type": "string",
                    "example": "com.spotify.music"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "ios",
                      "android",
                      "both"
                    ],
                    "default": "both"
                  },
                  "country": {
                    "type": "string",
                    "example": "US"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Lookup",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "request_id",
                    "data",
                    "confidence",
                    "provenance"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "request_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "data": {
                      "$ref": "#/components/schemas/AppLookupData"
                    },
                    "confidence": {
                      "$ref": "#/components/schemas/Confidence"
                    },
                    "provenance": {
                      "$ref": "#/components/schemas/Provenance"
                    },
                    "cache": {
                      "$ref": "#/components/schemas/Cache"
                    },
                    "recommended_next_api": {
                      "$ref": "#/components/schemas/NextApi"
                    },
                    "recommended_actions_priority_order": {
                      "$ref": "#/components/schemas/Recommendation"
                    },
                    "execution_metadata": {
                      "$ref": "#/components/schemas/ExecMeta"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "domain is required",
                  "code": "MISSING_INPUT",
                  "retryable": false
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "429": {
            "description": "Rate limit exceeded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "Upstream model error",
                  "code": "UPSTREAM_ERROR",
                  "retryable": true
                }
              }
            }
          }
        }
      }
    },
    "/reviews": {
      "post": {
        "operationId": "reviews",
        "summary": "Reviews",
        "tags": [
          "Intelligence"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "app_id"
                ],
                "properties": {
                  "app_id": {
                    "type": "string"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "ios",
                      "android"
                    ]
                  },
                  "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100,
                    "default": 20
                  },
                  "sort": {
                    "type": "string",
                    "enum": [
                      "recent",
                      "helpful",
                      "critical"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reviews",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "request_id",
                    "data",
                    "confidence",
                    "provenance"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "request_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "data": {
                      "$ref": "#/components/schemas/AppReviewsData"
                    },
                    "confidence": {
                      "$ref": "#/components/schemas/Confidence"
                    },
                    "provenance": {
                      "$ref": "#/components/schemas/Provenance"
                    },
                    "cache": {
                      "$ref": "#/components/schemas/Cache"
                    },
                    "recommended_next_api": {
                      "$ref": "#/components/schemas/NextApi"
                    },
                    "recommended_actions_priority_order": {
                      "$ref": "#/components/schemas/Recommendation"
                    },
                    "execution_metadata": {
                      "$ref": "#/components/schemas/ExecMeta"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "domain is required",
                  "code": "MISSING_INPUT",
                  "retryable": false
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "429": {
            "description": "Rate limit exceeded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "Upstream model error",
                  "code": "UPSTREAM_ERROR",
                  "retryable": true
                }
              }
            }
          }
        }
      }
    },
    "/similar": {
      "post": {
        "operationId": "similar",
        "summary": "Similar",
        "tags": [
          "Intelligence"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "app_id"
                ],
                "properties": {
                  "app_id": {
                    "type": "string"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "ios",
                      "android"
                    ]
                  },
                  "limit": {
                    "type": "integer",
                    "default": 10
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Similar",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "request_id",
                    "data",
                    "confidence",
                    "provenance"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "request_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "data": {
                      "$ref": "#/components/schemas/AppSimilarData"
                    },
                    "confidence": {
                      "$ref": "#/components/schemas/Confidence"
                    },
                    "provenance": {
                      "$ref": "#/components/schemas/Provenance"
                    },
                    "cache": {
                      "$ref": "#/components/schemas/Cache"
                    },
                    "recommended_next_api": {
                      "$ref": "#/components/schemas/NextApi"
                    },
                    "recommended_actions_priority_order": {
                      "$ref": "#/components/schemas/Recommendation"
                    },
                    "execution_metadata": {
                      "$ref": "#/components/schemas/ExecMeta"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "domain is required",
                  "code": "MISSING_INPUT",
                  "retryable": false
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "429": {
            "description": "Rate limit exceeded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "Upstream model error",
                  "code": "UPSTREAM_ERROR",
                  "retryable": true
                }
              }
            }
          }
        }
      }
    },
    "/app-intelligence": {
      "post": {
        "operationId": "app_intelligence",
        "summary": "ONE-CALL: App Store Lookup \u2014 full intelligence in one request",
        "tags": [
          "Intelligence"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "app_name_or_id"
                ],
                "properties": {
                  "app_name_or_id": {
                    "type": "string"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "ios",
                      "android",
                      "both"
                    ]
                  },
                  "country": {
                    "type": "string",
                    "default": "US"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: App Store Lookup \u2014 full intelligence in one request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "request_id",
                    "data",
                    "confidence",
                    "provenance"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "request_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "data": {
                      "$ref": "#/components/schemas/AppIntelligenceData"
                    },
                    "confidence": {
                      "$ref": "#/components/schemas/Confidence"
                    },
                    "provenance": {
                      "$ref": "#/components/schemas/Provenance"
                    },
                    "cache": {
                      "$ref": "#/components/schemas/Cache"
                    },
                    "recommended_next_api": {
                      "$ref": "#/components/schemas/NextApi"
                    },
                    "recommended_actions_priority_order": {
                      "$ref": "#/components/schemas/Recommendation"
                    },
                    "execution_metadata": {
                      "$ref": "#/components/schemas/ExecMeta"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "domain is required",
                  "code": "MISSING_INPUT",
                  "retryable": false
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "429": {
            "description": "Rate limit exceeded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                },
                "example": {
                  "error": "Upstream model error",
                  "code": "UPSTREAM_ERROR",
                  "retryable": true
                }
              }
            }
          }
        },
        "x-one-call": true
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "execution_gate",
        "summary": "Execution readiness check \u2014 validate input and get next-step routing",
        "tags": [
          "Execution"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "app_name_or_id"
                ],
                "properties": {
                  "app_name_or_id": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "app_name_or_id": "example.com",
                "objective": "run app-intelligence"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Execution gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "request_id",
                    "execution_ready"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "request_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "execution_ready": {
                      "type": "boolean"
                    },
                    "next_api": {
                      "type": "string"
                    },
                    "next_endpoint": {
                      "type": "string"
                    },
                    "blocking_flags": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "confidence": {
                      "$ref": "#/components/schemas/Confidence"
                    },
                    "provenance": {
                      "$ref": "#/components/schemas/Provenance"
                    },
                    "execution_metadata": {
                      "$ref": "#/components/schemas/ExecMeta"
                    }
                  }
                },
                "example": {
                  "success": true,
                  "request_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
                  "execution_ready": true,
                  "next_api": "app-store-lookup",
                  "next_endpoint": "/app-intelligence",
                  "blocking_flags": [],
                  "confidence": {
                    "score": 0.98,
                    "reason": "Input valid"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
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
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "required": [
          "score"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "reason": {
            "type": "string"
          },
          "per_section": {
            "type": "object",
            "additionalProperties": {
              "type": "number"
            }
          }
        }
      },
      "Provenance": {
        "type": "object",
        "required": [
          "provider",
          "retrieved_at"
        ],
        "properties": {
          "provider": {
            "type": "string"
          },
          "retrieved_at": {
            "type": "string",
            "format": "date-time"
          },
          "source_type": {
            "type": "string",
            "enum": [
              "live_scan",
              "cached",
              "ai_generated",
              "api_call"
            ]
          }
        }
      },
      "Cache": {
        "type": "object",
        "properties": {
          "recommended_ttl_seconds": {
            "type": "integer"
          },
          "retryable": {
            "type": "boolean"
          },
          "cache_recommended": {
            "type": "boolean"
          }
        }
      },
      "NextApi": {
        "type": "array",
        "items": {
          "type": "object",
          "required": [
            "api",
            "reason"
          ],
          "properties": {
            "api": {
              "type": "string"
            },
            "endpoint": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            }
          }
        }
      },
      "Recommendation": {
        "type": "array",
        "items": {
          "type": "object",
          "required": [
            "priority",
            "action"
          ],
          "properties": {
            "priority": {
              "type": "string",
              "enum": [
                "high",
                "medium",
                "low"
              ]
            },
            "action": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            }
          }
        }
      },
      "ExecMeta": {
        "type": "object",
        "properties": {
          "latency_ms": {
            "type": "integer"
          },
          "model": {
            "type": "string"
          },
          "automation_safe": {
            "type": "boolean"
          }
        }
      },
      "Error": {
        "type": "object",
        "required": [
          "error",
          "code"
        ],
        "properties": {
          "error": {
            "type": "string"
          },
          "code": {
            "type": "string"
          },
          "retryable": {
            "type": "boolean"
          },
          "details": {
            "type": "string"
          }
        }
      },
      "AppLookupData": {
        "type": "object",
        "required": [
          "app_id",
          "name",
          "platform"
        ],
        "properties": {
          "app_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "developer": {
            "type": "string"
          },
          "platform": {
            "type": "string",
            "enum": [
              "ios",
              "android",
              "both"
            ]
          },
          "rating": {
            "type": "number",
            "minimum": 0,
            "maximum": 5
          },
          "reviews_count": {
            "type": "integer"
          },
          "price": {
            "type": "number"
          },
          "category": {
            "type": "string"
          },
          "last_updated": {
            "type": "string",
            "format": "date"
          },
          "version": {
            "type": "string"
          },
          "size_mb": {
            "type": "number"
          },
          "age_rating": {
            "type": "string"
          },
          "downloads": {
            "type": "string"
          }
        }
      },
      "AppReviewsData": {
        "type": "object",
        "required": [
          "app_id",
          "reviews"
        ],
        "properties": {
          "app_id": {
            "type": "string"
          },
          "reviews": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "rating": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 5
                },
                "title": {
                  "type": "string"
                },
                "body": {
                  "type": "string"
                },
                "date": {
                  "type": "string",
                  "format": "date"
                },
                "version": {
                  "type": "string"
                }
              }
            }
          },
          "sentiment_summary": {
            "type": "object",
            "properties": {
              "positive": {
                "type": "number"
              },
              "neutral": {
                "type": "number"
              },
              "negative": {
                "type": "number"
              }
            }
          },
          "avg_rating": {
            "type": "number"
          },
          "total_reviews": {
            "type": "integer"
          }
        }
      },
      "AppSimilarData": {
        "type": "object",
        "required": [
          "app_id",
          "similar_apps"
        ],
        "properties": {
          "app_id": {
            "type": "string"
          },
          "similar_apps": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "developer": {
                  "type": "string"
                },
                "rating": {
                  "type": "number"
                },
                "downloads": {
                  "type": "string"
                },
                "overlap_score": {
                  "type": "number"
                }
              }
            }
          }
        }
      },
      "AppIntelligenceData": {
        "type": "object",
        "required": [
          "app_id",
          "market_position"
        ],
        "properties": {
          "app_id": {
            "type": "string"
          },
          "market_position": {
            "type": "string",
            "enum": [
              "market_leader",
              "strong_competitor",
              "niche",
              "declining"
            ]
          },
          "app_details": {
            "$ref": "#/components/schemas/AppLookupData"
          },
          "sentiment_summary": {
            "type": "object",
            "properties": {
              "positive": {
                "type": "number"
              },
              "neutral": {
                "type": "number"
              },
              "negative": {
                "type": "number"
              }
            }
          },
          "competitive_threats": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "growth_trend": {
            "type": "string",
            "enum": [
              "growing",
              "stable",
              "declining"
            ]
          }
        }
      }
    }
  }
});
});
export default router;
