// AUTO-GENERATED from live output by x402-test/gen-groupd-examples.mjs — do not hand-edit.
export const valueExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "years": 5,
  "discount_rate_percent": 10,
  "terminal_growth_percent": 2.5,
  "pv_explicit": 557.821435,
  "terminal_value": 2460,
  "pv_terminal": 1527.466455,
  "enterprise_value": 2085.28789,
  "equity_value": 1885.28789,
  "value_per_share": 18.852879,
  "confidence_score": 1,
  "confidence_per_section": {
    "valuation": 1
  },
  "recommended_actions_priority_order": [
    "Enterprise value is 2085.28789 (557.821435 explicit + 1527.466455 terminal).",
    "Implied value per share: 18.852879."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Compute the IRR of the same projected cashflow stream."
    },
    {
      "api": "risk-ratios",
      "reason": "Assess the risk-adjusted return of the valued asset in a portfolio."
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
  "years": 5,
  "discount_rate_percent": 10,
  "terminal_growth_percent": 2.5,
  "pv_explicit": 557.821435,
  "terminal_value": 2460,
  "pv_terminal": 1527.466455,
  "enterprise_value": 2085.28789,
  "equity_value": 1885.28789,
  "value_per_share": 18.852879,
  "discount_rate_sensitivity": [
    {
      "discount_rate_percent": 8,
      "enterprise_value": 2872.758859
    },
    {
      "discount_rate_percent": 9,
      "enterprise_value": 2418.229116
    },
    {
      "discount_rate_percent": 10,
      "enterprise_value": 2085.28789
    },
    {
      "discount_rate_percent": 11,
      "enterprise_value": 1831.006164
    },
    {
      "discount_rate_percent": 12,
      "enterprise_value": 1630.531068
    }
  ],
  "reasoning": {
    "why_result_generated": "Discounted 5 year(s) of free cash flow at 10% with a 2.5% Gordon terminal value.",
    "key_factors": [
      "Enterprise value 2085.28789 = 557.821435 explicit + 1527.466455 terminal.",
      "Terminal value is 1527.466455 of EV (73.2%).",
      "Value per share 18.852879."
    ],
    "invalidators": [
      "Cashflows are discounted as YEAR-END amounts (year 1..n) at a flat annual discount rate; there is no mid-year convention. A terminal value is added only when terminal_growth_rate is supplied (Gordon growth on the final year).",
      "The Gordon terminal value requires discount_rate > terminal_growth_rate and is extremely sensitive near r≈g — a small change in either input can swing enterprise value dramatically (see the /lookup sensitivity grid).",
      "enterprise_value is pre-capital-structure; equity_value subtracts net_debt and value_per_share divides by shares_outstanding only when you supply them. Results are only as good as the projected free cash flows you provide."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "valuation": 1
  },
  "recommended_actions_priority_order": [
    "Use enterprise value 2085.28789; check the sensitivity grid — terminal value drives 73% of it."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Compute the IRR of the same projected cashflow stream."
    },
    {
      "api": "risk-ratios",
      "reason": "Assess the risk-adjusted return of the valued asset in a portfolio."
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
