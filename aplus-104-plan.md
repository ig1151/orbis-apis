# A+ Deterministic API Plan (the "104")

Pasted 2026-06-11: 104 lines → **93 unique** (11 exact dupes). Classified below against what's
already built and against the deterministic-only rule. We build in groups of ~6 and check off here.

## Build conventions
- **Deterministic only** — real math/code, no LLM. `model: "deterministic"`, `confidence: 1.0`.
- **Never fabricate** — bad/missing input → `200 {success:false}` (never 5xx, never invented values). `400` only for missing required param.
- Shared scaffold `src/routes/_aplus/`; per API `routes/intelligence.ts` + `routes/openapi.ts`; mount in `src/index.ts`; one-call `/lookup` with reasoning.
- Pure input→output, **no upstream to 502**. (This is why the LLM-fabricated batch got culled — see [[project_low_uptime_cleanup]].)

Legend: ⬜ todo · 🟡 wip · ✅ shipped · 📤 listed · ⛔ skip(dupe) · ⚠️ needs data-source/scope decision

---

## A. BUILD-READY — deterministic, no upstream (the real backlog) — 20
✅ Random Data Generator API — crypto-random faker: names/emails/UUIDs/addresses/test rows, optional seed [batch1]
✅ Data Validator API — Luhn (card), IBAN, ISBN, EAN/UPC, routing#, E.164 phone, email syntax, JSON [batch1]
✅ Web Content Diff Checker API — line/word/unified diff + similarity % (merges "Web Diff Tracker") [batch1]
✅ Web Performance Budget Checker API — resource weights vs budget thresholds → pass/fail per asset class [batch2]
✅ Web Vitals Grader API — given LCP/INP/CLS values → good/needs-improvement/poor + grade (input-driven, no fetch) [batch1]
✅ Web Scrape Rate Limiter API — robots crawl-delay + concurrency + target RPS → safe schedule [batch2]
✅ Web Scrape Cost/ROI Analyzer API — pages × cost-per-page vs value → ROI, break-even (merges "Web Scraping ROI & Cost Optimizer") [batch2]
✅ Web Scrape Planner API — given site size/limits → crawl plan, batches, ETA [batch3]
✅ Web Scrape Legal Risk Checker API — rubric over robots/ToS/PII/copyright flags → risk score [batch3]
✅ Web Scrape Monitoring Scorer API — change-rate / freshness inputs → monitoring cadence score [batch3]
✅ Web Content Freshness Scorer API — published/modified/Last-Modified dates → freshness score [batch2]
✅ Web Content Type Classifier API — URL/extension/MIME/heuristics → content type [batch1]
✅ Web Archive URL Builder API — build Wayback / archive.today / cache URLs + timestamp parsing (pure string) [batch2]
✅ Country & Currency Data API — static ISO-3166 / ISO-4217 dataset: lookup, format, dial codes [batch3]
⬜ Layer 2 Blockchain Comparison API — curated static L2 spec table → compare fees/finality/type
⬜ Web3 Security Checklist API — deterministic audit-readiness checklist/rubric from declared features
⬜ Tokenomics Explainer API — math from supply/emission/vesting inputs (inflation, float, unlock curve) — NOT a knowledge LLM
⬜ Web3 Wallet Risk Scorer API — rubric over CALLER-SUPPLIED wallet features (age, tx count, approvals) → score
⬜ WebSocket Tester API — connect/handshake/echo check (bounded timeout; live but cheap)
✅ Finance Payments API — payment math: installment/APR, fee split, settlement amounts (scope to deterministic) [batch3]

## B. LIKELY DUPES of shipped APIs — confirm then skip — 6
⛔ Web3 Transaction Decoder API → `transaction-decoder-api`
⛔ Debt Payoff Calculator API → `debt-payoff-planner-api`
⛔ Mortgage Refinance Calculator API → `mortgage-refinance-api`
⛔ QR Code & Data Encoding API → `qr-barcode-api`
⛔ Webpage Change Monitor / Website Change Detection & Monitor → `website-change-monitor-api`
⛔ Web Content Language Detector API → `language-detection-api`

## C. NEEDS A REAL DATA SOURCE — would 502/fabricate as pure code — 15 ⚠️
⚠️ Crypto Project Analyzer · Crypto Scam Database & Fraud Pattern · Crypto Address Labeler · Web3 Job Market ·
Web3 Wallet Analyzer · Web3 Wallet Activity Scorer · Blockchain Network Health · Web3 Due Diligence ·
Web Data Extractor Intelligence · Web Scraper Intelligence · Web Archive Checker (live) · Web Font Analyzer (fetch) ·
News Deduplicator · AI Model Comparison · Website Trust & Authority Scorer
→ each needs a chosen upstream/dataset before it's safe to build (else it's the culled pattern).

## D. KNOWLEDGE / REFERENCE — fabrication risk unless backed by a curated dataset — 25 ⚠️
⚠️ Web3: Glossary · Explain It Simply · Career Paths · Career Guide · Developer Tools · Infrastructure · Integration · Security Audit Firms · Blockchain Network Guide · Credit Score Guide · Microfinance Guide
⚠️ Vertical "Finance Intel/Guide": Freelancer · Country · Embedded · Climate · Supply Chain · Litigation · Ag · Trade · Sc · Sustainable · Behavioral · Biodiversity · Infra · Edu
→ viable only as curated static-knowledge datasets (no LLM), or drop.

## E. ALREADY BUILT (matched existing routes) — 18 ✅
Emergency Fund Calculator · Financial Health Checker · Personal Finance Agent · Retirement Planner · Budget Planner ·
Net Worth Tracker · Refinance Calculator · Mortgage Refinance · Insurance Calculator (insurance-needs) ·
Savings Optimizer (savings-goal-optimizer) · Webhook Payload Builder · Webhook Validator · Webhook Reliability Scorer ·
Webhook Signature Verifier · Website Tech Stack Detector · (Personal Finance API/Dashboard/Optimizer ≈ personal-finance-agent)

---

## Groups shipped
- **Batch 1 (2026-06-11)** — Data Validator · Random Data Generator · Web Content Diff Checker · Web Vitals Grader · Web Content Type Classifier. Shared `_aplus/util.ts` + `_aplus/specparts.ts` scaffolds added. tsc clean; `smoke-bucketa-batch1.cjs` 49/49. MERGED (PR #27) + LIVE-VERIFIED.
- **Batch 2 (2026-06-11)** — Web Performance Budget Checker · Web Scrape Rate Limiter · Web Content Freshness Scorer · Web Archive URL Builder · Web Scrape Cost/ROI Analyzer. tsc clean; `smoke-bucketa-batch2.cjs` 39/39.
- **Batch 3 (2026-06-11)** — Web Scrape Planner · Web Scrape Legal Risk Checker · Web Scrape Monitoring Scorer · Country & Currency Data · Finance Payments. tsc clean; `smoke-bucketa-batch3.cjs` 47/47.
