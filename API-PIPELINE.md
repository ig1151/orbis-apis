# Orbis API Build Pipeline
## Tier 1 — Build First (Highest agent demand)

1. youtube-intelligence     — summarize, transcript, entities, action items
2. pdf-extraction           — invoices, receipts, contracts → structured JSON
3. email-intelligence       — verify, risk score, disposable detect, domain health
4. lead-scoring             — score company+contact, reasons, fit grade
5. cold-outreach            — personalization, hooks, pain points from URL
6. competitor-monitor       — track pricing, hiring, product, landing page changes
7. local-business           — reviews, hours, contacts, reputation from URL
8. serp-intelligence        — rankings, keyword gaps, entities, FAQs, competitors

## Tier 2 — Build Second (Strong recurring revenue)

9.  shopify-analyzer        — apps, revenue estimate, theme, pricing strategy
10. meeting-analyzer        — action items, objections, commitments, sentiment
11. social-profile          — Instagram/TikTok/X audience quality, engagement
12. screenshot-analyzer     — UI elements, buttons, forms, CTAs, accessibility
13. financial-analyzer      — risks, anomalies, KPIs, summaries from statements
14. ai-moderation           — fraud probability, spam score, policy violations

## Tier 3 — Build Third (Niche but high value)

15. browser-task            — run browser automation tasks, return artifacts
16. mcp-proxy               — convert REST/SOAP/GraphQL → MCP-compatible tools
17. linkedin-intelligence   — hiring velocity, tech stack, growth, signals
18. agent-search            — structured answers, citations, facts, confidence
19. invoice-processor       — extract, validate, categorize, route invoices
20. action-api-hub          — send email, create ticket, update CRM, post Slack

## Build Order Strategy
- Each API: ~30-45 min with scaffold script
- Target: 3-4 APIs per session
- Every API gets: /info + /openapi.json + /execution-gate
- After each: ChatGPT grade → listing JSON → Orbis upload

## Today's Progress
✅ extraction-api (A+, 17 endpoints)
✅ resume-api (A+, 14 endpoints)  
✅ phone-validation (A+, 9 endpoints)
✅ market-signal-v2 (A+, 10 endpoints)
