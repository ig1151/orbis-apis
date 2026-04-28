const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','dispostable.com','mailnull.com',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org','spamgourmet.com','maildrop.cc',
  'tempinbox.com','fakeinbox.com','mailnesia.com','mailnull.com','spamfree24.org',
  'discard.email','spamhereplease.com','spamthisplease.com','sendspamhere.com',
  'mytrashmail.com','trashdevil.com','trashdevil.de','mailexpire.com','spammotel.com',
  '10minutemail.com','10minutemail.net','20minutemail.com','emailondeck.com','tempail.com',
  'throwam.com','tempr.email','discard.email','spamgob.com','getairmail.com',
  'filzmail.com','throwam.com','spamgob.com','zzrgg.com','spam.la',
  'mailscrap.com','spamfree.eu','getonemail.com','spamfree24.de','spamfree24.eu',
]);

const FREE_PROVIDERS = new Set([
  'gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com',
  'protonmail.com','mail.com','zoho.com','gmx.com','yandex.com','live.com',
  'msn.com','me.com','mac.com','googlemail.com','yahoo.co.uk','yahoo.co.in',
]);

const ROLE_BASED_PREFIXES = new Set([
  'admin','info','support','help','contact','sales','billing','noreply','no-reply',
  'webmaster','postmaster','abuse','security','privacy','legal','hr','jobs','careers',
  'marketing','newsletter','notifications','alerts','donotreply','do-not-reply',
]);

export function isDisposable(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

export function isFreeProvider(domain: string): boolean {
  return FREE_PROVIDERS.has(domain.toLowerCase());
}

export function isRoleBased(username: string): boolean {
  return ROLE_BASED_PREFIXES.has(username.toLowerCase().split('+')[0]);
}
