// AUTO-GENERATED from live output by x402-test/gen-groupb-batch3-examples.mjs — do not hand-edit.
export const hashExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "byte_length": 11,
  "encoding": "utf8",
  "hashes": {
    "crc32": "0d4a1185",
    "adler32": "1a0b045d",
    "md5": "5eb63bbbe01eeed093cb22bb8f5acdc3",
    "sha1": "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
    "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "sha512": "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "computation": 1
  },
  "recommended_actions_priority_order": [
    "Computed 6 digest(s) over 11 byte(s)."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan the same payload for PII before persisting or transmitting it."
    },
    {
      "api": "json-patch",
      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
};
export const verifyExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "algorithm": "sha256",
  "encoding": "utf8",
  "byte_length": 11,
  "computed": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "expected_normalized": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "match": true,
  "confidence_score": 1,
  "confidence_per_section": {
    "computation": 1,
    "verification": 1
  },
  "recommended_actions_priority_order": [
    "Digest matches the expected sha256 value."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan the same payload for PII before persisting or transmitting it."
    },
    {
      "api": "json-patch",
      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
};
export const lookupExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "byte_length": 11,
  "encoding": "utf8",
  "hashes": {
    "crc32": "0d4a1185",
    "adler32": "1a0b045d",
    "md5": "5eb63bbbe01eeed093cb22bb8f5acdc3",
    "sha1": "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
    "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "sha512": "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
  },
  "reasoning": {
    "why_result_generated": "Decoded 11 byte(s) from the utf8 input and computed 6 digest(s): crc32, adler32, md5, sha1, sha256, sha512.",
    "key_factors": [
      "Byte length: 11.",
      "Encoding: utf8.",
      "Algorithms: crc32, adler32, md5, sha1, sha256, sha512."
    ],
    "invalidators": [
      "Digests are computed over the exact bytes decoded from \"text\" using \"encoding\" (default utf8). The same logical content under a different encoding yields different bytes and thus different digests.",
      "CRC-32 (IEEE reflected, poly 0xEDB88320) and Adler-32 are error-detection checksums, NOT cryptographic — do not use them for integrity against tampering or for security. MD5 and SHA-1 are cryptographically broken; prefer SHA-256/SHA-512 for security-sensitive integrity.",
      "All digests are lowercase hex. Verification compares hex case-insensitively after stripping surrounding whitespace; a leading \"0x\" in the expected value is not stripped."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "computation": 1
  },
  "recommended_actions_priority_order": [
    "Computed 6 digest(s) over 11 byte(s)."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan the same payload for PII before persisting or transmitting it."
    },
    {
      "api": "json-patch",
      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
};
