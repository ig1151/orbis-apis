#!/bin/bash
echo 'Writing batch 5 APIs 1-10...'

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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                  }
                }
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "age": {
                          "type": "number"
                        },
                        "whois": {
                          "type": "number"
                        },
                        "trust": {
                          "type": "number"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "mynewstartup.com"
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "availability": {
                          "type": "number"
                        },
                        "registrar": {
                          "type": "number"
                        },
                        "expiry": {
                          "type": "number"
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
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
                    },
                    "mx_records": {
                      "type": "array",
                      "items": {
                        "type": "object",
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "mx": {
                          "type": "number"
                        },
                        "spf": {
                          "type": "number"
                        },
                        "dmarc": {
                          "type": "number"
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
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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
    "description": "Validate SPF, DKIM, and DMARC DNS records for any domain. Returns pass/fail status, policy details, and actionable fixes for email authentication agents.",
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                  "dkim_selector": {
                    "type": "string"
                  }
                }
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
                      "type": "string"
                    },
                    "spf": {
                      "type": "object",
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
                      "type": "string"
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
                      "properties": {
                        "spf": {
                          "type": "number"
                        },
                        "dkim": {
                          "type": "number"
                        },
                        "dmarc": {
                          "type": "number"
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
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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
    "description": "Score email addresses and domains for reputation, blacklist status, and deliverability risk. Designed for outreach filtering, fraud detection, and CRM hygiene agents.",
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
                      "type": "string"
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
                      "properties": {
                        "reputation": {
                          "type": "number"
                        },
                        "blacklist": {
                          "type": "number"
                        },
                        "syntax": {
                          "type": "number"
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
                      "type": "string"
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "disposable": {
                          "type": "number"
                        },
                        "role": {
                          "type": "number"
                        },
                        "provider": {
                          "type": "number"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "syntax": {
                          "type": "number"
                        },
                        "typo": {
                          "type": "number"
                        },
                        "alias": {
                          "type": "number"
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
                      "type": "string"
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
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
                      "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "domain_match": {
                          "type": "number"
                        },
                        "confidence": {
                          "type": "number"
                        },
                        "industry": {
                          "type": "number"
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
                    "type": "string"
                  },
                  "company_name": {
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "company_name": {
                            "type": "string"
                          },
                          "domain": {
                            "type": "string"
                          },
                          "confidence_score": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "trace_id": {
                      "type": "string"
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
    "description": "Fetch company logos, favicons, and brand assets by domain or company name. Returns CDN-hosted image URLs with size variants for dashboards, CRMs, and agent UIs.",
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "logo": {
                          "type": "number"
                        },
                        "favicon": {
                          "type": "number"
                        },
                        "brand": {
                          "type": "number"
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
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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
    "description": "Extract dominant brand colors, full palettes, and WCAG contrast ratios from any website. Useful for design agents, brand consistency tools, and UI automation.",
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
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
                      "type": "string"
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
                      "properties": {
                        "primary": {
                          "type": "number"
                        },
                        "palette": {
                          "type": "number"
                        },
                        "contrast": {
                          "type": "number"
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
        "parameters": [
          {
            "name": "domain",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
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
                      "type": "string"
                    },
                    "palette": {
                      "type": "array",
                      "items": {
                        "type": "object",
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
                      "type": "string"
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
                      "type": "string"
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
                    "type": "string"
                  }
                }
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
                      "type": "string"
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
                    "results"
                  ],
                  "properties": {
                    "count": {
                      "type": "integer"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "domain": {
                            "type": "string"
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
                      "type": "string"
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

echo 'Done! All 10 APIs written.'