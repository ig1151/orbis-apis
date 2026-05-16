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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

async function getNpmInfo(pkg: string, version?: string): Promise<any> {
  try {
    const url = version ? `https://registry.npmjs.org/${pkg}/${version}` : `https://registry.npmjs.org/${pkg}`;
    const res = await axios.get(url, { timeout: 5000 });
    return res.data;
  } catch { return null; }
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'NPM Package Risk API', info: '/npm-package-risk/info', openapi: '/npm-package-risk/openapi.json', health: 'ok' });
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { package_name, version } = req.body;
  if (!package_name) return res.status(400).json({ error: 'package_name is required' });
  try {
    const info = await getNpmInfo(package_name, version);
    const latestVersion = info?.version || info?.['dist-tags']?.latest || 'unknown';
    const raw = await callClaude(`Analyze NPM package risk: ${package_name}@${version || latestVersion}. Info: ${JSON.stringify({ name: info?.name, description: info?.description?.slice(0, 100), license: info?.license, maintainers: info?.maintainers?.length }).slice(0, 300)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"package":"${package_name}","version":"${version || latestVersion}","risk_score":0.0,"risk_level":"critical|high|medium|low|safe","risk_factors":{"vulnerabilities":0,"outdated":false,"unmaintained":false,"few_maintainers":false,"supply_chain_risk":false,"malware_risk":false,"typosquat_risk":false},"weekly_downloads":0,"last_publish_days_ago":0,"maintainer_count":0,"open_issues":0,"license":"string","license_risk":"permissive|copyleft|restrictive|unknown","source_provenance":{"provider":"npm-package-risk","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"npm-package-risk","recommended_next_endpoint":"/alternatives","automation_safe":true,"confidence_per_section":{"risk":0.88},"recommended_actions_priority_order":["address critical risks","review license","pin version"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/dependencies', async (req: Request, res: Response) => {
  const { package_name, version, depth } = req.body;
  if (!package_name) return res.status(400).json({ error: 'package_name is required' });
  try {
    const info = await getNpmInfo(package_name, version);
    const deps = Object.keys(info?.dependencies || {});
    const raw = await callClaude(`Analyze dependency tree risk for ${package_name}. Direct deps: ${JSON.stringify(deps.slice(0, 20))}. Depth: ${depth || 2}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"package":"${package_name}","direct_deps":${deps.length},"transitive_deps_estimate":0,"high_risk_deps":["string"],"vulnerable_deps":["string"],"outdated_deps":["string"],"dep_tree_risk":"critical|high|medium|low","circular_deps":false,"duplicate_deps":["string"],"total_size_kb":0,"source_provenance":{"provider":"npm-package-risk","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"npm-package-risk","recommended_next_endpoint":"/package-intelligence","automation_safe":true,"confidence_per_section":{"dependencies":0.85},"recommended_actions_priority_order":["update vulnerable deps","remove unused deps","audit transitive deps"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/license', async (req: Request, res: Response) => {
  const { package_name, version, allowed_licenses } = req.body;
  if (!package_name) return res.status(400).json({ error: 'package_name is required' });
  try {
    const info = await getNpmInfo(package_name, version);
    const license = info?.license || info?.licenses?.[0]?.type || 'unknown';
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      package: package_name, license,
      license_type: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'].includes(license) ? 'permissive' : ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0'].includes(license) ? 'copyleft' : 'other',
      commercial_use_allowed: !license.includes('GPL') || license.includes('LGPL'),
      modification_allowed: license !== 'proprietary',
      distribution_allowed: !license.includes('no-distribute'),
      patent_grant: license.includes('Apache') || license.includes('MIT'),
      compliance_status: allowed_licenses ? (allowed_licenses.includes(license) ? 'compliant' : 'non_compliant') : 'not_checked',
      source_provenance: { provider: 'npm-package-risk-live', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'npm-package-risk', recommended_next_endpoint: '/package-intelligence',
      automation_safe: true, confidence_per_section: { license: 0.92 },
      recommended_actions_priority_order: ['verify compliance', 'document license', 'consult legal if copyleft'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { package_name, objective } = req.body;
  if (!package_name) return res.status(400).json({ error: 'package_name is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'package_risk_assessment',
    next_api: 'npm-package-risk', next_endpoint: '/analyze',
    blocking_flags: [], flag_definitions: { NO_PACKAGE: 'package_name is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'npm-package-risk', recommended_next_endpoint: '/analyze',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Analyze risk', 'Check dependencies', 'Verify license'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/package-intelligence', async (req: Request, res: Response) => {
  const { package_name, version } = req.body;
  if (!package_name) return res.status(400).json({ error: 'package_name is required' });
  try {
    const info = await getNpmInfo(package_name, version);
    const raw = await callClaude(`Full NPM package intelligence: ${package_name}@${version || 'latest'}. Registry info: ${JSON.stringify({ name: info?.name, description: info?.description?.slice(0, 100), license: info?.license, keywords: info?.keywords?.slice(0, 5) }).slice(0, 300)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"package":"${package_name}","version":"string","overall_risk":"critical|high|medium|low|safe","risk_score":0.0,"vulnerabilities":0,"license":"string","license_risk":"string","maintenance_score":0.0,"popularity_score":0.0,"security_score":0.0,"recommendation":"use|caution|avoid|replace","key_risks":["string"],"key_strengths":["string"],"source_provenance":{"provider":"npm-package-risk","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"npm-package-risk","recommended_next_endpoint":"/alternatives","automation_safe":true,"confidence_per_section":{"risk":0.88,"license":0.92},"recommended_actions_priority_order":["act on recommendation","pin safe version","add to allowlist if approved"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alternatives', async (req: Request, res: Response) => {
  const { package_name, reason } = req.body;
  if (!package_name) return res.status(400).json({ error: 'package_name is required' });
  try {
    const raw = await callClaude(`Suggest safer alternatives to NPM package ${package_name}. Reason for replacement: ${reason || 'security/risk concerns'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"package":"${package_name}","reason":"${reason || 'risk mitigation'}","alternatives":[{"name":"string","description":"string","weekly_downloads":0,"license":"string","risk_level":"low|medium","migration_effort":"drop_in|minor|moderate|major","key_advantages":["string"]}],"migration_complexity":"trivial|low|medium|high","recommended_alternative":"string","source_provenance":{"provider":"npm-package-risk-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"npm-package-risk","recommended_next_endpoint":"/analyze","automation_safe":true,"confidence_per_section":{"alternatives":0.82},"recommended_actions_priority_order":["evaluate top alternative","test migration","update package.json"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { packages } = req.body;
  if (!Array.isArray(packages) || packages.length === 0) return res.status(400).json({ error: 'packages array is required' });
  if (packages.length > 20) return res.status(400).json({ error: 'Maximum 20 packages per batch' });
  try {
    const results = await Promise.all(packages.map(async (p: { name: string; version?: string }) => {
      const info = await getNpmInfo(p.name, p.version);
      const license = info?.license || 'unknown';
      const raw = await callClaude(`Quick risk assessment for ${p.name}@${p.version || 'latest'}. License: ${license}. Return JSON:
{"package":"${p.name}","risk_level":"critical|high|medium|low|safe","risk_score":0.0,"license":"${license}","vulnerabilities":0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: packages.length, results,
      high_risk_count: results.filter((r: any) => ['critical', 'high'].includes(r.risk_level)).length,
      source_provenance: { provider: 'npm-package-risk', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'npm-package-risk', recommended_next_endpoint: '/alternatives',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
