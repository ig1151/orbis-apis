import Joi from 'joi';
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:)*:[0-9a-fA-F]{1,4}$/;
export const lookupSchema = Joi.object({
  ip: Joi.string().required().messages({ 'any.required': 'ip is required' }),
  fields: Joi.array().items(Joi.string().valid('location', 'network', 'risk')).optional(),
});
export const batchSchema = Joi.object({
  ips: Joi.array().items(lookupSchema).min(1).max(50).required().messages({ 'array.max': 'Batch endpoint accepts a maximum of 50 IPs per request' }),
});
export function isValidIP(ip: string): boolean {
  return IP_REGEX.test(ip);
}
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}
