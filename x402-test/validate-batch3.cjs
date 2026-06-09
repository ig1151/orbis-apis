// Batch-3 (post-review revision) validator.
// Mounts each API's router, hits every endpoint with real HTTP, and validates
// each 200 response against the published OpenAPI schema using ajv 2020.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'aes-vault': {
    router: require('../dist/routes/aes-vault-api/routes/intelligence').default,
    spec: require('../dist/routes/aes-vault-api/routes/openapi').spec,
  },
  'cron-explainer': {
    router: require('../dist/routes/cron-explainer-api/routes/intelligence').default,
    spec: require('../dist/routes/cron-explainer-api/routes/openapi').spec,
  },
  'json-to-csv': {
    router: require('../dist/routes/json-to-csv-api/routes/intelligence').default,
    spec: require('../dist/routes/json-to-csv-api/routes/openapi').spec,
  },
  'unit-conversion': {
    router: require('../dist/routes/unit-conversion-api/routes/intelligence').default,
    spec: require('../dist/routes/unit-conversion-api/routes/openapi').spec,
  },
};

const app = express();
app.use(express.json({ limit: '2mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

// One ajv per spec, with the whole document registered so internal $refs resolve.
const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (schemaName, data) => {
    const v = ajv.getSchema(`${slug}#/components/schemas/${schemaName}`);
    if (!v) throw new Error(`no schema ${schemaName} in ${slug}`);
    const ok = v(data);
    return { ok, errors: v.errors };
  };
}

let pass = 0, fail = 0;
function check(slug, label, schemaName, data, extra) {
  const { ok, errors } = validators[slug](schemaName, data);
  let extraMsg = '';
  if (ok && extra) {
    const e = extra(data);
    if (e) { extraMsg = ' — ASSERT FAILED: ' + e; }
  }
  const good = ok && !extraMsg;
  if (good) { pass++; console.log(`  ✓ ${label} → ${schemaName}`); }
  else {
    fail++;
    console.log(`  ✗ ${label} → ${schemaName}${extraMsg}`);
    if (!ok) console.log('    ' + JSON.stringify(errors));
  }
}

async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function run(base) {
  // ---- AES Vault (round-trip with a real generated key) ----
  console.log('aes-vault:');
  const disc = await call(base, 'GET', '/aes-vault/');
  check('aes-vault', 'GET /', 'DiscoveryResponse', disc);
  const gk = await call(base, 'POST', '/aes-vault/generate-key', {});
  check('aes-vault', 'POST /generate-key', 'GenerateKeyResponse', gk);
  const enc = await call(base, 'POST', '/aes-vault/encrypt', { plaintext: 'hello agent', key_base64: gk.key_base64 });
  check('aes-vault', 'POST /encrypt', 'EncryptResponse', enc);
  const dec = await call(base, 'POST', '/aes-vault/decrypt', { ciphertext_base64: enc.ciphertext_base64, iv_base64: enc.iv_base64, auth_tag_base64: enc.auth_tag_base64, key_base64: gk.key_base64 });
  check('aes-vault', 'POST /decrypt', 'DecryptResponse', dec, (d) => d.plaintext === 'hello agent' ? null : `round-trip mismatch: ${d.plaintext}`);
  const al = await call(base, 'POST', '/aes-vault/lookup', { plaintext: 'one call' });
  check('aes-vault', 'POST /lookup', 'LookupResponse', al);
  // security flags present in spec info
  const info = APIS['aes-vault'].spec.info;
  check('aes-vault', 'spec.info flags', 'DiscoveryResponse', disc, () =>
    info['x-security-sensitive'] === true && info['x-human-approval-required'] === false ? null : 'missing x-security-sensitive / x-human-approval-required');

  // ---- Cron Explainer (UTC + DST-aware timezone) ----
  console.log('cron-explainer:');
  check('cron-explainer', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/cron-explainer/'));
  check('cron-explainer', 'POST /explain', 'ExplainResponse', await call(base, 'POST', '/cron-explainer/explain', { expression: '0 9 * * 1-5' }));
  const cu = await call(base, 'POST', '/cron-explainer/lookup', { expression: '0 9 * * 1-5', from: '2026-06-08T00:00:00Z', count: 3 });
  check('cron-explainer', 'POST /lookup (UTC)', 'LookupResponse', cu, (d) =>
    d.next_runs_timezone === 'UTC' && d.next_run_count === 3 && d.next_runs[0].endsWith('Z') ? null : `UTC shape: ${JSON.stringify(d.next_runs)}`);
  const ctz = await call(base, 'POST', '/cron-explainer/lookup', { expression: '0 9 * * 1-5', from: '2026-06-08T00:00:00Z', count: 3, timezone: 'America/New_York' });
  check('cron-explainer', 'POST /lookup (America/New_York, DST)', 'LookupResponse', ctz, (d) =>
    d.next_runs_timezone === 'America/New_York' && d.next_run_count === 3 && /T09:00:00-0[45]:00$/.test(d.next_runs[0]) ? null : `tz shape: ${JSON.stringify(d.next_runs)}`);
  // DST sanity: a summer date is -04:00, a winter date is -05:00 for the same 09:00 local cron
  const cwin = await call(base, 'POST', '/cron-explainer/lookup', { expression: '0 9 1 1 *', from: '2026-12-01T00:00:00Z', count: 1, timezone: 'America/New_York' });
  check('cron-explainer', 'POST /lookup (winter EST offset)', 'LookupResponse', cwin, (d) =>
    d.next_runs[0].endsWith('-05:00') ? null : `expected EST -05:00, got ${d.next_runs[0]}`);
  // invalid timezone → typed 400
  const ctzbad = await call(base, 'POST', '/cron-explainer/lookup', { expression: '0 9 * * 1-5', timezone: 'Not/AZone' });
  check('cron-explainer', 'POST /lookup (bad tz → 400)', 'Error400', ctzbad, (d) => d.error && d.error.code === 'invalid_timezone' ? null : 'expected invalid_timezone');

  // ---- JSON to CSV (csv/json/jsonl) ----
  console.log('json-to-csv:');
  check('json-to-csv', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/json-to-csv/'));
  const data = [{ id: 1, user: { name: 'Ada' } }, { id: 2, user: { name: 'Lin' } }];
  const jcsv = await call(base, 'POST', '/json-to-csv/convert', { data, output: 'csv' });
  check('json-to-csv', 'POST /convert (csv)', 'ConvertResponse', jcsv, (d) => d.output_format === 'csv' && d.output.includes('id,user.name') ? null : `csv: ${d.output}`);
  const jjson = await call(base, 'POST', '/json-to-csv/convert', { data, output: 'json' });
  check('json-to-csv', 'POST /convert (json)', 'ConvertResponse', jjson, (d) => d.output_format === 'json' && Array.isArray(JSON.parse(d.output)) ? null : `json: ${d.output}`);
  const jjsonl = await call(base, 'POST', '/json-to-csv/convert', { data, output: 'jsonl' });
  check('json-to-csv', 'POST /convert (jsonl)', 'ConvertResponse', jjsonl, (d) => d.output_format === 'jsonl' && d.output.split('\n').length === 2 ? null : `jsonl: ${d.output}`);
  const jlu = await call(base, 'POST', '/json-to-csv/lookup', { data: [{ id: 1, active: true }, { id: 2, active: false }], output: 'jsonl' });
  check('json-to-csv', 'POST /lookup (jsonl)', 'LookupResponse', jlu, (d) => d.output_format === 'jsonl' && d.column_types && d.column_types.active === 'boolean' ? null : 'lookup jsonl');
  const jbad = await call(base, 'POST', '/json-to-csv/convert', { data, output: 'xml' });
  check('json-to-csv', 'POST /convert (bad output → 400)', 'Error400', jbad, (d) => d.error && d.error.code === 'invalid_options' ? null : 'expected invalid_options');

  // ---- Unit Conversion (supported-units catalog) ----
  console.log('unit-conversion:');
  check('unit-conversion', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/unit-conversion/'));
  const su = await call(base, 'GET', '/unit-conversion/supported-units');
  check('unit-conversion', 'GET /supported-units', 'SupportedUnitsResponse', su, (d) =>
    d.total_units === 58 && Object.keys(d.categories).length === 8 && d.categories.temperature.join() === 'C,F,K' ? null : `catalog: total=${d.total_units} cats=${Object.keys(d.categories).length}`);
  check('unit-conversion', 'POST /convert', 'ConvertResponse', await call(base, 'POST', '/unit-conversion/convert', { value: 10, from: 'km', to: 'mi' }));
  check('unit-conversion', 'POST /batch', 'BatchResponse', await call(base, 'POST', '/unit-conversion/batch', { conversions: [{ value: 100, from: 'C', to: 'F' }, { value: 1, from: 'GB', to: 'MiB' }] }));
  check('unit-conversion', 'POST /lookup', 'LookupResponse', await call(base, 'POST', '/unit-conversion/lookup', { value: 100, from: 'C', to: 'F' }));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  try { await run(`http://127.0.0.1:${port}`); }
  catch (e) { console.error(e); process.exit(1); }
  finally { server.close(); }
});
