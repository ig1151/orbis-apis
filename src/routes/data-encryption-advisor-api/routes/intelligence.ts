import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic data-encryption advisor. Maps supplied data categories +
// regulatory context + environment to an encryption rubric: classification level,
// at-rest / in-transit recommendations, per-category field-level handling, key-
// management guidance, and compliance notes. Rule-based, advisory — no LLM,
// nothing fetched or stored.

const router = Router();

type Level = 'public' | 'internal' | 'confidential' | 'restricted';
const CATEGORY_SEVERITY: Record<string, number> = {
  public: 0, general: 1, pii: 2, financial: 2, health: 2, phi: 3, pci: 3, credentials: 3, biometric: 3,
};
const ENVIRONMENTS = ['cloud', 'on_prem', 'hybrid'];
const FRAMEWORKS = ['gdpr', 'hipaa', 'pci-dss', 'ccpa', 'sox'];

const LEVELS: Level[] = ['public', 'internal', 'confidential', 'restricted'];
const SCORE_BY_LEVEL: Record<Level, number> = { public: 10, internal: 35, confidential: 70, restricted: 95 };
const ROTATION_BY_LEVEL: Record<Level, number | null> = { public: null, internal: 365, confidential: 180, restricted: 90 };

const FIELD_HANDLING: Record<string, string> = {
  pci: 'Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored.',
  credentials: 'Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials.',
  phi: 'Apply field/column-level encryption with strict access logging for electronic PHI.',
  pii: 'Field-level encryption or pseudonymization for direct identifiers; minimize and segregate.',
  biometric: 'Store only irreversible derived templates (hashed); never retain raw biometric samples.',
};
const COMPLIANCE_NOTE: Record<string, string> = {
  gdpr: 'GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope.',
  hipaa: 'HIPAA 45 CFR 164.312: encryption is an addressable safeguard for ePHI at rest and in transit.',
  'pci-dss': 'PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission.',
  ccpa: 'CCPA/CPRA: encryption and redaction of personal information can limit statutory-damages exposure after a breach.',
  sox: 'SOX: encrypt financial reporting data and enforce key-access separation of duties with audit logging.',
};

export interface AtRest { recommended: boolean; algorithm: string; key_bits: number; key_management: string; rotation_days: number | null; }
export interface InTransit { recommended: boolean; min_tls: string; mutual_tls: boolean; }
export interface FieldHandling { category: string; technique: string; }
export interface ComplianceNote { framework: string; note: string; }
export interface AdviceCore {
  classification: Level;
  sensitivity_score: number;
  categories: string[];
  at_rest: AtRest;
  in_transit: InTransit;
  field_level: FieldHandling[];
  key_management: string[];
  compliance_notes: ComplianceNote[];
  additional_controls: string[];
}

function advise(categories: string[], regulatory: string[], environment: string): AdviceCore {
  const maxSev = Math.max(...categories.map((c) => CATEGORY_SEVERITY[c]));
  const classification = LEVELS[maxSev];

  const kmBase = environment === 'on_prem' ? 'an on-prem HSM or self-managed KMS'
    : environment === 'hybrid' ? 'a cloud KMS bridged to an on-prem HSM' : 'a managed cloud KMS';
  const at_rest: AtRest = {
    recommended: maxSev >= 1,
    algorithm: 'AES-256-GCM',
    key_bits: 256,
    key_management: maxSev >= 3 ? `HSM-backed keys via ${kmBase} with envelope encryption` : `envelope encryption via ${kmBase}`,
    rotation_days: ROTATION_BY_LEVEL[classification],
  };
  const in_transit: InTransit = { recommended: true, min_tls: 'TLS 1.3', mutual_tls: maxSev >= 3 };

  const field_level: FieldHandling[] = categories
    .filter((c) => FIELD_HANDLING[c])
    .map((c) => ({ category: c, technique: FIELD_HANDLING[c] }));

  const key_management = [
    `Rotate data-encryption keys${at_rest.rotation_days ? ` every ${at_rest.rotation_days} days` : ' on a defined schedule'} and on suspected compromise.`,
    'Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.',
    'Enforce least-privilege and separation of duties for key access; log and alert on all key use.',
  ];
  const additional_controls = [
    'Encrypt backups, snapshots, and exports to the same standard as primary storage.',
    'Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).',
    maxSev >= 2 ? 'Restrict access on a need-to-know basis and retain access audit logs.' : 'Document the data classification and review it as the data set evolves.',
  ];

  const compliance_notes: ComplianceNote[] = regulatory.map((f) => ({ framework: f, note: COMPLIANCE_NOTE[f] }));

  return {
    classification, sensitivity_score: SCORE_BY_LEVEL[classification], categories,
    at_rest, in_transit, field_level, key_management, compliance_notes, additional_controls,
  };
}

function parse(body: any): { error: string } | { categories: string[]; regulatory: string[]; environment: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "data_categories" array.' };
  if (!Array.isArray(body.data_categories) || body.data_categories.length === 0) return { error: '"data_categories" must be a non-empty array.' };
  const cats = Object.keys(CATEGORY_SEVERITY);
  for (const c of body.data_categories) if (!cats.includes(c)) return { error: `data_categories contains "${c}"; allowed: ${cats.join(', ')}.` };
  const categories = [...new Set(body.data_categories as string[])];

  let regulatory: string[] = [];
  if (body.regulatory !== undefined) {
    if (!Array.isArray(body.regulatory) || !body.regulatory.every((f: unknown) => FRAMEWORKS.includes(f as string))) {
      return { error: `"regulatory" must be an array drawn from: ${FRAMEWORKS.join(', ')}.` };
    }
    regulatory = [...new Set(body.regulatory as string[])];
  }
  let environment = 'cloud';
  if (body.environment !== undefined) {
    if (!ENVIRONMENTS.includes(body.environment)) return { error: `"environment" must be one of: ${ENVIRONMENTS.join(', ')}.` };
    environment = body.environment;
  }
  return { categories, regulatory, environment };
}

const CHAIN_TO = [
  { api: 'sensitive-data-detector', reason: 'Find the actual PII spans in your payloads that these controls should protect.' },
  { api: 'jwt-claims-designer', reason: 'Design token claims that avoid embedding the sensitive data covered here.' },
];
const INVALIDATORS = [
  'Recommendations are a deterministic rubric mapped from the supplied categories/regulatory/environment — they are general best-practice guidance, NOT legal advice or a substitute for a compliance assessment.',
  'Classification is the maximum severity across the supplied categories; categories not provided are not considered, and credentials are flagged for one-way hashing rather than reversible encryption.',
  'Compliance notes summarize common obligations for the named frameworks at a high level; consult the controlling regulation and your DPO/auditor for specifics.',
];

const TAIL = (r: AdviceCore) => ({
  confidence_score: 0.8, confidence_per_section: { classification: 1, recommendations: 0.8 },
  recommended_actions_priority_order: [
    `Classification: ${r.classification} (sensitivity ${r.sensitivity_score}/100). Encrypt at rest with ${r.at_rest.algorithm}; ${r.in_transit.min_tls}${r.in_transit.mutual_tls ? ' + mTLS' : ''} in transit.`,
    r.field_level.length ? `Apply field-level handling for: ${r.field_level.map((f) => f.category).join(', ')}.` : 'No category-specific field handling required.',
    r.at_rest.rotation_days ? `Rotate keys every ${r.at_rest.rotation_days} days via ${r.at_rest.key_management}.` : 'Define a key-rotation schedule appropriate to the data.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Encryption Advisor API', version: '1.0.0',
    description: 'Deterministic data-encryption advisor. Maps data categories + regulatory context + environment to an encryption rubric: classification, at-rest/in-transit recommendations, per-category field handling, key-management guidance, and compliance notes. Rule-based, advisory. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-encryption-advisor/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/advise', summary: 'Get an encryption rubric for the supplied data', price_usdc: 0.009 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL advice + reasoning', price_usdc: 0.016 },
    ],
    pricing: [
      { path: '/advise', price_usdc: 0.009, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.016, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/advise', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = advise(p.categories, p.regulatory, p.environment);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = advise(p.categories, p.regulatory, p.environment);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Classified ${r.categories.length} category(ies) as ${r.classification}; produced at-rest/in-transit/field-level/key-management guidance${r.compliance_notes.length ? ` and ${r.compliance_notes.length} compliance note(s)` : ''}.`,
      key_factors: [
        `Highest-severity category drives classification ${r.classification}.`,
        `In-transit mTLS ${r.in_transit.mutual_tls ? 'required (restricted data)' : 'not required at this level'}; key rotation ${r.at_rest.rotation_days ?? 'scheduled'} day(s).`,
        `Field-level handling for: ${r.field_level.map((f) => f.category).join(', ') || 'none'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
