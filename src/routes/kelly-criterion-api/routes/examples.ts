// AUTO-GENERATED from live output by x402-test/gen-groupd-batch3-examples.mjs — do not hand-edit.
export const kellyExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "win_probability": 0.55,
  "loss_probability": 0.45,
  "win_payoff": 1,
  "loss_fraction": 1,
  "kelly_multiplier": 0.5,
  "edge": 0.1,
  "expected_value_per_unit": 0.1,
  "kelly_fraction": 0.1,
  "fractional_kelly_fraction": 0.05,
  "favorable": true,
  "expected_log_growth_full": 0.00500837,
  "expected_log_growth_fractional": 0.00375261,
  "bankroll": 10000,
  "recommended_stake": 500,
  "recommendation": "Stake 5% of bankroll (fractional Kelly ×0.5 of the 10% full Kelly).",
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "kelly": 1
  },
  "recommended_actions_priority_order": [
    "Stake 5% of bankroll (fractional Kelly ×0.5 of the 10% full Kelly)."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Translate the chosen stake into portfolio-level risk-adjusted metrics.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "max-drawdown",
      "reason": "Stress-test the equity path of the sizing strategy.",
      "url": "https://orbis-apis.onrender.com/max-drawdown"
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
export const ruinExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "win_probability": 0.55,
  "loss_probability": 0.45,
  "bankroll_units": 20,
  "risk_of_ruin": 0.0180716,
  "survival_probability": 0.9819284,
  "favorable": true,
  "assumptions": "Flat even-money (1:1) bets of one unit; ruin = bankroll hits 0. P(ruin) = (q/p)^units when p>0.5, else 1.",
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "risk_of_ruin": 1
  },
  "recommended_actions_priority_order": [
    "Risk of ruin 1.8072% over a 20-unit bankroll (flat even-money bets)."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Translate the chosen stake into portfolio-level risk-adjusted metrics.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "max-drawdown",
      "reason": "Stress-test the equity path of the sizing strategy.",
      "url": "https://orbis-apis.onrender.com/max-drawdown"
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
  "win_probability": 0.55,
  "loss_probability": 0.45,
  "win_payoff": 1,
  "loss_fraction": 1,
  "kelly_multiplier": 0.5,
  "edge": 0.1,
  "expected_value_per_unit": 0.1,
  "kelly_fraction": 0.1,
  "fractional_kelly_fraction": 0.05,
  "favorable": true,
  "expected_log_growth_full": 0.00500837,
  "expected_log_growth_fractional": 0.00375261,
  "bankroll": 10000,
  "recommended_stake": 500,
  "recommendation": "Stake 5% of bankroll (fractional Kelly ×0.5 of the 10% full Kelly).",
  "reasoning": {
    "why_result_generated": "Edge is positive (EV 0.1/unit). Full Kelly = p/loss_fraction − q/win_payoff = 0.1; applying the ×0.5 multiplier gives a 0.05 stake fraction ($500 of $10000).",
    "key_factors": [
      "Kelly fraction 0.1 (fractional 0.05).",
      "Edge / EV per unit 0.1.",
      "Expected log-growth 0.00375261 at the fractional stake."
    ],
    "invalidators": [
      "Kelly maximizes long-run LOG growth and assumes the win probability and payoff are accurate and stationary; overstated edge leads to oversized bets and large drawdowns. Practitioners commonly use fractional Kelly (½ or less).",
      "win_payoff is the NET odds b (profit per unit staked on a win); loss_fraction is the fraction of the stake lost on a loss (default 1). f* = p/loss_fraction − q/win_payoff.",
      "The /risk-of-ruin figure assumes FLAT even-money one-unit bets, not Kelly-proportional staking; it is a separate classical model, not the ruin probability of the Kelly fraction above."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "kelly": 1
  },
  "recommended_actions_priority_order": [
    "Stake 5% of bankroll (fractional Kelly ×0.5 of the 10% full Kelly).",
    "Consider fractional Kelly (≤ ½) to reduce drawdown risk."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Translate the chosen stake into portfolio-level risk-adjusted metrics.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "max-drawdown",
      "reason": "Stress-test the equity path of the sizing strategy.",
      "url": "https://orbis-apis.onrender.com/max-drawdown"
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
