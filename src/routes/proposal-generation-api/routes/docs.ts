import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Proposal Generation API",
    "version": "1.0.0",
    "description": "Generates structured business proposals, RFP responses, and SOW documents from briefs.",
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
      "url": "https://orbis-apis.onrender.com/proposal-generation"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Proposal Generation API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Proposal Generation API"
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
          "Proposal Generation API"
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
        "summary": "Generate a full proposal document",
        "operationId": "post_generate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Proposal Generation API"
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
                    "proposal",
                    "sections",
                    "word_count"
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
                    "proposal": {
                      "type": "string"
                    },
                    "sections": {
                      "type": "string"
                    },
                    "word_count": {
                      "type": "string"
                    },
                    "readability_score": {
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
                  "brief",
                  "client_name"
                ],
                "properties": {
                  "brief": {
                    "type": "string"
                  },
                  "client_name": {
                    "type": "string"
                  },
                  "scope": {
                    "type": "string"
                  },
                  "budget_usd": {
                    "type": "string"
                  },
                  "timeline_weeks": {
                    "type": "string"
                  },
                  "tone": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/rfp-response": {
      "post": {
        "summary": "Generate an RFP response",
        "operationId": "post_rfp-response",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Proposal Generation API"
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
                    "response",
                    "compliance_matrix",
                    "win_themes"
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
                    "response": {
                      "type": "string"
                    },
                    "compliance_matrix": {
                      "type": "string"
                    },
                    "win_themes": {
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
                  "rfp_text",
                  "company_profile"
                ],
                "properties": {
                  "rfp_text": {
                    "type": "string"
                  },
                  "company_profile": {
                    "type": "string"
                  },
                  "differentiators": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/review": {
      "post": {
        "summary": "Review and score an existing proposal",
        "operationId": "post_review",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Proposal Generation API"
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
                    "score",
                    "strengths",
                    "weaknesses"
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
                    "score": {
                      "type": "string"
                    },
                    "strengths": {
                      "type": "string"
                    },
                    "weaknesses": {
                      "type": "string"
                    },
                    "recommended_edits": {
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
                  "proposal_text",
                  "evaluation_criteria"
                ],
                "properties": {
                  "proposal_text": {
                    "type": "string"
                  },
                  "evaluation_criteria": {
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
