import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Hashtag Generator API",
    "version": "2.0.0",
    "description": "Generate high-performing hashtags, analyze trending hashtags, and estimate reach for social media.",
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
      "url": "https://orbis-apis.onrender.com/hashtag-generator"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/generate": {
      "post": {
        "operationId": "generate",
        "summary": "Generate \u2014 HashtagGenerateData",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "input"
                ],
                "properties": {
                  "input": {
                    "type": "string"
                  },
                  "options": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Generate \u2014 HashtagGenerateData",
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
        "summary": "Analyze \u2014 HashtagAnalyzeData",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "input"
                ],
                "properties": {
                  "input": {
                    "type": "string"
                  },
                  "options": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Analyze \u2014 HashtagAnalyzeData",
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
        "summary": "Trending \u2014 HashtagTrendingData",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "input"
                ],
                "properties": {
                  "input": {
                    "type": "string"
                  },
                  "options": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Trending \u2014 HashtagTrendingData",
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
        "summary": "ONE-CALL: full Hashtag Generator intelligence",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "input"
                ],
                "properties": {
                  "input": {
                    "type": "string"
                  },
                  "options": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: full Hashtag Generator intelligence",
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
                }
              }
            }
          }
        },
        "x-one-call": true
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
