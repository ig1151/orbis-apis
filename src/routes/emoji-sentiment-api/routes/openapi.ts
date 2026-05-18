import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Emoji Sentiment API",
    "version": "2.0.0",
    "description": "Analyze emotional sentiment of emoji usage in text, decode emoji meanings, and suggest contextually appropriate emojis.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 1000
      },
      "pay_per_call": {
        "analyze": "$0.002",
        "suggest": "$0.002",
        "decode": "$0.001",
        "execution-gate": "$0.001",
        "emoji-intelligence": "$0.005"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/emoji-sentiment",
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
                  "name": "Emoji Sentiment API",
                  "version": "2.0.0",
                  "description": "Analyze emotional sentiment of emoji usage in text, decode emoji meanings, and suggest contextually appropriate emojis.",
                  "base_url": "https://orbis-apis.onrender.com/emoji-sentiment",
                  "docs_url": "https://orbis-apis.onrender.com/emoji-sentiment/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 1000
                    },
                    "pay_per_call": {
                      "analyze": "$0.002",
                      "suggest": "$0.002",
                      "decode": "$0.001",
                      "execution-gate": "$0.001",
                      "emoji-intelligence": "$0.005"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/analyze",
                      "summary": "Analyze",
                      "price_usd": 0.002
                    },
                    {
                      "method": "POST",
                      "path": "/suggest",
                      "summary": "Suggest",
                      "price_usd": 0.002
                    },
                    {
                      "method": "POST",
                      "path": "/decode",
                      "summary": "Decode",
                      "price_usd": 0.001
                    },
                    {
                      "method": "POST",
                      "path": "/emoji-intelligence",
                      "summary": "Emoji Intelligence",
                      "price_usd": 0.005
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
                  "text"
                ],
                "properties": {
                  "text": {
                    "type": "string",
                    "example": "So excited for this! \ud83d\ude80\ud83c\udf89 Can't wait \ud83d\ude0d"
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
                      "$ref": "#/components/schemas/EmojiAnalyzeData"
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
    "/suggest": {
      "post": {
        "operationId": "suggest",
        "summary": "Suggest",
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
                    "example": "product launch"
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
                    "default": "generic"
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
            "description": "Suggest",
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
                      "$ref": "#/components/schemas/EmojiSuggestData"
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
    "/decode": {
      "post": {
        "operationId": "decode",
        "summary": "Decode",
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
                  "emoji"
                ],
                "properties": {
                  "emoji": {
                    "type": "string",
                    "example": "\ud83d\ude80"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Decode",
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
                      "$ref": "#/components/schemas/EmojiDecodeData"
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
    "/emoji-intelligence": {
      "post": {
        "operationId": "emoji_intelligence",
        "summary": "ONE-CALL: Emoji Sentiment \u2014 full intelligence in one request",
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
                  "text"
                ],
                "properties": {
                  "text": {
                    "type": "string"
                  },
                  "topic": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: Emoji Sentiment \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/EmojiIntelligenceData"
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
                  "text"
                ],
                "properties": {
                  "text": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "text": "example.com",
                "objective": "run emoji-intelligence"
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
                  "next_api": "emoji-sentiment",
                  "next_endpoint": "/emoji-intelligence",
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
      "EmojiAnalyzeData": {
        "type": "object",
        "required": [
          "overall_sentiment",
          "emotional_tone"
        ],
        "properties": {
          "text_length": {
            "type": "integer"
          },
          "emojis_found": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "emoji": {
                  "type": "string"
                },
                "unicode": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "sentiment": {
                  "type": "string",
                  "enum": [
                    "positive",
                    "negative",
                    "neutral"
                  ]
                },
                "valence": {
                  "type": "number",
                  "minimum": -1,
                  "maximum": 1
                },
                "count": {
                  "type": "integer"
                }
              }
            }
          },
          "overall_sentiment": {
            "type": "string",
            "enum": [
              "positive",
              "negative",
              "neutral",
              "mixed"
            ]
          },
          "emotional_tone": {
            "type": "string",
            "enum": [
              "joy",
              "sadness",
              "anger",
              "fear",
              "surprise",
              "disgust",
              "neutral"
            ]
          },
          "emoji_density": {
            "type": "number"
          },
          "sentiment_score": {
            "type": "number",
            "minimum": -1,
            "maximum": 1
          }
        }
      },
      "EmojiSuggestData": {
        "type": "object",
        "required": [
          "topic",
          "suggested_emojis"
        ],
        "properties": {
          "topic": {
            "type": "string"
          },
          "suggested_emojis": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "emoji"
              ],
              "properties": {
                "emoji": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "relevance_score": {
                  "type": "number"
                },
                "context": {
                  "type": "string"
                },
                "platform_support": {
                  "type": "string",
                  "enum": [
                    "universal",
                    "modern_only",
                    "limited"
                  ]
                }
              }
            }
          },
          "emotional_context": {
            "type": "string"
          },
          "usage_recommendations": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "EmojiDecodeData": {
        "type": "object",
        "required": [
          "emoji",
          "meaning",
          "sentiment_valence"
        ],
        "properties": {
          "emoji": {
            "type": "string"
          },
          "unicode": {
            "type": "string"
          },
          "official_name": {
            "type": "string"
          },
          "meaning": {
            "type": "string"
          },
          "sentiment_valence": {
            "type": "number",
            "minimum": -1,
            "maximum": 1
          },
          "emotional_category": {
            "type": "string",
            "enum": [
              "joy",
              "sadness",
              "anger",
              "fear",
              "surprise",
              "disgust",
              "neutral",
              "love",
              "humor"
            ]
          },
          "usage_context": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "cultural_notes": {
            "type": "string"
          },
          "platform_variations": {
            "type": "object",
            "additionalProperties": {
              "type": "string"
            }
          }
        }
      },
      "EmojiIntelligenceData": {
        "type": "object",
        "required": [
          "overall_sentiment"
        ],
        "properties": {
          "overall_sentiment": {
            "type": "string",
            "enum": [
              "positive",
              "negative",
              "neutral",
              "mixed"
            ]
          },
          "sentiment_score": {
            "type": "number"
          },
          "analysis": {
            "$ref": "#/components/schemas/EmojiAnalyzeData"
          },
          "suggestions": {
            "$ref": "#/components/schemas/EmojiSuggestData"
          },
          "emotional_profile": {
            "type": "object",
            "additionalProperties": {
              "type": "number"
            }
          }
        }
      }
    }
  }
});
});
export default router;
