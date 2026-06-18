// AUTO-GENERATED from live output by x402-test/gen-groupd-batch3-examples.mjs — do not hand-edit.
export const ltvCacExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "arpu": 100,
  "gross_margin_percent": 80,
  "cac": 400,
  "monthly_churn_rate": 0.05,
  "lifetime_periods": 20,
  "gross_margin_per_period": 80,
  "ltv": 1600,
  "ltv_cac_ratio": 4,
  "cac_payback_periods": 5,
  "verdict": "healthy (LTV:CAC ≥ 3:1)",
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "ltv_cac": 1
  },
  "recommended_actions_priority_order": [
    "LTV $1600, LTV:CAC 4:1 — healthy (LTV:CAC ≥ 3:1). CAC payback 5 periods."
  ],
  "chain_to": [
    {
      "api": "break-even",
      "reason": "Translate contribution margin into the break-even volume for the product.",
      "url": "https://orbis-apis.onrender.com/break-even"
    },
    {
      "api": "compound-interest",
      "reason": "Project the customer base or revenue forward at a growth rate.",
      "url": "https://orbis-apis.onrender.com/compound-interest"
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
export const marginsExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "revenue": 100000,
  "cogs": 30000,
  "variable_costs": 15000,
  "gross_profit": 70000,
  "gross_margin_percent": 70,
  "contribution_margin": 55000,
  "contribution_margin_percent": 55,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "margins": 1
  },
  "recommended_actions_priority_order": [
    "Gross margin 70%, contribution margin 55%."
  ],
  "chain_to": [
    {
      "api": "break-even",
      "reason": "Translate contribution margin into the break-even volume for the product.",
      "url": "https://orbis-apis.onrender.com/break-even"
    },
    {
      "api": "compound-interest",
      "reason": "Project the customer base or revenue forward at a growth rate.",
      "url": "https://orbis-apis.onrender.com/compound-interest"
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
  "arpu": 100,
  "gross_margin_percent": 80,
  "cac": 400,
  "monthly_churn_rate": 0.05,
  "lifetime_periods": 20,
  "gross_margin_per_period": 80,
  "ltv": 1600,
  "ltv_cac_ratio": 4,
  "cac_payback_periods": 5,
  "verdict": "healthy (LTV:CAC ≥ 3:1)",
  "reasoning": {
    "why_result_generated": "Gross margin/period $80 (ARPU $100 × 80%); over a 20-period lifetime that is LTV $1600, a 4:1 ratio against $400 CAC, recovered in 5 periods.",
    "key_factors": [
      "LTV:CAC 4:1 — healthy (LTV:CAC ≥ 3:1).",
      "CAC payback 5 periods.",
      "Customer lifetime 20 periods."
    ],
    "invalidators": [
      "LTV here is GROSS-MARGIN LTV = ARPU × gross_margin × lifetime; lifetime = 1/monthly_churn (or supplied directly). A churn-derived lifetime assumes a constant churn rate and ignores discounting and expansion revenue.",
      "LTV:CAC ≥ 3:1 is a common health benchmark and CAC payback under ~12 months is typical for SaaS — both are heuristics, not guarantees, and depend on your period unit (monthly vs annual).",
      "Revenue-based margins assume cogs and variable_costs are expressed in the same currency and period as revenue; mixing periods invalidates the percentages."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "ltv_cac": 1
  },
  "recommended_actions_priority_order": [
    "Healthy unit economics — scale acquisition; chain to break-even for volume planning."
  ],
  "chain_to": [
    {
      "api": "break-even",
      "reason": "Translate contribution margin into the break-even volume for the product.",
      "url": "https://orbis-apis.onrender.com/break-even"
    },
    {
      "api": "compound-interest",
      "reason": "Project the customer base or revenue forward at a growth rate.",
      "url": "https://orbis-apis.onrender.com/compound-interest"
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
