import { promises as dnsPromises } from 'dns';

const DISPOSABLE = new Set(['mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com','trashmail.com','maildrop.cc','10minutemail.com','tempinbox.com','fakeinbox.com','discard.email','spam4.me']);
const FREE = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','protonmail.com','mail.com','zoho.com','gmx.com','live.com','me.com','googlemail.com']);
const ROLE = new Set(['admin','info','support','help','contact','sales','billing','noreply','no-reply','webmaster','postmaster','abuse','security','marketing','newsletter']);

export async function analyzeEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const formatValid = emailRegex.test(email);
  const [username, domain] = email.split('@');
  let mxFound = false;
  if (formatValid && domain) {
    try { const mx = await dnsPromises.resolveMx(domain); mxFound = mx.length > 0; } catch { mxFound = false; }
  }
  return {
    valid: formatValid && mxFound,
    disposable: DISPOSABLE.has(domain?.toLowerCase() ?? ''),
    free_provider: FREE.has(domain?.toLowerCase() ?? ''),
    role_based: ROLE.has((username ?? '').toLowerCase().split('+')[0]),
    domain: domain ?? '',
    is_business: !FREE.has(domain?.toLowerCase() ?? '') && !DISPOSABLE.has(domain?.toLowerCase() ?? '') && mxFound,
  };
}
