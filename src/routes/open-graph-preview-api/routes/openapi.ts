import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Open Graph Preview API",
    "version": "2.0.0",
    "description": "Preview, validate, and optimize Open Graph and Twitter Card tags to maximize click-through rates on social media shares.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "preview": "$0.003",
        "validate": "$0.002",
        "generate": "$0.004",
        "execution-gate": "$0.001",
        "og-intelligence": "$0.008"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/open-graph-preview"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/preview": {
      "post": {
        "operationId": "preview",
        "summary": "Preview \u2014 OGPreviewData",
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
            "description": "Preview \u2014 OGPreviewData",
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
                      "$ref": "#/components/schemas/OGPreviewData"
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
    "/validate": {
      "post": {
        "operationId": "validate",
        "summary": "Validate \u2014 OGValidateData",
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
            "description": "Validate \u2014 OGValidateData",
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
                      "$ref": "#/components/schemas/OGValidateData"
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
        "summary": "Generate \u2014 OGGenerateData",
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
            "description": "Generate \u2014 OGGenerateData",
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
                      "$ref": "#/components/schemas/OGGenerateData"
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
    "/og-intelligence": {
      "post": {
        "operationId": "og_intelligence",
        "summary": "ONE-CALL: full Open Graph Preview intelligence",
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
            "description": "ONE-CALL: full Open Graph Preview intelligence",
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
                      "$ref": "#/components/schemas/OGIntelligenceData"
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
      "OGPreviewData": {
        "type": "object",
        "required": [
          "url",
          "og_title"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "og_title": {
            "type": "string"
          },
          "og_description": {
            "type": "string"
          },
          "og_image": {
            "type": "string"
          },
          "og_type": {
            "type": "string"
          },
          "og_site_name": {
            "type": "string"
          },
          "twitter_card": {
            "type": "string",
            "enum": [
              "summary",
              "summary_large_image",
              "app",
              "player"
            ]
          },
          "twitter_title": {
            "type": "string"
          },
          "twitter_description": {
            "type": "string"
          },
          "twitter_image": {
            "type": "string"
          },
          "share_preview_quality": {
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
      "OGValidateData": {
        "type": "object",
        "required": [
          "url",
          "score"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "missing_tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
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
          "og_completeness": {
            "type": "string",
            "enum": [
              "complete",
              "partial",
              "missing"
            ]
          },
          "twitter_completeness": {
            "type": "string",
            "enum": [
              "complete",
              "partial",
              "missing"
            ]
          }
        }
      },
      "OGGenerateData": {
        "type": "object",
        "required": [
          "url"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "suggested_og": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "type": {
                "type": "string"
              }
            }
          },
          "suggested_twitter": {
            "type": "object",
            "properties": {
              "card": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              }
            }
          },
          "html_snippet": {
            "type": "string"
          }
        }
      },
      "OGIntelligenceData": {
        "type": "object",
        "required": [
          "url",
          "overall_score"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "overall_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "preview": {
            "$ref": "#/components/schemas/OGPreviewData"
          },
          "validation": {
            "$ref": "#/components/schemas/OGValidateData"
          },
          "generated_tags": {
            "$ref": "#/components/schemas/OGGenerateData"
          },
          "ctr_lift_estimate": {
            "type": "number"
          }
        }
      }
    }
  }
});
});
export default router;
