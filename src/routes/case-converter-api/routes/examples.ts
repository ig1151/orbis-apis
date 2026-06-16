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
    "conversion": 1,
    "detection": 0.9
  },
  "recommended_actions_priority_order": [
    "Converted to snake: \"xml_http_request\"."
  ],
  "chain_to": [
    {
      "api": "semver-tools",
      "reason": "Normalize and compare version identifiers after casing field names."
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
    "detection": 0.9,
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Detected source case: snake."
  ],
  "chain_to": [
    {
      "api": "semver-tools",
      "reason": "Normalize and compare version identifiers after casing field names."
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
      "Original separators are not preserved: converting \"a.b-c\" to snake yields \"a_b_c\". Round-tripping is exact only within a single separator convention."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "detection": 0.9,
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Tokenized into 3 token(s); emitted all 11 cases."
  ],
  "chain_to": [
    {
      "api": "semver-tools",
      "reason": "Normalize and compare version identifiers after casing field names."
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
