import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic Mermaid diagram LINTER. /validate detects the diagram type, checks that
// delimiters ( ) [ ] { } and double quotes are balanced, and flags structurally suspect
// lines (with line numbers). It is a lexical/structural lint — NOT a port of the Mermaid
// grammar — so it will not catch every semantic error. No LLM, nothing stored.

const router = Router();

const MAX_LEN = 100_000;
const MAX_LINES = 5_000;

const KNOWN_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2',
  'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart',
  'requirementDiagram', 'C4Context', 'C4Container', 'C4Component', 'sankey-beta', 'xychart-beta', 'block-beta',
];
const FLOW_DIRECTIONS = new Set(['TB', 'TD', 'BT', 'RL', 'LR']);
const FLOW_KEYWORDS = /^(subgraph|end|direction|click|style|classDef|class|linkStyle|%%)/;
const ARROW_RE = /(-{2,}>|-{2,}|={2,}>|-\.->|-\.-|--[xo]|<-{2,}|o-{2,}|x-{2,}|~~~)/;

export interface Issue { line: number; severity: 'error' | 'warning'; code: string; message: string }
export interface ValidateCore {
  diagram_type: string | null; valid: boolean; line_count: number; content_line_count: number;
  balanced_delimiters: boolean; node_count: number | null; edge_count: number | null; issues: Issue[];
}

function detectType(line: string): string | null {
  const first = line.trim().split(/\s+/)[0];
  for (const t of KNOWN_TYPES) if (first === t || first.startsWith(t + ' ') || line.trim().startsWith(t)) {
    // exact first-token match preferred; allow "flowchart LR" / "graph TD"
    if (first === t) return t;
  }
  // handle "stateDiagram-v2", "sankey-beta" where first token equals the type already covered;
  return null;
}

function checkBalanced(text: string): { balanced: boolean; issues: Issue[] } {
  const issues: Issue[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const opens = new Set(['(', '[', '{']);
  const lines = text.split('\n');
  const stack: Array<{ ch: string; line: number }> = [];
  let inQuote = false;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.trim().startsWith('%%')) continue; // comment line
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; continue; }
      if (inQuote) continue;
      if (opens.has(c)) stack.push({ ch: c, line: li + 1 });
      else if (pairs[c]) {
        const top = stack.pop();
        if (!top || top.ch !== pairs[c]) {
          issues.push({ line: li + 1, severity: 'error', code: 'unbalanced_delimiter', message: `Unexpected closing "${c}" with no matching opener.` });
        }
      }
    }
    if (inQuote) {
      // quotes do not span lines in mermaid labels
      issues.push({ line: li + 1, severity: 'error', code: 'unterminated_quote', message: 'Double quote opened but not closed on this line.' });
      inQuote = false;
    }
  }
  for (const s of stack) issues.push({ line: s.line, severity: 'error', code: 'unbalanced_delimiter', message: `Opening "${s.ch}" was never closed.` });
  return { balanced: issues.length === 0, issues };
}

function validate(diagram: string): ValidateCore {
  const rawLines = diagram.split('\n');
  const issues: Issue[] = [];
  // Find first meaningful line (skip blanks, %% comments, %%{init}%% directives).
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim();
    if (t === '' || t.startsWith('%%')) continue;
    headerIdx = i; break;
  }
  let diagram_type: string | null = null;
  if (headerIdx === -1) {
    issues.push({ line: 1, severity: 'error', code: 'empty_diagram', message: 'Diagram is empty or contains only comments.' });
  } else {
    diagram_type = detectType(rawLines[headerIdx]);
    if (!diagram_type) issues.push({ line: headerIdx + 1, severity: 'error', code: 'unknown_diagram_type', message: `Unrecognized diagram type. Expected one of: ${KNOWN_TYPES.join(', ')}.` });
  }

  const bal = checkBalanced(diagram);
  issues.push(...bal.issues);

  const isFlow = diagram_type === 'graph' || diagram_type === 'flowchart';
  let node_count: number | null = null;
  let edge_count: number | null = null;

  // Flow direction check + per-line lint.
  if (isFlow && headerIdx !== -1) {
    const header = rawLines[headerIdx].trim().split(/\s+/);
    if (header.length >= 2 && !FLOW_DIRECTIONS.has(header[1])) {
      issues.push({ line: headerIdx + 1, severity: 'warning', code: 'unknown_direction', message: `"${header[1]}" is not a known flow direction (TB/TD/BT/RL/LR).` });
    }
    const nodes = new Set<string>();
    let edges = 0;
    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const t = rawLines[i].trim();
      if (t === '' || FLOW_KEYWORDS.test(t)) continue;
      const hasArrow = ARROW_RE.test(t);
      if (hasArrow) {
        edges++;
        const segs = t.split(ARROW_RE).filter((s) => s && !ARROW_RE.test(s));
        for (const s of segs) {
          const seg = s.trim().replace(/^\|[^|]*\|\s*/, ''); // strip a leading |edge label|
          const id = seg.split(/[\[({|]/)[0].trim();
          if (id) nodes.add(id);
        }
        // arrow at end with no target
        if (/(-{2,}>?|={2,}>?)\s*$/.test(t)) issues.push({ line: i + 1, severity: 'warning', code: 'dangling_edge', message: 'Edge appears to have no target node.' });
      } else if (/^[A-Za-z0-9_]+(\[.*\]|\(.*\)|\{.*\})?$/.test(t)) {
        nodes.add(t.split(/[\[({]/)[0].trim());
      } else {
        issues.push({ line: i + 1, severity: 'warning', code: 'unrecognized_line', message: 'Line is neither a recognized edge, node, nor keyword.' });
      }
    }
    node_count = nodes.size;
    edge_count = edges;
  }

  const content_line_count = rawLines.filter((l) => l.trim() !== '' && !l.trim().startsWith('%%')).length;
  const valid = !issues.some((x) => x.severity === 'error');
  return { diagram_type, valid, line_count: rawLines.length, content_line_count, balanced_delimiters: bal.balanced, node_count, edge_count, issues };
}

function readDiagram(raw: unknown): { error: string } | { diagram: string } {
  if (typeof raw !== 'string') return { error: '"diagram" must be a string.' };
  if (raw.length > MAX_LEN) return { error: `"diagram" exceeds the ${MAX_LEN}-character limit.` };
  if (raw.split('\n').length > MAX_LINES) return { error: `"diagram" exceeds the ${MAX_LINES}-line limit.` };
  return { diagram: raw };
}

const CHAIN_TO = [
  { api: 'table-formatter', reason: 'Render the issue list as a Markdown table for a PR comment or report.' },
];
const INVALIDATORS = [
  'This is a LEXICAL/STRUCTURAL lint, not the Mermaid parser: it reliably detects the diagram type, unbalanced delimiters ( ) [ ] { }, unterminated quotes, and (for flowcharts) dangling/unrecognized lines. It does NOT fully validate the Mermaid grammar, so valid:true means "no structural problems found", not "guaranteed to render".',
  'node_count and edge_count are reported only for flowchart/graph diagrams and are derived from arrow tokens and node identifiers via tokenization; subgraph headers, styling, and click directives are excluded from the node count.',
  'Comments (lines beginning with %%) and %%{...}%% init directives are ignored. Double-quoted labels are not expected to span multiple lines; an unclosed quote on a line is flagged.',
];

// Confidence reflects HOW the verdict was reached, not just that it is deterministic.
// Delimiter/type/quote checks are exact; the flowchart line-level heuristics
// (unrecognized_line / dangling_edge / unknown_direction) can misfire, so lower
// confidence when the verdict leans on them. A structurally clean diagram is still
// only 0.9 because the full Mermaid grammar is NOT validated.
const HEURISTIC_CODES = new Set(['unrecognized_line', 'dangling_edge', 'unknown_direction']);
function confidenceFor(core: ValidateCore): number {
  const hasHeuristic = core.issues.some((i) => HEURISTIC_CODES.has(i.code));
  const hasExactError = core.issues.some((i) => i.severity === 'error' && !HEURISTIC_CODES.has(i.code));
  if (hasHeuristic) return 0.85;
  if (hasExactError) return 0.95;
  return 0.9;
}

const TAIL = (confidence: number, sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: confidence, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Mermaid Validator API', version: '1.0.0',
  description: 'Deterministic Mermaid diagram linter. /validate detects the diagram type, checks balanced delimiters and quotes, and flags structurally suspect lines with line numbers. Lexical/structural lint (not the full Mermaid grammar). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/mermaid-validator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['diagram_type_detection', 'delimiter_balance_check', 'flowchart_lint', 'line_level_issues'],
  typical_use_cases: [
    'Lint LLM- or user-generated Mermaid before rendering it in docs or a PR',
    'Catch unbalanced delimiters or unterminated quotes that would break rendering',
    'Detect the diagram type and count flowchart nodes/edges for downstream tooling',
  ],
  input_examples: [
    { endpoint: '/validate', body: { diagram: 'flowchart LR\n  A-->B\n  B-->C' } },
  ],
  output_examples: [
    { endpoint: '/validate', response: { diagram_type: 'flowchart', valid: true, node_count: 3, edge_count: 2, balanced_delimiters: true, issues: [] } },
  ],
  endpoints: [
    { method: 'POST', path: '/validate', summary: 'Lint a Mermaid diagram', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/validate', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

const SECTIONS = { structure: 1, grammar: 0.8 };

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "diagram" string.');
  const r = readDiagram(b.diagram);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = validate(r.diagram);
  const errs = core.issues.filter((x) => x.severity === 'error').length;
  respond(res, t0, { ...core, ...TAIL(confidenceFor(core), SECTIONS, [core.valid ? `No structural errors found in ${core.diagram_type ?? 'diagram'}.` : `Found ${errs} structural error(s) — see issues[].`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "diagram" string.');
  const r = readDiagram(b.diagram);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = validate(r.diagram);
  const errs = core.issues.filter((x) => x.severity === 'error').length;
  const warns = core.issues.length - errs;
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Detected diagram type "${core.diagram_type}"; delimiters ${core.balanced_delimiters ? 'balanced' : 'UNBALANCED'}; found ${errs} error(s) and ${warns} warning(s) across ${core.content_line_count} content line(s).`,
      key_factors: [`Diagram type: ${core.diagram_type}.`, `Balanced delimiters: ${core.balanced_delimiters}.`, core.node_count !== null ? `Nodes: ${core.node_count}, edges: ${core.edge_count}.` : `Errors: ${errs}, warnings: ${warns}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL(confidenceFor(core), SECTIONS, [core.valid ? `No structural errors found.` : `Found ${errs} structural error(s) — see issues[].`]),
  });
});

export default router;
