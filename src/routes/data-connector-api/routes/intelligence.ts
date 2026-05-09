import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Data Connector API', info: '/data-connector/info', openapi: '/data-connector/openapi.json', health: 'ok' });
});

router.post('/transform', async (req: Request, res: Response) => {
  const { data, from_format, to_format, options } = req.body;
  if (data === undefined || data === null) return res.status(400).json({ error: 'data is required' });
  if (!from_format) return res.status(400).json({ error: 'from_format is required' });
  if (!to_format) return res.status(400).json({ error: 'to_format is required' });
  try {
    const raw = await callClaude(`Transform this data from one format to another. Handle nested structures, arrays, and special characters. From format: "${from_format}" To format: "${to_format}" Options: ${JSON.stringify(options || {})}

Data: ${JSON.stringify(data).slice(0, 4000)}

Return concise JSON:
{
  "transformed_data": "string (the output data serialized as string)",
  "from_format": "string",
  "to_format": "string",
  "record_count": number,
  "field_count": number,
  "transformation_notes": ["string"],
  "data_types_detected": { "field_name": "detected_type" },
  "confidence_per_section": { "transformation": 0-1, "type_detection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { data, schema, strict_mode, coerce_types } = req.body;
  if (data === undefined || data === null) return res.status(400).json({ error: 'data is required' });
  if (!schema) return res.status(400).json({ error: 'schema is required' });
  try {
    const raw = await callClaude(`Validate this data against the provided schema. Identify all violations, type mismatches, missing required fields, and format errors. Strict mode: ${strict_mode || false} Coerce types: ${coerce_types || false}

Schema: ${JSON.stringify(schema).slice(0, 2000)}

Data (first 3000 chars): ${JSON.stringify(data).slice(0, 3000)}

Return concise JSON:
{
  "valid": true|false,
  "error_count": number,
  "warning_count": number,
  "errors": [{ "field": "string", "error_type": "missing_required|type_mismatch|format_error|constraint_violation|extra_field", "message": "string", "value_provided": "string" }],
  "warnings": [{ "field": "string", "message": "string" }],
  "valid_records": number,
  "invalid_records": number,
  "suggestions": [{ "field": "string", "suggestion": "string" }],
  "confidence_per_section": { "validation": 0-1, "suggestions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/map-fields', async (req: Request, res: Response) => {
  const { source_data, source_schema, target_schema, mapping_hints, fuzzy_match } = req.body;
  if (!source_data) return res.status(400).json({ error: 'source_data is required' });
  if (!source_schema) return res.status(400).json({ error: 'source_schema is required' });
  if (!target_schema) return res.status(400).json({ error: 'target_schema is required' });
  try {
    const raw = await callClaude(`Map fields from source schema to target schema. Handle naming differences, nested paths, type conversions, and derived fields. Fuzzy match: ${fuzzy_match || false} Mapping hints: ${JSON.stringify(mapping_hints || {})}

Source schema: ${JSON.stringify(source_schema).slice(0, 1500)}
Target schema: ${JSON.stringify(target_schema).slice(0, 1500)}
Source data sample: ${JSON.stringify(source_data).slice(0, 1000)}

Return concise JSON:
{
  "field_mapping": [{ "source_field": "string", "target_field": "string", "transform": "none|rename|type_cast|concatenate|split|derive", "confidence": 0-1, "notes": "string" }],
  "unmapped_source_fields": ["string"],
  "unmapped_target_fields": ["string"],
  "required_target_fields_missing": ["string"],
  "mapping_confidence": 0-1,
  "transformed_sample": {},
  "manual_review_needed": [{ "field": "string", "reason": "string" }],
  "confidence_per_section": { "field_mapping": 0-1, "transformed_sample": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/merge', async (req: Request, res: Response) => {
  const { datasets, merge_strategy, conflict_resolution } = req.body;
  if (!datasets) return res.status(400).json({ error: 'datasets is required' });
  try {
    const raw = await callClaude(`Merge multiple datasets intelligently. Identify join keys, resolve conflicts, handle missing values, and preserve data integrity. Merge strategy: "${merge_strategy || 'outer'}" Conflict resolution: "${conflict_resolution || 'last'}"

Datasets: ${JSON.stringify(datasets.map((d: any) => ({ id: d.id, key_field: d.key_field, sample: Array.isArray(d.data) ? d.data.slice(0, 3) : d.data, count: Array.isArray(d.data) ? d.data.length : 1 }))).slice(0, 3000)}

Return concise JSON:
{
  "merge_strategy": "string",
  "record_count_before": { "dataset_id": number },
  "record_count_after": number,
  "conflicts_detected": number,
  "conflicts_resolved": [{ "key": "string", "field": "string", "values": ["string"], "resolution": "string" }],
  "data_quality_issues": [{ "issue": "string", "count": number, "recommendation": "string" }],
  "merged_data": [],
  "merge_summary": "string",
  "confidence_per_section": { "merge": 0-1, "conflict_resolution": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/enrich', async (req: Request, res: Response) => {
  const { records, enrich_fields, enrichment_type, context } = req.body;
  if (!records) return res.status(400).json({ error: 'records is required' });
  if (!enrich_fields) return res.status(400).json({ error: 'enrich_fields is required' });
  try {
    const raw = await callClaude(`Enrich these data records by deriving new fields, normalizing values, classifying records, and adding computed scores. Enrichment type: "${enrichment_type || 'derive'}" Fields to enrich: ${JSON.stringify(enrich_fields)} Context: "${context || 'general'}"

Records sample (first 5): ${JSON.stringify(Array.isArray(records) ? records.slice(0, 5) : records).slice(0, 3000)}
Total records: ${Array.isArray(records) ? records.length : 1}

Return concise JSON:
{
  "enriched_records": [],
  "enrichment_summary": { "field_name": { "type": "string", "values_enriched": number, "method": "string" } },
  "derived_fields": [{ "field": "string", "formula_or_logic": "string", "data_type": "string" }],
  "data_quality_improvements": [{ "before": "string", "after": "string", "impact": "string" }],
  "total_records": number,
  "enrichment_coverage": 0-1,
  "confidence_per_section": { "enrichment": 0-1, "derived_fields": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/deduplicate', async (req: Request, res: Response) => {
  const { records, match_fields, fuzzy_threshold, keep_strategy } = req.body;
  if (!records) return res.status(400).json({ error: 'records is required' });
  try {
    const raw = await callClaude(`Identify and remove duplicate records. Use exact and fuzzy matching on key fields, score match confidence, and preserve the best version of each record. Match fields: ${JSON.stringify(match_fields || [])} Fuzzy threshold: ${fuzzy_threshold || 0.85} Keep strategy: "${keep_strategy || 'highest_quality'}"

Records (first 20): ${JSON.stringify(Array.isArray(records) ? records.slice(0, 20) : records).slice(0, 3000)}
Total records: ${Array.isArray(records) ? records.length : 1}

Return concise JSON:
{
  "original_count": number,
  "duplicate_groups": [{ "records": [number], "match_type": "exact|fuzzy", "match_score": 0-1, "fields_matched": ["string"], "recommended_keep": number }],
  "duplicates_found": number,
  "unique_records": number,
  "deduplication_rate": 0-1,
  "sample_deduped_records": [],
  "match_field_analysis": [{ "field": "string", "uniqueness_score": 0-1, "null_rate": 0-1 }],
  "confidence_per_section": { "duplicate_detection": 0-1, "field_analysis": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/normalize', async (req: Request, res: Response) => {
  const { records, normalization_rules, auto_detect } = req.body;
  if (!records) return res.status(400).json({ error: 'records is required' });
  try {
    const raw = await callClaude(`Normalize and standardize data fields. Fix date formats, phone numbers, emails, addresses, currencies, and names to consistent formats. Auto-detect field types: ${auto_detect !== false} Normalization rules: ${JSON.stringify(normalization_rules || [])}

Records sample (first 5): ${JSON.stringify(Array.isArray(records) ? records.slice(0, 5) : records).slice(0, 3000)}
Total records: ${Array.isArray(records) ? records.length : 1}

Return concise JSON:
{
  "normalized_records": [],
  "normalizations_applied": [{ "field": "string", "from_format": "string", "to_format": "string", "records_affected": number, "examples": ["string"] }],
  "fields_auto_detected": [{ "field": "string", "detected_type": "string", "confidence": 0-1 }],
  "errors": [{ "field": "string", "value": "string", "error": "string" }],
  "normalization_coverage": 0-1,
  "data_quality_delta": { "before": 0-1, "after": 0-1 },
  "confidence_per_section": { "normalization": 0-1, "auto_detection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-schema', async (req: Request, res: Response) => {
  const { data, sample_size, include_stats } = req.body;
  if (!data) return res.status(400).json({ error: 'data is required' });
  try {
    const sample = Array.isArray(data) ? data.slice(0, sample_size || 100) : [data];
    const raw = await callClaude(`Infer the schema from sample data. Detect field types, required vs optional fields, value ranges, cardinality, and relationships between fields. Include stats: ${include_stats !== false}

Data sample (first ${Math.min(sample.length, 10)} records): ${JSON.stringify(sample.slice(0, 10)).slice(0, 3000)}
Total records analyzed: ${sample.length}

Return concise JSON:
{
  "schema": {
    "field_name": { "type": "string|number|boolean|array|object|date|null", "nullable": true|false, "required": true|false, "format": "string or null", "example_values": ["string"], "cardinality": "high|medium|low" }
  },
  "total_fields": number,
  "record_count_analyzed": number,
  "relationships": [{ "field_a": "string", "field_b": "string", "relationship": "foreign_key|correlated|derived" }],
  "data_quality_summary": [{ "field": "string", "null_rate": 0-1, "unique_rate": 0-1, "issues": ["string"] }],
  "recommended_schema_name": "string",
  "confidence_per_section": { "schema": 0-1, "relationships": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sync-check', async (req: Request, res: Response) => {
  const { source_records, target_records, key_field, compare_fields, tolerance } = req.body;
  if (!source_records) return res.status(400).json({ error: 'source_records is required' });
  if (!target_records) return res.status(400).json({ error: 'target_records is required' });
  if (!key_field) return res.status(400).json({ error: 'key_field is required' });
  try {
    const raw = await callClaude(`Compare two datasets to identify sync status — records only in source, only in target, in both but different, and truly matching. Key field: "${key_field}" Compare fields: ${JSON.stringify(compare_fields || [])} Tolerance: ${JSON.stringify(tolerance || {})}

Source records (first 10 of ${Array.isArray(source_records) ? source_records.length : 1}): ${JSON.stringify(Array.isArray(source_records) ? source_records.slice(0, 10) : source_records).slice(0, 2000)}
Target records (first 10 of ${Array.isArray(target_records) ? target_records.length : 1}): ${JSON.stringify(Array.isArray(target_records) ? target_records.slice(0, 10) : target_records).slice(0, 2000)}

Return concise JSON:
{
  "total_source": number,
  "total_target": number,
  "in_sync": number,
  "only_in_source": number,
  "only_in_target": number,
  "differs": number,
  "sync_rate": 0-1,
  "differences": [{ "key": "string", "field": "string", "source_value": "string", "target_value": "string", "diff_type": "missing|added|changed" }],
  "sync_health": "healthy|degraded|critical",
  "recommended_actions": [{ "action": "string", "records_affected": number, "priority": "high|medium|low" }],
  "confidence_per_section": { "sync_analysis": 0-1, "differences": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { data_operation, data_context, quality_threshold, risk_level } = req.body;
  if (!data_operation) return res.status(400).json({ error: 'data_operation is required' });
  if (!data_context) return res.status(400).json({ error: 'data_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this data operation should be executed based on data quality, completeness, and risk level. Data operation: "${data_operation}" Quality threshold: ${quality_threshold || 0.7} Risk level: "${risk_level || 'medium'}" Data context: ${JSON.stringify(data_context).slice(0, 2000)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "data_quality_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|validate_first|enrich_first|cancel",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
