#!/bin/bash
echo 'Writing batch 5 APIs 1-10 (v3 — polished)...'

cat > domain-age-info.json << 'ENDJSON'
{
  "name": "Domain Age API",
  "slug": "domain-age",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 300
    },
    "pay_per_call": {
      "age": "$0.001",
      "whois-lite": "$0.001",
      "execution-gate": "$0.001",
      "lookup": "$0.005",
      "batch": "$0.015"
    }
  },
  "rate_limits": {
    "free": "300/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/age",
    "/whois-lite",
    "/execution-gate",
    "/lookup",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/lookup",
    "fallback": "/age",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote domain-age-info.json'

cat > domain-age-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Domain Age API",
    "version": "1.0.0",
    "description": "Returns domain registration date, age in days and years, registrar, and expiry date. Ideal for trust scoring, spam detection, and due diligence agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "age": "$0.001",
        "whois-lite": "$0.001",
        "execution-gate": "$0.001",
        "lookup": "$0.005",
        "batch": "$0.015"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/domain-age"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/age": {
      "get": {
        "operationId": "getDomainAge",
        "summary": "Get domain age and registration date",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "example.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "registered_at",
                    "age_days",
                    "registrar"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "registered_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "age_days": {
                      "type": "integer"
                    },
                    "age_years": {
                      "type": "number"
                    },
                    "expires_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "registrar": {
                      "type": "string"
                    },
                    "is_active": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "example.com",
                  "registered_at": "1995-08-14T00:00:00Z",
                  "age_days": 10727,
                  "age_years": 29.4,
                  "expires_at": "2026-08-13T00:00:00Z",
                  "registrar": "MarkMonitor Inc.",
                  "is_active": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400,
                  "automation_safe": true,
                  "recommended_next_api": "domain-availability",
                  "recommended_next_endpoint": "/check"
                }
              }
            }
          }
        }
      }
    },
    "/whois-lite": {
      "get": {
        "operationId": "getWhoisLite",
        "summary": "Get lightweight WHOIS summary for a domain",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "example.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "registrar"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "registrant_country": {
                      "type": "string"
                    },
                    "registrar": {
                      "type": "string"
                    },
                    "name_servers": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "updated_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "example.com",
                  "registrant_country": "US",
                  "registrar": "MarkMonitor Inc.",
                  "name_servers": [
                    "a.iana-servers.net",
                    "b.iana-servers.net"
                  ],
                  "updated_at": "2024-08-14T00:00:00Z",
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "example.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "domainLookup",
        "summary": "ONE-CALL: age + WHOIS + trust signals",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.005
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  }
                }
              },
              "example": {
                "domain": "example.com"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "registered_at",
                    "age_days",
                    "trust_signal"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "registered_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "age_days": {
                      "type": "integer"
                    },
                    "age_years": {
                      "type": "number"
                    },
                    "expires_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "registrar": {
                      "type": "string"
                    },
                    "registrant_country": {
                      "type": "string"
                    },
                    "name_servers": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "trust_signal": {
                      "type": "string",
                      "enum": [
                        "trusted",
                        "neutral",
                        "suspicious"
                      ]
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "age",
                        "whois",
                        "trust"
                      ],
                      "properties": {
                        "age": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "whois": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "trust": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "example.com",
                  "registered_at": "1995-08-14T00:00:00Z",
                  "age_days": 10727,
                  "age_years": 29.4,
                  "expires_at": "2026-08-13T00:00:00Z",
                  "registrar": "MarkMonitor Inc.",
                  "registrant_country": "US",
                  "name_servers": [
                    "a.iana-servers.net"
                  ],
                  "trust_signal": "trusted",
                  "confidence_per_section": {
                    "age": 0.99,
                    "whois": 0.95,
                    "trust": 0.97
                  },
                  "recommended_actions_priority_order": [
                    "proceed",
                    "log_domain_age"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchDomainAge",
        "summary": "Batch domain age lookup \u2014 up to 20 domains",
        "x-pricing": {
          "pricePerCallUsdc": 0.015
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domains"
                ],
                "properties": {
                  "domains": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    }
                  }
                }
              },
              "example": {
                "domains": [
                  "example.com",
                  "google.com"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "age_days": {
                            "type": "integer"
                          },
                          "registered_at": {
                            "type": "string",
                            "format": "date-time"
                          },
                          "registrar": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "domain": "example.com",
                      "age_days": 10727,
                      "registrar": "MarkMonitor Inc."
                    },
                    {
                      "domain": "google.com",
                      "age_days": 9490,
                      "registrar": "MarkMonitor Inc."
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
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
    }
  }
}
ENDJSON
echo 'wrote domain-age-openapi.json'

cat > domain-availability-info.json << 'ENDJSON'
{
  "name": "Domain Availability API",
  "slug": "domain-availability",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 300
    },
    "pay_per_call": {
      "check": "$0.002",
      "suggest": "$0.003",
      "execution-gate": "$0.001",
      "batch": "$0.015"
    }
  },
  "rate_limits": {
    "free": "300/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/check",
    "/suggest",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/check",
    "fallback": "/check",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote domain-availability-info.json'

cat > domain-availability-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Domain Availability API",
    "version": "1.0.0",
    "description": "Check if a domain is available for registration and get AI-ranked alternative suggestions. Supports bulk availability checks for agent-driven domain workflows.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "check": "$0.002",
        "suggest": "$0.003",
        "execution-gate": "$0.001",
        "batch": "$0.015"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/domain-availability"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/check": {
      "get": {
        "operationId": "checkDomain",
        "summary": "ONE-CALL: Check domain availability with registration signals",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.002
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "mynewstartup.io"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "available",
                    "status"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "available": {
                      "type": "boolean"
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "available",
                        "registered",
                        "reserved",
                        "pending-delete"
                      ]
                    },
                    "registrar": {
                      "type": "string"
                    },
                    "expires_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "availability",
                        "registrar",
                        "expiry"
                      ],
                      "properties": {
                        "availability": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "registrar": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "expiry": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "mynewstartup.io",
                  "available": true,
                  "status": "available",
                  "confidence_per_section": {
                    "availability": 0.99,
                    "registrar": 0.85,
                    "expiry": 0.0
                  },
                  "recommended_actions_priority_order": [
                    "register_now",
                    "check_alternatives"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 300
                }
              }
            }
          }
        }
      }
    },
    "/suggest": {
      "get": {
        "operationId": "suggestDomains",
        "summary": "Get alternative domain name suggestions",
        "x-pricing": {
          "pricePerCallUsdc": 0.003
        },
        "parameters": [
          {
            "name": "query",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "mynewstartup"
          },
          {
            "name": "tlds",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            },
            "example": "com,io,co"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "query",
                    "suggestions"
                  ],
                  "properties": {
                    "query": {
                      "type": "string"
                    },
                    "suggestions": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain",
                          "available",
                          "tld"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "available": {
                            "type": "boolean"
                          },
                          "tld": {
                            "type": "string"
                          },
                          "relevance_score": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "query": "mynewstartup",
                  "suggestions": [
                    {
                      "domain": "mynewstartup.io",
                      "available": true,
                      "tld": "io",
                      "relevance_score": 0.95
                    },
                    {
                      "domain": "mynewstartup.co",
                      "available": true,
                      "tld": "co",
                      "relevance_score": 0.88
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "mynewstartup.io",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchCheckDomains",
        "summary": "Batch domain availability check \u2014 up to 20 domains",
        "x-pricing": {
          "pricePerCallUsdc": 0.015
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domains"
                ],
                "properties": {
                  "domains": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    }
                  }
                }
              },
              "example": {
                "domains": [
                  "mynewstartup.io",
                  "mynewstartup.co"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain",
                          "available"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "available": {
                            "type": "boolean"
                          },
                          "status": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "domain": "mynewstartup.io",
                      "available": true,
                      "status": "available"
                    },
                    {
                      "domain": "mynewstartup.co",
                      "available": false,
                      "status": "registered"
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 300
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
    }
  }
}
ENDJSON
echo 'wrote domain-availability-openapi.json'

cat > mx-record-checker-info.json << 'ENDJSON'
{
  "name": "MX Record Checker API",
  "slug": "mx-record-checker",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 300
    },
    "pay_per_call": {
      "mx": "$0.001",
      "email-ready": "$0.002",
      "execution-gate": "$0.001",
      "batch": "$0.012"
    }
  },
  "rate_limits": {
    "free": "300/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/mx",
    "/email-ready",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/email-ready",
    "fallback": "/mx",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote mx-record-checker-info.json'

cat > mx-record-checker-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "MX Record Checker API",
    "version": "1.0.0",
    "description": "Resolve MX records for any domain and verify email deliverability readiness. Useful for email validation pipelines and outreach agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "mx": "$0.001",
        "email-ready": "$0.002",
        "execution-gate": "$0.001",
        "batch": "$0.012"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/mx-record-checker"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/mx": {
      "get": {
        "operationId": "getMxRecords",
        "summary": "Resolve MX records for a domain",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "company.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "mx_records",
                    "has_mx"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "mx_records": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "host",
                          "priority"
                        ],
                        "properties": {
                          "host": {
                            "type": "string"
                          },
                          "priority": {
                            "type": "integer"
                          },
                          "ttl": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "has_mx": {
                      "type": "boolean"
                    },
                    "record_count": {
                      "type": "integer"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "company.com",
                  "has_mx": true,
                  "record_count": 2,
                  "mx_records": [
                    {
                      "host": "aspmx.l.google.com",
                      "priority": 1,
                      "ttl": 300
                    },
                    {
                      "host": "alt1.aspmx.l.google.com",
                      "priority": 5,
                      "ttl": 300
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/email-ready": {
      "get": {
        "operationId": "checkEmailReady",
        "summary": "ONE-CALL: MX + SPF + DMARC deliverability check",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.002
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "company.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "email_ready",
                    "deliverability_score"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "email_ready": {
                      "type": "boolean"
                    },
                    "has_mx": {
                      "type": "boolean"
                    },
                    "has_spf": {
                      "type": "boolean"
                    },
                    "has_dmarc": {
                      "type": "boolean"
                    },
                    "deliverability_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "issues": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "mx",
                        "spf",
                        "dmarc"
                      ],
                      "properties": {
                        "mx": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "spf": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "dmarc": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "company.com",
                  "email_ready": true,
                  "has_mx": true,
                  "has_spf": true,
                  "has_dmarc": true,
                  "deliverability_score": 95,
                  "issues": [],
                  "confidence_per_section": {
                    "mx": 1.0,
                    "spf": 0.95,
                    "dmarc": 0.9
                  },
                  "recommended_actions_priority_order": [
                    "proceed_with_outreach"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "company.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchMxCheck",
        "summary": "Batch MX record check \u2014 up to 20 domains",
        "x-pricing": {
          "pricePerCallUsdc": 0.012
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domains"
                ],
                "properties": {
                  "domains": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    }
                  }
                }
              },
              "example": {
                "domains": [
                  "company.com",
                  "startup.io"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain",
                          "has_mx"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "has_mx": {
                            "type": "boolean"
                          },
                          "mx_count": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "domain": "company.com",
                      "has_mx": true,
                      "mx_count": 2
                    },
                    {
                      "domain": "startup.io",
                      "has_mx": true,
                      "mx_count": 1
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
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
    }
  }
}
ENDJSON
echo 'wrote mx-record-checker-openapi.json'

cat > spf-dkim-dmarc-checker-info.json << 'ENDJSON'
{
  "name": "SPF/DKIM/DMARC Checker API",
  "slug": "spf-dkim-dmarc-checker",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 300
    },
    "pay_per_call": {
      "spf": "$0.001",
      "dkim": "$0.001",
      "dmarc": "$0.001",
      "check": "$0.005",
      "execution-gate": "$0.001",
      "batch": "$0.012"
    }
  },
  "rate_limits": {
    "free": "300/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/spf",
    "/dkim",
    "/dmarc",
    "/check",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/check",
    "fallback": "/spf",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote spf-dkim-dmarc-checker-info.json'

cat > spf-dkim-dmarc-checker-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "SPF/DKIM/DMARC Checker API",
    "version": "1.0.0",
    "description": "Validate SPF, DKIM, and DMARC DNS records for any domain. Returns pass/fail, policy details, and actionable fixes for email authentication agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "spf": "$0.001",
        "dkim": "$0.001",
        "dmarc": "$0.001",
        "check": "$0.005",
        "execution-gate": "$0.001",
        "batch": "$0.012"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/spf-dkim-dmarc-checker"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/spf": {
      "get": {
        "operationId": "checkSpf",
        "summary": "Validate SPF record for a domain",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "company.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "valid"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "spf_record": {
                      "type": "string"
                    },
                    "valid": {
                      "type": "boolean"
                    },
                    "mechanism_count": {
                      "type": "integer"
                    },
                    "issues": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "company.com",
                  "spf_record": "v=spf1 include:_spf.google.com ~all",
                  "valid": true,
                  "mechanism_count": 2,
                  "issues": [],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/dkim": {
      "get": {
        "operationId": "checkDkim",
        "summary": "Validate DKIM record for a domain and selector",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "company.com"
          },
          {
            "name": "selector",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            },
            "example": "default"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "valid"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "selector": {
                      "type": "string"
                    },
                    "dkim_record": {
                      "type": "string"
                    },
                    "valid": {
                      "type": "boolean"
                    },
                    "key_type": {
                      "type": "string"
                    },
                    "key_bits": {
                      "type": "integer"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "company.com",
                  "selector": "default",
                  "dkim_record": "v=DKIM1; k=rsa; p=MIGfMA0...",
                  "valid": true,
                  "key_type": "rsa",
                  "key_bits": 2048,
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/dmarc": {
      "get": {
        "operationId": "checkDmarc",
        "summary": "Validate DMARC policy for a domain",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "company.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "valid",
                    "policy"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "dmarc_record": {
                      "type": "string"
                    },
                    "policy": {
                      "type": "string",
                      "enum": [
                        "none",
                        "quarantine",
                        "reject"
                      ]
                    },
                    "pct": {
                      "type": "integer"
                    },
                    "valid": {
                      "type": "boolean"
                    },
                    "issues": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "company.com",
                  "dmarc_record": "v=DMARC1; p=reject; pct=100",
                  "policy": "reject",
                  "pct": 100,
                  "valid": true,
                  "issues": [],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/check": {
      "post": {
        "operationId": "fullEmailAuthCheck",
        "summary": "ONE-CALL: SPF + DKIM + DMARC full authentication check",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.005
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "dkim_selector": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "company.com",
                "dkim_selector": "default"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "overall_pass",
                    "authentication_score"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "spf": {
                      "type": "object",
                      "required": [
                        "valid"
                      ],
                      "properties": {
                        "valid": {
                          "type": "boolean"
                        },
                        "record": {
                          "type": "string"
                        },
                        "issues": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "dkim": {
                      "type": "object",
                      "required": [
                        "valid"
                      ],
                      "properties": {
                        "valid": {
                          "type": "boolean"
                        },
                        "selector": {
                          "type": "string"
                        }
                      }
                    },
                    "dmarc": {
                      "type": "object",
                      "required": [
                        "valid",
                        "policy"
                      ],
                      "properties": {
                        "valid": {
                          "type": "boolean"
                        },
                        "policy": {
                          "type": "string"
                        }
                      }
                    },
                    "overall_pass": {
                      "type": "boolean"
                    },
                    "authentication_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "spf",
                        "dkim",
                        "dmarc"
                      ],
                      "properties": {
                        "spf": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "dkim": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "dmarc": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "company.com",
                  "spf": {
                    "valid": true,
                    "record": "v=spf1 include:_spf.google.com ~all",
                    "issues": []
                  },
                  "dkim": {
                    "valid": true,
                    "selector": "default"
                  },
                  "dmarc": {
                    "valid": true,
                    "policy": "reject"
                  },
                  "overall_pass": true,
                  "authentication_score": 98,
                  "confidence_per_section": {
                    "spf": 0.99,
                    "dkim": 0.97,
                    "dmarc": 0.99
                  },
                  "recommended_actions_priority_order": [
                    "proceed",
                    "monitor_dmarc_reports"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "company.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchAuthCheck",
        "summary": "Batch email auth check \u2014 up to 20 domains",
        "x-pricing": {
          "pricePerCallUsdc": 0.012
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domains"
                ],
                "properties": {
                  "domains": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    }
                  }
                }
              },
              "example": {
                "domains": [
                  "company.com",
                  "startup.io"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain",
                          "overall_pass"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "overall_pass": {
                            "type": "boolean"
                          },
                          "authentication_score": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "domain": "company.com",
                      "overall_pass": true,
                      "authentication_score": 98
                    },
                    {
                      "domain": "startup.io",
                      "overall_pass": false,
                      "authentication_score": 42
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
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
    }
  }
}
ENDJSON
echo 'wrote spf-dkim-dmarc-checker-openapi.json'

cat > email-reputation-info.json << 'ENDJSON'
{
  "name": "Email Reputation API",
  "slug": "email-reputation",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 200
    },
    "pay_per_call": {
      "score": "$0.002",
      "blacklist-check": "$0.002",
      "execution-gate": "$0.001",
      "batch": "$0.015"
    }
  },
  "rate_limits": {
    "free": "200/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/score",
    "/blacklist-check",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/score",
    "fallback": "/score",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote email-reputation-info.json'

cat > email-reputation-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Email Reputation API",
    "version": "1.0.0",
    "description": "Score email addresses and domains for reputation, blacklist status, and deliverability risk. For outreach filtering, fraud detection, and CRM hygiene agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 200
      },
      "pay_per_call": {
        "score": "$0.002",
        "blacklist-check": "$0.002",
        "execution-gate": "$0.001",
        "batch": "$0.015"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/email-reputation"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/score": {
      "post": {
        "operationId": "scoreEmail",
        "summary": "ONE-CALL: Score email reputation and risk level",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.002
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  }
                }
              },
              "example": {
                "email": "contact@company.com"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "email",
                    "reputation_score",
                    "risk_level"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email"
                    },
                    "reputation_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "risk_level": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high",
                        "critical"
                      ]
                    },
                    "is_disposable": {
                      "type": "boolean"
                    },
                    "is_role_account": {
                      "type": "boolean"
                    },
                    "domain_age_days": {
                      "type": "integer"
                    },
                    "mx_valid": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "reputation",
                        "blacklist",
                        "syntax"
                      ],
                      "properties": {
                        "reputation": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "blacklist": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "syntax": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "email": "contact@company.com",
                  "reputation_score": 87,
                  "risk_level": "low",
                  "is_disposable": false,
                  "is_role_account": true,
                  "domain_age_days": 3650,
                  "mx_valid": true,
                  "confidence_per_section": {
                    "reputation": 0.92,
                    "blacklist": 0.99,
                    "syntax": 1.0
                  },
                  "recommended_actions_priority_order": [
                    "allow",
                    "tag_as_role_account"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/blacklist-check": {
      "post": {
        "operationId": "blacklistCheck",
        "summary": "Check email or domain against known blacklists",
        "x-pricing": {
          "pricePerCallUsdc": 0.002
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  }
                }
              },
              "example": {
                "email": "contact@company.com"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "email",
                    "blacklisted",
                    "recommended_action"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email"
                    },
                    "domain": {
                      "type": "string"
                    },
                    "blacklisted": {
                      "type": "boolean"
                    },
                    "blacklist_count": {
                      "type": "integer"
                    },
                    "lists_found_on": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "recommended_action": {
                      "type": "string",
                      "enum": [
                        "allow",
                        "review",
                        "block"
                      ]
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "email": "spam@badactor.com",
                  "domain": "badactor.com",
                  "blacklisted": true,
                  "blacklist_count": 3,
                  "lists_found_on": [
                    "spamhaus",
                    "barracuda",
                    "sorbs"
                  ],
                  "recommended_action": "block",
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "email": "contact@company.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchEmailReputation",
        "summary": "Batch email reputation score \u2014 up to 20 emails",
        "x-pricing": {
          "pricePerCallUsdc": 0.015
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "emails"
                ],
                "properties": {
                  "emails": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "format": "email"
                    }
                  }
                }
              },
              "example": {
                "emails": [
                  "contact@company.com",
                  "info@startup.io"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "email",
                          "reputation_score",
                          "risk_level"
                        ],
                        "properties": {
                          "email": {
                            "type": "string",
                            "format": "email"
                          },
                          "reputation_score": {
                            "type": "number"
                          },
                          "risk_level": {
                            "type": "string"
                          },
                          "blacklisted": {
                            "type": "boolean"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "email": "contact@company.com",
                      "reputation_score": 87,
                      "risk_level": "low",
                      "blacklisted": false
                    },
                    {
                      "email": "info@startup.io",
                      "reputation_score": 72,
                      "risk_level": "medium",
                      "blacklisted": false
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 3600
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
    }
  }
}
ENDJSON
echo 'wrote email-reputation-openapi.json'

cat > disposable-email-detector-info.json << 'ENDJSON'
{
  "name": "Disposable Email Detector API",
  "slug": "disposable-email-detector",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 500
    },
    "pay_per_call": {
      "detect": "$0.001",
      "domain": "$0.001",
      "execution-gate": "$0.001",
      "batch": "$0.010"
    }
  },
  "rate_limits": {
    "free": "500/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/detect",
    "/domain",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/detect",
    "fallback": "/detect",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote disposable-email-detector-info.json'

cat > disposable-email-detector-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Disposable Email Detector API",
    "version": "1.0.0",
    "description": "Detect disposable, temporary, and throwaway email addresses and domains in real time. Essential for signup fraud prevention and lead quality agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "detect": "$0.001",
        "domain": "$0.001",
        "execution-gate": "$0.001",
        "batch": "$0.010"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/disposable-email-detector"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/detect": {
      "post": {
        "operationId": "detectDisposable",
        "summary": "ONE-CALL: Detect if an email is disposable or throwaway",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  }
                }
              },
              "example": {
                "email": "user@mailinator.com"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "email",
                    "is_disposable",
                    "risk_label",
                    "recommended_action"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email"
                    },
                    "is_disposable": {
                      "type": "boolean"
                    },
                    "is_role_account": {
                      "type": "boolean"
                    },
                    "is_free_provider": {
                      "type": "boolean"
                    },
                    "provider_name": {
                      "type": "string"
                    },
                    "risk_label": {
                      "type": "string",
                      "enum": [
                        "clean",
                        "suspicious",
                        "disposable",
                        "blocked"
                      ]
                    },
                    "recommended_action": {
                      "type": "string",
                      "enum": [
                        "allow",
                        "review",
                        "block"
                      ]
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "disposable",
                        "role",
                        "provider"
                      ],
                      "properties": {
                        "disposable": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "role": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "provider": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "email": "user@mailinator.com",
                  "is_disposable": true,
                  "is_role_account": false,
                  "is_free_provider": true,
                  "provider_name": "Mailinator",
                  "risk_label": "disposable",
                  "recommended_action": "block",
                  "confidence_per_section": {
                    "disposable": 0.99,
                    "role": 0.0,
                    "provider": 0.99
                  },
                  "recommended_actions_priority_order": [
                    "block",
                    "log_attempt"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/domain": {
      "get": {
        "operationId": "checkDisposableDomain",
        "summary": "Check if a domain is a known disposable provider",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "mailinator.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "is_disposable_domain"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "is_disposable_domain": {
                      "type": "boolean"
                    },
                    "known_provider": {
                      "type": "string"
                    },
                    "mx_valid": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "mailinator.com",
                  "is_disposable_domain": true,
                  "known_provider": "Mailinator",
                  "mx_valid": true,
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "email": "user@mailinator.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchDetectDisposable",
        "summary": "Batch disposable email detection \u2014 up to 20 emails",
        "x-pricing": {
          "pricePerCallUsdc": 0.01
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "emails"
                ],
                "properties": {
                  "emails": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "format": "email"
                    }
                  }
                }
              },
              "example": {
                "emails": [
                  "user@mailinator.com",
                  "real@company.com"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "email",
                          "is_disposable"
                        ],
                        "properties": {
                          "email": {
                            "type": "string",
                            "format": "email"
                          },
                          "is_disposable": {
                            "type": "boolean"
                          },
                          "risk_label": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "email": "user@mailinator.com",
                      "is_disposable": true,
                      "risk_label": "disposable"
                    },
                    {
                      "email": "real@company.com",
                      "is_disposable": false,
                      "risk_label": "clean"
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
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
    }
  }
}
ENDJSON
echo 'wrote disposable-email-detector-openapi.json'

cat > email-syntax-cleaner-info.json << 'ENDJSON'
{
  "name": "Email Syntax Cleaner API",
  "slug": "email-syntax-cleaner",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 500
    },
    "pay_per_call": {
      "clean": "$0.001",
      "normalize": "$0.001",
      "execution-gate": "$0.001",
      "batch": "$0.010"
    }
  },
  "rate_limits": {
    "free": "500/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/clean",
    "/normalize",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/clean",
    "fallback": "/clean",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote email-syntax-cleaner-info.json'

cat > email-syntax-cleaner-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Email Syntax Cleaner API",
    "version": "1.0.0",
    "description": "Clean, normalize, and validate email address syntax. Strips aliases, corrects common typos, and standardizes formatting for CRM and outreach pipelines.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 500
      },
      "pay_per_call": {
        "clean": "$0.001",
        "normalize": "$0.001",
        "execution-gate": "$0.001",
        "batch": "$0.010"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/email-syntax-cleaner"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/clean": {
      "post": {
        "operationId": "cleanEmail",
        "summary": "ONE-CALL: Clean and validate email syntax",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "email": "User+alias@Gmial.com"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "input",
                    "cleaned",
                    "is_valid"
                  ],
                  "properties": {
                    "input": {
                      "type": "string"
                    },
                    "cleaned": {
                      "type": "string",
                      "format": "email"
                    },
                    "is_valid": {
                      "type": "boolean"
                    },
                    "changes_made": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "typo_corrected": {
                      "type": "boolean"
                    },
                    "alias_removed": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "syntax",
                        "typo",
                        "alias"
                      ],
                      "properties": {
                        "syntax": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "typo": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "alias": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "input": "User+alias@Gmial.com",
                  "cleaned": "user@gmail.com",
                  "is_valid": true,
                  "changes_made": [
                    "lowercased",
                    "alias_stripped",
                    "typo_corrected"
                  ],
                  "typo_corrected": true,
                  "alias_removed": true,
                  "confidence_per_section": {
                    "syntax": 1.0,
                    "typo": 0.95,
                    "alias": 1.0
                  },
                  "recommended_actions_priority_order": [
                    "use_cleaned_email",
                    "verify_deliverability"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/normalize": {
      "post": {
        "operationId": "normalizeEmail",
        "summary": "Normalize email to canonical form",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "email": "User+Tag@Gmail.com"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "input",
                    "normalized"
                  ],
                  "properties": {
                    "input": {
                      "type": "string"
                    },
                    "normalized": {
                      "type": "string",
                      "format": "email"
                    },
                    "local_part": {
                      "type": "string"
                    },
                    "domain": {
                      "type": "string"
                    },
                    "lowercase_applied": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "input": "User+Tag@Gmail.com",
                  "normalized": "user@gmail.com",
                  "local_part": "user",
                  "domain": "gmail.com",
                  "lowercase_applied": true,
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "email": "user@example.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchCleanEmails",
        "summary": "Batch email syntax clean \u2014 up to 20 emails",
        "x-pricing": {
          "pricePerCallUsdc": 0.01
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "emails"
                ],
                "properties": {
                  "emails": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string"
                    }
                  }
                }
              },
              "example": {
                "emails": [
                  "User+alias@Gmial.com",
                  "HELLO@Company.COM"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "input",
                          "cleaned",
                          "is_valid"
                        ],
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "cleaned": {
                            "type": "string"
                          },
                          "is_valid": {
                            "type": "boolean"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "input": "User+alias@Gmial.com",
                      "cleaned": "user@gmail.com",
                      "is_valid": true
                    },
                    {
                      "input": "HELLO@Company.COM",
                      "cleaned": "hello@company.com",
                      "is_valid": true
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
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
    }
  }
}
ENDJSON
echo 'wrote email-syntax-cleaner-openapi.json'

cat > company-domain-finder-info.json << 'ENDJSON'
{
  "name": "Company Domain Finder API",
  "slug": "company-domain-finder",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 200
    },
    "pay_per_call": {
      "find-domain": "$0.003",
      "verify-domain": "$0.002",
      "execution-gate": "$0.001",
      "batch": "$0.018"
    }
  },
  "rate_limits": {
    "free": "200/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/find-domain",
    "/verify-domain",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/find-domain",
    "fallback": "/find-domain",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote company-domain-finder-info.json'

cat > company-domain-finder-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Company Domain Finder API",
    "version": "1.0.0",
    "description": "Find and verify the primary domain for any company by name. Returns canonical domain, confidence score, and alternate matches for sales, enrichment, and prospecting agents.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 200
      },
      "pay_per_call": {
        "find-domain": "$0.003",
        "verify-domain": "$0.002",
        "execution-gate": "$0.001",
        "batch": "$0.018"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/company-domain-finder"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/find-domain": {
      "post": {
        "operationId": "findCompanyDomain",
        "summary": "ONE-CALL: Find primary domain for a company name",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.003
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "company_name"
                ],
                "properties": {
                  "company_name": {
                    "type": "string"
                  },
                  "country_hint": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "company_name": "Stripe",
                "country_hint": "US"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "company_name",
                    "domain",
                    "confidence_score"
                  ],
                  "properties": {
                    "company_name": {
                      "type": "string"
                    },
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "confidence_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "alternate_domains": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "website_url": {
                      "type": "string",
                      "format": "uri"
                    },
                    "industry": {
                      "type": "string"
                    },
                    "hq_country": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "domain_match",
                        "confidence",
                        "industry"
                      ],
                      "properties": {
                        "domain_match": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "confidence": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "industry": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "company_name": "Stripe",
                  "domain": "stripe.com",
                  "confidence_score": 0.99,
                  "alternate_domains": [
                    "stripe.dev",
                    "stripe.io"
                  ],
                  "website_url": "https://stripe.com",
                  "industry": "fintech",
                  "hq_country": "US",
                  "confidence_per_section": {
                    "domain_match": 0.99,
                    "confidence": 0.99,
                    "industry": 0.92
                  },
                  "recommended_actions_priority_order": [
                    "use_domain",
                    "verify_with_mx_check"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/verify-domain": {
      "post": {
        "operationId": "verifyCompanyDomain",
        "summary": "Verify a domain belongs to a given company",
        "x-pricing": {
          "pricePerCallUsdc": 0.002
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domain",
                  "company_name"
                ],
                "properties": {
                  "domain": {
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "company_name": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "stripe.com",
                "company_name": "Stripe"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "is_match",
                    "match_score"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "company_name": {
                      "type": "string"
                    },
                    "is_match": {
                      "type": "boolean"
                    },
                    "match_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "domain_active": {
                      "type": "boolean"
                    },
                    "has_mx": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "stripe.com",
                  "company_name": "Stripe",
                  "is_match": true,
                  "match_score": 0.99,
                  "domain_active": true,
                  "has_mx": true,
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "company_name"
                ],
                "properties": {
                  "company_name": {
                    "type": "string"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "company_name": "Stripe",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchFindDomains",
        "summary": "Batch company domain lookup \u2014 up to 20 companies",
        "x-pricing": {
          "pricePerCallUsdc": 0.018
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "companies"
                ],
                "properties": {
                  "companies": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "object",
                      "required": [
                        "company_name"
                      ],
                      "properties": {
                        "company_name": {
                          "type": "string"
                        },
                        "country_hint": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              },
              "example": {
                "companies": [
                  {
                    "company_name": "Stripe",
                    "country_hint": "US"
                  },
                  {
                    "company_name": "Notion"
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "company_name",
                          "domain"
                        ],
                        "properties": {
                          "company_name": {
                            "type": "string"
                          },
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "confidence_score": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "company_name": "Stripe",
                      "domain": "stripe.com",
                      "confidence_score": 0.99
                    },
                    {
                      "company_name": "Notion",
                      "domain": "notion.so",
                      "confidence_score": 0.97
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
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
    }
  }
}
ENDJSON
echo 'wrote company-domain-finder-openapi.json'

cat > company-logo-info.json << 'ENDJSON'
{
  "name": "Company Logo API",
  "slug": "company-logo",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 300
    },
    "pay_per_call": {
      "logo": "$0.001",
      "favicon": "$0.001",
      "brand-assets": "$0.003",
      "execution-gate": "$0.001",
      "batch": "$0.010"
    }
  },
  "rate_limits": {
    "free": "300/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/logo",
    "/favicon",
    "/brand-assets",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/brand-assets",
    "fallback": "/logo",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote company-logo-info.json'

cat > company-logo-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Company Logo API",
    "version": "1.0.0",
    "description": "Fetch company logos, favicons, and brand assets by domain. Returns CDN-hosted image URLs with size variants for dashboards, CRMs, and agent UIs.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "logo": "$0.001",
        "favicon": "$0.001",
        "brand-assets": "$0.003",
        "execution-gate": "$0.001",
        "batch": "$0.010"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/company-logo"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/logo": {
      "get": {
        "operationId": "getCompanyLogo",
        "summary": "Get company logo URL by domain",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "stripe.com"
          },
          {
            "name": "size",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            },
            "example": "128"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "logo_url",
                    "format"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "logo_url": {
                      "type": "string",
                      "format": "uri"
                    },
                    "logo_dark_url": {
                      "type": "string",
                      "format": "uri"
                    },
                    "sizes_available": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "format": {
                      "type": "string",
                      "enum": [
                        "png",
                        "svg",
                        "webp",
                        "jpg"
                      ]
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "stripe.com",
                  "logo_url": "https://logo.clearbit.com/stripe.com",
                  "logo_dark_url": "https://logo.clearbit.com/stripe.com?dark=true",
                  "sizes_available": [
                    "32",
                    "64",
                    "128",
                    "256"
                  ],
                  "format": "png",
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/favicon": {
      "get": {
        "operationId": "getCompanyFavicon",
        "summary": "Get favicon URL for a domain",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "stripe.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "favicon_url"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "favicon_url": {
                      "type": "string",
                      "format": "uri"
                    },
                    "favicon_size": {
                      "type": "string"
                    },
                    "format": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "stripe.com",
                  "favicon_url": "https://stripe.com/favicon.ico",
                  "favicon_size": "32x32",
                  "format": "ico",
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/brand-assets": {
      "get": {
        "operationId": "getBrandAssets",
        "summary": "ONE-CALL: logo + favicon + primary brand colors",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.003
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "stripe.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "logo_url",
                    "favicon_url"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "logo_url": {
                      "type": "string",
                      "format": "uri"
                    },
                    "favicon_url": {
                      "type": "string",
                      "format": "uri"
                    },
                    "primary_color": {
                      "type": "string"
                    },
                    "secondary_color": {
                      "type": "string"
                    },
                    "brand_name": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "logo",
                        "favicon",
                        "brand"
                      ],
                      "properties": {
                        "logo": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "favicon": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "brand": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "stripe.com",
                  "logo_url": "https://logo.clearbit.com/stripe.com",
                  "favicon_url": "https://stripe.com/favicon.ico",
                  "primary_color": "#635BFF",
                  "secondary_color": "#0A2540",
                  "brand_name": "Stripe",
                  "confidence_per_section": {
                    "logo": 0.99,
                    "favicon": 0.99,
                    "brand": 0.92
                  },
                  "recommended_actions_priority_order": [
                    "use_logo_url",
                    "cache_locally"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "stripe.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchGetLogos",
        "summary": "Batch logo fetch \u2014 up to 20 domains",
        "x-pricing": {
          "pricePerCallUsdc": 0.01
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domains"
                ],
                "properties": {
                  "domains": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    }
                  }
                }
              },
              "example": {
                "domains": [
                  "stripe.com",
                  "notion.so"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain",
                          "logo_url"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "logo_url": {
                            "type": "string",
                            "format": "uri"
                          },
                          "favicon_url": {
                            "type": "string",
                            "format": "uri"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "domain": "stripe.com",
                      "logo_url": "https://logo.clearbit.com/stripe.com",
                      "favicon_url": "https://stripe.com/favicon.ico"
                    },
                    {
                      "domain": "notion.so",
                      "logo_url": "https://logo.clearbit.com/notion.so",
                      "favicon_url": "https://notion.so/favicon.ico"
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
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
    }
  }
}
ENDJSON
echo 'wrote company-logo-openapi.json'

cat > brand-color-extractor-info.json << 'ENDJSON'
{
  "name": "Brand Color Extractor API",
  "slug": "brand-color-extractor",
  "version": "1.0.0",
  "grade": "A+",
  "mcp_compatible": true,
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "pricing": {
    "free_tier": {
      "requests_per_day": 300
    },
    "pay_per_call": {
      "colors": "$0.002",
      "palette": "$0.003",
      "contrast": "$0.001",
      "execution-gate": "$0.001",
      "batch": "$0.012"
    }
  },
  "rate_limits": {
    "free": "300/day",
    "paid": "50000/day",
    "enterprise": "500000/day"
  },
  "endpoints": [
    "/colors",
    "/palette",
    "/contrast",
    "/execution-gate",
    "/batch"
  ],
  "execution_chain": {
    "recommended_start": "/colors",
    "fallback": "/colors",
    "batch_endpoint": "/batch"
  }
}
ENDJSON
echo 'wrote brand-color-extractor-info.json'

cat > brand-color-extractor-openapi.json << 'ENDJSON'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Brand Color Extractor API",
    "version": "1.0.0",
    "description": "Extract dominant brand colors, full palettes, and WCAG contrast ratios from any website. For design agents, brand consistency tools, and UI automation.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 300
      },
      "pay_per_call": {
        "colors": "$0.002",
        "palette": "$0.003",
        "contrast": "$0.001",
        "execution-gate": "$0.001",
        "batch": "$0.012"
      }
    }
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/brand-color-extractor"
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
        "summary": "API discovery \u2014 endpoints, pricing, rate limits",
        "x-pricing": {
          "pricePerCallUsdc": 0.0
        },
        "responses": {
          "200": {
            "description": "API metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api_name",
                    "version",
                    "base_url",
                    "endpoints",
                    "one_call_endpoint"
                  ],
                  "properties": {
                    "api_name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "base_url": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "one_call_endpoint": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "rate_limits": {
                      "type": "object",
                      "properties": {
                        "free": {
                          "type": "string"
                        },
                        "paid": {
                          "type": "string"
                        },
                        "enterprise": {
                          "type": "string"
                        }
                      }
                    },
                    "mcp_compatible": {
                      "type": "boolean"
                    },
                    "agent_callable": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/colors": {
      "get": {
        "operationId": "getBrandColors",
        "summary": "ONE-CALL: Extract primary and secondary brand colors from a domain",
        "x-one-call": true,
        "x-pricing": {
          "pricePerCallUsdc": 0.002
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "stripe.com"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "primary_color",
                    "colors"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "primary_color": {
                      "type": "string"
                    },
                    "secondary_color": {
                      "type": "string"
                    },
                    "colors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "hex",
                          "role",
                          "usage_pct"
                        ],
                        "properties": {
                          "hex": {
                            "type": "string"
                          },
                          "rgb": {
                            "type": "string"
                          },
                          "role": {
                            "type": "string",
                            "enum": [
                              "primary",
                              "secondary",
                              "accent",
                              "background",
                              "text"
                            ]
                          },
                          "usage_pct": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 100
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "required": [
                        "primary",
                        "palette",
                        "contrast"
                      ],
                      "properties": {
                        "primary": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "palette": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "contrast": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "privacy": {
                      "type": "object",
                      "required": [
                        "data_stored",
                        "retention"
                      ],
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "stripe.com",
                  "primary_color": "#635BFF",
                  "secondary_color": "#0A2540",
                  "colors": [
                    {
                      "hex": "#635BFF",
                      "rgb": "99,91,255",
                      "role": "primary",
                      "usage_pct": 42.0
                    },
                    {
                      "hex": "#0A2540",
                      "rgb": "10,37,64",
                      "role": "secondary",
                      "usage_pct": 28.0
                    }
                  ],
                  "confidence_per_section": {
                    "primary": 0.97,
                    "palette": 0.92,
                    "contrast": 0.95
                  },
                  "recommended_actions_priority_order": [
                    "use_primary_color",
                    "validate_wcag_contrast"
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/palette": {
      "get": {
        "operationId": "getColorPalette",
        "summary": "Get full color palette extracted from a website",
        "x-pricing": {
          "pricePerCallUsdc": 0.003
        },
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            "example": "stripe.com"
          },
          {
            "name": "max_colors",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            },
            "example": "8"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "domain",
                    "palette",
                    "palette_size"
                  ],
                  "properties": {
                    "domain": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "palette": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "hex",
                          "role",
                          "usage_pct"
                        ],
                        "properties": {
                          "hex": {
                            "type": "string"
                          },
                          "rgb": {
                            "type": "string"
                          },
                          "role": {
                            "type": "string",
                            "enum": [
                              "primary",
                              "secondary",
                              "accent",
                              "background",
                              "text"
                            ]
                          },
                          "usage_pct": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 100
                          }
                        }
                      }
                    },
                    "palette_size": {
                      "type": "integer"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "domain": "stripe.com",
                  "palette_size": 5,
                  "palette": [
                    {
                      "hex": "#635BFF",
                      "rgb": "99,91,255",
                      "role": "primary",
                      "usage_pct": 42.0
                    },
                    {
                      "hex": "#0A2540",
                      "rgb": "10,37,64",
                      "role": "secondary",
                      "usage_pct": 28.0
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/contrast": {
      "post": {
        "operationId": "checkContrast",
        "summary": "Check WCAG contrast ratio between two hex colors",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "foreground",
                  "background"
                ],
                "properties": {
                  "foreground": {
                    "type": "string"
                  },
                  "background": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "foreground": "#FFFFFF",
                "background": "#635BFF"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "contrast_ratio",
                    "wcag_aa",
                    "grade"
                  ],
                  "properties": {
                    "foreground": {
                      "type": "string"
                    },
                    "background": {
                      "type": "string"
                    },
                    "contrast_ratio": {
                      "type": "number"
                    },
                    "wcag_aa": {
                      "type": "boolean"
                    },
                    "wcag_aaa": {
                      "type": "boolean"
                    },
                    "grade": {
                      "type": "string",
                      "enum": [
                        "pass",
                        "fail"
                      ]
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "foreground": "#FFFFFF",
                  "background": "#635BFF",
                  "contrast_ratio": 4.6,
                  "wcag_aa": true,
                  "wcag_aaa": false,
                  "grade": "pass",
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
                }
              }
            }
          }
        }
      }
    },
    "/execution-gate": {
      "post": {
        "operationId": "executionGate",
        "summary": "Execution readiness check before processing",
        "x-pricing": {
          "pricePerCallUsdc": 0.001
        },
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
                    "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                  },
                  "objective": {
                    "type": "string"
                  }
                }
              },
              "example": {
                "domain": "stripe.com",
                "objective": "validate before processing"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "ready",
                    "gate_passed"
                  ],
                  "properties": {
                    "ready": {
                      "type": "boolean"
                    },
                    "gate_passed": {
                      "type": "boolean"
                    },
                    "blocking_reason": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "ready": true,
                  "gate_passed": true,
                  "automation_safe": true,
                  "cache_recommended": false,
                  "cache_ttl_seconds": 0
                }
              }
            }
          }
        }
      }
    },
    "/batch": {
      "post": {
        "operationId": "batchExtractColors",
        "summary": "Batch brand color extraction \u2014 up to 20 domains",
        "x-pricing": {
          "pricePerCallUsdc": 0.012
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "domains"
                ],
                "properties": {
                  "domains": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    }
                  }
                }
              },
              "example": {
                "domains": [
                  "stripe.com",
                  "notion.so"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "trace_id",
                    "computed_at",
                    "success",
                    "count",
                    "succeeded",
                    "failed",
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "succeeded": {
                      "type": "integer"
                    },
                    "failed": {
                      "type": "integer"
                    },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "input": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "domain",
                          "primary_color"
                        ],
                        "properties": {
                          "domain": {
                            "type": "string",
                            "pattern": "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                          },
                          "primary_color": {
                            "type": "string"
                          },
                          "secondary_color": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "source_provenance": {
                      "type": "object",
                      "required": [
                        "provider",
                        "retrieved_at",
                        "freshness_score"
                      ],
                      "properties": {
                        "provider": {
                          "type": "string"
                        },
                        "retrieved_at": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "freshness_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "cache_ttl_seconds": {
                      "type": "integer"
                    },
                    "cache_recommended": {
                      "type": "boolean"
                    },
                    "recommended_next_api": {
                      "type": "string"
                    },
                    "recommended_next_endpoint": {
                      "type": "string"
                    },
                    "automation_safe": {
                      "type": "boolean"
                    }
                  }
                },
                "example": {
                  "trace_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                  "computed_at": "2025-01-01T00:00:00Z",
                  "success": true,
                  "count": 2,
                  "succeeded": 2,
                  "failed": 0,
                  "errors": [],
                  "results": [
                    {
                      "domain": "stripe.com",
                      "primary_color": "#635BFF",
                      "secondary_color": "#0A2540"
                    },
                    {
                      "domain": "notion.so",
                      "primary_color": "#000000",
                      "secondary_color": "#FFFFFF"
                    }
                  ],
                  "automation_safe": true,
                  "cache_recommended": true,
                  "cache_ttl_seconds": 86400
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
    }
  }
}
ENDJSON
echo 'wrote brand-color-extractor-openapi.json'

echo 'Done! All 10 APIs written (v3).'