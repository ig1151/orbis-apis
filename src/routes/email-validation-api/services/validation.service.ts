import { promises as dnsPromises } from 'dns';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { isDisposable, isFreeProvider, isRoleBased } from '../utils/disposable';
import type { ValidateRequest, ValidationResult, MxRecord, EmailStatus } from '../types/index';

const resolveMx = dnsPromises.resolveMx;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const COMMON_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'hotmai.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outook.com': 'outlook.com', 'outlook.co': 'outlook.com',
  'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com',
};

function suggestCorrection(email: string): string | undefined {
  const [username, domain] = email.split('@');
  const suggestion = COMMON_TYPOS[domain?.toLowerCase()];
  return suggestion ? `${username}@${suggestion}` : undefined;
}

function calculateScore(checks: ValidationResult['checks'], disposable: boolean, roleBased: boolean, spamTrap: boolean): number {
  let score = 100;
  if (!checks.format) score -= 50;
  if (!checks.mx) score -= 30;
  if (disposable) score -= 40;
  if (spamTrap) score -= 40;
  if (roleBased) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function determineStatus(score: number, checks: ValidationResult['checks']): EmailStatus {
  if (!checks.format) return 'invalid';
  if (!checks.mx) return 'invalid';
  if (score >= 70) return 'valid';
  if (score >= 40) return 'risky';
  return 'invalid';
}

export async function validateEmail(req: ValidateRequest): Promise<ValidationResult> {
  const t0 = Date.now();
  const email = req.email.trim().toLowerCase();
  const id = uuidv4().slice(0, 8);

  logger.info({ id, email }, 'Starting email validation');

  const formatValid = EMAIL_REGEX.test(email);
  const parts = email.split('@');
  const username = parts[0] ?? '';
  const domain = parts[1] ?? '';

  let mxFound = false;
  let mxRecords: MxRecord[] = [];

  if (formatValid && req.check_mx !== false) {
    try {
      const records = await resolveMx(domain);
      mxRecords = records
        .sort((a, b) => a.priority - b.priority)
        .map(r => ({ exchange: r.exchange, priority: r.priority }));
      mxFound = mxRecords.length > 0;
    } catch {
      mxFound = false;
    }
  }

  const disposable = req.check_disposable !== false ? isDisposable(domain) : false;
  const freeProvider = isFreeProvider(domain);
  const roleBased = isRoleBased(username);
  const spamTrapLikely = req.check_spam_trap !== false ? (
    username.includes('spam') ||
    username.includes('trap') ||
    username.includes('honeypot') ||
    /^[a-z]{20,}$/.test(username) ||
    /^\d{10,}$/.test(username)
  ) : false;

  const checks = {
    format: formatValid,
    mx: mxFound,
    disposable: !disposable,
    spam_trap: !spamTrapLikely,
  };

  const score = calculateScore(checks, disposable, roleBased, spamTrapLikely);
  const status = determineStatus(score, checks);
  const didYouMean = suggestCorrection(email);

  logger.info({ id, status, score }, 'Validation complete');

  return {
    email,
    status,
    score,
    format_valid: formatValid,
    mx_found: mxFound,
    mx_records: mxRecords,
    disposable,
    free_provider: freeProvider,
    role_based: roleBased,
    spam_trap_likely: spamTrapLikely,
    domain,
    username,
    ...(didYouMean && { did_you_mean: didYouMean }),
    checks,
    latency_ms: Date.now() - t0,
    created_at: new Date().toISOString(),
  };
}
