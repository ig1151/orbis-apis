#!/usr/bin/env python3
"""Synthesize schema-valid, domain-seeded 200 response examples for restaurant-suite
endpoints that lack one (factory returns 501 without an example). Validates each
example against its composed schema before inserting."""
import json, pathlib, hashlib, re, sys, collections
from jsonschema import Draft202012Validator

SPECS = pathlib.Path("src/routes/restaurant-suite/specs")
HTTP = ["get", "post", "put", "patch", "delete"]

# The 26 endpoints that originally lacked a 200 example — regenerate ONLY these
# (leave the 35 hand-authored pre-existing examples untouched).
FORCE = {
 ("catering-procurement","POST /compare-catering-vendors"),("catering-procurement","POST /prepare-catering-order"),
 ("franchise-opportunity","POST /compare-franchise-markets"),("franchise-opportunity","POST /score-location-fit"),
 ("local-restaurant-discovery","POST /rank-restaurants"),("local-restaurant-discovery","POST /compare-local-options"),
 ("multi-restaurant-ordering","POST /build-order"),("multi-restaurant-ordering","POST /price-order"),("multi-restaurant-ordering","POST /prepare-checkout"),
 ("office-lunch-planner","POST /collect-preferences"),("office-lunch-planner","POST /build-group-order"),("office-lunch-planner","POST /optimize-budget"),
 ("reservation-intelligence","POST /predict-no-show-risk"),("reservation-intelligence","POST /optimize-seating"),
 ("restaurant-ai-consultant","POST /benchmark-competitors"),("restaurant-ai-consultant","POST /generate-90-day-plan"),
 ("restaurant-growth-opportunity","POST /audit-online-presence"),("restaurant-growth-opportunity","POST /audit-menu-pricing"),("restaurant-growth-opportunity","POST /audit-reviews"),
 ("restaurant-lead-generation","POST /score-leads"),("restaurant-lead-generation","POST /enrich-lead"),("restaurant-lead-generation","POST /generate-outreach-angle"),("restaurant-lead-generation","POST /export-leads"),
 ("review-sentiment","POST /identify-negative-review-drivers"),("review-sentiment","POST /generate-review-response-plan"),("review-sentiment","POST /monitor-review-risk"),
}

# ---- deterministic helpers (no randomness) ----
def rid(seed: str) -> str:
    return "req_" + hashlib.sha1(seed.encode()).hexdigest()[:16]

FIXED_TS = "2026-06-04T09:15:00Z"

def _bounds(schema):
    lo = schema.get("minimum", schema.get("exclusiveMinimum"))
    hi = schema.get("maximum", schema.get("exclusiveMaximum"))
    return lo, hi

def clamp_num(v, schema):
    lo, hi = _bounds(schema)
    if hi is not None and v > hi: v = hi
    if lo is not None and v < lo: v = lo
    # if a tight integer-ish range like price_level 1..4, prefer a mid value
    if lo is not None and hi is not None and hi <= 5 and "score" not in str(schema):
        v = round((lo + hi) / 2, 2)
    return v

def clamp_int(v, schema):
    lo, hi = _bounds(schema)
    if hi is not None and v > hi: v = int(hi)
    if lo is not None and v < lo: v = int(lo)
    return int(v)

# ---- domain value heuristics by field name + format ----
def val_for(name: str, schema: dict, seed: str):
    name_l = name.lower()
    if "enum" in schema and schema["enum"]:
        return schema["enum"][0]
    if "example" in schema:
        return schema["example"]
    if "default" in schema:
        return schema["default"]
    if any(k in schema for k in ("allOf", "oneOf", "anyOf")):
        return synth(schema, seed)
    t = schema.get("type")
    if isinstance(t, list):
        t = next((x for x in t if x != "null"), t[0])
    fmt = schema.get("format")
    # strings
    if t == "string":
        if fmt == "date-time": return FIXED_TS
        if fmt == "date": return "2026-06-12"
        if fmt == "uri": return "https://public-listings.example.com/denver/restaurants"
        if fmt == "email": return "owner@example-bistro.com"
        if "id" == name_l or name_l.endswith("_id"): return "r_" + hashlib.sha1((seed+name).encode()).hexdigest()[:6]
        if "name" in name_l: return "Mercantile Dining & Provision"
        if "city" in name_l: return "Denver"
        if "state" in name_l: return "CO"
        if "address" in name_l: return "1500 Wynkoop St, Denver, CO 80202"
        if "phone" in name_l: return "+1-303-555-0188"
        if "url" in name_l: return "https://example-bistro.com"
        if "currency" in name_l: return "USD"
        if "level" in name_l: return "high"
        if "status" in name_l: return "completed"
        if "priority" in name_l: return "high"
        if "cuisine" in name_l: return "american"
        if "category" in name_l or "type" in name_l: return "general"
        # list-item / short-phrase fields → concrete domain phrases
        PHRASE = {
            "pain_point": "Low Google rating dragging down discovery",
            "signal": "poor_reviews",
            "satisfied": "vegetarian_options",
            "unmet": "gluten_free",
            "best_for": "date_night",
            "strength": "Strong repeat-customer loyalty",
            "weakness": "Thin weekday lunch traffic",
            "driver": "Slow service during peak hours",
            "theme": "service_speed",
            "tag": "trending",
            "dietary": "vegetarian_options",
            "vibe": "casual",
            "channel": "email",
            "recommendation": "Launch a Google review-generation campaign",
            "opportunity": "Add online ordering to capture delivery demand",
        }
        for key, phrase in PHRASE.items():
            if key in name_l:
                return phrase
        if any(k in name_l for k in ("rationale","reason","summary","description","note","highlight","insight","headline","angle","message","label","text","title","plan","action","next_step")):
            return "Derived from current data; specific, realistic, and consistent with the request."
        return "general"
    if t == "integer":
        if "days" in name_l: v = 1
        elif any(k in name_l for k in ("count","total","num","reviews")): v = 128
        elif "minutes" in name_l: v = 20
        elif "rank" in name_l or "priority" in name_l: v = 1
        elif "year" in name_l: v = 2026
        else: v = 3
        return clamp_int(v, schema)
    if t == "number":
        if "score" in name_l or "confidence" in name_l: v = 0.88
        elif "rating" in name_l: v = 4.6
        elif any(k in name_l for k in ("usd","price","cost","revenue","amount","budget","spend","monthly","annual","gap","value_","_value","low","high","min_","max_")): v = 1850.0
        elif "pct" in name_l or "percent" in name_l or "rate" in name_l or "share" in name_l: v = 0.34
        elif "miles" in name_l or "distance" in name_l: v = 1.2
        elif "weight" in name_l: v = 0.5
        else: v = 0.5
        return clamp_num(v, schema)
    if t == "boolean":
        # action/exec flags default false; capability/availability flags true
        if any(k in name_l for k in ("required","gated","pending","error","included","deposit")):
            return False
        if any(k in name_l for k in ("submitted","booked","placed","dispatched","executed","sent")):
            return False
        return True
    if t == "array":
        items = schema.get("items", {})
        return [synth(items, seed + "[0]")]
    if t == "object" or "properties" in schema or "allOf" in schema:
        return synth(schema, seed)
    if t == "null":
        return None
    return None

# ---- $ref resolution ----
ROOT = {}
def deref(schema: dict):
    if "$ref" in schema:
        ref = schema["$ref"]
        name = ref.split("/")[-1]
        return ROOT["components"]["schemas"][name]
    return schema

def merge_object_schemas(branches):
    props, required = collections.OrderedDict(), []
    for b in branches:
        b = deref(b)
        if "allOf" in b:
            p, r = merge_object_schemas(b["allOf"])
            props.update(p); required += r
        for k, v in (b.get("properties") or {}).items():
            props[k] = v
        required += b.get("required") or []
    return props, required

def synth(schema: dict, seed: str):
    schema = deref(schema)
    if "allOf" in schema:
        props, required = merge_object_schemas(schema["allOf"])
        out = collections.OrderedDict()
        for k, v in props.items():
            out[k] = val_for(k, deref(v) if "$ref" in v else v, seed + "." + k)
        return out
    for comb in ("oneOf", "anyOf"):
        if comb in schema:
            return synth(schema[comb][0], seed)
    t = schema.get("type")
    if t == "object" or "properties" in schema:
        out = collections.OrderedDict()
        for k, v in (schema.get("properties") or {}).items():
            out[k] = val_for(k, deref(v) if "$ref" in v else v, seed + "." + k)
        return out
    if t == "array":
        return [synth(schema.get("items", {}), seed + "[0]")]
    return val_for(seed.split(".")[-1], schema, seed)

# ---- curated envelope overlay (high quality, endpoint-tailored) ----
def envelope(spec, op, method, path, siblings):
    title = spec["info"]["title"]
    summary = (op.get("summary") or op.get("operationId") or "").rstrip(".")
    sib = next((s for s in siblings if s != path and not s.startswith("/")), None)
    # pick a sibling endpoint to chain to (first non-self, non-discovery POST)
    chain_eps = [s for s in siblings if s != path and s != "/"]
    nxt = chain_eps[0] if chain_eps else path
    env = collections.OrderedDict()
    env["request_id"] = rid(title + method + path)
    env["source_freshness"] = {
        "data_freshness_days": 1,
        "last_verified_at": FIXED_TS,
        "source_urls": ["https://public-listings.example.com/denver/restaurants"],
    }
    env["confidence"] = {
        "score": 0.88, "level": "high",
        "rationale": f"Inputs resolved cleanly and validated against current data for '{summary.lower()}'.",
    }
    env["privacy"] = {
        "pii_included": False,
        "retention_days": 30,
        "compliance": ["CCPA", "GDPR_legitimate_interest"],
        "data_sources": ["public_business_listings", "public_review_platforms"],
    }
    env["recommended_actions_priority_order"] = [{
        "priority": 1,
        "action": f"Use this result, then continue the workflow via {nxt}.",
        "rationale": "Chaining the next step turns this output into an end-to-end outcome.",
        "chain_to_endpoint": f"POST {nxt}",
    }]
    env["chain_to"] = [{
        "api": title,
        "endpoint": f"POST {nxt}",
        "reason": "Next logical step in this API's workflow.",
    }]
    return env

def main():
    specs = sorted(SPECS.glob("*.json"))
    global ROOT
    grand_added = 0
    grand_fail = 0
    for f in specs:
        spec = json.load(open(f))
        ROOT = spec
        siblings = list(spec.get("paths", {}).keys())
        added = []
        for path, ops in spec.get("paths", {}).items():
            for m in HTTP:
                op = ops.get(m)
                if not op: continue
                rb = (((op.get("responses", {}).get("200", {}) or {}).get("content", {}) or {}).get("application/json", {}) or {})
                forced = (f.stem, f"{m.upper()} {path}") in FORCE
                if rb.get("example") is not None and not forced: continue
                if path == "/" and m == "get": continue
                schema_ref = rb.get("schema")
                if not schema_ref: continue
                ex = synth(schema_ref, f.stem + m + path)
                # overlay curated envelope onto the synthesized object
                if isinstance(ex, dict):
                    ex.update(envelope(spec, op, m, path, siblings))
                # validate against composed schema
                resolved = {"$defs": spec["components"]["schemas"], **rewrite_refs(schema_ref)}
                try:
                    full = build_validatable(schema_ref, spec)
                    Draft202012Validator(full).validate(ex)
                except Exception as e:
                    grand_fail += 1
                    print(f"  !! VALIDATION FAIL {f.stem} {m.upper()} {path}: {str(e)[:160]}")
                    continue
                rb["example"] = ex
                added.append(f"{m.upper()} {path}")
        if added:
            f.write_text(json.dumps(spec, indent=1) + "\n")
            grand_added += len(added)
            print(f"{f.stem}: +{len(added)} examples")
            for a in added: print("      ", a)
    print(f"\nTOTAL added: {grand_added}, failed: {grand_fail}")

def rewrite_refs(node):
    return node  # placeholder

def build_validatable(schema_ref, spec):
    """Fully inline all $refs into a self-contained schema. jsonschema's
    `unevaluatedProperties` annotation collection is unreliable across $ref inside
    allOf, so we dereference everything (cycle-guarded) to make validation correct."""
    schemas = spec["components"]["schemas"]
    def inline(node, stack):
        if isinstance(node, list):
            return [inline(x, stack) for x in node]
        if not isinstance(node, dict):
            return node
        if "$ref" in node:
            name = node["$ref"].split("/")[-1]
            if name in stack:  # cycle: leave a permissive stub
                return {"type": "object"}
            resolved = inline(schemas[name], stack | {name})
            extra = {k: inline(v, stack) for k, v in node.items() if k != "$ref"}
            return {**resolved, **extra}
        return {k: inline(v, stack) for k, v in node.items()}
    return inline(schema_ref, frozenset())

if __name__ == "__main__":
    main()
