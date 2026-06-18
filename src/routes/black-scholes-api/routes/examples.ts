// AUTO-GENERATED from live output by x402-test/gen-groupd-examples.mjs — do not hand-edit.
export const priceExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "type": "call",
  "price": 4.157453,
  "d1": -0.168222,
  "d2": -0.309643,
  "intrinsic_value": 0,
  "time_value": 4.157453,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "price": 1
  },
  "recommended_actions_priority_order": [
    "Model call price is 4.157453 (0 intrinsic + 4.157453 time value).",
    "Call /greeks for delta/gamma/vega/theta/rho before hedging."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Score the risk-adjusted return of a strategy built from these options.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "npv-irr",
      "reason": "Discount the option strategy cashflows to a present value or IRR.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  },
  "financial_disclaimer": "This result is an informational, deterministic calculation based solely on the inputs you provided. It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions."
};
export const greeksExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "type": "call",
  "price": 4.157453,
  "greeks": {
    "delta": 0.431044,
    "gamma": 0.027674,
    "vega": 0.276744,
    "theta": -0.018251,
    "rho": 0.194735
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "greeks": 1
  },
  "recommended_actions_priority_order": [
    "Delta 0.431044 — hedge with 0.431044 share(s) of the underlying per option.",
    "Theta -0.018251/day, vega 0.276744/1% vol."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Score the risk-adjusted return of a strategy built from these options.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "npv-irr",
      "reason": "Discount the option strategy cashflows to a present value or IRR.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  },
  "financial_disclaimer": "This result is an informational, deterministic calculation based solely on the inputs you provided. It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions."
};
export const lookupExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "type": "call",
  "price": 4.157453,
  "d1": -0.168222,
  "d2": -0.309643,
  "intrinsic_value": 0,
  "time_value": 4.157453,
  "greeks": {
    "delta": 0.431044,
    "gamma": 0.027674,
    "vega": 0.276744,
    "theta": -0.018251,
    "rho": 0.194735
  },
  "reasoning": {
    "why_result_generated": "Priced a European call with the Black-Scholes-Merton closed form (d1=-0.168222, d2=-0.309643) and differentiated it for the greeks.",
    "key_factors": [
      "Price 4.157453 = 0 intrinsic + 4.157453 time value.",
      "Delta 0.431044, gamma 0.027674.",
      "Theta -0.018251/day, vega 0.276744/1% vol, rho 0.194735/1% rate."
    ],
    "invalidators": [
      "This is the Black-Scholes-Merton MODEL value for a EUROPEAN option with continuous dividend yield — exact given the inputs, but it is not a market quote and assumes lognormal prices, constant volatility, no transaction costs, and no early exercise (so it under-prices American puts).",
      "volatility, risk_free_rate, and dividend_yield are ANNUAL percents; time_to_expiry is in YEARS. Garbage-in: an implied vol from a different day or annualization changes everything.",
      "Greeks are reported in trader-friendly units: vega per +1% volatility, rho per +1% rate, theta per calendar day (1/365 of annual). delta/gamma are per $1 of spot."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "price": 1,
    "greeks": 1
  },
  "recommended_actions_priority_order": [
    "Model call value 4.157453; delta-hedge with 0.431044 share(s) per contract."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Score the risk-adjusted return of a strategy built from these options.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "npv-irr",
      "reason": "Discount the option strategy cashflows to a present value or IRR.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  },
  "financial_disclaimer": "This result is an informational, deterministic calculation based solely on the inputs you provided. It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions."
};
