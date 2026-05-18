import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "TLS Configuration API",
    "version": "2.0.0",
    "description": "Analyze TLS/SSL configuration for cipher suites, protocol versions, vulnerabilities, and compliance. Grade server security posture.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "analyze": "$0.003",
        "grade": "$0.003",
        "recommendations": "$0.004",
        "execution-gate": "$0.001",
        "tls-intelligence": "$0.008"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/tls-configuration",
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
                  "name": "TLS Configuration API",
                  "version": "2.0.0",
                  "description": "Analyze TLS/SSL configuration for cipher suites, protocol versions, vulnerabilities, and compliance. Grade server security posture.",
                  "base_url": "https://orbis-apis.onrender.com/tls-configuration",
                  "docs_url": "https://orbis-apis.onrender.com/tls-configuration/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 300
                    },
                    "pay_per_call": {
                      "analyze": "$0.003",
                      "grade": "$0.003",
                      "recommendations": "$0.004",
                      "execution-gate": "$0.001",
                      "tls-intelligence": "$0.008"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/analyze",
                      "summary": "Analyze",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/grade",
                      "summary": "Grade",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/recommendations",
                      "summary": "Recommendations",
                      "price_usd": 0.004
                    },
                    {
                      "method": "POST",
                      "path": "/tls-intelligence",
                      "summary": "Tls Intelligence",
                      "price_usd": 0.008
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
                  "domain"
                ],
                "properties": {
                  "domain": {
                    "type": "string",
                    "example": "example.com"
                  },
                  "port": {
                    "type": "integer",
                    "default": 443
                  },
                  "include_cert_chain": {
                    "type": "boolean",
                    "default": true
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
                      "$ref": "#/components/schemas/TLSAnalyzeData"
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
    "/grade": {
      "post": {
        "operationId": "grade",
        "summary": "Grade",
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
                  "domain"
                ],
                "properties": {
                  "domain": {
                    "type": "string"
                  },
                  "port": {
                    "type": "integer",
                    "default": 443
                  }
                }
              },
              "example": {
                "domain": "example.com",
                "port": 443
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Grade",
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
                      "$ref": "#/components/schemas/TLSGradeData"
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
                  "request_id": "b2c3d4e5-f6a7-4890-bcde-f12345678901",
                  "data": {
                    "domain": "example.com",
                    "grade": "B",
                    "score": 72,
                    "breakdown": {
                      "protocol_support": 80,
                      "key_exchange": 70,
                      "cipher_strength": 75,
                      "certificate": 63
                    },
                    "vulnerabilities_count": 2
                  },
                  "confidence": {
                    "score": 0.96,
                    "reason": "Direct TLS handshake scan"
                  },
                  "provenance": {
                    "provider": "tls-scanner",
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
                      "api": "tls-configuration",
                      "endpoint": "/recommendations",
                      "reason": "Get specific hardening steps to reach A+"
                    }
                  ],
                  "recommended_actions_priority_order": [
                    {
                      "priority": "high",
                      "action": "Disable TLS 1.0 and 1.1",
                      "reason": "Deprecated protocols detected \u2014 PCI-DSS non-compliant"
                    },
                    {
                      "priority": "medium",
                      "action": "Enable TLS 1.3",
                      "reason": "TLS 1.3 not enabled \u2014 required for A grade"
                    }
                  ],
                  "execution_metadata": {
                    "latency_ms": 412,
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
    "/recommendations": {
      "post": {
        "operationId": "recommendations",
        "summary": "Recommendations",
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
                  "domain"
                ],
                "properties": {
                  "domain": {
                    "type": "string"
                  },
                  "compliance_frameworks": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": [
                        "PCI-DSS",
                        "NIST",
                        "SOC2",
                        "HIPAA",
                        "GDPR"
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recommendations",
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
                      "$ref": "#/components/schemas/TLSRecommendationsData"
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
    "/tls-intelligence": {
      "post": {
        "operationId": "tls_intelligence",
        "summary": "ONE-CALL: TLS Configuration \u2014 full intelligence in one request",
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
                  "domain"
                ],
                "properties": {
                  "domain": {
                    "type": "string"
                  },
                  "port": {
                    "type": "integer",
                    "default": 443
                  },
                  "compliance_frameworks": {
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
            "description": "ONE-CALL: TLS Configuration \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/TLSIntelligenceData"
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
                  "domain"
                ],
                "properties": {
                  "domain": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string",
                    "description": "What the agent is trying to accomplish"
                  }
                }
              },
              "example": {
                "domain": "example.com",
                "objective": "run tls-intelligence"
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
                  "next_api": "tls-configuration",
                  "next_endpoint": "/tls-intelligence",
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
      "TLSAnalyzeData": {
        "type": "object",
        "required": [
          "domain",
          "tls_versions",
          "cipher_suites"
        ],
        "properties": {
          "domain": {
            "type": "string"
          },
          "tls_versions": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "version",
                "enabled"
              ],
              "properties": {
                "version": {
                  "type": "string",
                  "enum": [
                    "TLS 1.0",
                    "TLS 1.1",
                    "TLS 1.2",
                    "TLS 1.3"
                  ]
                },
                "enabled": {
                  "type": "boolean"
                },
                "recommended": {
                  "type": "boolean"
                }
              }
            }
          },
          "cipher_suites": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "strength"
              ],
              "properties": {
                "name": {
                  "type": "string"
                },
                "strength": {
                  "type": "string",
                  "enum": [
                    "strong",
                    "adequate",
                    "weak",
                    "insecure"
                  ]
                },
                "pfs": {
                  "type": "boolean"
                }
              }
            }
          },
          "vulnerabilities": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "cve_id": {
                  "type": "string"
                },
                "severity": {
                  "type": "string",
                  "enum": [
                    "critical",
                    "high",
                    "medium",
                    "low"
                  ]
                }
              }
            }
          },
          "certificate_info": {
            "type": "object",
            "properties": {
              "issuer": {
                "type": "string"
              },
              "valid_until": {
                "type": "string",
                "format": "date-time"
              },
              "key_bits": {
                "type": "integer"
              },
              "signature_algorithm": {
                "type": "string"
              }
            }
          },
          "hsts_enabled": {
            "type": "boolean"
          }
        }
      },
      "TLSGradeData": {
        "type": "object",
        "required": [
          "domain",
          "grade",
          "score"
        ],
        "properties": {
          "domain": {
            "type": "string"
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
          "score": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "breakdown": {
            "type": "object",
            "properties": {
              "protocol_support": {
                "type": "integer"
              },
              "key_exchange": {
                "type": "integer"
              },
              "cipher_strength": {
                "type": "integer"
              },
              "certificate": {
                "type": "integer"
              }
            }
          },
          "vulnerabilities_count": {
            "type": "integer"
          }
        }
      },
      "TLSRecommendationsData": {
        "type": "object",
        "required": [
          "domain",
          "hardening_recommendations"
        ],
        "properties": {
          "domain": {
            "type": "string"
          },
          "hardening_recommendations": {
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
                    "critical",
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
                },
                "cve_reference": {
                  "type": "string"
                }
              }
            }
          },
          "compliance_gaps": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "framework": {
                  "type": "string",
                  "enum": [
                    "PCI-DSS",
                    "NIST",
                    "SOC2",
                    "HIPAA",
                    "GDPR"
                  ]
                },
                "requirement": {
                  "type": "string"
                },
                "status": {
                  "type": "string",
                  "enum": [
                    "pass",
                    "fail",
                    "partial"
                  ]
                }
              }
            }
          },
          "estimated_fix_hours": {
            "type": "number"
          }
        }
      },
      "TLSIntelligenceData": {
        "type": "object",
        "required": [
          "domain",
          "grade"
        ],
        "properties": {
          "domain": {
            "type": "string"
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
          "analyze": {
            "$ref": "#/components/schemas/TLSAnalyzeData"
          },
          "grade_detail": {
            "$ref": "#/components/schemas/TLSGradeData"
          },
          "remediation": {
            "$ref": "#/components/schemas/TLSRecommendationsData"
          },
          "critical_vulnerabilities": {
            "type": "integer"
          }
        }
      }
    }
  }
});
});
export default router;
