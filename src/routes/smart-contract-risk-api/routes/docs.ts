import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Agent Smart Contract Risk Due Diligence API",
    "version": "1.0.0",
    "description": "Performs automated due diligence on smart contracts including audit history and vulnerability patterns.",
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
      "url": "https://orbis-apis.onrender.com/smart-contract-risk"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Agent Smart Contract Risk Due Diligence API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Agent Smart Contract Risk Due Diligence API"
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
          "Agent Smart Contract Risk Due Diligence API"
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
        "summary": "Analyze a smart contract for risk",
        "operationId": "post_analyze",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Smart Contract Risk Due Diligence API"
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
                    "risk_score",
                    "risk_level",
                    "vulnerability_flags"
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
                    "risk_score": {
                      "type": "string"
                    },
                    "risk_level": {
                      "type": "string"
                    },
                    "vulnerability_flags": {
                      "type": "string"
                    },
                    "audit_history": {
                      "type": "string"
                    },
                    "ownership_risk": {
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
                  "contract_address",
                  "chain"
                ],
                "properties": {
                  "contract_address": {
                    "type": "string"
                  },
                  "chain": {
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
        "summary": "Compare two contracts for risk delta",
        "operationId": "post_compare",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Smart Contract Risk Due Diligence API"
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
                    "delta_score",
                    "riskier_contract",
                    "differentiating_factors"
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
                    "delta_score": {
                      "type": "string"
                    },
                    "riskier_contract": {
                      "type": "string"
                    },
                    "differentiating_factors": {
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
                  "contract_a",
                  "contract_b"
                ],
                "properties": {
                  "contract_a": {
                    "type": "string"
                  },
                  "contract_b": {
                    "type": "string"
                  },
                  "chain": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/report/:address": {
      "get": {
        "summary": "Get cached risk report for a contract",
        "operationId": "get_report_address",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Smart Contract Risk Due Diligence API"
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
                    "address",
                    "report",
                    "generated_at"
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
                    "address": {
                      "type": "string"
                    },
                    "report": {
                      "type": "string"
                    },
                    "generated_at": {
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
        "parameters": [
          {
            "name": "address",
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
