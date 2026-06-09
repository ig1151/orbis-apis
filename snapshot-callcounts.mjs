// snapshot-callcounts.mjs
//
// Snapshots per-API lifetime callCount from the Orbis marketplace so you can
// diff two points in time and see which APIs got called in between (e.g. "last 48h").
//
// The listings endpoint only exposes a CUMULATIVE callCount per API — there is no
// per-call timestamp. The only reliable way to get a time window is to snapshot now
// and diff later. This script does both.
//
// Usage:
//   ORBIS_API_KEY=xxx node snapshot-callcounts.mjs           # fetch live, save snapshot, diff vs previous
//   ORBIS_API_KEY=xxx node snapshot-callcounts.mjs --no-save # fetch live, diff only, don't save
//   node snapshot-callcounts.mjs --from-file listings.json   # seed a baseline from a saved listings payload (no key needed)
//   node snapshot-callcounts.mjs --diff-only                 # diff the two most recent saved snapshots, no fetch
//
// Snapshots are written to ./usage-snapshots/callcounts-<ISO>.json

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SNAP_DIR = join(ROOT, "usage-snapshots");
const BASE_URL = "https://api.orbisapi.com/v1/listings";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

// ── Fetch all listing pages from the marketplace ──────────────────────────────
async function fetchListings() {
  const key = process.env.ORBIS_API_KEY;
  if (!key) {
    console.error("Error: ORBIS_API_KEY is not set.");
    console.error("Either: ORBIS_API_KEY=your_key node snapshot-callcounts.mjs");
    console.error("Or seed a baseline from a saved payload: node snapshot-callcounts.mjs --from-file <file.json>");
    process.exit(1);
  }
  const all = [];
  let page = 1;
  const limit = 100;
  while (true) {
    const url = `${BASE_URL}?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      console.error(`Fetch failed: HTTP ${res.status} on ${url}`);
      process.exit(1);
    }
    const body = await res.json();
    const apis = body.apis || [];
    all.push(...apis);
    const total = body.total ?? all.length;
    const totalPages = body.totalPages ?? 1;
    if (page >= totalPages || all.length >= total || apis.length === 0) break;
    page++;
  }
  return all;
}

// Load listings from a saved payload file (the shape you already pasted).
function listingsFromFile(path) {
  const body = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(body) ? body : body.apis || [];
}

// ── Snapshot shape: { fetchedAt, count, apis: { <id>: {name, slug, callCount} } } ──
function buildSnapshot(listings) {
  const apis = {};
  for (const a of listings) {
    apis[a.id] = { name: a.name, slug: a.slug, callCount: a.callCount ?? 0 };
  }
  return { fetchedAt: new Date().toISOString(), count: listings.length, apis };
}

function snapshotPath(snap) {
  // ISO with colons stripped so it's filesystem-safe
  const stamp = snap.fetchedAt.replace(/[:.]/g, "-");
  return join(SNAP_DIR, `callcounts-${stamp}.json`);
}

function listSnapshots() {
  if (!existsSync(SNAP_DIR)) return [];
  return readdirSync(SNAP_DIR)
    .filter((f) => f.startsWith("callcounts-") && f.endsWith(".json"))
    .sort() // ISO timestamps sort chronologically
    .map((f) => join(SNAP_DIR, f));
}

function loadSnapshot(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// ── Diff two snapshots and print the APIs whose callCount changed ─────────────
function diff(prev, curr) {
  const hours = (new Date(curr.fetchedAt) - new Date(prev.fetchedAt)) / 36e5;
  console.log(
    `\nWindow: ${prev.fetchedAt}  →  ${curr.fetchedAt}  (${hours.toFixed(1)}h)\n`
  );

  const rows = [];
  let totalDelta = 0;
  for (const [id, c] of Object.entries(curr.apis)) {
    const before = prev.apis[id]?.callCount;
    if (before === undefined) {
      rows.push({ name: c.name, slug: c.slug, delta: c.callCount, note: "NEW listing", to: c.callCount });
      totalDelta += c.callCount;
      continue;
    }
    const delta = c.callCount - before;
    if (delta !== 0) {
      rows.push({ name: c.name, slug: c.slug, delta, from: before, to: c.callCount });
      totalDelta += delta;
    }
  }
  // Listings that disappeared
  for (const [id, p] of Object.entries(prev.apis)) {
    if (!(id in curr.apis)) rows.push({ name: p.name, slug: p.slug, delta: 0, note: "REMOVED" });
  }

  rows.sort((a, b) => b.delta - a.delta);

  if (rows.length === 0) {
    console.log("No change in callCount on any API.");
    return;
  }

  const pad = Math.max(...rows.map((r) => r.name.length), 4);
  console.log(`${"API".padEnd(pad)}   Δcalls   from → to   note`);
  console.log("-".repeat(pad + 30));
  for (const r of rows) {
    const range = r.from !== undefined ? `${r.from} → ${r.to}` : "";
    console.log(
      `${r.name.padEnd(pad)}   ${String(r.delta >= 0 ? "+" + r.delta : r.delta).padStart(6)}   ${range.padEnd(11)} ${r.note ?? ""}`
    );
  }
  console.log("-".repeat(pad + 30));
  console.log(`${rows.length} APIs changed · ${totalDelta} total new calls in window\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });

  if (flag("--diff-only")) {
    const snaps = listSnapshots();
    if (snaps.length < 2) {
      console.error(`Need at least 2 saved snapshots to diff (have ${snaps.length}). Run without --diff-only to create one.`);
      process.exit(1);
    }
    diff(loadSnapshot(snaps[snaps.length - 2]), loadSnapshot(snaps[snaps.length - 1]));
    return;
  }

  const fromFile = opt("--from-file");
  const listings = fromFile ? listingsFromFile(fromFile) : await fetchListings();
  const snap = buildSnapshot(listings);

  // Diff against the most recent existing snapshot BEFORE saving the new one.
  const existing = listSnapshots();
  if (existing.length > 0) {
    diff(loadSnapshot(existing[existing.length - 1]), snap);
  } else {
    console.log(`\nBaseline snapshot: ${snap.count} APIs captured. Run again later to see deltas.\n`);
  }

  if (!flag("--no-save")) {
    const path = snapshotPath(snap);
    writeFileSync(path, JSON.stringify(snap, null, 2));
    console.log(`Saved: ${path}`);
  }
})();
