// Assembles the Group D finance batch 3 ChatGPT review bundle:
// header + grading criteria + shared scaffold + finance tail + shared quant math
// + per-API (intelligence.ts, openapi.ts, generated OpenAPI spec, live example
// responses + error cases). Request examples are pulled from each endpoint's
// OpenAPI requestBody example; error cases mirror x402-test/smoke-groupd-batch3.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const SLUGS = ['break-even', 'correlation-beta', 'kelly-criterion', 'payback-period', 'unit-economics'];

// Extra error / edge calls per API (mirrors the smoke drift-guard).
const ERROR_CALLS = {
  'break-even': [
    ['POST /units (error: contribution <= 0)', '/units', { fixed_costs: 50000, price_per_unit: 25, variable_cost_per_unit: 40 }],
    ['POST /revenue (error: ratio out of range)', '/revenue', { fixed_costs: 50000, contribution_margin_ratio: 0 }],
  ],
  'correlation-beta': [
    ['POST /correlation (error: length mismatch)', '/correlation', { series_a: [1, 2, 3], series_b: [1, 2] }],
    ['POST /beta (error: too few points)', '/beta', { asset_returns: [1], benchmark_returns: [1] }],
  ],
  'kelly-criterion': [
    ['POST /kelly (error: probability out of range)', '/kelly', { win_probability: 1.5, win_payoff: 1 }],
  ],
  'payback-period': [
    ['POST /simple (error: cashflows not an array)', '/simple', { initial_investment: 100000, cashflows: 'nope' }],
  ],
  'unit-economics': [
    ['POST /ltv-cac (error: zero churn ⇒ infinite life)', '/ltv-cac', { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0 }],
  ],
};

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
async function getSpec(slug) {
  const r = await fetch(`${B}/${slug}/openapi.json`);
  return r.json();
}

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Group D Finance Batch 3 — ChatGPT Review Bundle (Orbis A+ finance/quant APIs)');
p('');
p(`Date: 2026-06-18 · shipped in PR #63 · tsc clean · smoke 47/47 green · live-verified on Render`);
p('');
p('Five deterministic, agent-native finance/quant APIs: **break-even**, **correlation-beta**, **kelly-criterion**, **payback-period**, **unit-economics**. Built on the shared `_aplus` scaffold + finance tail (`specparts-finance.ts`, required `financial_disclaimer`); shared quant math in `_aplus/finance.ts`.');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic finance math (unit/revenue break-even, contribution margin & margin of safety; Pearson correlation/covariance and beta/alpha/R² of an asset vs a benchmark; optimal & fractional Kelly stake and gambler\'s-ruin probability; simple & discounted payback period with NPV and profitability index; LTV, LTV:CAC ratio, CAC payback, and gross/contribution margins).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, calculation_certainty, confidence_per_section, recommended_actions_priority_order, chain_to with executable url, privacy, execution_metadata side_effects/compute_class, financial_disclaimer; reasoning + capabilities on /lookup).');
p('3. **Honesty** (no fabrication; nothing stored; model/implied values, not market quotes; disclaimers present; deterministic-only).');
p('4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; x-pricing; x-financial-calculation; request/response examples present).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets, typical_use_cases in discovery).');
p('Flag any bug, incorrect output, security footgun, or schema/response drift.');
p('');
p('All five are deterministic — **no LLM call anywhere**.');
p('');
p('## Shared A+ scaffold — `src/routes/_aplus/scaffold.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/scaffold.ts`, 'utf8').trimEnd());
p('```');
p('');
p('## Finance tail — `src/routes/_aplus/specparts-finance.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/specparts-finance.ts`, 'utf8').trimEnd());
p('```');
p('');
p('## Shared quant math — `src/routes/_aplus/finance.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/finance.ts`, 'utf8').trimEnd());
p('```');
p('');

for (const slug of SLUGS) {
  const spec = await getSpec(slug);
  p('---');
  p('');
  p(`# ${slug}`);
  p('');
  p('## intelligence.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${slug}-api/routes/intelligence.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p('## openapi.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${slug}-api/routes/openapi.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p(`## Generated OpenAPI spec (served at GET /${slug}/openapi.json)`);
  p('```json');
  p(JSON.stringify(spec, null, 2));
  p('```');
  p('');
  p('## Live example responses (happy path — replayed from each endpoint\'s published request example)');
  for (const [path, ops] of Object.entries(spec.paths)) {
    const op = ops.post;
    if (!op) continue;
    const reqEx = op.requestBody?.content?.['application/json']?.example;
    if (!reqEx) continue;
    const { status, json } = await post(`/${slug}${path}`, reqEx);
    p(`### POST ${path}`);
    p('Request:');
    p('```json');
    p(JSON.stringify(reqEx, null, 2));
    p('```');
    p(`Response (HTTP ${status}):`);
    p('```json');
    p(JSON.stringify(json, null, 2));
    p('```');
    p('');
  }
  p('## Live error / edge responses');
  for (const [label, path, body] of (ERROR_CALLS[slug] || [])) {
    const { status, json } = await post(`/${slug}${path}`, body);
    p(`### ${label}`);
    p('Request:');
    p('```json');
    p(JSON.stringify(body, null, 2));
    p('```');
    p(`Response (HTTP ${status}):`);
    p('```json');
    p(JSON.stringify(json, null, 2));
    p('```');
    p('');
  }
}

const outPath = `${ROOT}/groupd-finance-batch3-chatgpt-review.md`;
writeFileSync(outPath, out);
console.log('Wrote', outPath, '(' + out.split('\n').length + ' lines)');
