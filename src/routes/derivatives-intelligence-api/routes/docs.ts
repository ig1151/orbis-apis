import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Derivatives Intelligence API",
    "version": "1.0.0",
    "description": "Derives trading signals and risk insights from derivatives market structure and positioning data.",
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
      "url": "https://orbis-apis.onrender.com/derivatives-intelligence"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Derivatives Intelligence API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Derivatives Intelligence API"
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
          "Derivatives Intelligence API"
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
    "/signal": {
      "post": {
        "summary": "Generate signal from derivatives data",
        "operationId": "post_signal",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Derivatives Intelligence API"
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
                    "basis_for_signal": {
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
                  "signal_types"
                ],
                "properties": {
                  "symbol": {
                    "type": "string"
                  },
                  "signal_types": {
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
    "/positioning/:symbol": {
      "get": {
        "summary": "Get market positioning analysis",
        "operationId": "get_positioning_symbol",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Derivatives Intelligence API"
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
                    "long_short_ratio",
                    "whale_bias"
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
                    "long_short_ratio": {
                      "type": "string"
                    },
                    "whale_bias": {
                      "type": "string"
                    },
                    "retail_bias": {
                      "type": "string"
                    },
                    "net_positioning": {
                      "type": "string"
                    },
                    "regime": {
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
    "/risk-surface": {
      "post": {
        "summary": "Compute risk surface from options data",
        "operationId": "post_risk-surface",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Derivatives Intelligence API"
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
                    "risk_surface",
                    "max_pain",
                    "gamma_exposure"
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
                    "risk_surface": {
                      "type": "string"
                    },
                    "max_pain": {
                      "type": "string"
                    },
                    "gamma_exposure": {
                      "type": "string"
                    },
                    "put_call_ratio": {
                      "type": "string"
                    },
                    "tail_risk_score": {
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
                  "expiry"
                ],
                "properties": {
                  "symbol": {
                    "type": "string"
                  },
                  "expiry": {
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
