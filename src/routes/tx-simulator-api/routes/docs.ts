import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "TX Simulator API",
    "version": "1.0.0",
    "description": "Simulates EVM and Solana transactions before execution to surface gas costs and revert risks.",
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
      "url": "https://orbis-apis.onrender.com/tx-simulator"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover TX Simulator API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "TX Simulator API"
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
          "TX Simulator API"
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
    "/simulate": {
      "post": {
        "summary": "Simulate a transaction",
        "operationId": "post_simulate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "TX Simulator API"
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
                    "success",
                    "gas_used",
                    "gas_cost_usd"
                  ],
                  "properties": {
                    "success": {
                      "type": "string"
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
                    "gas_used": {
                      "type": "string"
                    },
                    "gas_cost_usd": {
                      "type": "string"
                    },
                    "state_changes": {
                      "type": "string"
                    },
                    "revert_reason": {
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
                  "chain",
                  "from"
                ],
                "properties": {
                  "chain": {
                    "type": "string"
                  },
                  "from": {
                    "type": "string"
                  },
                  "to": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  },
                  "data": {
                    "type": "string"
                  },
                  "gas_limit": {
                    "type": "string"
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
        "summary": "Simulate a sequence of transactions",
        "operationId": "post_batch",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "TX Simulator API"
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
                    "results",
                    "total_gas_usd",
                    "sequence_risk"
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
                    "results": {
                      "type": "string"
                    },
                    "total_gas_usd": {
                      "type": "string"
                    },
                    "sequence_risk": {
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
                  "chain",
                  "transactions"
                ],
                "properties": {
                  "chain": {
                    "type": "string"
                  },
                  "transactions": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/decode": {
      "post": {
        "summary": "Decode calldata for a transaction",
        "operationId": "post_decode",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "TX Simulator API"
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
                    "function_name",
                    "params",
                    "protocol_tag"
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
                    "function_name": {
                      "type": "string"
                    },
                    "params": {
                      "type": "string"
                    },
                    "protocol_tag": {
                      "type": "string"
                    },
                    "risk_assessment": {
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
                  "chain",
                  "to"
                ],
                "properties": {
                  "chain": {
                    "type": "string"
                  },
                  "to": {
                    "type": "string"
                  },
                  "data": {
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
};

router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

export default router;
