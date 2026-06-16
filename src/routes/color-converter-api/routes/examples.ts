// AUTO-GENERATED from live output by x402-test/gen-groupb-devtools-examples.mjs — do not hand-edit.
export const convertExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "hsl(204, 70%, 53%)",
  "matched_format": "hsl",
  "color": {
    "hex": "#3398db",
    "hex8": "#3398dbff",
    "rgb": "rgb(51, 152, 219)",
    "rgba": "rgba(51, 152, 219, 1)",
    "hsl": "hsl(204, 70%, 53%)",
    "hsv": "hsv(204, 77%, 86%)",
    "rgb_object": {
      "r": 51,
      "g": 152,
      "b": 219,
      "a": 1
    },
    "hsl_object": {
      "h": 204,
      "s": 70,
      "l": 53
    },
    "hsv_object": {
      "h": 204,
      "s": 77,
      "v": 86
    },
    "relative_luminance": 0.28275
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed as hsl; canonical hex #3398db."
  ],
  "chain_to": [
    {
      "api": "accessibility-audit-lite-api",
      "reason": "Roll this contrast check into a fuller page accessibility audit."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};
export const contrastExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "foreground": "#777777",
  "background": "#ffffff",
  "contrast_ratio": 4.48,
  "passes": {
    "aa_normal": false,
    "aa_large": true,
    "aaa_normal": false,
    "aaa_large": false
  },
  "highest_level": "AA large only",
  "confidence_score": 1,
  "confidence_per_section": {
    "contrast": 1
  },
  "recommended_actions_priority_order": [
    "Contrast 4.48:1 — AA large only."
  ],
  "chain_to": [
    {
      "api": "accessibility-audit-lite-api",
      "reason": "Roll this contrast check into a fuller page accessibility audit."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};
export const lookupExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "hsl(204, 70%, 53%)",
  "matched_format": "hsl",
  "color": {
    "hex": "#3398db",
    "hex8": "#3398dbff",
    "rgb": "rgb(51, 152, 219)",
    "rgba": "rgba(51, 152, 219, 1)",
    "hsl": "hsl(204, 70%, 53%)",
    "hsv": "hsv(204, 77%, 86%)",
    "rgb_object": {
      "r": 51,
      "g": 152,
      "b": 219,
      "a": 1
    },
    "hsl_object": {
      "h": 204,
      "s": 70,
      "l": 53
    },
    "hsv_object": {
      "h": 204,
      "s": 77,
      "v": 86
    },
    "relative_luminance": 0.28275
  },
  "reasoning": {
    "why_result_generated": "Parsed \"hsl(204, 70%, 53%)\" as a hsl color and converted it to every supported representation using exact sRGB math.",
    "key_factors": [
      "Matched format: hsl.",
      "Canonical hex: #3398db (alpha 1).",
      "Relative luminance: 0.28275."
    ],
    "invalidators": [
      "Conversions are exact sRGB math. HSL/HSV components are rounded to whole numbers (hue 0–360, sat/light/value 0–100%); the rgb→hex→rgb round trip is lossless but hex→hsl→hex may differ by ±1 due to rounding.",
      "WCAG contrast uses relative luminance per WCAG 2.1; alpha is ignored for contrast (the ratio assumes fully opaque colors composited on no background). AA normal ≥4.5, AA large ≥3, AAA normal ≥7, AAA large ≥4.5.",
      "Only CSS Color Level 4 named colors, hex (#rgb/#rgba/#rrggbb/#rrggbbaa), rgb()/rgba(), and hsl()/hsla() are parsed; lab()/lch()/color() and other functional notations are not supported."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed as hsl; canonical hex #3398db."
  ],
  "chain_to": [
    {
      "api": "accessibility-audit-lite-api",
      "reason": "Roll this contrast check into a fuller page accessibility audit."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};
