import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Agent Crypto Trigger Market Alert API",
    "version": "1.0.0",
    "description": "Monitors on-chain and market conditions to trigger agent workflows on configurable events.",
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
      "url": "https://orbis-apis.onrender.com/crypto-trigger"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Agent Crypto Trigger Market Alert API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Agent Crypto Trigger Market Alert API"
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
          "Agent Crypto Trigger Market Alert API"
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
    "/trigger": {
      "post": {
        "summary": "Create a market trigger",
        "operationId": "post_trigger",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Crypto Trigger Market Alert API"
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
                    "trigger_id",
                    "active",
                    "condition"
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
                    "trigger_id": {
                      "type": "string"
                    },
                    "active": {
                      "type": "string"
                    },
                    "condition": {
                      "type": "string"
                    },
                    "estimated_ttl_seconds": {
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
                  "asset",
                  "condition"
                ],
                "properties": {
                  "asset": {
                    "type": "string"
                  },
                  "condition": {
                    "type": "string"
                  },
                  "threshold": {
                    "type": "string"
                  },
                  "webhook_url": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/triggers": {
      "get": {
        "summary": "List active triggers",
        "operationId": "get_triggers",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Crypto Trigger Market Alert API"
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
                    "triggers",
                    "total"
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
                    "triggers": {
                      "type": "string"
                    },
                    "total": {
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
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "asset",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/test": {
      "post": {
        "summary": "Test a trigger condition against current data",
        "operationId": "post_test",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Crypto Trigger Market Alert API"
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
                    "would_fire",
                    "current_value",
                    "threshold"
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
                    "would_fire": {
                      "type": "string"
                    },
                    "current_value": {
                      "type": "string"
                    },
                    "threshold": {
                      "type": "string"
                    },
                    "delta": {
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
                  "asset",
                  "condition"
                ],
                "properties": {
                  "asset": {
                    "type": "string"
                  },
                  "condition": {
                    "type": "string"
                  },
                  "threshold": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/trigger/:id": {
      "delete": {
        "summary": "Delete a trigger",
        "operationId": "delete_trigger_id",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Crypto Trigger Market Alert API"
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
                    "deleted",
                    "trigger_id"
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
                    "deleted": {
                      "type": "string"
                    },
                    "trigger_id": {
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
            "name": "id",
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
