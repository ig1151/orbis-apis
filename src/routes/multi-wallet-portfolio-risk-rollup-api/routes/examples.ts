// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b2-examples.mjs — do not hand-edit.
export const rollupExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-19T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "total_value_usd": 407000,
  "wallet_count": 5,
  "scored_wallet_count": 4,
  "unscored_wallet_count": 1,
  "value_weighted_risk_score": 25,
  "equal_weighted_risk_score": 63,
  "portfolio_risk_band": "medium",
  "verdict": "review",
  "hard_block": false,
  "value_at_risk_usd": 57000,
  "risk_adjusted_value_usd": 77600,
  "concentration": {
    "hhi": 0.4484,
    "band": "high",
    "top_wallet_share_pct": 61.43,
    "top3_share_pct": 95.83
  },
  "count_by_band": {
    "low": 1,
    "medium": 0,
    "high": 1,
    "severe": 2,
    "unscored": 1
  },
  "worst_wallet": {
    "label": "Flagged Wallet",
    "address": "0xflg",
    "value_usd": 5000,
    "risk_score": 90,
    "risk_band": "severe",
    "risk_source": "flagged",
    "flagged": true,
    "sanctioned": false,
    "risk_adjusted_value_usd": 4500,
    "reasons": [
      "Flagged/blocklisted wallet — treated as high risk."
    ],
    "value_share_pct": 1.23
  },
  "wallets": [
    {
      "label": "Treasury",
      "address": "0xtre",
      "value_usd": 250000,
      "risk_score": 15,
      "risk_band": "low",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 37500,
      "reasons": [
        "Risk 15/100 (low) from the supplied score."
      ],
      "value_share_pct": 61.43
    },
    {
      "label": "Hot Wallet",
      "address": "0xhot",
      "value_usd": 40000,
      "risk_score": 65,
      "risk_band": "high",
      "risk_source": "derived",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 26000,
      "reasons": [
        "No risk_score supplied — risk derived from approval/reputation signals."
      ],
      "value_share_pct": 9.83
    },
    {
      "label": "Degen Wallet",
      "address": "0xdeg",
      "value_usd": 12000,
      "risk_score": 80,
      "risk_band": "severe",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 9600,
      "reasons": [
        "Risk 80/100 (severe) from the supplied score."
      ],
      "value_share_pct": 2.95
    },
    {
      "label": "Flagged Wallet",
      "address": "0xflg",
      "value_usd": 5000,
      "risk_score": 90,
      "risk_band": "severe",
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "risk_adjusted_value_usd": 4500,
      "reasons": [
        "Flagged/blocklisted wallet — treated as high risk."
      ],
      "value_share_pct": 1.23
    },
    {
      "label": "Cold Storage",
      "address": "0xcld",
      "value_usd": 100000,
      "risk_score": null,
      "risk_band": "unscored",
      "risk_source": "unscored",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 0,
      "reasons": [
        "No risk signal supplied — counted in value but excluded from weighted risk."
      ],
      "value_share_pct": 24.57
    }
  ],
  "highest_risk_wallets": [
    {
      "label": "Treasury",
      "address": "0xtre",
      "value_usd": 250000,
      "risk_score": 15,
      "risk_band": "low",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 37500,
      "reasons": [
        "Risk 15/100 (low) from the supplied score."
      ],
      "value_share_pct": 61.43
    },
    {
      "label": "Hot Wallet",
      "address": "0xhot",
      "value_usd": 40000,
      "risk_score": 65,
      "risk_band": "high",
      "risk_source": "derived",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 26000,
      "reasons": [
        "No risk_score supplied — risk derived from approval/reputation signals."
      ],
      "value_share_pct": 9.83
    },
    {
      "label": "Degen Wallet",
      "address": "0xdeg",
      "value_usd": 12000,
      "risk_score": 80,
      "risk_band": "severe",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 9600,
      "reasons": [
        "Risk 80/100 (severe) from the supplied score."
      ],
      "value_share_pct": 2.95
    },
    {
      "label": "Flagged Wallet",
      "address": "0xflg",
      "value_usd": 5000,
      "risk_score": 90,
      "risk_band": "severe",
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "risk_adjusted_value_usd": 4500,
      "reasons": [
        "Flagged/blocklisted wallet — treated as high risk."
      ],
      "value_share_pct": 1.23
    }
  ],
  "risk_disclaimer": "Value-weighted rollup over the wallets and risk signals you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; a wallet you omit is excluded, not assumed safe. Wallets without any risk signal are counted but left out of the weighted risk.",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "aggregation": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Rolled up 5 wallet(s) worth $407000: value-weighted risk 25/100 (medium) → verdict review.",
    "$57000 sits in high/severe-risk wallet(s) (3) — prioritize migrating or de-risking those balances.",
    "high value concentration (HHI 0.4484); top wallet holds 61.43% — single-wallet failure risk.",
    "1 wallet(s) have no risk signal — fetch scores to tighten the rollup."
  ],
  "chain_to": [
    {
      "api": "wallet-risk-bundle",
      "reason": "Produce a per-wallet composite risk score to feed into this rollup.",
      "url": "https://orbis-apis.onrender.com/wallet-risk-bundle"
    },
    {
      "api": "wallet-address-risk",
      "reason": "Fetch an AML/sanctions risk score for any unscored wallet.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "wallet-balance",
      "reason": "Pull current USD value per wallet to populate value_usd.",
      "url": "https://orbis-apis.onrender.com/wallet-balance"
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
  "computed_at": "2026-06-19T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "total_value_usd": 407000,
  "wallet_count": 5,
  "scored_wallet_count": 4,
  "unscored_wallet_count": 1,
  "value_weighted_risk_score": 25,
  "equal_weighted_risk_score": 63,
  "portfolio_risk_band": "medium",
  "verdict": "review",
  "hard_block": false,
  "value_at_risk_usd": 57000,
  "risk_adjusted_value_usd": 77600,
  "concentration": {
    "hhi": 0.4484,
    "band": "high",
    "top_wallet_share_pct": 61.43,
    "top3_share_pct": 95.83
  },
  "count_by_band": {
    "low": 1,
    "medium": 0,
    "high": 1,
    "severe": 2,
    "unscored": 1
  },
  "worst_wallet": {
    "label": "Flagged Wallet",
    "address": "0xflg",
    "value_usd": 5000,
    "risk_score": 90,
    "risk_band": "severe",
    "risk_source": "flagged",
    "flagged": true,
    "sanctioned": false,
    "risk_adjusted_value_usd": 4500,
    "reasons": [
      "Flagged/blocklisted wallet — treated as high risk."
    ],
    "value_share_pct": 1.23
  },
  "wallets": [
    {
      "label": "Treasury",
      "address": "0xtre",
      "value_usd": 250000,
      "risk_score": 15,
      "risk_band": "low",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 37500,
      "reasons": [
        "Risk 15/100 (low) from the supplied score."
      ],
      "value_share_pct": 61.43
    },
    {
      "label": "Hot Wallet",
      "address": "0xhot",
      "value_usd": 40000,
      "risk_score": 65,
      "risk_band": "high",
      "risk_source": "derived",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 26000,
      "reasons": [
        "No risk_score supplied — risk derived from approval/reputation signals."
      ],
      "value_share_pct": 9.83
    },
    {
      "label": "Degen Wallet",
      "address": "0xdeg",
      "value_usd": 12000,
      "risk_score": 80,
      "risk_band": "severe",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 9600,
      "reasons": [
        "Risk 80/100 (severe) from the supplied score."
      ],
      "value_share_pct": 2.95
    },
    {
      "label": "Flagged Wallet",
      "address": "0xflg",
      "value_usd": 5000,
      "risk_score": 90,
      "risk_band": "severe",
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "risk_adjusted_value_usd": 4500,
      "reasons": [
        "Flagged/blocklisted wallet — treated as high risk."
      ],
      "value_share_pct": 1.23
    },
    {
      "label": "Cold Storage",
      "address": "0xcld",
      "value_usd": 100000,
      "risk_score": null,
      "risk_band": "unscored",
      "risk_source": "unscored",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 0,
      "reasons": [
        "No risk signal supplied — counted in value but excluded from weighted risk."
      ],
      "value_share_pct": 24.57
    }
  ],
  "highest_risk_wallets": [
    {
      "label": "Treasury",
      "address": "0xtre",
      "value_usd": 250000,
      "risk_score": 15,
      "risk_band": "low",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 37500,
      "reasons": [
        "Risk 15/100 (low) from the supplied score."
      ],
      "value_share_pct": 61.43
    },
    {
      "label": "Hot Wallet",
      "address": "0xhot",
      "value_usd": 40000,
      "risk_score": 65,
      "risk_band": "high",
      "risk_source": "derived",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 26000,
      "reasons": [
        "No risk_score supplied — risk derived from approval/reputation signals."
      ],
      "value_share_pct": 9.83
    },
    {
      "label": "Degen Wallet",
      "address": "0xdeg",
      "value_usd": 12000,
      "risk_score": 80,
      "risk_band": "severe",
      "risk_source": "supplied",
      "flagged": false,
      "sanctioned": false,
      "risk_adjusted_value_usd": 9600,
      "reasons": [
        "Risk 80/100 (severe) from the supplied score."
      ],
      "value_share_pct": 2.95
    },
    {
      "label": "Flagged Wallet",
      "address": "0xflg",
      "value_usd": 5000,
      "risk_score": 90,
      "risk_band": "severe",
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "risk_adjusted_value_usd": 4500,
      "reasons": [
        "Flagged/blocklisted wallet — treated as high risk."
      ],
      "value_share_pct": 1.23
    }
  ],
  "risk_disclaimer": "Value-weighted rollup over the wallets and risk signals you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; a wallet you omit is excluded, not assumed safe. Wallets without any risk signal are counted but left out of the weighted risk.",
  "reasoning": {
    "why_result_generated": "Rolled up 5 wallet(s) ($407000); value-weighted risk over 4 scored wallet(s) is 25/100 (medium) → verdict review.",
    "key_factors": [
      "Total value $407000; $57000 in high/severe wallets.",
      "Value-weighted risk 25/100, equal-weighted 63/100.",
      "Band counts — low 1, medium 0, high 1, severe 2, unscored 1.",
      "Concentration HHI 0.4484 (high); top wallet 61.43% of value."
    ],
    "invalidators": [
      "Rolls up only the wallets you supplied — omitted wallets are excluded, not assumed safe.",
      "Value-weighting means a large balance dominates the score; an equal-weighted view (also returned) can differ sharply.",
      "Wallets without a risk signal are excluded from the weighted risk; supplying their scores can move the verdict."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "aggregation": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Rolled up 5 wallet(s) worth $407000: value-weighted risk 25/100 (medium) → verdict review.",
    "$57000 sits in high/severe-risk wallet(s) (3) — prioritize migrating or de-risking those balances.",
    "high value concentration (HHI 0.4484); top wallet holds 61.43% — single-wallet failure risk.",
    "1 wallet(s) have no risk signal — fetch scores to tighten the rollup."
  ],
  "chain_to": [
    {
      "api": "wallet-risk-bundle",
      "reason": "Produce a per-wallet composite risk score to feed into this rollup.",
      "url": "https://orbis-apis.onrender.com/wallet-risk-bundle"
    },
    {
      "api": "wallet-address-risk",
      "reason": "Fetch an AML/sanctions risk score for any unscored wallet.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "wallet-balance",
      "reason": "Pull current USD value per wallet to populate value_usd.",
      "url": "https://orbis-apis.onrender.com/wallet-balance"
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
