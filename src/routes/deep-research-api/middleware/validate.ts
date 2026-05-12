import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export function validate(schema: Joi.ObjectSchema, source: 'query' | 'body' = 'query') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(source === 'body' ? req.body : req.query);
    if (error) {
      res.status(400).json({ error: 'Validation error', details: error.details.map((d) => d.message) });
      return;
    }
    next();
  };
}
