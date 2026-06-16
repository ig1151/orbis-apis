// AUTO-GENERATED from live output by x402-test/gen-groupb-devtools-examples.mjs — do not hand-edit.
export const convertExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "XMLHttpRequest",
  "to": "snake",
  "converted": "xml_http_request",
  "tokens": [
    "xml",
    "http",
    "request"
  ],
  "detected_case": "pascal",
  "confidence_score": 1,
  "confidence_per_section": {
    "tokenization": 1,
    "conversion": 1,
    "detection": 0.9
  },
  "recommended_actions_priority_order": [
    "Apply \"xml_http_request\" as the snake-cased identifier.",
    "Use /normalize-keys to re-case an entire object the same way."
  ],
  "chain_to": [
    {
      "api": "data-mapper",
      "reason": "Remap records onto the freshly re-cased field names."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the re-cased object against a target JSON Schema."
    },
    {
      "api": "jsonpath",
      "reason": "Query the normalized object by the new key names."
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
export const detectExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "user_profile_id",
  "detected_case": "snake",
  "tokens": [
    "user",
    "profile",
    "id"
  ],
  "all_cases": {
    "camel": "userProfileId",
    "pascal": "UserProfileId",
    "snake": "user_profile_id",
    "kebab": "user-profile-id",
    "constant": "USER_PROFILE_ID",
    "dot": "user.profile.id",
    "path": "user/profile/id",
    "title": "User Profile Id",
    "sentence": "User profile id",
    "lower": "user profile id",
    "upper": "USER PROFILE ID"
  },
  "confidence_score": 0.9,
  "confidence_per_section": {
    "tokenization": 1,
    "conversion": 1,
    "detection": 0.9
  },
  "recommended_actions_priority_order": [
    "Pick the target case from all_cases (detected source: snake)."
  ],
  "chain_to": [
    {
      "api": "data-mapper",
      "reason": "Remap records onto the freshly re-cased field names."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the re-cased object against a target JSON Schema."
    },
    {
      "api": "jsonpath",
      "reason": "Query the normalized object by the new key names."
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
export const normalizeKeysExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "to": "snake",
  "normalized": {
    "user_id": 1,
    "shipping_address": {
      "zip_code": "94103",
      "country_code": "US"
    },
    "line_items": [
      {
        "product_id": "a"
      }
    ]
  },
  "keys_renamed": 6,
  "collisions": [],
  "confidence_score": 1,
  "confidence_per_section": {
    "tokenization": 1,
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Re-cased 6 key(s) to snake.",
    "Pass the normalized object to data-mapper or a schema validator."
  ],
  "chain_to": [
    {
      "api": "data-mapper",
      "reason": "Remap records onto the freshly re-cased field names."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the re-cased object against a target JSON Schema."
    },
    {
      "api": "jsonpath",
      "reason": "Query the normalized object by the new key names."
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
  "input": "user_profile_id",
  "detected_case": "snake",
  "tokens": [
    "user",
    "profile",
    "id"
  ],
  "all_cases": {
    "camel": "userProfileId",
    "pascal": "UserProfileId",
    "snake": "user_profile_id",
    "kebab": "user-profile-id",
    "constant": "USER_PROFILE_ID",
    "dot": "user.profile.id",
    "path": "user/profile/id",
    "title": "User Profile Id",
    "sentence": "User profile id",
    "lower": "user profile id",
    "upper": "USER PROFILE ID"
  },
  "reasoning": {
    "why_result_generated": "Tokenized \"user_profile_id\" into [user, profile, id] and rendered every supported case; detected source case heuristically as \"snake\".",
    "key_factors": [
      "Token count: 3.",
      "Detected case: snake."
    ],
    "invalidators": [
      "Tokenization breaks on separators (_ - . / whitespace and other non-alphanumerics) and on camelCase, acronym (HTTPServer→HTTP Server), and letter↔digit boundaries; the conversion of those tokens into the target case is exact and reversible up to separator/casing loss.",
      "Source-case \"detection\" is a structural heuristic (which separators/capitalization are present); ambiguous inputs (e.g. a single all-lowercase word, or a string with no separators) may report a plausible-but-debatable case. The token split and the converted output are NOT heuristic.",
      "Original separators are not preserved: converting \"a.b-c\" to snake yields \"a_b_c\". Round-tripping is exact only within a single separator convention.",
      "/normalize-keys re-cases OBJECT KEYS only (recursively); array order and all scalar/values are preserved. When two distinct keys collapse to the same cased key the last one wins and the key is reported in \"collisions\"."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "tokenization": 1,
    "conversion": 1,
    "detection": 0.9
  },
  "recommended_actions_priority_order": [
    "Pick the target case from all_cases.",
    "Use /normalize-keys to apply it across an entire object."
  ],
  "chain_to": [
    {
      "api": "data-mapper",
      "reason": "Remap records onto the freshly re-cased field names."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the re-cased object against a target JSON Schema."
    },
    {
      "api": "jsonpath",
      "reason": "Query the normalized object by the new key names."
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
