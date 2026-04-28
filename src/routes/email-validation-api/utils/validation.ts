import Joi from 'joi';
export const validateSchema = Joi.object({
  email: Joi.string().required().messages({ 'any.required': 'email is required' }),
  check_mx: Joi.boolean().default(true),
  check_disposable: Joi.boolean().default(true),
  check_spam_trap: Joi.boolean().default(true),
});
export const batchSchema = Joi.object({
  emails: Joi.array().items(validateSchema).min(1).max(100).required().messages({ 'array.max': 'Batch endpoint accepts a maximum of 100 emails per request' }),
});
