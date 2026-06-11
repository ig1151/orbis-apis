// Assemble a single ChatGPT-review markdown for Bucket A batches 1-3 (15 APIs).
import fs from 'fs';
const R = 'src/routes';
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\s+$/, '');
const fence = (p, lang = 'ts') => `\`\`\`${lang}\n${read(p)}\n\`\`\``;

const BATCHES = [
  { n: 1, pr: '#27', apis: [
    ['data-validator', 'Luhn/IBAN/ISBN/EAN·UPC/ABA-routing/E.164/email/JSON validation + auto-detect'],
    ['random-data-generator', 'seed-reproducible mulberry32 / CSPRNG faker + multi-col test rows'],
    ['web-content-diff-checker', 'LCS line/word diff + Sørensen–Dice similarity %'],
    ['web-vitals-grader', 'Google CWV thresholds → pass/fail + A–F'],
    ['web-content-type-classifier', 'URL/extension/MIME → content category'],
  ] },
  { n: 2, pr: '#28', apis: [
    ['web-performance-budget-checker', 'resource weights vs per-class budgets → pass/fail'],
    ['web-scrape-rate-limiter', 'DEFENSIVE: robots crawl-delay + concurrency + target RPS → polite schedule (only throttles down)'],
    ['web-content-freshness-scorer', 'published/modified dates + half-life → freshness score + band'],
    ['web-archive-url-builder', 'Wayback/archive.today/cache URL builder + timestamp parsing (pure string)'],
    ['web-scrape-cost-roi-analyzer', 'pages × unit economics → cost, net, ROI %, break-even, verdict'],
  ] },
  { n: 3, pr: '#29', apis: [
    ['web-scrape-planner', 'pages + throughput + batch size + retry overhead → batches, per-batch timing, ETA, schedule'],
    ['web-scrape-legal-risk-checker', 'DEFENSIVE rubric over declared robots/ToS/PII/copyright/circumvention flags → 0–100 risk + level'],
    ['web-scrape-monitoring-scorer', 'change rate + importance + staleness tolerance → re-check cadence + volatility + priority'],
    ['country-currency-data', 'curated static ISO-3166/4217 lookups + deterministic money formatter (no ICU)'],
    ['finance-payments', 'amortization + processor fee split/gross-up + largest-remainder settlement (sums to the penny)'],
  ] },
];
const dir = (slug) => `${R}/${slug}-api`;

let out = '';
out += `# Orbis APIs — Deterministic A+ API Review (Bucket A, Batches 1–3)\n\n`;
out += `**Context:** 15 net-new, **agent-native** HTTP APIs (Express). Every one is **pure deterministic code** — no LLM call, and (except where noted) no network I/O. They are built on a shared scaffold (\`src/routes/_aplus/\`) that produces a consistent response envelope, an OpenAPI 3.1 spec, and discovery metadata. Each API exposes per-field endpoints plus a one-call \`/lookup\` that adds a \`reasoning\` block (why_result_generated / key_factors / invalidators). Shipped in PRs #27 (batch 1), #28 (batch 2), #29 (batch 3).\n\n`;
out += `**Design rules these must follow:**\n`;
out += `- **Never fabricate.** Every returned value must be derivable from the request input by real arithmetic/string/lookup logic. No LLM-invented numbers.\n`;
out += `- **Deterministic value payload.** Same input → same *value* payload. The envelope's \`trace_id\`, \`computed_at\`, and \`latency_ms\` are runtime metadata and intentionally vary per call — only the computed fields are reproducible. \`execution_metadata.model\` is \`"deterministic"\`. (The one RNG API is seed-reproducible via mulberry32, or explicitly CSPRNG when no seed is given.)\n`;
out += `- **No 5xx on bad input.** A missing required param → HTTP 400 with an \`Error400\` envelope. Otherwise return 200 with an honest result (e.g. \`found:false\`).\n`;
out += `- **Confidence honesty.** Pure math/lookup → confidence 1.0. The two *advisory rubrics* (legal-risk, and the defensive rate-limiter) carry lower confidence + a disclaimer; they must never claim certainty they don't have, and the defensive ones must refuse to help bypass protections.\n`;
out += `- **Published spec fidelity.** The live response must match the published OpenAPI schema **and** the spec's \`responseExample\` (enforced by an ajv-2020 + drift-guard smoke test per batch; all currently green — 49/49, 39/39, 47/47).\n\n`;
out += `**Please grade each file A+ … F with line-referenced findings, for:**\n`;
out += `1. **Correctness** — does the math/diff/lookup/rubric actually compute what it claims? Edge cases, off-by-one, rounding, float error, wrong domain assumptions (ISO codes, CWV thresholds, amortization, GTIN/IBAN/Luhn checksums, LCS).\n`;
out += `2. **Robustness** — malformed/missing/hostile input; no crashes, no unbounded work, no 5xx.\n`;
out += `3. **Fabrication leaks** — any value not derivable from input.\n`;
out += `4. **Determinism** — any hidden nondeterminism (Date.now in the value path, Math.random outside the CSPRNG branch, iteration-order dependence).\n`;
out += `5. **Defensive-posture** — for legal-risk & rate-limiter: do they ever ease/enable abuse? do they fail safe?\n`;
out += `6. **Bugs / dead code / improvements.**\n\n`;
out += `> Note: the per-batch smoke tests (embedded at the end) define expected behavior and all pass. One real bug was already caught this way and fixed: \`web-scrape-planner\` did \`Math.ceil(5200*1.1)\` → \`5720.0000000001\` ceil'd to 5721 (ETA drifted to "47m 41s" vs the published "47m 40s"); now \`Math.ceil(round(x,6))\`. Look for similar latent float/rounding issues.\n\n`;
out += `---\n\n# Part 0 — Shared scaffold (\`src/routes/_aplus/\`)\n\nReviewed once; every API imports from these.\n\n`;
out += `## \`_aplus/util.ts\` — coercion + constants\n${fence(`${R}/_aplus/util.ts`)}\n\n`;
out += `## \`_aplus/finance.ts\` — money math helpers (used by finance-payments)\n${fence(`${R}/_aplus/finance.ts`)}\n\n`;
out += `## \`_aplus/specparts.ts\` — shared OpenAPI schema fragments\n${fence(`${R}/_aplus/specparts.ts`)}\n\n`;
out += `## \`_aplus/scaffold.ts\` — envelope (\`respond\`/\`fail\`) + \`buildAplusSpec\`\n${fence(`${R}/_aplus/scaffold.ts`)}\n\n`;

for (const b of BATCHES) {
  out += `---\n\n# Part ${b.n} — Batch ${b.n} (PR ${b.pr})\n\n`;
  for (const [slug, desc] of b.apis) {
    out += `## ${slug} — ${desc}\n\n\`${dir(slug)}/routes/intelligence.ts\`\n\n${fence(`${dir(slug)}/routes/intelligence.ts`)}\n\n`;
    if (slug === 'country-currency-data') {
      out += `### supporting data: \`${dir(slug)}/routes/data.ts\` (curated static ISO-3166/4217)\n\n${fence(`${dir(slug)}/routes/data.ts`)}\n\n`;
    }
  }
}

out += `---\n\n# Part 4 — Smoke tests (define expected behavior; all green)\n\n`;
for (const n of [1, 2, 3]) {
  out += `## \`x402-test/smoke-bucketa-batch${n}.cjs\`\n\n${fence(`x402-test/smoke-bucketa-batch${n}.cjs`, 'js')}\n\n`;
}

fs.writeFileSync('batch-bucketa-123-chatgpt-review.md', out);
console.log('wrote batch-bucketa-123-chatgpt-review.md —', out.split('\n').length, 'lines,', Math.round(out.length / 1024), 'KB');
