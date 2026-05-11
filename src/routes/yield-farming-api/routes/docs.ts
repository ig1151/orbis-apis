import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Yield Farming API",
    "version": "1.0.0",
    "description": "Surfaces top yield farming opportunities across DeFi protocols with risk-adjusted APY rankings.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "model": "per_call",
      "unit_cost_usd": 0.002
    }
  },
  "x-execution-gate-required": true,
  "x-paper-mode-recommended": true,
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/yield-farming"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Yield Farming API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Yield Farming API"
        ],
        "responses": {
          "200": {
            "description": "API capability discovery",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "api",
                    "endpoints",
                    "pricing",
                    "human_approval_required"
                  ],
                  "properties": {
                    "api": {
                      "type": "string"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "pricing": {
                      "type": "object"
                    },
                    "human_approval_required": {
                      "type": "boolean"
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
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
    },
    "/execution-gate": {
      "post": {
        "summary": "Pre-flight execution gate check",
        "operationId": "executionGate",
        "x-agent-callable": true,
        "tags": [
          "Yield Farming API"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "action": {
                    "type": "string"
                  },
                  "payload": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gate result"
          }
        }
      }
    },
    "/opportunities": {
      "get": {
        "summary": "List current yield farming opportunities",
        "operationId": "get_opportunities",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Yield Farming API"
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "trace_id",
                    "execution_id",
                    "opportunities",
                    "updated_at",
                    "total_tvl_usd"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string"
                    },
                    "execution_id": {
                      "type": "string"
                    },
                    "session_id": {
                      "type": "string"
                    },
                    "human_approval_required": {
                      "type": "boolean",
                      "default": true
                    },
                    "opportunities": {
                      "type": "string"
                    },
                    "updated_at": {
                      "type": "string"
                    },
                    "total_tvl_usd": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad Request"
          },
          "500": {
            "description": "Internal Server Error"
          }
        },
        "parameters": [
          {
            "name": "chain",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "min_apy",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "max_risk",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "protocol",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/simulate": {
      "post": {
        "summary": "Simulate yield on a given position",
        "operationId": "post_simulate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Yield Farming API"
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "trace_id",
                    "execution_id",
                    "projected_yield_usd",
                    "projected_apy",
                    "gas_cost_usd"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string"
                    },
                    "execution_id": {
                      "type": "string"
                    },
                    "session_id": {
                      "type": "string"
                    },
                    "human_approval_required": {
                      "type": "boolean",
                      "default": true
                    },
                    "projected_yield_usd": {
                      "type": "string"
                    },
                    "projected_apy": {
                      "type": "string"
                    },
                    "gas_cost_usd": {
                      "type": "string"
                    },
                    "net_yield_usd": {
                      "type": "string"
                    },
                    "risk_score": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad Request"
          },
          "500": {
            "description": "Internal Server Error"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "protocol",
                  "pool"
                ],
                "properties": {
                  "protocol": {
                    "type": "string"
                  },
                  "pool": {
                    "type": "string"
                  },
                  "amount_usd": {
                    "type": "string"
                  },
                  "duration_days": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/protocol/:name": {
      "get": {
        "summary": "Get protocol-level yield summary",
        "operationId": "get_protocol_name",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Yield Farming API"
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "success",
                    "trace_id",
                    "execution_id",
                    "protocol",
                    "pools",
                    "avg_apy"
                  ],
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "trace_id": {
                      "type": "string"
                    },
                    "execution_id": {
                      "type": "string"
                    },
                    "session_id": {
                      "type": "string"
                    },
                    "human_approval_required": {
                      "type": "boolean",
                      "default": true
                    },
                    "protocol": {
                      "type": "string"
                    },
                    "pools": {
                      "type": "string"
                    },
                    "avg_apy": {
                      "type": "string"
                    },
                    "tvl_usd": {
                      "type": "string"
                    },
                    "audited": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad Request"
          },
          "500": {
            "description": "Internal Server Error"
          }
        },
        "parameters": [
          {
            "name": "name",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    }
  }
};

router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

export default router;
