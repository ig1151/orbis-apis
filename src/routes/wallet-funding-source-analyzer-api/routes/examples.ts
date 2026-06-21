// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b3-examples.mjs — do not hand-edit.
export const analyzeExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-21T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "wallet": "0xsubject",
  "source_count": 4,
  "funded_total_usd": 91000,
  "funding_risk_score": 23,
  "funding_risk_band": "low",
  "kyc_coverage_pct": 65.93,
  "full_kyc_pct": 65.93,
  "unknown_source_pct": 4.4,
  "mixer_funding_pct": 9.89,
  "flagged_funding_pct": 0,
  "sanctioned_funding_pct": 0,
  "concentration": {
    "hhi": 0.4856,
    "band": "high",
    "top_source_share_pct": 65.93,
    "top3_share_pct": 95.6
  },
  "category_breakdown": [
    {
      "category": "cex",
      "amount_usd": 60000,
      "share_pct": 65.93,
      "source_count": 1
    },
    {
      "category": "dex",
      "amount_usd": 18000,
      "share_pct": 19.78,
      "source_count": 1
    },
    {
      "category": "mixer",
      "amount_usd": 9000,
      "share_pct": 9.89,
      "source_count": 1
    },
    {
      "category": "unknown",
      "amount_usd": 4000,
      "share_pct": 4.4,
      "source_count": 1
    }
  ],
  "verdict": "review",
  "hard_block": false,
  "sources": [
    {
      "label": "Coinbase",
      "address": "0xcb",
      "category": "cex",
      "amount_usd": 60000,
      "kyc_level": "full",
      "risk_score": 9,
      "risk_source": "category",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Full-KYC source — provenance risk discounted."
      ],
      "funding_share_pct": 65.93,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Uniswap",
      "address": "0xuni",
      "category": "dex",
      "amount_usd": 18000,
      "kyc_level": "unknown",
      "risk_score": 30,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk funding source by the supplied evidence."
      ],
      "funding_share_pct": 19.78,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "amount_usd": 9000,
      "kyc_level": "unknown",
      "risk_score": 90,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Funds originate from a mixer/tumbler — provenance is obscured."
      ],
      "funding_share_pct": 9.89,
      "weighted_risk_contribution": 8.9
    },
    {
      "label": "Unknown EOA",
      "address": "0xeoa",
      "category": "unknown",
      "amount_usd": 4000,
      "kyc_level": "none",
      "risk_score": 53,
      "risk_source": "default",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Unknown source with no risk score — scored at the neutral-unknown default.",
        "No-KYC source — provenance risk nudged up."
      ],
      "funding_share_pct": 4.4,
      "weighted_risk_contribution": 2.33
    }
  ],
  "top_sources": [
    {
      "label": "Coinbase",
      "address": "0xcb",
      "category": "cex",
      "amount_usd": 60000,
      "kyc_level": "full",
      "risk_score": 9,
      "risk_source": "category",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Full-KYC source — provenance risk discounted."
      ],
      "funding_share_pct": 65.93,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Uniswap",
      "address": "0xuni",
      "category": "dex",
      "amount_usd": 18000,
      "kyc_level": "unknown",
      "risk_score": 30,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk funding source by the supplied evidence."
      ],
      "funding_share_pct": 19.78,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "amount_usd": 9000,
      "kyc_level": "unknown",
      "risk_score": 90,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Funds originate from a mixer/tumbler — provenance is obscured."
      ],
      "funding_share_pct": 9.89,
      "weighted_risk_contribution": 8.9
    },
    {
      "label": "Unknown EOA",
      "address": "0xeoa",
      "category": "unknown",
      "amount_usd": 4000,
      "kyc_level": "none",
      "risk_score": 53,
      "risk_source": "default",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Unknown source with no risk score — scored at the neutral-unknown default.",
        "No-KYC source — provenance risk nudged up."
      ],
      "funding_share_pct": 4.4,
      "weighted_risk_contribution": 2.33
    }
  ],
  "high_risk_sources": [
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "amount_usd": 9000,
      "kyc_level": "unknown",
      "risk_score": 90,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Funds originate from a mixer/tumbler — provenance is obscured."
      ],
      "funding_share_pct": 9.89,
      "weighted_risk_contribution": 8.9
    },
    {
      "label": "Unknown EOA",
      "address": "0xeoa",
      "category": "unknown",
      "amount_usd": 4000,
      "kyc_level": "none",
      "risk_score": 53,
      "risk_source": "default",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Unknown source with no risk score — scored at the neutral-unknown default.",
        "No-KYC source — provenance risk nudged up."
      ],
      "funding_share_pct": 4.4,
      "weighted_risk_contribution": 2.33
    }
  ],
  "risk_disclaimer": "Provenance analysis over the funding sources you supplied — not on-chain tracing, not financial/compliance advice. Inputs are trusted as given; a source you omit is excluded, not assumed clean. Funds from a source you did not supply are unaccounted for, not assumed legitimate.",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "provenance": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Analyzed 4 funding sources ($91000): funding risk 23/100 (low) → verdict review.",
    "9.89% of funds came from mixers/tumblers — document provenance before treating the balance as clean."
  ],
  "chain_to": [
    {
      "api": "wallet-address-risk",
      "reason": "Score an individual flagged or unknown funding source address against AML/sanctions sources.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "counterparty-exposure-graph",
      "reason": "Combine funding-side provenance with the outbound counterparty exposure for a full picture.",
      "url": "https://orbis-apis.onrender.com/counterparty-exposure-graph"
    },
    {
      "api": "wallet-risk-bundle",
      "reason": "Fold funding-source risk into a single wallet trust verdict.",
      "url": "https://orbis-apis.onrender.com/wallet-risk-bundle"
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
  "wallet": "0xsubject",
  "source_count": 4,
  "funded_total_usd": 91000,
  "funding_risk_score": 23,
  "funding_risk_band": "low",
  "kyc_coverage_pct": 65.93,
  "full_kyc_pct": 65.93,
  "unknown_source_pct": 4.4,
  "mixer_funding_pct": 9.89,
  "flagged_funding_pct": 0,
  "sanctioned_funding_pct": 0,
  "concentration": {
    "hhi": 0.4856,
    "band": "high",
    "top_source_share_pct": 65.93,
    "top3_share_pct": 95.6
  },
  "category_breakdown": [
    {
      "category": "cex",
      "amount_usd": 60000,
      "share_pct": 65.93,
      "source_count": 1
    },
    {
      "category": "dex",
      "amount_usd": 18000,
      "share_pct": 19.78,
      "source_count": 1
    },
    {
      "category": "mixer",
      "amount_usd": 9000,
      "share_pct": 9.89,
      "source_count": 1
    },
    {
      "category": "unknown",
      "amount_usd": 4000,
      "share_pct": 4.4,
      "source_count": 1
    }
  ],
  "verdict": "review",
  "hard_block": false,
  "sources": [
    {
      "label": "Coinbase",
      "address": "0xcb",
      "category": "cex",
      "amount_usd": 60000,
      "kyc_level": "full",
      "risk_score": 9,
      "risk_source": "category",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Full-KYC source — provenance risk discounted."
      ],
      "funding_share_pct": 65.93,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Uniswap",
      "address": "0xuni",
      "category": "dex",
      "amount_usd": 18000,
      "kyc_level": "unknown",
      "risk_score": 30,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk funding source by the supplied evidence."
      ],
      "funding_share_pct": 19.78,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "amount_usd": 9000,
      "kyc_level": "unknown",
      "risk_score": 90,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Funds originate from a mixer/tumbler — provenance is obscured."
      ],
      "funding_share_pct": 9.89,
      "weighted_risk_contribution": 8.9
    },
    {
      "label": "Unknown EOA",
      "address": "0xeoa",
      "category": "unknown",
      "amount_usd": 4000,
      "kyc_level": "none",
      "risk_score": 53,
      "risk_source": "default",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Unknown source with no risk score — scored at the neutral-unknown default.",
        "No-KYC source — provenance risk nudged up."
      ],
      "funding_share_pct": 4.4,
      "weighted_risk_contribution": 2.33
    }
  ],
  "top_sources": [
    {
      "label": "Coinbase",
      "address": "0xcb",
      "category": "cex",
      "amount_usd": 60000,
      "kyc_level": "full",
      "risk_score": 9,
      "risk_source": "category",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Full-KYC source — provenance risk discounted."
      ],
      "funding_share_pct": 65.93,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Uniswap",
      "address": "0xuni",
      "category": "dex",
      "amount_usd": 18000,
      "kyc_level": "unknown",
      "risk_score": 30,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Lower-risk funding source by the supplied evidence."
      ],
      "funding_share_pct": 19.78,
      "weighted_risk_contribution": 5.93
    },
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "amount_usd": 9000,
      "kyc_level": "unknown",
      "risk_score": 90,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Funds originate from a mixer/tumbler — provenance is obscured."
      ],
      "funding_share_pct": 9.89,
      "weighted_risk_contribution": 8.9
    },
    {
      "label": "Unknown EOA",
      "address": "0xeoa",
      "category": "unknown",
      "amount_usd": 4000,
      "kyc_level": "none",
      "risk_score": 53,
      "risk_source": "default",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Unknown source with no risk score — scored at the neutral-unknown default.",
        "No-KYC source — provenance risk nudged up."
      ],
      "funding_share_pct": 4.4,
      "weighted_risk_contribution": 2.33
    }
  ],
  "high_risk_sources": [
    {
      "label": "Tornado Cash",
      "address": "0xtc",
      "category": "mixer",
      "amount_usd": 9000,
      "kyc_level": "unknown",
      "risk_score": 90,
      "risk_source": "category",
      "kyc_adjusted": false,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Funds originate from a mixer/tumbler — provenance is obscured."
      ],
      "funding_share_pct": 9.89,
      "weighted_risk_contribution": 8.9
    },
    {
      "label": "Unknown EOA",
      "address": "0xeoa",
      "category": "unknown",
      "amount_usd": 4000,
      "kyc_level": "none",
      "risk_score": 53,
      "risk_source": "default",
      "kyc_adjusted": true,
      "flagged": false,
      "sanctioned": false,
      "reasons": [
        "Unknown source with no risk score — scored at the neutral-unknown default.",
        "No-KYC source — provenance risk nudged up."
      ],
      "funding_share_pct": 4.4,
      "weighted_risk_contribution": 2.33
    }
  ],
  "risk_disclaimer": "Provenance analysis over the funding sources you supplied — not on-chain tracing, not financial/compliance advice. Inputs are trusted as given; a source you omit is excluded, not assumed clean. Funds from a source you did not supply are unaccounted for, not assumed legitimate.",
  "reasoning": {
    "why_result_generated": "Scored provenance over 4 funding sources; value-weighted funding risk is 23/100 (low) → verdict review.",
    "key_factors": [
      "Funded total $91000 across 4 sources.",
      "KYC coverage 65.93% (full 65.93%); unknown-provenance 4.4%.",
      "Mixer funding 9.89%, flagged 0%, sanctioned 0%.",
      "Source concentration HHI 0.4856 (high); top source 65.93%."
    ],
    "invalidators": [
      "Analyzes only the funding sources you supplied — funds from omitted sources are unaccounted for, not assumed clean.",
      "Category-default scoring is opinionated; supplying real risk scores or KYC levels changes the weighting.",
      "A source flagged after your snapshot would not be reflected; re-analyze against fresh labels."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "provenance": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Analyzed 4 funding sources ($91000): funding risk 23/100 (low) → verdict review.",
    "9.89% of funds came from mixers/tumblers — document provenance before treating the balance as clean."
  ],
  "chain_to": [
    {
      "api": "wallet-address-risk",
      "reason": "Score an individual flagged or unknown funding source address against AML/sanctions sources.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "counterparty-exposure-graph",
      "reason": "Combine funding-side provenance with the outbound counterparty exposure for a full picture.",
      "url": "https://orbis-apis.onrender.com/counterparty-exposure-graph"
    },
    {
      "api": "wallet-risk-bundle",
      "reason": "Fold funding-source risk into a single wallet trust verdict.",
      "url": "https://orbis-apis.onrender.com/wallet-risk-bundle"
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
