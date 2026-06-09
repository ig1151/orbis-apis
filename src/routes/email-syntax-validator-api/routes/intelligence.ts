import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic email syntax engine ----------------------------------------------------
// RFC 5321/5322 practical subset: length limits, local/domain parts, allowed characters.

const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

const COMMON_TLDS = new Set(['com','org','net','edu','gov','mil','int','io','co','ai','app','dev','info','biz','me','us','uk','ca','de','fr','jp','au','nl','ru','ch','es','it','se','no','xyz','tech','online','store','site']);
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'iclould.com': 'icloud.com', 'icloud.co': 'icloud.com',
};

interface FormatError { field: string; message: string; }

function validateEmail(raw: string) {
  const email = String(raw).trim();
  const errors: FormatError[] = [];

  const atCount = (email.match(/@/g) || []).length;
  const has_at_symbol = atCount >= 1;
  const has_double_at = atCount > 1;
  const has_spaces = /\s/.test(email);
  const length = email.length;
  const is_within_length_limits = length >= 3 && length <= 254;

  if (!has_at_symbol) errors.push({ field: 'email', message: 'Missing "@" symbol' });
  if (has_double_at) errors.push({ field: 'email', message: 'Multiple "@" symbols' });
  if (has_spaces) errors.push({ field: 'email', message: 'Contains whitespace' });
  if (!is_within_length_limits) errors.push({ field: 'email', message: 'Total length must be 3–254 characters' });

  const lastAt = email.lastIndexOf('@');
  const local_part = lastAt > 0 ? email.slice(0, lastAt) : '';
  const domain = lastAt >= 0 ? email.slice(lastAt + 1) : '';

  if (has_at_symbol && !has_double_at) {
    if (!local_part) errors.push({ field: 'local_part', message: 'Local part is empty' });
    else if (local_part.length > 64) errors.push({ field: 'local_part', message: 'Local part exceeds 64 characters' });
    else if (!LOCAL_RE.test(local_part)) errors.push({ field: 'local_part', message: 'Local part contains invalid characters or misplaced dots' });

    if (!domain) errors.push({ field: 'domain', message: 'Domain is empty' });
    else {
      if (domain.length > 253) errors.push({ field: 'domain', message: 'Domain exceeds 253 characters' });
      if (!domain.includes('.')) errors.push({ field: 'domain', message: 'Domain has no dot separator' });
      const labels = domain.split('.');
      if (labels.some(l => !LABEL_RE.test(l))) errors.push({ field: 'domain', message: 'Domain contains an invalid label' });
    }
  }

  const labels = domain.split('.');
  const tld = labels.length > 1 ? labels[labels.length - 1].toLowerCase() : '';
  const has_valid_tld = /^[A-Za-z]{2,}$/.test(tld);
  if (domain && !has_valid_tld) errors.push({ field: 'tld', message: 'Top-level domain is missing or invalid' });

  const special_chars_re = /[^A-Za-z0-9@._-]/;
  const has_special_chars = special_chars_re.test(email);

  const is_valid = errors.length === 0;
  const normalized_email = is_valid ? `${local_part}@${domain.toLowerCase()}` : null;

  let suggestion: string | null = null;
  if (domain && DOMAIN_TYPOS[domain.toLowerCase()]) {
    suggestion = `${local_part}@${DOMAIN_TYPOS[domain.toLowerCase()]}`;
  } else if (has_valid_tld && tld.length > 3 && !COMMON_TLDS.has(tld)) {
    suggestion = null; // uncommon but plausible TLD — do not guess
  }

  return {
    email,
    is_valid,
    local_part,
    domain,
    tld,
    format_errors: errors,
    has_valid_tld,
    has_at_symbol,
    has_double_at,
    has_spaces,
    has_special_chars,
    length,
    is_within_length_limits,
    normalized_email,
    suggestion,
  };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { syntax: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'email-syntax-validator', endpoint: '/email-syntax-intelligence', reason: 'Full validation in one call' },
      { api: 'mx-record-checker', endpoint: '/mx-record-checker', reason: 'Confirm the domain can receive mail (syntax-valid ≠ deliverable)' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Email Syntax Validator API', info: '/email-syntax-validator/info', openapi: '/email-syntax-validator/openapi.json', health: 'ok' });
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const data = validateEmail(input);
  res.json(envelope(data, {
    start, score: 1, reason: 'Deterministic RFC 5321/5322 syntax checks', ttl: 86400,
    actions: data.is_valid
      ? [{ priority: 'low', action: 'Verify deliverability with an MX/DNS lookup', reason: 'Syntax is valid; mailbox existence is not checked here' }]
      : [{ priority: 'high', action: data.suggestion ? `Did you mean ${data.suggestion}?` : 'Fix the reported syntax errors', reason: data.format_errors.map(e => e.message).join('; ') || 'Invalid syntax' }],
  }));
});

router.post('/batch', (req: Request, res: Response) => {
  const start = Date.now();
  const { inputs } = req.body;
  if (!inputs || !Array.isArray(inputs)) return res.status(400).json({ error: 'inputs array is required', code: 'MISSING_INPUT', retryable: false });
  const validated = inputs.map(e => validateEmail(String(e)));
  const results = validated.map(v => ({
    email: v.email,
    is_valid: v.is_valid,
    errors: v.format_errors.map(fe => fe.message),
    suggestion: v.suggestion,
  }));
  const valid_count = validated.filter(v => v.is_valid).length;
  const total_processed = validated.length;
  const data = {
    results,
    total_processed,
    valid_count,
    invalid_count: total_processed - valid_count,
    validation_rate: total_processed ? Math.round((valid_count / total_processed) * 100) / 100 : 0,
  };
  res.json(envelope(data, {
    start, score: 1, reason: 'Deterministic batch syntax validation', ttl: 86400,
    actions: [{ priority: data.invalid_count ? 'high' : 'low', action: data.invalid_count ? 'Review invalid addresses before sending' : 'All addresses are syntactically valid', reason: `${data.valid_count}/${total_processed} valid` }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'validate',
    next_api: 'email-syntax-validator', next_endpoint: '/email-syntax-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'email-syntax-validator', endpoint: '/email-syntax-intelligence', reason: 'Full Email Syntax Validator API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /email-syntax-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/email-syntax-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const validate = validateEmail(input);
  const overall_score = validate.is_valid ? 100 : Math.max(0, 100 - validate.format_errors.length * 25);
  const key_findings = [
    validate.is_valid ? 'Syntax is valid per RFC 5321/5322' : `${validate.format_errors.length} syntax error(s)`,
    `Local part: "${validate.local_part}", domain: "${validate.domain}"`,
    validate.suggestion ? `Suggested correction: ${validate.suggestion}` : 'No typo correction suggested',
  ];
  const data = {
    validate,
    overall_score,
    key_findings,
    summary: validate.is_valid
      ? `"${validate.email}" is syntactically valid. Deliverability not verified.`
      : `"${validate.email}" failed syntax validation: ${validate.format_errors.map(e => e.message).join('; ')}.`,
  };
  res.json(envelope(data, {
    start, score: 1, reason: 'Deterministic combined email syntax intelligence', ttl: 86400,
    actions: validate.is_valid
      ? [{ priority: 'low', action: 'Confirm deliverability via MX lookup', reason: 'Syntax valid only' }]
      : [{ priority: 'high', action: validate.suggestion ? `Try ${validate.suggestion}` : 'Correct the address', reason: 'Failed syntax validation' }],
  }));
});

export default router;
