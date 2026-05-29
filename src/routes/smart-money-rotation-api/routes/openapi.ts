import { Router, Request, Response } from 'express';
const router = Router();

// Smart Money Rotation API — generated A+ OpenAPI 3.1 spec.
const SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Smart Money Rotation API",
    "version": "1.0.0",
    "description": "Tracks smart-money rotation across sectors and narratives — inflow/outflow by sector, narrative rotation score, top accumulated tokens, smart-wallet participation, and rotation stage. For agents front-running capital rotation.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-latency-tier": "standard",
    "x-pricing": {
      "free_tier": {
        "requests_per_day": 100,
        "requests_per_month": 3000
      },
      "pay_per_call": {
        "sectors": "$0.006",
        "narratives": "$0.008",
        "lookup": "$0.018"
      }
    },
    "x-financial-disclaimer": "For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.",
    "x-paper-mode-recommended": true
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/smart-money-rotation"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "smartMoneyRotationDiscovery",
        "summary": "API discovery — endpoints, pricing, and capabilities",
        "security": [],
        "responses": {
          "200": {
            "description": "Discovery info",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "openapi_url": {
                      "type": "string"
                    },
                    "x-agent-callable": {
                      "type": "boolean"
                    },
                    "endpoints": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "method": {
                            "type": "string"
                          },
                          "path": {
                            "type": "string"
                          },
                          "description": {
                            "type": "string"
                          },
                          "price": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "pricing": {
                      "type": "object",
                      "properties": {
                        "sectors": {
                          "type": "string"
                        },
                        "narratives": {
                          "type": "string"
                        },
                        "lookup": {
                          "type": "string"
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/sectors": {
      "post": {
        "operationId": "rotationSectors",
        "summary": "Inflow/outflow by sector with net rotation",
        "x-pricing": {
          "price": "$0.006",
          "model": "per_call",
          "currency": "USDC"
        },
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "24h",
                      "7d",
                      "30d"
                    ]
                  },
                  "chains": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Inflow/outflow by sector with net rotation",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "trace_id": {
                      "type": "string"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "inflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "inflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "outflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "outflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "net_rotation": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "net_flow_usd": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "inflow_by_sector": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "net_rotation": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    },
                    "privacy": {
                      "type": "object",
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    },
                    "paper_mode_recommended": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/narratives": {
      "post": {
        "operationId": "rotationNarratives",
        "summary": "Narrative rotation score, momentum per narrative, and rotation stage",
        "x-pricing": {
          "price": "$0.008",
          "model": "per_call",
          "currency": "USDC"
        },
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "24h",
                      "7d",
                      "30d"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Narrative rotation score, momentum per narrative, and rotation stage",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "trace_id": {
                      "type": "string"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "narrative_rotation_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "narratives": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "narrative": {
                            "type": "string"
                          },
                          "momentum": {
                            "type": "string",
                            "enum": [
                              "rising",
                              "peaking",
                              "fading"
                            ]
                          },
                          "inflow_usd": {
                            "type": "number"
                          },
                          "smart_wallet_count": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "rotation_stage": {
                      "type": "string",
                      "enum": [
                        "early",
                        "mid",
                        "late",
                        "exhausted"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "narrative_rotation_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "rotation_stage": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    },
                    "privacy": {
                      "type": "object",
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    },
                    "paper_mode_recommended": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "rotationLookup",
        "summary": "ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage",
        "x-pricing": {
          "price": "$0.018",
          "model": "per_call",
          "currency": "USDC"
        },
        "x-one-call": true,
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "timeframe": {
                    "type": "string",
                    "enum": [
                      "24h",
                      "7d",
                      "30d"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "trace_id": {
                      "type": "string"
                    },
                    "computed_at": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "success": {
                      "type": "boolean"
                    },
                    "inflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "inflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "outflow_by_sector": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "sector": {
                            "type": "string"
                          },
                          "outflow_usd": {
                            "type": "number"
                          },
                          "change_pct": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "narrative_rotation_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "top_accumulated_tokens": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "symbol": {
                            "type": "string"
                          },
                          "net_accumulation_usd": {
                            "type": "number"
                          },
                          "smart_wallet_count": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "smart_wallet_participation": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "rotation_stage": {
                      "type": "string",
                      "enum": [
                        "early",
                        "mid",
                        "late",
                        "exhausted"
                      ]
                    },
                    "confidence_per_section": {
                      "type": "object",
                      "properties": {
                        "narrative_rotation_score": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "rotation_stage": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        },
                        "smart_wallet_participation": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 1
                        }
                      }
                    },
                    "recommended_actions_priority_order": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "reasoning": {
                      "type": "object",
                      "properties": {
                        "why_signal_generated": {
                          "type": "string"
                        },
                        "key_factors": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "invalidators": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "chain_to": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "api": {
                            "type": "string"
                          },
                          "reason": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "financial_disclaimer": {
                      "type": "string"
                    },
                    "privacy": {
                      "type": "object",
                      "properties": {
                        "data_stored": {
                          "type": "boolean"
                        },
                        "retention": {
                          "type": "string"
                        }
                      }
                    },
                    "paper_mode_recommended": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "trace_id": {
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
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  }
};

router.get('/', (_req: Request, res: Response) => { res.json(SPEC); });

export default router;
