// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b3-examples.mjs — do not hand-edit.
export const assessExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-21T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "portfolio": "treasury",
  "holding_count": 4,
  "total_stablecoin_usd": 220000,
  "stablecoin_risk_score": 13,
  "risk_band": "low",
  "max_depeg_pct": 15,
  "currently_depegged_count": 1,
  "algorithmic_pct": 4.55,
  "audited_pct": 54.55,
  "unknown_collateral_pct": 0,
  "issuer_concentration": {
    "hhi": 0.3926,
    "band": "moderate",
    "top_issuer": "Circle",
    "top_issuer_share_pct": 54.55
  },
  "collateral_breakdown": [
    {
      "collateral_type": "fiat",
      "amount_usd": 180000,
      "share_pct": 81.82,
      "holding_count": 2
    },
    {
      "collateral_type": "crypto",
      "amount_usd": 30000,
      "share_pct": 13.64,
      "holding_count": 1
    },
    {
      "collateral_type": "algorithmic",
      "amount_usd": 10000,
      "share_pct": 4.55,
      "holding_count": 1
    }
  ],
  "verdict": "block",
  "hard_block": true,
  "holdings": [
    {
      "symbol": "USTC",
      "issuer": "Terra",
      "chain": null,
      "amount_usd": 10000,
      "peg_price": 1,
      "current_price": 0.85,
      "depeg_pct": 15,
      "collateral_type": "algorithmic",
      "attestation": "none",
      "risk_score": 100,
      "risk_band": "severe",
      "reasons": [
        "Severe depeg: trading 15% off the $1 peg.",
        "algorithmic collateral — structurally higher depeg risk.",
        "No reserve attestation/audit disclosed."
      ],
      "value_share_pct": 4.55,
      "weighted_risk_contribution": 4.55
    },
    {
      "symbol": "DAI",
      "issuer": "MakerDAO",
      "chain": null,
      "amount_usd": 30000,
      "peg_price": 1,
      "current_price": 1,
      "depeg_pct": 0,
      "collateral_type": "crypto",
      "attestation": "attested",
      "risk_score": 25,
      "risk_band": "medium",
      "reasons": [
        "At peg with crypto collateral — lower risk."
      ],
      "value_share_pct": 13.64,
      "weighted_risk_contribution": 3.41
    },
    {
      "symbol": "USDC",
      "issuer": "Circle",
      "chain": null,
      "amount_usd": 120000,
      "peg_price": 1,
      "current_price": 1,
      "depeg_pct": 0,
      "collateral_type": "fiat",
      "attestation": "audited",
      "risk_score": 5,
      "risk_band": "low",
      "reasons": [
        "At peg with fiat collateral and audited reserves — lower risk."
      ],
      "value_share_pct": 54.55,
      "weighted_risk_contribution": 2.73
    },
    {
      "symbol": "USDT",
      "issuer": "Tether",
      "chain": null,
      "amount_usd": 60000,
      "peg_price": 1,
      "current_price": 1,
      "depeg_pct": 0,
      "collateral_type": "fiat",
      "attestation": "attested",
      "risk_score": 10,
      "risk_band": "low",
      "reasons": [
        "At peg with fiat collateral — lower risk."
      ],
      "value_share_pct": 27.27,
      "weighted_risk_contribution": 2.73
    }
  ],
  "highest_risk_holdings": [
    {
      "symbol": "USTC",
      "issuer": "Terra",
      "chain": null,
      "amount_usd": 10000,
      "peg_price": 1,
      "current_price": 0.85,
      "depeg_pct": 15,
      "collateral_type": "algorithmic",
      "attestation": "none",
      "risk_score": 100,
      "risk_band": "severe",
      "reasons": [
        "Severe depeg: trading 15% off the $1 peg.",
        "algorithmic collateral — structurally higher depeg risk.",
        "No reserve attestation/audit disclosed."
      ],
      "value_share_pct": 4.55,
      "weighted_risk_contribution": 4.55
    }
  ],
  "risk_disclaimer": "Risk assessment over the stablecoin holdings you supplied — not a live price/oracle feed, not financial advice. Prices and collateral facts are trusted as given; if you omit current_price a holding is assumed at peg. A depeg that happens after your snapshot is not reflected.",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "assessment": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Assessed 4 stablecoin holdings ($220000): risk 13/100 (low) → verdict block.",
    "A holding is 15% off peg — treat as a live depeg event; reduce exposure immediately.",
    "4.55% of stablecoin value is algorithmic/undercollateralized — the highest structural depeg risk.",
    "moderate issuer concentration; Circle is 54.55% — single-issuer dependency. Diversify issuers."
  ],
  "chain_to": [
    {
      "api": "multi-wallet-portfolio-risk-rollup",
      "reason": "Roll this stablecoin sleeve up with the rest of the wallet fleet for a portfolio-level verdict.",
      "url": "https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup"
    },
    {
      "api": "portfolio-yield-exposure",
      "reason": "If these stablecoins are deployed into yield, assess the protocol/APY risk on top.",
      "url": "https://orbis-apis.onrender.com/portfolio-yield-exposure"
    },
    {
      "api": "token-price-feed",
      "reason": "Pull live prices to populate current_price for an up-to-date depeg read.",
      "url": "https://orbis-apis.onrender.com/token-price-feed"
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
  "portfolio": "treasury",
  "holding_count": 4,
  "total_stablecoin_usd": 220000,
  "stablecoin_risk_score": 13,
  "risk_band": "low",
  "max_depeg_pct": 15,
  "currently_depegged_count": 1,
  "algorithmic_pct": 4.55,
  "audited_pct": 54.55,
  "unknown_collateral_pct": 0,
  "issuer_concentration": {
    "hhi": 0.3926,
    "band": "moderate",
    "top_issuer": "Circle",
    "top_issuer_share_pct": 54.55
  },
  "collateral_breakdown": [
    {
      "collateral_type": "fiat",
      "amount_usd": 180000,
      "share_pct": 81.82,
      "holding_count": 2
    },
    {
      "collateral_type": "crypto",
      "amount_usd": 30000,
      "share_pct": 13.64,
      "holding_count": 1
    },
    {
      "collateral_type": "algorithmic",
      "amount_usd": 10000,
      "share_pct": 4.55,
      "holding_count": 1
    }
  ],
  "verdict": "block",
  "hard_block": true,
  "holdings": [
    {
      "symbol": "USTC",
      "issuer": "Terra",
      "chain": null,
      "amount_usd": 10000,
      "peg_price": 1,
      "current_price": 0.85,
      "depeg_pct": 15,
      "collateral_type": "algorithmic",
      "attestation": "none",
      "risk_score": 100,
      "risk_band": "severe",
      "reasons": [
        "Severe depeg: trading 15% off the $1 peg.",
        "algorithmic collateral — structurally higher depeg risk.",
        "No reserve attestation/audit disclosed."
      ],
      "value_share_pct": 4.55,
      "weighted_risk_contribution": 4.55
    },
    {
      "symbol": "DAI",
      "issuer": "MakerDAO",
      "chain": null,
      "amount_usd": 30000,
      "peg_price": 1,
      "current_price": 1,
      "depeg_pct": 0,
      "collateral_type": "crypto",
      "attestation": "attested",
      "risk_score": 25,
      "risk_band": "medium",
      "reasons": [
        "At peg with crypto collateral — lower risk."
      ],
      "value_share_pct": 13.64,
      "weighted_risk_contribution": 3.41
    },
    {
      "symbol": "USDC",
      "issuer": "Circle",
      "chain": null,
      "amount_usd": 120000,
      "peg_price": 1,
      "current_price": 1,
      "depeg_pct": 0,
      "collateral_type": "fiat",
      "attestation": "audited",
      "risk_score": 5,
      "risk_band": "low",
      "reasons": [
        "At peg with fiat collateral and audited reserves — lower risk."
      ],
      "value_share_pct": 54.55,
      "weighted_risk_contribution": 2.73
    },
    {
      "symbol": "USDT",
      "issuer": "Tether",
      "chain": null,
      "amount_usd": 60000,
      "peg_price": 1,
      "current_price": 1,
      "depeg_pct": 0,
      "collateral_type": "fiat",
      "attestation": "attested",
      "risk_score": 10,
      "risk_band": "low",
      "reasons": [
        "At peg with fiat collateral — lower risk."
      ],
      "value_share_pct": 27.27,
      "weighted_risk_contribution": 2.73
    }
  ],
  "highest_risk_holdings": [
    {
      "symbol": "USTC",
      "issuer": "Terra",
      "chain": null,
      "amount_usd": 10000,
      "peg_price": 1,
      "current_price": 0.85,
      "depeg_pct": 15,
      "collateral_type": "algorithmic",
      "attestation": "none",
      "risk_score": 100,
      "risk_band": "severe",
      "reasons": [
        "Severe depeg: trading 15% off the $1 peg.",
        "algorithmic collateral — structurally higher depeg risk.",
        "No reserve attestation/audit disclosed."
      ],
      "value_share_pct": 4.55,
      "weighted_risk_contribution": 4.55
    }
  ],
  "risk_disclaimer": "Risk assessment over the stablecoin holdings you supplied — not a live price/oracle feed, not financial advice. Prices and collateral facts are trusted as given; if you omit current_price a holding is assumed at peg. A depeg that happens after your snapshot is not reflected.",
  "reasoning": {
    "why_result_generated": "Assessed 4 stablecoin holdings; value-weighted risk is 13/100 (low) → verdict block via depeg hard-block override.",
    "key_factors": [
      "Total stablecoin value $220000; max depeg 15%; 1 holding(s) off peg.",
      "Algorithmic/undercollateralized 4.55%; audited reserves 54.55%; unknown collateral 0%.",
      "Issuer concentration HHI 0.3926 (moderate); top issuer Circle 54.55%."
    ],
    "invalidators": [
      "Scores only the holdings you supplied with the prices you supplied — omit current_price and a holding is assumed at peg.",
      "Collateral/attestation defaults are conservative; supplying accurate facts changes the score.",
      "A depeg after your snapshot is not reflected; re-assess with fresh prices for a live read."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "assessment": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Assessed 4 stablecoin holdings ($220000): risk 13/100 (low) → verdict block.",
    "A holding is 15% off peg — treat as a live depeg event; reduce exposure immediately.",
    "4.55% of stablecoin value is algorithmic/undercollateralized — the highest structural depeg risk.",
    "moderate issuer concentration; Circle is 54.55% — single-issuer dependency. Diversify issuers."
  ],
  "chain_to": [
    {
      "api": "multi-wallet-portfolio-risk-rollup",
      "reason": "Roll this stablecoin sleeve up with the rest of the wallet fleet for a portfolio-level verdict.",
      "url": "https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup"
    },
    {
      "api": "portfolio-yield-exposure",
      "reason": "If these stablecoins are deployed into yield, assess the protocol/APY risk on top.",
      "url": "https://orbis-apis.onrender.com/portfolio-yield-exposure"
    },
    {
      "api": "token-price-feed",
      "reason": "Pull live prices to populate current_price for an up-to-date depeg read.",
      "url": "https://orbis-apis.onrender.com/token-price-feed"
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
