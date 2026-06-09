import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }
const nowIso = () => new Date().toISOString();

// ---- deterministic HTML → Markdown converter (cheerio) ------------------------------------

function convert(html: string) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  let headings = 0, links = 0, images = 0, tables = 0;

  const renderChildren = (el: any): string => $(el).contents().toArray().map(renderNode).join('');

  function renderTable(el: any): string {
    tables++;
    const rows = $(el).find('tr').toArray();
    if (!rows.length) return '';
    const cells = (tr: any) => $(tr).find('th,td').toArray().map(td => renderChildren(td).trim().replace(/\|/g, '\\|').replace(/\n/g, ' '));
    const header = cells(rows[0]);
    const body = rows.slice(1).map(cells);
    let out = `\n\n| ${header.join(' | ')} |\n| ${header.map(() => '---').join(' | ')} |\n`;
    for (const r of body) out += `| ${r.join(' | ')} |\n`;
    return out + '\n';
  }

  function renderList(el: any, ordered: boolean): string {
    let i = 1, out = '\n';
    $(el).children('li').each((_, li) => {
      const marker = ordered ? `${i++}.` : '-';
      const content = renderChildren(li).trim().replace(/\n+/g, ' ');
      out += `${marker} ${content}\n`;
    });
    return out + '\n';
  }

  function renderNode(n: any): string {
    if (n.type === 'text') return (n.data || '').replace(/\s+/g, ' ');
    if (n.type !== 'tag') return '';
    const tag = n.name.toLowerCase();
    const $n = $(n);
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        headings++; return `\n\n${'#'.repeat(Number(tag[1]))} ${renderChildren(n).trim()}\n\n`;
      case 'p': return `\n\n${renderChildren(n).trim()}\n\n`;
      case 'br': return '  \n';
      case 'hr': return '\n\n---\n\n';
      case 'strong': case 'b': { const t = renderChildren(n).trim(); return t ? `**${t}**` : ''; }
      case 'em': case 'i': { const t = renderChildren(n).trim(); return t ? `*${t}*` : ''; }
      case 'del': case 's': { const t = renderChildren(n).trim(); return t ? `~~${t}~~` : ''; }
      case 'code': return `\`${$n.text()}\``;
      case 'pre': { const lang = ($n.find('code').attr('class') || '').match(/language-([\w-]+)/)?.[1] || ''; return `\n\n\`\`\`${lang}\n${$n.text().replace(/\n$/, '')}\n\`\`\`\n\n`; }
      case 'a': { links++; const href = $n.attr('href') || ''; const t = renderChildren(n).trim(); return href ? `[${t || href}](${href})` : t; }
      case 'img': { images++; return `![${$n.attr('alt') || ''}](${$n.attr('src') || ''})`; }
      case 'ul': return renderList(n, false);
      case 'ol': return renderList(n, true);
      case 'blockquote': return `\n\n${renderChildren(n).trim().split('\n').map(l => `> ${l}`.trimEnd()).join('\n')}\n\n`;
      case 'table': return renderTable(n);
      case 'li': return renderChildren(n);
      default: return renderChildren(n);
    }
  }

  const root = $('body').length ? $('body')[0] : ($.root()[0] as any);
  const markdown = renderChildren(root).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { markdown, headings, links, images, tables };
}

function cleanMarkdown(md: string): { cleaned: string; fixed: string[] } {
  const fixed: string[] = [];
  let out = md;
  if (/\r\n/.test(out)) { out = out.replace(/\r\n/g, '\n'); fixed.push('Normalized CRLF line endings'); }
  if (/[ \t]+\n/.test(out)) { out = out.replace(/[ \t]+\n/g, '\n'); fixed.push('Removed trailing whitespace'); }
  if (/\n{3,}/.test(out)) { out = out.replace(/\n{3,}/g, '\n\n'); fixed.push('Collapsed excess blank lines'); }
  if (/ /.test(out)) { out = out.replace(/ /g, ' '); fixed.push('Replaced non-breaking spaces'); }
  if (/[ \t]{2,}\S/.test(out)) { out = out.replace(/([^\n]) {2,}/g, '$1 '); fixed.push('Collapsed repeated spaces'); }
  out = out.trim();
  return { cleaned: out, fixed };
}

function extract(html: string) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const title = ($('title').first().text() || $('h1').first().text() || '').trim();
  const description = ($('meta[name="description"]').attr('content') || '').trim();
  const headings = $('h1,h2,h3,h4,h5,h6').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const linkList = $('a[href]').map((_, el) => ({ text: $(el).text().trim(), href: $(el).attr('href') || '' })).get().filter(l => l.href);
  const imgs = $('img').map((_, el) => ({ alt: $(el).attr('alt') || '', src: $(el).attr('src') || '' })).get();
  const main = (cheerio.load(html)('main').text() || $('body').text() || $.root().text()).replace(/\s+/g, ' ').trim();
  const word_count = main ? main.split(/\s+/).length : 0;
  return {
    title, description,
    main_content: main,
    headings,
    links: linkList,
    images: imgs,
    meta_tags: {
      description,
      keywords: ($('meta[name="keywords"]').attr('content') || '').trim(),
      og_title: ($('meta[property="og:title"]').attr('content') || '').trim(),
    },
    word_count,
    reading_time_minutes: Math.max(1, Math.round(word_count / 200)),
  };
}

function fleschKincaidGrade(text: string): number {
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  const syllables = words.reduce((s, w) => s + Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), 0);
  const grade = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  return Math.round(Math.max(0, grade) * 10) / 10;
}

// ---- shared envelope fields ---------------------------------------------------------------

const provBlock = (extra: any) => ({
  source_provenance: { provider: 'html-to-markdown-deterministic', retrieved_at: nowIso(), freshness_score: 1.0 },
  cache_ttl_seconds: 3600, cache_recommended: true,
  automation_safe: true,
  privacy: { data_stored: false, retention: 'none' },
  ...extra,
});

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'HTML to Markdown API', info: '/html-to-markdown/info', openapi: '/html-to-markdown/openapi.json', health: 'ok' });
});

router.post('/convert', (req: Request, res: Response) => {
  const { html } = req.body;
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html is required' });
  const r = convert(html);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    markdown: r.markdown,
    char_count_in: html.length, char_count_out: r.markdown.length,
    compression_ratio: html.length ? Math.round((r.markdown.length / html.length) * 1000) / 1000 : 0,
    headings_found: r.headings, links_converted: r.links, images_converted: r.images, tables_converted: r.tables,
    ...provBlock({ recommended_next_api: 'html-to-markdown', recommended_next_endpoint: '/clean', confidence_per_section: { conversion: 1.0 }, recommended_actions_priority_order: ['review output', 'clean if needed', 'use in workflow'] }),
  });
});

router.post('/clean', (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown || typeof markdown !== 'string') return res.status(400).json({ error: 'markdown is required' });
  const { cleaned, fixed } = cleanMarkdown(markdown);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    cleaned_markdown: cleaned, issues_fixed: fixed,
    whitespace_normalized: true, links_validated: false, heading_hierarchy_fixed: false,
    char_count_before: markdown.length, char_count_after: cleaned.length,
    ...provBlock({ recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/lint', confidence_per_section: { cleaning: 1.0 }, recommended_actions_priority_order: ['verify output', 'lint for issues', 'use in downstream workflow'] }),
  });
});

router.post('/extract', (req: Request, res: Response) => {
  const { html } = req.body;
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html is required' });
  const e = extract(html);
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true, ...e,
    ...provBlock({ recommended_next_api: 'url-metadata', recommended_next_endpoint: '/fetch', confidence_per_section: { extraction: 1.0 }, recommended_actions_priority_order: ['use extracted content', 'validate links', 'index metadata'] }),
  });
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { html, objective } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    execution_ready: true, objective: objective || 'html_conversion',
    next_api: 'html-to-markdown', next_endpoint: '/convert',
    blocking_flags: [], flag_definitions: { NO_HTML: 'html is required' },
    source_provenance: { provider: 'system', retrieved_at: nowIso(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'html-to-markdown', recommended_next_endpoint: '/convert',
    automation_safe: true, confidence_per_section: { execution_ready: 1.0 },
    recommended_actions_priority_order: ['Convert HTML', 'Clean output', 'Extract content'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/html-intelligence', (req: Request, res: Response) => {
  const { html } = req.body;
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html is required' });
  const c = convert(html);
  const e = extract(html);
  const heading_structure = e.headings.length >= 3 ? 'good' : e.headings.length >= 1 ? 'fair' : 'poor';
  const quality_score = Math.round(((e.title ? 0.3 : 0) + (e.description ? 0.2 : 0) + (e.headings.length ? 0.3 : 0) + (c.links ? 0.2 : 0)) * 100) / 100;
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    markdown: c.markdown, title: e.title, description: e.description,
    main_content_markdown: c.markdown, headings: e.headings, links: e.links,
    word_count: e.word_count, reading_time_minutes: e.reading_time_minutes,
    content_type: 'other',
    quality_score,
    seo_signals: { has_title: !!e.title, has_description: !!e.description, heading_structure },
    ...provBlock({ recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/clean', confidence_per_section: { conversion: 1.0, extraction: 1.0 }, recommended_actions_priority_order: ['use converted markdown', 'validate content', 'clean if needed'] }),
  });
});

router.post('/simplify', (req: Request, res: Response) => {
  const { html } = req.body;
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html is required' });
  const c = convert(html);
  const $ = cheerio.load(html); $('script,style,noscript').remove();
  const plain = ($('body').text() || $.root().text()).replace(/\s+/g, ' ').trim();
  const words = plain ? plain.split(/\s+/).length : 0;
  const sentences = (plain.match(/[.!?]+/g) || []).length;
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    plain_text: plain, simplified_markdown: c.markdown,
    sentences, words,
    readability_score: words ? Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (words / Math.max(1, sentences))))) : 0,
    flesch_kincaid_grade: fleschKincaidGrade(plain),
    ...provBlock({ recommended_next_api: 'text-summarizer', recommended_next_endpoint: '/summarize', confidence_per_section: { simplification: 1.0 }, recommended_actions_priority_order: ['use simplified text', 'pass to summarizer', 'index for search'] }),
  });
});

router.post('/batch', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 5) return res.status(400).json({ error: 'Maximum 5 items per batch' });
  const results = items.map((item: { html: string; label?: string }) => {
    const md = (item && typeof item.html === 'string') ? convert(item.html).markdown : '';
    return { label: item?.label || '', markdown: md, char_count: md.length, success: !!md || (item?.html === '') };
  });
  res.json({
    trace_id: traceId(), computed_at: nowIso(), success: true,
    batch_count: items.length, results,
    source_provenance: { provider: 'html-to-markdown-deterministic', retrieved_at: nowIso(), freshness_score: 1.0 },
    cache_ttl_seconds: 3600, cache_recommended: true,
    recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/clean',
    automation_safe: true, privacy: { data_stored: false, retention: 'none' },
  });
});

export default router;
