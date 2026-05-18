import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Grammar Check Lite API",
    "version": "2.0.0",
    "description": "Lightweight grammar, spelling, and style checking for text with error scoring.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "check": "$0.002",
        "fix": "$0.003",
        "analyze": "$0.003",
        "execution-gate": "$0.001",
        "grammar-intelligence": "$0.007"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/grammar-check-lite"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/check": {
      "post": {
        "operationId": "check",
        "summary": "Check \u2014 GrammarCheckData",
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
            "description": "Check \u2014 GrammarCheckData",
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
                      "$ref": "#/components/schemas/GrammarCheckData"
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
    "/fix": {
      "post": {
        "operationId": "fix",
        "summary": "Fix \u2014 GrammarFixData",
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
            "description": "Fix \u2014 GrammarFixData",
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
                      "$ref": "#/components/schemas/GrammarFixData"
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
        "summary": "Analyze \u2014 GrammarAnalyzeData",
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
            "description": "Analyze \u2014 GrammarAnalyzeData",
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
                      "$ref": "#/components/schemas/GrammarAnalyzeData"
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
    "/grammar-intelligence": {
      "post": {
        "operationId": "grammar_intelligence",
        "summary": "ONE-CALL: full Grammar Check Lite intelligence",
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
            "description": "ONE-CALL: full Grammar Check Lite intelligence",
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
                      "$ref": "#/components/schemas/GrammarIntelligenceData"
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
      "GrammarCheckData": {
        "type": "object",
        "required": [
          "error_count",
          "errors"
        ],
        "properties": {
          "word_count": {
            "type": "integer"
          },
          "error_count": {
            "type": "integer"
          },
          "errors": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "type",
                "message",
                "offset"
              ],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "grammar",
                    "spelling",
                    "punctuation",
                    "style",
                    "word_choice"
                  ]
                },
                "message": {
                  "type": "string"
                },
                "offset": {
                  "type": "integer"
                },
                "length": {
                  "type": "integer"
                },
                "context": {
                  "type": "string"
                },
                "replacements": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "error_types": {
            "type": "object",
            "properties": {
              "grammar": {
                "type": "integer"
              },
              "spelling": {
                "type": "integer"
              },
              "punctuation": {
                "type": "integer"
              },
              "style": {
                "type": "integer"
              }
            }
          }
        }
      },
      "GrammarFixData": {
        "type": "object",
        "required": [
          "original",
          "corrected",
          "change_count"
        ],
        "properties": {
          "original": {
            "type": "string"
          },
          "corrected": {
            "type": "string"
          },
          "change_count": {
            "type": "integer"
          },
          "changes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "original_fragment": {
                  "type": "string"
                },
                "corrected_fragment": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "GrammarAnalyzeData": {
        "type": "object",
        "required": [
          "style_score",
          "tone"
        ],
        "properties": {
          "style_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "tone": {
            "type": "string",
            "enum": [
              "formal",
              "professional",
              "neutral",
              "casual",
              "informal"
            ]
          },
          "sentence_variety": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "passive_voice_percent": {
            "type": "number"
          },
          "avg_sentence_length": {
            "type": "number"
          },
          "writing_quality": {
            "type": "string",
            "enum": [
              "excellent",
              "good",
              "fair",
              "poor"
            ]
          }
        }
      },
      "GrammarIntelligenceData": {
        "type": "object",
        "required": [
          "error_count",
          "writing_quality"
        ],
        "properties": {
          "error_count": {
            "type": "integer"
          },
          "writing_quality": {
            "type": "string",
            "enum": [
              "excellent",
              "good",
              "fair",
              "poor"
            ]
          },
          "style_score": {
            "type": "number"
          },
          "check": {
            "$ref": "#/components/schemas/GrammarCheckData"
          },
          "fix": {
            "$ref": "#/components/schemas/GrammarFixData"
          },
          "style": {
            "$ref": "#/components/schemas/GrammarAnalyzeData"
          }
        }
      }
    }
  }
});
});
export default router;
