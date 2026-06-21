// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b3-examples.mjs — do not hand-edit.
export const assessExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-21T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "bridge": "ExampleBridge",
  "bridge_type": "lock_mint",
  "source_chain": "ethereum",
  "dest_chain": "arbitrum",
  "amount_usd": 250000,
  "cross_chain": true,
  "liquidity_ratio": 0.125,
  "estimated_slippage_pct": 11.11,
  "liquidity_risk_band": "high",
  "recommended_max_transfer_usd": 100000,
  "bridge_risk_score": 55,
  "risk_band": "high",
  "trust_score": 67,
  "components": [
    {
      "factor": "liquidity_slippage",
      "points": 22,
      "detail": "Transfer is 12.5% of destination liquidity (~11.11% estimated slippage)."
    },
    {
      "factor": "bridge_security_model",
      "points": 18,
      "detail": "\"lock_mint\" bridge security model."
    },
    {
      "factor": "tvl_maturity",
      "points": 15,
      "detail": "Bridge TVL $40000000 — small/less proven."
    },
    {
      "factor": "audit",
      "points": 0,
      "detail": "Bridge marked audited."
    }
  ],
  "verdict": "review",
  "hard_block": false,
  "exploited_before": false,
  "audited": true,
  "reasons": [
    "Transfer is large vs destination liquidity — ~11.11% estimated slippage. Split into smaller transfers.",
    "Low bridge TVL — less battle-tested; higher tail risk."
  ],
  "risk_disclaimer": "Risk assessment over the bridge-transfer params you supplied — not a live liquidity/oracle feed, not financial advice. TVL, liquidity, audit, and exploit facts are trusted as given; omitted facts are scored conservatively. Slippage is an estimate from supplied liquidity, not a quote.",
  "confidence_score": 0.8,
  "confidence_per_section": {
    "assessment": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Assessed a $250000 transfer via ExampleBridge (lock_mint): bridge risk 55/100 (high), trust 67/100 → verdict review.",
    "Estimated ~11.11% slippage; keep transfers at or under ~$100000 (≈5% of liquidity) to minimize it."
  ],
  "chain_to": [
    {
      "api": "cross-chain-bridge",
      "reason": "Look up live bridge routes/quotes to populate dest_liquidity and time-to-finality.",
      "url": "https://orbis-apis.onrender.com/cross-chain-bridge"
    },
    {
      "api": "smart-contract-risk",
      "reason": "Deep-dive the bridge contract for permission/upgradeability risk.",
      "url": "https://orbis-apis.onrender.com/smart-contract-risk"
    },
    {
      "api": "multi-wallet-portfolio-risk-rollup",
      "reason": "Fold cross-chain exposure into the broader portfolio risk view.",
      "url": "https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup"
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
  "bridge": "ExampleBridge",
  "bridge_type": "lock_mint",
  "source_chain": "ethereum",
  "dest_chain": "arbitrum",
  "amount_usd": 250000,
  "cross_chain": true,
  "liquidity_ratio": 0.125,
  "estimated_slippage_pct": 11.11,
  "liquidity_risk_band": "high",
  "recommended_max_transfer_usd": 100000,
  "bridge_risk_score": 55,
  "risk_band": "high",
  "trust_score": 67,
  "components": [
    {
      "factor": "liquidity_slippage",
      "points": 22,
      "detail": "Transfer is 12.5% of destination liquidity (~11.11% estimated slippage)."
    },
    {
      "factor": "bridge_security_model",
      "points": 18,
      "detail": "\"lock_mint\" bridge security model."
    },
    {
      "factor": "tvl_maturity",
      "points": 15,
      "detail": "Bridge TVL $40000000 — small/less proven."
    },
    {
      "factor": "audit",
      "points": 0,
      "detail": "Bridge marked audited."
    }
  ],
  "verdict": "review",
  "hard_block": false,
  "exploited_before": false,
  "audited": true,
  "reasons": [
    "Transfer is large vs destination liquidity — ~11.11% estimated slippage. Split into smaller transfers.",
    "Low bridge TVL — less battle-tested; higher tail risk."
  ],
  "risk_disclaimer": "Risk assessment over the bridge-transfer params you supplied — not a live liquidity/oracle feed, not financial advice. TVL, liquidity, audit, and exploit facts are trusted as given; omitted facts are scored conservatively. Slippage is an estimate from supplied liquidity, not a quote.",
  "reasoning": {
    "why_result_generated": "Scored a $250000 transfer via ExampleBridge; composite bridge risk is 55/100 (high) → verdict review.",
    "key_factors": [
      "liquidity_slippage: +22 — Transfer is 12.5% of destination liquidity (~11.11% estimated slippage).",
      "bridge_security_model: +18 — \"lock_mint\" bridge security model.",
      "tvl_maturity: +15 — Bridge TVL $40000000 — small/less proven.",
      "audit: +0 — Bridge marked audited."
    ],
    "invalidators": [
      "Scores only the params you supplied — without dest_liquidity, slippage is scored conservatively rather than computed.",
      "Slippage is a depth-consumed estimate, not a live quote; the actual route may differ.",
      "Bridge-type and TVL defaults are conservative; supplying accurate facts changes the score."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "assessment": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Assessed a $250000 transfer via ExampleBridge (lock_mint): bridge risk 55/100 (high), trust 67/100 → verdict review.",
    "Estimated ~11.11% slippage; keep transfers at or under ~$100000 (≈5% of liquidity) to minimize it."
  ],
  "chain_to": [
    {
      "api": "cross-chain-bridge",
      "reason": "Look up live bridge routes/quotes to populate dest_liquidity and time-to-finality.",
      "url": "https://orbis-apis.onrender.com/cross-chain-bridge"
    },
    {
      "api": "smart-contract-risk",
      "reason": "Deep-dive the bridge contract for permission/upgradeability risk.",
      "url": "https://orbis-apis.onrender.com/smart-contract-risk"
    },
    {
      "api": "multi-wallet-portfolio-risk-rollup",
      "reason": "Fold cross-chain exposure into the broader portfolio risk view.",
      "url": "https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup"
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
