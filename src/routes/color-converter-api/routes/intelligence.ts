import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic color converter & WCAG contrast checker. /convert parses a color
// (hex, rgb()/rgba(), hsl()/hsla(), or a CSS named color) and emits every common
// representation plus relative luminance. /contrast computes the WCAG 2.1 contrast
// ratio between two colors and the AA/AAA pass/fail for normal and large text.
// Pure math, no LLM, nothing stored.

const router = Router();

// CSS Color Module Level 4 named colors → hex.
const NAMED: { [k: string]: string } = {
  aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff', aquamarine: '#7fffd4', azure: '#f0ffff',
  beige: '#f5f5dc', bisque: '#ffe4c4', black: '#000000', blanchedalmond: '#ffebcd', blue: '#0000ff',
  blueviolet: '#8a2be2', brown: '#a52a2a', burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00',
  chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed', cornsilk: '#fff8dc', crimson: '#dc143c',
  cyan: '#00ffff', darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b', darkgray: '#a9a9a9',
  darkgreen: '#006400', darkgrey: '#a9a9a9', darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f',
  darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000', darksalmon: '#e9967a', darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b', darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1', darkviolet: '#9400d3',
  deeppink: '#ff1493', deepskyblue: '#00bfff', dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1e90ff',
  firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22', fuchsia: '#ff00ff', gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff', gold: '#ffd700', goldenrod: '#daa520', gray: '#808080', green: '#008000',
  greenyellow: '#adff2f', grey: '#808080', honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c',
  indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa', lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00', lemonchiffon: '#fffacd', lightblue: '#add8e6', lightcoral: '#f08080', lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3', lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a', lightseagreen: '#20b2aa', lightskyblue: '#87cefa', lightslategray: '#778899', lightslategrey: '#778899',
  lightsteelblue: '#b0c4de', lightyellow: '#ffffe0', lime: '#00ff00', limegreen: '#32cd32', linen: '#faf0e6',
  magenta: '#ff00ff', maroon: '#800000', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd', mediumorchid: '#ba55d3',
  mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee', mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585', midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1', moccasin: '#ffe4b5',
  navajowhite: '#ffdead', navy: '#000080', oldlace: '#fdf5e6', olive: '#808000', olivedrab: '#6b8e23',
  orange: '#ffa500', orangered: '#ff4500', orchid: '#da70d6', palegoldenrod: '#eee8aa', palegreen: '#98fb98',
  paleturquoise: '#afeeee', palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f',
  pink: '#ffc0cb', plum: '#dda0dd', powderblue: '#b0e0e6', purple: '#800080', rebeccapurple: '#663399',
  red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1', saddlebrown: '#8b4513', salmon: '#fa8072',
  sandybrown: '#f4a460', seagreen: '#2e8b57', seashell: '#fff5ee', sienna: '#a0522d', silver: '#c0c0c0',
  skyblue: '#87ceeb', slateblue: '#6a5acd', slategray: '#708090', slategrey: '#708090', snow: '#fffafa',
  springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c', teal: '#008080', thistle: '#d8bfd8',
  tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3', white: '#ffffff',
  whitesmoke: '#f5f5f5', yellow: '#ffff00', yellowgreen: '#9acd32',
};

interface RGBA { r: number; g: number; b: number; a: number } // r,g,b 0-255; a 0-1

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

function parseColor(input: unknown): { error: string } | { rgba: RGBA; matched_format: string } {
  if (typeof input !== 'string' || input.trim() === '') return { error: '"color" must be a non-empty string.' };
  const s = input.trim().toLowerCase();

  if (Object.prototype.hasOwnProperty.call(NAMED, s)) {
    return { rgba: { ...hexToRgba(NAMED[s]), a: 1 }, matched_format: 'named' };
  }
  if (s[0] === '#') {
    const hex = s.slice(1);
    if (!/^[0-9a-f]+$/.test(hex) || ![3, 4, 6, 8].includes(hex.length)) return { error: `"${input}" is not a valid hex color (expected #rgb, #rgba, #rrggbb, or #rrggbbaa).` };
    return { rgba: hexToRgba('#' + hex), matched_format: 'hex' };
  }
  const rgbM = /^rgba?\(\s*([0-9]{1,3})\s*[, ]\s*([0-9]{1,3})\s*[, ]\s*([0-9]{1,3})\s*(?:[,/]\s*([0-9]*\.?[0-9]+%?)\s*)?\)$/.exec(s);
  if (rgbM) {
    const r = Number(rgbM[1]), g = Number(rgbM[2]), b = Number(rgbM[3]);
    if (r > 255 || g > 255 || b > 255) return { error: 'rgb() channels must be 0–255.' };
    return { rgba: { r, g, b, a: parseAlpha(rgbM[4]) }, matched_format: 'rgb' };
  }
  const hslM = /^hsla?\(\s*([0-9]*\.?[0-9]+)\s*[, ]\s*([0-9]*\.?[0-9]+)%\s*[, ]\s*([0-9]*\.?[0-9]+)%\s*(?:[,/]\s*([0-9]*\.?[0-9]+%?)\s*)?\)$/.exec(s);
  if (hslM) {
    const h = Number(hslM[1]) % 360, sl = clamp(Number(hslM[2]), 0, 100) / 100, l = clamp(Number(hslM[3]), 0, 100) / 100;
    return { rgba: { ...hslToRgb(h, sl, l), a: parseAlpha(hslM[4]) }, matched_format: 'hsl' };
  }
  return { error: `"${input}" is not a recognized color (expected a hex, rgb()/rgba(), hsl()/hsla(), or CSS named color).` };
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  if (raw.endsWith('%')) return clamp(Number(raw.slice(0, -1)) / 100, 0, 1);
  return clamp(Number(raw), 0, 1);
}

function hexToRgba(hex: string): RGBA {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a: r2(a) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(max * 100) };
}

const toHex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');

function relLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export interface ColorForms {
  hex: string;
  hex8: string;
  rgb: string;
  rgba: string;
  hsl: string;
  hsv: string;
  rgb_object: { r: number; g: number; b: number; a: number };
  hsl_object: { h: number; s: number; l: number };
  hsv_object: { h: number; s: number; v: number };
  relative_luminance: number;
}
export interface ConvertCore { input: string; matched_format: string; color: ColorForms }

function forms(rgba: RGBA): ColorForms {
  const { r, g, b, a } = rgba;
  const hsl = rgbToHsl(r, g, b), hsv = rgbToHsv(r, g, b);
  const hex = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  return {
    hex,
    hex8: `${hex}${toHex2(a * 255)}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgba: `rgba(${r}, ${g}, ${b}, ${r2(a)})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    rgb_object: { r, g, b, a: r2(a) },
    hsl_object: hsl,
    hsv_object: hsv,
    relative_luminance: r2(relLuminance(r, g, b) * 1000) / 1000,
  };
}

function doConvert(body: any): { error: string } | { result: ConvertCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "color" string.' };
  const p = parseColor(body.color);
  if ('error' in p) return { error: p.error };
  return { result: { input: String(body.color).trim(), matched_format: p.matched_format, color: forms(p.rgba) } };
}

export interface ContrastCore {
  foreground: string;
  background: string;
  contrast_ratio: number;
  passes: { aa_normal: boolean; aa_large: boolean; aaa_normal: boolean; aaa_large: boolean };
  highest_level: string;
}

function doContrast(body: any): { error: string } | { result: ContrastCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide "foreground" and "background" colors.' };
  const fg = parseColor(body.foreground), bg = parseColor(body.background);
  if ('error' in fg) return { error: `foreground: ${fg.error}` };
  if ('error' in bg) return { error: `background: ${bg.error}` };
  const lf = relLuminance(fg.rgba.r, fg.rgba.g, fg.rgba.b);
  const lb = relLuminance(bg.rgba.r, bg.rgba.g, bg.rgba.b);
  const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
  const rr = Math.round(ratio * 100) / 100;
  const passes = { aa_normal: rr >= 4.5, aa_large: rr >= 3, aaa_normal: rr >= 7, aaa_large: rr >= 4.5 };
  const highest = rr >= 7 ? 'AAA (normal & large)' : rr >= 4.5 ? 'AA normal / AAA large' : rr >= 3 ? 'AA large only' : 'fails AA';
  return {
    result: {
      foreground: String(body.foreground).trim(), background: String(body.background).trim(),
      contrast_ratio: rr, passes, highest_level: highest,
    },
  };
}

const CHAIN_TO = [
  { api: 'accessibility-audit-lite-api', reason: 'Roll this contrast check into a fuller page accessibility audit.' },
];
const INVALIDATORS = [
  'Conversions are exact sRGB math. HSL/HSV components are rounded to whole numbers (hue 0–360, sat/light/value 0–100%); the rgb→hex→rgb round trip is lossless but hex→hsl→hex may differ by ±1 due to rounding.',
  'WCAG contrast uses relative luminance per WCAG 2.1; alpha is ignored for contrast (the ratio assumes fully opaque colors composited on no background). AA normal ≥4.5, AA large ≥3, AAA normal ≥7, AAA large ≥4.5.',
  'Only CSS Color Level 4 named colors, hex (#rgb/#rgba/#rrggbb/#rrggbbaa), rgb()/rgba(), and hsl()/hsla() are parsed; lab()/lch()/color() and other functional notations are not supported.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

const DISCOVERY = {
  name: 'Color Converter API', version: '1.0.0',
  description: 'Deterministic color converter & WCAG contrast checker. /convert parses a hex, rgb(), hsl(), or CSS named color and emits every representation plus relative luminance; /contrast computes the WCAG 2.1 contrast ratio between two colors with AA/AAA pass/fail. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/color-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Parse a color and emit all representations', price_usdc: 0.006 },
    { method: 'POST', path: '/contrast', summary: 'WCAG 2.1 contrast ratio + AA/AAA pass/fail', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.006, currency: 'USDC' },
    { path: '/contrast', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doConvert(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ conversion: 1 }, [`Parsed as ${v.matched_format}; canonical hex ${v.color.hex}.`]) });
});

router.post('/contrast', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doContrast(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ contrast: 1 }, [`Contrast ${v.contrast_ratio}:1 — ${v.highest_level}.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doConvert(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Parsed "${v.input}" as a ${v.matched_format} color and converted it to every supported representation using exact sRGB math.`,
      key_factors: [
        `Matched format: ${v.matched_format}.`,
        `Canonical hex: ${v.color.hex} (alpha ${v.color.rgb_object.a}).`,
        `Relative luminance: ${v.color.relative_luminance}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Parsed as ${v.matched_format}; canonical hex ${v.color.hex}.`]),
  });
});

export default router;
