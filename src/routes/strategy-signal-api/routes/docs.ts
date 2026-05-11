import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Strategy Signal API",
    "version": "1.0.0",
    "description": "Generates trading and portfolio strategy signals from multi-factor quantitative models.",
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
      "url": "https://orbis-apis.onrender.com/strategy-signal"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Strategy Signal API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Strategy Signal API"
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
          "Strategy Signal API"
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
    "/generate": {
      "post": {
        "summary": "Generate a strategy signal",
        "operationId": "post_generate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Strategy Signal API"
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
                    "signal",
                    "direction",
                    "confidence"
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
                    "signal": {
                      "type": "string"
                    },
                    "direction": {
                      "type": "string"
                    },
                    "confidence": {
                      "type": "string"
                    },
                    "entry_price": {
                      "type": "string"
                    },
                    "stop_loss": {
                      "type": "string"
                    },
                    "take_profit": {
                      "type": "string"
                    },
                    "reasoning": {
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
                  "assets",
                  "strategy_type"
                ],
                "properties": {
                  "assets": {
                    "type": "string"
                  },
                  "strategy_type": {
                    "type": "string"
                  },
                  "risk_tolerance": {
                    "type": "string"
                  },
                  "horizon": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/backtest/:strategy_id": {
      "get": {
        "summary": "Retrieve backtest results for a strategy",
        "operationId": "get_backtest_strategy_id",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Strategy Signal API"
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
                    "strategy_id",
                    "sharpe",
                    "max_drawdown"
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
                    "strategy_id": {
                      "type": "string"
                    },
                    "sharpe": {
                      "type": "string"
                    },
                    "max_drawdown": {
                      "type": "string"
                    },
                    "win_rate": {
                      "type": "string"
                    },
                    "total_return_pct": {
                      "type": "string"
                    },
                    "period": {
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
            "name": "strategy_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/rank": {
      "post": {
        "summary": "Rank assets by strategy signal strength",
        "operationId": "post_rank",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Strategy Signal API"
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
                    "ranked_assets",
                    "top_pick",
                    "signal_distribution"
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
                    "ranked_assets": {
                      "type": "string"
                    },
                    "top_pick": {
                      "type": "string"
                    },
                    "signal_distribution": {
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
                  "assets",
                  "strategy_type"
                ],
                "properties": {
                  "assets": {
                    "type": "string"
                  },
                  "strategy_type": {
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
