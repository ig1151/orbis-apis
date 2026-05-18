import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Hashtag Generator API",
    "version": "2.0.0",
    "description": "Generate high-performing hashtags for social media. Analyze trending hashtags, estimate reach, and optimize per platform.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "generate": "$0.002",
        "analyze": "$0.003",
        "trending": "$0.003",
        "execution-gate": "$0.001",
        "hashtag-intelligence": "$0.007"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/hashtag-generator",
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
                  "name": "Hashtag Generator API",
                  "version": "2.0.0",
                  "description": "Generate high-performing hashtags for social media. Analyze trending hashtags, estimate reach, and optimize per platform.",
                  "base_url": "https://orbis-apis.onrender.com/hashtag-generator",
                  "docs_url": "https://orbis-apis.onrender.com/hashtag-generator/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 500
                    },
                    "pay_per_call": {
                      "generate": "$0.002",
                      "analyze": "$0.003",
                      "trending": "$0.003",
                      "execution-gate": "$0.001",
                      "hashtag-intelligence": "$0.007"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/generate",
                      "summary": "Generate",
                      "price_usd": 0.002
                    },
                    {
                      "method": "POST",
                      "path": "/analyze",
                      "summary": "Analyze",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/trending",
                      "summary": "Trending",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/hashtag-intelligence",
                      "summary": "Hashtag Intelligence",
                      "price_usd": 0.007
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
    "/generate": {
      "post": {
        "operationId": "generate",
        "summary": "Generate",
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
                  "topic"
                ],
                "properties": {
                  "topic": {
                    "type": "string",
                    "example": "sustainable fashion"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "instagram",
                      "twitter",
                      "linkedin",
                      "tiktok",
                      "generic"
                    ],
                    "default": "instagram"
                  },
                  "count": {
                    "type": "integer",
                    "default": 30
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Generate",
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
                      "$ref": "#/components/schemas/HashtagGenerateData"
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
    "/analyze": {
      "post": {
        "operationId": "analyze",
        "summary": "Analyze",
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
                  "hashtag"
                ],
                "properties": {
                  "hashtag": {
                    "type": "string",
                    "example": "#sustainablefashion"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "instagram",
                      "twitter",
                      "linkedin",
                      "tiktok"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Analyze",
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
                      "$ref": "#/components/schemas/HashtagAnalyzeData"
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
    "/trending": {
      "post": {
        "operationId": "trending",
        "summary": "Trending",
        "tags": [
          "Intelligence"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [],
                "properties": {
                  "category": {
                    "type": "string",
                    "example": "technology"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "instagram",
                      "twitter",
                      "linkedin",
                      "tiktok"
                    ],
                    "default": "instagram"
                  },
                  "limit": {
                    "type": "integer",
                    "default": 20
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Trending",
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
                      "$ref": "#/components/schemas/HashtagTrendingData"
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
    "/hashtag-intelligence": {
      "post": {
        "operationId": "hashtag_intelligence",
        "summary": "ONE-CALL: Hashtag Generator \u2014 full intelligence in one request",
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
                  "topic"
                ],
                "properties": {
                  "topic": {
                    "type": "string"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "instagram",
                      "twitter",
                      "linkedin",
                      "tiktok",
                      "generic"
                    ]
                  },
                  "brand": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: Hashtag Generator \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/HashtagIntelligenceData"
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
                  "topic"
                ],
                "properties": {
                  "topic": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "topic": "example.com",
                "objective": "run hashtag-intelligence"
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
                  "next_api": "hashtag-generator",
                  "next_endpoint": "/hashtag-intelligence",
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
      "HashtagGenerateData": {
        "type": "object",
        "required": [
          "topic",
          "hashtags"
        ],
        "properties": {
          "topic": {
            "type": "string"
          },
          "hashtags": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "hashtag",
                "category"
              ],
              "properties": {
                "hashtag": {
                  "type": "string"
                },
                "category": {
                  "type": "string",
                  "enum": [
                    "primary",
                    "secondary",
                    "niche",
                    "trending",
                    "broad"
                  ]
                },
                "estimated_reach": {
                  "type": "string"
                },
                "competition_level": {
                  "type": "string",
                  "enum": [
                    "high",
                    "medium",
                    "low"
                  ]
                },
                "relevance_score": {
                  "type": "number"
                }
              }
            }
          },
          "recommended_count": {
            "type": "integer"
          },
          "platform_recommendation": {
            "type": "object",
            "additionalProperties": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      },
      "HashtagAnalyzeData": {
        "type": "object",
        "required": [
          "hashtag"
        ],
        "properties": {
          "hashtag": {
            "type": "string"
          },
          "estimated_reach": {
            "type": "string"
          },
          "post_count": {
            "type": "string"
          },
          "competition_level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "trending_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "peak_usage_time": {
            "type": "string"
          },
          "related_hashtags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "HashtagTrendingData": {
        "type": "object",
        "required": [
          "trending_hashtags"
        ],
        "properties": {
          "category": {
            "type": "string"
          },
          "trending_hashtags": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "hashtag",
                "momentum"
              ],
              "properties": {
                "hashtag": {
                  "type": "string"
                },
                "momentum": {
                  "type": "string",
                  "enum": [
                    "rising",
                    "stable",
                    "declining"
                  ]
                },
                "post_count": {
                  "type": "string"
                },
                "peak_hour": {
                  "type": "string"
                }
              }
            }
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "HashtagIntelligenceData": {
        "type": "object",
        "required": [
          "topic",
          "strategy"
        ],
        "properties": {
          "topic": {
            "type": "string"
          },
          "strategy": {
            "type": "string",
            "enum": [
              "broad_reach",
              "niche_targeting",
              "trending_boost",
              "balanced"
            ]
          },
          "generated": {
            "$ref": "#/components/schemas/HashtagGenerateData"
          },
          "trending_overlap": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "estimated_reach_multiplier": {
            "type": "number"
          },
          "optimal_count": {
            "type": "integer"
          }
        }
      }
    }
  }
});
});
export default router;
