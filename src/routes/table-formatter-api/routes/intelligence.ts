import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic table renderer. /markdown renders rows into a GitHub-Flavored-Markdown
// table (with optional per-column alignment); /ascii renders a fixed-width ASCII grid
// table. Accepts row objects (column→value) or positional arrays. Pure string
// computation — no LLM, nothing stored.

const router = Router();

const MAX_ROWS = 1000;
const MAX_COLS = 50;
const MAX_CELL_LEN = 5000;

type Align = 'left' | 'right' | 'center';
type Cell = string | number | boolean | null;

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

interface Prepared { columns: string[]; matrix: string[][]; row_count: number }

function prepare(body: any): { error: string } | { p: Prepared } {
  if (!Array.isArray(body.rows)) return { error: '"rows" must be an array.' };
  if (body.rows.length > MAX_ROWS) return { error: `"rows" exceeds the ${MAX_ROWS}-row limit.` };
  let columns: string[];
  if (body.columns !== undefined) {
    if (!Array.isArray(body.columns) || body.columns.some((c: unknown) => typeof c !== 'string')) return { error: '"columns" must be an array of strings.' };
    columns = body.columns;
  } else {
    // derive from object keys (first-seen order); arrays require explicit columns.
    const seen: string[] = [];
    for (const r of body.rows) {
      if (Array.isArray(r) || r === null || typeof r !== 'object') return { error: 'When "columns" is omitted, every row must be an object; provide "columns" to use array rows.' };
      for (const k of Object.keys(r)) if (!seen.includes(k)) seen.push(k);
    }
    columns = seen;
  }
  if (columns.length === 0) return { error: 'No columns to render (empty rows or empty "columns").' };
  if (columns.length > MAX_COLS) return { error: `column count exceeds the ${MAX_COLS} limit.` };

  const matrix: string[][] = [];
  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i];
    const out: string[] = [];
    for (let c = 0; c < columns.length; c++) {
      let raw: unknown;
      if (Array.isArray(r)) raw = r[c];
      else if (r !== null && typeof r === 'object') raw = r[columns[c]];
      else return { error: `rows[${i}] must be an object or array.` };
      let s = cellToString(raw).replace(/\r?\n/g, ' ');
      if (s.length > MAX_CELL_LEN) return { error: `a cell in rows[${i}] exceeds the ${MAX_CELL_LEN}-character limit.` };
      out.push(s);
    }
    matrix.push(out);
  }
  return { p: { columns, matrix, row_count: body.rows.length } };
}

function readAlign(raw: unknown, n: number): { error: string } | { align: Align[] } {
  if (raw === undefined) return { align: Array(n).fill('left') };
  if (!Array.isArray(raw)) return { error: '"align" must be an array of "left"|"right"|"center".' };
  if (raw.length !== n) return { error: `"align" must have exactly ${n} entries (one per column).` };
  for (const a of raw) if (a !== 'left' && a !== 'right' && a !== 'center') return { error: '"align" entries must be "left", "right" or "center".' };
  return { align: raw as Align[] };
}

function renderMarkdown(p: Prepared, align: Align[]): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const head = `| ${p.columns.map(esc).join(' | ')} |`;
  const sep = `| ${align.map((a) => (a === 'right' ? '---:' : a === 'center' ? ':--:' : a === 'left' ? ':---' : '---')).join(' | ')} |`;
  const rows = p.matrix.map((r) => `| ${r.map(esc).join(' | ')} |`);
  return [head, sep, ...rows].join('\n');
}

function pad(s: string, w: number, a: Align): string {
  const gap = w - s.length;
  if (gap <= 0) return s;
  if (a === 'right') return ' '.repeat(gap) + s;
  if (a === 'center') { const l = Math.floor(gap / 2); return ' '.repeat(l) + s + ' '.repeat(gap - l); }
  return s + ' '.repeat(gap);
}

function renderAscii(p: Prepared, align: Align[]): string {
  const widths = p.columns.map((c, i) => Math.max(c.length, ...p.matrix.map((r) => r[i].length), 1));
  const border = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const line = (cells: string[]) => '| ' + cells.map((s, i) => pad(s, widths[i], align[i])).join(' | ') + ' |';
  const out = [border, line(p.columns), border, ...p.matrix.map((r) => line(r)), border];
  return out.join('\n');
}

const CHAIN_TO = [
  { api: 'html-entities', reason: 'Escape cell content before embedding the rendered table in HTML.' },
  { api: 'duration-humanizer', reason: 'Humanize millisecond columns before rendering a report table.' },
];
const INVALIDATORS = [
  'Cells are stringified deterministically: strings verbatim, numbers/booleans via String(), null/undefined → empty, objects/arrays → compact JSON. Newlines within a cell are replaced by a single space (Markdown/ASCII tables are single-line per cell).',
  'Markdown rendering escapes literal "|" as "\\|"; ASCII rendering pads columns to the widest cell. Alignment ("align") affects the Markdown separator row and ASCII padding only.',
  'When "columns" is omitted, columns are the union of object keys in first-seen order; array rows REQUIRE an explicit "columns" header list. Missing keys render as empty cells, not errors.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

const DISCOVERY = {
  name: 'Table Formatter API', version: '1.0.0',
  description: 'Deterministic table renderer. /markdown renders rows into a GitHub-Flavored-Markdown table (optional per-column alignment); /ascii renders a fixed-width ASCII grid table. Accepts row objects or positional arrays. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/table-formatter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['markdown_table', 'ascii_table', 'column_alignment', 'object_or_array_rows'],
  endpoints: [
    { method: 'POST', path: '/markdown', summary: 'Render rows as a Markdown table', price_usdc: 0.005 },
    { method: 'POST', path: '/ascii', summary: 'Render rows as an ASCII grid table', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL render + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/markdown', price_usdc: 0.005, currency: 'USDC' },
    { path: '/ascii', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

function handle(req: Request, res: Response, mode: 'markdown' | 'ascii', withReasoning: boolean) {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "rows" array.');
  const pr = prepare(b);
  if ('error' in pr) return fail(res, t0, 400, 'invalid_request', pr.error);
  const al = readAlign(b.align, pr.p.columns.length);
  if ('error' in al) return fail(res, t0, 400, 'invalid_request', al.error);
  const table = mode === 'markdown' ? renderMarkdown(pr.p, al.align) : renderAscii(pr.p, al.align);
  const core = { format: mode, columns: pr.p.columns, row_count: pr.p.row_count, align: al.align, table };
  const tail = TAIL({ rendering: 1 }, [`Rendered a ${pr.p.row_count}×${pr.p.columns.length} ${mode} table.`]);
  if (!withReasoning) return respond(res, t0, { ...core, ...tail });
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Rendered ${pr.p.row_count} row(s) across ${pr.p.columns.length} column(s) as a ${mode} table.`,
      key_factors: [`Columns: ${pr.p.columns.join(', ')}.`, `Rows: ${pr.p.row_count}.`, `Alignment: ${al.align.join(', ')}.`],
      invalidators: INVALIDATORS,
    },
    ...tail,
  });
}

router.post('/markdown', (req, res) => handle(req, res, 'markdown', false));
router.post('/ascii', (req, res) => handle(req, res, 'ascii', false));
router.post('/lookup', (req, res) => handle(req, res, 'markdown', true));

export default router;
