import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "Accessibility Audit Lite API",
    "version": "2.0.0",
    "description": "Run WCAG 2.1 accessibility checks on any URL. Identify violations, score compliance level, and get fix suggestions.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 200
      },
      "pay_per_call": {
        "audit": "$0.005",
        "score": "$0.002",
        "fix-suggestions": "$0.004",
        "execution-gate": "$0.001",
        "accessibility-intelligence": "$0.010"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/accessibility-audit-lite",
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
                  "name": "Accessibility Audit Lite API",
                  "version": "2.0.0",
                  "description": "Run WCAG 2.1 accessibility checks on any URL. Identify violations, score compliance level, and get fix suggestions.",
                  "base_url": "https://orbis-apis.onrender.com/accessibility-audit-lite",
                  "docs_url": "https://orbis-apis.onrender.com/accessibility-audit-lite/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 200
                    },
                    "pay_per_call": {
                      "audit": "$0.005",
                      "score": "$0.002",
                      "fix-suggestions": "$0.004",
                      "execution-gate": "$0.001",
                      "accessibility-intelligence": "$0.010"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/audit",
                      "summary": "Audit",
                      "price_usd": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/score",
                      "summary": "Score",
                      "price_usd": 0.002
                    },
                    {
                      "method": "POST",
                      "path": "/fix-suggestions",
                      "summary": "Fix Suggestions",
                      "price_usd": 0.004
                    },
                    {
                      "method": "POST",
                      "path": "/accessibility-intelligence",
                      "summary": "Accessibility Intelligence",
                      "price_usd": 0.01
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
    "/audit": {
      "post": {
        "operationId": "audit",
        "summary": "Audit",
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
                    "format": "uri",
                    "example": "https://example.com"
                  },
                  "wcag_level": {
                    "type": "string",
                    "enum": [
                      "A",
                      "AA",
                      "AAA"
                    ],
                    "default": "AA"
                  }
                }
              },
              "example": {
                "url": "https://example.com",
                "wcag_level": "AA"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Audit",
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
                      "$ref": "#/components/schemas/A11yAuditData"
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
                  "request_id": "d4e5f6a7-b8c9-4012-defa-234567890123",
                  "data": {
                    "url": "https://example.com",
                    "violations": [
                      {
                        "id": "color-contrast",
                        "impact": "serious",
                        "wcag_criterion": "1.4.3",
                        "description": "Elements must have sufficient color contrast",
                        "affected_elements": [
                          "button.cta",
                          "p.footer-text"
                        ],
                        "fix": "Increase contrast ratio to at least 4.5:1"
                      }
                    ],
                    "passes": 47,
                    "violations_count": 3,
                    "warnings": 5,
                    "wcag_level": "AA"
                  },
                  "confidence": {
                    "score": 0.89,
                    "reason": "Static analysis of page DOM"
                  },
                  "provenance": {
                    "provider": "wcag-scanner",
                    "retrieved_at": "2026-05-18T12:00:00Z",
                    "source_type": "live_scan"
                  },
                  "cache": {
                    "recommended_ttl_seconds": 86400,
                    "retryable": false,
                    "cache_recommended": true
                  },
                  "recommended_next_api": [
                    {
                      "api": "accessibility-audit-lite",
                      "endpoint": "/fix-suggestions",
                      "reason": "Get prioritized fix list for 3 violations found"
                    }
                  ],
                  "recommended_actions_priority_order": [
                    {
                      "priority": "high",
                      "action": "Fix color contrast on .cta and .footer-text",
                      "reason": "WCAG 1.4.3 violation \u2014 serious impact, affects all users"
                    }
                  ],
                  "execution_metadata": {
                    "latency_ms": 521,
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
                  "url"
                ],
                "properties": {
                  "url": {
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
                      "$ref": "#/components/schemas/A11yScoreData"
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
    "/fix-suggestions": {
      "post": {
        "operationId": "fix_suggestions",
        "summary": "Fix Suggestions",
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
                  "max_suggestions": {
                    "type": "integer",
                    "default": 20
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Fix Suggestions",
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
                      "$ref": "#/components/schemas/A11yFixData"
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
    "/accessibility-intelligence": {
      "post": {
        "operationId": "accessibility_intelligence",
        "summary": "ONE-CALL: Accessibility Audit Lite \u2014 full intelligence in one request",
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
                  "wcag_level": {
                    "type": "string",
                    "enum": [
                      "A",
                      "AA",
                      "AAA"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: Accessibility Audit Lite \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/A11yIntelligenceData"
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
                  "url"
                ],
                "properties": {
                  "url": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "url": "example.com",
                "objective": "run accessibility-intelligence"
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
                  "next_api": "accessibility-audit-lite",
                  "next_endpoint": "/accessibility-intelligence",
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
      "A11yAuditData": {
        "type": "object",
        "required": [
          "url",
          "violations",
          "wcag_level"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "violations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "id",
                "impact",
                "description"
              ],
              "properties": {
                "id": {
                  "type": "string"
                },
                "impact": {
                  "type": "string",
                  "enum": [
                    "critical",
                    "serious",
                    "moderate",
                    "minor"
                  ]
                },
                "wcag_criterion": {
                  "type": "string"
                },
                "description": {
                  "type": "string"
                },
                "affected_elements": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "fix": {
                  "type": "string"
                }
              }
            }
          },
          "passes": {
            "type": "integer"
          },
          "violations_count": {
            "type": "integer"
          },
          "warnings": {
            "type": "integer"
          },
          "wcag_level": {
            "type": "string",
            "enum": [
              "A",
              "AA",
              "AAA",
              "none"
            ]
          }
        }
      },
      "A11yScoreData": {
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
          "wcag_a_compliance": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "wcag_aa_compliance": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "wcag_aaa_compliance": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "grade": {
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
          "critical_violations": {
            "type": "integer"
          }
        }
      },
      "A11yFixData": {
        "type": "object",
        "required": [
          "url",
          "fixes"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "fixes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "priority",
                "violation_id",
                "fix_description"
              ],
              "properties": {
                "priority": {
                  "type": "string",
                  "enum": [
                    "critical",
                    "high",
                    "medium",
                    "low"
                  ]
                },
                "violation_id": {
                  "type": "string"
                },
                "wcag_criterion": {
                  "type": "string"
                },
                "fix_description": {
                  "type": "string"
                },
                "code_snippet": {
                  "type": "string"
                },
                "estimated_minutes": {
                  "type": "integer"
                }
              }
            }
          },
          "estimated_total_hours": {
            "type": "number"
          },
          "quick_wins_count": {
            "type": "integer"
          }
        }
      },
      "A11yIntelligenceData": {
        "type": "object",
        "required": [
          "url",
          "score",
          "wcag_level"
        ],
        "properties": {
          "url": {
            "type": "string"
          },
          "score": {
            "type": "number"
          },
          "wcag_level": {
            "type": "string",
            "enum": [
              "A",
              "AA",
              "AAA",
              "none"
            ]
          },
          "audit": {
            "$ref": "#/components/schemas/A11yAuditData"
          },
          "score_detail": {
            "$ref": "#/components/schemas/A11yScoreData"
          },
          "top_fixes": {
            "$ref": "#/components/schemas/A11yFixData"
          },
          "critical_violations": {
            "type": "integer"
          }
        }
      }
    }
  }
});
});
export default router;
