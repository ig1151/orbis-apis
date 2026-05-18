import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Caption Generator API",
    "version": "2.0.0",
    "description": "Generate engaging social media captions for posts, images, and videos. Optimize for Instagram, LinkedIn, Twitter, and TikTok.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "generate": "$0.003",
        "optimize": "$0.003",
        "batch": "$0.020",
        "execution-gate": "$0.001",
        "caption-intelligence": "$0.008"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/caption-generator",
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
                  "name": "Caption Generator API",
                  "version": "2.0.0",
                  "description": "Generate engaging social media captions for posts, images, and videos. Optimize for Instagram, LinkedIn, Twitter, and TikTok.",
                  "base_url": "https://orbis-apis.onrender.com/caption-generator",
                  "docs_url": "https://orbis-apis.onrender.com/caption-generator/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 300
                    },
                    "pay_per_call": {
                      "generate": "$0.003",
                      "optimize": "$0.003",
                      "batch": "$0.020",
                      "execution-gate": "$0.001",
                      "caption-intelligence": "$0.008"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/generate",
                      "summary": "Generate",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/optimize",
                      "summary": "Optimize",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/batch",
                      "summary": "Batch",
                      "price_usd": 0.02
                    },
                    {
                      "method": "POST",
                      "path": "/caption-intelligence",
                      "summary": "Caption Intelligence",
                      "price_usd": 0.008
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
                    "example": "new product launch"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "instagram",
                      "linkedin",
                      "twitter",
                      "tiktok",
                      "facebook",
                      "generic"
                    ],
                    "default": "instagram"
                  },
                  "tone": {
                    "type": "string",
                    "enum": [
                      "professional",
                      "casual",
                      "humorous",
                      "inspirational",
                      "educational"
                    ],
                    "default": "casual"
                  },
                  "include_cta": {
                    "type": "boolean",
                    "default": true
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
                      "$ref": "#/components/schemas/CaptionGenerateData"
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
    "/optimize": {
      "post": {
        "operationId": "optimize",
        "summary": "Optimize",
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
                  "caption"
                ],
                "properties": {
                  "caption": {
                    "type": "string"
                  },
                  "platform": {
                    "type": "string",
                    "enum": [
                      "instagram",
                      "linkedin",
                      "twitter",
                      "tiktok",
                      "facebook",
                      "generic"
                    ]
                  },
                  "target_engagement": {
                    "type": "string",
                    "enum": [
                      "likes",
                      "shares",
                      "comments",
                      "clicks"
                    ],
                    "default": "likes"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Optimize",
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
                      "$ref": "#/components/schemas/CaptionOptimizeData"
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
    "/batch": {
      "post": {
        "operationId": "batch",
        "summary": "Batch",
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
                  "items"
                ],
                "properties": {
                  "items": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "required": [
                        "topic"
                      ],
                      "properties": {
                        "topic": {
                          "type": "string"
                        },
                        "platform": {
                          "type": "string"
                        },
                        "tone": {
                          "type": "string"
                        }
                      }
                    },
                    "maxItems": 10
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Batch",
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
                      "$ref": "#/components/schemas/CaptionBatchData"
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
    "/caption-intelligence": {
      "post": {
        "operationId": "caption_intelligence",
        "summary": "ONE-CALL: Caption Generator \u2014 full intelligence in one request",
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
                      "linkedin",
                      "twitter",
                      "tiktok",
                      "generic"
                    ]
                  },
                  "brand_voice": {
                    "type": "string",
                    "example": "friendly and approachable"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: Caption Generator \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/CaptionIntelligenceData"
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
                "objective": "run caption-intelligence"
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
                  "next_api": "caption-generator",
                  "next_endpoint": "/caption-intelligence",
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
      "CaptionGenerateData": {
        "type": "object",
        "required": [
          "topic",
          "captions"
        ],
        "properties": {
          "topic": {
            "type": "string"
          },
          "captions": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "text",
                "platform",
                "tone"
              ],
              "properties": {
                "text": {
                  "type": "string"
                },
                "platform": {
                  "type": "string",
                  "enum": [
                    "instagram",
                    "linkedin",
                    "twitter",
                    "tiktok",
                    "facebook",
                    "generic"
                  ]
                },
                "tone": {
                  "type": "string",
                  "enum": [
                    "professional",
                    "casual",
                    "humorous",
                    "inspirational",
                    "educational"
                  ]
                },
                "char_count": {
                  "type": "integer"
                },
                "includes_cta": {
                  "type": "boolean"
                },
                "engagement_score": {
                  "type": "number"
                }
              }
            }
          },
          "recommended_caption_index": {
            "type": "integer"
          }
        }
      },
      "CaptionOptimizeData": {
        "type": "object",
        "required": [
          "original",
          "optimized"
        ],
        "properties": {
          "original": {
            "type": "string"
          },
          "optimized": {
            "type": "string"
          },
          "changes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": {
                  "type": "string"
                },
                "description": {
                  "type": "string"
                }
              }
            }
          },
          "engagement_lift_estimate": {
            "type": "number"
          },
          "cta_added": {
            "type": "boolean"
          },
          "emoji_enhanced": {
            "type": "boolean"
          }
        }
      },
      "CaptionBatchData": {
        "type": "object",
        "required": [
          "results"
        ],
        "properties": {
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "topic": {
                  "type": "string"
                },
                "caption": {
                  "type": "string"
                },
                "platform": {
                  "type": "string"
                },
                "error": {
                  "type": "string",
                  "nullable": true
                }
              }
            }
          },
          "total": {
            "type": "integer"
          }
        }
      },
      "CaptionIntelligenceData": {
        "type": "object",
        "required": [
          "topic",
          "top_caption"
        ],
        "properties": {
          "topic": {
            "type": "string"
          },
          "top_caption": {
            "type": "string"
          },
          "platform_variants": {
            "type": "object",
            "additionalProperties": {
              "type": "string"
            }
          },
          "hashtags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "ctas": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "engagement_score": {
            "type": "number"
          },
          "best_posting_time": {
            "type": "string"
          }
        }
      }
    }
  }
});
});
export default router;
