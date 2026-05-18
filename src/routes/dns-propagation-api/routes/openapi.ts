import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
  "openapi": "3.1.0",
  "info": {
    "title": "DNS Propagation API",
    "version": "2.0.0",
    "description": "Check DNS propagation status across global nameservers, trace resolution paths, and verify completion after DNS changes.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "check": "$0.002",
        "status": "$0.002",
        "trace": "$0.003",
        "execution-gate": "$0.001",
        "propagation-intelligence": "$0.006"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/dns-propagation",
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
                  "name": "DNS Propagation API",
                  "version": "2.0.0",
                  "description": "Check DNS propagation status across global nameservers, trace resolution paths, and verify completion after DNS changes.",
                  "base_url": "https://orbis-apis.onrender.com/dns-propagation",
                  "docs_url": "https://orbis-apis.onrender.com/dns-propagation/openapi.json",
                  "mcp_compatible": true,
                  "agent_callable": true,
                  "pricing": {
                    "free_tier": {
                      "requests_per_day": 500
                    },
                    "pay_per_call": {
                      "check": "$0.002",
                      "status": "$0.002",
                      "trace": "$0.003",
                      "execution-gate": "$0.001",
                      "propagation-intelligence": "$0.006"
                    }
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/check",
                      "summary": "Check",
                      "price_usd": 0.002
                    },
                    {
                      "method": "POST",
                      "path": "/status",
                      "summary": "Status",
                      "price_usd": 0.002
                    },
                    {
                      "method": "POST",
                      "path": "/trace",
                      "summary": "Trace",
                      "price_usd": 0.003
                    },
                    {
                      "method": "POST",
                      "path": "/propagation-intelligence",
                      "summary": "Propagation Intelligence",
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
                  "domain",
                  "record_type"
                ],
                "properties": {
                  "domain": {
                    "type": "string",
                    "example": "example.com"
                  },
                  "record_type": {
                    "type": "string",
                    "enum": [
                      "A",
                      "AAAA",
                      "CNAME",
                      "MX",
                      "TXT",
                      "NS",
                      "SOA",
                      "PTR"
                    ]
                  },
                  "regions": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": [
                        "us-east",
                        "us-west",
                        "eu-west",
                        "eu-central",
                        "ap-southeast",
                        "ap-northeast",
                        "sa-east"
                      ]
                    }
                  }
                }
              },
              "example": {
                "domain": "example.com",
                "record_type": "A",
                "regions": [
                  "us-east",
                  "eu-west"
                ]
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
                      "$ref": "#/components/schemas/PropagationCheckData"
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
                  "request_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
                  "data": {
                    "domain": "example.com",
                    "record_type": "A",
                    "propagation_percentage": 87.5,
                    "propagation_status": "partial",
                    "nodes": [
                      {
                        "region": "us-east",
                        "nameserver": "8.8.8.8",
                        "ip": "93.184.216.34",
                        "status": "propagated",
                        "latency_ms": 12,
                        "resolved_value": "93.184.216.34"
                      },
                      {
                        "region": "eu-west",
                        "nameserver": "1.1.1.1",
                        "ip": null,
                        "status": "pending",
                        "latency_ms": 0,
                        "resolved_value": null
                      }
                    ],
                    "estimated_completion_minutes": 15
                  },
                  "confidence": {
                    "score": 0.94,
                    "reason": "Live DNS resolver responses",
                    "per_section": {
                      "nodes": 0.94
                    }
                  },
                  "provenance": {
                    "provider": "dns-resolver-network",
                    "retrieved_at": "2026-05-18T12:00:00Z",
                    "source_type": "live_scan"
                  },
                  "cache": {
                    "recommended_ttl_seconds": 300,
                    "retryable": true,
                    "cache_recommended": false
                  },
                  "recommended_next_api": [
                    {
                      "api": "ssl-expiry-monitor",
                      "endpoint": "/check",
                      "reason": "Verify SSL certificate after DNS propagation completes"
                    }
                  ],
                  "recommended_actions_priority_order": [
                    {
                      "priority": "high",
                      "action": "Wait 15 minutes and recheck propagation",
                      "reason": "87.5% propagated \u2014 eu-west node still pending"
                    }
                  ],
                  "execution_metadata": {
                    "latency_ms": 234,
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
    "/status": {
      "post": {
        "operationId": "status",
        "summary": "Status",
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
                  "record_type": {
                    "type": "string",
                    "enum": [
                      "A",
                      "AAAA",
                      "CNAME",
                      "MX",
                      "TXT",
                      "NS",
                      "SOA",
                      "PTR"
                    ]
                  },
                  "expected_value": {
                    "type": "string",
                    "example": "93.184.216.34"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Status",
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
                      "$ref": "#/components/schemas/PropagationStatusData"
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
    "/trace": {
      "post": {
        "operationId": "trace",
        "summary": "Trace",
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
                  "record_type": {
                    "type": "string",
                    "enum": [
                      "A",
                      "AAAA",
                      "CNAME",
                      "MX",
                      "TXT",
                      "NS",
                      "SOA",
                      "PTR"
                    ],
                    "default": "A"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Trace",
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
                      "$ref": "#/components/schemas/PropagationTraceData"
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
    "/propagation-intelligence": {
      "post": {
        "operationId": "propagation_intelligence",
        "summary": "ONE-CALL: DNS Propagation \u2014 full intelligence in one request",
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
                  "record_type": {
                    "type": "string",
                    "enum": [
                      "A",
                      "AAAA",
                      "CNAME",
                      "MX",
                      "TXT",
                      "NS",
                      "SOA",
                      "PTR"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: DNS Propagation \u2014 full intelligence in one request",
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
                      "$ref": "#/components/schemas/PropagationIntelligenceData"
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
                "objective": "run propagation-intelligence"
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
                  "next_api": "dns-propagation",
                  "next_endpoint": "/propagation-intelligence",
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
      "PropagationCheckData": {
        "type": "object",
        "required": [
          "domain",
          "record_type",
          "propagation_percentage",
          "propagation_status"
        ],
        "properties": {
          "domain": {
            "type": "string"
          },
          "record_type": {
            "type": "string",
            "enum": [
              "A",
              "AAAA",
              "CNAME",
              "MX",
              "TXT",
              "NS",
              "SOA",
              "PTR"
            ]
          },
          "propagation_percentage": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "propagation_status": {
            "type": "string",
            "enum": [
              "complete",
              "partial",
              "not_started",
              "failed"
            ]
          },
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "region",
                "status"
              ],
              "properties": {
                "region": {
                  "type": "string"
                },
                "nameserver": {
                  "type": "string"
                },
                "ip": {
                  "type": "string"
                },
                "status": {
                  "type": "string",
                  "enum": [
                    "propagated",
                    "pending",
                    "failed"
                  ]
                },
                "latency_ms": {
                  "type": "integer"
                },
                "resolved_value": {
                  "type": "string"
                }
              }
            }
          },
          "estimated_completion_minutes": {
            "type": "integer"
          }
        }
      },
      "PropagationStatusData": {
        "type": "object",
        "required": [
          "domain",
          "is_propagated"
        ],
        "properties": {
          "domain": {
            "type": "string"
          },
          "record_type": {
            "type": "string",
            "enum": [
              "A",
              "AAAA",
              "CNAME",
              "MX",
              "TXT",
              "NS",
              "SOA",
              "PTR"
            ]
          },
          "is_propagated": {
            "type": "boolean"
          },
          "propagation_percentage": {
            "type": "number"
          },
          "regions_summary": {
            "type": "object",
            "properties": {
              "propagated": {
                "type": "integer"
              },
              "pending": {
                "type": "integer"
              },
              "failed": {
                "type": "integer"
              }
            }
          },
          "fully_propagated_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          }
        }
      },
      "PropagationTraceData": {
        "type": "object",
        "required": [
          "domain",
          "resolution_path"
        ],
        "properties": {
          "domain": {
            "type": "string"
          },
          "resolution_path": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "step": {
                  "type": "integer"
                },
                "server": {
                  "type": "string"
                },
                "response": {
                  "type": "string"
                },
                "latency_ms": {
                  "type": "integer"
                }
              }
            }
          },
          "authoritative_ns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "final_value": {
            "type": "string"
          },
          "ttl_seconds": {
            "type": "integer"
          }
        }
      },
      "PropagationIntelligenceData": {
        "type": "object",
        "required": [
          "domain",
          "propagation_status",
          "propagation_percentage"
        ],
        "properties": {
          "domain": {
            "type": "string"
          },
          "propagation_status": {
            "type": "string",
            "enum": [
              "complete",
              "partial",
              "not_started",
              "failed"
            ]
          },
          "propagation_percentage": {
            "type": "number"
          },
          "check": {
            "$ref": "#/components/schemas/PropagationCheckData"
          },
          "trace": {
            "$ref": "#/components/schemas/PropagationTraceData"
          },
          "health_assessment": {
            "type": "string",
            "enum": [
              "healthy",
              "in_progress",
              "stalled",
              "failed"
            ]
          },
          "estimated_completion_minutes": {
            "type": "integer"
          }
        }
      }
    }
  }
});
});
export default router;
