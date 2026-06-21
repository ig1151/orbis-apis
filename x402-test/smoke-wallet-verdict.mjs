// Structural + behavioral smoke for the wallet-verdict aggregator.
// This API FETCHES live data, so output is non-deterministic — we verify structure,
// the parallel fan-out, REAL-DATA grounding (OFAC + on-chain), multi-chain support,
// partial-result handling, always-200, and 400 input guards.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUG = 'wallet-verdict';
const ADDR = process.env.SMOKE_ADDR || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth
// A real OFAC-sanctioned address (first entry in the live OFAC SDN ETH list) — must come back is_sanctioned:true.
const SANCTIONED = process.env.SMOKE_SANCTIONED || '0x0330070fd38ec3bb94f58fa55d40368271e9e54a';
const SOL_ADDR = process.env.SMOKE_SOL || 'So11111111111111111111111111111111111111112';
const BTC_ADDR = process.env.SMOKE_BTC || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const VERDICTS = new Set(['allow', 'review', 'block']);

async function getJson(url, opts) { const r = await fetch(url, opts); return { status: r.status, json: await r.json() }; }
const post = (path, body) => getJson(`${B}/${SLUG}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

let pass = 0, fail = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); ok ? pass++ : fail++; };

// 1) Published example validates against its own OpenAPI schema.
{
  const { json: spec } = await getJson(`${B}/${SLUG}/openapi.json`);
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const ref = op.responses?.['200']?.content?.['application/json']?.schema?.$ref;
      const example = op.responses?.['200']?.content?.['application/json']?.example;
      if (!ref || !example) continue;
      const validate = ajv.compile({ $ref: ref, components: spec.components });
      const ok = validate(example);
      if (!ok) console.log(JSON.stringify(validate.errors?.slice(0, 4), null, 2));
      log(ok, `${method.toUpperCase()} ${path} — published example matches schema`);
    }
  }
}

// 2) Live /verdict for a real EVM address: always 200, valid verdict, full fan-out incl. grounding.
{
  const { status, json } = await post('/verdict', { address: ADDR });
  log(status === 200 && json.success === true, `/verdict EVM — always HTTP 200 success:true (got ${status})`);
  log(VERDICTS.has(json.verdict), `/verdict EVM — verdict in {allow,review,block} (got ${json.verdict})`);
  log(json.chain_family === 'evm', `/verdict EVM — chain_family evm (got ${json.chain_family})`);
  const sources = (json.source_fetches || []).map((s) => s.source).sort().join(',');
  log(sources === 'address_risk,balance,ofac_sanctions,onchain,reputation', `/verdict EVM — fanned out to 5 sources incl. grounding (got ${sources})`);
  log(json.fetched?.sanctions && typeof json.fetched.sanctions.checked === 'boolean', `/verdict EVM — fetched.sanctions present`);
  log(json.fetched?.onchain && typeof json.fetched.onchain.checked === 'boolean', `/verdict EVM — fetched.onchain present`);
  log(json.is_sanctioned === false, `/verdict EVM — clean address is_sanctioned:false (got ${json.is_sanctioned})`);
  log(typeof json.composite_risk_score === 'number' || json.data_unavailable === true, `/verdict EVM — composite present, or data_unavailable flagged`);
}

// 3) Real OFAC-sanctioned address → is_sanctioned:true, hard_block, verdict block (REAL grounding).
{
  const { json } = await post('/verdict', { address: SANCTIONED });
  const sanc = json.fetched?.sanctions;
  // Only assert the hard contract when the OFAC list was actually reachable.
  if (sanc?.checked) {
    log(json.is_sanctioned === true, `/verdict OFAC — sanctioned address flagged is_sanctioned:true`);
    log(json.hard_block === true && json.verdict === 'block', `/verdict OFAC — hard_block + verdict block (got hb=${json.hard_block}, v=${json.verdict})`);
  } else {
    log(true, `/verdict OFAC — list unavailable in this env, skipping match assertion (checked=${sanc?.checked})`);
  }
}

// 4) Solana address → grounding-only fan-out (2 sources), chain_family solana.
{
  const { status, json } = await post('/verdict', { address: SOL_ADDR, chain: 'solana' });
  log(status === 200 && json.chain_family === 'solana', `/verdict SOL — 200 + chain_family solana (got ${json.chain_family})`);
  const s = (json.source_fetches || []).map((x) => x.source).sort().join(',');
  log(s === 'ofac_sanctions,onchain', `/verdict SOL — grounding-only 2 sources (got ${s})`);
}

// 5) Bitcoin address → grounding-only, chain_family bitcoin.
{
  const { json } = await post('/verdict', { address: BTC_ADDR, chain: 'bitcoin' });
  log(json.chain_family === 'bitcoin', `/verdict BTC — chain_family bitcoin (got ${json.chain_family})`);
  const s = (json.source_fetches || []).map((x) => x.source).sort().join(',');
  log(s === 'ofac_sanctions,onchain', `/verdict BTC — grounding-only 2 sources (got ${s})`);
}

// 6) /lookup adds reasoning.
{
  const { status, json } = await post('/lookup', { address: ADDR });
  log(status === 200 && json.success === true && json.reasoning && Array.isArray(json.reasoning.key_factors), `/lookup — 200 + reasoning.key_factors present`);
}

// 7) Input guards → 400.
for (const [label, body] of [['empty', {}], ['garbage', { address: 'nope' }], ['wrong-type', { address: 123 }], ['evm-on-solana', { address: ADDR, chain: 'solana' }]]) {
  const { status, json } = await post('/verdict', body);
  log(status === 400 && json.success === false, `/verdict — ${label} input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
