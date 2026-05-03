import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { extractStructuredData, extractEntities } from '../services/extractorService';

const router = Router();

router.post('/extract', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({
    text: Joi.string().min(10).max(10000).required(),
    schema: Joi.string().min(3).max(500).required(),
  }).validate(req.body);

  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await extractStructuredData(value.text, value.schema);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[text-extractor] extract error: ${err.message}`);
    res.status(502).json({ error: 'Extraction failed', detail: err.message });
  }
});

router.post('/entities', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({
    text: Joi.string().min(10).max(10000).required(),
  }).validate(req.body);

  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await extractEntities(value.text);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[text-extractor] entities error: ${err.message}`);
    res.status(502).json({ error: 'Entity extraction failed', detail: err.message });
  }
});

export default router;
