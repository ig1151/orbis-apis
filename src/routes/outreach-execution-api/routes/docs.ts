import { Router, Request, Response } from 'express';

const router = Router();
const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Outreach Execution API",
    "version": "1.0.0",
    "description": "Generates, sequences, and tracks personalized outreach campaigns for agent-driven sales workflows.",
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
      "url": "https://orbis-apis.onrender.com/outreach-execution"
    }
  ],
  "paths": {
    "/discovery": {
      "get": {
        "summary": "Discover Outreach Execution API capabilities",
        "operationId": "discovery",
        "x-agent-callable": true,
        "tags": [
          "Outreach Execution API"
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
          "Outreach Execution API"
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
        "summary": "Generate a personalized outreach message",
        "operationId": "post_generate",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Outreach Execution API"
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
                    "subject",
                    "body",
                    "personalization_score"
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
                    "subject": {
                      "type": "string"
                    },
                    "body": {
                      "type": "string"
                    },
                    "personalization_score": {
                      "type": "string"
                    },
                    "recommended_send_time": {
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
                  "recipient_name",
                  "recipient_role"
                ],
                "properties": {
                  "recipient_name": {
                    "type": "string"
                  },
                  "recipient_role": {
                    "type": "string"
                  },
                  "company": {
                    "type": "string"
                  },
                  "context": {
                    "type": "string"
                  },
                  "channel": {
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
    "/sequence": {
      "post": {
        "summary": "Create a multi-step outreach sequence",
        "operationId": "post_sequence",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Outreach Execution API"
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
                    "sequence_id",
                    "steps",
                    "estimated_reply_rate"
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
                    "sequence_id": {
                      "type": "string"
                    },
                    "steps": {
                      "type": "string"
                    },
                    "estimated_reply_rate": {
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
                  "recipients",
                  "template_id"
                ],
                "properties": {
                  "recipients": {
                    "type": "string"
                  },
                  "template_id": {
                    "type": "string"
                  },
                  "steps": {
                    "type": "string"
                  },
                  "spacing_days": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/sequence/:id/stats": {
      "get": {
        "summary": "Get outreach sequence performance stats",
        "operationId": "get_sequence_id_stats",
        "x-agent-callable": true,
        "x-mcp-compatible": true,
        "tags": [
          "Outreach Execution API"
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
                    "sequence_id",
                    "sent",
                    "opened"
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
                    "sequence_id": {
                      "type": "string"
                    },
                    "sent": {
                      "type": "string"
                    },
                    "opened": {
                      "type": "string"
                    },
                    "replied": {
                      "type": "string"
                    },
                    "bounced": {
                      "type": "string"
                    },
                    "reply_rate": {
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
