import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Agent Cross-Chain Execution Bridge Intelligence API",
    "version": "1.0.0",
    "description": "Routes, quotes, and simulates cross-chain bridge transactions for agent execution.",
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
      "url": "https://orbis-apis.onrender.com/cross-chain-bridge"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Agent Cross-Chain Execution Bridge Intelligence API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Agent Cross-Chain Execution Bridge Intelligence API"
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
          "Agent Cross-Chain Execution Bridge Intelligence API"
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
    "/quote": {
      "post": {
        "summary": "Get bridge route quotes",
        "operationId": "post_quote",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Cross-Chain Execution Bridge Intelligence API"
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
                    "routes",
                    "best_route",
                    "estimated_time_seconds"
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
                      "type": "string"
                    },
                    "routes": {
                      "type": "string"
                    },
                    "best_route": {
                      "type": "string"
                    },
                    "estimated_time_seconds": {
                      "type": "string"
                    },
                    "fees_usd": {
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
                  "from_chain",
                  "to_chain"
                ],
                "properties": {
                  "from_chain": {
                    "type": "string"
                  },
                  "to_chain": {
                    "type": "string"
                  },
                  "token": {
                    "type": "string"
                  },
                  "amount": {
                    "type": "string"
                  },
                  "slippage": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/simulate": {
      "post": {
        "summary": "Simulate a bridge transaction",
        "operationId": "post_simulate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Cross-Chain Execution Bridge Intelligence API"
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
                    "simulation_result",
                    "gas_estimate",
                    "success_probability"
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
                    "simulation_result": {
                      "type": "string"
                    },
                    "gas_estimate": {
                      "type": "string"
                    },
                    "success_probability": {
                      "type": "string"
                    },
                    "risk_flags": {
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
                  "route_id",
                  "from_address"
                ],
                "properties": {
                  "route_id": {
                    "type": "string"
                  },
                  "from_address": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/status/:tx_hash": {
      "get": {
        "summary": "Check bridge transaction status",
        "operationId": "get_status_tx_hash",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Cross-Chain Execution Bridge Intelligence API"
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
                    "tx_hash",
                    "status",
                    "confirmations"
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
                    "tx_hash": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "confirmations": {
                      "type": "string"
                    },
                    "estimated_completion": {
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
            "name": "tx_hash",
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
