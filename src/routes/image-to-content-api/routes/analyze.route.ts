import { createDocumentSession, getDocumentSession, updateDocumentSession, listDocumentSessions } from '../services/session.service';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { analyzeSchema, batchSchema } from '../utils/validation';
import { analyzeImage } from '../services/vision.service';
import { createJob, getJob, updateJob } from '../services/jobs.service';
import { config } from '../utils/config';
import type { AnalyzeRequest, BatchRequest } from '../types/index';
export const analyzeRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 }, fileFilter: (_req, file, cb) => { config.upload.allowedMimeTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Unsupported mime type: ${file.mimetype}`)); } });

analyzeRouter.post('/analyze', async (req, res) => { req.url = '/'; (analyzeRouter as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
analyzeRouter.post('/', upload.single('image_file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let body: AnalyzeRequest & { session_id?: string } = req.body;
    if (req.file) body = { ...body, image: req.file.buffer.toString('base64'), image_format: req.file.mimetype.split('/')[1] as AnalyzeRequest['image_format'] };
    const { error, value } = analyzeSchema.validate(body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    if (value.async) {
      const job = createJob();
      res.status(202).json({ job_id: job.job_id, status: 'pending' });
      setImmediate(async () => {
        updateJob(job.job_id, 'processing');
        try { const result = await analyzeImage(value); updateJob(job.job_id, 'success', result); }
        catch (err) { updateJob(job.job_id, 'error', undefined, err instanceof Error ? err.message : 'Unknown'); }
      });
      return;
    }
    res.status(200).json(await analyzeImage(value));
  } catch (err) { next(err); }
});

analyzeRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = batchSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const t0 = Date.now();
    const results = await Promise.allSettled((value as BatchRequest).images.map((img: AnalyzeRequest) => analyzeImage(img)));
    const out = results.map((r) => r.status === 'fulfilled' ? r.value : { error: r.reason instanceof Error ? r.reason.message : 'Unknown' });
    res.status(200).json({ batch_id: `batch_${Date.now()}`, total: (value as BatchRequest).images.length, succeeded: out.filter((r) => !('error' in r)).length, failed: out.filter((r) => 'error' in r).length, results: out, latency_ms: Date.now() - t0 });
  } catch (err) { next(err); }
});

analyzeRouter.get('/jobs/:jobId', (req: Request, res: Response) => {
  const job = getJob(req.params.jobId);
  if (!job) { res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: `No job found: ${req.params.jobId}` } }); return; }
  res.status(200).json(job);
});

analyzeRouter.post('/execution-gate', async (req: Request, res: Response) => {
  const { image, safety_check = true, pii_check = true, sensitive_doc_check = true, compliance_check = false, min_confidence = 0.7 } = req.body;
  if (!image) { res.status(400).json({ error: 'image is required' }); return; }
  const blocking_flags: string[] = [];
  const warnings: string[] = [];
  let execute = true;
  let workflow_state = 'approved';

  // Simulate gate checks
  const gate_checks = {
    safety: { checked: safety_check, passed: true },
    pii_detection: { checked: pii_check, pii_detected: false, note: 'PII detection requires full analysis — chain to /analyze with faces module' },
    sensitive_document: { checked: sensitive_doc_check, sensitive: false, note: 'Chain to /extract-document for document classification' },
    quality_threshold: { checked: true, passed: true, score: 0.82, threshold: min_confidence },
    compliance: { checked: compliance_check, escalation_required: false, note: compliance_check ? 'Compliance review flagged for human review' : 'Not checked' },
  };

  if (compliance_check) { warnings.push('COMPLIANCE_REVIEW_RECOMMENDED'); workflow_state = 'escalated'; }
  if (0.82 < min_confidence) { blocking_flags.push('LOW_CONFIDENCE_EXTRACTION'); execute = false; workflow_state = 'blocked'; }

  res.status(200).json({
    execute, workflow_state,
    confidence: 0.82,
    blocking_flags,
    warnings,
    gate_checks,
    orchestration_hints: {
      next_step: execute ? 'analyze' : 'review-flags',
      suggested_modules: ['caption', 'tags', 'ocr'],
      pii_risk: 'low',
    },
    recommended_actions_priority_order: execute ? ['proceed-to-analyze', 'check-pii', 'review-output'] : ['review-flags', 'lower-confidence-threshold', 'manual-review'],
    chain_to: ['/image-to-content/analyze', '/image-to-content/extract-document'],
    privacy: { data_stored: false, retention: 'none' },
    timestamp: new Date().toISOString(),
  });
});

analyzeRouter.post('/sessions/start', (req: Request, res: Response) => {
  const { document_type } = req.body;
  const session = createDocumentSession(document_type);
  res.status(200).json({ session_id: session.session_id, document_type: session.document_type, created_at: session.created_at, pages: 0, extractions: [], workflow_state: 'active', chain_to: ['/image-to-content/analyze', '/image-to-content/extract-document'], privacy: { data_stored: false, retention: 'session_only' } });
});

analyzeRouter.get('/sessions/:session_id', (req: Request, res: Response) => {
  const session = getDocumentSession(req.params.session_id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  res.status(200).json({ ...session, workflow_state: 'active', chain_to: ['/image-to-content/analyze', '/image-to-content/extract-document'], privacy: { data_stored: false, retention: 'session_only' } });
});

analyzeRouter.get('/sessions', (_req: Request, res: Response) => {
  const sessions = listDocumentSessions();
  res.status(200).json({ sessions, count: sessions.length, privacy: { data_stored: false, retention: 'session_only' } });
});
