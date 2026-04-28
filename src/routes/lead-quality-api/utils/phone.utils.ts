import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function analyzePhone(phone: string, countryCode?: string) {
  try {
    const parsed = parsePhoneNumberFromString(phone, countryCode as never);
    if (!parsed) return { valid: false, line_type: 'unknown', is_voip: false };
    const type = parsed.getType();
    const lineType = type === 'MOBILE' ? 'mobile' : type === 'FIXED_LINE' ? 'landline' : type === 'VOIP' ? 'voip' : type === 'TOLL_FREE' ? 'toll_free' : type === 'FIXED_LINE_OR_MOBILE' ? 'mobile' : 'unknown';
    return { valid: parsed.isValid(), line_type: lineType, is_voip: lineType === 'voip' };
  } catch { return { valid: false, line_type: 'unknown', is_voip: false }; }
}
