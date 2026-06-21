// Structural + behavioral smoke for the token-profile aggregator.
// This API FETCHES live data, so output is non-deterministic — we verify structure, the parallel
// fan-out, REAL-DATA grounding (CoinGecko + DexScreener + chain explorer), multi-chain support,
// the holder-honesty boundary, partial-result handling, always-200, and 400 input guards.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUG = 'token-profile';
const USDC = process.env.SMOKE_TOKEN || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on ethereum
const SOL_TOKEN = process.env.SMOKE_SOL_TOKEN || 'DezXAZ8z7PnrnRJjz3wXBoRgixCA6xjnB7YaB1pPB263'; // BONK (SPL mint)
const TIERS = new Set(['trusted', 'neutral', 'caution', 'high_risk', 'unknown']);
const VERDICTS = new Set(['allow', 'review', 'caution']);

async function getJson(url, opts) { const r = await fetch(url, opts); return { status: r.status, json: await r.json() }; }
const post = (path, body) => getJson(`${B}/${SLUG}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

let pass = 0, fail = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); ok ? pass++ : fail++; };

// 1) Published examples validate against their own OpenAPI schema.
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

// 2) Live /intel for a real EVM token (USDC): always 200, full fan-out incl. real grounding.
{
  const { status, json } = await post('/intel', { address: USDC });
  log(status === 200 && json.success === true, `/intel EVM — always HTTP 200 success:true (got ${status})`);
  log(json.chain_family === 'evm', `/intel EVM — chain_family evm (got ${json.chain_family})`);
  log(TIERS.has(json.trust_tier) && VERDICTS.has(json.verdict), `/intel EVM — valid trust_tier+verdict (got ${json.trust_tier}/${json.verdict})`);
  const sources = (json.source_fetches || []).map((s) => s.source).sort().join(',');
  log(sources === 'coingecko,dexscreener,holders,onchain_contract', `/intel EVM — fanned out to all 4 sources (got ${sources})`);
  log(json.identity?.coingecko_listed === true && json.identity?.symbol === 'USDC', `/intel EVM — CoinGecko identity live (symbol ${json.identity?.symbol}, listed ${json.identity?.coingecko_listed})`);
  log(typeof json.market?.price_usd === 'number' && json.market.price_usd > 0, `/intel EVM — live market price present (got ${json.market?.price_usd})`);
  log(typeof json.liquidity?.total_dex_liquidity_usd === 'number', `/intel EVM — live DEX liquidity present (got ${json.liquidity?.total_dex_liquidity_usd})`);
  log(json.contract?.verified_source === true, `/intel EVM — contract verified_source true (real Etherscan; got ${json.contract?.verified_source})`);
  log(json.holders?.available === false && json.holders?.holder_count === null, `/intel EVM — holders honestly unavailable, NOT fabricated`);
  log(typeof json.trust_score === 'number' || json.data_unavailable === true, `/intel EVM — trust_score present or data_unavailable flagged`);
}

// 3) Solana token → chain_family solana, mint-authority facts from RPC, no EVM-only sources.
{
  const { status, json } = await post('/intel', { address: SOL_TOKEN, chain: 'solana' });
  log(status === 200 && json.chain_family === 'solana', `/intel SOL — 200 + chain_family solana (got ${json.chain_family})`);
  log(typeof json.contract?.mint_authority_renounced === 'boolean' || json.contract?.mint_authority_renounced === null, `/intel SOL — mint_authority field present (got ${json.contract?.mint_authority_renounced})`);
  log(json.contract?.verified_source === null, `/intel SOL — verified_source null on Solana (N/A; got ${json.contract?.verified_source})`);
}

// 4) /lookup adds reasoning + invalidators.
{
  const { status, json } = await post('/lookup', { address: USDC });
  log(status === 200 && Array.isArray(json.reasoning?.key_factors) && json.reasoning.key_factors.length > 0, `/lookup — 200 + reasoning.key_factors present`);
  log(Array.isArray(json.reasoning?.invalidators) && json.reasoning.invalidators.some((s) => /honeypot|rug/i.test(s)), `/lookup — invalidator disclaims honeypot/rug scan`);
}

// 5) Input guards → 400.
for (const [label, body] of [['empty', {}], ['garbage', { foo: 'bar' }], ['wrong-type', { address: 123 }], ['evm-on-solana', { address: USDC, chain: 'solana' }]]) {
  const { status, json } = await post('/intel', body);
  log(status === 400 && json?.error?.code === 'invalid_request', `/intel — ${label} input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
