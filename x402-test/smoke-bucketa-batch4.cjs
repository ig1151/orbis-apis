// Bucket A batch 4 validator: live responses ajv-2020 vs published schema,
// spec responseExample drift guard, 400 paths, deterministic logic asserts.
// websocket-tester: route-level SSRF/validation 400s + drift guard, plus a
// direct probe() unit test against an in-process minimal WS echo server.
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'layer2-comparison': { router: require('../dist/routes/layer2-comparison-api/routes/intelligence').default, spec: require('../dist/routes/layer2-comparison-api/routes/openapi').spec },
  'web3-security-checklist': { router: require('../dist/routes/web3-security-checklist-api/routes/intelligence').default, spec: require('../dist/routes/web3-security-checklist-api/routes/openapi').spec },
  'tokenomics-explainer': { router: require('../dist/routes/tokenomics-explainer-api/routes/intelligence').default, spec: require('../dist/routes/tokenomics-explainer-api/routes/openapi').spec },
  'web3-wallet-risk-scorer': { router: require('../dist/routes/web3-wallet-risk-scorer-api/routes/intelligence').default, spec: require('../dist/routes/web3-wallet-risk-scorer-api/routes/openapi').spec },
  'websocket-tester': { router: require('../dist/routes/websocket-tester-api/routes/intelligence').default, spec: require('../dist/routes/websocket-tester-api/routes/openapi').spec },
};
const wsMod = require('../dist/routes/websocket-tester-api/routes/intelligence');

const app = express();
app.use(express.json({ limit: '2mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (name, data) => { const v = ajv.getSchema(`${slug}#/components/schemas/${name}`); if (!v) throw new Error(`no schema ${name}`); return { ok: v(data), errors: v.errors }; };
}

let pass = 0, fail = 0;
function check(slug, label, name, data, extra) {
  const { ok, errors } = validators[slug](name, data);
  let msg = ''; if (ok && extra) { const e = extra(data); if (e) msg = ' — ASSERT: ' + e; }
  if (ok && !msg) { pass++; console.log(`  ✓ ${label} → ${name}`); }
  else { fail++; console.log(`  ✗ ${label} → ${name}${msg}`); if (!ok) console.log('    ' + JSON.stringify(errors)); }
}
function assert(label, cond, detail) { if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.log(`  ✗ ${label} — ${detail}`); } }
function driftGuard(slug) {
  const { spec } = APIS[slug];
  for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
    const media = op.responses?.['200']?.content?.['application/json']; if (!media?.example) continue;
    check(slug, `spec example ${method.toUpperCase()} ${path}`, (media.schema?.$ref || '').split('/').pop(), media.example);
  }
}
async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

// Minimal in-process WebSocket echo server: RFC6455 handshake + echo one text frame.
function tinyEchoServer() {
  const server = http.createServer((_req, res) => res.end('ok'));
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.on('data', (buf) => {
      if (buf.length < 2) return;
      if ((buf[0] & 0x0f) !== 0x1) return; // only echo text frames
      const len = buf[1] & 0x7f; let off = 2; if (len >= 126) return;
      const masked = (buf[1] & 0x80) !== 0;
      let payload;
      if (masked) { const mask = buf.slice(off, off + 4); off += 4; const d = buf.slice(off, off + len); payload = Buffer.alloc(len); for (let i = 0; i < len; i++) payload[i] = d[i] ^ mask[i % 4]; }
      else payload = buf.slice(off, off + len);
      socket.write(Buffer.concat([Buffer.from([0x81, payload.length]), payload]));
    });
    socket.on('error', () => {});
  });
  return server;
}
const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));

async function run(base) {
  // ---- layer2-comparison ----
  console.log('layer2-comparison:');
  check('layer2-comparison', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/layer2-comparison/')).json);
  check('layer2-comparison', 'POST /chain (arbitrum)', 'ChainResponse', (await call(base, 'POST', '/layer2-comparison/chain', { chain: 'arbitrum' })).json, d => d.found === true && d.chain.type === 'optimistic_rollup' && d.chain.slug === 'arbitrum' && d.confidence_score === 0.85 ? null : `unexpected ${d.found}/${d.chain && d.chain.type}`);
  check('layer2-comparison', 'POST /chain (unknown)', 'ChainResponse', (await call(base, 'POST', '/layer2-comparison/chain', { chain: 'notachain' })).json, d => d.found === false && d.chain === null ? null : 'expected found:false');
  check('layer2-comparison', 'POST /compare', 'CompareResponse', (await call(base, 'POST', '/layer2-comparison/compare', { chains: ['arbitrum', 'starknet'] })).json, d => d.chains.length === 2 && d.cheapest === 'Starknet' && d.highest_throughput === 'Starknet' && d.all_settle_to.includes('Ethereum') ? null : `unexpected ${d.cheapest}/${d.highest_throughput}`);
  check('layer2-comparison', 'POST /lookup (compare mode)', 'LookupResponse', (await call(base, 'POST', '/layer2-comparison/lookup', { chains: ['base', 'zksync-era'] })).json, d => d.mode === 'compare' && d.chains.length === 2 && d.reasoning ? null : 'expected compare + reasoning');
  const l2Bad = await call(base, 'POST', '/layer2-comparison/compare', { chains: ['arbitrum'] });
  check('layer2-comparison', 'POST /compare (single -> 400)', 'Error400', l2Bad.json, () => l2Bad.status === 400 ? null : `status ${l2Bad.status}`);
  driftGuard('layer2-comparison');

  // ---- web3-security-checklist ----
  console.log('web3-security-checklist:');
  check('web3-security-checklist', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web3-security-checklist/')).json);
  check('web3-security-checklist', 'POST /assess', 'AssessResponse', (await call(base, 'POST', '/web3-security-checklist/assess', { external_audit: true, verified_source: true, access_control: true, reentrancy_protection: true, multisig_admin: true, adequate_test_coverage: true })).json, d => d.readiness_score === 75 && d.grade === 'B' && d.items_passed === 6 && d.do_not_deploy === false && d.confidence_score === 0.7 ? null : `unexpected ${d.readiness_score}/${d.grade}/${d.items_passed}`);
  check('web3-security-checklist', 'POST /assess (test_coverage_pct→adequate)', 'AssessResponse', (await call(base, 'POST', '/web3-security-checklist/assess', { external_audit: true, access_control: true, test_coverage_pct: 90 })).json, d => d.checklist.find(c => c.item === 'adequate_test_coverage').present === true ? null : 'expected coverage 90 -> adequate true');
  check('web3-security-checklist', 'POST /assess (red flag -> do_not_deploy)', 'AssessResponse', (await call(base, 'POST', '/web3-security-checklist/assess', { external_audit: true, owner_can_drain_funds: true })).json, d => d.do_not_deploy === true && d.red_flags_triggered.includes('owner_can_drain_funds') ? null : 'expected do_not_deploy');
  check('web3-security-checklist', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web3-security-checklist/lookup', { external_audit: true, access_control: true })).json, d => d.reasoning && d.security_disclaimer ? null : 'expected reasoning + disclaimer');
  const wscBad = await call(base, 'POST', '/web3-security-checklist/assess', [1, 2]);
  check('web3-security-checklist', 'POST /assess (array -> 400)', 'Error400', wscBad.json, () => wscBad.status === 400 ? null : `status ${wscBad.status}`);
  driftGuard('web3-security-checklist');

  // ---- tokenomics-explainer ----
  console.log('tokenomics-explainer:');
  check('tokenomics-explainer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/tokenomics-explainer/')).json);
  check('tokenomics-explainer', 'POST /analyze', 'AnalyzeResponse', (await call(base, 'POST', '/tokenomics-explainer/analyze', { total_supply: 1000000000, circulating_supply: 200000000, price_usd: 0.5, annual_emission: 50000000 })).json, d => d.circulating_pct === 20 && d.fully_diluted_valuation_usd === 500000000 && d.market_cap_usd === 100000000 && d.mc_to_fdv_ratio === 0.2 && d.annual_inflation_pct === 25 ? null : `unexpected ${d.circulating_pct}/${d.mc_to_fdv_ratio}/${d.annual_inflation_pct}`);
  check('tokenomics-explainer', 'POST /analyze (no price)', 'AnalyzeResponse', (await call(base, 'POST', '/tokenomics-explainer/analyze', { total_supply: 1000, circulating_supply: 1000 })).json, d => d.circulating_pct === 100 && d.market_cap_usd === null && d.fully_diluted_valuation_usd === null ? null : 'expected null valuation');
  check('tokenomics-explainer', 'POST /lookup (vesting)', 'LookupResponse', (await call(base, 'POST', '/tokenomics-explainer/lookup', { total_supply: 1000000000, circulating_supply: 200000000, vesting: [{ label: 'team', tokens: 200000000, unlock_month: 12 }, { label: 'investors', tokens: 300000000, unlock_month: 6 }] })).json, d => d.vesting && d.vesting.tracked_pct_of_total === 50 && d.vesting.next_unlock.label === 'investors' && d.vesting.schedule[0].label === 'investors' ? null : `unexpected vesting ${d.vesting && d.vesting.tracked_pct_of_total}`);
  const tkNoSupply = await call(base, 'POST', '/tokenomics-explainer/analyze', {});
  check('tokenomics-explainer', 'POST /analyze (no supply -> 400)', 'Error400', tkNoSupply.json, () => tkNoSupply.status === 400 ? null : `status ${tkNoSupply.status}`);
  const tkBadCirc = await call(base, 'POST', '/tokenomics-explainer/analyze', { total_supply: 100, circulating_supply: 200 });
  check('tokenomics-explainer', 'POST /analyze (circ>total -> 400)', 'Error400', tkBadCirc.json, () => tkBadCirc.status === 400 ? null : `status ${tkBadCirc.status}`);
  driftGuard('tokenomics-explainer');

  // ---- web3-wallet-risk-scorer ----
  console.log('web3-wallet-risk-scorer:');
  check('web3-wallet-risk-scorer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web3-wallet-risk-scorer/')).json);
  check('web3-wallet-risk-scorer', 'POST /score', 'ScoreResponse', (await call(base, 'POST', '/web3-wallet-risk-scorer/score', { age_days: 5, tx_count: 3, unlimited_approvals_count: 2, failed_tx_ratio: 0.4 })).json, d => d.risk_score === 49 && d.risk_band === 'medium' && d.risk_factors.length === 4 && d.confidence_score === 0.75 ? null : `unexpected ${d.risk_score}/${d.risk_band}`);
  check('web3-wallet-risk-scorer', 'POST /score (mixer forces high)', 'ScoreResponse', (await call(base, 'POST', '/web3-wallet-risk-scorer/score', { funded_by_mixer: true })).json, d => d.risk_band === 'high' && d.risk_factors.includes('funded_by_mixer') ? null : `expected forced high, got ${d.risk_band}`);
  check('web3-wallet-risk-scorer', 'POST /score (established mitigant)', 'ScoreResponse', (await call(base, 'POST', '/web3-wallet-risk-scorer/score', { age_days: 800, tx_count: 500, unique_counterparties: 60 })).json, d => d.risk_score === 0 && d.risk_band === 'low' && d.mitigants.length === 2 ? null : `expected 0/low + mitigants, got ${d.risk_score}/${d.mitigants.length}`);
  check('web3-wallet-risk-scorer', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web3-wallet-risk-scorer/lookup', { age_days: 5, unlimited_approvals_count: 1 })).json, d => d.reasoning && d.risk_disclaimer ? null : 'expected reasoning + disclaimer');
  const wrsBad = await call(base, 'POST', '/web3-wallet-risk-scorer/score', {});
  check('web3-wallet-risk-scorer', 'POST /score (no features -> 400)', 'Error400', wrsBad.json, () => wrsBad.status === 400 ? null : `status ${wrsBad.status}`);
  driftGuard('web3-wallet-risk-scorer');

  // ---- websocket-tester (route-level validation/SSRF + drift) ----
  console.log('websocket-tester:');
  check('websocket-tester', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/websocket-tester/')).json);
  const wtNoUrl = await call(base, 'POST', '/websocket-tester/test', {});
  check('websocket-tester', 'POST /test (no url -> 400)', 'Error400', wtNoUrl.json, () => wtNoUrl.status === 400 ? null : `status ${wtNoUrl.status}`);
  const wtScheme = await call(base, 'POST', '/websocket-tester/test', { url: 'https://example.com' });
  check('websocket-tester', 'POST /test (non-ws scheme -> 400)', 'Error400', wtScheme.json, () => wtScheme.status === 400 ? null : `status ${wtScheme.status}`);
  const wtLocal = await call(base, 'POST', '/websocket-tester/test', { url: 'ws://localhost:8080/' });
  check('websocket-tester', 'POST /test (localhost blocked -> 400)', 'Error400', wtLocal.json, () => wtLocal.status === 400 && /SSRF|loopback|private/i.test(wtLocal.json.error?.message || '') ? null : `expected SSRF block, status ${wtLocal.status}`);
  const wtPrivate = await call(base, 'POST', '/websocket-tester/test', { url: 'ws://10.0.0.5:9000/' });
  check('websocket-tester', 'POST /test (private IP blocked -> 400)', 'Error400', wtPrivate.json, () => wtPrivate.status === 400 ? null : `status ${wtPrivate.status}`);
  assert('isBlockedHost: 169.254.169.254 (metadata) blocked', wsMod.isBlockedHost('169.254.169.254') === true, 'metadata IP must be blocked');
  assert('isBlockedHost: public host allowed', wsMod.isBlockedHost('echo.websocket.org') === false, 'public host should be allowed');
  driftGuard('websocket-tester');

  // ---- websocket-tester (direct probe() against in-process WS servers) ----
  console.log('websocket-tester (live probe):');
  const echo = tinyEchoServer();
  const echoPort = await listen(echo);
  const r1 = await wsMod.probe(`ws://127.0.0.1:${echoPort}/`, 'ping', 5000, false);
  check('websocket-tester', 'probe echo (connected + echo_ok)', 'TestCore', r1, d => d.connected === true && typeof d.handshake_ms === 'number' && d.echo_received === true && d.echo_ok === true ? null : `unexpected ${JSON.stringify(r1)}`);
  const r2 = await wsMod.probe(`ws://127.0.0.1:${echoPort}/`, undefined, 5000, false);
  check('websocket-tester', 'probe no-echo (connected, echo_ok null)', 'TestCore', r2, d => d.connected === true && d.echo_requested === false && d.echo_ok === null ? null : `unexpected ${JSON.stringify(r2)}`);
  echo.close();

  const plain = http.createServer((_req, res) => res.end('not a websocket')); // no upgrade handler
  const plainPort = await listen(plain);
  const r3 = await wsMod.probe(`ws://127.0.0.1:${plainPort}/`, undefined, 5000, false);
  check('websocket-tester', 'probe non-WS server (connected:false)', 'TestCore', r3, d => d.connected === false && d.error_message !== null ? null : `expected failure, got ${JSON.stringify(r3)}`);
  plain.close();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, () => run(`http://127.0.0.1:${server.address().port}`).catch(e => { console.error(e); process.exit(1); }));
