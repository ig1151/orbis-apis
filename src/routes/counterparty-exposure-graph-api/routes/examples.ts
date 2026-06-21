// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b2-examples.mjs — do not hand-edit.
export const analyzeExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-19T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "subject": "0xsubject",
  "total_counterparties": 4,
  "total_gross_volume_usd": 106500,
  "total_inflow_usd": 63000,
  "total_outflow_usd": 43500,
  "net_flow_usd": 19500,
  "concentration": {
    "hhi": 0.5021,
    "band": "high",
    "top_counterparty_share_pct": 65.73,
    "top3_share_pct": 98.59
  },
  "flagged_exposure_pct": 1.41,
  "sanctioned_exposure_pct": 0,
  "mixer_exposure_pct": 7.51,
  "category_breakdown": [
    {
      "category": "cex",
      "gross_volume_usd": 70000,
      "share_pct": 65.73,
      "counterparty_count": 1
    },
    {
      "category": "defi",
      "gross_volume_usd": 27000,
      "share_pct": 25.35,
      "counterparty_count": 1
    },
    {
      "category": "mixer",
      "gross_volume_usd": 8000,
      "share_pct": 7.51,
      "counterparty_count": 1
    },
    {
      "category": "unknown",
      "gross_volume_usd": 1500,
      "share_pct": 1.41,
      "counterparty_count": 1
    }
  ],
  "risk_weighted_exposure_score": 25,
  "exposure_band": "medium",
  "verdict": "review",
  "hard_block": false,
  "counterparties": [
    {
      "label": "Binance Hot Wallet",
      "address": "0xbnb",
      "category": "cex",
      "gross_volume_usd": 70000,
      "inflow_usd": 50000,
      "outflow_usd": 20000,
      "net_flow_usd": 30000,
      "tx_count": 42,
      "risk_score": 15,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 65.73,
      "weighted_risk_contribution": 9.86
    },
    {
      "label": "Uniswap Router",
      "address": "0xuni",
      "category": "defi",
      "gross_volume_usd": 27000,
      "inflow_usd": 12000,
      "outflow_usd": 15000,
      "net_flow_usd": -3000,
      "tx_count": 30,
      "risk_score": 30,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 25.35,
      "weighted_risk_contribution": 7.61
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "gross_volume_usd": 8000,
      "inflow_usd": 0,
      "outflow_usd": 8000,
      "net_flow_usd": -8000,
      "tx_count": 3,
      "risk_score": 90,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Mixer/tumbler counterparty — obscures fund provenance.",
        "High-risk category \"mixer\" (no explicit score supplied)."
      ],
      "exposure_pct": 7.51,
      "weighted_risk_contribution": 6.76
    },
    {
      "label": "Suspicious EOA",
      "address": "0xeoa",
      "category": "unknown",
      "gross_volume_usd": 1500,
      "inflow_usd": 1000,
      "outflow_usd": 500,
      "net_flow_usd": 500,
      "tx_count": 5,
      "risk_score": 90,
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "reasons": [
        "Flagged/blocklisted counterparty — treat exposure as high risk."
      ],
      "exposure_pct": 1.41,
      "weighted_risk_contribution": 1.27
    }
  ],
  "top_counterparties": [
    {
      "label": "Binance Hot Wallet",
      "address": "0xbnb",
      "category": "cex",
      "gross_volume_usd": 70000,
      "inflow_usd": 50000,
      "outflow_usd": 20000,
      "net_flow_usd": 30000,
      "tx_count": 42,
      "risk_score": 15,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 65.73,
      "weighted_risk_contribution": 9.86
    },
    {
      "label": "Uniswap Router",
      "address": "0xuni",
      "category": "defi",
      "gross_volume_usd": 27000,
      "inflow_usd": 12000,
      "outflow_usd": 15000,
      "net_flow_usd": -3000,
      "tx_count": 30,
      "risk_score": 30,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 25.35,
      "weighted_risk_contribution": 7.61
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "gross_volume_usd": 8000,
      "inflow_usd": 0,
      "outflow_usd": 8000,
      "net_flow_usd": -8000,
      "tx_count": 3,
      "risk_score": 90,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Mixer/tumbler counterparty — obscures fund provenance.",
        "High-risk category \"mixer\" (no explicit score supplied)."
      ],
      "exposure_pct": 7.51,
      "weighted_risk_contribution": 6.76
    },
    {
      "label": "Suspicious EOA",
      "address": "0xeoa",
      "category": "unknown",
      "gross_volume_usd": 1500,
      "inflow_usd": 1000,
      "outflow_usd": 500,
      "net_flow_usd": 500,
      "tx_count": 5,
      "risk_score": 90,
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "reasons": [
        "Flagged/blocklisted counterparty — treat exposure as high risk."
      ],
      "exposure_pct": 1.41,
      "weighted_risk_contribution": 1.27
    }
  ],
  "flagged_counterparties": [
    {
      "label": "Suspicious EOA",
      "address": "0xeoa",
      "category": "unknown",
      "gross_volume_usd": 1500,
      "inflow_usd": 1000,
      "outflow_usd": 500,
      "net_flow_usd": 500,
      "tx_count": 5,
      "risk_score": 90,
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "reasons": [
        "Flagged/blocklisted counterparty — treat exposure as high risk."
      ],
      "exposure_pct": 1.41,
      "weighted_risk_contribution": 1.27
    }
  ],
  "risk_disclaimer": "Volume-weighted exposure analysis over the counterparties you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; missing or mislabeled counterparties change the result. A wallet you did not supply is excluded, not assumed safe.",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "graph": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Analyzed 4 counterparties over $106500 gross volume: risk-weighted exposure 25/100 (medium) → verdict review.",
    "7.51% of volume touches mixer/tumbler counterparties — document provenance before transacting.",
    "1.41% of volume is with flagged counterparties — review the 1 flagged edge(s).",
    "high concentration (HHI 0.5021); top counterparty is 65.73% of volume — single-counterparty dependency risk."
  ],
  "chain_to": [
    {
      "api": "wallet-risk-bundle",
      "reason": "Fold this counterparty exposure into a single wallet trust verdict alongside address risk, approvals, and reputation.",
      "url": "https://orbis-apis.onrender.com/wallet-risk-bundle"
    },
    {
      "api": "wallet-address-risk",
      "reason": "Score an individual flagged counterparty address against on-chain/label sources.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "token-approval-risk-scanner",
      "reason": "Check whether risky counterparties also hold token approvals that could drain the wallet.",
      "url": "https://orbis-apis.onrender.com/token-approval-risk-scanner"
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
  "subject": "0xsubject",
  "total_counterparties": 4,
  "total_gross_volume_usd": 106500,
  "total_inflow_usd": 63000,
  "total_outflow_usd": 43500,
  "net_flow_usd": 19500,
  "concentration": {
    "hhi": 0.5021,
    "band": "high",
    "top_counterparty_share_pct": 65.73,
    "top3_share_pct": 98.59
  },
  "flagged_exposure_pct": 1.41,
  "sanctioned_exposure_pct": 0,
  "mixer_exposure_pct": 7.51,
  "category_breakdown": [
    {
      "category": "cex",
      "gross_volume_usd": 70000,
      "share_pct": 65.73,
      "counterparty_count": 1
    },
    {
      "category": "defi",
      "gross_volume_usd": 27000,
      "share_pct": 25.35,
      "counterparty_count": 1
    },
    {
      "category": "mixer",
      "gross_volume_usd": 8000,
      "share_pct": 7.51,
      "counterparty_count": 1
    },
    {
      "category": "unknown",
      "gross_volume_usd": 1500,
      "share_pct": 1.41,
      "counterparty_count": 1
    }
  ],
  "risk_weighted_exposure_score": 25,
  "exposure_band": "medium",
  "verdict": "review",
  "hard_block": false,
  "counterparties": [
    {
      "label": "Binance Hot Wallet",
      "address": "0xbnb",
      "category": "cex",
      "gross_volume_usd": 70000,
      "inflow_usd": 50000,
      "outflow_usd": 20000,
      "net_flow_usd": 30000,
      "tx_count": 42,
      "risk_score": 15,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 65.73,
      "weighted_risk_contribution": 9.86
    },
    {
      "label": "Uniswap Router",
      "address": "0xuni",
      "category": "defi",
      "gross_volume_usd": 27000,
      "inflow_usd": 12000,
      "outflow_usd": 15000,
      "net_flow_usd": -3000,
      "tx_count": 30,
      "risk_score": 30,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 25.35,
      "weighted_risk_contribution": 7.61
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "gross_volume_usd": 8000,
      "inflow_usd": 0,
      "outflow_usd": 8000,
      "net_flow_usd": -8000,
      "tx_count": 3,
      "risk_score": 90,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Mixer/tumbler counterparty — obscures fund provenance.",
        "High-risk category \"mixer\" (no explicit score supplied)."
      ],
      "exposure_pct": 7.51,
      "weighted_risk_contribution": 6.76
    },
    {
      "label": "Suspicious EOA",
      "address": "0xeoa",
      "category": "unknown",
      "gross_volume_usd": 1500,
      "inflow_usd": 1000,
      "outflow_usd": 500,
      "net_flow_usd": 500,
      "tx_count": 5,
      "risk_score": 90,
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "reasons": [
        "Flagged/blocklisted counterparty — treat exposure as high risk."
      ],
      "exposure_pct": 1.41,
      "weighted_risk_contribution": 1.27
    }
  ],
  "top_counterparties": [
    {
      "label": "Binance Hot Wallet",
      "address": "0xbnb",
      "category": "cex",
      "gross_volume_usd": 70000,
      "inflow_usd": 50000,
      "outflow_usd": 20000,
      "net_flow_usd": 30000,
      "tx_count": 42,
      "risk_score": 15,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 65.73,
      "weighted_risk_contribution": 9.86
    },
    {
      "label": "Uniswap Router",
      "address": "0xuni",
      "category": "defi",
      "gross_volume_usd": 27000,
      "inflow_usd": 12000,
      "outflow_usd": 15000,
      "net_flow_usd": -3000,
      "tx_count": 30,
      "risk_score": 30,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk counterparty by the supplied evidence."
      ],
      "exposure_pct": 25.35,
      "weighted_risk_contribution": 7.61
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "gross_volume_usd": 8000,
      "inflow_usd": 0,
      "outflow_usd": 8000,
      "net_flow_usd": -8000,
      "tx_count": 3,
      "risk_score": 90,
      "risk_source": "category",
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Mixer/tumbler counterparty — obscures fund provenance.",
        "High-risk category \"mixer\" (no explicit score supplied)."
      ],
      "exposure_pct": 7.51,
      "weighted_risk_contribution": 6.76
    },
    {
      "label": "Suspicious EOA",
      "address": "0xeoa",
      "category": "unknown",
      "gross_volume_usd": 1500,
      "inflow_usd": 1000,
      "outflow_usd": 500,
      "net_flow_usd": 500,
      "tx_count": 5,
      "risk_score": 90,
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "reasons": [
        "Flagged/blocklisted counterparty — treat exposure as high risk."
      ],
      "exposure_pct": 1.41,
      "weighted_risk_contribution": 1.27
    }
  ],
  "flagged_counterparties": [
    {
      "label": "Suspicious EOA",
      "address": "0xeoa",
      "category": "unknown",
      "gross_volume_usd": 1500,
      "inflow_usd": 1000,
      "outflow_usd": 500,
      "net_flow_usd": 500,
      "tx_count": 5,
      "risk_score": 90,
      "risk_source": "flagged",
      "flagged": true,
      "sanctioned": false,
      "reasons": [
        "Flagged/blocklisted counterparty — treat exposure as high risk."
      ],
      "exposure_pct": 1.41,
      "weighted_risk_contribution": 1.27
    }
  ],
  "risk_disclaimer": "Volume-weighted exposure analysis over the counterparties you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; missing or mislabeled counterparties change the result. A wallet you did not supply is excluded, not assumed safe.",
  "reasoning": {
    "why_result_generated": "Built an exposure graph over 4 counterparties; volume-weighted counterparty risk is 25/100 (medium) → verdict review.",
    "key_factors": [
      "Total gross volume $106500 across 4 counterparties.",
      "Concentration HHI 0.5021 (high); top counterparty 65.73% of volume.",
      "Flagged exposure 1.41%, sanctioned 0%, mixer 7.51%.",
      "1 flagged/sanctioned counterparty(ies)."
    ],
    "invalidators": [
      "Analyzes only the counterparties you supplied — it does not query the chain to find omitted edges.",
      "Counterparties scored by category default (no explicit risk_score) are opinionated; supplying real scores changes the weighting.",
      "A counterparty flagged after your snapshot would not be reflected; re-analyze against fresh labels."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "graph": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Analyzed 4 counterparties over $106500 gross volume: risk-weighted exposure 25/100 (medium) → verdict review.",
    "7.51% of volume touches mixer/tumbler counterparties — document provenance before transacting.",
    "1.41% of volume is with flagged counterparties — review the 1 flagged edge(s).",
    "high concentration (HHI 0.5021); top counterparty is 65.73% of volume — single-counterparty dependency risk."
  ],
  "chain_to": [
    {
      "api": "wallet-risk-bundle",
      "reason": "Fold this counterparty exposure into a single wallet trust verdict alongside address risk, approvals, and reputation.",
      "url": "https://orbis-apis.onrender.com/wallet-risk-bundle"
    },
    {
      "api": "wallet-address-risk",
      "reason": "Score an individual flagged counterparty address against on-chain/label sources.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "token-approval-risk-scanner",
      "reason": "Check whether risky counterparties also hold token approvals that could drain the wallet.",
      "url": "https://orbis-apis.onrender.com/token-approval-risk-scanner"
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
