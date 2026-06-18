// AUTO-GENERATED from live output by x402-test/gen-groupd-batch2-examples.mjs — do not hand-edit.
export const waccExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "equity_value": 600000,
  "debt_value": 400000,
  "total_value": 1000000,
  "equity_weight": 0.6,
  "debt_weight": 0.4,
  "cost_of_equity_percent": 9,
  "cost_of_debt_percent": 5,
  "tax_rate_percent": 21,
  "after_tax_cost_of_debt_percent": 3.95,
  "wacc_percent": 6.98,
  "confidence_score": 1,
  "confidence_per_section": {
    "wacc": 1
  },
  "recommended_actions_priority_order": [
    "WACC 6.98% (equity 0.6, debt 0.4, after-tax Rd 3.95%)."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Use the WACC as the discount rate for a DCF valuation."
    },
    {
      "api": "bond-analytics",
      "reason": "Estimate the pre-tax cost of debt from a bond yield."
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
export const capmExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "risk_free_percent": 4,
  "beta": 1.2,
  "equity_risk_premium_percent": 6,
  "market_return_percent": 10,
  "cost_of_equity_percent": 11.2,
  "confidence_score": 1,
  "confidence_per_section": {
    "capm": 1
  },
  "recommended_actions_priority_order": [
    "Cost of equity 11.2% = 4% + 1.2·6%."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Use the WACC as the discount rate for a DCF valuation."
    },
    {
      "api": "bond-analytics",
      "reason": "Estimate the pre-tax cost of debt from a bond yield."
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
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "equity_value": 600000,
  "debt_value": 400000,
  "total_value": 1000000,
  "equity_weight": 0.6,
  "debt_weight": 0.4,
  "cost_of_equity_percent": 11.2,
  "cost_of_debt_percent": 5,
  "tax_rate_percent": 21,
  "after_tax_cost_of_debt_percent": 3.95,
  "wacc_percent": 8.3,
  "capm": {
    "risk_free_percent": 4,
    "beta": 1.2,
    "equity_risk_premium_percent": 6,
    "market_return_percent": 10,
    "cost_of_equity_percent": 11.2
  },
  "reasoning": {
    "why_result_generated": "CAPM cost of equity 11.2% (= 4% + β 1.2 · ERP 6%), then WACC = 0.6·11.2% + 0.4·5%·(1−21%) = 8.3%.",
    "key_factors": [
      "WACC 8.3%.",
      "Cost of equity 11.2% (CAPM).",
      "After-tax cost of debt 3.95%."
    ],
    "invalidators": [
      "Weights are MARKET-VALUE based: we = E/(E+D), wd = D/(E+D). Using book values changes the weights and the WACC.",
      "WACC = we·Re + wd·Rd·(1 − tax); only debt interest is tax-deductible, so the tax shield is applied to the cost of debt, not equity. tax_rate_percent defaults to 0 (no shield).",
      "CAPM cost of equity = Rf + β·ERP, where ERP is supplied directly or derived as market_return − risk_free. It assumes a single-factor model and a stable beta; it is an estimate, not a guaranteed return."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "wacc": 1,
    "capm": 1
  },
  "recommended_actions_priority_order": [
    "Use 8.3% as the DCF discount rate; chain to dcf-valuation."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Use the WACC as the discount rate for a DCF valuation."
    },
    {
      "api": "bond-analytics",
      "reason": "Estimate the pre-tax cost of debt from a bond yield."
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
