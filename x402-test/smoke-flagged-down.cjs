const express = require('express');
const load = p => { const m = require(p); return m.default || m; };
const app = express();
app.use(express.json());
app.use('/fear-greed', load('../dist/routes/fear-greed-api/routes/intelligence.js'));
app.use('/betting-odds', load('../dist/routes/betting-odds-api/routes/intelligence.js'));
app.use('/wallet-address-risk', load('../dist/routes/wallet-address-risk-api/routes/intelligence.js'));
let pass = 0, fail = 0;
const ck = (n, c, x) => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, JSON.stringify(x).slice(0, 250))); };
const srv = app.listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const post = async (p, b) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, json: await r.json().catch(() => null) }; };

  console.log('# fear-greed (alternative.me REAL source)');
  let r = await post('/fear-greed/current', { asset: 'crypto' });
  ck('current 200 success', r.status === 200 && r.json.success === true, r.json && { s: r.json.success, e: r.json.error });
  ck('real value 0-100', typeof r.json.index?.value === 'number' && r.json.index.value >= 0 && r.json.index.value <= 100, r.json.index);
  ck('real label present', typeof r.json.index?.label === 'string' && r.json.index.label.length > 0, r.json.index);
  ck('provider alternative.me', r.json.source_provenance?.provider === 'alternative.me', r.json.source_provenance);
  ck('drivers NOT fabricated (empty + note)', Array.isArray(r.json.drivers) && r.json.drivers.length === 0 && Array.isArray(r.json.data_notes), r.json.drivers);
  ck('signal derived', ['buy', 'neutral', 'sell'].includes(r.json.signal), r.json.signal);

  r = await post('/fear-greed/history', { days: 14 });
  ck('history 200 success', r.status === 200 && r.json.success === true, r.json && { s: r.json.success, e: r.json.error });
  ck('history array of real points', Array.isArray(r.json.history) && r.json.history.length > 1 && typeof r.json.history[0].value === 'number', r.json.history && r.json.history[0]);
  ck('summary min<=max', r.json.summary && r.json.summary.min_value <= r.json.summary.max_value, r.json.summary);

  r = await post('/fear-greed/lookup', {});
  ck('lookup 200 success', r.status === 200 && r.json.success === true, r.json && { s: r.json.success, e: r.json.error });
  ck('lookup has 30d_summary', !!r.json['30d_summary'], Object.keys(r.json || {}));

  r = await post('/fear-greed/current', { asset: 'stocks' });
  ck('unsupported asset → success:false (no fabrication)', r.status === 200 && r.json.success === false && r.json.error === 'data_unavailable', r.json && { s: r.json.success, e: r.json.error });

  console.log('# betting-odds (hardened: no 500, valid-input 200 or honest degrade)');
  r = await post('/betting-odds/odds', {});
  ck('missing sport → 400', r.status === 400, r.status);
  r = await post('/betting-odds/odds', { sport: 'basketball_nba' });
  ck('odds never 500 (200)', r.status === 200, { status: r.status, j: r.json });
  ck('odds success boolean present', typeof r.json?.success === 'boolean', r.json && Object.keys(r.json));

  console.log('# wallet-address-risk (hardened: no 500)');
  r = await post('/wallet-address-risk/check', {});
  ck('missing input → 400', r.status === 400, r.status);
  r = await post('/wallet-address-risk/check', { input: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' });
  ck('check never 500 (200)', r.status === 200, { status: r.status, j: r.json });

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  srv.close(); process.exit(fail ? 1 : 0);
});
