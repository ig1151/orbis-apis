import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Market Correlation API",
    "version": "1.0.0",
    "description": "Calculates statistical correlations between crypto assets and macro indicators.",
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
      "url": "https://orbis-apis.onrender.com/market-correlation"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Market Correlation API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Market Correlation API"
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
          "Market Correlation API"
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
    "/analyze": {
      "post": {
        "summary": "Compute pairwise correlations",
        "operationId": "post_analyze",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Market Correlation API"
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
                    "correlation_matrix",
                    "dominant_pair",
                    "regime"
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
                    "correlation_matrix": {
                      "type": "string"
                    },
                    "dominant_pair": {
                      "type": "string"
                    },
                    "regime": {
                      "type": "string"
                    },
                    "signal_reliability": {
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
                  "window_days"
                ],
                "properties": {
                  "assets": {
                    "type": "string"
                  },
                  "window_days": {
                    "type": "string"
                  },
                  "interval": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/heatmap/:base": {
      "get": {
        "summary": "Correlation heatmap for base asset",
        "operationId": "get_heatmap_base",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Market Correlation API"
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
                    "heatmap",
                    "base",
                    "computed_at"
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
                    "heatmap": {
                      "type": "string"
                    },
                    "base": {
                      "type": "string"
                    },
                    "computed_at": {
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
            "name": "base",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/shift-detect": {
      "post": {
        "summary": "Detect correlation regime shifts",
        "operationId": "post_shift-detect",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Market Correlation API"
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
                    "shift_detected",
                    "shift_date",
                    "before_corr"
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
                    "shift_detected": {
                      "type": "string"
                    },
                    "shift_date": {
                      "type": "string"
                    },
                    "before_corr": {
                      "type": "string"
                    },
                    "after_corr": {
                      "type": "string"
                    },
                    "confidence": {
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
                  "asset_a",
                  "asset_b"
                ],
                "properties": {
                  "asset_a": {
                    "type": "string"
                  },
                  "asset_b": {
                    "type": "string"
                  },
                  "lookback_days": {
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
