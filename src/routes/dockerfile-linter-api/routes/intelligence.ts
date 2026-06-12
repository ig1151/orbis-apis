import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic Dockerfile linter. Parses instructions (handling line
// continuations) and flags well-known security / best-practice issues: running
// as root, unpinned base image, baked-in secrets, remote-exec pipes (curl|sh),
// ADD over COPY, apt layer hygiene, broad COPY, missing HEALTHCHECK. Produces a
// 0–100 score with located findings. Static heuristics — no LLM, nothing stored.

const router = Router();
const MAX_BYTES = 256 * 1024;
type Sev = 'high' | 'medium' | 'low';
const PENALTY: Record<Sev, number> = { high: 25, medium: 12, low: 5 };
const SECRET_KEY = /(?:PASSWORD|PASSWD|SECRET|TOKEN|API[_-]?KEY|ACCESS[_-]?KEY|PRIVATE[_-]?KEY|AWS_SECRET)/i;

export interface DockerFinding { line: number; instruction: string; severity: Sev; code: string; message: string; recommendation: string; }
export interface LintCore {
  stages: number; instruction_count: number; effective_user: string | null;
  findings: DockerFinding[]; by_severity: Record<Sev, number>; score: number; grade: string; passed: boolean;
}

interface Instr { line: number; name: string; args: string; }

function parse(text: string): Instr[] {
  const rawLines = text.split('\n');
  const out: Instr[] = [];
  let buf = ''; let startLine = 0;
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    const trimmed = line.trim();
    if (buf === '' && (trimmed === '' || trimmed.startsWith('#'))) continue;
    if (buf === '') startLine = i + 1;
    const cont = /\\\s*$/.test(line);
    buf += (buf ? ' ' : '') + line.replace(/\\\s*$/, '').trim();
    if (cont) continue;
    const m = buf.match(/^(\S+)\s*(.*)$/s);
    if (m) out.push({ line: startLine, name: m[1].toUpperCase(), args: m[2].trim() });
    buf = '';
  }
  if (buf) { const m = buf.match(/^(\S+)\s*(.*)$/s); if (m) out.push({ line: startLine, name: m[1].toUpperCase(), args: m[2].trim() }); }
  return out;
}

export function lint(body: any): { error: string } | { result: LintCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "dockerfile" string.' };
  if (typeof body.dockerfile !== 'string' || body.dockerfile.trim() === '') return { error: '"dockerfile" is required and must be a non-empty string.' };
  if (Buffer.byteLength(body.dockerfile, 'utf8') > MAX_BYTES) return { error: `"dockerfile" exceeds the ${MAX_BYTES}-byte limit.` };

  const instrs = parse(body.dockerfile);
  if (instrs.length === 0) return { error: 'No Dockerfile instructions found.' };
  const froms = instrs.filter((i) => i.name === 'FROM');
  if (froms.length === 0) return { error: 'No FROM instruction found — this does not look like a Dockerfile.' };

  const findings: DockerFinding[] = [];
  const add = (i: Instr | null, severity: Sev, code: string, message: string, recommendation: string) =>
    findings.push({ line: i ? i.line : 0, instruction: i ? i.name : '(file)', severity, code, message, recommendation });

  // Base image pinning
  for (const f of froms) {
    const ref = f.args.split(/\s+/)[0];
    const name = ref.split(' AS ')[0];
    const tag = name.includes('@sha256:') ? 'digest' : (name.includes(':') ? name.split(':').pop()! : null);
    if (tag === null) add(f, 'medium', 'UNPINNED_BASE_IMAGE', `FROM ${name} has no tag, defaulting to :latest — builds are non-reproducible.`, 'Pin to a specific version tag or, better, a @sha256 digest.');
    else if (tag === 'latest') add(f, 'medium', 'LATEST_TAG', `FROM ${name} uses the :latest tag — builds are non-reproducible.`, 'Pin to a specific version tag or @sha256 digest.');
  }

  // Effective user (last USER wins)
  const users = instrs.filter((i) => i.name === 'USER');
  const effective_user = users.length ? users[users.length - 1].args.split(/\s+/)[0] : null;
  if (effective_user === null) add(froms[froms.length - 1], 'high', 'RUNS_AS_ROOT', 'No USER instruction — the container runs as root by default.', 'Create and switch to a non-root user (USER appuser) before the runtime command.');
  else if (effective_user === 'root' || effective_user === '0') add(users[users.length - 1], 'high', 'RUNS_AS_ROOT', `Effective USER is "${effective_user}" — the container runs as root.`, 'Switch to a non-root user for the runtime stage.');

  let hasHealthcheck = false;
  for (const i of instrs) {
    if (i.name === 'HEALTHCHECK') hasHealthcheck = true;
    if ((i.name === 'ENV' || i.name === 'ARG') && SECRET_KEY.test(i.args) && /[=\s]\S/.test(i.args.replace(/^\S+/, ''))) {
      // ARG without default has no value → skip; ENV/ARG with a value and a secret-y name → flag
      const hasValue = i.name === 'ENV' ? /\s+\S/.test(i.args) || i.args.includes('=') : i.args.includes('=');
      if (hasValue) add(i, 'high', 'SECRET_IN_IMAGE', `${i.name} appears to bake a secret into an image layer (matched a credential-like name).`, 'Pass secrets at runtime (env/secret mounts), never via ENV/ARG — they persist in image history.');
    }
    if (i.name === 'RUN') {
      if (/(?:curl|wget)\b[^|]*\|\s*(?:sudo\s+)?(?:sh|bash)\b/i.test(i.args)) add(i, 'high', 'REMOTE_EXEC_PIPE', 'Pipes a downloaded script straight into a shell (curl … | sh) — no integrity check, full RCE on the build.', 'Download, verify a checksum/signature, then execute.');
      if (/\bsudo\b/.test(i.args)) add(i, 'low', 'SUDO_IN_BUILD', 'Uses sudo in a RUN layer — unnecessary since builds already run as root and it can mask the effective user.', 'Remove sudo; use USER to control privileges.');
      if (/\bapt-get\s+install\b/.test(i.args) && !/--no-install-recommends/.test(i.args)) add(i, 'low', 'APT_RECOMMENDS', 'apt-get install without --no-install-recommends pulls extra packages and bloats the image.', 'Add --no-install-recommends.');
      if (/\bapt-get\s+install\b/.test(i.args) && !/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(i.args)) add(i, 'low', 'APT_LIST_NOT_CLEANED', 'apt package lists are not removed in the same layer, bloating the image.', 'Append "&& rm -rf /var/lib/apt/lists/*" to the RUN.');
    }
    if (i.name === 'ADD') {
      const src = i.args.split(/\s+/)[0] || '';
      if (!/^https?:\/\//i.test(src) && !/\.(tar|tgz|tar\.gz|tar\.bz2|tar\.xz)\b/i.test(src)) add(i, 'low', 'ADD_INSTEAD_OF_COPY', 'ADD is used for a local path; ADD has surprising auto-extract/URL behavior.', 'Use COPY for local files; reserve ADD for remote URLs or tar auto-extraction.');
    }
    if (i.name === 'COPY' && /^(?:--\S+\s+)*\.\s+/.test(i.args)) add(i, 'low', 'BROAD_COPY', 'COPY . copies the entire build context, which can leak .env, .git, and secrets into the image.', 'Copy only what is needed and add a thorough .dockerignore.');
  }
  if (!hasHealthcheck) add(null, 'low', 'MISSING_HEALTHCHECK', 'No HEALTHCHECK instruction; orchestrators cannot detect an unhealthy container.', 'Add a HEALTHCHECK appropriate to the service.');

  const by_severity: Record<Sev, number> = { high: 0, medium: 0, low: 0 };
  let score = 100;
  for (const f of findings) { by_severity[f.severity]++; score -= PENALTY[f.severity]; }
  score = Math.max(0, score);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';
  findings.sort((a, b) => PENALTY[b.severity] - PENALTY[a.severity] || a.line - b.line || a.code.localeCompare(b.code));

  return { result: { stages: froms.length, instruction_count: instrs.length, effective_user, findings, by_severity, score, grade, passed: by_severity.high === 0 } };
}

const CHAIN_TO = [
  { api: 'secret-scanner', reason: 'Deep-scan the Dockerfile and build context for embedded credentials.' },
  { api: 'env-validator', reason: 'Validate the runtime env the container expects instead of baking it in.' },
];
const INVALIDATORS = [
  'Static parsing cannot resolve what a base image or a RUN script actually does, so it may miss issues introduced downstream or flag intentional patterns.',
  'USER analysis takes the last USER as effective; multi-stage builds where the final stage differs may need manual confirmation.',
  'Best-practice findings (apt hygiene, HEALTHCHECK) are advisory and context-dependent, not security guarantees.',
];

function actions(r: LintCore): string[] {
  if (r.findings.length === 0) return [`No issues detected — score ${r.score}/100 (${r.grade}).`, 'Re-lint on every Dockerfile change and scan built images for CVEs.'];
  const top = r.findings[0];
  return [
    `Score ${r.score}/100 (${r.grade}); ${r.by_severity.high} high-severity issue(s). Fix first: ${top.code} at line ${top.line}.`,
    top.recommendation,
    'Rebuild and re-lint; pair with an image vulnerability scan.',
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Dockerfile Linter API', version: '1.0.0',
    description: 'Deterministic Dockerfile linter. Parses instructions and flags security / best-practice issues (runs as root, unpinned base image, baked-in secrets, curl|sh remote-exec, ADD over COPY, apt hygiene, broad COPY, missing HEALTHCHECK) with a 0–100 score. Static heuristics, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/dockerfile-linter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/lint', summary: 'Lint a Dockerfile', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/lint', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: LintCore) => ({
  confidence_score: 0.9, confidence_per_section: { dockerfile: 0.9 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/lint', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.instruction_count} instruction(s) across ${v.stages} stage(s); ${v.findings.length} finding(s) → score ${v.score}/100 (${v.grade}).`,
      key_factors: [
        `Effective user: ${v.effective_user ?? 'root (no USER)'}.`,
        `Severity: ${v.by_severity.high} high, ${v.by_severity.medium} medium, ${v.by_severity.low} low.`,
        v.findings.length ? `Top issue: ${v.findings[0].code} at line ${v.findings[0].line}.` : 'No violations found.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
