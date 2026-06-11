import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic content-type classifier from a URL, filename, extension, and/or
// MIME (Content-Type) string. Lookup tables only — no fetch, no LLM. Resolves a
// canonical category, MIME, binary/text nature, and typical agent handling.

const router = Router();

export type Category = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'data' | 'webpage' | 'feed' | 'font' | 'executable' | 'text' | 'unknown';

interface ExtInfo { mime: string; category: Category; binary: boolean; }
export const EXT_MAP: Record<string, ExtInfo> = {
  jpg: { mime: 'image/jpeg', category: 'image', binary: true }, jpeg: { mime: 'image/jpeg', category: 'image', binary: true },
  png: { mime: 'image/png', category: 'image', binary: true }, gif: { mime: 'image/gif', category: 'image', binary: true },
  webp: { mime: 'image/webp', category: 'image', binary: true }, svg: { mime: 'image/svg+xml', category: 'image', binary: false },
  avif: { mime: 'image/avif', category: 'image', binary: true }, ico: { mime: 'image/x-icon', category: 'image', binary: true }, bmp: { mime: 'image/bmp', category: 'image', binary: true }, tiff: { mime: 'image/tiff', category: 'image', binary: true },
  mp4: { mime: 'video/mp4', category: 'video', binary: true }, webm: { mime: 'video/webm', category: 'video', binary: true }, mov: { mime: 'video/quicktime', category: 'video', binary: true }, avi: { mime: 'video/x-msvideo', category: 'video', binary: true }, mkv: { mime: 'video/x-matroska', category: 'video', binary: true },
  mp3: { mime: 'audio/mpeg', category: 'audio', binary: true }, wav: { mime: 'audio/wav', category: 'audio', binary: true }, ogg: { mime: 'audio/ogg', category: 'audio', binary: true }, flac: { mime: 'audio/flac', category: 'audio', binary: true }, m4a: { mime: 'audio/mp4', category: 'audio', binary: true }, aac: { mime: 'audio/aac', category: 'audio', binary: true },
  pdf: { mime: 'application/pdf', category: 'pdf', binary: true },
  doc: { mime: 'application/msword', category: 'document', binary: true }, docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', binary: true }, odt: { mime: 'application/vnd.oasis.opendocument.text', category: 'document', binary: true }, rtf: { mime: 'application/rtf', category: 'document', binary: false },
  xls: { mime: 'application/vnd.ms-excel', category: 'spreadsheet', binary: true }, xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'spreadsheet', binary: true }, ods: { mime: 'application/vnd.oasis.opendocument.spreadsheet', category: 'spreadsheet', binary: true },
  ppt: { mime: 'application/vnd.ms-powerpoint', category: 'presentation', binary: true }, pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'presentation', binary: true },
  zip: { mime: 'application/zip', category: 'archive', binary: true }, gz: { mime: 'application/gzip', category: 'archive', binary: true }, tar: { mime: 'application/x-tar', category: 'archive', binary: true }, rar: { mime: 'application/vnd.rar', category: 'archive', binary: true }, '7z': { mime: 'application/x-7z-compressed', category: 'archive', binary: true },
  json: { mime: 'application/json', category: 'data', binary: false }, xml: { mime: 'application/xml', category: 'data', binary: false }, csv: { mime: 'text/csv', category: 'data', binary: false }, yaml: { mime: 'application/yaml', category: 'data', binary: false }, yml: { mime: 'application/yaml', category: 'data', binary: false }, parquet: { mime: 'application/vnd.apache.parquet', category: 'data', binary: true },
  html: { mime: 'text/html', category: 'webpage', binary: false }, htm: { mime: 'text/html', category: 'webpage', binary: false },
  rss: { mime: 'application/rss+xml', category: 'feed', binary: false }, atom: { mime: 'application/atom+xml', category: 'feed', binary: false },
  woff: { mime: 'font/woff', category: 'font', binary: true }, woff2: { mime: 'font/woff2', category: 'font', binary: true }, ttf: { mime: 'font/ttf', category: 'font', binary: true }, otf: { mime: 'font/otf', category: 'font', binary: true },
  exe: { mime: 'application/vnd.microsoft.portable-executable', category: 'executable', binary: true }, dmg: { mime: 'application/x-apple-diskimage', category: 'executable', binary: true }, apk: { mime: 'application/vnd.android.package-archive', category: 'executable', binary: true }, wasm: { mime: 'application/wasm', category: 'executable', binary: true },
  js: { mime: 'text/javascript', category: 'code', binary: false }, ts: { mime: 'text/typescript', category: 'code', binary: false }, css: { mime: 'text/css', category: 'code', binary: false }, py: { mime: 'text/x-python', category: 'code', binary: false }, java: { mime: 'text/x-java-source', category: 'code', binary: false }, go: { mime: 'text/x-go', category: 'code', binary: false }, rb: { mime: 'text/x-ruby', category: 'code', binary: false }, sh: { mime: 'application/x-sh', category: 'code', binary: false },
  txt: { mime: 'text/plain', category: 'text', binary: false }, md: { mime: 'text/markdown', category: 'text', binary: false },
};

const MIME_CATEGORY: { test: (m: string) => boolean; category: Category; binary: boolean }[] = [
  { test: (m) => m === 'text/html', category: 'webpage', binary: false },
  { test: (m) => m === 'application/pdf', category: 'pdf', binary: true },
  { test: (m) => m === 'application/json' || m.endsWith('+json'), category: 'data', binary: false },
  { test: (m) => m === 'text/csv', category: 'data', binary: false },
  { test: (m) => m === 'application/rss+xml' || m === 'application/atom+xml', category: 'feed', binary: false },
  { test: (m) => m === 'application/xml' || m === 'text/xml' || m.endsWith('+xml'), category: 'data', binary: false },
  { test: (m) => m.startsWith('image/'), category: 'image', binary: true },
  { test: (m) => m.startsWith('video/'), category: 'video', binary: true },
  { test: (m) => m.startsWith('audio/'), category: 'audio', binary: true },
  { test: (m) => m.startsWith('font/'), category: 'font', binary: true },
  { test: (m) => m.startsWith('text/'), category: 'text', binary: false },
  { test: (m) => m.includes('zip') || m.includes('tar') || m.includes('compressed') || m === 'application/gzip', category: 'archive', binary: true },
];

const HANDLING: Record<Category, string> = {
  image: 'Run OCR or vision; do not parse as text.', video: 'Transcode/transcribe; treat as a large binary stream.', audio: 'Send to ASR for transcription.',
  pdf: 'Extract text/tables via a PDF parser before reasoning.', document: 'Convert to text (e.g. docx→markdown) before parsing.',
  spreadsheet: 'Parse cells/sheets; convert to CSV/JSON for analysis.', presentation: 'Extract slide text and notes.',
  archive: 'Decompress first, then classify each member.', code: 'Treat as source text; syntax-aware parsing optional.',
  data: 'Parse structurally (JSON/XML/CSV) rather than as prose.', webpage: 'Extract main content / strip boilerplate before summarizing.',
  feed: 'Parse RSS/Atom items rather than scraping HTML.', font: 'Binary asset; not content to read.',
  executable: 'Do NOT execute. Treat as an untrusted binary; scan only.', text: 'Read directly as UTF-8 text.', unknown: 'Inspect bytes/headers before processing; type could not be resolved.',
};

export type ClassifySource = 'mime' | 'extension' | 'url_heuristic' | 'unknown';
export interface ClassifyResult {
  category: Category; mime: string | null; detected_extension: string | null; is_binary: boolean; is_text: boolean;
  source: ClassifySource; typical_handling: string;
}

// Confidence reflects how authoritative the winning signal is, not the purity of
// the lookup: a server-declared MIME is authoritative; an extension can be wrong
// or renamed; guessing "webpage" from an extension-less URL is a heuristic.
const SOURCE_CONFIDENCE: Record<ClassifySource, number> = { mime: 1, extension: 0.85, url_heuristic: 0.7, unknown: 0.5 };
export function classifyConfidence(r: ClassifyResult): number { return SOURCE_CONFIDENCE[r.source]; }

function extFromUrl(s: string): string | null {
  let path = s;
  try { path = new URL(s).pathname; } catch { /* not a URL; treat as filename/path */ }
  const base = path.split(/[?#]/)[0].split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

export function classify(body: any): ClassifyResult | { error: string } {
  const url = str(body?.url);
  const filename = str(body?.filename);
  const rawExt = str(body?.extension)?.replace(/^\./, '').toLowerCase();
  const rawMime = str(body?.mime) ?? str(body?.content_type);
  if (!url && !filename && !rawExt && !rawMime) return { error: 'Provide at least one of: "url", "filename", "extension", or "mime" (content_type).' };

  const ext = rawExt ?? (filename ? extFromUrl(filename) : null) ?? (url ? extFromUrl(url) : null);
  const mime = rawMime ? rawMime.split(';')[0].trim().toLowerCase() : null;

  // MIME wins when supplied.
  if (mime) {
    const hit = MIME_CATEGORY.find((r) => r.test(mime));
    if (hit) return { category: hit.category, mime, detected_extension: ext, is_binary: hit.binary, is_text: !hit.binary, source: 'mime', typical_handling: HANDLING[hit.category] };
  }
  if (ext && EXT_MAP[ext]) {
    const e = EXT_MAP[ext];
    return { category: e.category, mime: mime ?? e.mime, detected_extension: ext, is_binary: e.binary, is_text: !e.binary, source: 'extension', typical_handling: HANDLING[e.category] };
  }
  // A URL with no extension and no/HTML mime is most likely a webpage.
  if (url && !ext && (!mime || mime === 'text/html')) {
    return { category: 'webpage', mime: mime ?? 'text/html', detected_extension: null, is_binary: false, is_text: true, source: mime ? 'mime' : 'url_heuristic', typical_handling: HANDLING.webpage };
  }
  return { category: 'unknown', mime, detected_extension: ext, is_binary: false, is_text: false, source: 'unknown', typical_handling: HANDLING.unknown };
}

function actions(r: ClassifyResult): string[] {
  return [
    `Classified as ${r.category}${r.mime ? ` (${r.mime})` : ''} via ${r.source}.`,
    r.typical_handling,
    r.category === 'executable' ? 'Security: never run a downloaded executable from an agent pipeline.' : `Treat as ${r.is_binary ? 'binary' : 'text'} content downstream.`,
  ];
}

const CHAIN_TO = [
  { api: 'web-archive-url-builder', reason: 'Once you know it is a webpage, build a Wayback/cache URL to fetch a stable snapshot.' },
  { api: 'pdf-extraction', reason: 'For pdf results, extract text/tables before reasoning over the content.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Content Type Classifier API', version: '1.0.0',
    description: 'Deterministic content-type classifier from a URL, filename, extension, and/or MIME string. Resolves a canonical category (image/video/audio/pdf/document/spreadsheet/presentation/archive/code/data/webpage/feed/font/executable/text), MIME, binary-vs-text nature, and typical agent handling. Lookup tables only — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-content-type-classifier/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/classify', summary: 'Classify a URL/filename/extension/MIME → category', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL classify + reasoning + handling guidance', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/classify', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/classify', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = classify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r,
    confidence_score: classifyConfidence(r), confidence_per_section: { classification: classifyConfidence(r) },
    recommended_actions_priority_order: actions(r), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = classify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Resolved category "${r.category}" from the ${r.source} signal${r.detected_extension ? ` (extension .${r.detected_extension})` : ''}.`,
      key_factors: [`Source: ${r.source}.`, `MIME: ${r.mime ?? 'n/a'}.`, `Binary: ${r.is_binary}.`],
      invalidators: ['MIME from a server can be wrong or generic (application/octet-stream); the extension may lie.', 'Extension-only classification cannot detect a renamed/mismatched file.', 'A URL without an extension is assumed to be a webpage — an API route or download could break that assumption.'],
    },
    confidence_score: classifyConfidence(r), confidence_per_section: { classification: classifyConfidence(r) },
    recommended_actions_priority_order: actions(r), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
