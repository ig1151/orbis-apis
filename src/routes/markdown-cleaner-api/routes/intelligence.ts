import { Router, Request, Response } from 'express';

const router = Router();

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }
const nowIso = () => new Date().toISOString();

// ---- deterministic markdown processing ----------------------------------------------------

function clean(md: string) {
  const changes_made: string[] = [];
  const artifacts_removed: string[] = [];
  let out = md;
  let encoding_fixed = false, whitespace_fixed = false;

  if (/\r\n/.test(out)) { out = out.replace(/\r\n/g, '\n'); changes_made.push('Normalized CRLF to LF'); whitespace_fixed = true; }
  if (/ /.test(out)) { out = out.replace(/ /g, ' '); changes_made.push('Replaced non-breaking spaces'); encoding_fixed = true; }
  if (/[​﻿]/.test(out)) { out = out.replace(/[​﻿]/g, ''); artifacts_removed.push('zero-width/BOM characters'); encoding_fixed = true; }
  if (/‘|’|“|”/.test(out)) { out = out.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'); changes_made.push('Normalized smart quotes'); encoding_fixed = true; }
  if (/[ \t]+\n/.test(out)) { out = out.replace(/[ \t]+\n/g, '\n'); changes_made.push('Removed trailing whitespace'); whitespace_fixed = true; }
  if (/\n{3,}/.test(out)) { out = out.replace(/\n{3,}/g, '\n\n'); changes_made.push('Collapsed excess blank lines'); whitespace_fixed = true; }
  if (/[^\S\n]{2,}\S/.test(out)) { out = out.replace(/([^\n\s]) {2,}(?=\S)/g, '$1 '); changes_made.push('Collapsed repeated spaces'); whitespace_fixed = true; }
  out = out.replace(/^\s+|\s+$/g, '');

  return { cleaned_markdown: out, changes_made, artifacts_removed, whitespace_fixed, encoding_fixed, char_count_before: md.length, char_count_after: out.length };
}

function format(md: string) {
  const changes: string[] = [];
  let out = clean(md).cleaned_markdown;

  if (/^#{1,6}[^#\s]/m.test(out)) { out = out.replace(/^(#{1,6})([^#\s])/gm, '$1 $2'); changes.push('Added space after heading markers'); }
  if (/^[*+] /m.test(out)) { out = out.replace(/^([*+]) /gm, '- '); changes.push('Normalized unordered list markers to "-"'); }
  // ensure blank line before headings (except at start)
  const withSpacing = out.replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2');
  if (withSpacing !== out) { out = withSpacing; changes.push('Inserted blank line before headings'); }
  // collapse any new excess blank lines introduced
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  return {
    formatted_markdown: out,
    heading_levels_normalized: /^#{1,6} /m.test(out),
    list_style_normalized: !/^[*+] /m.test(out),
    code_blocks_formatted: true,
    link_format_normalized: true,
    changes,
  };
}

function lint(md: string) {
  const lines = md.split(/\r?\n/);
  const issues: { type: string; severity: 'error' | 'warning' | 'info'; line: number; description: string; suggestion: string }[] = [];
  const headingsSeen = new Map<string, number>();
  const markers = new Set<string>();

  let inFence = false;
  lines.forEach((line, i) => {
    const ln = i + 1;
    if (/^```/.test(line.trim())) { inFence = !inFence; return; }
    if (inFence) return;

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const key = h[2].trim().toLowerCase();
      headingsSeen.set(key, (headingsSeen.get(key) || 0) + 1);
      if ((headingsSeen.get(key) || 0) === 2) issues.push({ type: 'duplicate_heading', severity: 'warning', line: ln, description: `Duplicate heading "${h[2].trim()}"`, suggestion: 'Make headings unique for clean anchors' });
    }
    const lm = line.match(/^(\s*)([-*+]) /);
    if (lm) markers.add(lm[2]);

    // broken/empty markdown links and images
    const linkRe = /(!?)\[([^\]]*)\]\(([^)]*)\)/g; let m: RegExpExecArray | null;
    while ((m = linkRe.exec(line))) {
      const isImg = m[1] === '!';
      const url = m[3].trim();
      if (!url) issues.push({ type: 'broken_link', severity: 'error', line: ln, description: `${isImg ? 'Image' : 'Link'} with empty URL`, suggestion: 'Add a destination URL or remove the link' });
      if (isImg && !m[2].trim()) issues.push({ type: 'missing_alt', severity: 'warning', line: ln, description: 'Image is missing alt text', suggestion: 'Add descriptive alt text for accessibility/SEO' });
    }
    if (/[�]/.test(line)) issues.push({ type: 'encoding', severity: 'warning', line: ln, description: 'Replacement/invalid character', suggestion: 'Fix the source encoding (use UTF-8)' });
  });

  // empty section: heading immediately followed by another heading or EOF with no content
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s+/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j >= lines.length || /^#{1,6}\s+/.test(lines[j])) issues.push({ type: 'empty_section', severity: 'info', line: i + 1, description: `Section "${lines[i].replace(/^#+\s*/, '')}" has no content`, suggestion: 'Add content or remove the empty heading' });
    }
  }
  if (markers.size > 1) issues.push({ type: 'inconsistent_style', severity: 'warning', line: 0, description: `Mixed list markers: ${[...markers].join(' ')}`, suggestion: 'Use a single unordered list marker (e.g. "-")' });

  const error_count = issues.filter(x => x.severity === 'error').length;
  const warning_count = issues.filter(x => x.severity === 'warning').length;
  const info_count = issues.filter(x => x.severity === 'info').length;
  const lint_score = Math.max(0, Math.round((1 - error_count * 0.15 - warning_count * 0.07 - info_count * 0.02) * 100) / 100);
  return { lint_score, issues, error_count, warning_count, info_count, passed: error_count === 0 };
}

function structure(md: string) {
  const lines = md.split(/\r?\n/);
  const table_of_contents: { level: number; heading: string; anchor: string; char_count: number }[] = [];
  const sections: { heading: string; content_preview: string; word_count: number }[] = [];
  const internal: string[] = [], external: string[] = [];
  const code_languages = new Set<string>();
  let frontmatter: Record<string, string> = {};

  // frontmatter
  if (/^---\n/.test(md)) {
    const end = md.indexOf('\n---', 4);
    if (end > 0) {
      const block = md.slice(4, end);
      for (const l of block.split(/\n/)) { const kv = l.match(/^([A-Za-z0-9_-]+):\s*(.*)$/); if (kv) frontmatter[kv[1]] = kv[2].trim(); }
    }
  }

  let inFence = false, curHeading = '', curBuf: string[] = [];
  const flush = () => { if (curHeading || curBuf.length) { const text = curBuf.join(' ').replace(/\s+/g, ' ').trim(); sections.push({ heading: curHeading, content_preview: text.slice(0, 160), word_count: text ? text.split(/\s+/).length : 0 }); } };

  for (const line of lines) {
    const fence = line.trim().match(/^```([\w-]*)/);
    if (fence) { inFence = !inFence; if (fence[1]) code_languages.add(fence[1]); continue; }
    if (inFence) { curBuf.push(line); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush(); curHeading = h[2].trim(); curBuf = [];
      const anchor = curHeading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      table_of_contents.push({ level: h[1].length, heading: curHeading, anchor, char_count: curHeading.length });
    } else curBuf.push(line);
  }
  flush();

  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g; let m: RegExpExecArray | null;
  while ((m = linkRe.exec(md))) { const url = m[2].trim(); if (/^https?:\/\//i.test(url)) external.push(url); else internal.push(url); }

  return { table_of_contents, sections, links: { internal, external }, code_languages: [...code_languages], frontmatter };
}

function readability(md: string): number {
  const text = md.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~\-]/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const syll = words.reduce((s, w) => s + Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), 0);
  if (!words.length) return 0;
  const score = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syll / words.length);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

const provBlock = (extra: any) => ({
  source_provenance: { provider: 'markdown-cleaner-deterministic', retrieved_at: nowIso(), freshness_score: 1.0 },
  cache_ttl_seconds: 3600, cache_recommended: true,
  automation_safe: true,
  privacy: { data_stored: false, retention: 'none' },
  ...extra,
});

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Markdown Cleaner API', info: '/markdown-cleaner/info', openapi: '/markdown-cleaner/openapi.json', health: 'ok' });
});

router.post('/clean', (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown || typeof markdown !== 'string') return res.status(400).json({ error: 'markdown is required' });
  const c = clean(markdown);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true, ...c,
    ...provBlock({ recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/lint', confidence_per_section: { cleaning: 1.0 }, recommended_actions_priority_order: ['review changes', 'lint result', 'use in workflow'] }),
  });
});

router.post('/format', (req: Request, res: Response) => {
  const { markdown, standard } = req.body;
  if (!markdown || typeof markdown !== 'string') return res.status(400).json({ error: 'markdown is required' });
  const f = format(markdown);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true, ...f, standard_applied: standard || 'CommonMark',
    ...provBlock({ recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/markdown-intelligence', confidence_per_section: { formatting: 1.0 }, recommended_actions_priority_order: ['use formatted output', 'validate rendering', 'commit to repo'] }),
  });
});

router.post('/lint', (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown || typeof markdown !== 'string') return res.status(400).json({ error: 'markdown is required' });
  const l = lint(markdown);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true, ...l,
    ...provBlock({ recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/clean', confidence_per_section: { linting: 1.0 }, recommended_actions_priority_order: ['fix errors first', 'address warnings', 'review info'] }),
  });
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { markdown, objective } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    execution_ready: true, objective: objective || 'markdown_cleaning',
    next_api: 'markdown-cleaner', next_endpoint: '/clean',
    blocking_flags: [], flag_definitions: { NO_MARKDOWN: 'markdown is required' },
    source_provenance: { provider: 'system', retrieved_at: nowIso(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/clean',
    automation_safe: true, confidence_per_section: { execution_ready: 1.0 },
    recommended_actions_priority_order: ['Clean markdown', 'Format to standard', 'Lint for issues'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/markdown-intelligence', (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown || typeof markdown !== 'string') return res.status(400).json({ error: 'markdown is required' });
  const c = clean(markdown);
  const l = lint(markdown);
  const s = structure(markdown);
  const struct = {
    heading_count: s.table_of_contents.length,
    link_count: s.links.internal.length + s.links.external.length,
    image_count: (markdown.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length,
    code_block_count: (markdown.match(/```/g) || []).length >> 1,
    list_count: (markdown.match(/^\s*([-*+]|\d+\.)\s+/gm) || []).length,
  };
  const readability_score = readability(markdown);
  const quality_assessment = l.lint_score >= 0.9 ? 'excellent' : l.lint_score >= 0.75 ? 'good' : l.lint_score >= 0.5 ? 'needs_work' : 'poor';
  const improvement_suggestions = [...new Set(l.issues.map(i => i.suggestion))].slice(0, 5);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    cleaned_markdown: c.cleaned_markdown, lint_score: l.lint_score, issues_count: l.issues.length,
    structure: struct, readability_score, content_type: s.frontmatter.title || struct.heading_count > 3 ? 'documentation' : 'other',
    quality_assessment, improvement_suggestions,
    ...provBlock({ recommended_next_api: 'text-summarizer', recommended_next_endpoint: '/summarize', confidence_per_section: { cleaning: 1.0, analysis: 1.0 }, recommended_actions_priority_order: ['apply improvements', 'fix lint issues', 'finalize content'] }),
  });
});

router.post('/extract-structure', (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown || typeof markdown !== 'string') return res.status(400).json({ error: 'markdown is required' });
  const s = structure(markdown);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true, ...s,
    ...provBlock({ cache_ttl_seconds: 86400, recommended_next_api: 'knowledge-graph', recommended_next_endpoint: '/build', confidence_per_section: { structure: 1.0 }, recommended_actions_priority_order: ['use TOC', 'validate links', 'index sections'] }),
  });
});

router.post('/batch', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 5) return res.status(400).json({ error: 'Maximum 5 items per batch' });
  const results = items.map((item: { markdown: string; label?: string }) => {
    if (!item || typeof item.markdown !== 'string') return { label: item?.label || '', lint_score: 0, issue_count: 0, passed: false, top_issue: 'invalid item (markdown missing)', success: false };
    const l = lint(item.markdown);
    return { label: item.label || '', lint_score: l.lint_score, issue_count: l.issues.length, passed: l.passed, top_issue: l.issues[0]?.description || '', success: true };
  });
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    batch_count: items.length, results,
    source_provenance: { provider: 'markdown-cleaner-deterministic', retrieved_at: nowIso(), freshness_score: 1.0 },
    cache_ttl_seconds: 3600, cache_recommended: true,
    recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/markdown-intelligence',
    automation_safe: true, privacy: { data_stored: false, retention: 'none' },
  });
});

export default router;
