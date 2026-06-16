// AUTO-GENERATED from live output by x402-test/gen-b5-examples.mjs — do not hand-edit.
// Regenerate: start the server, run capture-b5.mjs then gen-b5-examples.mjs.
export const designExample = {
  "trace_id": "jcd-1780000000000",
  "request_id": "jcd-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "token_type": "access",
  "subject_type": "user",
  "recommended_ttl_seconds": 900,
  "registered_claims": [
    {
      "claim": "iss",
      "include": true,
      "required": true,
      "value_or_format": "https://auth.example.com",
      "rationale": "Identifies the issuer; verifiers must check it."
    },
    {
      "claim": "sub",
      "include": true,
      "required": true,
      "value_or_format": "user-123 (stable, non-reassignable user id)",
      "rationale": "Principal the token is about; keep it stable and opaque."
    },
    {
      "claim": "aud",
      "include": true,
      "required": true,
      "value_or_format": "https://api.example.com",
      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
    },
    {
      "claim": "exp",
      "include": true,
      "required": true,
      "value_or_format": "iat + 900s (UNIX seconds)",
      "rationale": "Expiry; keep short for access tokens."
    },
    {
      "claim": "iat",
      "include": true,
      "required": true,
      "value_or_format": "issue time (UNIX seconds)",
      "rationale": "Issue time; supports max-age and freshness checks."
    },
    {
      "claim": "nbf",
      "include": true,
      "required": false,
      "value_or_format": "= iat (UNIX seconds)",
      "rationale": "Not-before; defend against early use / clock games."
    },
    {
      "claim": "jti",
      "include": true,
      "required": false,
      "value_or_format": "unique token id (UUID)",
      "rationale": "Enables per-token revocation and replay detection."
    }
  ],
  "custom_claims": [
    {
      "claim": "scope",
      "value_or_format": "read:orders write:orders",
      "rationale": "Least-privilege authorization the token grants."
    },
    {
      "claim": "client_id",
      "value_or_format": "client-abc",
      "rationale": "OAuth client that requested the token."
    }
  ],
  "example_payload": {
    "iss": "https://auth.example.com",
    "sub": "user-123",
    "aud": [
      "https://api.example.com"
    ],
    "iat": 1700000000,
    "nbf": 1700000000,
    "exp": 1700000900,
    "jti": "5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d",
    "scope": "read:orders write:orders",
    "client_id": "client-abc"
  },
  "algorithm": {
    "provided": "HS256",
    "recommended": [
      "RS256",
      "ES256"
    ],
    "avoid": [
      "none",
      "HS256 (across service boundaries)"
    ],
    "note": "HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key."
  },
  "security_recommendations": [
    "Keep access tokens short-lived (recommended 900s); use refresh tokens for longevity.",
    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
    "Include jti to enable revocation and replay detection.",
    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
    "Scope tokens narrowly (least privilege via scope + aud)."
  ],
  "anti_patterns": [
    "Long-lived or non-expiring access tokens.",
    "Accepting alg:none or trusting the alg header from the client.",
    "Embedding sensitive data (PII/secrets) in claims.",
    "Skipping aud/iss validation, so a token for service A is accepted by service B."
  ],
  "confidence_score": 0.85,
  "confidence_per_section": {
    "claims": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Issue access tokens with the 7 registered + 2 custom claim(s) shown; TTL 900s.",
    "Sign with RS256 or ES256; provided alg = HS256.",
    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
  ],
  "chain_to": [
    {
      "api": "jwt-claim-policy-validator",
      "reason": "Validate real tokens against the claim policy this design implies."
    },
    {
      "api": "jwt-decoder",
      "reason": "Decode and inspect an issued token built from this design."
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
  "trace_id": "jcd-1780000000000",
  "request_id": "jcd-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "token_type": "access",
  "subject_type": "user",
  "recommended_ttl_seconds": 900,
  "registered_claims": [
    {
      "claim": "iss",
      "include": true,
      "required": true,
      "value_or_format": "https://auth.example.com",
      "rationale": "Identifies the issuer; verifiers must check it."
    },
    {
      "claim": "sub",
      "include": true,
      "required": true,
      "value_or_format": "user-123 (stable, non-reassignable user id)",
      "rationale": "Principal the token is about; keep it stable and opaque."
    },
    {
      "claim": "aud",
      "include": true,
      "required": true,
      "value_or_format": "https://api.example.com",
      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
    },
    {
      "claim": "exp",
      "include": true,
      "required": true,
      "value_or_format": "iat + 900s (UNIX seconds)",
      "rationale": "Expiry; keep short for access tokens."
    },
    {
      "claim": "iat",
      "include": true,
      "required": true,
      "value_or_format": "issue time (UNIX seconds)",
      "rationale": "Issue time; supports max-age and freshness checks."
    },
    {
      "claim": "nbf",
      "include": true,
      "required": false,
      "value_or_format": "= iat (UNIX seconds)",
      "rationale": "Not-before; defend against early use / clock games."
    },
    {
      "claim": "jti",
      "include": true,
      "required": false,
      "value_or_format": "unique token id (UUID)",
      "rationale": "Enables per-token revocation and replay detection."
    }
  ],
  "custom_claims": [
    {
      "claim": "scope",
      "value_or_format": "read:orders write:orders",
      "rationale": "Least-privilege authorization the token grants."
    },
    {
      "claim": "client_id",
      "value_or_format": "client-abc",
      "rationale": "OAuth client that requested the token."
    }
  ],
  "example_payload": {
    "iss": "https://auth.example.com",
    "sub": "user-123",
    "aud": [
      "https://api.example.com"
    ],
    "iat": 1700000000,
    "nbf": 1700000000,
    "exp": 1700000900,
    "jti": "5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d",
    "scope": "read:orders write:orders",
    "client_id": "client-abc"
  },
  "algorithm": {
    "provided": "HS256",
    "recommended": [
      "RS256",
      "ES256"
    ],
    "avoid": [
      "none",
      "HS256 (across service boundaries)"
    ],
    "note": "HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key."
  },
  "security_recommendations": [
    "Keep access tokens short-lived (recommended 900s); use refresh tokens for longevity.",
    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
    "Include jti to enable revocation and replay detection.",
    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
    "Scope tokens narrowly (least privilege via scope + aud)."
  ],
  "anti_patterns": [
    "Long-lived or non-expiring access tokens.",
    "Accepting alg:none or trusting the alg header from the client.",
    "Embedding sensitive data (PII/secrets) in claims.",
    "Skipping aud/iss validation, so a token for service A is accepted by service B."
  ],
  "reasoning": {
    "why_result_generated": "Designed a access-token claim set for a user subject: 7 registered + 2 custom claim(s), TTL 900s.",
    "key_factors": [
      "Registered claims: iss, sub, aud, exp, iat, nbf, jti.",
      "Custom claims: scope, client_id.",
      "Algorithm advice: prefer RS256/ES256 (provided HS256)."
    ],
    "invalidators": [
      "This generates a recommended claim DESIGN from the supplied profile; it does not mint, sign, decode, or validate tokens, and example_payload uses placeholder values + a fixed reference iat.",
      "Recommendations follow JWT/OAuth/OIDC best practice (RFC 7519 / RFC 9068 / OIDC Core) but are general guidance — your IdP, framework, or threat model may require different claims.",
      "TTLs are sensible defaults per token type (access 900s, id 3600s, refresh 2592000s) overridable via ttl_seconds; tune to your risk tolerance."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "claims": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Issue access tokens with the 7 registered + 2 custom claim(s) shown; TTL 900s.",
    "Sign with RS256 or ES256; provided alg = HS256.",
    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
  ],
  "chain_to": [
    {
      "api": "jwt-claim-policy-validator",
      "reason": "Validate real tokens against the claim policy this design implies."
    },
    {
      "api": "jwt-decoder",
      "reason": "Decode and inspect an issued token built from this design."
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

