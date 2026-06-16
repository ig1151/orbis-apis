// AUTO-GENERATED from live output by x402-test/gen-b5-examples.mjs — do not hand-edit.
// Regenerate: start the server, run capture-b5.mjs then gen-b5-examples.mjs.
export const adviseExample = {
  "trace_id": "dea-1780000000000",
  "request_id": "dea-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "classification": "restricted",
  "sensitivity_score": 95,
  "categories": [
    "pii",
    "pci",
    "credentials"
  ],
  "at_rest": {
    "recommended": true,
    "algorithm": "AES-256-GCM",
    "key_bits": 256,
    "key_management": "HSM-backed keys via a managed cloud KMS with envelope encryption",
    "rotation_days": 90
  },
  "in_transit": {
    "recommended": true,
    "min_tls": "TLS 1.3",
    "mutual_tls": true
  },
  "field_level": [
    {
      "category": "pii",
      "technique": "Field-level encryption or pseudonymization for direct identifiers; minimize and segregate."
    },
    {
      "category": "pci",
      "technique": "Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored."
    },
    {
      "category": "credentials",
      "technique": "Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials."
    }
  ],
  "key_management": [
    "Rotate data-encryption keys every 90 days and on suspected compromise.",
    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
  ],
  "compliance_notes": [
    {
      "framework": "gdpr",
      "note": "GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope."
    },
    {
      "framework": "pci-dss",
      "note": "PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission."
    }
  ],
  "additional_controls": [
    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
    "Restrict access on a need-to-know basis and retain access audit logs."
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Classification: restricted (sensitivity 95/100). Encrypt at rest with AES-256-GCM; TLS 1.3 + mTLS in transit.",
    "Apply field-level handling for: pii, pci, credentials.",
    "Rotate keys every 90 days via HSM-backed keys via a managed cloud KMS with envelope encryption."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Find the actual PII spans in your payloads that these controls should protect."
    },
    {
      "api": "jwt-claims-designer",
      "reason": "Design token claims that avoid embedding the sensitive data covered here."
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
  "trace_id": "dea-1780000000000",
  "request_id": "dea-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "classification": "restricted",
  "sensitivity_score": 95,
  "categories": [
    "pii",
    "pci",
    "credentials"
  ],
  "at_rest": {
    "recommended": true,
    "algorithm": "AES-256-GCM",
    "key_bits": 256,
    "key_management": "HSM-backed keys via a managed cloud KMS with envelope encryption",
    "rotation_days": 90
  },
  "in_transit": {
    "recommended": true,
    "min_tls": "TLS 1.3",
    "mutual_tls": true
  },
  "field_level": [
    {
      "category": "pii",
      "technique": "Field-level encryption or pseudonymization for direct identifiers; minimize and segregate."
    },
    {
      "category": "pci",
      "technique": "Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored."
    },
    {
      "category": "credentials",
      "technique": "Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials."
    }
  ],
  "key_management": [
    "Rotate data-encryption keys every 90 days and on suspected compromise.",
    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
  ],
  "compliance_notes": [
    {
      "framework": "gdpr",
      "note": "GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope."
    },
    {
      "framework": "pci-dss",
      "note": "PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission."
    }
  ],
  "additional_controls": [
    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
    "Restrict access on a need-to-know basis and retain access audit logs."
  ],
  "reasoning": {
    "why_result_generated": "Classified 3 category(ies) as restricted; produced at-rest/in-transit/field-level/key-management guidance and 2 compliance note(s).",
    "key_factors": [
      "Highest-severity category drives classification restricted.",
      "In-transit mTLS required (restricted data); key rotation 90 day(s).",
      "Field-level handling for: pii, pci, credentials."
    ],
    "invalidators": [
      "Recommendations are a deterministic rubric mapped from the supplied categories/regulatory/environment — they are general best-practice guidance, NOT legal advice or a substitute for a compliance assessment.",
      "Classification is the maximum severity across the supplied categories; categories not provided are not considered, and credentials are flagged for one-way hashing rather than reversible encryption.",
      "Compliance notes summarize common obligations for the named frameworks at a high level; consult the controlling regulation and your DPO/auditor for specifics."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Classification: restricted (sensitivity 95/100). Encrypt at rest with AES-256-GCM; TLS 1.3 + mTLS in transit.",
    "Apply field-level handling for: pii, pci, credentials.",
    "Rotate keys every 90 days via HSM-backed keys via a managed cloud KMS with envelope encryption."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Find the actual PII spans in your payloads that these controls should protect."
    },
    {
      "api": "jwt-claims-designer",
      "reason": "Design token claims that avoid embedding the sensitive data covered here."
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

