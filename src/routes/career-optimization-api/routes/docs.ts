import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Agent Career Optimization Application Intelligence API",
    "version": "1.0.0",
    "description": "Scores resumes, optimizes applications, and generates personalized career strategy recommendations.",
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
      "url": "https://orbis-apis.onrender.com/career-optimization"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Agent Career Optimization Application Intelligence API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Agent Career Optimization Application Intelligence API"
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
          "Agent Career Optimization Application Intelligence API"
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
    "/score-resume": {
      "post": {
        "summary": "Score a resume against a job description",
        "operationId": "post_score-resume",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Career Optimization Application Intelligence API"
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
                    "gap_analysis",
                    "recommended_edits"
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
                    "gap_analysis": {
                      "type": "string"
                    },
                    "recommended_edits": {
                      "type": "string"
                    },
                    "keyword_matches": {
                      "type": "string"
                    },
                    "ats_compatibility": {
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
                  "resume_text",
                  "job_description"
                ],
                "properties": {
                  "resume_text": {
                    "type": "string"
                  },
                  "job_description": {
                    "type": "string"
                  },
                  "role_level": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/optimize": {
      "post": {
        "summary": "Rewrite resume section for a role",
        "operationId": "post_optimize",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Career Optimization Application Intelligence API"
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
                    "optimized_content",
                    "changes_made",
                    "score_delta"
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
                    "optimized_content": {
                      "type": "string"
                    },
                    "changes_made": {
                      "type": "string"
                    },
                    "score_delta": {
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
                  "section",
                  "content"
                ],
                "properties": {
                  "section": {
                    "type": "string"
                  },
                  "content": {
                    "type": "string"
                  },
                  "target_role": {
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
    "/strategy": {
      "post": {
        "summary": "Generate a personalized job search strategy",
        "operationId": "post_strategy",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Agent Career Optimization Application Intelligence API"
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
                    "strategy",
                    "priority_actions",
                    "target_companies"
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
                    "strategy": {
                      "type": "string"
                    },
                    "priority_actions": {
                      "type": "string"
                    },
                    "target_companies": {
                      "type": "string"
                    },
                    "estimated_success_rate": {
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
                  "current_role",
                  "target_role"
                ],
                "properties": {
                  "current_role": {
                    "type": "string"
                  },
                  "target_role": {
                    "type": "string"
                  },
                  "skills": {
                    "type": "string"
                  },
                  "timeline_weeks": {
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
