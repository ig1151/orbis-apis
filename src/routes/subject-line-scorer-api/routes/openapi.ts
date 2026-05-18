import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Subject Line Scorer API",
    "version": "2.0.0",
    "description": "Score email subject lines for open rate potential with spam detection and optimization.",
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
      "url": "https://orbis-apis.onrender.com/subject-line-scorer"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/score": {
      "post": {
        "operationId": "score",
        "summary": "Score \u2014 SubjectScoreData",
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
            "description": "Score \u2014 SubjectScoreData",
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
    "/optimize": {
      "post": {
        "operationId": "optimize",
        "summary": "Optimize \u2014 SubjectOptimizeData",
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
            "description": "Optimize \u2014 SubjectOptimizeData",
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
    "/generate": {
      "post": {
        "operationId": "generate",
        "summary": "Generate \u2014 SubjectGenerateData",
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
            "description": "Generate \u2014 SubjectGenerateData",
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
    "/subject-intelligence": {
      "post": {
        "operationId": "subject_intelligence",
        "summary": "ONE-CALL: full Subject Line Scorer intelligence",
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
            "description": "ONE-CALL: full Subject Line Scorer intelligence",
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
