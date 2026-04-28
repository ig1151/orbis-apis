import Joi from 'joi';
export const scoreSchema = Joi.object({
  email: Joi.string().optional(),
  phone: Joi.string().optional(),
  domain: Joi.string().optional(),
  company_name: Joi.string().optional(),
  ip: Joi.string().optional(),
}).or('email', 'domain', 'company_name').messages({
  'object.missing': 'At least one of email, domain, or company_name is required',
});
export const batchSchema = Joi.object({
  leads: Joi.array().items(scoreSchema).min(1).max(20).required().messages({ 'array.max': 'Batch endpoint accepts a maximum of 20 leads per request' }),
});
