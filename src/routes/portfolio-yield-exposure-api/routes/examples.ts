// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b3-examples.mjs — do not hand-edit.
export const analyzeExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-21T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "portfolio": "defi-book",
  "position_count": 4,
  "total_yield_position_usd": 160000,
  "weighted_apy_pct": 24.81,
  "yield_risk_score": 18,
  "risk_band": "low",
  "il_exposure_pct": 25,
  "locked_pct": 9.38,
  "high_apy_exposure_pct": 9.38,
  "reward_token_dependency_pct": 9.38,
  "unaudited_pct": 9.38,
  "protocol_concentration": {
    "hhi": 0.3457,
    "band": "moderate",
    "top_protocol": "Aave",
    "top_protocol_share_pct": 50
  },
  "type_breakdown": [
    {
      "type": "lending",
      "amount_usd": 80000,
      "share_pct": 50,
      "position_count": 1
    },
    {
      "type": "lp",
      "amount_usd": 65000,
      "share_pct": 40.63,
      "position_count": 2
    },
    {
      "type": "farm",
      "amount_usd": 15000,
      "share_pct": 9.38,
      "position_count": 1
    }
  ],
  "verdict": "review",
  "hard_block": false,
  "positions": [
    {
      "protocol": "NewFarm",
      "type": "farm",
      "amount_usd": 15000,
      "apy_pct": 180,
      "reward_token": "FARM",
      "il_risk": "unknown",
      "is_stable_pair": false,
      "lockup_days": 30,
      "audited": false,
      "risk_score": 81,
      "risk_band": "severe",
      "reasons": [
        "Very high APY (180%) — elevated/unsustainable-yield risk.",
        "Non-stable LP/farm position — exposed to impermanent loss.",
        "Funds locked for 30 day(s) — illiquid; cannot exit on a depeg/exploit.",
        "Protocol not marked audited — smart-contract risk."
      ],
      "value_share_pct": 9.38,
      "weighted_risk_contribution": 7.59
    },
    {
      "protocol": "Uniswap",
      "type": "lp",
      "amount_usd": 25000,
      "apy_pct": 22,
      "reward_token": null,
      "il_risk": "high",
      "is_stable_pair": false,
      "lockup_days": 0,
      "audited": true,
      "risk_score": 42,
      "risk_band": "medium",
      "reasons": [
        "Non-stable LP/farm position — exposed to impermanent loss."
      ],
      "value_share_pct": 15.63,
      "weighted_risk_contribution": 6.56
    },
    {
      "protocol": "Aave",
      "type": "lending",
      "amount_usd": 80000,
      "apy_pct": 4.5,
      "reward_token": null,
      "il_risk": "unknown",
      "is_stable_pair": false,
      "lockup_days": 0,
      "audited": true,
      "risk_score": 6,
      "risk_band": "low",
      "reasons": [
        "lending on Aave at 4.5% APY — lower-risk yield position."
      ],
      "value_share_pct": 50,
      "weighted_risk_contribution": 3
    },
    {
      "protocol": "Curve",
      "type": "lp",
      "amount_usd": 40000,
      "apy_pct": 9,
      "reward_token": null,
      "il_risk": "unknown",
      "is_stable_pair": true,
      "lockup_days": 0,
      "audited": true,
      "risk_score": 5,
      "risk_band": "low",
      "reasons": [
        "lp on Curve at 9% APY — lower-risk yield position."
      ],
      "value_share_pct": 25,
      "weighted_risk_contribution": 1.25
    }
  ],
  "highest_risk_positions": [
    {
      "protocol": "NewFarm",
      "type": "farm",
      "amount_usd": 15000,
      "apy_pct": 180,
      "reward_token": "FARM",
      "il_risk": "unknown",
      "is_stable_pair": false,
      "lockup_days": 30,
      "audited": false,
      "risk_score": 81,
      "risk_band": "severe",
      "reasons": [
        "Very high APY (180%) — elevated/unsustainable-yield risk.",
        "Non-stable LP/farm position — exposed to impermanent loss.",
        "Funds locked for 30 day(s) — illiquid; cannot exit on a depeg/exploit.",
        "Protocol not marked audited — smart-contract risk."
      ],
      "value_share_pct": 9.38,
      "weighted_risk_contribution": 7.59
    }
  ],
  "risk_disclaimer": "Roll-up over the yield positions you supplied — not a live protocol/APY feed, not financial advice. APYs and protocol facts are trusted as given; a position you omit is excluded. High APY reflects higher risk, not guaranteed return; APYs vary and can go to zero.",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "rollup": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Rolled up 4 yield positions ($160000, blended APY 24.81%): yield risk 18/100 (low) → verdict review.",
    "9.38% of value is in ≥50% APY positions — verify the yield is real and sustainable, not a temporary emission or a trap.",
    "25% is exposed to impermanent loss — model the IL vs fees before holding through volatility.",
    "9.38% of value is locked — you cannot exit these on a depeg or exploit; size accordingly.",
    "moderate protocol concentration; Aave holds 50% — single-protocol exploit risk. Diversify."
  ],
  "chain_to": [
    {
      "api": "multi-wallet-portfolio-risk-rollup",
      "reason": "Roll the yield sleeve up with the rest of the wallet fleet for one portfolio verdict.",
      "url": "https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup"
    },
    {
      "api": "portfolio-stablecoin-risk",
      "reason": "Assess depeg risk on any stablecoins backing these yield positions.",
      "url": "https://orbis-apis.onrender.com/portfolio-stablecoin-risk"
    },
    {
      "api": "smart-contract-risk",
      "reason": "Deep-dive the smart-contract risk of an unaudited or high-concentration protocol.",
      "url": "https://orbis-apis.onrender.com/smart-contract-risk"
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
export const lookupExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-21T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "portfolio": "defi-book",
  "position_count": 4,
  "total_yield_position_usd": 160000,
  "weighted_apy_pct": 24.81,
  "yield_risk_score": 18,
  "risk_band": "low",
  "il_exposure_pct": 25,
  "locked_pct": 9.38,
  "high_apy_exposure_pct": 9.38,
  "reward_token_dependency_pct": 9.38,
  "unaudited_pct": 9.38,
  "protocol_concentration": {
    "hhi": 0.3457,
    "band": "moderate",
    "top_protocol": "Aave",
    "top_protocol_share_pct": 50
  },
  "type_breakdown": [
    {
      "type": "lending",
      "amount_usd": 80000,
      "share_pct": 50,
      "position_count": 1
    },
    {
      "type": "lp",
      "amount_usd": 65000,
      "share_pct": 40.63,
      "position_count": 2
    },
    {
      "type": "farm",
      "amount_usd": 15000,
      "share_pct": 9.38,
      "position_count": 1
    }
  ],
  "verdict": "review",
  "hard_block": false,
  "positions": [
    {
      "protocol": "NewFarm",
      "type": "farm",
      "amount_usd": 15000,
      "apy_pct": 180,
      "reward_token": "FARM",
      "il_risk": "unknown",
      "is_stable_pair": false,
      "lockup_days": 30,
      "audited": false,
      "risk_score": 81,
      "risk_band": "severe",
      "reasons": [
        "Very high APY (180%) — elevated/unsustainable-yield risk.",
        "Non-stable LP/farm position — exposed to impermanent loss.",
        "Funds locked for 30 day(s) — illiquid; cannot exit on a depeg/exploit.",
        "Protocol not marked audited — smart-contract risk."
      ],
      "value_share_pct": 9.38,
      "weighted_risk_contribution": 7.59
    },
    {
      "protocol": "Uniswap",
      "type": "lp",
      "amount_usd": 25000,
      "apy_pct": 22,
      "reward_token": null,
      "il_risk": "high",
      "is_stable_pair": false,
      "lockup_days": 0,
      "audited": true,
      "risk_score": 42,
      "risk_band": "medium",
      "reasons": [
        "Non-stable LP/farm position — exposed to impermanent loss."
      ],
      "value_share_pct": 15.63,
      "weighted_risk_contribution": 6.56
    },
    {
      "protocol": "Aave",
      "type": "lending",
      "amount_usd": 80000,
      "apy_pct": 4.5,
      "reward_token": null,
      "il_risk": "unknown",
      "is_stable_pair": false,
      "lockup_days": 0,
      "audited": true,
      "risk_score": 6,
      "risk_band": "low",
      "reasons": [
        "lending on Aave at 4.5% APY — lower-risk yield position."
      ],
      "value_share_pct": 50,
      "weighted_risk_contribution": 3
    },
    {
      "protocol": "Curve",
      "type": "lp",
      "amount_usd": 40000,
      "apy_pct": 9,
      "reward_token": null,
      "il_risk": "unknown",
      "is_stable_pair": true,
      "lockup_days": 0,
      "audited": true,
      "risk_score": 5,
      "risk_band": "low",
      "reasons": [
        "lp on Curve at 9% APY — lower-risk yield position."
      ],
      "value_share_pct": 25,
      "weighted_risk_contribution": 1.25
    }
  ],
  "highest_risk_positions": [
    {
      "protocol": "NewFarm",
      "type": "farm",
      "amount_usd": 15000,
      "apy_pct": 180,
      "reward_token": "FARM",
      "il_risk": "unknown",
      "is_stable_pair": false,
      "lockup_days": 30,
      "audited": false,
      "risk_score": 81,
      "risk_band": "severe",
      "reasons": [
        "Very high APY (180%) — elevated/unsustainable-yield risk.",
        "Non-stable LP/farm position — exposed to impermanent loss.",
        "Funds locked for 30 day(s) — illiquid; cannot exit on a depeg/exploit.",
        "Protocol not marked audited — smart-contract risk."
      ],
      "value_share_pct": 9.38,
      "weighted_risk_contribution": 7.59
    }
  ],
  "risk_disclaimer": "Roll-up over the yield positions you supplied — not a live protocol/APY feed, not financial advice. APYs and protocol facts are trusted as given; a position you omit is excluded. High APY reflects higher risk, not guaranteed return; APYs vary and can go to zero.",
  "reasoning": {
    "why_result_generated": "Rolled up 4 yield positions; value-weighted yield risk is 18/100 (low) at a blended 24.81% APY → verdict review.",
    "key_factors": [
      "Total $160000; blended APY 24.81%.",
      "High-APY (≥50%) exposure 9.38%; IL exposure 25%; locked 9.38%.",
      "Protocol concentration HHI 0.3457 (moderate); top protocol Aave 50%.",
      "Unaudited exposure 9.38%; reward-token dependency 9.38%."
    ],
    "invalidators": [
      "Rolls up only the positions you supplied — omitted positions are excluded.",
      "APY is taken as given and treated as a risk signal, not a guaranteed return; emissions-based APYs decay.",
      "IL risk is inferred for non-stable LP/farm positions when not supplied; an explicit il_risk overrides the inference."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "rollup": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Rolled up 4 yield positions ($160000, blended APY 24.81%): yield risk 18/100 (low) → verdict review.",
    "9.38% of value is in ≥50% APY positions — verify the yield is real and sustainable, not a temporary emission or a trap.",
    "25% is exposed to impermanent loss — model the IL vs fees before holding through volatility.",
    "9.38% of value is locked — you cannot exit these on a depeg or exploit; size accordingly.",
    "moderate protocol concentration; Aave holds 50% — single-protocol exploit risk. Diversify."
  ],
  "chain_to": [
    {
      "api": "multi-wallet-portfolio-risk-rollup",
      "reason": "Roll the yield sleeve up with the rest of the wallet fleet for one portfolio verdict.",
      "url": "https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup"
    },
    {
      "api": "portfolio-stablecoin-risk",
      "reason": "Assess depeg risk on any stablecoins backing these yield positions.",
      "url": "https://orbis-apis.onrender.com/portfolio-stablecoin-risk"
    },
    {
      "api": "smart-contract-risk",
      "reason": "Deep-dive the smart-contract risk of an unaudited or high-concentration protocol.",
      "url": "https://orbis-apis.onrender.com/smart-contract-risk"
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
