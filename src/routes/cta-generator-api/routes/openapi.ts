import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "CTA Generator API",
    "version": "2.0.0",
    "description": "Generate high-converting call-to-action copy, score CTAs, and generate A/B test variants.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "generate": "$0.003",
        "score": "$0.002",
        "ab-variants": "$0.005",
        "execution-gate": "$0.001",
        "cta-intelligence": "$0.008"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/cta-generator"
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
        "summary": "Generate \u2014 CTAGenerateData",
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
            "description": "Generate \u2014 CTAGenerateData",
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
                      "$ref": "#/components/schemas/CTAGenerateData"
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
    "/score": {
      "post": {
        "operationId": "score",
        "summary": "Score \u2014 CTAScoreData",
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
            "description": "Score \u2014 CTAScoreData",
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
                      "$ref": "#/components/schemas/CTAScoreData"
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
    "/ab-variants": {
      "post": {
        "operationId": "ab_variants",
        "summary": "Ab Variants \u2014 CTAVariantsData",
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
            "description": "Ab Variants \u2014 CTAVariantsData",
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
                      "$ref": "#/components/schemas/CTAVariantsData"
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
    "/cta-intelligence": {
      "post": {
        "operationId": "cta_intelligence",
        "summary": "ONE-CALL: full CTA Generator intelligence",
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
            "description": "ONE-CALL: full CTA Generator intelligence",
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
                      "$ref": "#/components/schemas/CTAIntelligenceData"
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
      "CTAGenerateData": {
        "type": "object",
        "required": [
          "use_case",
          "ctas"
        ],
        "properties": {
          "use_case": {
            "type": "string"
          },
          "ctas": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "text",
                "type"
              ],
              "properties": {
                "text": {
                  "type": "string"
                },
                "type": {
                  "type": "string",
                  "enum": [
                    "button",
                    "headline",
                    "link",
                    "banner",
                    "email"
                  ]
                },
                "placement": {
                  "type": "string",
                  "enum": [
                    "above_fold",
                    "inline",
                    "footer",
                    "popup",
                    "email"
                  ]
                },
                "urgency_level": {
                  "type": "string",
                  "enum": [
                    "high",
                    "medium",
                    "low"
                  ]
                },
                "conversion_score": {
                  "type": "number"
                }
              }
            }
          },
          "recommended_cta_index": {
            "type": "integer"
          },
          "goal": {
            "type": "string"
          }
        }
      },
      "CTAScoreData": {
        "type": "object",
        "required": [
          "cta",
          "conversion_score"
        ],
        "properties": {
          "cta": {
            "type": "string"
          },
          "conversion_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "urgency_level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "clarity_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "specificity_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "issues": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "severity",
                "message"
              ],
              "properties": {
                "field": {
                  "type": "string"
                },
                "severity": {
                  "type": "string",
                  "enum": [
                    "critical",
                    "warning",
                    "info"
                  ]
                },
                "message": {
                  "type": "string"
                },
                "fix": {
                  "type": "string"
                }
              }
            }
          },
          "power_words_used": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "missing_elements": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "CTAVariantsData": {
        "type": "object",
        "required": [
          "original_cta",
          "variants"
        ],
        "properties": {
          "original_cta": {
            "type": "string"
          },
          "variants": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "text",
                "hypothesis"
              ],
              "properties": {
                "text": {
                  "type": "string"
                },
                "hypothesis": {
                  "type": "string"
                },
                "variable_changed": {
                  "type": "string",
                  "enum": [
                    "urgency",
                    "specificity",
                    "benefit",
                    "action_verb",
                    "length",
                    "personalization"
                  ]
                },
                "predicted_lift": {
                  "type": "string"
                }
              }
            }
          },
          "test_hypothesis": {
            "type": "string"
          },
          "recommended_winner": {
            "type": "integer"
          }
        }
      },
      "CTAIntelligenceData": {
        "type": "object",
        "required": [
          "use_case",
          "top_cta",
          "conversion_score"
        ],
        "properties": {
          "use_case": {
            "type": "string"
          },
          "top_cta": {
            "type": "string"
          },
          "conversion_score": {
            "type": "number"
          },
          "cta_options": {
            "$ref": "#/components/schemas/CTAGenerateData"
          },
          "score_detail": {
            "$ref": "#/components/schemas/CTAScoreData"
          },
          "ab_variants": {
            "$ref": "#/components/schemas/CTAVariantsData"
          }
        }
      }
    }
  }
});
});
export default router;
