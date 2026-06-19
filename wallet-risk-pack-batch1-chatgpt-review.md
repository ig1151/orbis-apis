# Wallet Risk Adjacency Pack — Batch 1 — ChatGPT Review Bundle

Date: 2026-06-19 · tsc clean · smoke 13/13 green · pending deploy + live-verify on Render

Two deterministic, agent-native web3 APIs built off the **#1/#2 live-demand signals** (Wallet API 375 calls, Wallet Address Risk 372). Both use the shared `_aplus` scaffold (typed OpenAPI 3.1, `unevaluatedProperties:false` composites, reasoning/chain_to/privacy/execution_metadata tail, `x-human-approval-required: false`). No LLM, nothing stored — they score the signals the caller supplies (no chain fetch), so outputs are advisory, not verdicts on a real address.

## Please grade each API (A+/A/B/…) on:
1. **Correctness** of the deterministic scoring logic (see rubrics below).
2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata).
3. **Honesty** — does it avoid fabricating data, correctly mark omitted signals as "missing" (not safe), and disclaim that it scores supplied inputs rather than fetching chain state?
4. **Pricing** — are /scan 0.02 · /lookup 0.035 (scanner) and /assess 0.025 · /lookup 0.05 (bundle) reasonable for composite/compliance web3 utilities?
5. **Gaps / risks** you'd flag before listing.

---

## 1) Token Approval Risk Scanner API
`POST /scan` (0.02) · `POST /lookup` (0.035) · base `https://orbis-apis.onrender.com/token-approval-risk-scanner`

**What it does:** scores a caller-supplied list of ERC-20 approvals for drain exposure and returns a revoke-priority list.

**Per-approval rubric (points, clamped 0–100):**
- spender_flagged → +50 (and forces band ≥ high)
- unlimited allowance (is_unlimited, or allowance `"unlimited"/"max"/"infinite"`, or numeric ≥ 1e30) → +30
- spender_verified === false → +15; verification unknown (omitted) → +5
- last_used_days ≥ 365 → +15; ≥ 180 → +10
- large finite allowance (≥ 1,000,000, non-unlimited) → +4
- bands: severe ≥75, high ≥50, medium ≥25, else low; `revoke_recommended` when score ≥25 or flagged.

**Portfolio exposure:** `max(per-approval risk) + min(20, (riskyCount-1)*4)`, clamped 0–100, with band.

**Sample request:**
```json
{ "approvals": [
  { "token_symbol": "USDC", "spender_label": "UnknownRouter", "is_unlimited": true, "spender_verified": false, "last_used_days": 400 },
  { "token_symbol": "WETH", "spender_label": "Uniswap V3 Router", "allowance": 500, "spender_verified": true, "last_used_days": 3 },
  { "token_symbol": "DAI", "spender_flagged": true, "is_unlimited": true }
] }
```
**Sample `/scan` response (abridged):** `unlimited_count: 2, flagged_spender_count: 1, stale_count: 1, exposure_score: ~89 (severe)`, `revoke_priority` ordered with the flagged DAI approval first (risk 85, severe). `/lookup` adds a `reasoning` object (why/key_factors/invalidators) and prioritized actions.

---

## 2) Wallet Risk Bundle API
`POST /assess` (0.025) · `POST /lookup` (0.05) · base `https://orbis-apis.onrender.com/wallet-risk-bundle`

**What it does:** fuses already-gathered wallet signals into one composite risk score, trust tier, and allow/review/block verdict.

**Inputs (all optional; supply ≥1 scored signal):**
- `address_risk.score` (0–100, higher = riskier), `address_risk.sanctioned` (hard-block)
- `exposure.mixer_exposure_pct`, `exposure.flagged_counterparty_pct` (0–100; ≥25 → hard-block) → risk = max of the two
- `approvals.exposure_score` (0–100) **or** raw `{unlimited_count, flagged_spender_count, total_count}` → `min(100, unl*15 + flg*30 + tot*1)`; flagged>0 → hard-block
- `reputation.score` (0–100, higher = **better**) → risk = 100 − score
- `balance.{net_worth_usd, token_count}` — context only, **not scored**

**Fusion:** base weights `address_risk 0.4 / exposure 0.3 / approvals 0.2 / reputation 0.1`, **re-normalized over present sources**. `composite = Σ(risk·weight)`; hard-block floors composite to ≥75. Tier: high_risk ≥75, caution ≥50, neutral ≥25, else trusted. Verdict: block if hard-block or ≥70; review ≥40; else allow. Omitted sources returned in `missing_sources` with a `chain_to` to the live API that produces them.

**Sample request:**
```json
{ "address": "0xabc...def", "address_risk": { "score": 65 }, "approvals": { "exposure_score": 60 }, "reputation": { "score": 40 } }
```
**Sample `/assess` response (abridged):** `sources_used: [address_risk, approvals, reputation]`, re-normalized weights, `composite_risk_score: 63`, `trust_tier: caution`, `verdict: review`, `missing_sources: [exposure → wallet-address-risk]`. A sanctioned input → `hard_block: true`, composite ≥75, `verdict: block`. `/lookup` adds reasoning + actions.

**Design note for review:** the Bundle is a deterministic **signal-fusion** layer (caller passes component scores) rather than a server-side fan-out that calls the live wallet APIs itself. Question for you: is fusion the right v1, or should it orchestrate the live endpoints internally?

---

## v1.1 — ChatGPT review feedback incorporated (2026-06-19)
Both APIs graded A+; all three suggested improvements applied (tsc clean, 11/11 follow-up smoke green):
- **Scanner** → `estimated_value_at_risk_usd` (top-level) + per-approval `value_at_risk_usd`: unlimited allowance exposes the supplied `balance_usd`; explicit `value_at_risk_usd` overrides; bounded allowances stay `null` (no price → no honest USD cap). Revoke-priority tie-breaks by value at risk.
- **Bundle** → `confidence_per_source` (per-signal confidence, 1 at the fusion level) alongside the global `confidence_score`.
- **Bundle** → `next_best_api_call` (slug of the single highest-priority missing signal; empty when all present) to drive one-step chaining.
- v2 (deferred, agreed): a separate orchestrated **Wallet Intelligence** variant that calls the live APIs server-side and can price /lookup at 0.06–0.10.

## Smoke results (local, in-process Express): 13/13 PASS
discovery + OpenAPI 3.1 for both · scan counts/banding · flagged-first ordering · empty-body 400s · bundle fusion + missing-source routing · hard-block override · high-reputation → trusted.
