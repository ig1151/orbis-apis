// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b3-examples.mjs — do not hand-edit.
export const detectExample: any = {
  "trace_id": "wrp-1780000000000",
  "request_id": "wrp-1780000000000",
  "computed_at": "2026-06-21T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "wallet": "0xsubject",
  "transaction_count": 5,
  "scored_transaction_count": 5,
  "time_ordered": true,
  "total_volume_usd": 56750,
  "inflow_usd": 28500,
  "outflow_usd": 28250,
  "structuring_threshold_usd": 10000,
  "layering_window_minutes": 60,
  "patterns": {
    "structuring": {
      "detected": true,
      "severity": 50,
      "band": "high",
      "count": 3,
      "detail": "3 transaction(s) sit in the structuring band ($6000–$10000), just under the $10000 reporting threshold.",
      "evidence_tx_indices": [
        0,
        1,
        2
      ]
    },
    "layering": {
      "detected": true,
      "severity": 63,
      "band": "high",
      "count": 3,
      "detail": "3 inflow(s) had ≥80% of value forwarded out within 60 min — classic layering / pass-through.",
      "evidence_tx_indices": [
        0,
        1,
        2
      ]
    },
    "high_velocity": {
      "detected": false,
      "severity": 0,
      "band": "low",
      "count": 4,
      "detail": "Peak of 4 transaction(s) within a single 1-hour window.",
      "evidence_tx_indices": []
    },
    "round_tripping": {
      "detected": false,
      "severity": 0,
      "band": "low",
      "count": 0,
      "detail": "No round-tripping (no counterparty with near-equal in/out flow).",
      "evidence_tx_indices": []
    },
    "amount_anomaly": {
      "detected": false,
      "severity": 0,
      "band": "low",
      "count": 2.95,
      "detail": "Largest transaction ($28000) is 2.95× the median ($9500).",
      "evidence_tx_indices": []
    }
  },
  "patterns_detected": [
    "structuring",
    "layering"
  ],
  "aml_pattern_score": 69,
  "pattern_band": "high",
  "verdict": "review",
  "hard_block": false,
  "flagged_counterparty_count": 0,
  "sanctioned_counterparty_involved": false,
  "reasons": [
    "structuring pattern detected: 3 transaction(s) sit in the structuring band ($6000–$10000), just under the $10000 reporting threshold.",
    "layering pattern detected: 3 inflow(s) had ≥80% of value forwarded out within 60 min — classic layering / pass-through."
  ],
  "risk_disclaimer": "Pattern detection over the transactions you supplied — not on-chain analysis, not a Suspicious Activity Report or legal/compliance determination. Inputs are trusted as given; a transaction you omit is excluded, not assumed clean. Patterns are heuristics that warrant review, not proof of illicit activity.",
  "confidence_score": 0.8,
  "confidence_per_section": {
    "detection": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Analyzed 5 transactions ($56750 volume): AML pattern score 69/100 (high) → verdict review.",
    "Structuring: 3 transaction(s) sit in the structuring band ($6000–$10000), just under the $10000 reporting threshold. Aggregate the related transfers and review intent.",
    "Layering: 3 inflow(s) had ≥80% of value forwarded out within 60 min — classic layering / pass-through. Trace the forwarded funds to their destinations."
  ],
  "chain_to": [
    {
      "api": "counterparty-exposure-graph",
      "reason": "Score the counterparties these transactions touch into a volume-weighted exposure graph.",
      "url": "https://orbis-apis.onrender.com/counterparty-exposure-graph"
    },
    {
      "api": "wallet-address-risk",
      "reason": "Check whether a counterparty address in a flagged transaction is itself high-risk.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "wallet-risk-bundle",
      "reason": "Fold the AML pattern score into a single wallet trust verdict.",
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
  "transaction_count": 5,
  "scored_transaction_count": 5,
  "time_ordered": true,
  "total_volume_usd": 56750,
  "inflow_usd": 28500,
  "outflow_usd": 28250,
  "structuring_threshold_usd": 10000,
  "layering_window_minutes": 60,
  "patterns": {
    "structuring": {
      "detected": true,
      "severity": 50,
      "band": "high",
      "count": 3,
      "detail": "3 transaction(s) sit in the structuring band ($6000–$10000), just under the $10000 reporting threshold.",
      "evidence_tx_indices": [
        0,
        1,
        2
      ]
    },
    "layering": {
      "detected": true,
      "severity": 63,
      "band": "high",
      "count": 3,
      "detail": "3 inflow(s) had ≥80% of value forwarded out within 60 min — classic layering / pass-through.",
      "evidence_tx_indices": [
        0,
        1,
        2
      ]
    },
    "high_velocity": {
      "detected": false,
      "severity": 0,
      "band": "low",
      "count": 4,
      "detail": "Peak of 4 transaction(s) within a single 1-hour window.",
      "evidence_tx_indices": []
    },
    "round_tripping": {
      "detected": false,
      "severity": 0,
      "band": "low",
      "count": 0,
      "detail": "No round-tripping (no counterparty with near-equal in/out flow).",
      "evidence_tx_indices": []
    },
    "amount_anomaly": {
      "detected": false,
      "severity": 0,
      "band": "low",
      "count": 2.95,
      "detail": "Largest transaction ($28000) is 2.95× the median ($9500).",
      "evidence_tx_indices": []
    }
  },
  "patterns_detected": [
    "structuring",
    "layering"
  ],
  "aml_pattern_score": 69,
  "pattern_band": "high",
  "verdict": "review",
  "hard_block": false,
  "flagged_counterparty_count": 0,
  "sanctioned_counterparty_involved": false,
  "reasons": [
    "structuring pattern detected: 3 transaction(s) sit in the structuring band ($6000–$10000), just under the $10000 reporting threshold.",
    "layering pattern detected: 3 inflow(s) had ≥80% of value forwarded out within 60 min — classic layering / pass-through."
  ],
  "risk_disclaimer": "Pattern detection over the transactions you supplied — not on-chain analysis, not a Suspicious Activity Report or legal/compliance determination. Inputs are trusted as given; a transaction you omit is excluded, not assumed clean. Patterns are heuristics that warrant review, not proof of illicit activity.",
  "reasoning": {
    "why_result_generated": "Scanned 5 transactions for money-laundering patterns; 2 pattern(s) detected → aml_pattern_score 69/100 (high) → verdict review.",
    "key_factors": [
      "Patterns detected: structuring, layering.",
      "Volume $56750 (in $28500 / out $28250) over 5 transactions.",
      "Structuring band count 3; layering events 3; peak velocity 4/hr; round-trip pairs 0.",
      "0 flagged counterparty(ies); sanctioned involved: false."
    ],
    "invalidators": [
      "Analyzes only the transactions you supplied — omitted transactions are excluded, not assumed clean.",
      "Time-based patterns (layering, velocity) require timestamps; without them they are understated.",
      "Patterns are heuristics warranting review, not proof of illicit activity; legitimate behavior can match them."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "detection": 1,
    "interpretation": 0.7
  },
  "recommended_actions_priority_order": [
    "Analyzed 5 transactions ($56750 volume): AML pattern score 69/100 (high) → verdict review.",
    "Structuring: 3 transaction(s) sit in the structuring band ($6000–$10000), just under the $10000 reporting threshold. Aggregate the related transfers and review intent.",
    "Layering: 3 inflow(s) had ≥80% of value forwarded out within 60 min — classic layering / pass-through. Trace the forwarded funds to their destinations."
  ],
  "chain_to": [
    {
      "api": "counterparty-exposure-graph",
      "reason": "Score the counterparties these transactions touch into a volume-weighted exposure graph.",
      "url": "https://orbis-apis.onrender.com/counterparty-exposure-graph"
    },
    {
      "api": "wallet-address-risk",
      "reason": "Check whether a counterparty address in a flagged transaction is itself high-risk.",
      "url": "https://orbis-apis.onrender.com/wallet-address-risk"
    },
    {
      "api": "wallet-risk-bundle",
      "reason": "Fold the AML pattern score into a single wallet trust verdict.",
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
