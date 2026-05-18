import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Subject Line Scorer API",
    "version": "2.0.0",
    "description": "Score email subject lines for open rate potential using sentiment, urgency, personalization, and spam trigger analysis.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "score": "$0.001",
        "optimize": "$0.003",
        "generate": "$0.003",
        "execution-gate": "$0.001",
        "subject-intelligence": "$0.006"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/subject-line-scorer",
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
                  "name": "Subject Line Scorer API",
                  "version": "2.0.0",
                  "description": "Score email subject lines for open rate potential using sentiment, urgency, personalization, and spam trigger analysis.",
                  "base_url": "https://orbis-apis.onrender.com/subject-line-scorer",
                  "docs_url": "https://orbis-apis.onrender.com/subject-line-scorer/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 500
                    },
                    "pay_per_call": {
                      "score": "$0.001",
                      "optimize": "$0.003",
                      "generate": "$0.003",
                      "execution-gate": "$0.001",
                      "subject-intelligence": "$0.006"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/score",
                      "summary": "Score",
                      "price_usd": 0.001
                    },
                    {
                      "method": "POST",
                      "path": "/optimize",
                      "summary": "Optimize",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/generate",
                      "summary": "Generate",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/subject-intelligence",
                      "summary": "Subject Intelligence",
                      "price_usd": 0.006
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
    "/score": {
      "post": {
        "operationId": "score",
        "summary": "Score",
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
                  "subject"
                ],
                "properties": {
                  "subject": {
                    "type": "string",
                    "example": "Your exclusive offer expires tonight \ud83d\udd25"
                  },
                  "audience": {
                    "type": "string",
                    "example": "B2B SaaS decision makers"
                  }
                }
              },
              "example": {
                "subject": "Your exclusive offer expires tonight \ud83d\udd25",
                "audience": "B2B SaaS decision makers"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Score",
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
                      "$ref": "#/components/schemas/SubjectScoreData"
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
                },
                "example": {
                  "success": true,
                  "request_id": "c3d4e5f6-a7b8-4901-cdef-123456789012",
                  "data": {
                    "subject": "Your exclusive offer expires tonight \ud83d\udd25",
                    "open_rate_score": 82,
                    "spam_score": 18,
                    "sentiment": "urgent",
                    "urgency_level": "high",
                    "personalization_score": 20,
                    "length_score": 90,
                    "word_count": 6,
                    "char_count": 40,
                    "spam_triggers": [
                      "exclusive",
                      "tonight"
                    ],
                    "power_words": [
                      "exclusive",
                      "expires"
                    ],
                    "emoji_used": true,
                    "overall_grade": "B"
                  },
                  "confidence": {
                    "score": 0.91,
                    "reason": "Subject line pattern analysis"
                  },
                  "provenance": {
                    "provider": "subject-line-ai",
                    "retrieved_at": "2026-05-18T12:00:00Z",
                    "source_type": "ai_generated"
                  },
                  "cache": {
                    "recommended_ttl_seconds": 3600,
                    "retryable": false,
                    "cache_recommended": true
                  },
                  "recommended_next_api": [
                    {
                      "api": "subject-line-scorer",
                      "endpoint": "/optimize",
                      "reason": "Optimize to reduce spam triggers and add personalization"
                    }
                  ],
                  "recommended_actions_priority_order": [
                    {
                      "priority": "high",
                      "action": "Replace \"exclusive\" with specific benefit",
                      "reason": "\"exclusive\" is a common spam trigger"
                    },
                    {
                      "priority": "medium",
                      "action": "Add personalization token e.g. first name",
                      "reason": "Personalization score is low at 20/100"
                    }
                  ],
                  "execution_metadata": {
                    "latency_ms": 187,
                    "model": "claude-sonnet-4-5",
                    "automation_safe": true
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
                  "subject"
                ],
                "properties": {
                  "subject": {
                    "type": "string"
                  },
                  "goal": {
                    "type": "string",
                    "enum": [
                      "maximize_opens",
                      "avoid_spam",
                      "increase_urgency",
                      "increase_personalization"
                    ]
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
                      "$ref": "#/components/schemas/SubjectOptimizeData"
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
                    "example": "weekly newsletter"
                  },
                  "tone": {
                    "type": "string",
                    "enum": [
                      "curious",
                      "urgent",
                      "benefit_driven",
                      "personalized",
                      "direct",
                      "question"
                    ],
                    "default": "benefit_driven"
                  },
                  "count": {
                    "type": "integer",
                    "default": 5
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
                      "$ref": "#/components/schemas/SubjectGenerateData"
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
    "/subject-intelligence": {
      "post": {
        "operationId": "subject_intelligence",
        "summary": "ONE-CALL: Subject Line Scorer \u2014 full intelligence in one request",
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
                  "audience": {
                    "type": "string"
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
            "description": "ONE-CALL: Subject Line Scorer \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/SubjectIntelligenceData"
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
                  "subject"
                ],
                "properties": {
                  "subject": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "subject": "example.com",
                "objective": "run subject-intelligence"
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
                  "next_api": "subject-line-scorer",
                  "next_endpoint": "/subject-intelligence",
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
      "SubjectScoreData": {
        "type": "object",
        "required": [
          "subject",
          "open_rate_score"
        ],
        "properties": {
          "subject": {
            "type": "string"
          },
          "open_rate_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "spam_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "sentiment": {
            "type": "string",
            "enum": [
              "positive",
              "negative",
              "neutral",
              "urgent"
            ]
          },
          "urgency_level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low",
              "none"
            ]
          },
          "personalization_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "length_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "word_count": {
            "type": "integer"
          },
          "char_count": {
            "type": "integer"
          },
          "spam_triggers": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "power_words": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "emoji_used": {
            "type": "boolean"
          },
          "overall_grade": {
            "type": "string",
            "enum": [
              "A+",
              "A",
              "B",
              "C",
              "D",
              "F"
            ]
          }
        }
      },
      "SubjectOptimizeData": {
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
          "score_improvement": {
            "type": "number"
          },
          "changes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "added_urgency",
                    "removed_spam_trigger",
                    "added_personalization",
                    "shortened",
                    "added_emoji",
                    "reworded"
                  ]
                },
                "description": {
                  "type": "string"
                }
              }
            }
          },
          "spam_triggers_removed": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "power_words_added": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "SubjectGenerateData": {
        "type": "object",
        "required": [
          "topic",
          "subject_lines"
        ],
        "properties": {
          "topic": {
            "type": "string"
          },
          "subject_lines": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "text",
                "open_rate_score"
              ],
              "properties": {
                "text": {
                  "type": "string"
                },
                "open_rate_score": {
                  "type": "number"
                },
                "tone": {
                  "type": "string",
                  "enum": [
                    "curious",
                    "urgent",
                    "benefit_driven",
                    "personalized",
                    "direct",
                    "question"
                  ]
                },
                "spam_score": {
                  "type": "number"
                }
              }
            }
          },
          "recommended_index": {
            "type": "integer"
          }
        }
      },
      "SubjectIntelligenceData": {
        "type": "object",
        "required": [
          "subject",
          "open_rate_score",
          "overall_grade"
        ],
        "properties": {
          "subject": {
            "type": "string"
          },
          "open_rate_score": {
            "type": "number"
          },
          "overall_grade": {
            "type": "string",
            "enum": [
              "A+",
              "A",
              "B",
              "C",
              "D",
              "F"
            ]
          },
          "score_detail": {
            "$ref": "#/components/schemas/SubjectScoreData"
          },
          "optimized": {
            "$ref": "#/components/schemas/SubjectOptimizeData"
          },
          "alternatives": {
            "$ref": "#/components/schemas/SubjectGenerateData"
          },
          "spam_risk": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low",
              "safe"
            ]
          }
        }
      }
    }
  }
});
});
export default router;
