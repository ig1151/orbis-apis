import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Tokenomics API",
    "version": "1.0.0",
    "description": "Analyses token supply, emission schedules, vesting, and economic model health for any crypto project.",
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
      "url": "https://orbis-apis.onrender.com/tokenomics"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Tokenomics API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Tokenomics API"
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
          "Tokenomics API"
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
    "/analyze/:symbol": {
      "get": {
        "summary": "Analyse tokenomics for a token",
        "operationId": "get_analyze_symbol",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Tokenomics API"
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
                    "symbol",
                    "circulating_supply",
                    "max_supply"
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
                    "symbol": {
                      "type": "string"
                    },
                    "circulating_supply": {
                      "type": "string"
                    },
                    "max_supply": {
                      "type": "string"
                    },
                    "inflation_rate": {
                      "type": "string"
                    },
                    "vesting_overhang_pct": {
                      "type": "string"
                    },
                    "score": {
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
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/simulate": {
      "post": {
        "summary": "Simulate token emission over time",
        "operationId": "post_simulate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Tokenomics API"
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
                    "emission_curve",
                    "sell_pressure_index",
                    "price_impact_estimate"
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
                    "emission_curve": {
                      "type": "string"
                    },
                    "sell_pressure_index": {
                      "type": "string"
                    },
                    "price_impact_estimate": {
                      "type": "string"
                    },
                    "dilution_pct": {
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
                  "symbol",
                  "duration_months"
                ],
                "properties": {
                  "symbol": {
                    "type": "string"
                  },
                  "duration_months": {
                    "type": "string"
                  },
                  "unlock_schedule": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/compare": {
      "post": {
        "summary": "Compare tokenomics of multiple tokens",
        "operationId": "post_compare",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Tokenomics API"
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
                    "comparison",
                    "best_score",
                    "worst_score"
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
                    "comparison": {
                      "type": "string"
                    },
                    "best_score": {
                      "type": "string"
                    },
                    "worst_score": {
                      "type": "string"
                    },
                    "ranking": {
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
                  "symbols"
                ],
                "properties": {
                  "symbols": {
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
