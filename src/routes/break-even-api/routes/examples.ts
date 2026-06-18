// AUTO-GENERATED from live output by x402-test/gen-groupd-batch3-examples.mjs — do not hand-edit.
export const unitsExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "fixed_costs": 50000,
  "price_per_unit": 40,
  "variable_cost_per_unit": 25,
  "contribution_margin_per_unit": 15,
  "contribution_margin_ratio": 0.375,
  "break_even_units": 3333.3333,
  "break_even_revenue": 133333.33,
  "target_profit": 20000,
  "target_profit_units": 4666.6667,
  "target_profit_revenue": 186666.67,
  "current_units": 5000,
  "margin_of_safety_units": 1666.6667,
  "margin_of_safety_percent": 33.3333,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "units": 1
  },
  "recommended_actions_priority_order": [
    "Break-even at 3333.3333 units ($133333.33 revenue); contribution margin $15/unit."
  ],
  "chain_to": [
    {
      "api": "payback-period",
      "reason": "Once break-even is known, evaluate how long the upfront investment takes to pay back.",
      "url": "https://orbis-apis.onrender.com/payback-period"
    },
    {
      "api": "unit-economics",
      "reason": "Translate per-unit contribution margin into CAC payback and LTV:CAC.",
      "url": "https://orbis-apis.onrender.com/unit-economics"
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
export const revenueExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "fixed_costs": 50000,
  "contribution_margin_ratio": 0.375,
  "break_even_revenue": 133333.33,
  "target_profit": 0,
  "target_profit_revenue": 133333.33,
  "current_revenue": 200000,
  "margin_of_safety_revenue": 66666.67,
  "margin_of_safety_percent": 33.3333,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "revenue": 1
  },
  "recommended_actions_priority_order": [
    "Break-even revenue $133333.33 at a 37.5% contribution margin."
  ],
  "chain_to": [
    {
      "api": "payback-period",
      "reason": "Once break-even is known, evaluate how long the upfront investment takes to pay back.",
      "url": "https://orbis-apis.onrender.com/payback-period"
    },
    {
      "api": "unit-economics",
      "reason": "Translate per-unit contribution margin into CAC payback and LTV:CAC.",
      "url": "https://orbis-apis.onrender.com/unit-economics"
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
export const lookupExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "fixed_costs": 50000,
  "price_per_unit": 40,
  "variable_cost_per_unit": 25,
  "contribution_margin_per_unit": 15,
  "contribution_margin_ratio": 0.375,
  "break_even_units": 3333.3333,
  "break_even_revenue": 133333.33,
  "target_profit": 20000,
  "target_profit_units": 4666.6667,
  "target_profit_revenue": 186666.67,
  "current_units": 5000,
  "margin_of_safety_units": 1666.6667,
  "margin_of_safety_percent": 33.3333,
  "reasoning": {
    "why_result_generated": "Contribution margin $15/unit (price $40 − variable $25); break-even = fixed $50000 ÷ CM = 3333.3333 units. Target profit $20000 needs 4666.6667 units.",
    "key_factors": [
      "Break-even 3333.3333 units ($133333.33).",
      "Contribution margin ratio 37.5%.",
      "Margin of safety 33.3333% above break-even."
    ],
    "invalidators": [
      "Break-even assumes a CONSTANT price and variable cost per unit and fixed costs that do not change with volume; volume discounts, step-fixed costs or price changes shift the point.",
      "Contribution margin = price − variable cost; if variable cost ≥ price the contribution margin is ≤ 0 and there is no finite break-even.",
      "Margin of safety is only computed when current_units (or current_revenue) is supplied, and is relative to that figure."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "units": 1,
    "target_profit": 1
  },
  "recommended_actions_priority_order": [
    "Sell at least 3333.3333 units to break even.",
    "Reach 4666.6667 units for a $20000 profit."
  ],
  "chain_to": [
    {
      "api": "payback-period",
      "reason": "Once break-even is known, evaluate how long the upfront investment takes to pay back.",
      "url": "https://orbis-apis.onrender.com/payback-period"
    },
    {
      "api": "unit-economics",
      "reason": "Translate per-unit contribution margin into CAC payback and LTV:CAC.",
      "url": "https://orbis-apis.onrender.com/unit-economics"
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
