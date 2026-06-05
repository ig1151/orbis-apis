# Restaurant Agent Commerce Suite — Live API Bundle (info + openapi.json)

10 agent-native APIs served by the orbis-apis service. For each API below: the **info/discovery manifest** (returned by `GET https://orbis-apis.onrender.com/<slug>/`) and the full **OpenAPI 3.1 spec** (served at `GET https://orbis-apis.onrender.com/<slug>/openapi.json`).

Please review for: OpenAPI 3.1 correctness, agent-callability, schema typing, execution-gate safety, pricing sanity, discovery completeness, and chaining coherence.

## Table of Contents

- 01. Restaurant Lead Generation API — `/restaurant-lead-generation`
- 02. Restaurant Growth Opportunity API — `/restaurant-growth-opportunity`
- 03. Review Sentiment API — `/review-sentiment`
- 04. Restaurant AI Consultant API — `/restaurant-ai-consultant`
- 05. Local Restaurant Discovery API — `/local-restaurant-discovery`
- 06. Office Lunch Planner API — `/office-lunch-planner`
- 07. Catering Procurement API — `/catering-procurement`
- 08. Multi-Restaurant Ordering API — `/multi-restaurant-ordering`
- 09. Reservation Intelligence API — `/reservation-intelligence`
- 10. Franchise Opportunity API — `/franchise-opportunity`

---

# 01. Restaurant Lead Generation API  (`/restaurant-lead-generation`)

**Base URL:** `https://orbis-apis.onrender.com/restaurant-lead-generation`  ·  **openapi.json:** `https://orbis-apis.onrender.com/restaurant-lead-generation/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/restaurant-lead-generation/`

## 01.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Restaurant Lead Generation API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/find-restaurant-leads",
      "price_usd": 0.5,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/score-leads",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/enrich-lead",
      "price_usd": 0.75,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/generate-outreach-angle",
      "price_usd": 0.15,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/export-leads",
      "price_usd": 0.05,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/contact-lead",
      "price_usd": 0.4,
      "gated": true
    },
    {
      "method": "POST",
      "path": "/run-lead-pipeline",
      "price_usd": 1.0,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /run-lead-pipeline",
  "execution_gates": [
    "POST /contact-lead"
  ],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "contact_data_class": "none",
    "retention_days": 30,
    "compliance": [
      "CAN-SPAM",
      "GDPR_legitimate_interest",
      "CCPA"
    ],
    "data_sources": [
      "public_business_listings"
    ]
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call /run-lead-pipeline to find, score, enrich, and draft outreach in one call.",
      "rationale": "Bundled pipeline is the fastest path from geography+ICP to ready leads.",
      "chain_to_endpoint": "POST /run-lead-pipeline"
    }
  ],
  "chain_to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /analyze-growth-opportunity",
      "reason": "Turn a qualified lead into a quantified revenue-gap pitch."
    }
  ]
}
```

## 01.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Restaurant Lead Generation API",
    "version": "1.0.0",
    "summary": "Find, score, enrich, and prepare outreach to restaurants that need marketing, reviews, SEO, web, delivery, or ops help.",
    "description": "Agent-native lead generation for the restaurant vertical. Given a geography and an ideal-customer profile, the API discovers restaurants exhibiting buying signals (poor reviews, weak web presence, no online ordering, stale menus, low local-SEO visibility), scores them, enriches owner/contact data, and produces a ready-to-use outreach angle and best-offer recommendation. Built for autonomous sales, marketing, and local-business agents that call repeatedly to build and qualify pipeline.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /find-restaurant-leads": 0.5,
      "POST /score-leads": 0.1,
      "POST /enrich-lead": 0.75,
      "POST /generate-outreach-angle": 0.15,
      "POST /export-leads": 0.05,
      "POST /contact-lead": 0.4,
      "POST /run-lead-pipeline": 1.0
    },
    "notes": "Pipeline endpoint bundles find+score+enrich+angle at a discount vs calling each step. /contact-lead is gated and bills only on approved execution."
  },
  "x-privacy": {
    "pii_handling": "minimized",
    "owner_contact_data": "business_contact_only",
    "retention_days": 30,
    "compliance": [
      "CAN-SPAM",
      "GDPR_legitimate_interest",
      "CCPA"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_web_crawl",
      "licensed_firmographic_providers"
    ]
  },
  "x-chain-to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /analyze-growth-opportunity",
      "reason": "Turn a qualified lead into a quantified revenue-gap pitch."
    },
    {
      "api": "Restaurant AI Consultant API",
      "endpoint": "POST /full-consulting-audit",
      "reason": "Produce a deliverable audit to attach to outreach."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Back the \"review pain\" angle with hard sentiment data."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/restaurant-lead-generation",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery",
      "description": "Service metadata and capability discovery."
    },
    {
      "name": "leads",
      "description": "Find, score, and enrich restaurant leads."
    },
    {
      "name": "outreach",
      "description": "Generate angles and (gated) contact leads."
    },
    {
      "name": "workflow",
      "description": "One-call orchestrated pipelines."
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost discovery endpoint. Returns capabilities, endpoint catalog, pricing, auth requirements, execution-gate map, and chaining hints so an agent can plan calls without prior knowledge.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Restaurant Lead Generation API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/find-restaurant-leads",
                      "price_usd": 0.5,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/score-leads",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/enrich-lead",
                      "price_usd": 0.75,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/generate-outreach-angle",
                      "price_usd": 0.15,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/export-leads",
                      "price_usd": 0.05,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/contact-lead",
                      "price_usd": 0.4,
                      "gated": true
                    },
                    {
                      "method": "POST",
                      "path": "/run-lead-pipeline",
                      "price_usd": 1.0,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /run-lead-pipeline",
                  "execution_gates": [
                    "POST /contact-lead"
                  ],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "contact_data_class": "none",
                    "retention_days": 30,
                    "compliance": [
                      "CAN-SPAM",
                      "GDPR_legitimate_interest",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call /run-lead-pipeline to find, score, enrich, and draft outreach in one call.",
                      "rationale": "Bundled pipeline is the fastest path from geography+ICP to ready leads.",
                      "chain_to_endpoint": "POST /run-lead-pipeline"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /analyze-growth-opportunity",
                      "reason": "Turn a qualified lead into a quantified revenue-gap pitch."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/find-restaurant-leads": {
      "post": {
        "operationId": "findRestaurantLeads",
        "tags": [
          "leads"
        ],
        "summary": "Discover restaurants exhibiting buying signals.",
        "description": "Returns restaurants in a target geography/ICP that show pain signals (weak web, poor reviews, no online ordering, low local SEO). Each lead carries a preliminary signal set; call /score-leads to rank.",
        "x-pricing": {
          "price": 0.5
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FindLeadsRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "radius_miles": 10
                },
                "icp": {
                  "cuisine": [
                    "italian",
                    "american"
                  ],
                  "price_level": [
                    2,
                    3
                  ],
                  "min_signals": 2,
                  "exclude_chains": true
                },
                "signals_of_interest": [
                  "poor_reviews",
                  "no_online_ordering",
                  "weak_website",
                  "low_local_seo"
                ],
                "limit": 25
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Discovered leads with preliminary signals.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FindLeadsResponse"
                },
                "example": {
                  "request_id": "req_lg_find_2a6d90f4",
                  "confidence": {
                    "score": 0.71,
                    "level": "medium",
                    "rationale": "Preliminary signals from review and web-crawl sources; firmographic enrichment not yet applied, so scores are indicative only."
                  },
                  "privacy": {
                    "pii_included": false,
                    "contact_data_class": "none",
                    "retention_days": 30,
                    "compliance": [
                      "CAN-SPAM",
                      "GDPR_legitimate_interest",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_web_crawl"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call /score-leads to rank these leads by fit and likelihood to buy.",
                      "rationale": "Discovered leads carry preliminary signals only; scoring orders the pipeline.",
                      "chain_to_endpoint": "POST /score-leads"
                    },
                    {
                      "priority": 2,
                      "action": "Enrich the top-ranked leads with owner contact and firmographics.",
                      "rationale": "Outreach requires verified business-contact data not present at discovery time.",
                      "chain_to_endpoint": "POST /enrich-lead"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /analyze-growth-opportunity",
                      "reason": "Turn a qualified lead into a quantified revenue-gap pitch."
                    }
                  ],
                  "total_found": 3,
                  "leads": [
                    {
                      "lead_id": "lead_8f2",
                      "name": "Trattoria Sole",
                      "address": "412 Guadalupe St, Austin, TX 78701",
                      "cuisine": [
                        "italian"
                      ],
                      "price_level": 3,
                      "signals": [
                        "poor_reviews",
                        "no_online_ordering",
                        "low_local_seo"
                      ],
                      "data_freshness_days": 4,
                      "last_verified_at": "2026-05-31T14:22:00Z",
                      "source_urls": [
                        "https://maps.google.com/place/trattoria-sole-austin",
                        "https://www.yelp.com/biz/trattoria-sole-austin"
                      ]
                    },
                    {
                      "lead_id": "lead_91a",
                      "name": "Lupo Osteria",
                      "address": "1900 S Lamar Blvd, Austin, TX 78704",
                      "cuisine": [
                        "italian"
                      ],
                      "price_level": 2,
                      "signals": [
                        "weak_website",
                        "no_online_ordering",
                        "stale_menu"
                      ],
                      "data_freshness_days": 6,
                      "last_verified_at": "2026-05-29T09:10:00Z",
                      "source_urls": [
                        "https://maps.google.com/place/lupo-osteria-austin"
                      ]
                    },
                    {
                      "lead_id": "lead_a37",
                      "name": "Brick & Vine Tavern",
                      "address": "701 W 6th St, Austin, TX 78701",
                      "cuisine": [
                        "american"
                      ],
                      "price_level": 3,
                      "signals": [
                        "declining_review_velocity",
                        "no_social_presence",
                        "low_local_seo"
                      ],
                      "data_freshness_days": 9,
                      "last_verified_at": "2026-05-26T17:45:00Z",
                      "source_urls": [
                        "https://maps.google.com/place/brick-and-vine-austin"
                      ]
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "429": {
            "$ref": "#/components/responses/RateLimited"
          }
        }
      }
    },
    "/score-leads": {
      "post": {
        "operationId": "scoreLeads",
        "tags": [
          "leads"
        ],
        "summary": "Score and rank leads by fit and likelihood to buy.",
        "description": "Accepts leads (from /find-restaurant-leads or caller-supplied) and returns lead_score, pain_points, estimated_budget, and best_offer_type.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ScoreLeadsRequest"
              },
              "example": {
                "leads": [
                  {
                    "lead_id": "lead_8f2",
                    "name": "Trattoria Sole",
                    "signals": [
                      "poor_reviews",
                      "no_online_ordering"
                    ]
                  }
                ],
                "offer_catalog": [
                  "review_management",
                  "online_ordering",
                  "local_seo",
                  "website_rebuild"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Scored and ranked leads.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScoreLeadsResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/enrich-lead": {
      "post": {
        "operationId": "enrichLead",
        "tags": [
          "leads"
        ],
        "summary": "Enrich a single lead with firmographics and contact confidence.",
        "description": "Adds owner/decision-maker contact data (business-contact only), firmographics, tech stack, and owner_contact_confidence to one lead.",
        "x-pricing": {
          "price": 0.75
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EnrichLeadRequest"
              },
              "example": {
                "lead_id": "lead_8f2",
                "name": "Trattoria Sole",
                "location": {
                  "city": "Austin",
                  "state": "TX"
                },
                "want": [
                  "owner_contact",
                  "tech_stack",
                  "firmographics"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Enriched lead record.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EnrichLeadResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/generate-outreach-angle": {
      "post": {
        "operationId": "generateOutreachAngle",
        "tags": [
          "outreach"
        ],
        "summary": "Generate a tailored outreach angle and message draft.",
        "description": "Produces an outreach_angle, channel recommendation, and message draft grounded in the lead's specific pain_points and best_offer_type.",
        "x-pricing": {
          "price": 0.15
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/OutreachAngleRequest"
              },
              "example": {
                "lead_id": "lead_8f2",
                "pain_points": [
                  "poor_reviews",
                  "no_online_ordering"
                ],
                "best_offer_type": "review_management",
                "tone": "consultative",
                "channel": "email"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Outreach angle and drafted message.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OutreachAngleResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/export-leads": {
      "post": {
        "operationId": "exportLeads",
        "tags": [
          "leads"
        ],
        "summary": "Export a lead set to a structured payload or CRM-ready format.",
        "description": "Serializes a lead set into the requested format (json, csv_base64, or crm_payload) for downstream ingestion. No external delivery occurs.",
        "x-pricing": {
          "price": 0.05
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ExportLeadsRequest"
              },
              "example": {
                "lead_ids": [
                  "lead_8f2",
                  "lead_91a"
                ],
                "format": "crm_payload",
                "crm": "hubspot"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Exported lead payload.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ExportLeadsResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/contact-lead": {
      "post": {
        "operationId": "contactLead",
        "tags": [
          "outreach"
        ],
        "summary": "[GATED] Send outreach to a lead. Requires human approval.",
        "description": "Executes outbound contact (email/SMS) to a lead. This is a risky, outward-facing action: it requires an explicit approval token issued by a human. Without an approval_token the call returns 200 with execution_gate.status=pending_approval and performs NO send.",
        "x-pricing": {
          "price": 0.4
        },
        "x-execution-gate": true,
        "x-human-approval-required": true,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ContactLeadRequest"
              },
              "example": {
                "lead_id": "lead_8f2",
                "channel": "email",
                "to": "owner@trattoriasole.example",
                "subject": "Quick idea to lift your Google rating",
                "body": "Hi — noticed your last 20 reviews mention slow service...",
                "approval_token": null
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Either a pending-approval gate (no send performed) or a confirmed send (when a valid approval_token is supplied).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ContactLeadResponse"
                },
                "example": {
                  "request_id": "req_lg_contact_4471be2d",
                  "confidence": {
                    "score": 0.9,
                    "level": "high",
                    "rationale": "Recipient address verified against firmographic source; gate logic deterministic."
                  },
                  "privacy": {
                    "pii_included": true,
                    "contact_data_class": "business_contact_only",
                    "retention_days": 30,
                    "compliance": [
                      "CAN-SPAM",
                      "GDPR_legitimate_interest",
                      "CCPA"
                    ],
                    "data_sources": [
                      "licensed_firmographic_providers",
                      "public_business_listings"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Obtain a human approval_token and re-call /contact-lead to authorize the send.",
                      "rationale": "This outbound contact is an irreversible, outward-facing action and is gated pending approval.",
                      "chain_to_endpoint": "POST /contact-lead"
                    },
                    {
                      "priority": 2,
                      "action": "Review the message preview for CAN-SPAM compliance before approving.",
                      "rationale": "Email sends require an unsubscribe mechanism; confirm it is present before dispatch."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Back the 'review pain' angle with hard sentiment data before sending."
                    }
                  ],
                  "approval_required": true,
                  "execution_gate": {
                    "required": true,
                    "status": "pending_approval",
                    "approval_token_hint": "Submit this draft to a human approver; re-call /contact-lead with the issued approval_token to authorize the send.",
                    "expires_at": "2026-06-05T14:30:00Z",
                    "irreversible": true
                  },
                  "dispatched": false,
                  "message_id": null,
                  "compliance": {
                    "consent_basis": "legitimate_interest",
                    "suppression_checked": true,
                    "unsubscribe_required": true,
                    "contact_policy": "Max 3 touches per 30 days; quiet hours 9pm-8am local; email only, no SMS without prior opt-in."
                  },
                  "preview": {
                    "to": "owner@trattoriasole.example",
                    "channel": "email",
                    "subject": "Quick idea to lift your Google rating",
                    "body": "Hi — noticed your last 20 reviews mention slow service at peak hours. We help Austin restaurants respond to reviews and recover their Google rating within about 60 days. Worth a 10-minute call? Reply STOP or use the unsubscribe link to opt out."
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "403": {
            "description": "Approval token invalid, expired, or revoked.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/run-lead-pipeline": {
      "post": {
        "operationId": "runLeadPipeline",
        "tags": [
          "workflow"
        ],
        "summary": "One-call workflow — find, score, enrich, and draft outreach.",
        "description": "Orchestrates find-restaurant-leads → score-leads → enrich-lead (top N) → generate-outreach-angle in a single call. Does NOT contact anyone; contacting still requires the gated /contact-lead step.",
        "x-pricing": {
          "price": 1.0
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RunPipelineRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "radius_miles": 10
                },
                "icp": {
                  "cuisine": [
                    "italian"
                  ],
                  "price_level": [
                    2,
                    3
                  ],
                  "exclude_chains": true
                },
                "enrich_top_n": 5,
                "offer_catalog": [
                  "review_management",
                  "online_ordering",
                  "local_seo"
                ],
                "tone": "consultative"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Fully qualified, enriched, outreach-ready lead set.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RunPipelineResponse"
                },
                "example": {
                  "request_id": "req_lg_9c3f1a08",
                  "confidence": {
                    "score": 0.84,
                    "level": "high",
                    "rationale": "Signals corroborated across review platform, web crawl, and licensed firmographics for 18 of 22 qualified leads."
                  },
                  "privacy": {
                    "pii_included": true,
                    "contact_data_class": "business_contact_only",
                    "retention_days": 30,
                    "compliance": [
                      "CAN-SPAM",
                      "GDPR_legitimate_interest",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_web_crawl",
                      "licensed_firmographic_providers"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Run /contact-lead for the top 3 qualified leads after human approval of drafted messages.",
                      "rationale": "Highest lead_score and verified business email; gated send requires approval token.",
                      "chain_to_endpoint": "POST /contact-lead"
                    },
                    {
                      "priority": 2,
                      "action": "Quantify the revenue gap for Trattoria Sole before outreach.",
                      "rationale": "A dollar-figure pitch lifts response rate for review-pain angles.",
                      "chain_to_endpoint": "POST /analyze-growth-opportunity"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /analyze-growth-opportunity",
                      "reason": "Turn a qualified lead into a quantified revenue-gap pitch."
                    },
                    {
                      "api": "Restaurant AI Consultant API",
                      "endpoint": "POST /full-consulting-audit",
                      "reason": "Produce a deliverable audit to attach to outreach."
                    }
                  ],
                  "total_found": 22,
                  "qualified_leads": [
                    {
                      "lead_id": "lead_8f2",
                      "name": "Trattoria Sole",
                      "address": "412 Guadalupe St, Austin, TX 78701",
                      "cuisine": [
                        "italian"
                      ],
                      "price_level": 3,
                      "signals": [
                        "poor_reviews",
                        "no_online_ordering",
                        "low_local_seo"
                      ],
                      "lead_score": 87,
                      "pain_points": [
                        "3.6-star average dragged down by service-speed complaints",
                        "No online ordering on website or third-party apps",
                        "Not ranking in local pack for 'italian restaurant austin'"
                      ],
                      "estimated_budget": {
                        "currency": "USD",
                        "monthly_low": 1200,
                        "monthly_high": 2800
                      },
                      "owner_contact_confidence": 0.78,
                      "best_offer_type": "review_management",
                      "outreach_angle": "Your last 20 Google reviews mention slow service — a structured review-response program can lift your rating within 60 days.",
                      "data_freshness_days": 4,
                      "last_verified_at": "2026-05-31T14:22:00Z",
                      "source_urls": [
                        "https://maps.google.com/place/trattoria-sole-austin",
                        "https://www.yelp.com/biz/trattoria-sole-austin"
                      ],
                      "owner_name": "Maria Conti",
                      "owner_role": "Owner / General Manager",
                      "business_email": "maria@trattoriasole.example",
                      "business_phone": "+1-512-555-0142",
                      "website": "https://trattoriasole.example",
                      "email_confidence": 0.81,
                      "phone_confidence": 0.74,
                      "decision_maker_confidence": 0.85,
                      "tech_stack": [
                        "Squarespace",
                        "OpenTable",
                        "Square POS"
                      ],
                      "firmographics": {
                        "est_seats": 64,
                        "est_annual_revenue_usd": 1450000,
                        "years_in_business": 11,
                        "locations": 1
                      },
                      "drafted_subject": "Quick idea to lift your Google rating",
                      "drafted_message": "Hi Maria — I noticed your last 20 reviews keep mentioning slow service at peak hours. We help Austin restaurants like Trattoria Sole respond to reviews and recover their rating within about 60 days. Worth a 10-minute call?"
                    },
                    {
                      "lead_id": "lead_91a",
                      "name": "Lupo Osteria",
                      "address": "1900 S Lamar Blvd, Austin, TX 78704",
                      "cuisine": [
                        "italian"
                      ],
                      "price_level": 2,
                      "signals": [
                        "weak_website",
                        "no_online_ordering",
                        "stale_menu"
                      ],
                      "lead_score": 79,
                      "pain_points": [
                        "Website not mobile-responsive",
                        "Menu PDF last updated 14 months ago",
                        "No direct online ordering"
                      ],
                      "estimated_budget": {
                        "currency": "USD",
                        "monthly_low": 900,
                        "monthly_high": 2100
                      },
                      "owner_contact_confidence": 0.62,
                      "best_offer_type": "online_ordering",
                      "outreach_angle": "Customers can't order from you online — adding direct ordering can recapture 8-12% of delivery-app margin.",
                      "data_freshness_days": 6,
                      "last_verified_at": "2026-05-29T09:10:00Z",
                      "source_urls": [
                        "https://maps.google.com/place/lupo-osteria-austin"
                      ],
                      "owner_name": "David Russo",
                      "owner_role": "Owner",
                      "business_email": "david@lupoosteria.example",
                      "business_phone": "+1-512-555-0188",
                      "website": "https://lupoosteria.example",
                      "email_confidence": 0.68,
                      "phone_confidence": 0.7,
                      "decision_maker_confidence": 0.72,
                      "tech_stack": [
                        "Wix",
                        "Toast POS"
                      ],
                      "firmographics": {
                        "est_seats": 48,
                        "est_annual_revenue_usd": 980000,
                        "years_in_business": 6,
                        "locations": 1
                      },
                      "drafted_subject": "Recapture delivery margin at Lupo Osteria",
                      "drafted_message": "Hi David — right now guests can't order directly from Lupo Osteria online, so every delivery order pays third-party commission. We can stand up commission-free direct ordering on your existing site. Open to a quick look?"
                    }
                  ],
                  "next_step": {
                    "description": "Two leads exceed score 75 with verified business emails. Review the drafted messages, then approve and dispatch via the gated contact endpoint.",
                    "gated_endpoint": "POST /contact-lead"
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "429": {
            "$ref": "#/components/responses/RateLimited"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "NotFound": {
        "description": "Referenced resource not found.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "RateLimited": {
        "description": "Rate limit exceeded.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Calibrated confidence 0-1."
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "contact_data_class": {
            "type": "string",
            "enum": [
              "business_contact_only",
              "none"
            ],
            "default": "business_contact_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1,
            "description": "1 = do first."
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ExecutionGate": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "required",
          "status"
        ],
        "properties": {
          "required": {
            "type": "boolean"
          },
          "status": {
            "type": "string",
            "enum": [
              "not_required",
              "pending_approval",
              "approved",
              "executed",
              "rejected"
            ]
          },
          "approval_token_hint": {
            "type": "string",
            "description": "How to obtain/supply an approval token."
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "irreversible": {
            "type": "boolean"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (not per nested object).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Location": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "country": {
            "type": "string",
            "default": "US"
          },
          "radius_miles": {
            "type": "number",
            "default": 10
          },
          "lat": {
            "type": "number"
          },
          "lng": {
            "type": "number"
          }
        }
      },
      "ICP": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "price_level": {
            "type": "array",
            "items": {
              "type": "integer",
              "minimum": 1,
              "maximum": 4
            }
          },
          "min_signals": {
            "type": "integer",
            "default": 1
          },
          "exclude_chains": {
            "type": "boolean",
            "default": true
          }
        }
      },
      "LeadBase": {
        "description": "Open base for a restaurant lead so it can be safely extended via allOf (e.g. EnrichedLead). Closed variants compose this and add unevaluatedProperties:false at the wrapper.",
        "type": "object",
        "required": [
          "lead_id",
          "name"
        ],
        "properties": {
          "lead_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "address": {
            "type": "string"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "price_level": {
            "type": "integer",
            "minimum": 1,
            "maximum": 4
          },
          "signals": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "poor_reviews",
                "no_online_ordering",
                "weak_website",
                "low_local_seo",
                "stale_menu",
                "no_reservations",
                "declining_review_velocity",
                "no_social_presence"
              ]
            }
          },
          "lead_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "pain_points": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "estimated_budget": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "currency": {
                "type": "string",
                "default": "USD"
              },
              "monthly_low": {
                "type": "number"
              },
              "monthly_high": {
                "type": "number"
              }
            }
          },
          "owner_contact_confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "best_offer_type": {
            "type": "string",
            "enum": [
              "review_management",
              "online_ordering",
              "local_seo",
              "website_rebuild",
              "social_media",
              "delivery_setup",
              "reputation_repair",
              "full_service"
            ]
          },
          "outreach_angle": {
            "type": "string"
          },
          "data_freshness_days": {
            "type": "integer",
            "description": "Age in days of the freshest underlying source for this lead."
          },
          "last_verified_at": {
            "type": "string",
            "format": "date-time"
          },
          "source_urls": {
            "type": "array",
            "items": {
              "type": "string",
              "format": "uri"
            }
          }
        }
      },
      "Lead": {
        "description": "A discovered/scored restaurant lead. Domain object — no envelope fields inside. Closed standalone via unevaluatedProperties.",
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/LeadBase"
          }
        ]
      },
      "EnrichedFields": {
        "description": "Open fragment of contact/firmographic enrichment fields. Composed via allOf; closed at the consuming wrapper.",
        "type": "object",
        "properties": {
          "owner_name": {
            "type": "string"
          },
          "owner_role": {
            "type": "string"
          },
          "business_email": {
            "type": "string",
            "format": "email"
          },
          "business_phone": {
            "type": "string"
          },
          "website": {
            "type": "string"
          },
          "email_confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "phone_confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "decision_maker_confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Confidence that owner_name is the actual buying decision-maker."
          },
          "tech_stack": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "firmographics": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "est_seats": {
                "type": "integer"
              },
              "est_annual_revenue_usd": {
                "type": "number"
              },
              "years_in_business": {
                "type": "number"
              },
              "locations": {
                "type": "integer"
              }
            }
          }
        }
      },
      "EnrichedLead": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/LeadBase"
          },
          {
            "$ref": "#/components/schemas/EnrichedFields"
          }
        ]
      },
      "FindLeadsRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "icp": {
            "$ref": "#/components/schemas/ICP"
          },
          "signals_of_interest": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "limit": {
            "type": "integer",
            "default": 25,
            "minimum": 1,
            "maximum": 100
          }
        }
      },
      "FindLeadsResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "leads",
              "total_found"
            ],
            "properties": {
              "total_found": {
                "type": "integer"
              },
              "leads": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Lead"
                }
              }
            }
          }
        ]
      },
      "ScoreLeadsRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "leads"
        ],
        "properties": {
          "leads": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Lead"
            }
          },
          "offer_catalog": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "ScoreLeadsResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "ranked_leads"
            ],
            "properties": {
              "ranked_leads": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Lead"
                }
              }
            }
          }
        ]
      },
      "EnrichLeadRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "lead_id",
          "name"
        ],
        "properties": {
          "lead_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "want": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "owner_contact",
                "tech_stack",
                "firmographics"
              ]
            }
          }
        }
      },
      "EnrichLeadResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "lead"
            ],
            "properties": {
              "lead": {
                "$ref": "#/components/schemas/EnrichedLead"
              }
            }
          }
        ]
      },
      "OutreachAngleRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "lead_id",
          "pain_points"
        ],
        "properties": {
          "lead_id": {
            "type": "string"
          },
          "pain_points": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "best_offer_type": {
            "type": "string"
          },
          "tone": {
            "type": "string",
            "enum": [
              "consultative",
              "direct",
              "friendly",
              "data_driven"
            ],
            "default": "consultative"
          },
          "channel": {
            "type": "string",
            "enum": [
              "email",
              "sms",
              "linkedin",
              "call_script"
            ],
            "default": "email"
          }
        }
      },
      "OutreachAngleResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "outreach_angle",
              "message_draft",
              "channel"
            ],
            "properties": {
              "outreach_angle": {
                "type": "string"
              },
              "channel": {
                "type": "string"
              },
              "subject": {
                "type": "string"
              },
              "message_draft": {
                "type": "string"
              },
              "predicted_response_rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              }
            }
          }
        ]
      },
      "ExportLeadsRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "lead_ids",
          "format"
        ],
        "properties": {
          "lead_ids": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "format": {
            "type": "string",
            "enum": [
              "json",
              "csv_base64",
              "crm_payload"
            ]
          },
          "crm": {
            "type": "string",
            "enum": [
              "hubspot",
              "salesforce",
              "pipedrive",
              "generic"
            ]
          }
        }
      },
      "ExportLeadsResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "format",
              "record_count",
              "payload"
            ],
            "properties": {
              "format": {
                "type": "string"
              },
              "record_count": {
                "type": "integer"
              },
              "payload": {
                "description": "Format-dependent payload (object for json/crm_payload, base64 string for csv_base64).",
                "oneOf": [
                  {
                    "type": "object"
                  },
                  {
                    "type": "string"
                  }
                ]
              }
            }
          }
        ]
      },
      "ContactLeadRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "lead_id",
          "channel"
        ],
        "properties": {
          "lead_id": {
            "type": "string"
          },
          "channel": {
            "type": "string",
            "enum": [
              "email",
              "sms"
            ]
          },
          "to": {
            "type": "string"
          },
          "subject": {
            "type": "string"
          },
          "body": {
            "type": "string"
          },
          "consent_basis": {
            "type": "string",
            "enum": [
              "legitimate_interest",
              "prior_relationship",
              "opt_in",
              "explicit_consent"
            ],
            "description": "Lawful basis asserted by the caller for this outbound contact."
          },
          "approval_token": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-issued approval token. Null/omitted ⇒ gate returns pending_approval and no send occurs."
          }
        }
      },
      "ContactLeadResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "execution_gate",
              "approval_required",
              "dispatched",
              "compliance"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean"
              },
              "execution_gate": {
                "$ref": "#/components/schemas/ExecutionGate"
              },
              "dispatched": {
                "type": "boolean",
                "description": "True only when a valid approval_token was supplied and send executed."
              },
              "message_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "compliance": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "suppression_checked",
                  "unsubscribe_required"
                ],
                "properties": {
                  "consent_basis": {
                    "type": "string",
                    "enum": [
                      "legitimate_interest",
                      "prior_relationship",
                      "opt_in",
                      "explicit_consent"
                    ]
                  },
                  "suppression_checked": {
                    "type": "boolean",
                    "description": "Whether the recipient was checked against suppression/do-not-contact lists."
                  },
                  "unsubscribe_required": {
                    "type": "boolean",
                    "description": "Whether an unsubscribe mechanism must be included (true for email under CAN-SPAM)."
                  },
                  "contact_policy": {
                    "type": "string",
                    "description": "Human-readable policy applied (e.g. max touches",
                    "quiet hours": null,
                    "channel rules).": null
                  }
                }
              },
              "preview": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "to": {
                    "type": "string"
                  },
                  "channel": {
                    "type": "string"
                  },
                  "subject": {
                    "type": "string"
                  },
                  "body": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ]
      },
      "RunPipelineRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "icp": {
            "$ref": "#/components/schemas/ICP"
          },
          "enrich_top_n": {
            "type": "integer",
            "default": 5,
            "minimum": 0,
            "maximum": 25
          },
          "offer_catalog": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "tone": {
            "type": "string",
            "enum": [
              "consultative",
              "direct",
              "friendly",
              "data_driven"
            ],
            "default": "consultative"
          }
        }
      },
      "RunPipelineResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "total_found",
              "qualified_leads"
            ],
            "properties": {
              "total_found": {
                "type": "integer"
              },
              "qualified_leads": {
                "type": "array",
                "description": "Scored + (top-N) enriched leads, each with an outreach_angle attached.",
                "items": {
                  "unevaluatedProperties": false,
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/LeadBase"
                    },
                    {
                      "$ref": "#/components/schemas/EnrichedFields"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "drafted_subject": {
                          "type": "string"
                        },
                        "drafted_message": {
                          "type": "string"
                        }
                      }
                    }
                  ]
                }
              },
              "next_step": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "gated_endpoint": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 02. Restaurant Growth Opportunity API  (`/restaurant-growth-opportunity`)

**Base URL:** `https://orbis-apis.onrender.com/restaurant-growth-opportunity`  ·  **openapi.json:** `https://orbis-apis.onrender.com/restaurant-growth-opportunity/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/restaurant-growth-opportunity/`

## 02.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Restaurant Growth Opportunity API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/analyze-growth-opportunity",
      "price_usd": 0.5,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/audit-online-presence",
      "price_usd": 0.15,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/audit-menu-pricing",
      "price_usd": 0.2,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/audit-reviews",
      "price_usd": 0.15,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/generate-growth-plan",
      "price_usd": 1.5,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /generate-growth-plan",
  "execution_gates": [],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
      "CCPA"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_menu_data",
      "public_web_crawl",
      "local_search_serps"
    ],
    "data_subject": "business_entity_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /generate-growth-plan to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Restaurant Lead Generation API",
      "endpoint": "POST /generate-outreach-angle",
      "reason": "Convert quantified gaps into a tailored pitch."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Deepen the review-issues findings with theme-level sentiment."
    },
    {
      "api": "Restaurant AI Consultant API",
      "endpoint": "POST /full-consulting-audit",
      "reason": "Escalate from growth gaps to a full consulting deliverable."
    }
  ]
}
```

## 02.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Restaurant Growth Opportunity API",
    "version": "1.0.0",
    "summary": "Analyze a restaurant and return specific, quantified revenue-growth opportunities with a prioritized action plan.",
    "description": "Agent-native growth diagnostics for a single restaurant. Given a restaurant identity (name + location or place_id), the API audits online presence, menu pricing, and reviews, then returns a growth_score, a missed_revenue_estimate, ranked top_opportunities, competitive_gaps, and a prioritized action plan. Built for marketing-agency, sales, and operator agents that repeatedly diagnose accounts to build pitches and roadmaps.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /analyze-growth-opportunity": 0.5,
      "POST /audit-online-presence": 0.15,
      "POST /audit-menu-pricing": 0.2,
      "POST /audit-reviews": 0.15,
      "POST /generate-growth-plan": 1.5
    },
    "notes": "generate-growth-plan is the one-call workflow: it runs all three audits plus analysis and returns a deliverable plan at a discount vs separate calls."
  },
  "x-privacy": {
    "pii_handling": "none",
    "data_subject": "business_entity_only",
    "retention_days": 30,
    "compliance": [
      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
      "CCPA"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_menu_data",
      "public_web_crawl",
      "local_search_serps"
    ]
  },
  "x-chain-to": [
    {
      "api": "Restaurant Lead Generation API",
      "endpoint": "POST /generate-outreach-angle",
      "reason": "Convert quantified gaps into a tailored pitch."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Deepen the review-issues findings with theme-level sentiment."
    },
    {
      "api": "Restaurant AI Consultant API",
      "endpoint": "POST /full-consulting-audit",
      "reason": "Escalate from growth gaps to a full consulting deliverable."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/restaurant-growth-opportunity",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "analysis"
    },
    {
      "name": "audit"
    },
    {
      "name": "workflow"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest including endpoints, pricing, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Restaurant Growth Opportunity API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/analyze-growth-opportunity",
                      "price_usd": 0.5,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/audit-online-presence",
                      "price_usd": 0.15,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/audit-menu-pricing",
                      "price_usd": 0.2,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/audit-reviews",
                      "price_usd": 0.15,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/generate-growth-plan",
                      "price_usd": 1.5,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /generate-growth-plan",
                  "execution_gates": [],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "public_web_crawl",
                      "local_search_serps"
                    ],
                    "data_subject": "business_entity_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /generate-growth-plan to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Convert quantified gaps into a tailored pitch."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Deepen the review-issues findings with theme-level sentiment."
                    },
                    {
                      "api": "Restaurant AI Consultant API",
                      "endpoint": "POST /full-consulting-audit",
                      "reason": "Escalate from growth gaps to a full consulting deliverable."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/analyze-growth-opportunity": {
      "post": {
        "operationId": "analyzeGrowthOpportunity",
        "tags": [
          "analysis"
        ],
        "summary": "Full growth analysis with score, missed revenue, and ranked opportunities.",
        "description": "Returns growth_score, missed_revenue_estimate, top_opportunities, competitive_gaps, local_seo_issues, review_issues, and menu_pricing_issues for one restaurant.",
        "x-pricing": {
          "price": 0.5
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalyzeRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "competitors_radius_miles": 3,
                "include": [
                  "online_presence",
                  "menu_pricing",
                  "reviews"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Quantified growth analysis.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GrowthAnalysisResponse"
                },
                "example": {
                  "request_id": "req_ga_2c7b94e1f0a8",
                  "source_freshness": {
                    "data_freshness_days": 1,
                    "last_verified_at": "2026-06-03T09:15:00Z",
                    "source_urls": [
                      "https://www.google.com/maps/place/trattoria-sole-austin",
                      "https://www.yelp.com/biz/trattoria-sole-austin"
                    ]
                  },
                  "confidence": {
                    "score": 0.78,
                    "level": "high",
                    "rationale": "Online presence and review data verified within 24 hours; menu pricing inferred from a partial menu crawl, lowering certainty on the pricing component."
                  },
                  "privacy": {
                    "pii_included": false,
                    "data_subject": "business_entity_only",
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "local_search_serps"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Complete the Google Business Profile and add weekly photo posts",
                      "rationale": "Missing hours and zero recent photos are limiting local pack impressions.",
                      "estimated_revenue_impact_usd": 2400,
                      "chain_to_endpoint": "POST /audit-online-presence"
                    },
                    {
                      "priority": 2,
                      "action": "Increase review response rate and request reviews from recent guests",
                      "rationale": "Low response rate and a flat rating trend cap conversion from listing views.",
                      "estimated_revenue_impact_usd": 1800,
                      "chain_to_endpoint": "POST /audit-reviews"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Convert quantified gaps into a tailored pitch."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Deepen the review-issues findings with theme-level sentiment."
                    }
                  ],
                  "growth_score": 61,
                  "missed_revenue_estimate": {
                    "monthly_usd": 6800,
                    "annual_usd": 81600,
                    "method": "Modeled from local search demand, current listing conversion rate, average ticket of $42, and a benchmarked uplift versus the top-quartile local competitor."
                  },
                  "top_opportunities": [
                    {
                      "opportunity": "Capture local pack visibility by completing and optimizing Google Business Profile",
                      "category": "online_presence",
                      "estimated_revenue_impact_usd": 2400,
                      "effort": "low",
                      "time_to_impact_days": 14
                    },
                    {
                      "opportunity": "Lift average rating from 4.1 to 4.4 through review solicitation and response",
                      "category": "reviews",
                      "estimated_revenue_impact_usd": 1800,
                      "effort": "medium",
                      "time_to_impact_days": 30
                    },
                    {
                      "opportunity": "Reprice underpriced signature dishes toward local market band",
                      "category": "menu_pricing",
                      "estimated_revenue_impact_usd": 1500,
                      "effort": "medium",
                      "time_to_impact_days": 21
                    }
                  ],
                  "competitive_gaps": [
                    {
                      "gap": "No online ordering on owned channel",
                      "competitor_advantage": "Top 3 nearby Italian venues offer first-party online ordering",
                      "you_vs_market": "0 of your channels vs market median of 2"
                    },
                    {
                      "gap": "Sparse and outdated listing photos",
                      "competitor_advantage": "Leading competitor has 120+ recent photos",
                      "you_vs_market": "8 photos vs market median of 65"
                    }
                  ],
                  "local_seo_issues": [
                    {
                      "issue": "Incomplete Google Business Profile",
                      "severity": "high",
                      "detail": "Hours, attributes, and menu link are missing or outdated.",
                      "estimated_revenue_impact_usd": 2400,
                      "fix": "Complete all profile fields and link the live menu."
                    },
                    {
                      "issue": "Inconsistent NAP across directories",
                      "severity": "medium",
                      "detail": "Phone number differs between Yelp and Apple Maps.",
                      "estimated_revenue_impact_usd": 600,
                      "fix": "Standardize name, address, and phone across all major directories."
                    }
                  ],
                  "review_issues": [
                    {
                      "issue": "Low review response rate",
                      "severity": "high",
                      "detail": "Only 12% of reviews receive a response versus a 55% local benchmark.",
                      "estimated_revenue_impact_usd": 1800,
                      "fix": "Respond to all reviews within 48 hours."
                    },
                    {
                      "issue": "Flat review velocity",
                      "severity": "medium",
                      "detail": "Averaging 2 new reviews per month over the trailing quarter.",
                      "estimated_revenue_impact_usd": 700,
                      "fix": "Add a post-visit review request via receipt QR code."
                    }
                  ],
                  "menu_pricing_issues": [
                    {
                      "issue": "Underpriced signature entrees",
                      "severity": "medium",
                      "detail": "Six pasta and appetizer items sit 14-18% below the local market band.",
                      "estimated_revenue_impact_usd": 1500,
                      "fix": "Reprice toward the market median and test elasticity."
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/audit-online-presence": {
      "post": {
        "operationId": "auditOnlinePresence",
        "tags": [
          "audit"
        ],
        "summary": "Audit website, local SEO, listings, and social presence.",
        "description": "Returns local_seo_issues, listing accuracy, website health, and social presence gaps.",
        "x-pricing": {
          "price": 0.15
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RestaurantRefRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Online presence audit.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OnlinePresenceAuditResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/audit-menu-pricing": {
      "post": {
        "operationId": "auditMenuPricing",
        "tags": [
          "audit"
        ],
        "summary": "Audit menu pricing vs local market and elasticity.",
        "description": "Returns menu_pricing_issues, underpriced/overpriced items, and price-optimization upside.",
        "x-pricing": {
          "price": 0.2
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RestaurantRefRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Menu pricing audit.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MenuPricingAuditResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/audit-reviews": {
      "post": {
        "operationId": "auditReviews",
        "tags": [
          "audit"
        ],
        "summary": "Audit review health across platforms.",
        "description": "Returns review_issues, rating trend, response rate, and velocity flags.",
        "x-pricing": {
          "price": 0.15
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RestaurantRefRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Review audit.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ReviewAuditResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/generate-growth-plan": {
      "post": {
        "operationId": "generateGrowthPlan",
        "tags": [
          "workflow"
        ],
        "summary": "One-call workflow — run all audits + analysis and return a prioritized growth plan.",
        "description": "Orchestrates audit-online-presence + audit-menu-pricing + audit-reviews + analyze-growth-opportunity, then synthesizes a phased, prioritized growth plan with revenue impact per initiative.",
        "x-pricing": {
          "price": 1.5
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GrowthPlanRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "competitors_radius_miles": 3,
                "horizon_days": 90
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Prioritized growth plan with quantified impact.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GrowthPlanResponse"
                },
                "example": {
                  "request_id": "req_gp_8f3a21c9d4e7",
                  "source_freshness": {
                    "data_freshness_days": 2,
                    "last_verified_at": "2026-06-02T14:30:00Z",
                    "source_urls": [
                      "https://www.google.com/maps/place/trattoria-sole-austin",
                      "https://www.yelp.com/biz/trattoria-sole-austin",
                      "https://trattoriasole.com"
                    ]
                  },
                  "confidence": {
                    "score": 0.82,
                    "level": "high",
                    "rationale": "Based on verified Google Business Profile, Yelp listing, and live menu crawl; competitor set drawn from 7 Italian restaurants within 3 miles."
                  },
                  "privacy": {
                    "pii_included": false,
                    "data_subject": "business_entity_only",
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "public_web_crawl",
                      "local_search_serps"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Claim and fully complete the Google Business Profile with hours, photos, and menu link",
                      "rationale": "Incomplete profile is suppressing local pack visibility for high-intent 'italian restaurant near me' queries.",
                      "estimated_revenue_impact_usd": 2400,
                      "chain_to_endpoint": "POST /audit-online-presence"
                    },
                    {
                      "priority": 2,
                      "action": "Launch a review-response and solicitation workflow to lift rating from 4.1 to 4.4+",
                      "rationale": "Response rate of 12% trails the local market average of 55%; rating directly correlates with conversion.",
                      "estimated_revenue_impact_usd": 1800,
                      "chain_to_endpoint": "POST /audit-reviews"
                    },
                    {
                      "priority": 3,
                      "action": "Reprice 6 underpriced signature pasta and appetizer items toward market band",
                      "rationale": "Entrees priced 14-18% below comparable local Italian venues with no quality justification.",
                      "estimated_revenue_impact_usd": 1500
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Convert quantified gaps into a tailored pitch."
                    },
                    {
                      "api": "Restaurant AI Consultant API",
                      "endpoint": "POST /full-consulting-audit",
                      "reason": "Escalate from growth gaps to a full consulting deliverable."
                    }
                  ],
                  "growth_score": 58,
                  "missed_revenue_estimate": {
                    "monthly_usd": 7200,
                    "annual_usd": 86400
                  },
                  "plan": [
                    {
                      "phase": "week_1",
                      "initiative": "Claim and optimize Google Business Profile; fix NAP inconsistencies across Yelp, Apple Maps, and TripAdvisor",
                      "category": "online_presence",
                      "effort": "low",
                      "estimated_revenue_impact_usd": 2400
                    },
                    {
                      "phase": "weeks_2_4",
                      "initiative": "Stand up review-response cadence and post-visit review solicitation via QR codes on receipts",
                      "category": "reviews",
                      "effort": "medium",
                      "estimated_revenue_impact_usd": 1800
                    },
                    {
                      "phase": "weeks_5_8",
                      "initiative": "Reprice underpriced menu items and introduce two higher-margin prix-fixe options",
                      "category": "menu_pricing",
                      "effort": "medium",
                      "estimated_revenue_impact_usd": 1500
                    },
                    {
                      "phase": "weeks_9_12",
                      "initiative": "Launch first-party online ordering and weekday lunch delivery promotion",
                      "category": "delivery",
                      "effort": "high",
                      "estimated_revenue_impact_usd": 1500
                    }
                  ],
                  "total_estimated_annual_impact_usd": 86400
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "NotFound": {
        "description": "Restaurant could not be resolved.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "data_subject": {
            "type": "string",
            "enum": [
              "business_entity_only",
              "none"
            ],
            "default": "business_entity_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "estimated_revenue_impact_usd": {
            "type": "number"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "source_freshness": {
            "type": "object",
            "description": "Provenance/recency of the underlying data used in this response.",
            "additionalProperties": false,
            "properties": {
              "data_freshness_days": {
                "type": "integer"
              },
              "last_verified_at": {
                "type": "string",
                "format": "date-time"
              },
              "source_urls": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                }
              }
            }
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "RestaurantRef": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "place_id": {
            "type": "string"
          },
          "address": {
            "type": "string"
          },
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "country": {
            "type": "string",
            "default": "US"
          }
        }
      },
      "RestaurantRefRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          }
        }
      },
      "Issue": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "issue",
          "severity"
        ],
        "properties": {
          "issue": {
            "type": "string"
          },
          "severity": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high",
              "critical"
            ]
          },
          "detail": {
            "type": "string"
          },
          "estimated_revenue_impact_usd": {
            "type": "number"
          },
          "fix": {
            "type": "string"
          }
        }
      },
      "Opportunity": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "opportunity",
          "estimated_revenue_impact_usd"
        ],
        "properties": {
          "opportunity": {
            "type": "string"
          },
          "category": {
            "type": "string",
            "enum": [
              "online_presence",
              "menu_pricing",
              "reviews",
              "delivery",
              "marketing",
              "operations"
            ]
          },
          "estimated_revenue_impact_usd": {
            "type": "number"
          },
          "effort": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ]
          },
          "time_to_impact_days": {
            "type": "integer"
          }
        }
      },
      "CompetitiveGap": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "gap"
        ],
        "properties": {
          "gap": {
            "type": "string"
          },
          "competitor_advantage": {
            "type": "string"
          },
          "you_vs_market": {
            "type": "string"
          }
        }
      },
      "AnalyzeRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "competitors_radius_miles": {
            "type": "number",
            "default": 3
          },
          "include": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "online_presence",
                "menu_pricing",
                "reviews"
              ]
            }
          }
        }
      },
      "GrowthAnalysisResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "growth_score",
              "missed_revenue_estimate",
              "top_opportunities",
              "competitive_gaps",
              "local_seo_issues",
              "review_issues",
              "menu_pricing_issues"
            ],
            "properties": {
              "growth_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "missed_revenue_estimate": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "monthly_usd",
                  "annual_usd"
                ],
                "properties": {
                  "monthly_usd": {
                    "type": "number"
                  },
                  "annual_usd": {
                    "type": "number"
                  },
                  "method": {
                    "type": "string"
                  }
                }
              },
              "top_opportunities": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Opportunity"
                }
              },
              "competitive_gaps": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/CompetitiveGap"
                }
              },
              "local_seo_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Issue"
                }
              },
              "review_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Issue"
                }
              },
              "menu_pricing_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Issue"
                }
              }
            }
          }
        ]
      },
      "OnlinePresenceAuditResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "local_seo_issues",
              "website_health_score",
              "listing_accuracy_score"
            ],
            "properties": {
              "website_health_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "listing_accuracy_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "social_presence_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "local_seo_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Issue"
                }
              }
            }
          }
        ]
      },
      "MenuPricingAuditResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "menu_pricing_issues",
              "price_optimization_upside_usd"
            ],
            "properties": {
              "price_optimization_upside_usd": {
                "type": "number"
              },
              "underpriced_items": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "item": {
                      "type": "string"
                    },
                    "current_price_usd": {
                      "type": "number"
                    },
                    "suggested_price_usd": {
                      "type": "number"
                    }
                  }
                }
              },
              "menu_pricing_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Issue"
                }
              }
            }
          }
        ]
      },
      "ReviewAuditResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "review_issues",
              "average_rating",
              "response_rate"
            ],
            "properties": {
              "average_rating": {
                "type": "number",
                "minimum": 0,
                "maximum": 5
              },
              "review_count": {
                "type": "integer"
              },
              "response_rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "rating_trend": {
                "type": "string",
                "enum": [
                  "rising",
                  "flat",
                  "declining"
                ]
              },
              "review_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Issue"
                }
              }
            }
          }
        ]
      },
      "GrowthPlanRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "competitors_radius_miles": {
            "type": "number",
            "default": 3
          },
          "horizon_days": {
            "type": "integer",
            "default": 90
          }
        }
      },
      "GrowthPlanResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "growth_score",
              "missed_revenue_estimate",
              "plan"
            ],
            "properties": {
              "growth_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "missed_revenue_estimate": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "monthly_usd",
                  "annual_usd"
                ],
                "properties": {
                  "monthly_usd": {
                    "type": "number"
                  },
                  "annual_usd": {
                    "type": "number"
                  }
                }
              },
              "plan": {
                "type": "array",
                "description": "Phased initiatives in execution order.",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "phase",
                    "initiative",
                    "estimated_revenue_impact_usd"
                  ],
                  "properties": {
                    "phase": {
                      "type": "string",
                      "enum": [
                        "week_1",
                        "weeks_2_4",
                        "weeks_5_8",
                        "weeks_9_12"
                      ]
                    },
                    "initiative": {
                      "type": "string"
                    },
                    "category": {
                      "type": "string"
                    },
                    "effort": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "estimated_revenue_impact_usd": {
                      "type": "number"
                    }
                  }
                }
              },
              "total_estimated_annual_impact_usd": {
                "type": "number"
              }
            }
          }
        ]
      }
    }
  }
}
```

# 03. Review Sentiment API  (`/review-sentiment`)

**Base URL:** `https://orbis-apis.onrender.com/review-sentiment`  ·  **openapi.json:** `https://orbis-apis.onrender.com/review-sentiment/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/review-sentiment/`

## 03.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Review Sentiment API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/analyze-review-sentiment",
      "price_usd": 0.3,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/detect-review-themes",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/identify-negative-review-drivers",
      "price_usd": 0.12,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/generate-review-response-plan",
      "price_usd": 0.2,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/monitor-review-risk",
      "price_usd": 0.05,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /analyze-review-sentiment",
  "execution_gates": [],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "platform_tos_compliant",
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "google_reviews_public",
      "yelp_public",
      "tripadvisor_public",
      "doordash_public",
      "ubereats_public"
    ],
    "reviewer_identity": "anonymized"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /analyze-review-sentiment to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /audit-reviews",
      "reason": "Fold review findings into a quantified growth analysis."
    },
    {
      "api": "Restaurant Lead Generation API",
      "endpoint": "POST /generate-outreach-angle",
      "reason": "Use urgent_issues as a high-conviction outreach hook."
    },
    {
      "api": "Restaurant AI Consultant API",
      "endpoint": "POST /full-consulting-audit",
      "reason": "Feed reputation_score into the consulting health score."
    }
  ]
}
```

## 03.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Review Sentiment API",
    "version": "1.0.0",
    "summary": "Analyze restaurant reviews across Google, Yelp, TripAdvisor, DoorDash, and Uber Eats into structured sentiment, themes, risks, and response plans.",
    "description": "Agent-native review intelligence for restaurants. Aggregates reviews across platforms and returns a sentiment_score, review_velocity, complaint and praise themes, urgent_issues, fake_review_risk, recommended_responses, and a reputation_score. Built for reputation, marketing, and operator agents that monitor and act on review health repeatedly.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /analyze-review-sentiment": 0.3,
      "POST /detect-review-themes": 0.1,
      "POST /identify-negative-review-drivers": 0.12,
      "POST /generate-review-response-plan": 0.2,
      "POST /monitor-review-risk": 0.05
    },
    "notes": "analyze-review-sentiment is the one-call workflow returning the full structured report; the others are granular drill-downs and a cheap monitor."
  },
  "x-privacy": {
    "pii_handling": "minimized",
    "reviewer_identity": "anonymized",
    "retention_days": 30,
    "compliance": [
      "platform_tos_compliant",
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "google_reviews_public",
      "yelp_public",
      "tripadvisor_public",
      "doordash_public",
      "ubereats_public"
    ]
  },
  "x-chain-to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /audit-reviews",
      "reason": "Fold review findings into a quantified growth analysis."
    },
    {
      "api": "Restaurant Lead Generation API",
      "endpoint": "POST /generate-outreach-angle",
      "reason": "Use urgent_issues as a high-conviction outreach hook."
    },
    {
      "api": "Restaurant AI Consultant API",
      "endpoint": "POST /full-consulting-audit",
      "reason": "Feed reputation_score into the consulting health score."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/review-sentiment",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "analysis"
    },
    {
      "name": "monitoring"
    },
    {
      "name": "workflow"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Review Sentiment API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/analyze-review-sentiment",
                      "price_usd": 0.3,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/detect-review-themes",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/identify-negative-review-drivers",
                      "price_usd": 0.12,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/generate-review-response-plan",
                      "price_usd": 0.2,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/monitor-review-risk",
                      "price_usd": 0.05,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /analyze-review-sentiment",
                  "execution_gates": [],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "platform_tos_compliant",
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "google_reviews_public",
                      "yelp_public",
                      "tripadvisor_public",
                      "doordash_public",
                      "ubereats_public"
                    ],
                    "reviewer_identity": "anonymized"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /analyze-review-sentiment to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /audit-reviews",
                      "reason": "Fold review findings into a quantified growth analysis."
                    },
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Use urgent_issues as a high-conviction outreach hook."
                    },
                    {
                      "api": "Restaurant AI Consultant API",
                      "endpoint": "POST /full-consulting-audit",
                      "reason": "Feed reputation_score into the consulting health score."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/analyze-review-sentiment": {
      "post": {
        "operationId": "analyzeReviewSentiment",
        "tags": [
          "analysis",
          "workflow"
        ],
        "summary": "One-call workflow — full structured review report.",
        "description": "Returns sentiment_score, review_velocity, complaint_themes, praise_themes, urgent_issues, fake_review_risk, recommended_responses, and reputation_score across all selected platforms in a single call.",
        "x-pricing": {
          "price": 0.3
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalyzeReviewsRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "platforms": [
                  "google",
                  "yelp",
                  "doordash"
                ],
                "lookback_days": 90
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Full review sentiment report.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ReviewReportResponse"
                },
                "example": {
                  "request_id": "req_rev_8f3a2c9d4e1b",
                  "source_freshness": {
                    "data_freshness_days": 2,
                    "last_verified_at": "2026-06-03T18:42:00Z",
                    "source_urls": [
                      "https://www.google.com/maps/place/Trattoria+Sole",
                      "https://www.yelp.com/biz/trattoria-sole-austin",
                      "https://www.doordash.com/store/trattoria-sole-austin"
                    ]
                  },
                  "confidence": {
                    "score": 0.86,
                    "level": "high",
                    "rationale": "412 reviews aggregated across 3 platforms over a 90-day window; sample size and cross-platform agreement support high confidence."
                  },
                  "privacy": {
                    "pii_included": false,
                    "reviewer_identity": "anonymized",
                    "retention_days": 30,
                    "compliance": [
                      "platform_tos_compliant",
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "google_reviews_public",
                      "yelp_public",
                      "doordash_public"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Address recurring long-wait-time complaints during Friday and Saturday dinner service.",
                      "rationale": "Wait-time is the top complaint theme and is rising; it is the single largest drag on the sentiment score.",
                      "chain_to_endpoint": "POST /identify-negative-review-drivers"
                    },
                    {
                      "priority": 2,
                      "action": "Draft and post empathetic responses to the 6 negative reviews from the last 14 days.",
                      "rationale": "Unanswered recent negatives compound reputational damage and signal disengagement to prospective diners.",
                      "chain_to_endpoint": "POST /generate-review-response-plan"
                    },
                    {
                      "priority": 3,
                      "action": "Monitor for a coordinated 1-star burst flagged by the fake-review signals.",
                      "rationale": "A small cluster of low-detail 1-star reviews appeared within a 48-hour window and warrants ongoing watch.",
                      "chain_to_endpoint": "POST /monitor-review-risk"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /audit-reviews",
                      "reason": "Fold review findings into a quantified growth analysis."
                    },
                    {
                      "api": "Restaurant AI Consultant API",
                      "endpoint": "POST /full-consulting-audit",
                      "reason": "Feed reputation_score into the consulting health score."
                    }
                  ],
                  "sentiment_score": 0.42,
                  "reputation_score": 78,
                  "review_velocity": {
                    "per_week": 11.3,
                    "trend": "rising"
                  },
                  "fake_review_risk": {
                    "score": 0.31,
                    "level": "medium",
                    "signals": [
                      "3 one-star reviews posted within a 48-hour window",
                      "low-detail generic phrasing on flagged reviews",
                      "new reviewer accounts with no prior history"
                    ]
                  },
                  "complaint_themes": [
                    {
                      "theme": "Long wait times on weekends",
                      "mentions": 47,
                      "sentiment": "negative",
                      "trend": "rising",
                      "example_quote": "Waited 45 minutes past our reservation time on a Saturday night."
                    },
                    {
                      "theme": "Inconsistent pasta portion sizes",
                      "mentions": 22,
                      "sentiment": "negative",
                      "trend": "flat",
                      "example_quote": "The carbonara was half the size of what we got last visit for the same price."
                    },
                    {
                      "theme": "DoorDash orders arriving cold",
                      "mentions": 18,
                      "sentiment": "negative",
                      "trend": "rising",
                      "example_quote": "Delivery showed up lukewarm and the bread was soggy."
                    }
                  ],
                  "praise_themes": [
                    {
                      "theme": "Authentic handmade pasta",
                      "mentions": 96,
                      "sentiment": "positive",
                      "trend": "flat",
                      "example_quote": "Best fresh pasta I've had outside of Italy, the ravioli is incredible."
                    },
                    {
                      "theme": "Attentive and friendly service",
                      "mentions": 64,
                      "sentiment": "positive",
                      "trend": "rising",
                      "example_quote": "Our server was warm, knowledgeable, and made great wine recommendations."
                    },
                    {
                      "theme": "Cozy romantic atmosphere",
                      "mentions": 41,
                      "sentiment": "positive",
                      "trend": "flat",
                      "example_quote": "Perfect ambiance for a date night, dim lighting and not too loud."
                    }
                  ],
                  "urgent_issues": [
                    {
                      "issue": "Multiple recent reports of undercooked chicken in the pollo dishes",
                      "severity": "critical",
                      "platform": "yelp",
                      "first_seen": "2026-05-29T20:15:00Z",
                      "recommended_action": "Investigate kitchen temperature controls immediately and respond publicly to affected reviewers."
                    },
                    {
                      "issue": "Repeated billing discrepancies cited on weekend checks",
                      "severity": "high",
                      "platform": "google",
                      "first_seen": "2026-05-25T13:30:00Z",
                      "recommended_action": "Audit POS configuration and retrain weekend front-of-house staff."
                    }
                  ],
                  "recommended_responses": [
                    {
                      "review_excerpt": "Waited 45 minutes past our reservation time on a Saturday night.",
                      "platform": "google",
                      "rating": 2,
                      "draft_response": "We're truly sorry your Saturday reservation was delayed. That falls short of the experience we want to provide, and we're adjusting our weekend seating flow. We'd love to make it right on your next visit.",
                      "tone": "empathetic"
                    },
                    {
                      "review_excerpt": "Delivery showed up lukewarm and the bread was soggy.",
                      "platform": "doordash",
                      "rating": 2,
                      "draft_response": "Thank you for flagging this. Cold delivery is unacceptable to us, and we're reworking our packaging and handoff timing with couriers. Please reach out so we can make this right.",
                      "tone": "empathetic"
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/detect-review-themes": {
      "post": {
        "operationId": "detectReviewThemes",
        "tags": [
          "analysis"
        ],
        "summary": "Extract complaint and praise themes with volume and trend.",
        "description": "Returns complaint_themes and praise_themes with mention counts and trend direction.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalyzeReviewsRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "platforms": [
                  "google",
                  "yelp"
                ],
                "lookback_days": 60
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Detected themes.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ThemesResponse"
                },
                "example": {
                  "request_id": "req_themes_2b71e6a90c4f",
                  "source_freshness": {
                    "data_freshness_days": 1,
                    "last_verified_at": "2026-06-04T09:10:00Z",
                    "source_urls": [
                      "https://www.google.com/maps/place/Trattoria+Sole",
                      "https://www.yelp.com/biz/trattoria-sole-austin"
                    ]
                  },
                  "confidence": {
                    "score": 0.81,
                    "level": "high",
                    "rationale": "268 reviews across Google and Yelp over a 60-day window; theme clustering stable across both sources."
                  },
                  "privacy": {
                    "pii_included": false,
                    "reviewer_identity": "anonymized",
                    "retention_days": 30,
                    "compliance": [
                      "platform_tos_compliant",
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "google_reviews_public",
                      "yelp_public"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Prioritize the rising weekend wait-time complaint theme in operations review.",
                      "rationale": "It is the highest-volume negative theme and is trending upward.",
                      "chain_to_endpoint": "POST /identify-negative-review-drivers"
                    },
                    {
                      "priority": 2,
                      "action": "Amplify the strong handmade-pasta praise theme in marketing copy.",
                      "rationale": "It is the dominant positive driver and a clear differentiator worth promoting.",
                      "chain_to_endpoint": "POST /analyze-review-sentiment"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /audit-reviews",
                      "reason": "Fold review findings into a quantified growth analysis."
                    },
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Use urgent_issues as a high-conviction outreach hook."
                    }
                  ],
                  "complaint_themes": [
                    {
                      "theme": "Long wait times on weekends",
                      "mentions": 38,
                      "sentiment": "negative",
                      "trend": "rising",
                      "example_quote": "Waited 45 minutes past our reservation time on a Saturday night."
                    },
                    {
                      "theme": "Noise level too high when busy",
                      "mentions": 19,
                      "sentiment": "negative",
                      "trend": "flat",
                      "example_quote": "Could barely hear my date once the dining room filled up."
                    },
                    {
                      "theme": "Limited vegetarian options",
                      "mentions": 12,
                      "sentiment": "mixed",
                      "trend": "flat",
                      "example_quote": "Great food but only two vegetarian mains to choose from."
                    }
                  ],
                  "praise_themes": [
                    {
                      "theme": "Authentic handmade pasta",
                      "mentions": 88,
                      "sentiment": "positive",
                      "trend": "flat",
                      "example_quote": "Best fresh pasta I've had outside of Italy, the ravioli is incredible."
                    },
                    {
                      "theme": "Attentive and friendly service",
                      "mentions": 57,
                      "sentiment": "positive",
                      "trend": "rising",
                      "example_quote": "Our server was warm, knowledgeable, and made great wine recommendations."
                    },
                    {
                      "theme": "Excellent wine list",
                      "mentions": 33,
                      "sentiment": "positive",
                      "trend": "flat",
                      "example_quote": "The Italian wine selection is deep and the by-the-glass options are well chosen."
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/identify-negative-review-drivers": {
      "post": {
        "operationId": "identifyNegativeReviewDrivers",
        "tags": [
          "analysis"
        ],
        "summary": "Rank the root drivers behind negative reviews.",
        "description": "Returns ranked negative drivers with impact on rating and example quotes.",
        "x-pricing": {
          "price": 0.12
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalyzeReviewsRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "platforms": [
                  "google",
                  "yelp",
                  "doordash"
                ],
                "lookback_days": 90
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ranked negative drivers.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NegativeDriversResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/generate-review-response-plan": {
      "post": {
        "operationId": "generateReviewResponsePlan",
        "tags": [
          "analysis"
        ],
        "summary": "Draft recommended responses for recent/negative reviews.",
        "description": "Produces recommended_responses (drafts only — not posted). Posting to a platform is out of scope and would require a separate gated action.",
        "x-pricing": {
          "price": 0.2
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResponsePlanRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "target": "negative_only",
                "tone": "empathetic",
                "max_responses": 10
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recommended response drafts.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponsePlanResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/monitor-review-risk": {
      "post": {
        "operationId": "monitorReviewRisk",
        "tags": [
          "monitoring"
        ],
        "summary": "Cheap recurring risk check for reputation alerts.",
        "description": "Low-cost endpoint for repeated polling. Returns reputation_score, review_velocity, fake_review_risk, and any new urgent_issues since a provided checkpoint.",
        "x-pricing": {
          "price": 0.05
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/MonitorRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "since": "2026-05-28T00:00:00Z"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Current risk snapshot.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MonitorResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "NotFound": {
        "description": "Restaurant could not be resolved.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "reviewer_identity": {
            "type": "string",
            "enum": [
              "anonymized",
              "none"
            ],
            "default": "anonymized"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "source_freshness": {
            "type": "object",
            "description": "Provenance/recency of the underlying data used in this response.",
            "additionalProperties": false,
            "properties": {
              "data_freshness_days": {
                "type": "integer"
              },
              "last_verified_at": {
                "type": "string",
                "format": "date-time"
              },
              "source_urls": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                }
              }
            }
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "RestaurantRef": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "place_id": {
            "type": "string"
          },
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "country": {
            "type": "string",
            "default": "US"
          }
        }
      },
      "Theme": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "theme",
          "mentions",
          "sentiment"
        ],
        "properties": {
          "theme": {
            "type": "string"
          },
          "mentions": {
            "type": "integer"
          },
          "sentiment": {
            "type": "string",
            "enum": [
              "positive",
              "negative",
              "mixed"
            ]
          },
          "trend": {
            "type": "string",
            "enum": [
              "rising",
              "flat",
              "declining"
            ]
          },
          "example_quote": {
            "type": "string"
          }
        }
      },
      "UrgentIssue": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "issue",
          "severity"
        ],
        "properties": {
          "issue": {
            "type": "string"
          },
          "severity": {
            "type": "string",
            "enum": [
              "high",
              "critical"
            ]
          },
          "platform": {
            "type": "string"
          },
          "first_seen": {
            "type": "string",
            "format": "date-time"
          },
          "recommended_action": {
            "type": "string"
          }
        }
      },
      "RecommendedResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "review_excerpt",
          "draft_response"
        ],
        "properties": {
          "review_excerpt": {
            "type": "string"
          },
          "platform": {
            "type": "string"
          },
          "rating": {
            "type": "number",
            "minimum": 0,
            "maximum": 5
          },
          "draft_response": {
            "type": "string"
          },
          "tone": {
            "type": "string"
          }
        }
      },
      "AnalyzeReviewsRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "platforms": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "google",
                "yelp",
                "tripadvisor",
                "doordash",
                "ubereats"
              ]
            }
          },
          "lookback_days": {
            "type": "integer",
            "default": 90
          }
        }
      },
      "ReviewReportResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "sentiment_score",
              "review_velocity",
              "complaint_themes",
              "praise_themes",
              "urgent_issues",
              "fake_review_risk",
              "recommended_responses",
              "reputation_score"
            ],
            "properties": {
              "sentiment_score": {
                "type": "number",
                "minimum": -1,
                "maximum": 1,
                "description": "Net sentiment from -1 (negative) to +1 (positive)."
              },
              "reputation_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "review_velocity": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "per_week",
                  "trend"
                ],
                "properties": {
                  "per_week": {
                    "type": "number"
                  },
                  "trend": {
                    "type": "string",
                    "enum": [
                      "rising",
                      "flat",
                      "declining"
                    ]
                  }
                }
              },
              "fake_review_risk": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "score",
                  "level"
                ],
                "properties": {
                  "score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  },
                  "level": {
                    "type": "string",
                    "enum": [
                      "low",
                      "medium",
                      "high"
                    ]
                  },
                  "signals": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              },
              "complaint_themes": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Theme"
                }
              },
              "praise_themes": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Theme"
                }
              },
              "urgent_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/UrgentIssue"
                }
              },
              "recommended_responses": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/RecommendedResponse"
                }
              }
            }
          }
        ]
      },
      "ThemesResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "complaint_themes",
              "praise_themes"
            ],
            "properties": {
              "complaint_themes": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Theme"
                }
              },
              "praise_themes": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Theme"
                }
              }
            }
          }
        ]
      },
      "NegativeDriversResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "negative_drivers"
            ],
            "properties": {
              "negative_drivers": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "driver",
                    "rating_impact",
                    "mentions"
                  ],
                  "properties": {
                    "driver": {
                      "type": "string"
                    },
                    "rating_impact": {
                      "type": "number",
                      "description": "Estimated star impact on average rating."
                    },
                    "mentions": {
                      "type": "integer"
                    },
                    "example_quote": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        ]
      },
      "ResponsePlanRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "target": {
            "type": "string",
            "enum": [
              "negative_only",
              "recent",
              "all"
            ],
            "default": "negative_only"
          },
          "tone": {
            "type": "string",
            "enum": [
              "empathetic",
              "professional",
              "friendly"
            ],
            "default": "empathetic"
          },
          "max_responses": {
            "type": "integer",
            "default": 10,
            "minimum": 1,
            "maximum": 50
          }
        }
      },
      "ResponsePlanResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "recommended_responses"
            ],
            "properties": {
              "recommended_responses": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/RecommendedResponse"
                }
              }
            }
          }
        ]
      },
      "MonitorRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "since": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "MonitorResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "reputation_score",
              "review_velocity",
              "fake_review_risk",
              "new_urgent_issues"
            ],
            "properties": {
              "reputation_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "review_velocity": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "per_week",
                  "trend"
                ],
                "properties": {
                  "per_week": {
                    "type": "number"
                  },
                  "trend": {
                    "type": "string",
                    "enum": [
                      "rising",
                      "flat",
                      "declining"
                    ]
                  }
                }
              },
              "fake_review_risk": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "score",
                  "level"
                ],
                "properties": {
                  "score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  },
                  "level": {
                    "type": "string",
                    "enum": [
                      "low",
                      "medium",
                      "high"
                    ]
                  }
                }
              },
              "new_urgent_issues": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/UrgentIssue"
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 04. Restaurant AI Consultant API  (`/restaurant-ai-consultant`)

**Base URL:** `https://orbis-apis.onrender.com/restaurant-ai-consultant`  ·  **openapi.json:** `https://orbis-apis.onrender.com/restaurant-ai-consultant/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/restaurant-ai-consultant/`

## 04.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Restaurant AI Consultant API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/full-consulting-audit",
      "price_usd": 5.0,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/diagnose-revenue-leaks",
      "price_usd": 1.0,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/benchmark-competitors",
      "price_usd": 0.75,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/generate-90-day-plan",
      "price_usd": 2.0,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /full-consulting-audit",
  "execution_gates": [],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
      "CCPA"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_menu_data",
      "public_web_crawl",
      "local_market_data"
    ],
    "data_subject": "business_entity_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /full-consulting-audit to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /generate-growth-plan",
      "reason": "Drill into a single growth lever surfaced by the audit."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Expand the review_score with theme-level detail."
    },
    {
      "api": "Restaurant Lead Generation API",
      "endpoint": "POST /generate-outreach-angle",
      "reason": "Package the audit as a pitch deliverable for a prospect."
    }
  ]
}
```

## 04.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Restaurant AI Consultant API",
    "version": "1.0.0",
    "summary": "One-call full restaurant consulting audit — health, revenue risk, marketing, operations, reviews, competition, and a 90-day action plan.",
    "description": "Agent-native consulting engine. A single call to /full-consulting-audit returns an executive_summary, a restaurant_health_score, sub-scores for revenue risk, marketing, operations, reviews, and competition, a 90_day_action_plan, and an estimated_revenue_impact. Granular endpoints expose revenue-leak diagnosis, competitor benchmarking, and plan generation. Built for consultant, advisory, and operator agents.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /full-consulting-audit": 5.0,
      "POST /diagnose-revenue-leaks": 1.0,
      "POST /benchmark-competitors": 0.75,
      "POST /generate-90-day-plan": 2.0
    },
    "notes": "full-consulting-audit is the one-call workflow (due-diligence tier). It runs leak diagnosis, competitor benchmarking, and plan generation in one pass."
  },
  "x-privacy": {
    "pii_handling": "none",
    "data_subject": "business_entity_only",
    "retention_days": 30,
    "compliance": [
      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
      "CCPA"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_menu_data",
      "public_web_crawl",
      "local_market_data"
    ]
  },
  "x-chain-to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /generate-growth-plan",
      "reason": "Drill into a single growth lever surfaced by the audit."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Expand the review_score with theme-level detail."
    },
    {
      "api": "Restaurant Lead Generation API",
      "endpoint": "POST /generate-outreach-angle",
      "reason": "Package the audit as a pitch deliverable for a prospect."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/restaurant-ai-consultant",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "consulting"
    },
    {
      "name": "workflow"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Restaurant AI Consultant API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/full-consulting-audit",
                      "price_usd": 5.0,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/diagnose-revenue-leaks",
                      "price_usd": 1.0,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/benchmark-competitors",
                      "price_usd": 0.75,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/generate-90-day-plan",
                      "price_usd": 2.0,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /full-consulting-audit",
                  "execution_gates": [],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "public_web_crawl",
                      "local_market_data"
                    ],
                    "data_subject": "business_entity_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /full-consulting-audit to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /generate-growth-plan",
                      "reason": "Drill into a single growth lever surfaced by the audit."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Expand the review_score with theme-level detail."
                    },
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Package the audit as a pitch deliverable for a prospect."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/full-consulting-audit": {
      "post": {
        "operationId": "fullConsultingAudit",
        "tags": [
          "consulting",
          "workflow"
        ],
        "summary": "One-call workflow — complete consulting audit deliverable.",
        "description": "Returns executive_summary, restaurant_health_score, revenue_risk_score, marketing_score, operations_score, review_score, competition_score, 90_day_action_plan, and estimated_revenue_impact.",
        "x-pricing": {
          "price": 5.0
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AuditRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "competitors_radius_miles": 3,
                "depth": "full"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Full consulting audit.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ConsultingAuditResponse"
                },
                "example": {
                  "request_id": "req_audit_8f3c1a7e9b2d4c6a",
                  "source_freshness": {
                    "data_freshness_days": 2,
                    "last_verified_at": "2026-06-03T18:42:00Z",
                    "source_urls": [
                      "https://www.google.com/maps/place/trattoria-sole-austin",
                      "https://www.yelp.com/biz/trattoria-sole-austin",
                      "https://www.tripadvisor.com/Restaurant_Review-trattoria-sole-austin"
                    ]
                  },
                  "confidence": {
                    "score": 0.82,
                    "level": "high",
                    "rationale": "Synthesized from 4 public review platforms, current menu data, and local market comps within a 3-mile radius; revenue figures are modeled estimates from observed traffic and pricing signals."
                  },
                  "privacy": {
                    "pii_included": false,
                    "data_subject": "business_entity_only",
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "public_web_crawl",
                      "local_market_data"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Claim and optimize the Google Business Profile with updated hours, menu links, and weekly photo uploads.",
                      "rationale": "Profile is unclaimed and missing online ordering links, suppressing local discovery and click-to-order conversions.",
                      "estimated_revenue_impact_usd": 3200,
                      "chain_to_endpoint": "POST /generate-90-day-plan"
                    },
                    {
                      "priority": 2,
                      "action": "Launch a structured review-response and solicitation program targeting the 18 unanswered negative reviews.",
                      "rationale": "Unaddressed 1-2 star reviews citing slow service are depressing the rating below the local median of 4.3.",
                      "estimated_revenue_impact_usd": 2100,
                      "chain_to_endpoint": "POST /diagnose-revenue-leaks"
                    },
                    {
                      "priority": 3,
                      "action": "Renegotiate third-party delivery commission tiers and add a first-party online ordering channel.",
                      "rationale": "Delivery marketplace commissions of ~28% are eroding margin on a growing share of orders.",
                      "estimated_revenue_impact_usd": 1800
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /generate-growth-plan",
                      "reason": "Drill into a single growth lever surfaced by the audit."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Expand the review_score with theme-level detail."
                    }
                  ],
                  "executive_summary": "Trattoria Sole is a well-regarded neighborhood Italian restaurant with strong food sentiment but meaningful operational and digital gaps. Its restaurant health score of 68 is dragged down by an unclaimed Google Business Profile, slow review response, and high third-party delivery commissions. Closing these gaps over 90 days could recover an estimated $7,100/month in lost revenue, with the highest-leverage move being local-search optimization.",
                  "restaurant_health_score": 68,
                  "revenue_risk_score": 54,
                  "marketing_score": 61,
                  "operations_score": 72,
                  "review_score": 64,
                  "competition_score": 70,
                  "90_day_action_plan": [
                    {
                      "phase": "week_1",
                      "initiative": "Claim and fully complete the Google Business Profile, add online ordering link, and audit listing accuracy across Yelp and TripAdvisor.",
                      "owner_role": "Owner/Manager",
                      "effort": "low",
                      "estimated_revenue_impact_usd": 3200,
                      "kpi": "Profile views and direction requests per week"
                    },
                    {
                      "phase": "weeks_2_4",
                      "initiative": "Implement a review-response SOP and reply to all outstanding reviews within 48 hours; launch table-side QR review solicitation.",
                      "owner_role": "Front-of-house Lead",
                      "effort": "medium",
                      "estimated_revenue_impact_usd": 2100,
                      "kpi": "Average star rating and monthly review volume"
                    },
                    {
                      "phase": "weeks_5_8",
                      "initiative": "Stand up a commission-free first-party online ordering page and shift loyal customers to it via receipt and email prompts.",
                      "owner_role": "Marketing/Operations",
                      "effort": "high",
                      "estimated_revenue_impact_usd": 1800,
                      "kpi": "Share of orders on first-party channel vs. marketplaces"
                    },
                    {
                      "phase": "weeks_9_12",
                      "initiative": "Re-engineer the menu with high-margin item placement and introduce a Tuesday-Wednesday off-peak prix-fixe to lift slow-night covers.",
                      "owner_role": "Owner/Chef",
                      "effort": "medium",
                      "estimated_revenue_impact_usd": 1400,
                      "kpi": "Average check size and weekday cover count"
                    }
                  ],
                  "estimated_revenue_impact": {
                    "monthly_usd": 7100,
                    "annual_usd": 85200,
                    "confidence": 0.78
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/diagnose-revenue-leaks": {
      "post": {
        "operationId": "diagnoseRevenueLeaks",
        "tags": [
          "consulting"
        ],
        "summary": "Identify and quantify revenue leaks.",
        "description": "Returns ranked revenue_leaks with monthly_loss_usd and a revenue_risk_score.",
        "x-pricing": {
          "price": 1.0
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RestaurantRefRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Revenue-leak diagnosis.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RevenueLeaksResponse"
                },
                "example": {
                  "request_id": "req_leaks_2a9d7f1c4e6b8a30",
                  "source_freshness": {
                    "data_freshness_days": 3,
                    "last_verified_at": "2026-06-02T14:10:00Z",
                    "source_urls": [
                      "https://www.google.com/maps/place/trattoria-sole-austin",
                      "https://www.doordash.com/store/trattoria-sole-austin"
                    ]
                  },
                  "confidence": {
                    "score": 0.74,
                    "level": "medium",
                    "rationale": "Leak estimates derived from observed delivery pricing, public review patterns, and category benchmarks for comparable Austin Italian restaurants; individual figures are modeled and should be validated against POS data."
                  },
                  "privacy": {
                    "pii_included": false,
                    "data_subject": "business_entity_only",
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "local_market_data"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Migrate repeat customers to a commission-free first-party online ordering channel.",
                      "rationale": "Third-party delivery commissions are the single largest quantified leak.",
                      "estimated_revenue_impact_usd": 1800,
                      "chain_to_endpoint": "POST /generate-90-day-plan"
                    },
                    {
                      "priority": 2,
                      "action": "Introduce a deposit or card-hold policy for parties of six or more to curb no-shows.",
                      "rationale": "Friday and Saturday large-party no-shows leave premium tables empty during peak demand.",
                      "estimated_revenue_impact_usd": 950
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /generate-growth-plan",
                      "reason": "Drill into a single growth lever surfaced by the audit."
                    },
                    {
                      "api": "Restaurant Lead Generation API",
                      "endpoint": "POST /generate-outreach-angle",
                      "reason": "Package the audit as a pitch deliverable for a prospect."
                    }
                  ],
                  "revenue_risk_score": 54,
                  "total_monthly_loss_usd": 4150,
                  "revenue_leaks": [
                    {
                      "leak": "High third-party delivery commissions on a growing share of orders",
                      "category": "delivery",
                      "monthly_loss_usd": 1800,
                      "fix": "Launch a first-party online ordering page and incentivize direct orders via receipts and loyalty perks.",
                      "confidence": 0.8
                    },
                    {
                      "leak": "Weekend large-party no-shows leaving premium tables idle at peak",
                      "category": "no_shows",
                      "monthly_loss_usd": 950,
                      "fix": "Require a card hold or small deposit for reservations of six or more.",
                      "confidence": 0.65
                    },
                    {
                      "leak": "Unclaimed Google Business Profile suppressing local discovery and online orders",
                      "category": "online_presence",
                      "monthly_loss_usd": 850,
                      "fix": "Claim the profile, add ordering links, and post weekly photos and offers.",
                      "confidence": 0.72
                    },
                    {
                      "leak": "Unanswered negative reviews depressing rating below local median",
                      "category": "reviews",
                      "monthly_loss_usd": 550,
                      "fix": "Respond to all reviews within 48 hours and run table-side review solicitation.",
                      "confidence": 0.6
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/benchmark-competitors": {
      "post": {
        "operationId": "benchmarkCompetitors",
        "tags": [
          "consulting"
        ],
        "summary": "Benchmark the restaurant against nearby competitors.",
        "description": "Returns a competition_score and per-competitor comparison across price, rating, and presence.",
        "x-pricing": {
          "price": 0.75
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/BenchmarkRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "radius_miles": 3,
                "max_competitors": 5
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Competitor benchmark.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BenchmarkResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/generate-90-day-plan": {
      "post": {
        "operationId": "generate90DayPlan",
        "tags": [
          "consulting"
        ],
        "summary": "Generate a phased 90-day action plan.",
        "description": "Returns a 90_day_action_plan with phased initiatives and estimated_revenue_impact.",
        "x-pricing": {
          "price": 2.0
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PlanRequest"
              },
              "example": {
                "restaurant": {
                  "name": "Trattoria Sole",
                  "city": "Austin",
                  "state": "TX"
                },
                "focus": [
                  "reviews",
                  "online_ordering",
                  "local_seo"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "90-day action plan.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PlanResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "NotFound": {
        "description": "Restaurant could not be resolved.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "data_subject": {
            "type": "string",
            "enum": [
              "business_entity_only",
              "none"
            ],
            "default": "business_entity_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "estimated_revenue_impact_usd": {
            "type": "number"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "source_freshness": {
            "type": "object",
            "description": "Provenance/recency of the underlying data used in this response.",
            "additionalProperties": false,
            "properties": {
              "data_freshness_days": {
                "type": "integer"
              },
              "last_verified_at": {
                "type": "string",
                "format": "date-time"
              },
              "source_urls": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                }
              }
            }
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "RestaurantRef": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "place_id": {
            "type": "string"
          },
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "country": {
            "type": "string",
            "default": "US"
          }
        }
      },
      "RestaurantRefRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          }
        }
      },
      "PlanInitiative": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "phase",
          "initiative",
          "estimated_revenue_impact_usd"
        ],
        "properties": {
          "phase": {
            "type": "string",
            "enum": [
              "week_1",
              "weeks_2_4",
              "weeks_5_8",
              "weeks_9_12"
            ]
          },
          "initiative": {
            "type": "string"
          },
          "owner_role": {
            "type": "string"
          },
          "effort": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ]
          },
          "estimated_revenue_impact_usd": {
            "type": "number"
          },
          "kpi": {
            "type": "string"
          }
        }
      },
      "RevenueLeak": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "leak",
          "monthly_loss_usd"
        ],
        "properties": {
          "leak": {
            "type": "string"
          },
          "category": {
            "type": "string",
            "enum": [
              "pricing",
              "delivery",
              "no_shows",
              "online_presence",
              "reviews",
              "labor",
              "waste"
            ]
          },
          "monthly_loss_usd": {
            "type": "number"
          },
          "fix": {
            "type": "string"
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Field-level confidence for this specific leak estimate."
          }
        }
      },
      "AuditRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "competitors_radius_miles": {
            "type": "number",
            "default": 3
          },
          "depth": {
            "type": "string",
            "enum": [
              "standard",
              "full"
            ],
            "default": "full"
          }
        }
      },
      "ConsultingAuditResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "executive_summary",
              "restaurant_health_score",
              "revenue_risk_score",
              "marketing_score",
              "operations_score",
              "review_score",
              "competition_score",
              "90_day_action_plan",
              "estimated_revenue_impact"
            ],
            "properties": {
              "executive_summary": {
                "type": "string"
              },
              "restaurant_health_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "revenue_risk_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100,
                "description": "Higher = more revenue at risk."
              },
              "marketing_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "operations_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "review_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "competition_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "90_day_action_plan": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/PlanInitiative"
                }
              },
              "estimated_revenue_impact": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "monthly_usd",
                  "annual_usd"
                ],
                "properties": {
                  "monthly_usd": {
                    "type": "number"
                  },
                  "annual_usd": {
                    "type": "number"
                  },
                  "confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  }
                }
              }
            }
          }
        ]
      },
      "RevenueLeaksResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "revenue_risk_score",
              "revenue_leaks",
              "total_monthly_loss_usd"
            ],
            "properties": {
              "revenue_risk_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "total_monthly_loss_usd": {
                "type": "number"
              },
              "revenue_leaks": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/RevenueLeak"
                }
              }
            }
          }
        ]
      },
      "BenchmarkRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "radius_miles": {
            "type": "number",
            "default": 3
          },
          "max_competitors": {
            "type": "integer",
            "default": 5,
            "minimum": 1,
            "maximum": 20
          }
        }
      },
      "BenchmarkResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "competition_score",
              "competitors"
            ],
            "properties": {
              "competition_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "competitors": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "name"
                  ],
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "rating": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 5
                    },
                    "price_level": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 4
                    },
                    "review_count": {
                      "type": "integer"
                    },
                    "advantage_over_you": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "you_advantage_over_them": {
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
        ]
      },
      "PlanRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant"
        ],
        "properties": {
          "restaurant": {
            "$ref": "#/components/schemas/RestaurantRef"
          },
          "focus": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "reviews",
                "online_ordering",
                "local_seo",
                "menu_pricing",
                "marketing",
                "operations",
                "delivery"
              ]
            }
          }
        }
      },
      "PlanResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "90_day_action_plan",
              "estimated_revenue_impact"
            ],
            "properties": {
              "90_day_action_plan": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/PlanInitiative"
                }
              },
              "estimated_revenue_impact": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "monthly_usd",
                  "annual_usd"
                ],
                "properties": {
                  "monthly_usd": {
                    "type": "number"
                  },
                  "annual_usd": {
                    "type": "number"
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 05. Local Restaurant Discovery API  (`/local-restaurant-discovery`)

**Base URL:** `https://orbis-apis.onrender.com/local-restaurant-discovery`  ·  **openapi.json:** `https://orbis-apis.onrender.com/local-restaurant-discovery/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/local-restaurant-discovery/`

## 05.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Local Restaurant Discovery API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/discover-restaurants",
      "price_usd": 0.02,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/rank-restaurants",
      "price_usd": 0.01,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/match-restaurant-to-intent",
      "price_usd": 0.03,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/compare-local-options",
      "price_usd": 0.03,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /match-restaurant-to-intent",
  "execution_gates": [],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 7,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_menu_data",
      "geocoding"
    ],
    "user_query_logging": "ephemeral"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /match-restaurant-to-intent to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Reservation Intelligence API",
      "endpoint": "POST /find-availability",
      "reason": "Check open tables at the top-ranked match."
    },
    {
      "api": "Multi-Restaurant Ordering API",
      "endpoint": "POST /build-order",
      "reason": "Start an order from the discovered restaurant."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Validate the pick with deeper review intelligence."
    }
  ]
}
```

## 05.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Local Restaurant Discovery API",
    "version": "1.0.0",
    "summary": "Discover and rank restaurants by location, intent, dietary need, occasion, budget, and quality with match scores and confidence.",
    "description": "Agent-native discovery for the restaurant vertical. Given a location and an intent (occasion, dietary needs, budget, party context), returns ranked_restaurants with match_score, cuisine_match, distance, price_level, review_summary, dietary_fit, and best_for. Built for assistant, concierge, and local-business agents that make repeated discovery calls.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /discover-restaurants": 0.02,
      "POST /rank-restaurants": 0.01,
      "POST /match-restaurant-to-intent": 0.03,
      "POST /compare-local-options": 0.03
    },
    "notes": "Discovery-tier pricing for high-volume calls. match-restaurant-to-intent is the one-call workflow returning ranked, intent-matched results."
  },
  "x-privacy": {
    "pii_handling": "none",
    "user_query_logging": "ephemeral",
    "retention_days": 7,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "public_business_listings",
      "public_review_platforms",
      "public_menu_data",
      "geocoding"
    ]
  },
  "x-chain-to": [
    {
      "api": "Reservation Intelligence API",
      "endpoint": "POST /find-availability",
      "reason": "Check open tables at the top-ranked match."
    },
    {
      "api": "Multi-Restaurant Ordering API",
      "endpoint": "POST /build-order",
      "reason": "Start an order from the discovered restaurant."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Validate the pick with deeper review intelligence."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/local-restaurant-discovery",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "ranking"
    },
    {
      "name": "workflow"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Local Restaurant Discovery API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/discover-restaurants",
                      "price_usd": 0.02,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/rank-restaurants",
                      "price_usd": 0.01,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/match-restaurant-to-intent",
                      "price_usd": 0.03,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/compare-local-options",
                      "price_usd": 0.03,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /match-restaurant-to-intent",
                  "execution_gates": [],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 7,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "geocoding"
                    ],
                    "user_query_logging": "ephemeral"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /match-restaurant-to-intent to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Reservation Intelligence API",
                      "endpoint": "POST /find-availability",
                      "reason": "Check open tables at the top-ranked match."
                    },
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /build-order",
                      "reason": "Start an order from the discovered restaurant."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Validate the pick with deeper review intelligence."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/discover-restaurants": {
      "post": {
        "operationId": "discoverRestaurants",
        "tags": [
          "discovery"
        ],
        "summary": "Find restaurants matching basic location and filters.",
        "description": "Returns candidate restaurants for a location with light filtering. Cheap, high-volume.",
        "x-pricing": {
          "price": 0.02
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DiscoverRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "radius_miles": 5
                },
                "cuisine": [
                  "italian",
                  "mexican"
                ],
                "price_level": [
                  1,
                  2,
                  3
                ],
                "open_now": true,
                "limit": 20
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Candidate restaurants.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoverResponse"
                },
                "example": {
                  "request_id": "req_7b21e0aa4c8d9f33",
                  "source_freshness": {
                    "data_freshness_days": 1,
                    "last_verified_at": "2026-06-04T09:15:00Z",
                    "source_urls": [
                      "https://public-listings.example.com/austin/restaurants"
                    ]
                  },
                  "confidence": {
                    "score": 0.86,
                    "level": "high",
                    "rationale": "Location resolved cleanly and open_now status verified against current hours data."
                  },
                  "privacy": {
                    "pii_included": false,
                    "user_query_logging": "ephemeral",
                    "retention_days": 7,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "geocoding"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Rank these candidates by quality and fit before presenting to the user.",
                      "rationale": "Discovery returns unranked candidates; ranking improves relevance.",
                      "chain_to_endpoint": "POST /rank-restaurants"
                    },
                    {
                      "priority": 2,
                      "action": "Start an order from a discovered restaurant.",
                      "rationale": "User may want to order directly from a nearby match.",
                      "chain_to_endpoint": "POST /build-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /build-order",
                      "reason": "Start an order from the discovered restaurant."
                    },
                    {
                      "api": "Reservation Intelligence API",
                      "endpoint": "POST /find-availability",
                      "reason": "Check open tables at the top-ranked match."
                    }
                  ],
                  "total_found": 2,
                  "restaurants": [
                    {
                      "restaurant_id": "r_austin_1042",
                      "name": "Trattoria Sole",
                      "address": "1208 W 6th St, Austin, TX 78703",
                      "cuisine": [
                        "italian",
                        "mediterranean"
                      ],
                      "match_score": 82.0,
                      "cuisine_match": 1.0,
                      "distance": {
                        "miles": 1.4,
                        "minutes_drive": 7
                      },
                      "price_level": 3,
                      "review_summary": {
                        "rating": 4.6,
                        "review_count": 1287,
                        "highlight": "Handmade pasta and attentive service."
                      },
                      "dietary_fit": {
                        "score": 0.9,
                        "satisfied": [
                          "vegetarian_options"
                        ],
                        "unmet": []
                      },
                      "best_for": [
                        "casual",
                        "date_night"
                      ]
                    },
                    {
                      "restaurant_id": "r_austin_2289",
                      "name": "El Patio Cantina",
                      "address": "2900 Guadalupe St, Austin, TX 78705",
                      "cuisine": [
                        "mexican"
                      ],
                      "match_score": 78.5,
                      "cuisine_match": 1.0,
                      "distance": {
                        "miles": 3.1,
                        "minutes_drive": 13
                      },
                      "price_level": 2,
                      "review_summary": {
                        "rating": 4.3,
                        "review_count": 964,
                        "highlight": "Lively patio known for fresh tacos and house margaritas."
                      },
                      "dietary_fit": {
                        "score": 0.75,
                        "satisfied": [
                          "vegetarian_options"
                        ],
                        "unmet": [
                          "gluten_free"
                        ]
                      },
                      "best_for": [
                        "casual",
                        "group"
                      ]
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/rank-restaurants": {
      "post": {
        "operationId": "rankRestaurants",
        "tags": [
          "ranking"
        ],
        "summary": "Rank a candidate set by quality and fit.",
        "description": "Returns ranked_restaurants ordered by a composite quality/fit score.",
        "x-pricing": {
          "price": 0.01
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RankRequest"
              },
              "example": {
                "restaurants": [
                  {
                    "restaurant_id": "r_1",
                    "name": "Trattoria Sole"
                  },
                  {
                    "restaurant_id": "r_2",
                    "name": "La Bottega"
                  }
                ],
                "weight": {
                  "rating": 0.5,
                  "distance": 0.2,
                  "price": 0.3
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ranked restaurants.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RankResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/match-restaurant-to-intent": {
      "post": {
        "operationId": "matchRestaurantToIntent",
        "tags": [
          "ranking",
          "workflow"
        ],
        "summary": "One-call workflow — discover and rank by full intent.",
        "description": "Returns ranked_restaurants with match_score, cuisine_match, distance, price_level, review_summary, dietary_fit, and best_for, matched to a full intent (occasion, dietary, budget, party context).",
        "x-pricing": {
          "price": 0.03
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/IntentMatchRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "radius_miles": 5
                },
                "intent": {
                  "occasion": "date_night",
                  "dietary": [
                    "vegetarian_options",
                    "gluten_free"
                  ],
                  "budget_per_person_usd": 45,
                  "party_size": 2,
                  "vibe": [
                    "romantic",
                    "quiet"
                  ]
                },
                "limit": 10
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Intent-matched ranked restaurants.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/IntentMatchResponse"
                },
                "example": {
                  "request_id": "req_d3f8a1c2b9e74f60",
                  "source_freshness": {
                    "data_freshness_days": 2,
                    "last_verified_at": "2026-06-03T18:42:00Z",
                    "source_urls": [
                      "https://public-listings.example.com/austin/restaurants",
                      "https://reviews.example.com/austin"
                    ]
                  },
                  "confidence": {
                    "score": 0.91,
                    "level": "high",
                    "rationale": "Strong cuisine and dietary signal coverage for all top matches; budget and vibe well represented in local inventory."
                  },
                  "privacy": {
                    "pii_included": false,
                    "user_query_logging": "ephemeral",
                    "retention_days": 7,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "public_business_listings",
                      "public_review_platforms",
                      "public_menu_data",
                      "geocoding"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Check open tables at the top-ranked match for 2 at your preferred time.",
                      "rationale": "Highest match_score and best dietary fit for the date_night intent.",
                      "chain_to_endpoint": "POST /find-availability"
                    },
                    {
                      "priority": 2,
                      "action": "Validate the pick with deeper review sentiment analysis.",
                      "rationale": "Confirm the romantic, quiet vibe holds up across recent reviews.",
                      "chain_to_endpoint": "POST /analyze-review-sentiment"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Reservation Intelligence API",
                      "endpoint": "POST /find-availability",
                      "reason": "Check open tables at the top-ranked match."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Validate the pick with deeper review intelligence."
                    }
                  ],
                  "ranked_restaurants": [
                    {
                      "restaurant_id": "r_austin_1042",
                      "name": "Trattoria Sole",
                      "address": "1208 W 6th St, Austin, TX 78703",
                      "cuisine": [
                        "italian",
                        "mediterranean"
                      ],
                      "match_score": 94.5,
                      "cuisine_match": 0.97,
                      "distance": {
                        "miles": 1.4,
                        "minutes_drive": 7
                      },
                      "price_level": 3,
                      "review_summary": {
                        "rating": 4.6,
                        "review_count": 1287,
                        "highlight": "Intimate candlelit dining room praised for handmade pasta and attentive service."
                      },
                      "dietary_fit": {
                        "score": 0.95,
                        "satisfied": [
                          "vegetarian_options",
                          "gluten_free"
                        ],
                        "unmet": []
                      },
                      "best_for": [
                        "date_night",
                        "romantic",
                        "quiet"
                      ]
                    },
                    {
                      "restaurant_id": "r_austin_0731",
                      "name": "La Bottega",
                      "address": "455 S Lamar Blvd, Austin, TX 78704",
                      "cuisine": [
                        "italian"
                      ],
                      "match_score": 88.2,
                      "cuisine_match": 0.9,
                      "distance": {
                        "miles": 2.6,
                        "minutes_drive": 11
                      },
                      "price_level": 3,
                      "review_summary": {
                        "rating": 4.4,
                        "review_count": 842,
                        "highlight": "Cozy wine bar with a quiet back patio, strong gluten-free menu."
                      },
                      "dietary_fit": {
                        "score": 0.82,
                        "satisfied": [
                          "gluten_free"
                        ],
                        "unmet": [
                          "vegetarian_options"
                        ]
                      },
                      "best_for": [
                        "date_night",
                        "quiet"
                      ]
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/compare-local-options": {
      "post": {
        "operationId": "compareLocalOptions",
        "tags": [
          "ranking"
        ],
        "summary": "Head-to-head comparison of specific restaurants.",
        "description": "Returns a structured comparison matrix across selected dimensions.",
        "x-pricing": {
          "price": 0.03
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CompareRequest"
              },
              "example": {
                "restaurant_ids": [
                  "r_1",
                  "r_2",
                  "r_3"
                ],
                "dimensions": [
                  "rating",
                  "price_level",
                  "dietary_fit",
                  "distance",
                  "wait_time"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Comparison matrix.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CompareResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "user_query_logging": {
            "type": "string",
            "enum": [
              "ephemeral",
              "none"
            ],
            "default": "ephemeral"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "source_freshness": {
            "type": "object",
            "description": "Provenance/recency of the underlying data used in this response.",
            "additionalProperties": false,
            "properties": {
              "data_freshness_days": {
                "type": "integer"
              },
              "last_verified_at": {
                "type": "string",
                "format": "date-time"
              },
              "source_urls": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                }
              }
            }
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Location": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "country": {
            "type": "string",
            "default": "US"
          },
          "radius_miles": {
            "type": "number",
            "default": 5
          },
          "lat": {
            "type": "number"
          },
          "lng": {
            "type": "number"
          }
        }
      },
      "RankedRestaurant": {
        "description": "A ranked discovery result. Domain object — no envelope fields inside.",
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant_id",
          "name",
          "match_score"
        ],
        "properties": {
          "restaurant_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "address": {
            "type": "string"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "match_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "cuisine_match": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "distance": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "miles": {
                "type": "number"
              },
              "minutes_drive": {
                "type": "number"
              }
            }
          },
          "price_level": {
            "type": "integer",
            "minimum": 1,
            "maximum": 4
          },
          "review_summary": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "rating": {
                "type": "number",
                "minimum": 0,
                "maximum": 5
              },
              "review_count": {
                "type": "integer"
              },
              "highlight": {
                "type": "string"
              }
            }
          },
          "dietary_fit": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "score": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "satisfied": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "unmet": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          },
          "best_for": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "DiscoverRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "price_level": {
            "type": "array",
            "items": {
              "type": "integer",
              "minimum": 1,
              "maximum": 4
            }
          },
          "open_now": {
            "type": "boolean",
            "default": false
          },
          "limit": {
            "type": "integer",
            "default": 20,
            "minimum": 1,
            "maximum": 50
          }
        }
      },
      "DiscoverResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "restaurants",
              "total_found"
            ],
            "properties": {
              "total_found": {
                "type": "integer"
              },
              "restaurants": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/RankedRestaurant"
                }
              }
            }
          }
        ]
      },
      "RankRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurants"
        ],
        "properties": {
          "restaurants": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "restaurant_id",
                "name"
              ],
              "properties": {
                "restaurant_id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              }
            }
          },
          "weight": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "rating": {
                "type": "number"
              },
              "distance": {
                "type": "number"
              },
              "price": {
                "type": "number"
              }
            }
          }
        }
      },
      "RankResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "ranked_restaurants"
            ],
            "properties": {
              "ranked_restaurants": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/RankedRestaurant"
                }
              }
            }
          }
        ]
      },
      "IntentMatchRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location",
          "intent"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "intent": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "occasion": {
                "type": "string",
                "enum": [
                  "date_night",
                  "business_lunch",
                  "family",
                  "celebration",
                  "casual",
                  "solo",
                  "group"
                ]
              },
              "dietary": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "budget_per_person_usd": {
                "type": "number"
              },
              "party_size": {
                "type": "integer"
              },
              "vibe": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          },
          "limit": {
            "type": "integer",
            "default": 10,
            "minimum": 1,
            "maximum": 50
          }
        }
      },
      "IntentMatchResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "ranked_restaurants"
            ],
            "properties": {
              "ranked_restaurants": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/RankedRestaurant"
                }
              }
            }
          }
        ]
      },
      "CompareRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant_ids",
          "dimensions"
        ],
        "properties": {
          "restaurant_ids": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "dimensions": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "rating",
                "price_level",
                "dietary_fit",
                "distance",
                "wait_time",
                "cuisine_match"
              ]
            }
          }
        }
      },
      "CompareResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "comparison",
              "winner"
            ],
            "properties": {
              "winner": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "restaurant_id": {
                    "type": "string"
                  },
                  "reason": {
                    "type": "string"
                  }
                }
              },
              "comparison": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "restaurant_id",
                    "name"
                  ],
                  "properties": {
                    "restaurant_id": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "values": {
                      "type": "object",
                      "additionalProperties": true,
                      "description": "Map of requested dimension -> value for this restaurant."
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 06. Office Lunch Planner API  (`/office-lunch-planner`)

**Base URL:** `https://orbis-apis.onrender.com/office-lunch-planner`  ·  **openapi.json:** `https://orbis-apis.onrender.com/office-lunch-planner/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/office-lunch-planner/`

## 06.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Office Lunch Planner API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/plan-office-lunch",
      "price_usd": 0.25,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/collect-preferences",
      "price_usd": 0.02,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/build-group-order",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/optimize-budget",
      "price_usd": 0.05,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/prepare-checkout",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/submit-order",
      "price_usd": 0.5,
      "gated": true
    }
  ],
  "one_call_workflow": "POST /plan-office-lunch",
  "execution_gates": [
    "POST /submit-order"
  ],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 14,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "caller_supplied_preferences",
      "public_menu_data",
      "delivery_marketplace_apis"
    ],
    "attendee_data": "first_name_and_diet_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /plan-office-lunch to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /match-restaurant-to-intent",
      "reason": "Source candidate restaurants for the team's cuisine preferences."
    },
    {
      "api": "Multi-Restaurant Ordering API",
      "endpoint": "POST /price-order",
      "reason": "Cross-check pricing across multiple restaurants."
    },
    {
      "api": "Catering Procurement API",
      "endpoint": "POST /source-catering-options",
      "reason": "Escalate large teams to catering vendors."
    }
  ]
}
```

## 06.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Office Lunch Planner API",
    "version": "1.0.0",
    "summary": "Plan team lunch — collect preferences, build a group order, optimize budget, and prepare a (human-approved) checkout.",
    "description": "Agent-native group-lunch planning for workplaces. Given people_count, budget, dietary_restrictions, and cuisine_preferences, returns a suggested_order, per_person_cost, substitutions, and delivery_eta. The final /prepare-checkout step is execution-gated and requires explicit human approval before any payment or order submission. Built for executive assistant and workplace-ops agents.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /plan-office-lunch": 0.25,
      "POST /collect-preferences": 0.02,
      "POST /build-group-order": 0.1,
      "POST /optimize-budget": 0.05,
      "POST /prepare-checkout": 0.1,
      "POST /submit-order": 0.5
    },
    "notes": "plan-office-lunch is the one-call workflow. prepare-checkout is a no-charge- risk preview; submit-order is execution-gated and bills only on approved execution."
  },
  "x-privacy": {
    "pii_handling": "minimized",
    "attendee_data": "first_name_and_diet_only",
    "retention_days": 14,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "caller_supplied_preferences",
      "public_menu_data",
      "delivery_marketplace_apis"
    ]
  },
  "x-chain-to": [
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /match-restaurant-to-intent",
      "reason": "Source candidate restaurants for the team's cuisine preferences."
    },
    {
      "api": "Multi-Restaurant Ordering API",
      "endpoint": "POST /price-order",
      "reason": "Cross-check pricing across multiple restaurants."
    },
    {
      "api": "Catering Procurement API",
      "endpoint": "POST /source-catering-options",
      "reason": "Escalate large teams to catering vendors."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/office-lunch-planner",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "planning"
    },
    {
      "name": "checkout"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, execution gates, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Office Lunch Planner API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/plan-office-lunch",
                      "price_usd": 0.25,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/collect-preferences",
                      "price_usd": 0.02,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/build-group-order",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/optimize-budget",
                      "price_usd": 0.05,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/prepare-checkout",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/submit-order",
                      "price_usd": 0.5,
                      "gated": true
                    }
                  ],
                  "one_call_workflow": "POST /plan-office-lunch",
                  "execution_gates": [
                    "POST /submit-order"
                  ],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 14,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "caller_supplied_preferences",
                      "public_menu_data",
                      "delivery_marketplace_apis"
                    ],
                    "attendee_data": "first_name_and_diet_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /plan-office-lunch to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Source candidate restaurants for the team's cuisine preferences."
                    },
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /price-order",
                      "reason": "Cross-check pricing across multiple restaurants."
                    },
                    {
                      "api": "Catering Procurement API",
                      "endpoint": "POST /source-catering-options",
                      "reason": "Escalate large teams to catering vendors."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/plan-office-lunch": {
      "post": {
        "operationId": "planOfficeLunch",
        "tags": [
          "planning"
        ],
        "summary": "One-call workflow — plan a complete team lunch.",
        "description": "Orchestrates collect-preferences + build-group-order + optimize-budget. Returns suggested_order, per_person_cost, substitutions, delivery_eta, and approval_required. Does NOT pay or submit — that requires the gated /prepare-checkout step.",
        "x-pricing": {
          "price": 0.25
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PlanRequest"
              },
              "example": {
                "people_count": 12,
                "budget": {
                  "total_usd": 240,
                  "per_person_cap_usd": 22
                },
                "dietary_restrictions": [
                  "vegetarian",
                  "gluten_free",
                  "nut_allergy"
                ],
                "cuisine_preferences": [
                  "mediterranean",
                  "mexican"
                ],
                "delivery_window": {
                  "date": "2026-06-10",
                  "earliest": "11:45",
                  "latest": "12:15"
                },
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "address": "300 Congress Ave"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Complete lunch plan.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LunchPlanResponse"
                },
                "example": {
                  "request_id": "req_lunch_8f3a21c7",
                  "confidence": {
                    "score": 0.91,
                    "level": "high",
                    "rationale": "Strong menu coverage for Mediterranean and Mexican with verified vegetarian, gluten-free, and nut-free options within the per-person cap."
                  },
                  "privacy": {
                    "pii_included": true,
                    "attendee_data": "first_name_and_diet_only",
                    "retention_days": 14,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "caller_supplied_preferences",
                      "public_menu_data",
                      "delivery_marketplace_apis"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Review the suggested order and confirm dietary coverage with the team.",
                      "rationale": "Final menu should be validated before any payment is initiated."
                    },
                    {
                      "priority": 2,
                      "action": "Call /prepare-checkout to preview totals, tip, and delivery ETA.",
                      "rationale": "Assembles a no-charge checkout summary for human review.",
                      "chain_to_endpoint": "POST /prepare-checkout"
                    },
                    {
                      "priority": 3,
                      "action": "Obtain human approval, then submit via the gated /submit-order endpoint.",
                      "rationale": "Payment and order submission only occur at the execution-gated step.",
                      "chain_to_endpoint": "POST /submit-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Source additional candidate restaurants for the team's cuisine preferences."
                    },
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /price-order",
                      "reason": "Cross-check pricing across multiple restaurants before checkout."
                    }
                  ],
                  "people_count": 12,
                  "suggested_order": {
                    "order_id": "ord_44",
                    "restaurant_name": "Verde Mediterranean Kitchen",
                    "line_items": [
                      {
                        "item": "Falafel Mezze Platter (serves 4)",
                        "quantity": 2,
                        "unit_price_usd": 38.0,
                        "dietary_tags": [
                          "vegetarian",
                          "vegan",
                          "nut_free"
                        ],
                        "serves": 4
                      },
                      {
                        "item": "Grilled Chicken Shawarma Bowl",
                        "quantity": 4,
                        "unit_price_usd": 13.5,
                        "dietary_tags": [
                          "gluten_free",
                          "nut_free"
                        ],
                        "serves": 1
                      },
                      {
                        "item": "Gluten-Free Veggie Quesadilla",
                        "quantity": 3,
                        "unit_price_usd": 11.0,
                        "dietary_tags": [
                          "vegetarian",
                          "gluten_free",
                          "nut_free"
                        ],
                        "serves": 1
                      },
                      {
                        "item": "Mixed Greens & Hummus Tray (serves 6)",
                        "quantity": 1,
                        "unit_price_usd": 24.0,
                        "dietary_tags": [
                          "vegetarian",
                          "vegan",
                          "gluten_free",
                          "nut_free"
                        ],
                        "serves": 6
                      }
                    ],
                    "subtotal_usd": 187.0,
                    "delivery_fee_usd": 8.99,
                    "tax_usd": 15.44,
                    "total_usd": 211.43
                  },
                  "per_person_cost": 17.62,
                  "substitutions": [
                    {
                      "from": "Mixed Nut Baklava Tray",
                      "to": "Mixed Greens & Hummus Tray (serves 6)",
                      "reason": "Removed to honor the nut_allergy restriction.",
                      "price_delta_usd": -6.0
                    },
                    {
                      "from": "Flour Tortilla Quesadilla",
                      "to": "Gluten-Free Veggie Quesadilla",
                      "reason": "Swapped to a gluten-free tortilla for the gluten_free restriction.",
                      "price_delta_usd": 4.5
                    }
                  ],
                  "delivery_eta": {
                    "window_start": "11:45",
                    "window_end": "12:15",
                    "minutes": 35
                  },
                  "approval_required": true,
                  "next_step": {
                    "description": "Preview the checkout summary, then route payment and submission through the gated step.",
                    "preview_endpoint": "POST /prepare-checkout",
                    "gated_endpoint": "POST /submit-order"
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/collect-preferences": {
      "post": {
        "operationId": "collectPreferences",
        "tags": [
          "planning"
        ],
        "summary": "Normalize and aggregate team preferences.",
        "description": "Returns aggregated dietary_restrictions, cuisine_preferences, and per-attendee constraints.",
        "x-pricing": {
          "price": 0.02
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CollectRequest"
              },
              "example": {
                "attendees": [
                  {
                    "name": "Ana",
                    "diet": [
                      "vegetarian"
                    ]
                  },
                  {
                    "name": "Ben",
                    "diet": [
                      "gluten_free"
                    ]
                  },
                  {
                    "name": "Cy",
                    "diet": []
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Aggregated preferences.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CollectResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/build-group-order": {
      "post": {
        "operationId": "buildGroupOrder",
        "tags": [
          "planning"
        ],
        "summary": "Build a suggested group order from preferences.",
        "description": "Returns a suggested_order with line items, substitutions, and per_person_cost.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/BuildOrderRequest"
              },
              "example": {
                "people_count": 12,
                "dietary_restrictions": [
                  "vegetarian",
                  "gluten_free",
                  "nut_allergy"
                ],
                "cuisine_preferences": [
                  "mediterranean"
                ],
                "budget": {
                  "total_usd": 240
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Suggested group order.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BuildOrderResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/optimize-budget": {
      "post": {
        "operationId": "optimizeBudget",
        "tags": [
          "planning"
        ],
        "summary": "Optimize an order to fit a budget.",
        "description": "Returns an adjusted order, substitutions made, and the resulting per_person_cost.",
        "x-pricing": {
          "price": 0.05
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/OptimizeRequest"
              },
              "example": {
                "order_id": "ord_44",
                "target_total_usd": 220,
                "strategy": "balanced"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Budget-optimized order.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OptimizeResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/prepare-checkout": {
      "post": {
        "operationId": "prepareCheckout",
        "tags": [
          "checkout"
        ],
        "summary": "Preview the final checkout summary. Preview only — no payment.",
        "description": "Assembles a final checkout_summary (totals, per-person cost, tip, delivery ETA) for review. This endpoint performs NO payment or order submission: it returns approval_required=true and a next_step pointing at the gated /submit-order endpoint. Money only moves at /submit-order.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CheckoutRequest"
              },
              "example": {
                "order_id": "ord_44",
                "tip_percent": 15
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Checkout preview summary. No payment performed.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PreviewCheckoutResponse"
                },
                "example": {
                  "request_id": "req_checkout_b71e90d4",
                  "confidence": {
                    "score": 0.95,
                    "level": "high",
                    "rationale": "Totals computed directly from the confirmed order ord_44 with current delivery-marketplace fees and tax."
                  },
                  "privacy": {
                    "pii_included": false,
                    "attendee_data": "none",
                    "retention_days": 14,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "caller_supplied_preferences",
                      "delivery_marketplace_apis"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Present this checkout summary to the human approver for sign-off.",
                      "rationale": "No payment has occurred; explicit human approval is required before money moves."
                    },
                    {
                      "priority": 2,
                      "action": "After approval, call the gated /submit-order endpoint with a valid approval_token.",
                      "rationale": "Payment and order submission only execute at /submit-order.",
                      "chain_to_endpoint": "POST /submit-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /price-order",
                      "reason": "Optionally cross-check the total against alternative restaurants before approval."
                    }
                  ],
                  "approval_required": true,
                  "checkout_summary": {
                    "total_cost_usd": 243.14,
                    "per_person_cost": 20.26,
                    "tip_usd": 31.71,
                    "delivery_eta": {
                      "window_start": "11:45",
                      "window_end": "12:15",
                      "minutes": 35
                    }
                  },
                  "next_step": {
                    "description": "This was a no-charge preview. To pay and place the order, obtain human approval and call the gated submission endpoint.",
                    "gated_endpoint": "/submit-order"
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/submit-order": {
      "post": {
        "operationId": "submitOrder",
        "tags": [
          "checkout"
        ],
        "summary": "[GATED] Submit and pay for the order. Requires human approval.",
        "description": "Executes payment and submits the group order. This is a risky, money-moving, irreversible action: with no approval_token it returns approval_required=true and execution_gate.status=pending_approval and performs NO payment or submission. With a valid approval_token, payment and order submission execute.",
        "x-pricing": {
          "price": 0.5
        },
        "x-execution-gate": true,
        "x-human-approval-required": true,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubmitOrderRequest"
              },
              "example": {
                "order_id": "ord_44",
                "payment_method_token": "pm_***",
                "tip_percent": 15,
                "approval_token": null
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Either a pending-approval gate (no payment) or a confirmed submission (when a valid approval_token is supplied).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SubmitOrderResponse"
                },
                "example": {
                  "request_id": "req_submit_c204af19",
                  "confidence": {
                    "score": 0.88,
                    "level": "high",
                    "rationale": "Order ord_44 and payment token are valid, but no approval_token was supplied so the execution gate is holding pending human approval."
                  },
                  "privacy": {
                    "pii_included": false,
                    "attendee_data": "none",
                    "retention_days": 14,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "caller_supplied_preferences",
                      "delivery_marketplace_apis"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Obtain an explicit human approval_token for this money-moving action.",
                      "rationale": "Submission is gated and irreversible; no payment has been taken."
                    },
                    {
                      "priority": 2,
                      "action": "Re-call /submit-order with the valid approval_token to execute payment and place the order.",
                      "rationale": "Payment and submission only occur once a valid approval_token is provided.",
                      "chain_to_endpoint": "POST /submit-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Catering Procurement API",
                      "endpoint": "POST /source-catering-options",
                      "reason": "Escalate to catering vendors if the team grows beyond delivery capacity."
                    }
                  ],
                  "approval_required": true,
                  "execution_gate": {
                    "required": true,
                    "status": "pending_approval",
                    "approval_token_hint": "Supply a human-issued approval_token in the request body to authorize payment.",
                    "expires_at": "2026-06-09T23:59:59Z",
                    "irreversible": true
                  },
                  "submitted": false,
                  "order_confirmation_id": null,
                  "checkout_summary": {
                    "total_cost_usd": 243.14,
                    "per_person_cost": 20.26,
                    "tip_usd": 31.71,
                    "delivery_eta": {
                      "window_start": "11:45",
                      "window_end": "12:15",
                      "minutes": 35
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "403": {
            "description": "Approval token invalid, expired, or revoked.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "attendee_data": {
            "type": "string",
            "enum": [
              "first_name_and_diet_only",
              "none"
            ],
            "default": "first_name_and_diet_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ExecutionGate": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "required",
          "status"
        ],
        "properties": {
          "required": {
            "type": "boolean"
          },
          "status": {
            "type": "string",
            "enum": [
              "not_required",
              "pending_approval",
              "approved",
              "executed",
              "rejected"
            ]
          },
          "approval_token_hint": {
            "type": "string"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "irreversible": {
            "type": "boolean"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Budget": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "total_usd": {
            "type": "number"
          },
          "per_person_cap_usd": {
            "type": "number"
          },
          "currency": {
            "type": "string",
            "default": "USD"
          }
        }
      },
      "DeliveryWindow": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "date": {
            "type": "string",
            "format": "date"
          },
          "earliest": {
            "type": "string"
          },
          "latest": {
            "type": "string"
          }
        }
      },
      "Location": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "address": {
            "type": "string"
          }
        }
      },
      "OrderLine": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "item",
          "quantity",
          "unit_price_usd"
        ],
        "properties": {
          "item": {
            "type": "string"
          },
          "quantity": {
            "type": "integer"
          },
          "unit_price_usd": {
            "type": "number"
          },
          "dietary_tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "serves": {
            "type": "integer"
          }
        }
      },
      "Substitution": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "from",
          "to",
          "reason"
        ],
        "properties": {
          "from": {
            "type": "string"
          },
          "to": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          },
          "price_delta_usd": {
            "type": "number"
          }
        }
      },
      "SuggestedOrder": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant_name",
          "line_items",
          "subtotal_usd"
        ],
        "properties": {
          "order_id": {
            "type": "string"
          },
          "restaurant_name": {
            "type": "string"
          },
          "line_items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/OrderLine"
            }
          },
          "subtotal_usd": {
            "type": "number"
          },
          "delivery_fee_usd": {
            "type": "number"
          },
          "tax_usd": {
            "type": "number"
          },
          "total_usd": {
            "type": "number"
          }
        }
      },
      "PlanRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "people_count",
          "budget"
        ],
        "properties": {
          "people_count": {
            "type": "integer",
            "minimum": 1
          },
          "budget": {
            "$ref": "#/components/schemas/Budget"
          },
          "dietary_restrictions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "cuisine_preferences": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "delivery_window": {
            "$ref": "#/components/schemas/DeliveryWindow"
          },
          "location": {
            "$ref": "#/components/schemas/Location"
          }
        }
      },
      "LunchPlanResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "people_count",
              "suggested_order",
              "per_person_cost",
              "substitutions",
              "delivery_eta",
              "approval_required"
            ],
            "properties": {
              "people_count": {
                "type": "integer"
              },
              "suggested_order": {
                "$ref": "#/components/schemas/SuggestedOrder"
              },
              "per_person_cost": {
                "type": "number"
              },
              "substitutions": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Substitution"
                }
              },
              "delivery_eta": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "window_start": {
                    "type": "string"
                  },
                  "window_end": {
                    "type": "string"
                  },
                  "minutes": {
                    "type": "integer"
                  }
                }
              },
              "approval_required": {
                "type": "boolean",
                "description": "True — preview via /prepare-checkout, then payment/submission must go through the gated /submit-order step."
              },
              "next_step": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "preview_endpoint": {
                    "type": "string"
                  },
                  "gated_endpoint": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ]
      },
      "CollectRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "attendees"
        ],
        "properties": {
          "attendees": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "name"
              ],
              "properties": {
                "name": {
                  "type": "string"
                },
                "diet": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "dislikes": {
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
      "CollectResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "people_count",
              "dietary_restrictions",
              "cuisine_preferences"
            ],
            "properties": {
              "people_count": {
                "type": "integer"
              },
              "dietary_restrictions": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "cuisine_preferences": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "constraints_summary": {
                "type": "string"
              }
            }
          }
        ]
      },
      "BuildOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "people_count"
        ],
        "properties": {
          "people_count": {
            "type": "integer"
          },
          "dietary_restrictions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "cuisine_preferences": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "budget": {
            "$ref": "#/components/schemas/Budget"
          }
        }
      },
      "BuildOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "suggested_order",
              "per_person_cost",
              "substitutions"
            ],
            "properties": {
              "suggested_order": {
                "$ref": "#/components/schemas/SuggestedOrder"
              },
              "per_person_cost": {
                "type": "number"
              },
              "substitutions": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Substitution"
                }
              }
            }
          }
        ]
      },
      "OptimizeRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "order_id",
          "target_total_usd"
        ],
        "properties": {
          "order_id": {
            "type": "string"
          },
          "target_total_usd": {
            "type": "number"
          },
          "strategy": {
            "type": "string",
            "enum": [
              "cheapest",
              "balanced",
              "preserve_variety"
            ],
            "default": "balanced"
          }
        }
      },
      "OptimizeResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "suggested_order",
              "per_person_cost",
              "substitutions"
            ],
            "properties": {
              "suggested_order": {
                "$ref": "#/components/schemas/SuggestedOrder"
              },
              "per_person_cost": {
                "type": "number"
              },
              "substitutions": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Substitution"
                }
              }
            }
          }
        ]
      },
      "CheckoutRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "order_id"
        ],
        "properties": {
          "order_id": {
            "type": "string"
          },
          "tip_percent": {
            "type": "number",
            "default": 15
          }
        }
      },
      "PreviewCheckoutResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "approval_required",
              "checkout_summary",
              "next_step"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean",
                "description": "Always true — payment requires the gated /submit-order step."
              },
              "checkout_summary": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "total_cost_usd",
                  "per_person_cost",
                  "delivery_eta"
                ],
                "properties": {
                  "total_cost_usd": {
                    "type": "number"
                  },
                  "per_person_cost": {
                    "type": "number"
                  },
                  "tip_usd": {
                    "type": "number"
                  },
                  "delivery_eta": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "window_start": {
                        "type": "string"
                      },
                      "window_end": {
                        "type": "string"
                      },
                      "minutes": {
                        "type": "integer"
                      }
                    }
                  }
                }
              },
              "next_step": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "description",
                  "gated_endpoint"
                ],
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "gated_endpoint": {
                    "type": "string",
                    "description": "Gated endpoint that performs payment/submission: /submit-order."
                  }
                }
              }
            }
          }
        ]
      },
      "SubmitOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "order_id",
          "payment_method_token"
        ],
        "properties": {
          "order_id": {
            "type": "string"
          },
          "payment_method_token": {
            "type": "string"
          },
          "tip_percent": {
            "type": "number",
            "default": 15
          },
          "approval_token": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-issued approval token. Null/omitted ⇒ gate returns pending_approval and no payment occurs."
          }
        }
      },
      "SubmitOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "approval_required",
              "execution_gate",
              "checkout_summary",
              "submitted"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean"
              },
              "execution_gate": {
                "$ref": "#/components/schemas/ExecutionGate"
              },
              "submitted": {
                "type": "boolean",
                "description": "True only when a valid approval_token was supplied and order placed."
              },
              "order_confirmation_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "checkout_summary": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "total_cost_usd",
                  "per_person_cost",
                  "delivery_eta"
                ],
                "properties": {
                  "total_cost_usd": {
                    "type": "number"
                  },
                  "per_person_cost": {
                    "type": "number"
                  },
                  "tip_usd": {
                    "type": "number"
                  },
                  "delivery_eta": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "window_start": {
                        "type": "string"
                      },
                      "window_end": {
                        "type": "string"
                      },
                      "minutes": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 07. Catering Procurement API  (`/catering-procurement`)

**Base URL:** `https://orbis-apis.onrender.com/catering-procurement`  ·  **openapi.json:** `https://orbis-apis.onrender.com/catering-procurement/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/catering-procurement/`

## 07.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Catering Procurement API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/source-catering-options",
      "price_usd": 0.05,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/compare-catering-vendors",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/generate-catering-plan",
      "price_usd": 0.5,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/prepare-catering-order",
      "price_usd": 0.15,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/submit-catering-request",
      "price_usd": 1.0,
      "gated": true
    }
  ],
  "one_call_workflow": "POST /generate-catering-plan",
  "execution_gates": [
    "POST /submit-catering-request"
  ],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "catering_marketplace_apis",
      "public_menu_data",
      "caller_supplied_event_details"
    ],
    "attendee_data": "aggregate_counts_and_diet_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /generate-catering-plan to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Office Lunch Planner API",
      "endpoint": "POST /plan-office-lunch",
      "reason": "Downscale a small event to a simple group order."
    },
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /discover-restaurants",
      "reason": "Find additional vendor candidates by cuisine."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Vet a shortlisted caterer's reputation before ordering."
    }
  ]
}
```

## 07.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Catering Procurement API",
    "version": "1.0.0",
    "summary": "Source, compare, plan, and (human-approved) order catering for meetings, offices, events, and groups.",
    "description": "Agent-native catering procurement. Given attendee_count, budget, dietary_restrictions, cuisine_preferences, and a delivery_window, returns vendor_options and a recommended_order, then prepares and (on human approval) submits a catering request. Final ordering and any direct vendor contact are execution-gated. Built for executive assistant, events, and workplace-ops agents.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /source-catering-options": 0.05,
      "POST /compare-catering-vendors": 0.1,
      "POST /generate-catering-plan": 0.5,
      "POST /prepare-catering-order": 0.15,
      "POST /submit-catering-request": 1.0
    },
    "notes": "generate-catering-plan is the one-call workflow. submit-catering-request is execution-gated (vendor contact / order) and bills only on approved execution."
  },
  "x-privacy": {
    "pii_handling": "minimized",
    "attendee_data": "aggregate_counts_and_diet_only",
    "retention_days": 30,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "catering_marketplace_apis",
      "public_menu_data",
      "caller_supplied_event_details"
    ]
  },
  "x-chain-to": [
    {
      "api": "Office Lunch Planner API",
      "endpoint": "POST /plan-office-lunch",
      "reason": "Downscale a small event to a simple group order."
    },
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /discover-restaurants",
      "reason": "Find additional vendor candidates by cuisine."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Vet a shortlisted caterer's reputation before ordering."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/catering-procurement",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "sourcing"
    },
    {
      "name": "ordering"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, execution gates, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Catering Procurement API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/source-catering-options",
                      "price_usd": 0.05,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/compare-catering-vendors",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/generate-catering-plan",
                      "price_usd": 0.5,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/prepare-catering-order",
                      "price_usd": 0.15,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/submit-catering-request",
                      "price_usd": 1.0,
                      "gated": true
                    }
                  ],
                  "one_call_workflow": "POST /generate-catering-plan",
                  "execution_gates": [
                    "POST /submit-catering-request"
                  ],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "catering_marketplace_apis",
                      "public_menu_data",
                      "caller_supplied_event_details"
                    ],
                    "attendee_data": "aggregate_counts_and_diet_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /generate-catering-plan to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Office Lunch Planner API",
                      "endpoint": "POST /plan-office-lunch",
                      "reason": "Downscale a small event to a simple group order."
                    },
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /discover-restaurants",
                      "reason": "Find additional vendor candidates by cuisine."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Vet a shortlisted caterer's reputation before ordering."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/source-catering-options": {
      "post": {
        "operationId": "sourceCateringOptions",
        "tags": [
          "sourcing"
        ],
        "summary": "Find catering vendors matching the event spec.",
        "description": "Returns vendor_options matching attendee_count, budget, diet, cuisine, and delivery_window.",
        "x-pricing": {
          "price": 0.05
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SourceRequest"
              },
              "example": {
                "attendee_count": 40,
                "budget": {
                  "total_usd": 800,
                  "per_person_cap_usd": 20
                },
                "dietary_restrictions": [
                  "vegetarian",
                  "halal"
                ],
                "cuisine_preferences": [
                  "mediterranean",
                  "indian"
                ],
                "delivery_window": {
                  "date": "2026-06-18",
                  "earliest": "11:30",
                  "latest": "12:00"
                },
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "address": "300 Congress Ave"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Matching vendor options.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SourceResponse"
                },
                "example": {
                  "request_id": "req_5d2b81fa37c4",
                  "confidence": {
                    "score": 0.84,
                    "level": "high",
                    "rationale": "Multiple vendors matched the attendee count, budget cap, dietary restrictions, and delivery window."
                  },
                  "privacy": {
                    "pii_included": false,
                    "attendee_data": "aggregate_counts_and_diet_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "catering_marketplace_apis",
                      "public_menu_data",
                      "caller_supplied_event_details"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Compare the shortlisted vendors head-to-head before selecting one.",
                      "rationale": "Several vendors are close on price and rating.",
                      "chain_to_endpoint": "POST /compare-catering-vendors"
                    },
                    {
                      "priority": 2,
                      "action": "Generate a full catering plan with a recommended order.",
                      "chain_to_endpoint": "POST /generate-catering-plan"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /discover-restaurants",
                      "reason": "Find additional vendor candidates by cuisine."
                    }
                  ],
                  "attendee_count": 40,
                  "vendor_options": [
                    {
                      "vendor_id": "v_1",
                      "name": "Olive & Cedar Mediterranean Catering",
                      "cuisine": [
                        "mediterranean"
                      ],
                      "rating": 4.7,
                      "est_total_usd": 760.0,
                      "per_person_usd": 19.0,
                      "lead_time_hours": 24,
                      "dietary_coverage": [
                        "vegetarian",
                        "halal",
                        "vegan"
                      ],
                      "min_order_people": 20
                    },
                    {
                      "vendor_id": "v_2",
                      "name": "Saffron Table Catering",
                      "cuisine": [
                        "mediterranean",
                        "indian"
                      ],
                      "rating": 4.5,
                      "est_total_usd": 720.0,
                      "per_person_usd": 18.0,
                      "lead_time_hours": 36,
                      "dietary_coverage": [
                        "vegetarian",
                        "halal"
                      ],
                      "min_order_people": 25
                    },
                    {
                      "vendor_id": "v_3",
                      "name": "Levant Kitchen",
                      "cuisine": [
                        "mediterranean"
                      ],
                      "rating": 4.3,
                      "est_total_usd": 788.0,
                      "per_person_usd": 19.7,
                      "lead_time_hours": 18,
                      "dietary_coverage": [
                        "vegetarian",
                        "halal"
                      ],
                      "min_order_people": 15
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/compare-catering-vendors": {
      "post": {
        "operationId": "compareCateringVendors",
        "tags": [
          "sourcing"
        ],
        "summary": "Compare shortlisted vendors head-to-head.",
        "description": "Returns a structured comparison across price, rating, lead time, and dietary coverage.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CompareVendorsRequest"
              },
              "example": {
                "vendor_ids": [
                  "v_1",
                  "v_2",
                  "v_3"
                ],
                "dimensions": [
                  "price",
                  "rating",
                  "lead_time",
                  "dietary_coverage"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Vendor comparison.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CompareVendorsResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/generate-catering-plan": {
      "post": {
        "operationId": "generateCateringPlan",
        "tags": [
          "sourcing"
        ],
        "summary": "One-call workflow — source, compare, and recommend a catering plan.",
        "description": "Orchestrates sourcing + comparison and returns vendor_options and a recommended_order sized to attendee_count and budget. Does NOT contact vendors or order — that requires the gated /submit-catering-request.",
        "x-pricing": {
          "price": 0.5
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SourceRequest"
              },
              "example": {
                "attendee_count": 40,
                "budget": {
                  "total_usd": 800,
                  "per_person_cap_usd": 20
                },
                "dietary_restrictions": [
                  "vegetarian",
                  "halal"
                ],
                "cuisine_preferences": [
                  "mediterranean"
                ],
                "delivery_window": {
                  "date": "2026-06-18",
                  "earliest": "11:30",
                  "latest": "12:00"
                },
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "address": "300 Congress Ave"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Catering plan with recommended order.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CateringPlanResponse"
                },
                "example": {
                  "request_id": "req_8f3a2c1e9b7d",
                  "confidence": {
                    "score": 0.88,
                    "level": "high",
                    "rationale": "Three vendors meet budget, diet, and delivery-window constraints with strong ratings and verified lead times."
                  },
                  "privacy": {
                    "pii_included": false,
                    "attendee_data": "aggregate_counts_and_diet_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "catering_marketplace_apis",
                      "public_menu_data",
                      "caller_supplied_event_details"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Prepare the recommended order for human review before any vendor contact.",
                      "rationale": "Vendor contact and ordering are execution-gated.",
                      "chain_to_endpoint": "POST /prepare-catering-order"
                    },
                    {
                      "priority": 2,
                      "action": "Submit the catering request once a human approval token is issued.",
                      "rationale": "Money-moving, outward-facing action requires approval.",
                      "chain_to_endpoint": "POST /submit-catering-request"
                    },
                    {
                      "priority": 3,
                      "action": "Vet the recommended caterer's reputation before ordering.",
                      "chain_to_endpoint": "POST /analyze-review-sentiment"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /discover-restaurants",
                      "reason": "Find additional vendor candidates by cuisine."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Vet a shortlisted caterer's reputation before ordering."
                    }
                  ],
                  "attendee_count": 40,
                  "vendor_options": [
                    {
                      "vendor_id": "v_1",
                      "name": "Olive & Cedar Mediterranean Catering",
                      "cuisine": [
                        "mediterranean"
                      ],
                      "rating": 4.7,
                      "est_total_usd": 760.0,
                      "per_person_usd": 19.0,
                      "lead_time_hours": 24,
                      "dietary_coverage": [
                        "vegetarian",
                        "halal",
                        "vegan"
                      ],
                      "min_order_people": 20
                    },
                    {
                      "vendor_id": "v_2",
                      "name": "Saffron Table Catering",
                      "cuisine": [
                        "mediterranean",
                        "indian"
                      ],
                      "rating": 4.5,
                      "est_total_usd": 720.0,
                      "per_person_usd": 18.0,
                      "lead_time_hours": 36,
                      "dietary_coverage": [
                        "vegetarian",
                        "halal"
                      ],
                      "min_order_people": 25
                    },
                    {
                      "vendor_id": "v_3",
                      "name": "Levant Kitchen",
                      "cuisine": [
                        "mediterranean"
                      ],
                      "rating": 4.3,
                      "est_total_usd": 788.0,
                      "per_person_usd": 19.7,
                      "lead_time_hours": 18,
                      "dietary_coverage": [
                        "vegetarian",
                        "halal"
                      ],
                      "min_order_people": 15
                    }
                  ],
                  "recommended_order": {
                    "recommended_order_id": "rec_9",
                    "vendor_id": "v_1",
                    "items": [
                      {
                        "item": "Mediterranean Mezze Platter (serves 10)",
                        "quantity": 4,
                        "serves": 40,
                        "unit_price_usd": 89.0,
                        "dietary_tags": [
                          "vegetarian",
                          "halal"
                        ]
                      },
                      {
                        "item": "Halal Chicken Shawarma Tray (serves 10)",
                        "quantity": 2,
                        "serves": 20,
                        "unit_price_usd": 110.0,
                        "dietary_tags": [
                          "halal"
                        ]
                      },
                      {
                        "item": "Falafel & Hummus Tray (serves 10)",
                        "quantity": 2,
                        "serves": 20,
                        "unit_price_usd": 75.0,
                        "dietary_tags": [
                          "vegetarian",
                          "vegan",
                          "halal"
                        ]
                      },
                      {
                        "item": "Pita & Mixed Greens Salad (serves 20)",
                        "quantity": 2,
                        "serves": 40,
                        "unit_price_usd": 45.0,
                        "dietary_tags": [
                          "vegetarian",
                          "halal"
                        ]
                      }
                    ],
                    "subtotal_usd": 666.0,
                    "delivery_fee_usd": 35.0,
                    "tax_usd": 59.0,
                    "total_usd": 760.0,
                    "per_person_usd": 19.0
                  },
                  "approval_required": true,
                  "next_step": {
                    "description": "Recommended order is ready. Prepare and submit it for human approval before any vendor contact or payment occurs.",
                    "gated_endpoint": "POST /submit-catering-request"
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/prepare-catering-order": {
      "post": {
        "operationId": "prepareCateringOrder",
        "tags": [
          "ordering"
        ],
        "summary": "Assemble a final catering order for review.",
        "description": "Returns a fully-priced order_summary and approval_required flag. No vendor contact or payment occurs here.",
        "x-pricing": {
          "price": 0.15
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PrepareOrderRequest"
              },
              "example": {
                "vendor_id": "v_1",
                "recommended_order_id": "rec_9",
                "delivery_window": {
                  "date": "2026-06-18",
                  "earliest": "11:30",
                  "latest": "12:00"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Prepared catering order.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PrepareOrderResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/submit-catering-request": {
      "post": {
        "operationId": "submitCateringRequest",
        "tags": [
          "ordering"
        ],
        "summary": "[GATED] Contact vendor / submit catering order. Requires human approval.",
        "description": "Submits the order to the vendor (and/or initiates direct vendor contact). Risky, outward-facing, money-moving: with no approval_token it returns approval_required=true and execution_gate.status=pending_approval and performs NO contact or payment. With a valid approval_token it executes.",
        "x-pricing": {
          "price": 1.0
        },
        "x-execution-gate": true,
        "x-human-approval-required": true,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubmitRequest"
              },
              "example": {
                "order_id": "ord_77",
                "payment_method_token": "pm_***",
                "contact_vendor": true,
                "approval_token": null
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Pending-approval gate (no contact/payment) or confirmed submission (with valid token).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SubmitResponse"
                },
                "example": {
                  "request_id": "req_a17c93f0e482",
                  "confidence": {
                    "score": 0.95,
                    "level": "high",
                    "rationale": "Order is complete and valid; the only blocker to execution is the missing human approval token."
                  },
                  "privacy": {
                    "pii_included": false,
                    "attendee_data": "aggregate_counts_and_diet_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "caller_supplied_event_details"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Obtain a human-issued approval token and resubmit to execute the order.",
                      "rationale": "Vendor contact and payment are execution-gated and were NOT performed.",
                      "chain_to_endpoint": "POST /submit-catering-request"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Vet a shortlisted caterer's reputation before ordering."
                    }
                  ],
                  "approval_required": true,
                  "execution_gate": {
                    "required": true,
                    "status": "pending_approval",
                    "approval_token_hint": "Provide a human-issued approval_token to authorize vendor contact and payment.",
                    "irreversible": true
                  },
                  "submitted": false,
                  "vendor_confirmation_id": null,
                  "order_summary": {
                    "order_id": "ord_77",
                    "total_usd": 760.0,
                    "delivery_window": {
                      "date": "2026-06-18",
                      "earliest": "11:30",
                      "latest": "12:00"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "403": {
            "description": "Approval token invalid, expired, or revoked.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "attendee_data": {
            "type": "string",
            "enum": [
              "aggregate_counts_and_diet_only",
              "none"
            ],
            "default": "aggregate_counts_and_diet_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ExecutionGate": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "required",
          "status"
        ],
        "properties": {
          "required": {
            "type": "boolean"
          },
          "status": {
            "type": "string",
            "enum": [
              "not_required",
              "pending_approval",
              "approved",
              "executed",
              "rejected"
            ]
          },
          "approval_token_hint": {
            "type": "string"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "irreversible": {
            "type": "boolean"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Budget": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "total_usd": {
            "type": "number"
          },
          "per_person_cap_usd": {
            "type": "number"
          },
          "currency": {
            "type": "string",
            "default": "USD"
          }
        }
      },
      "DeliveryWindow": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "date": {
            "type": "string",
            "format": "date"
          },
          "earliest": {
            "type": "string"
          },
          "latest": {
            "type": "string"
          }
        }
      },
      "Location": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "address": {
            "type": "string"
          }
        }
      },
      "VendorOption": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "vendor_id",
          "name",
          "est_total_usd"
        ],
        "properties": {
          "vendor_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "rating": {
            "type": "number",
            "minimum": 0,
            "maximum": 5
          },
          "est_total_usd": {
            "type": "number"
          },
          "per_person_usd": {
            "type": "number"
          },
          "lead_time_hours": {
            "type": "number"
          },
          "dietary_coverage": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "min_order_people": {
            "type": "integer"
          }
        }
      },
      "RecommendedOrderItem": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "item",
          "quantity",
          "serves"
        ],
        "properties": {
          "item": {
            "type": "string"
          },
          "quantity": {
            "type": "integer"
          },
          "serves": {
            "type": "integer"
          },
          "unit_price_usd": {
            "type": "number"
          },
          "dietary_tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedOrder": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "recommended_order_id",
          "vendor_id",
          "items",
          "total_usd"
        ],
        "properties": {
          "recommended_order_id": {
            "type": "string"
          },
          "vendor_id": {
            "type": "string"
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedOrderItem"
            }
          },
          "subtotal_usd": {
            "type": "number"
          },
          "delivery_fee_usd": {
            "type": "number"
          },
          "tax_usd": {
            "type": "number"
          },
          "total_usd": {
            "type": "number"
          },
          "per_person_usd": {
            "type": "number"
          }
        }
      },
      "SourceRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "attendee_count",
          "budget"
        ],
        "properties": {
          "attendee_count": {
            "type": "integer",
            "minimum": 1
          },
          "budget": {
            "$ref": "#/components/schemas/Budget"
          },
          "dietary_restrictions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "cuisine_preferences": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "delivery_window": {
            "$ref": "#/components/schemas/DeliveryWindow"
          },
          "location": {
            "$ref": "#/components/schemas/Location"
          }
        }
      },
      "SourceResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "attendee_count",
              "vendor_options"
            ],
            "properties": {
              "attendee_count": {
                "type": "integer"
              },
              "vendor_options": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/VendorOption"
                }
              }
            }
          }
        ]
      },
      "CompareVendorsRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "vendor_ids",
          "dimensions"
        ],
        "properties": {
          "vendor_ids": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "dimensions": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "price",
                "rating",
                "lead_time",
                "dietary_coverage",
                "min_order"
              ]
            }
          }
        }
      },
      "CompareVendorsResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "comparison",
              "recommended_vendor_id"
            ],
            "properties": {
              "recommended_vendor_id": {
                "type": "string"
              },
              "comparison": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "vendor_id",
                    "name"
                  ],
                  "properties": {
                    "vendor_id": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "values": {
                      "type": "object",
                      "additionalProperties": true
                    }
                  }
                }
              }
            }
          }
        ]
      },
      "CateringPlanResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "attendee_count",
              "vendor_options",
              "recommended_order",
              "approval_required"
            ],
            "properties": {
              "attendee_count": {
                "type": "integer"
              },
              "vendor_options": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/VendorOption"
                }
              },
              "recommended_order": {
                "$ref": "#/components/schemas/RecommendedOrder"
              },
              "approval_required": {
                "type": "boolean",
                "description": "True — vendor contact/order requires gated /submit-catering-request."
              },
              "next_step": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "gated_endpoint": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ]
      },
      "PrepareOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "vendor_id",
          "recommended_order_id"
        ],
        "properties": {
          "vendor_id": {
            "type": "string"
          },
          "recommended_order_id": {
            "type": "string"
          },
          "delivery_window": {
            "$ref": "#/components/schemas/DeliveryWindow"
          }
        }
      },
      "PrepareOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "order_summary",
              "approval_required"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean"
              },
              "order_summary": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "order_id",
                  "total_usd",
                  "per_person_usd"
                ],
                "properties": {
                  "order_id": {
                    "type": "string"
                  },
                  "vendor_id": {
                    "type": "string"
                  },
                  "total_usd": {
                    "type": "number"
                  },
                  "per_person_usd": {
                    "type": "number"
                  },
                  "delivery_window": {
                    "$ref": "#/components/schemas/DeliveryWindow"
                  }
                }
              }
            }
          }
        ]
      },
      "SubmitRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "order_id"
        ],
        "properties": {
          "order_id": {
            "type": "string"
          },
          "payment_method_token": {
            "type": "string"
          },
          "contact_vendor": {
            "type": "boolean",
            "default": true
          },
          "approval_token": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-issued approval token. Null/omitted ⇒ gate returns pending_approval and no contact/payment occurs."
          }
        }
      },
      "SubmitResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "approval_required",
              "execution_gate",
              "submitted"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean"
              },
              "execution_gate": {
                "$ref": "#/components/schemas/ExecutionGate"
              },
              "submitted": {
                "type": "boolean",
                "description": "True only when a valid approval_token was supplied and the request executed."
              },
              "vendor_confirmation_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "order_summary": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "order_id": {
                    "type": "string"
                  },
                  "total_usd": {
                    "type": "number"
                  },
                  "delivery_window": {
                    "$ref": "#/components/schemas/DeliveryWindow"
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 08. Multi-Restaurant Ordering API  (`/multi-restaurant-ordering`)

**Base URL:** `https://orbis-apis.onrender.com/multi-restaurant-ordering`  ·  **openapi.json:** `https://orbis-apis.onrender.com/multi-restaurant-ordering/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/multi-restaurant-ordering/`

## 08.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Multi-Restaurant Ordering API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/search-restaurants",
      "price_usd": 0.02,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/build-order",
      "price_usd": 0.05,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/price-order",
      "price_usd": 0.05,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/prepare-checkout",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/place-order",
      "price_usd": 1.5,
      "gated": true
    },
    {
      "method": "POST",
      "path": "/quick-order",
      "price_usd": 0.2,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /quick-order",
  "execution_gates": [
    "POST /place-order"
  ],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest",
      "PCI_DSS_tokenized_payments"
    ],
    "data_sources": [
      "delivery_marketplace_apis",
      "public_menu_data",
      "geocoding"
    ],
    "delivery_address": "used_for_fulfillment_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /quick-order to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /match-restaurant-to-intent",
      "reason": "Seed the search with intent-matched restaurants."
    },
    {
      "api": "Office Lunch Planner API",
      "endpoint": "POST /build-group-order",
      "reason": "Convert a team lunch into a multi-restaurant cart."
    },
    {
      "api": "Reservation Intelligence API",
      "endpoint": "POST /find-availability",
      "reason": "Offer dine-in as an alternative to delivery."
    }
  ]
}
```

## 08.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Multi-Restaurant Ordering API",
    "version": "1.0.0",
    "summary": "Compare restaurants, build a cart, estimate price, and place a (human-approved) order across multiple restaurants.",
    "description": "Agent-native ordering across multiple restaurants. Search and compare, build a multi-restaurant cart, price it with substitution_options and dietary_flags, prepare checkout, and place the order. Order placement is execution-gated and requires explicit human approval before any payment or final submission. Built for concierge, assistant, and consumer-commerce agents.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /search-restaurants": 0.02,
      "POST /build-order": 0.05,
      "POST /price-order": 0.05,
      "POST /prepare-checkout": 0.1,
      "POST /place-order": 1.5,
      "POST /quick-order": 0.2
    },
    "notes": "quick-order is the one-call workflow (search+build+price+prepare). place-order is execution-gated and bills only on approved execution."
  },
  "x-privacy": {
    "pii_handling": "minimized",
    "delivery_address": "used_for_fulfillment_only",
    "retention_days": 30,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest",
      "PCI_DSS_tokenized_payments"
    ],
    "data_sources": [
      "delivery_marketplace_apis",
      "public_menu_data",
      "geocoding"
    ]
  },
  "x-chain-to": [
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /match-restaurant-to-intent",
      "reason": "Seed the search with intent-matched restaurants."
    },
    {
      "api": "Office Lunch Planner API",
      "endpoint": "POST /build-group-order",
      "reason": "Convert a team lunch into a multi-restaurant cart."
    },
    {
      "api": "Reservation Intelligence API",
      "endpoint": "POST /find-availability",
      "reason": "Offer dine-in as an alternative to delivery."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/multi-restaurant-ordering",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "cart"
    },
    {
      "name": "checkout"
    },
    {
      "name": "workflow"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, execution gates, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Multi-Restaurant Ordering API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/search-restaurants",
                      "price_usd": 0.02,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/build-order",
                      "price_usd": 0.05,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/price-order",
                      "price_usd": 0.05,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/prepare-checkout",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/place-order",
                      "price_usd": 1.5,
                      "gated": true
                    },
                    {
                      "method": "POST",
                      "path": "/quick-order",
                      "price_usd": 0.2,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /quick-order",
                  "execution_gates": [
                    "POST /place-order"
                  ],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest",
                      "PCI_DSS_tokenized_payments"
                    ],
                    "data_sources": [
                      "delivery_marketplace_apis",
                      "public_menu_data",
                      "geocoding"
                    ],
                    "delivery_address": "used_for_fulfillment_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /quick-order to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Seed the search with intent-matched restaurants."
                    },
                    {
                      "api": "Office Lunch Planner API",
                      "endpoint": "POST /build-group-order",
                      "reason": "Convert a team lunch into a multi-restaurant cart."
                    },
                    {
                      "api": "Reservation Intelligence API",
                      "endpoint": "POST /find-availability",
                      "reason": "Offer dine-in as an alternative to delivery."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/search-restaurants": {
      "post": {
        "operationId": "searchRestaurants",
        "tags": [
          "cart"
        ],
        "summary": "Search restaurants available for ordering.",
        "description": "Returns orderable restaurants with delivery availability and ETA.",
        "x-pricing": {
          "price": 0.02
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SearchRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "address": "300 Congress Ave"
                },
                "cuisine": [
                  "thai",
                  "sushi"
                ],
                "fulfillment": "delivery",
                "open_now": true
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Orderable restaurants.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "example": {
                  "request_id": "req_3e7a5d1908cb42f6",
                  "confidence": {
                    "score": 0.88,
                    "level": "high",
                    "rationale": "Restaurants matched on requested cuisines, confirmed open and delivery-available to the supplied address."
                  },
                  "privacy": {
                    "pii_included": false,
                    "delivery_address": "used_for_fulfillment_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "delivery_marketplace_apis",
                      "public_menu_data",
                      "geocoding"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Build a multi-restaurant cart from the matched restaurants.",
                      "rationale": "Two open, delivery-available restaurants cover the requested thai and sushi cuisines.",
                      "chain_to_endpoint": "POST /build-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Seed the search with intent-matched restaurants."
                    }
                  ],
                  "restaurants": [
                    {
                      "restaurant_id": "r_thai_42",
                      "name": "Bangkok Cuisine",
                      "cuisine": [
                        "thai"
                      ],
                      "rating": 4.6,
                      "delivery_available": true,
                      "delivery_eta_minutes": 38,
                      "min_order_usd": 15.0
                    },
                    {
                      "restaurant_id": "r_sushi_18",
                      "name": "Sushi Junai",
                      "cuisine": [
                        "sushi",
                        "japanese"
                      ],
                      "rating": 4.8,
                      "delivery_available": true,
                      "delivery_eta_minutes": 45,
                      "min_order_usd": 20.0
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/build-order": {
      "post": {
        "operationId": "buildOrder",
        "tags": [
          "cart"
        ],
        "summary": "Build a multi-restaurant cart.",
        "description": "Returns a cart spanning one or more restaurants with dietary_flags per line.",
        "x-pricing": {
          "price": 0.05
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/BuildOrderRequest"
              },
              "example": {
                "items": [
                  {
                    "restaurant_id": "r_1",
                    "item": "Pad Thai",
                    "quantity": 2
                  },
                  {
                    "restaurant_id": "r_2",
                    "item": "Salmon Roll",
                    "quantity": 3
                  }
                ],
                "dietary_requirements": [
                  "gluten_free"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Built cart.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BuildOrderResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/price-order": {
      "post": {
        "operationId": "priceOrder",
        "tags": [
          "cart"
        ],
        "summary": "Price the cart with fees, substitutions, and dietary flags.",
        "description": "Returns total_cost, delivery_eta, substitution_options, and dietary_flags.",
        "x-pricing": {
          "price": 0.05
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PriceOrderRequest"
              },
              "example": {
                "cart_id": "cart_31"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Priced cart.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PriceOrderResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/prepare-checkout": {
      "post": {
        "operationId": "prepareCheckout",
        "tags": [
          "checkout"
        ],
        "summary": "Assemble a checkout summary for review.",
        "description": "Returns checkout_summary, total_cost, delivery_eta, and approval_required. No payment occurs.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PrepareCheckoutRequest"
              },
              "example": {
                "cart_id": "cart_31",
                "tip_percent": 18
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Prepared checkout.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PrepareCheckoutResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/place-order": {
      "post": {
        "operationId": "placeOrder",
        "tags": [
          "checkout"
        ],
        "summary": "[GATED] Place the order. Payment/submission requires human approval.",
        "description": "Submits the order and charges payment. Risky, irreversible, money-moving: with no approval_token it returns approval_required=true and execution_gate.status=pending_approval and performs NO payment or submission. With a valid approval_token it executes.",
        "x-pricing": {
          "price": 1.5
        },
        "x-execution-gate": true,
        "x-human-approval-required": true,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PlaceOrderRequest"
              },
              "example": {
                "cart_id": "cart_31",
                "payment_method_token": "pm_***",
                "approval_token": null
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Pending-approval gate (no payment) or confirmed order (with valid token).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PlaceOrderResponse"
                },
                "example": {
                  "request_id": "req_b41d8e02a6f74c39",
                  "confidence": {
                    "score": 0.99,
                    "level": "high",
                    "rationale": "Cart resolved and priced; payment and submission withheld pending human approval per execution gate."
                  },
                  "privacy": {
                    "pii_included": true,
                    "delivery_address": "used_for_fulfillment_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest",
                      "PCI_DSS_tokenized_payments"
                    ],
                    "data_sources": [
                      "delivery_marketplace_apis",
                      "public_menu_data",
                      "geocoding"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Obtain a human-issued approval_token and re-call /place-order to execute payment and submission.",
                      "rationale": "This action is irreversible and money-moving; no charge has been made.",
                      "chain_to_endpoint": "POST /place-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Reservation Intelligence API",
                      "endpoint": "POST /find-availability",
                      "reason": "Offer dine-in as an alternative to delivery."
                    }
                  ],
                  "approval_required": true,
                  "execution_gate": {
                    "required": true,
                    "status": "pending_approval",
                    "approval_token_hint": "Supply a human-issued approval_token in the request body to execute.",
                    "expires_at": "2026-06-04T18:20:00Z",
                    "irreversible": true
                  },
                  "placed": false,
                  "order_confirmation_id": null,
                  "checkout_summary": {
                    "cart_id": "cart_7c21",
                    "line_items": [
                      {
                        "line_id": "ln_1",
                        "restaurant_id": "r_thai_42",
                        "restaurant_name": "Bangkok Cuisine",
                        "item": "Pad Thai",
                        "quantity": 2,
                        "unit_price_usd": 14.95,
                        "dietary_flags": [
                          "contains_gluten",
                          "contains_peanuts"
                        ]
                      },
                      {
                        "line_id": "ln_2",
                        "restaurant_id": "r_sushi_18",
                        "restaurant_name": "Sushi Junai",
                        "item": "Salmon Roll",
                        "quantity": 3,
                        "unit_price_usd": 8.5,
                        "dietary_flags": [
                          "contains_fish",
                          "gluten_free"
                        ]
                      }
                    ],
                    "subtotal_usd": 55.4,
                    "delivery_fees_usd": 7.98,
                    "tax_usd": 4.57,
                    "tip_usd": 9.97,
                    "total_cost": 77.92,
                    "delivery_eta": {
                      "minutes": 45,
                      "window_start": "2026-06-04T18:35:00Z",
                      "window_end": "2026-06-04T18:50:00Z",
                      "per_restaurant": [
                        {
                          "restaurant_id": "r_thai_42",
                          "minutes": 38
                        },
                        {
                          "restaurant_id": "r_sushi_18",
                          "minutes": 45
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "403": {
            "description": "Approval token invalid, expired, or revoked.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/quick-order": {
      "post": {
        "operationId": "quickOrder",
        "tags": [
          "workflow"
        ],
        "summary": "One-call workflow — search, build, price, and prepare checkout.",
        "description": "Orchestrates search-restaurants + build-order + price-order + prepare-checkout and returns a ready checkout_summary with approval_required. Does NOT place the order — that requires gated /place-order.",
        "x-pricing": {
          "price": 0.2
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/QuickOrderRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX",
                  "address": "300 Congress Ave"
                },
                "requests": [
                  {
                    "cuisine": "thai",
                    "item_hint": "pad thai",
                    "quantity": 2
                  },
                  {
                    "cuisine": "sushi",
                    "item_hint": "salmon roll",
                    "quantity": 3
                  }
                ],
                "dietary_requirements": [
                  "gluten_free"
                ],
                "tip_percent": 18
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ready-to-approve checkout across restaurants.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QuickOrderResponse"
                },
                "example": {
                  "request_id": "req_9f3a2c1e7b8d4a51",
                  "confidence": {
                    "score": 0.92,
                    "level": "high",
                    "rationale": "All requested items matched in-stock menu items at open, delivery-available restaurants within range."
                  },
                  "privacy": {
                    "pii_included": true,
                    "delivery_address": "used_for_fulfillment_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest",
                      "PCI_DSS_tokenized_payments"
                    ],
                    "data_sources": [
                      "delivery_marketplace_apis",
                      "public_menu_data",
                      "geocoding"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Review the checkout summary and dietary flags, then approve to place the order.",
                      "rationale": "Order is priced and ready; placement is execution-gated and requires human approval.",
                      "chain_to_endpoint": "POST /place-order"
                    },
                    {
                      "priority": 2,
                      "action": "Consider the suggested gluten-free substitution for the Pad Thai line.",
                      "rationale": "One line item carries a gluten dietary flag with a compliant substitute available.",
                      "chain_to_endpoint": "POST /price-order"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Reservation Intelligence API",
                      "endpoint": "POST /find-availability",
                      "reason": "Offer dine-in as an alternative to delivery."
                    }
                  ],
                  "checkout_summary": {
                    "cart_id": "cart_7c21",
                    "line_items": [
                      {
                        "line_id": "ln_1",
                        "restaurant_id": "r_thai_42",
                        "restaurant_name": "Bangkok Cuisine",
                        "item": "Pad Thai",
                        "quantity": 2,
                        "unit_price_usd": 14.95,
                        "dietary_flags": [
                          "contains_gluten",
                          "contains_peanuts"
                        ]
                      },
                      {
                        "line_id": "ln_2",
                        "restaurant_id": "r_sushi_18",
                        "restaurant_name": "Sushi Junai",
                        "item": "Salmon Roll",
                        "quantity": 3,
                        "unit_price_usd": 8.5,
                        "dietary_flags": [
                          "contains_fish",
                          "gluten_free"
                        ]
                      }
                    ],
                    "subtotal_usd": 55.4,
                    "delivery_fees_usd": 7.98,
                    "tax_usd": 4.57,
                    "tip_usd": 9.97,
                    "total_cost": 77.92,
                    "delivery_eta": {
                      "minutes": 45,
                      "window_start": "2026-06-04T18:35:00Z",
                      "window_end": "2026-06-04T18:50:00Z",
                      "per_restaurant": [
                        {
                          "restaurant_id": "r_thai_42",
                          "minutes": 38
                        },
                        {
                          "restaurant_id": "r_sushi_18",
                          "minutes": 45
                        }
                      ]
                    }
                  },
                  "total_cost": 77.92,
                  "delivery_eta": {
                    "minutes": 45,
                    "window_start": "2026-06-04T18:35:00Z",
                    "window_end": "2026-06-04T18:50:00Z",
                    "per_restaurant": [
                      {
                        "restaurant_id": "r_thai_42",
                        "minutes": 38
                      },
                      {
                        "restaurant_id": "r_sushi_18",
                        "minutes": 45
                      }
                    ]
                  },
                  "substitution_options": [
                    {
                      "line_id": "ln_1",
                      "suggested_item": "Gluten-Free Pad Thai (rice noodles, tamari)",
                      "reason": "Requested gluten_free diet; default Pad Thai contains soy sauce with gluten.",
                      "price_delta_usd": 1.5
                    }
                  ],
                  "dietary_flags": [
                    "contains_gluten",
                    "contains_peanuts",
                    "contains_fish",
                    "gluten_free"
                  ],
                  "approval_required": true,
                  "next_step": {
                    "description": "Order is priced and ready. Call the gated /place-order endpoint with a human-issued approval_token to submit and charge.",
                    "gated_endpoint": "POST /place-order"
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "delivery_address": {
            "type": "string",
            "enum": [
              "used_for_fulfillment_only",
              "none"
            ],
            "default": "used_for_fulfillment_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ExecutionGate": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "required",
          "status"
        ],
        "properties": {
          "required": {
            "type": "boolean"
          },
          "status": {
            "type": "string",
            "enum": [
              "not_required",
              "pending_approval",
              "approved",
              "executed",
              "rejected"
            ]
          },
          "approval_token_hint": {
            "type": "string"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "irreversible": {
            "type": "boolean"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Location": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "address": {
            "type": "string"
          },
          "lat": {
            "type": "number"
          },
          "lng": {
            "type": "number"
          }
        }
      },
      "OrderableRestaurant": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant_id",
          "name"
        ],
        "properties": {
          "restaurant_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "rating": {
            "type": "number",
            "minimum": 0,
            "maximum": 5
          },
          "delivery_available": {
            "type": "boolean"
          },
          "delivery_eta_minutes": {
            "type": "integer"
          },
          "min_order_usd": {
            "type": "number"
          }
        }
      },
      "CartLine": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant_id",
          "item",
          "quantity"
        ],
        "properties": {
          "line_id": {
            "type": "string"
          },
          "restaurant_id": {
            "type": "string"
          },
          "restaurant_name": {
            "type": "string"
          },
          "item": {
            "type": "string"
          },
          "quantity": {
            "type": "integer"
          },
          "unit_price_usd": {
            "type": "number"
          },
          "dietary_flags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "SubstitutionOption": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "line_id",
          "suggested_item",
          "reason"
        ],
        "properties": {
          "line_id": {
            "type": "string"
          },
          "suggested_item": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          },
          "price_delta_usd": {
            "type": "number"
          }
        }
      },
      "DeliveryEta": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "minutes": {
            "type": "integer"
          },
          "window_start": {
            "type": "string"
          },
          "window_end": {
            "type": "string"
          },
          "per_restaurant": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "restaurant_id": {
                  "type": "string"
                },
                "minutes": {
                  "type": "integer"
                }
              }
            }
          }
        }
      },
      "CheckoutSummary": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "total_cost",
          "delivery_eta"
        ],
        "properties": {
          "cart_id": {
            "type": "string"
          },
          "line_items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/CartLine"
            }
          },
          "subtotal_usd": {
            "type": "number"
          },
          "delivery_fees_usd": {
            "type": "number"
          },
          "tax_usd": {
            "type": "number"
          },
          "tip_usd": {
            "type": "number"
          },
          "total_cost": {
            "type": "number"
          },
          "delivery_eta": {
            "$ref": "#/components/schemas/DeliveryEta"
          }
        }
      },
      "SearchRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "fulfillment": {
            "type": "string",
            "enum": [
              "delivery",
              "pickup"
            ],
            "default": "delivery"
          },
          "open_now": {
            "type": "boolean",
            "default": true
          }
        }
      },
      "SearchResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "restaurants"
            ],
            "properties": {
              "restaurants": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/OrderableRestaurant"
                }
              }
            }
          }
        ]
      },
      "BuildOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "items"
        ],
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "restaurant_id",
                "item",
                "quantity"
              ],
              "properties": {
                "restaurant_id": {
                  "type": "string"
                },
                "item": {
                  "type": "string"
                },
                "quantity": {
                  "type": "integer"
                }
              }
            }
          },
          "dietary_requirements": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "BuildOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "cart_id",
              "line_items",
              "dietary_flags"
            ],
            "properties": {
              "cart_id": {
                "type": "string"
              },
              "line_items": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/CartLine"
                }
              },
              "dietary_flags": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        ]
      },
      "PriceOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "cart_id"
        ],
        "properties": {
          "cart_id": {
            "type": "string"
          }
        }
      },
      "PriceOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "total_cost",
              "delivery_eta",
              "substitution_options",
              "dietary_flags"
            ],
            "properties": {
              "total_cost": {
                "type": "number"
              },
              "delivery_eta": {
                "$ref": "#/components/schemas/DeliveryEta"
              },
              "substitution_options": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/SubstitutionOption"
                }
              },
              "dietary_flags": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        ]
      },
      "PrepareCheckoutRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "cart_id"
        ],
        "properties": {
          "cart_id": {
            "type": "string"
          },
          "tip_percent": {
            "type": "number",
            "default": 15
          }
        }
      },
      "PrepareCheckoutResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "checkout_summary",
              "total_cost",
              "delivery_eta",
              "approval_required"
            ],
            "properties": {
              "checkout_summary": {
                "$ref": "#/components/schemas/CheckoutSummary"
              },
              "total_cost": {
                "type": "number"
              },
              "delivery_eta": {
                "$ref": "#/components/schemas/DeliveryEta"
              },
              "substitution_options": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/SubstitutionOption"
                }
              },
              "dietary_flags": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "approval_required": {
                "type": "boolean",
                "description": "True — placing the order requires gated /place-order."
              },
              "next_step": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "gated_endpoint": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ]
      },
      "PlaceOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "cart_id"
        ],
        "properties": {
          "cart_id": {
            "type": "string"
          },
          "payment_method_token": {
            "type": "string"
          },
          "approval_token": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-issued approval token. Null/omitted ⇒ gate returns pending_approval and no payment occurs."
          }
        }
      },
      "PlaceOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "approval_required",
              "execution_gate",
              "placed",
              "checkout_summary"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean"
              },
              "execution_gate": {
                "$ref": "#/components/schemas/ExecutionGate"
              },
              "placed": {
                "type": "boolean",
                "description": "True only when a valid approval_token was supplied and the order was placed."
              },
              "order_confirmation_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "checkout_summary": {
                "$ref": "#/components/schemas/CheckoutSummary"
              }
            }
          }
        ]
      },
      "QuickOrderRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location",
          "requests"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "requests": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "cuisine",
                "item_hint",
                "quantity"
              ],
              "properties": {
                "cuisine": {
                  "type": "string"
                },
                "item_hint": {
                  "type": "string"
                },
                "quantity": {
                  "type": "integer"
                }
              }
            }
          },
          "dietary_requirements": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "tip_percent": {
            "type": "number",
            "default": 15
          }
        }
      },
      "QuickOrderResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "checkout_summary",
              "total_cost",
              "delivery_eta",
              "substitution_options",
              "dietary_flags",
              "approval_required"
            ],
            "properties": {
              "checkout_summary": {
                "$ref": "#/components/schemas/CheckoutSummary"
              },
              "total_cost": {
                "type": "number"
              },
              "delivery_eta": {
                "$ref": "#/components/schemas/DeliveryEta"
              },
              "substitution_options": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/SubstitutionOption"
                }
              },
              "dietary_flags": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "approval_required": {
                "type": "boolean"
              },
              "next_step": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "gated_endpoint": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 09. Reservation Intelligence API  (`/reservation-intelligence`)

**Base URL:** `https://orbis-apis.onrender.com/reservation-intelligence`  ·  **openapi.json:** `https://orbis-apis.onrender.com/reservation-intelligence/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/reservation-intelligence/`

## 09.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Reservation Intelligence API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/find-availability",
      "price_usd": 0.03,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/recommend-reservation",
      "price_usd": 0.15,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/predict-no-show-risk",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/optimize-seating",
      "price_usd": 0.1,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/prepare-reservation",
      "price_usd": 0.5,
      "gated": true
    }
  ],
  "one_call_workflow": "POST /recommend-reservation",
  "execution_gates": [
    "POST /prepare-reservation"
  ],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "reservation_platform_apis",
      "public_business_listings",
      "caller_supplied_booking_details"
    ],
    "guest_data": "name_and_party_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /recommend-reservation to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /match-restaurant-to-intent",
      "reason": "Source candidate restaurants before checking availability."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Validate a venue's reputation before booking."
    },
    {
      "api": "Multi-Restaurant Ordering API",
      "endpoint": "POST /search-restaurants",
      "reason": "Offer delivery if no suitable table is available."
    }
  ]
}
```

## 09.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Reservation Intelligence API",
    "version": "1.0.0",
    "summary": "Find availability, recommend and optimize reservations, predict no-show risk, and prepare (human-approved) bookings.",
    "description": "Agent-native reservation intelligence. Find availability by party_size, time_window, and cuisine; recommend the best slot with a recommendation_reason; predict no_show_risk; optimize seating; and prepare a booking. Making or modifying a reservation is execution-gated and requires explicit human approval. Built for concierge, assistant, and restaurant-host agents.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /find-availability": 0.03,
      "POST /recommend-reservation": 0.15,
      "POST /predict-no-show-risk": 0.1,
      "POST /optimize-seating": 0.1,
      "POST /prepare-reservation": 0.5
    },
    "notes": "recommend-reservation is the one-call workflow (availability + no-show + recommendation). prepare-reservation is execution-gated (book/modify) and bills only on approved execution."
  },
  "x-privacy": {
    "pii_handling": "minimized",
    "guest_data": "name_and_party_only",
    "retention_days": 30,
    "compliance": [
      "CCPA",
      "GDPR_legitimate_interest"
    ],
    "data_sources": [
      "reservation_platform_apis",
      "public_business_listings",
      "caller_supplied_booking_details"
    ]
  },
  "x-chain-to": [
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /match-restaurant-to-intent",
      "reason": "Source candidate restaurants before checking availability."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Validate a venue's reputation before booking."
    },
    {
      "api": "Multi-Restaurant Ordering API",
      "endpoint": "POST /search-restaurants",
      "reason": "Offer delivery if no suitable table is available."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/reservation-intelligence",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "availability"
    },
    {
      "name": "intelligence"
    },
    {
      "name": "booking"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, execution gates, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Reservation Intelligence API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/find-availability",
                      "price_usd": 0.03,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/recommend-reservation",
                      "price_usd": 0.15,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/predict-no-show-risk",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/optimize-seating",
                      "price_usd": 0.1,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/prepare-reservation",
                      "price_usd": 0.5,
                      "gated": true
                    }
                  ],
                  "one_call_workflow": "POST /recommend-reservation",
                  "execution_gates": [
                    "POST /prepare-reservation"
                  ],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "reservation_platform_apis",
                      "public_business_listings",
                      "caller_supplied_booking_details"
                    ],
                    "guest_data": "name_and_party_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /recommend-reservation to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Source candidate restaurants before checking availability."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Validate a venue's reputation before booking."
                    },
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /search-restaurants",
                      "reason": "Offer delivery if no suitable table is available."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/find-availability": {
      "post": {
        "operationId": "findAvailability",
        "tags": [
          "availability"
        ],
        "summary": "Find open reservation slots.",
        "description": "Returns availability slots by party_size, time_window, cuisine, and price_level.",
        "x-pricing": {
          "price": 0.03
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AvailabilityRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX"
                },
                "party_size": 4,
                "time_window": {
                  "date": "2026-06-12",
                  "earliest": "19:00",
                  "latest": "20:30"
                },
                "cuisine": [
                  "italian"
                ],
                "price_level": [
                  2,
                  3
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Availability slots.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AvailabilityResponse"
                },
                "example": {
                  "request_id": "req_avail_0a1b2c3d4e",
                  "confidence": {
                    "score": 0.82,
                    "level": "high",
                    "rationale": "Live availability pulled from reservation platform within the requested window; minor uncertainty from sub-minute slot churn."
                  },
                  "privacy": {
                    "pii_included": false,
                    "guest_data": "none",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "reservation_platform_apis",
                      "public_business_listings"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Rank the returned slots for the guest's occasion and party size.",
                      "rationale": "Multiple slots match; intelligence ranking surfaces the best fit.",
                      "chain_to_endpoint": "POST /recommend-reservation"
                    },
                    {
                      "priority": 2,
                      "action": "Prepare a booking for the chosen slot once confirmed by the guest.",
                      "rationale": "Booking is execution-gated and requires human approval.",
                      "chain_to_endpoint": "POST /prepare-reservation"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Source candidate restaurants before checking availability."
                    },
                    {
                      "api": "Multi-Restaurant Ordering API",
                      "endpoint": "POST /search-restaurants",
                      "reason": "Offer delivery if no suitable table is available."
                    }
                  ],
                  "availability": [
                    {
                      "slot_id": "slot_190000_r412",
                      "restaurant_id": "r_412",
                      "restaurant_name": "Trattoria Sole",
                      "time": "2026-06-12T19:00:00-05:00",
                      "party_size": 4,
                      "price_level": 3,
                      "seating_area": "indoor",
                      "deposit_required": false
                    },
                    {
                      "slot_id": "slot_194500_r412",
                      "restaurant_id": "r_412",
                      "restaurant_name": "Trattoria Sole",
                      "time": "2026-06-12T19:45:00-05:00",
                      "party_size": 4,
                      "price_level": 3,
                      "seating_area": "patio",
                      "deposit_required": true
                    },
                    {
                      "slot_id": "slot_201500_r256",
                      "restaurant_id": "r_256",
                      "restaurant_name": "Vinoteca Lupo",
                      "time": "2026-06-12T20:15:00-05:00",
                      "party_size": 4,
                      "price_level": 2,
                      "seating_area": "private",
                      "deposit_required": false
                    }
                  ]
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/recommend-reservation": {
      "post": {
        "operationId": "recommendReservation",
        "tags": [
          "intelligence",
          "booking"
        ],
        "summary": "One-call workflow — recommend the best reservation.",
        "description": "Orchestrates find-availability + predict-no-show-risk and returns a recommended slot with availability, price_level, no_show_risk, and a recommendation_reason. Does NOT book — that requires gated /prepare-reservation.",
        "x-pricing": {
          "price": 0.15
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RecommendRequest"
              },
              "example": {
                "location": {
                  "city": "Austin",
                  "state": "TX"
                },
                "party_size": 2,
                "occasion": "date_night",
                "time_window": {
                  "date": "2026-06-12",
                  "earliest": "19:00",
                  "latest": "21:00"
                },
                "cuisine": [
                  "italian"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Recommended reservation.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RecommendResponse"
                },
                "example": {
                  "request_id": "req_recmd_a1b2c3d4e5",
                  "confidence": {
                    "score": 0.88,
                    "level": "high",
                    "rationale": "Strong availability match for party of 2 within the requested window; venue has low historical no-show rate for date_night bookings."
                  },
                  "privacy": {
                    "pii_included": false,
                    "guest_data": "none",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "reservation_platform_apis",
                      "public_business_listings"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Confirm the recommended 19:30 patio slot with the guest before booking.",
                      "rationale": "Patio seating best fits a date_night occasion and the slot falls mid-window.",
                      "chain_to_endpoint": "POST /prepare-reservation"
                    },
                    {
                      "priority": 2,
                      "action": "Validate the venue's recent reputation before committing.",
                      "rationale": "Sentiment check reduces risk of a poor experience for a special occasion.",
                      "chain_to_endpoint": "POST /analyze-review-sentiment"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Validate a venue's reputation before booking."
                    },
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /match-restaurant-to-intent",
                      "reason": "Source additional candidate restaurants if the guest declines this slot."
                    }
                  ],
                  "recommended_slot": {
                    "slot_id": "slot_193000_r412",
                    "restaurant_id": "r_412",
                    "restaurant_name": "Trattoria Sole",
                    "time": "2026-06-12T19:30:00-05:00",
                    "party_size": 2,
                    "price_level": 3,
                    "seating_area": "patio",
                    "deposit_required": false
                  },
                  "alternatives": [
                    {
                      "slot_id": "slot_200000_r412",
                      "restaurant_id": "r_412",
                      "restaurant_name": "Trattoria Sole",
                      "time": "2026-06-12T20:00:00-05:00",
                      "party_size": 2,
                      "price_level": 3,
                      "seating_area": "indoor",
                      "deposit_required": false
                    },
                    {
                      "slot_id": "slot_191500_r087",
                      "restaurant_id": "r_087",
                      "restaurant_name": "Osteria Nord",
                      "time": "2026-06-12T19:15:00-05:00",
                      "party_size": 2,
                      "price_level": 2,
                      "seating_area": "indoor",
                      "deposit_required": false
                    }
                  ],
                  "no_show_risk": {
                    "score": 0.12,
                    "level": "low"
                  },
                  "recommendation_reason": "Trattoria Sole's 19:30 patio table best matches a 2-guest date_night within the 19:00-21:00 window, pairs an Italian menu with a low no-show risk, and requires no deposit."
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/predict-no-show-risk": {
      "post": {
        "operationId": "predictNoShowRisk",
        "tags": [
          "intelligence"
        ],
        "summary": "Predict no-show risk for a booking context.",
        "description": "Returns a no_show_risk score with contributing factors.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/NoShowRequest"
              },
              "example": {
                "party_size": 6,
                "time": "2026-06-12T19:00:00Z",
                "lead_time_days": 14,
                "deposit": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "No-show risk prediction.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NoShowResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/optimize-seating": {
      "post": {
        "operationId": "optimizeSeating",
        "tags": [
          "intelligence"
        ],
        "summary": "Optimize seating/table assignment for a set of bookings.",
        "description": "Returns an optimized seating plan maximizing covers and turn efficiency.",
        "x-pricing": {
          "price": 0.1
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SeatingRequest"
              },
              "example": {
                "tables": [
                  {
                    "table_id": "t1",
                    "seats": 2
                  },
                  {
                    "table_id": "t2",
                    "seats": 4
                  }
                ],
                "bookings": [
                  {
                    "booking_id": "b1",
                    "party_size": 2,
                    "time": "19:00"
                  },
                  {
                    "booking_id": "b2",
                    "party_size": 4,
                    "time": "19:30"
                  }
                ],
                "turn_minutes": 90
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Optimized seating plan.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SeatingResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/prepare-reservation": {
      "post": {
        "operationId": "prepareReservation",
        "tags": [
          "booking"
        ],
        "summary": "[GATED] Book or modify a reservation. Requires human approval.",
        "description": "Creates or modifies a reservation at the venue. Risky, outward-facing, and may incur deposits/penalties: with no approval_token it returns approval_required=true and execution_gate.status=pending_approval and performs NO booking or modification. With a valid approval_token it executes.",
        "x-pricing": {
          "price": 0.5
        },
        "x-execution-gate": true,
        "x-human-approval-required": true,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PrepareReservationRequest"
              },
              "example": {
                "restaurant_id": "r_1",
                "slot_id": "slot_19_00",
                "party_size": 2,
                "guest_name": "A. Smith",
                "action": "create",
                "approval_token": null
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Pending-approval gate (no booking) or confirmed booking (with valid token).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PrepareReservationResponse"
                },
                "example": {
                  "request_id": "req_prep_f9e8d7c6b5",
                  "confidence": {
                    "score": 0.95,
                    "level": "high",
                    "rationale": "Slot and party details are valid and the venue is reachable; awaiting human approval before any booking is made."
                  },
                  "privacy": {
                    "pii_included": true,
                    "guest_data": "name_and_party_only",
                    "retention_days": 30,
                    "compliance": [
                      "CCPA",
                      "GDPR_legitimate_interest"
                    ],
                    "data_sources": [
                      "caller_supplied_booking_details",
                      "reservation_platform_apis"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Obtain explicit human approval, then resubmit this request with the issued approval_token.",
                      "rationale": "Booking is execution-gated, outward-facing, and may incur deposit or cancellation penalties.",
                      "chain_to_endpoint": "POST /prepare-reservation"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Validate a venue's reputation before booking."
                    }
                  ],
                  "approval_required": true,
                  "execution_gate": {
                    "required": true,
                    "status": "pending_approval",
                    "approval_token_hint": "Resubmit with a human-issued approval_token to execute the create action.",
                    "expires_at": "2026-06-12T18:00:00-05:00",
                    "irreversible": false
                  },
                  "booked": false,
                  "reservation_confirmation_id": null,
                  "reservation_summary": {
                    "restaurant_id": "r_412",
                    "time": "2026-06-12T19:30:00-05:00",
                    "party_size": 2,
                    "action": "create",
                    "deposit_required": false
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "403": {
            "description": "Approval token invalid, expired, or revoked.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "guest_data": {
            "type": "string",
            "enum": [
              "name_and_party_only",
              "none"
            ],
            "default": "name_and_party_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ExecutionGate": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "required",
          "status"
        ],
        "properties": {
          "required": {
            "type": "boolean"
          },
          "status": {
            "type": "string",
            "enum": [
              "not_required",
              "pending_approval",
              "approved",
              "executed",
              "rejected"
            ]
          },
          "approval_token_hint": {
            "type": "string"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "irreversible": {
            "type": "boolean"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Location": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          }
        }
      },
      "TimeWindow": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "date": {
            "type": "string",
            "format": "date"
          },
          "earliest": {
            "type": "string"
          },
          "latest": {
            "type": "string"
          }
        }
      },
      "AvailabilitySlot": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "slot_id",
          "restaurant_id",
          "time"
        ],
        "properties": {
          "slot_id": {
            "type": "string"
          },
          "restaurant_id": {
            "type": "string"
          },
          "restaurant_name": {
            "type": "string"
          },
          "time": {
            "type": "string"
          },
          "party_size": {
            "type": "integer"
          },
          "price_level": {
            "type": "integer",
            "minimum": 1,
            "maximum": 4
          },
          "seating_area": {
            "type": "string",
            "enum": [
              "indoor",
              "patio",
              "bar",
              "private"
            ]
          },
          "deposit_required": {
            "type": "boolean"
          }
        }
      },
      "AvailabilityRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location",
          "party_size",
          "time_window"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "party_size": {
            "type": "integer",
            "minimum": 1
          },
          "time_window": {
            "$ref": "#/components/schemas/TimeWindow"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "price_level": {
            "type": "array",
            "items": {
              "type": "integer",
              "minimum": 1,
              "maximum": 4
            }
          }
        }
      },
      "AvailabilityResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "availability"
            ],
            "properties": {
              "availability": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/AvailabilitySlot"
                }
              }
            }
          }
        ]
      },
      "RecommendRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "location",
          "party_size",
          "time_window"
        ],
        "properties": {
          "location": {
            "$ref": "#/components/schemas/Location"
          },
          "party_size": {
            "type": "integer",
            "minimum": 1
          },
          "occasion": {
            "type": "string",
            "enum": [
              "date_night",
              "business",
              "family",
              "celebration",
              "casual",
              "group"
            ]
          },
          "time_window": {
            "$ref": "#/components/schemas/TimeWindow"
          },
          "cuisine": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "recommended_slot",
              "alternatives",
              "no_show_risk",
              "recommendation_reason"
            ],
            "properties": {
              "recommended_slot": {
                "$ref": "#/components/schemas/AvailabilitySlot"
              },
              "alternatives": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/AvailabilitySlot"
                }
              },
              "no_show_risk": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "score",
                  "level"
                ],
                "properties": {
                  "score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  },
                  "level": {
                    "type": "string",
                    "enum": [
                      "low",
                      "medium",
                      "high"
                    ]
                  }
                }
              },
              "recommendation_reason": {
                "type": "string"
              }
            }
          }
        ]
      },
      "NoShowRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "party_size",
          "time"
        ],
        "properties": {
          "party_size": {
            "type": "integer"
          },
          "time": {
            "type": "string",
            "format": "date-time"
          },
          "lead_time_days": {
            "type": "number"
          },
          "deposit": {
            "type": "boolean",
            "default": false
          }
        }
      },
      "NoShowResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "no_show_risk"
            ],
            "properties": {
              "no_show_risk": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "score",
                  "level",
                  "factors"
                ],
                "properties": {
                  "score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  },
                  "level": {
                    "type": "string",
                    "enum": [
                      "low",
                      "medium",
                      "high"
                    ]
                  },
                  "factors": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "mitigation": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        ]
      },
      "SeatingRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "tables",
          "bookings"
        ],
        "properties": {
          "tables": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "table_id",
                "seats"
              ],
              "properties": {
                "table_id": {
                  "type": "string"
                },
                "seats": {
                  "type": "integer"
                }
              }
            }
          },
          "bookings": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "booking_id",
                "party_size",
                "time"
              ],
              "properties": {
                "booking_id": {
                  "type": "string"
                },
                "party_size": {
                  "type": "integer"
                },
                "time": {
                  "type": "string"
                }
              }
            }
          },
          "turn_minutes": {
            "type": "integer",
            "default": 90
          }
        }
      },
      "SeatingResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "seating_plan",
              "projected_covers"
            ],
            "properties": {
              "projected_covers": {
                "type": "integer"
              },
              "utilization": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "seating_plan": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "booking_id",
                    "table_id"
                  ],
                  "properties": {
                    "booking_id": {
                      "type": "string"
                    },
                    "table_id": {
                      "type": "string"
                    },
                    "seated_time": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        ]
      },
      "PrepareReservationRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "restaurant_id",
          "slot_id",
          "party_size",
          "action"
        ],
        "properties": {
          "restaurant_id": {
            "type": "string"
          },
          "slot_id": {
            "type": "string"
          },
          "party_size": {
            "type": "integer"
          },
          "guest_name": {
            "type": "string"
          },
          "action": {
            "type": "string",
            "enum": [
              "create",
              "modify",
              "cancel"
            ]
          },
          "approval_token": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-issued approval token. Null/omitted ⇒ gate returns pending_approval and no booking/modification occurs."
          }
        }
      },
      "PrepareReservationResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "approval_required",
              "execution_gate",
              "booked"
            ],
            "properties": {
              "approval_required": {
                "type": "boolean"
              },
              "execution_gate": {
                "$ref": "#/components/schemas/ExecutionGate"
              },
              "booked": {
                "type": "boolean",
                "description": "True only when a valid approval_token was supplied and the booking/modification executed."
              },
              "reservation_confirmation_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "reservation_summary": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "restaurant_id": {
                    "type": "string"
                  },
                  "time": {
                    "type": "string"
                  },
                  "party_size": {
                    "type": "integer"
                  },
                  "action": {
                    "type": "string"
                  },
                  "deposit_required": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

# 10. Franchise Opportunity API  (`/franchise-opportunity`)

**Base URL:** `https://orbis-apis.onrender.com/franchise-opportunity`  ·  **openapi.json:** `https://orbis-apis.onrender.com/franchise-opportunity/openapi.json`  ·  **info/discovery:** `GET https://orbis-apis.onrender.com/franchise-opportunity/`

## 10.1 Info / Discovery manifest (`GET /`)

```json
{
  "service": "Franchise Opportunity API",
  "version": "1.0.0",
  "agent_callable": true,
  "mcp_compatible": true,
  "auth": {
    "type": "api_key",
    "header": "X-API-Key"
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/analyze-franchise-opportunity",
      "price_usd": 1.0,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/compare-franchise-markets",
      "price_usd": 0.75,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/score-location-fit",
      "price_usd": 0.5,
      "gated": false
    },
    {
      "method": "POST",
      "path": "/generate-investment-brief",
      "price_usd": 8.0,
      "gated": false
    }
  ],
  "one_call_workflow": "POST /generate-investment-brief",
  "execution_gates": [],
  "confidence": {
    "score": 1.0,
    "level": "high",
    "rationale": "Static capability manifest; deterministic."
  },
  "privacy": {
    "pii_included": false,
    "retention_days": 30,
    "compliance": [
      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
      "CCPA",
      "advisory_not_financial_advice"
    ],
    "data_sources": [
      "franchise_disclosure_documents_public",
      "census_and_demographic_data",
      "public_business_listings",
      "commercial_real_estate_data",
      "local_market_data"
    ],
    "data_subject": "market_and_business_data_only"
  },
  "recommended_actions_priority_order": [
    {
      "priority": 1,
      "action": "Call POST /generate-investment-brief to run the full workflow in a single call.",
      "rationale": "The bundled workflow is the fastest path to a complete result."
    }
  ],
  "chain_to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /analyze-growth-opportunity",
      "reason": "Assess an existing unit's upside before acquiring."
    },
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /compare-local-options",
      "reason": "Map the competitive set around a candidate site."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Gauge brand reputation in the target market."
    }
  ]
}
```

## 10.2 OpenAPI 3.1 spec (`openapi.json`)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Franchise Opportunity API",
    "version": "1.0.0",
    "summary": "Identify, score, and produce due-diligence briefs for restaurant/franchise expansion and investment opportunities.",
    "description": "Agent-native franchise and expansion intelligence. Analyze a franchise opportunity, compare candidate markets, score a specific location's fit, and generate an investment brief with franchise_fit_score, market_demand_score, competition_intensity, estimated_startup_cost, payback_period_estimate, location_risks, and an opportunity_summary. Built for investor, franchise- development, and advisory agents.",
    "contact": {
      "name": "Restaurant Agent Commerce APIs",
      "url": "https://api.restaurant-agent-commerce.com"
    },
    "license": {
      "name": "Commercial",
      "url": "https://api.restaurant-agent-commerce.com/license"
    }
  },
  "x-agent-callable": true,
  "x-mcp-compatible": true,
  "x-pricing": {
    "model": "per_call",
    "currency": "USD",
    "billing": "prepaid_credits",
    "free_endpoints": [
      "GET /"
    ],
    "endpoint_pricing": {
      "GET /": 0.0,
      "POST /analyze-franchise-opportunity": 1.0,
      "POST /compare-franchise-markets": 0.75,
      "POST /score-location-fit": 0.5,
      "POST /generate-investment-brief": 8.0
    },
    "notes": "generate-investment-brief is the one-call due-diligence workflow (premium tier). All endpoints are analysis/advisory; none move money or take outward-facing action, so no execution gate is required."
  },
  "x-privacy": {
    "pii_handling": "none",
    "data_subject": "market_and_business_data_only",
    "retention_days": 30,
    "compliance": [
      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
      "CCPA",
      "advisory_not_financial_advice"
    ],
    "data_sources": [
      "franchise_disclosure_documents_public",
      "census_and_demographic_data",
      "public_business_listings",
      "commercial_real_estate_data",
      "local_market_data"
    ]
  },
  "x-chain-to": [
    {
      "api": "Restaurant Growth Opportunity API",
      "endpoint": "POST /analyze-growth-opportunity",
      "reason": "Assess an existing unit's upside before acquiring."
    },
    {
      "api": "Local Restaurant Discovery API",
      "endpoint": "POST /compare-local-options",
      "reason": "Map the competitive set around a candidate site."
    },
    {
      "api": "Review Sentiment API",
      "endpoint": "POST /analyze-review-sentiment",
      "reason": "Gauge brand reputation in the target market."
    }
  ],
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/franchise-opportunity",
      "description": "Orbis hosted"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "tags": [
    {
      "name": "discovery"
    },
    {
      "name": "analysis"
    },
    {
      "name": "workflow"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getDiscovery",
        "tags": [
          "discovery"
        ],
        "summary": "Service discovery and capability manifest.",
        "description": "Zero-cost capability manifest with endpoints, pricing, chaining, and envelope metadata.",
        "security": [],
        "x-pricing": {
          "price": 0.0
        },
        "responses": {
          "200": {
            "description": "Capability manifest.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "service": "Franchise Opportunity API",
                  "version": "1.0.0",
                  "agent_callable": true,
                  "mcp_compatible": true,
                  "auth": {
                    "type": "api_key",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/analyze-franchise-opportunity",
                      "price_usd": 1.0,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/compare-franchise-markets",
                      "price_usd": 0.75,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/score-location-fit",
                      "price_usd": 0.5,
                      "gated": false
                    },
                    {
                      "method": "POST",
                      "path": "/generate-investment-brief",
                      "price_usd": 8.0,
                      "gated": false
                    }
                  ],
                  "one_call_workflow": "POST /generate-investment-brief",
                  "execution_gates": [],
                  "confidence": {
                    "score": 1.0,
                    "level": "high",
                    "rationale": "Static capability manifest; deterministic."
                  },
                  "privacy": {
                    "pii_included": false,
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA",
                      "advisory_not_financial_advice"
                    ],
                    "data_sources": [
                      "franchise_disclosure_documents_public",
                      "census_and_demographic_data",
                      "public_business_listings",
                      "commercial_real_estate_data",
                      "local_market_data"
                    ],
                    "data_subject": "market_and_business_data_only"
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Call POST /generate-investment-brief to run the full workflow in a single call.",
                      "rationale": "The bundled workflow is the fastest path to a complete result."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /analyze-growth-opportunity",
                      "reason": "Assess an existing unit's upside before acquiring."
                    },
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /compare-local-options",
                      "reason": "Map the competitive set around a candidate site."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Gauge brand reputation in the target market."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/analyze-franchise-opportunity": {
      "post": {
        "operationId": "analyzeFranchiseOpportunity",
        "tags": [
          "analysis"
        ],
        "summary": "Analyze a franchise brand opportunity.",
        "description": "Returns franchise_fit_score, market_demand_score, competition_intensity, and an opportunity_summary.",
        "x-pricing": {
          "price": 1.0
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalyzeFranchiseRequest"
              },
              "example": {
                "brand": "Fast Casual Bowls Co.",
                "market": {
                  "city": "Austin",
                  "state": "TX"
                },
                "investor_profile": {
                  "capital_usd": 500000,
                  "experience": "multi_unit"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Franchise opportunity analysis.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AnalyzeFranchiseResponse"
                },
                "example": {
                  "request_id": "req_fr_3f7d12a9c4b8e601",
                  "source_freshness": {
                    "data_freshness_days": 18,
                    "last_verified_at": "2026-05-30T09:15:00Z",
                    "source_urls": [
                      "https://franchise.org/fdd/fast-casual-bowls-co",
                      "https://data.census.gov/profile/Austin_city_Texas"
                    ]
                  },
                  "confidence": {
                    "score": 0.79,
                    "level": "high",
                    "rationale": "Derived from the brand's public FDD and Austin MSA demand indicators; competition intensity reflects current public business listings."
                  },
                  "privacy": {
                    "pii_included": false,
                    "data_subject": "market_and_business_data_only",
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA",
                      "advisory_not_financial_advice"
                    ],
                    "data_sources": [
                      "franchise_disclosure_documents_public",
                      "census_and_demographic_data",
                      "public_business_listings",
                      "local_market_data"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Run a full investment brief to size startup cost and payback for a specific site.",
                      "rationale": "This analysis confirms market fit; the brief adds site-level cost and risk detail.",
                      "chain_to_endpoint": "POST /generate-investment-brief"
                    },
                    {
                      "priority": 2,
                      "action": "Compare Austin against adjacent candidate markets before committing.",
                      "rationale": "High local competition may make a secondary market more attractive on a risk-adjusted basis.",
                      "chain_to_endpoint": "POST /compare-franchise-markets"
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /compare-local-options",
                      "reason": "Map the competitive set around a candidate site."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Gauge brand reputation in the target market."
                    }
                  ],
                  "franchise_fit_score": 76,
                  "market_demand_score": 84,
                  "competition_intensity": "high",
                  "opportunity_summary": "Fast Casual Bowls Co. is a strong demographic fit for Austin, TX (demand 84/100, fit 76/100), with a fast-growing, affluent, health-conscious population that aligns with the brand's positioning. The primary constraint is high competitive intensity in the fast-casual bowl segment. Recommended next step is a site-specific investment brief to quantify startup cost, payback, and location risk."
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/compare-franchise-markets": {
      "post": {
        "operationId": "compareFranchiseMarkets",
        "tags": [
          "analysis"
        ],
        "summary": "Compare candidate markets for a brand.",
        "description": "Returns ranked markets with demand, competition, and cost signals.",
        "x-pricing": {
          "price": 0.75
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CompareMarketsRequest"
              },
              "example": {
                "brand": "Fast Casual Bowls Co.",
                "markets": [
                  {
                    "city": "Austin",
                    "state": "TX"
                  },
                  {
                    "city": "Nashville",
                    "state": "TN"
                  },
                  {
                    "city": "Denver",
                    "state": "CO"
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ranked market comparison.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CompareMarketsResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/score-location-fit": {
      "post": {
        "operationId": "scoreLocationFit",
        "tags": [
          "analysis"
        ],
        "summary": "Score a specific site's fit for a brand.",
        "description": "Returns a franchise_fit_score for a site plus location_risks and demand drivers.",
        "x-pricing": {
          "price": 0.5
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ScoreLocationRequest"
              },
              "example": {
                "brand": "Fast Casual Bowls Co.",
                "site": {
                  "address": "1200 S Lamar Blvd, Austin, TX",
                  "sqft": 2200,
                  "rent_monthly_usd": 9500
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Location-fit score.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScoreLocationResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          }
        }
      }
    },
    "/generate-investment-brief": {
      "post": {
        "operationId": "generateInvestmentBrief",
        "tags": [
          "workflow"
        ],
        "summary": "One-call workflow — full investment due-diligence brief.",
        "description": "Orchestrates opportunity analysis, market comparison, and location-fit scoring into a complete investment brief with franchise_fit_score, market_demand_score, competition_intensity, estimated_startup_cost, payback_period_estimate, location_risks, and opportunity_summary. Advisory output — not financial advice; no action is executed.",
        "x-pricing": {
          "price": 8.0
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/InvestmentBriefRequest"
              },
              "example": {
                "brand": "Fast Casual Bowls Co.",
                "market": {
                  "city": "Austin",
                  "state": "TX"
                },
                "site": {
                  "address": "1200 S Lamar Blvd, Austin, TX",
                  "sqft": 2200,
                  "rent_monthly_usd": 9500
                },
                "investor_profile": {
                  "capital_usd": 500000,
                  "experience": "multi_unit"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Full investment brief.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/InvestmentBriefResponse"
                },
                "example": {
                  "request_id": "req_fr_8b21c9d4e7a04f12",
                  "source_freshness": {
                    "data_freshness_days": 21,
                    "last_verified_at": "2026-05-28T14:32:00Z",
                    "source_urls": [
                      "https://franchise.org/fdd/fast-casual-bowls-co",
                      "https://data.census.gov/profile/Austin_city_Texas"
                    ]
                  },
                  "confidence": {
                    "score": 0.82,
                    "level": "high",
                    "rationale": "Based on current FDD Item 7 ranges, census demographics for the Austin MSA, and comparable-site rent data; site-level financials are estimates."
                  },
                  "privacy": {
                    "pii_included": false,
                    "data_subject": "market_and_business_data_only",
                    "retention_days": 30,
                    "compliance": [
                      "GDPR: business-data-focused; ensure lawful basis where personal data appears",
                      "CCPA",
                      "advisory_not_financial_advice"
                    ],
                    "data_sources": [
                      "franchise_disclosure_documents_public",
                      "census_and_demographic_data",
                      "commercial_real_estate_data",
                      "local_market_data"
                    ]
                  },
                  "recommended_actions_priority_order": [
                    {
                      "priority": 1,
                      "action": "Request the brand's most recent Franchise Disclosure Document and validate Item 19 financial performance representations.",
                      "rationale": "Startup cost and payback estimates depend on brand-provided unit economics that should be independently confirmed.",
                      "chain_to_endpoint": "POST /score-location-fit"
                    },
                    {
                      "priority": 2,
                      "action": "Map the competitive set within a 1-mile radius of the candidate site.",
                      "rationale": "Competition intensity materially affects ramp-up time and steady-state revenue.",
                      "chain_to_endpoint": "POST /compare-franchise-markets"
                    },
                    {
                      "priority": 3,
                      "action": "Engage a commercial broker to verify the quoted rent against current South Lamar comps.",
                      "rationale": "Rent is the largest fixed cost and the quoted figure sits at the top of the local range."
                    }
                  ],
                  "chain_to": [
                    {
                      "api": "Restaurant Growth Opportunity API",
                      "endpoint": "POST /analyze-growth-opportunity",
                      "reason": "Assess an existing unit's upside before acquiring."
                    },
                    {
                      "api": "Local Restaurant Discovery API",
                      "endpoint": "POST /compare-local-options",
                      "reason": "Map the competitive set around a candidate site."
                    },
                    {
                      "api": "Review Sentiment API",
                      "endpoint": "POST /analyze-review-sentiment",
                      "reason": "Gauge brand reputation in the target market."
                    }
                  ],
                  "franchise_fit_score": 78,
                  "market_demand_score": 84,
                  "competition_intensity": "high",
                  "estimated_startup_cost": {
                    "low_usd": 410000,
                    "high_usd": 685000,
                    "franchise_fee_usd": 45000,
                    "buildout_usd": 320000,
                    "working_capital_usd": 90000
                  },
                  "payback_period_estimate": {
                    "years_low": 3.2,
                    "years_high": 5.5,
                    "assumptions": "Assumes steady-state unit revenue of $1.4M-$1.7M, ~14% EBITDA margin after royalties, and full ramp by month 9."
                  },
                  "location_risks": [
                    {
                      "risk": "Above-market rent",
                      "severity": "medium",
                      "detail": "Quoted $9,500/month ($4.32/sqft) sits at the upper end of the South Lamar corridor for 2,200 sqft second-generation space.",
                      "mitigation": "Negotiate a tenant-improvement allowance or graduated rent abatement for the first 6-9 months."
                    },
                    {
                      "risk": "Competitive saturation",
                      "severity": "high",
                      "detail": "Austin's fast-casual bowl segment is crowded, with multiple national and regional concepts within a 2-mile radius.",
                      "mitigation": "Differentiate on menu, delivery-channel mix, and a strong local-loyalty program at launch."
                    },
                    {
                      "risk": "Construction cost volatility",
                      "severity": "medium",
                      "detail": "Buildout estimates can swing 15-20% given regional contractor demand and permitting timelines.",
                      "mitigation": "Lock a fixed-price GC contract and budget a 15% contingency reserve."
                    }
                  ],
                  "opportunity_summary": "Fast Casual Bowls Co. in Austin, TX scores as an above-average opportunity (fit 78/100) driven by strong demographic demand (84/100), but tempered by high competitive intensity and top-of-range rent at the South Lamar site. Estimated all-in startup cost of $410K-$685K is within the investor's $500K capital profile if financed conservatively, with a projected 3.2-5.5 year payback under steady-state assumptions. Suited to the investor's multi-unit experience, contingent on FDD validation and rent negotiation.",
                  "disclaimer": "Advisory output only; not financial advice. Validate all figures against the brand's current FDD and independent professional counsel before investing."
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
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
        "name": "X-API-Key",
        "description": "Per-agent API key. Bills against prepaid credits."
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Malformed or invalid request.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "PaymentRequired": {
        "description": "Insufficient prepaid credits.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      "NotFound": {
        "description": "Brand or market could not be resolved.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    },
    "schemas": {
      "Confidence": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "score",
          "level"
        ],
        "properties": {
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "level": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "Privacy": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "pii_included",
          "retention_days"
        ],
        "properties": {
          "pii_included": {
            "type": "boolean"
          },
          "data_subject": {
            "type": "string",
            "enum": [
              "market_and_business_data_only",
              "none"
            ],
            "default": "market_and_business_data_only"
          },
          "retention_days": {
            "type": "integer"
          },
          "compliance": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "data_sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "RecommendedAction": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "priority",
          "action"
        ],
        "properties": {
          "priority": {
            "type": "integer",
            "minimum": 1
          },
          "action": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          },
          "chain_to_endpoint": {
            "type": "string"
          }
        }
      },
      "ChainTo": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "api",
          "endpoint",
          "reason"
        ],
        "properties": {
          "api": {
            "type": "string"
          },
          "endpoint": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        }
      },
      "ResponseMeta": {
        "description": "Top-level envelope fields attached once per response (never nested).",
        "type": "object",
        "required": [
          "request_id",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "source_freshness": {
            "type": "object",
            "description": "Provenance/recency of the underlying data used in this response.",
            "additionalProperties": false,
            "properties": {
              "data_freshness_days": {
                "type": "integer"
              },
              "last_verified_at": {
                "type": "string",
                "format": "date-time"
              },
              "source_urls": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                }
              }
            }
          },
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error"
        ],
        "properties": {
          "error": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "code",
              "message"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "retriable": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "service",
          "version",
          "agent_callable",
          "mcp_compatible",
          "auth",
          "endpoints",
          "one_call_workflow",
          "confidence",
          "privacy",
          "recommended_actions_priority_order",
          "chain_to"
        ],
        "properties": {
          "confidence": {
            "$ref": "#/components/schemas/Confidence"
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RecommendedAction"
            }
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "agent_callable": {
            "type": "boolean"
          },
          "mcp_compatible": {
            "type": "boolean"
          },
          "auth": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "price_usd": {
                  "type": "number"
                },
                "gated": {
                  "type": "boolean"
                }
              }
            }
          },
          "one_call_workflow": {
            "type": "string"
          },
          "execution_gates": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          }
        }
      },
      "Market": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "city"
        ],
        "properties": {
          "city": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "country": {
            "type": "string",
            "default": "US"
          }
        }
      },
      "Site": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "address": {
            "type": "string"
          },
          "sqft": {
            "type": "number"
          },
          "rent_monthly_usd": {
            "type": "number"
          }
        }
      },
      "InvestorProfile": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "capital_usd": {
            "type": "number"
          },
          "experience": {
            "type": "string",
            "enum": [
              "first_time",
              "single_unit",
              "multi_unit",
              "institutional"
            ]
          }
        }
      },
      "StartupCost": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "low_usd",
          "high_usd"
        ],
        "properties": {
          "low_usd": {
            "type": "number"
          },
          "high_usd": {
            "type": "number"
          },
          "franchise_fee_usd": {
            "type": "number"
          },
          "buildout_usd": {
            "type": "number"
          },
          "working_capital_usd": {
            "type": "number"
          }
        }
      },
      "PaybackEstimate": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "years_low",
          "years_high"
        ],
        "properties": {
          "years_low": {
            "type": "number"
          },
          "years_high": {
            "type": "number"
          },
          "assumptions": {
            "type": "string"
          }
        }
      },
      "LocationRisk": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "risk",
          "severity"
        ],
        "properties": {
          "risk": {
            "type": "string"
          },
          "severity": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ]
          },
          "detail": {
            "type": "string"
          },
          "mitigation": {
            "type": "string"
          }
        }
      },
      "AnalyzeFranchiseRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "brand",
          "market"
        ],
        "properties": {
          "brand": {
            "type": "string"
          },
          "market": {
            "$ref": "#/components/schemas/Market"
          },
          "investor_profile": {
            "$ref": "#/components/schemas/InvestorProfile"
          }
        }
      },
      "AnalyzeFranchiseResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "franchise_fit_score",
              "market_demand_score",
              "competition_intensity",
              "opportunity_summary"
            ],
            "properties": {
              "franchise_fit_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "market_demand_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "competition_intensity": {
                "type": "string",
                "enum": [
                  "low",
                  "moderate",
                  "high",
                  "saturated"
                ]
              },
              "opportunity_summary": {
                "type": "string"
              }
            }
          }
        ]
      },
      "CompareMarketsRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "brand",
          "markets"
        ],
        "properties": {
          "brand": {
            "type": "string"
          },
          "markets": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Market"
            }
          }
        }
      },
      "CompareMarketsResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "ranked_markets"
            ],
            "properties": {
              "ranked_markets": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "market",
                    "market_demand_score",
                    "competition_intensity"
                  ],
                  "properties": {
                    "market": {
                      "$ref": "#/components/schemas/Market"
                    },
                    "market_demand_score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "competition_intensity": {
                      "type": "string",
                      "enum": [
                        "low",
                        "moderate",
                        "high",
                        "saturated"
                      ]
                    },
                    "est_startup_cost": {
                      "$ref": "#/components/schemas/StartupCost"
                    }
                  }
                }
              }
            }
          }
        ]
      },
      "ScoreLocationRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "brand",
          "site"
        ],
        "properties": {
          "brand": {
            "type": "string"
          },
          "site": {
            "$ref": "#/components/schemas/Site"
          }
        }
      },
      "ScoreLocationResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "franchise_fit_score",
              "location_risks"
            ],
            "properties": {
              "franchise_fit_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "demand_drivers": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "location_risks": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/LocationRisk"
                }
              }
            }
          }
        ]
      },
      "InvestmentBriefRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "brand",
          "market"
        ],
        "properties": {
          "brand": {
            "type": "string"
          },
          "market": {
            "$ref": "#/components/schemas/Market"
          },
          "site": {
            "$ref": "#/components/schemas/Site"
          },
          "investor_profile": {
            "$ref": "#/components/schemas/InvestorProfile"
          }
        }
      },
      "InvestmentBriefResponse": {
        "unevaluatedProperties": false,
        "allOf": [
          {
            "$ref": "#/components/schemas/ResponseMeta"
          },
          {
            "type": "object",
            "required": [
              "franchise_fit_score",
              "market_demand_score",
              "competition_intensity",
              "estimated_startup_cost",
              "payback_period_estimate",
              "location_risks",
              "opportunity_summary"
            ],
            "properties": {
              "franchise_fit_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "market_demand_score": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "competition_intensity": {
                "type": "string",
                "enum": [
                  "low",
                  "moderate",
                  "high",
                  "saturated"
                ]
              },
              "estimated_startup_cost": {
                "$ref": "#/components/schemas/StartupCost"
              },
              "payback_period_estimate": {
                "$ref": "#/components/schemas/PaybackEstimate"
              },
              "location_risks": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/LocationRisk"
                }
              },
              "opportunity_summary": {
                "type": "string"
              },
              "disclaimer": {
                "type": "string",
                "description": "Advisory output; not financial advice."
              }
            }
          }
        ]
      }
    }
  }
}
```

