import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Keyword Density API",
    "version": "2.0.0",
    "description": "Analyze keyword frequency, density, and distribution. Compare against competitor pages and get SEO optimization recommendations.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "analyze": "$0.002",
        "optimize": "$0.003",
        "compare": "$0.005",
        "execution-gate": "$0.001",
        "keyword-intelligence": "$0.007"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/keyword-density",
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
                  "name": "Keyword Density API",
                  "version": "2.0.0",
                  "description": "Analyze keyword frequency, density, and distribution. Compare against competitor pages and get SEO optimization recommendations.",
                  "base_url": "https://orbis-apis.onrender.com/keyword-density",
                  "docs_url": "https://orbis-apis.onrender.com/keyword-density/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 500
                    },
                    "pay_per_call": {
                      "analyze": "$0.002",
                      "optimize": "$0.003",
                      "compare": "$0.005",
                      "execution-gate": "$0.001",
                      "keyword-intelligence": "$0.007"
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
                      "path": "/optimize",
                      "summary": "Optimize",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/compare",
                      "summary": "Compare",
                      "price_usd": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/keyword-intelligence",
                      "summary": "Keyword Intelligence",
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
                    "example": "Your article text goes here..."
                  },
                  "language": {
                    "type": "string",
                    "default": "en"
                  },
                  "min_word_length": {
                    "type": "integer",
                    "default": 3
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
                      "$ref": "#/components/schemas/KeywordAnalyzeData"
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
                  "text",
                  "target_keywords"
                ],
                "properties": {
                  "text": {
                    "type": "string"
                  },
                  "target_keywords": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "example": [
                      "seo",
                      "optimization"
                    ]
                  },
                  "target_density": {
                    "type": "number",
                    "default": 0.02
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
                      "$ref": "#/components/schemas/KeywordOptimizeData"
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
    "/compare": {
      "post": {
        "operationId": "compare",
        "summary": "Compare",
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
                  "url1",
                  "url2"
                ],
                "properties": {
                  "url1": {
                    "type": "string",
                    "format": "uri"
                  },
                  "url2": {
                    "type": "string",
                    "format": "uri"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Compare",
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
                      "$ref": "#/components/schemas/KeywordCompareData"
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
    "/keyword-intelligence": {
      "post": {
        "operationId": "keyword_intelligence",
        "summary": "ONE-CALL: Keyword Density \u2014 full intelligence in one request",
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
                  "target_keywords": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "language": {
                    "type": "string",
                    "default": "en"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: Keyword Density \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/KeywordIntelligenceData"
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
                "objective": "run keyword-intelligence"
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
                  "next_api": "keyword-density",
                  "next_endpoint": "/keyword-intelligence",
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
      "KeywordAnalyzeData": {
        "type": "object",
        "required": [
          "word_count",
          "top_keywords"
        ],
        "properties": {
          "word_count": {
            "type": "integer"
          },
          "unique_words": {
            "type": "integer"
          },
          "top_keywords": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "keyword",
                "count",
                "density"
              ],
              "properties": {
                "keyword": {
                  "type": "string"
                },
                "count": {
                  "type": "integer"
                },
                "density": {
                  "type": "number"
                },
                "in_title": {
                  "type": "boolean"
                },
                "in_headings": {
                  "type": "boolean"
                }
              }
            }
          },
          "bigrams": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "phrase": {
                  "type": "string"
                },
                "count": {
                  "type": "integer"
                },
                "density": {
                  "type": "number"
                }
              }
            }
          },
          "stop_words_removed": {
            "type": "integer"
          },
          "density_rating": {
            "type": "string",
            "enum": [
              "optimal",
              "over_stuffed",
              "under_optimized",
              "thin"
            ]
          }
        }
      },
      "KeywordOptimizeData": {
        "type": "object",
        "required": [
          "target_keywords",
          "recommendations"
        ],
        "properties": {
          "target_keywords": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "recommendations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "keyword",
                "current_density",
                "target_density",
                "action"
              ],
              "properties": {
                "keyword": {
                  "type": "string"
                },
                "current_density": {
                  "type": "number"
                },
                "target_density": {
                  "type": "number"
                },
                "action": {
                  "type": "string",
                  "enum": [
                    "increase",
                    "decrease",
                    "maintain"
                  ]
                },
                "suggested_additions": {
                  "type": "integer"
                }
              }
            }
          },
          "ideal_density_range": {
            "type": "object",
            "properties": {
              "min": {
                "type": "number"
              },
              "max": {
                "type": "number"
              }
            }
          }
        }
      },
      "KeywordCompareData": {
        "type": "object",
        "required": [
          "gap_analysis"
        ],
        "properties": {
          "url1": {
            "type": "string"
          },
          "url2": {
            "type": "string"
          },
          "gap_analysis": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "keyword": {
                  "type": "string"
                },
                "url1_density": {
                  "type": "number"
                },
                "url2_density": {
                  "type": "number"
                },
                "opportunity": {
                  "type": "string",
                  "enum": [
                    "url1_advantage",
                    "url2_advantage",
                    "parity"
                  ]
                }
              }
            }
          },
          "unique_to_url1": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "unique_to_url2": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "KeywordIntelligenceData": {
        "type": "object",
        "required": [
          "density_rating"
        ],
        "properties": {
          "density_rating": {
            "type": "string",
            "enum": [
              "optimal",
              "over_stuffed",
              "under_optimized",
              "thin"
            ]
          },
          "analysis": {
            "$ref": "#/components/schemas/KeywordAnalyzeData"
          },
          "optimization": {
            "$ref": "#/components/schemas/KeywordOptimizeData"
          },
          "seo_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          }
        }
      }
    }
  }
});
});
export default router;
