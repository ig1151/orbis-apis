#!/usr/bin/env node
// Fleet harden: replace each fragile local `callClaude(prompt): Promise<string>`
// with an import of the hardened shared one in src/shared/ai.ts.
// Only touches blocks whose fingerprint matches the known fragile copy-paste
// (no-timeout axios POST to OpenRouter returning choices[0].message.content).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// all .ts files under src containing a local callClaude definition
const files = cp.execSync(
  `grep -rl "async function callClaude(prompt: string): Promise<string>" "${SRC}"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

// Match the function block: from the signature to the first line that is just "}".
const BLOCK_RE = /[ \t]*async function callClaude\(prompt: string\): Promise<string> \{[\s\S]*?\n\}\n/;

const changed = [];
const skipped = [];

for (const file of files) {
  let txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(BLOCK_RE);
  if (!m) { skipped.push([file, 'no-block-match']); continue; }
  const block = m[0];
  // fingerprint guard: only the known fragile pattern, and not already hardened
  const ok = block.includes('openrouter.ai/api/v1/chat/completions')
    && block.includes('choices[0].message.content')
    && block.includes('model: MODEL')
    && !block.includes('timeout')
    && block.length < 700;
  if (!ok) { skipped.push([file, 'fingerprint-mismatch']); continue; }
  if (/from ['"][^'"]*shared\/ai['"]/.test(txt) && /\bcallClaude\b/.test((txt.match(/import[^;]*shared\/ai['"];?/)||[''])[0])) {
    skipped.push([file, 'already-imports-callClaude']); continue;
  }

  // remove the local block
  let next = txt.replace(BLOCK_RE, '');

  // compute relative import path to src/shared/ai
  let rel = path.relative(path.dirname(file), path.join(SRC, 'shared', 'ai')).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  const importLine = `import { callClaude } from '${rel}';\n`;

  // insert import right after the axios import if present, else after first import
  if (/^import axios from 'axios';\n/m.test(next)) {
    next = next.replace(/^import axios from 'axios';\n/m, `import axios from 'axios';\n${importLine}`);
  } else {
    next = next.replace(/^(import [^\n]*\n)/, `$1${importLine}`);
  }

  changed.push(file);
  if (APPLY) fs.writeFileSync(file, next);
}

console.log(`files scanned: ${files.length}`);
console.log(`would change: ${changed.length}`);
console.log(`skipped:      ${skipped.length}`);
if (skipped.length) {
  const reasons = {};
  for (const [, r] of skipped) reasons[r] = (reasons[r] || 0) + 1;
  console.log('skip reasons:', reasons);
  for (const [f, r] of skipped.slice(0, 20)) console.log('  SKIP', r, f.replace(ROOT + '/', ''));
}
console.log(APPLY ? '\n*** APPLIED ***' : '\n(dry run — pass --apply to write)');
