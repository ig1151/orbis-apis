import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

// ---- WCAG 2.1 contrast math (deterministic) --------------------------------
function parseHex(hex: unknown): [number, number, number] | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLum([r, g, b]: [number, number, number]): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: [number, number, number], b: [number, number, number]): number {
  const la = relLum(a), lb = relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
function ratings(r: number) {
  return {
    aa_normal: r >= 4.5, aa_large: r >= 3, aaa_normal: r >= 7, aaa_large: r >= 4.5,
    highest_level: r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large only' : 'Fail',
  };
}
function bestText(bg: [number, number, number]): { color: string; ratio: number } {
  const black = ratio([0, 0, 0], bg), white = ratio([255, 255, 255], bg);
  return white >= black ? { color: '#FFFFFF', ratio: white } : { color: '#000000', ratio: black };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Color Palette Contrast Evaluator API', version: '1.0.0',
    description: 'Deterministic WCAG 2.1 contrast-ratio evaluation: AA/AAA pass-fail for text, palette text-color recommendations, and accessible alternatives. Real luminance math — confidence 1.0.',
    openapi_url: 'https://orbis-apis.onrender.com/color-contrast-evaluator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/contrast', summary: 'WCAG contrast ratio + AA/AAA pass-fail for a fg/bg pair', price_usdc: 0.005 },
      { method: 'POST', path: '/palette', summary: 'Per-color best text color + contrast for a palette', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: contrast + ratings + accessible alternatives', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/contrast', price_usdc: 0.005, currency: 'USDC' },
      { path: '/palette', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/contrast', (req: Request, res: Response) => {
  const t0 = Date.now();
  const fg = parseHex(req.body?.foreground), bg = parseHex(req.body?.background);
  if (!fg || !bg) return fail(res, t0, 400, 'invalid_color', 'Provide "foreground" and "background" as hex colors (#rgb or #rrggbb).');
  const r = ratio(fg, bg);
  respond(res, t0, {
    input: { foreground: req.body.foreground, background: req.body.background },
    contrast_ratio: r,
    ratings: ratings(r),
    confidence_score: 1.0,
    recommended_actions_priority_order: ratings(r).aa_normal
      ? ['Passes WCAG AA for normal text — safe for body copy.']
      : ['Fails AA for normal text — darken/lighten one color or reserve for large text only.'],
    chain_to: [
      { api: 'website-screenshot', reason: 'Capture a rendered preview to verify contrast in real context.' },
    ],
    privacy: PRIVACY,
  });
});

router.post('/palette', (req: Request, res: Response) => {
  const t0 = Date.now();
  const colors = req.body?.colors;
  if (!Array.isArray(colors) || colors.length === 0 || colors.length > 50)
    return fail(res, t0, 400, 'invalid_colors', '"colors" must be an array of 1–50 hex colors.');
  const parsed = colors.map((c: unknown) => ({ raw: c, rgb: parseHex(c) }));
  const bad = parsed.find((p) => !p.rgb);
  if (bad) return fail(res, t0, 400, 'invalid_color', `Could not parse "${String(bad.raw)}" as a hex color.`);
  const evaluated = parsed.map((p) => {
    const best = bestText(p.rgb as [number, number, number]);
    return { color: p.raw, recommended_text_color: best.color, text_contrast_ratio: best.ratio, text_meets_aa: best.ratio >= 4.5 };
  });
  respond(res, t0, {
    count: evaluated.length,
    colors: evaluated,
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      'Use each color\'s recommended_text_color for legible labels.',
      evaluated.every((e) => e.text_meets_aa) ? 'All swatches support AA text.' : 'Some swatches only support large text — adjust or restrict usage.',
    ],
    chain_to: [
      { api: 'website-screenshot', reason: 'Capture a rendered preview to verify contrast in real context.' },
    ],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const fg = parseHex(req.body?.foreground), bg = parseHex(req.body?.background);
  if (!fg || !bg) return fail(res, t0, 400, 'invalid_color', 'Provide "foreground" and "background" as hex colors.');
  const r = ratio(fg, bg);
  const rt = ratings(r);
  const alt = bestText(bg);
  respond(res, t0, {
    input: { foreground: req.body.foreground, background: req.body.background },
    contrast_ratio: r,
    ratings: rt,
    accessible_alternatives: rt.aa_normal ? [] : [
      { suggestion: `Use ${alt.color} text on this background`, resulting_ratio: alt.ratio, meets_aa: alt.ratio >= 4.5 },
    ],
    reasoning: {
      why_result_generated: 'Contrast ratio computed from WCAG 2.1 relative luminance of both colors.',
      key_factors: [`ratio ${r}:1`, `AA normal ${rt.aa_normal ? 'pass' : 'fail'}`, `AAA normal ${rt.aaa_normal ? 'pass' : 'fail'}`],
      invalidators: ['Colors include alpha/transparency (not accounted for).', 'Text rendered over an image or gradient rather than a solid color.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      rt.aa_normal ? 'Pair passes AA for body text.' : `Pair fails AA — switch text to ${alt.color} (ratio ${alt.ratio}:1).`,
      rt.aaa_normal ? 'Also meets the stricter AAA bar.' : 'For AAA compliance increase contrast to ≥7:1.',
    ],
    chain_to: [
      { api: 'website-screenshot', reason: 'Capture a rendered preview to verify contrast in real context.' },
    ],
    privacy: PRIVACY,
  });
});

export default router;
