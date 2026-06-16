// AUTO-GENERATED from live output by x402-test/gen-b5-examples.mjs — do not hand-edit.
// Regenerate: start the server, run capture-b5.mjs then gen-b5-examples.mjs.
export const scanExample = {
  "trace_id": "sdd-1780000000000",
  "request_id": "sdd-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "text_length": 110,
  "has_pii": true,
  "finding_count": 5,
  "counts_by_type": {
    "email": 1,
    "phone": 1,
    "ssn": 1,
    "credit_card": 1,
    "ipv4": 1
  },
  "findings": [
    {
      "type": "email",
      "value": "ada@example.com",
      "start": 15,
      "end": 30
    },
    {
      "type": "phone",
      "value": "(555) 123-4567",
      "start": 34,
      "end": 48
    },
    {
      "type": "ssn",
      "value": "123-45-6789",
      "start": 54,
      "end": 65
    },
    {
      "type": "credit_card",
      "value": "4111 1111 1111 1111",
      "start": 72,
      "end": 91
    },
    {
      "type": "ipv4",
      "value": "192.168.1.1",
      "start": 98,
      "end": 109
    }
  ],
  "redacted_text": "Contact Ada at [REDACTED_EMAIL] or [REDACTED_PHONE]. SSN [REDACTED_SSN], card [REDACTED_CREDIT_CARD], host [REDACTED_IPV4].",
  "risk_level": "high",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "detection": 1,
    "classification": 0.8,
    "risk": 0.7
  },
  "recommended_actions_priority_order": [
    "5 sensitive item(s) found — risk high. Types: email, phone, ssn, credit_card, ipv4.",
    "Use redacted_text for logs/LLM prompts; never persist the raw values.",
    "High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor."
  ],
  "chain_to": [
    {
      "api": "data-encryption-advisor",
      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
    },
    {
      "api": "data-classification",
      "reason": "Classify which columns of a dataset carry these PII types."
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

export const lookupExample = {
  "trace_id": "sdd-1780000000000",
  "request_id": "sdd-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "text_length": 110,
  "has_pii": true,
  "finding_count": 5,
  "counts_by_type": {
    "email": 1,
    "phone": 1,
    "ssn": 1,
    "credit_card": 1,
    "ipv4": 1
  },
  "findings": [
    {
      "type": "email",
      "value": "ada@example.com",
      "start": 15,
      "end": 30
    },
    {
      "type": "phone",
      "value": "(555) 123-4567",
      "start": 34,
      "end": 48
    },
    {
      "type": "ssn",
      "value": "123-45-6789",
      "start": 54,
      "end": 65
    },
    {
      "type": "credit_card",
      "value": "4111 1111 1111 1111",
      "start": 72,
      "end": 91
    },
    {
      "type": "ipv4",
      "value": "192.168.1.1",
      "start": 98,
      "end": 109
    }
  ],
  "redacted_text": "Contact Ada at [REDACTED_EMAIL] or [REDACTED_PHONE]. SSN [REDACTED_SSN], card [REDACTED_CREDIT_CARD], host [REDACTED_IPV4].",
  "risk_level": "high",
  "reasoning": {
    "why_result_generated": "Scanned 110 character(s) for 6 PII type(s): 5 finding(s), risk high.",
    "key_factors": [
      "Counts: email=1, phone=1, ssn=1, credit_card=1, ipv4=1.",
      "Credit-card matches are Luhn-validated; SSN/phone use US-centric shapes.",
      "Risk derived from the highest-severity type present."
    ],
    "invalidators": [
      "Detection is pattern-based and deterministic: it flags strings that MATCH the shape of each type, not strings proven to be real PII — a random 9-digit-pattern is reported as an SSN, and a number passing the Luhn check is not necessarily an issued card.",
      "Coverage is limited to email/SSN/credit-card/phone/IPv4/IPv6 with US-centric SSN/phone shapes; passports, national IDs, addresses, and names are NOT detected.",
      "Overlapping matches are resolved by earliest-start, then longest, then type precedence (card/SSN beat phone); a different segmentation could group digits differently."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "detection": 1,
    "classification": 0.8,
    "risk": 0.7
  },
  "recommended_actions_priority_order": [
    "5 sensitive item(s) found — risk high. Types: email, phone, ssn, credit_card, ipv4.",
    "Use redacted_text for logs/LLM prompts; never persist the raw values.",
    "High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor."
  ],
  "chain_to": [
    {
      "api": "data-encryption-advisor",
      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
    },
    {
      "api": "data-classification",
      "reason": "Classify which columns of a dataset carry these PII types."
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

