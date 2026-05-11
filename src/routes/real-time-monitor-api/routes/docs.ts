import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Real-Time Monitor API",
    "version": "1.0.0",
    "description": "Generic real-time event monitoring with configurable triggers, webhooks, and agent-callable alerts.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x-pricing": {
      "model": "per_call",
      "unit_cost_usd": 0.002
    }
  },
  "x-execution-gate-required": false,
  "x-paper-mode-recommended": false,
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/real-time-monitor"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Real-Time Monitor API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Real-Time Monitor API"
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
          "Real-Time Monitor API"
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
    "/monitor": {
      "post": {
        "summary": "Create a real-time monitor",
        "operationId": "post_monitor",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Real-Time Monitor API"
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
                    "monitor_id",
                    "active",
                    "name"
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
                      "default": false
                    },
                    "monitor_id": {
                      "type": "string"
                    },
                    "active": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "condition": {
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
                  "name",
                  "data_source"
                ],
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "data_source": {
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
    "/monitors": {
      "get": {
        "summary": "List all active monitors",
        "operationId": "get_monitors",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Real-Time Monitor API"
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
                    "monitors",
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
                      "default": false
                    },
                    "monitors": {
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
            "name": "data_source",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/monitor/:id/events": {
      "get": {
        "summary": "Get events fired by a monitor",
        "operationId": "get_monitor_id_events",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Real-Time Monitor API"
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
                    "monitor_id",
                    "events",
                    "total_fired"
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
                      "default": false
                    },
                    "monitor_id": {
                      "type": "string"
                    },
                    "events": {
                      "type": "string"
                    },
                    "total_fired": {
                      "type": "string"
                    },
                    "last_fired_at": {
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
    },
    "/monitor/:id": {
      "delete": {
        "summary": "Delete a monitor",
        "operationId": "delete_monitor_id",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Real-Time Monitor API"
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
                    "monitor_id"
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
                      "default": false
                    },
                    "deleted": {
                      "type": "string"
                    },
                    "monitor_id": {
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
