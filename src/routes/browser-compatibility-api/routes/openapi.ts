import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Browser Compatibility API",
    "version": "2.0.0",
    "description": "Check CSS, JavaScript, and HTML feature compatibility across browsers using Can I Use data. Get polyfill recommendations.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 1000
      },
      "pay_per_call": {
        "check": "$0.001",
        "polyfills": "$0.003",
        "report": "$0.005",
        "execution-gate": "$0.001",
        "compat-intelligence": "$0.006"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/browser-compatibility",
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
                  "name": "Browser Compatibility API",
                  "version": "2.0.0",
                  "description": "Check CSS, JavaScript, and HTML feature compatibility across browsers using Can I Use data. Get polyfill recommendations.",
                  "base_url": "https://orbis-apis.onrender.com/browser-compatibility",
                  "docs_url": "https://orbis-apis.onrender.com/browser-compatibility/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 1000
                    },
                    "pay_per_call": {
                      "check": "$0.001",
                      "polyfills": "$0.003",
                      "report": "$0.005",
                      "execution-gate": "$0.001",
                      "compat-intelligence": "$0.006"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/check",
                      "summary": "Check",
                      "price_usd": 0.001
                    },
                    {
                      "method": "POST",
                      "path": "/polyfills",
                      "summary": "Polyfills",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/report",
                      "summary": "Report",
                      "price_usd": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/compat-intelligence",
                      "summary": "Compat Intelligence",
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
    "/check": {
      "post": {
        "operationId": "check",
        "summary": "Check",
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
                  "feature"
                ],
                "properties": {
                  "feature": {
                    "type": "string",
                    "example": "css-grid"
                  },
                  "browsers": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "example": [
                      "chrome",
                      "firefox",
                      "safari",
                      "edge"
                    ]
                  },
                  "min_global_usage_percent": {
                    "type": "number",
                    "default": 0.5
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Check",
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
                      "$ref": "#/components/schemas/CompatCheckData"
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
    "/polyfills": {
      "post": {
        "operationId": "polyfills",
        "summary": "Polyfills",
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
                  "features"
                ],
                "properties": {
                  "features": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "example": [
                      "css-grid",
                      "fetch",
                      "promise"
                    ]
                  },
                  "target_browsers": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Polyfills",
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
                      "$ref": "#/components/schemas/PolyfillData"
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
    "/report": {
      "post": {
        "operationId": "report",
        "summary": "Report",
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
                  "url"
                ],
                "properties": {
                  "url": {
                    "type": "string",
                    "format": "uri"
                  },
                  "target_browsers": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "example": [
                      "chrome >= 80",
                      "firefox >= 75",
                      "safari >= 13"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Report",
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
                      "$ref": "#/components/schemas/CompatReportData"
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
    "/compat-intelligence": {
      "post": {
        "operationId": "compat_intelligence",
        "summary": "ONE-CALL: Browser Compatibility \u2014 full intelligence in one request",
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
                  "feature_or_url"
                ],
                "properties": {
                  "feature_or_url": {
                    "type": "string"
                  },
                  "target_browsers": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: Browser Compatibility \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/CompatIntelligenceData"
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
                  "feature"
                ],
                "properties": {
                  "feature": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "feature": "example.com",
                "objective": "run compat-intelligence"
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
                  "next_api": "browser-compatibility",
                  "next_endpoint": "/compat-intelligence",
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
      "CompatCheckData": {
        "type": "object",
        "required": [
          "feature",
          "browsers"
        ],
        "properties": {
          "feature": {
            "type": "string"
          },
          "browsers": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "support_status"
              ],
              "properties": {
                "name": {
                  "type": "string"
                },
                "min_version": {
                  "type": "string"
                },
                "support_status": {
                  "type": "string",
                  "enum": [
                    "supported",
                    "partial",
                    "unsupported",
                    "flagged"
                  ]
                },
                "global_usage_percent": {
                  "type": "number"
                },
                "notes": {
                  "type": "string"
                }
              }
            }
          },
          "overall_support_percent": {
            "type": "number"
          },
          "mdn_url": {
            "type": "string"
          }
        }
      },
      "PolyfillData": {
        "type": "object",
        "required": [
          "features",
          "polyfills"
        ],
        "properties": {
          "features": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "polyfills": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name"
              ],
              "properties": {
                "name": {
                  "type": "string"
                },
                "size_kb": {
                  "type": "number"
                },
                "cdn_url": {
                  "type": "string"
                },
                "npm_package": {
                  "type": "string"
                },
                "covers_features": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "total_polyfill_size_kb": {
            "type": "number"
          }
        }
      },
      "CompatReportData": {
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
          "unsupported_features": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "feature": {
                  "type": "string"
                },
                "affected_browsers": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "severity": {
                  "type": "string",
                  "enum": [
                    "critical",
                    "warning",
                    "info"
                  ]
                }
              }
            }
          },
          "browser_coverage": {
            "type": "object",
            "additionalProperties": {
              "type": "number"
            }
          }
        }
      },
      "CompatIntelligenceData": {
        "type": "object",
        "required": [
          "overall_support_percent"
        ],
        "properties": {
          "overall_support_percent": {
            "type": "number"
          },
          "compatibility_grade": {
            "type": "string",
            "enum": [
              "A",
              "B",
              "C",
              "D",
              "F"
            ]
          },
          "check": {
            "$ref": "#/components/schemas/CompatCheckData"
          },
          "polyfills_needed": {
            "$ref": "#/components/schemas/PolyfillData"
          },
          "critical_issues": {
            "type": "integer"
          }
        }
      }
    }
  }
});
});
export default router;
