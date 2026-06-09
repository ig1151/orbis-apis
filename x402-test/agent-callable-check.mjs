// Agent-callability healthcheck.
// For each API we fetch its OpenAPI spec (what an agent uses to discover + call it),
// then verify: HTTP 200, valid JSON, and at least one callable path with operations.
import { readFileSync } from "node:fs";

const urls = readFileSync(new URL("./healthcheck-urls.txt", import.meta.url), "utf8")
  .split("\n").map(s => s.trim()).filter(Boolean);

const CONCURRENCY = 10;
const TIMEOUT_MS = 60000; // Render free tier cold starts can be slow
const results = [];

function nameOf(u) {
  // slug between host and /openapi.json
  const m = u.replace(/^https?:\/\/[^/]+\//, "").replace(/\/openapi\.json$/, "");
  return m || "(root)";
}

async function fetchSpec(url, attempt = 1) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "orbis-agent-healthcheck/1.0", "Accept": "application/json" },
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      if (res.status >= 500 && attempt < 2) return fetchSpec(url, attempt + 1);
      return { url, name: nameOf(url), ok: false, ms, code: `HTTP_${res.status}`, detail: "" };
    }
    let body;
    try { body = await res.json(); }
    catch { return { url, name: nameOf(url), ok: false, ms, code: "BAD_JSON", detail: "spec did not parse as JSON" }; }

    const isOpenApi = body && (body.openapi || body.swagger);
    const paths = body && body.paths && typeof body.paths === "object" ? Object.keys(body.paths) : [];
    const ops = paths.reduce((n, p) => {
      const item = body.paths[p] || {};
      return n + Object.keys(item).filter(k => ["get","post","put","patch","delete"].includes(k.toLowerCase())).length;
    }, 0);

    if (!isOpenApi) return { url, name: nameOf(url), ok: false, ms, code: "NOT_OPENAPI", detail: "no openapi/swagger field" };
    if (paths.length === 0 || ops === 0) return { url, name: nameOf(url), ok: false, ms, code: "NO_PATHS", detail: "spec has no callable operations" };
    return { url, name: nameOf(url), ok: true, ms, code: "OK", detail: `${paths.length} paths / ${ops} ops`, paths: paths.length, ops };
  } catch (e) {
    const ms = Date.now() - start;
    const to = e.name === "TimeoutError" || /timeout|aborted/i.test(e.message || "");
    if (to && attempt < 2) return fetchSpec(url, attempt + 1);
    return { url, name: nameOf(url), ok: false, ms, code: to ? "TIMEOUT" : "NETWORK_ERR", detail: e.message || String(e) };
  }
}

let idx = 0, done = 0;
async function worker() {
  while (idx < urls.length) {
    const my = idx++;
    const r = await fetchSpec(urls[my]);
    results[my] = r;
    done++;
    const tag = r.ok ? "OK  " : "FAIL";
    process.stdout.write(`[${String(done).padStart(3)}/${urls.length}] ${tag} ${r.code.padEnd(11)} ${r.name.padEnd(42)} ${r.ms}ms ${r.ok ? "("+r.detail+")" : r.detail}\n`);
  }
}

console.log(`Checking ${urls.length} APIs for agent-callability (OpenAPI spec reachable + valid + has callable paths)...\n`);
const t0 = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

const ok = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);
const byCode = {};
for (const r of fail) byCode[r.code] = (byCode[r.code] || 0) + 1;

console.log("\n================ SUMMARY ================");
console.log(`Total checked : ${results.length}`);
console.log(`Agent-callable: ${ok.length}  (${(ok.length/results.length*100).toFixed(1)}%)`);
console.log(`Not callable  : ${fail.length}`);
console.log(`Wall time     : ${elapsed}s`);
if (fail.length) {
  console.log("\nFailure breakdown:");
  for (const [code, n] of Object.entries(byCode).sort((a,b)=>b[1]-a[1])) console.log(`  ${code.padEnd(12)} ${n}`);
  console.log("\nNot-callable APIs:");
  for (const r of fail.sort((a,b)=>a.code.localeCompare(b.code))) console.log(`  ${r.code.padEnd(12)} ${r.name.padEnd(42)} ${r.detail}`);
}

import { writeFileSync } from "node:fs";
writeFileSync(new URL("./agent-callable-results.json", import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, callable: ok.length, failed: fail.length, results }, null, 2));
console.log("\nFull results -> x402-test/agent-callable-results.json");
