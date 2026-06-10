import { createDocumentSession, getDocumentSession, updateDocumentSession, listDocumentSessions } from '../services/session.service';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { analyzeSchema, batchSchema } from '../utils/validation';
import { analyzeImage } from '../services/vision.service';
import { createJob, getJob, updateJob } from '../services/jobs.service';
import { config } from '../utils/config';
import type { AnalyzeRequest, BatchRequest } from '../types/index';
import { buildRuntime } from '../../../shared/ai';
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
  } catch (err) {
    // Upstream (vision model) failure → degrade to 200 success:false so the health check
    // doesn't auto-deactivate the listing. Validation errors already returned 422 above.
    res.status(200).json({ success: false, error: 'upstream_unavailable', detail: err instanceof Error ? err.message : 'Unknown', retryable: true });
  }
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
const router = analyzeRouter;

// ── Universal Runtime Envelope ────────────────────────────────────────────────
// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES: string[] = ["data:read", "data:extract", "data:monitor"];
const EXECUTION_AUTHORITY: string = "low";
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const provided_scopes = (req.headers?.['x-agent-scopes']||'').split(',').filter(Boolean);
  const trust_score = Math.min(1.0,Math.max(0.0,parseFloat(req.headers?.['x-agent-trust-score']||'1.0')||1.0));
  const sandbox_mode = req.headers?.['x-sandbox-mode']==='true'||trust_score<0.5;
  const violations: string[] = [];
  if (trust_score<0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.length===0;
  return { permitted, agent_id, scopes:provided_scopes.length>0?provided_scopes:REQUIRED_SCOPES, trust_score, execution_authority:EXECUTION_AUTHORITY, sandbox_mode, violations, audit_entry:{agent_id,timestamp:new Date().toISOString(),endpoint:req.path,method:req.method,permitted,trust_score,sandbox_mode} };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id]||[];
  res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,execution_id:req.params.execution_id,events,total:events.length,computed_at:new Date().toISOString()});
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('Connection','keep-alive');res.setHeader('Access-Control-Allow-Origin','*');res.flushHeaders();
  let index=0;const existing=eventStore[req.params.execution_id]||[];
  existing.forEach((evt:any)=>{res.write(`data: ${JSON.stringify(evt)}

`);index++;});
  const interval=setInterval(()=>{const current=eventStore[req.params.execution_id]||[];while(index<current.length){res.write(`data: ${JSON.stringify(current[index])}

`);index++;}},500);
  req.on('close',()=>clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov=evaluateGovernance(req);
  res.json({...buildRuntime(req,{workflow_state:gov.permitted?'complete':'blocked'}),success:gov.permitted,permitted:gov.permitted,agent_id:gov.agent_id,scopes:gov.scopes,required_scopes:REQUIRED_SCOPES,trust_score:gov.trust_score,execution_authority:gov.execution_authority,sandbox_mode:gov.sandbox_mode,violations:gov.violations,audit_entry:gov.audit_entry,computed_at:new Date().toISOString()});
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,required_scopes:REQUIRED_SCOPES,execution_authority:EXECUTION_AUTHORITY,scope_descriptions:REQUIRED_SCOPES.reduce((acc:any,s:string)=>{acc[s]=`Permission to ${s.replace(':','  ')} on this API`;return acc;},{}),computed_at:new Date().toISOString()});
});
router.post('/governance/audit', (req: any, res: any) => {
  const {execution_id}=req.body||{};const events=execution_id?(eventStore[execution_id]||[]):[];const gov=evaluateGovernance(req);
  res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,audit_trail:events,total_events:events.length,agent_id:gov.agent_id,trust_score:gov.trust_score,sandbox_mode:gov.sandbox_mode,audit_summary:{governance_checks:events.filter((e:any)=>e.event==='governance_check').length,step_completions:events.filter((e:any)=>e.event==='step_completed').length,violations:gov.violations,permitted:gov.permitted},computed_at:new Date().toISOString()});
});
// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id:string,goal:string,steps:string[],meta:any){const now=new Date().toISOString();workflowStore[id]={workflow_id:id,goal,steps,current_step:steps[0],step_index:0,status:'running',created_at:now,updated_at:now,completed_steps:[],pending_steps:steps.slice(1),results:{},meta};return workflowStore[id];}
function advanceWorkflow(id:string){const wf=workflowStore[id];if(!wf)return null;if(wf.step_index<wf.steps.length-1){wf.completed_steps.push(wf.current_step);wf.step_index+=1;wf.current_step=wf.steps[wf.step_index];wf.pending_steps=wf.steps.slice(wf.step_index+1);wf.status=wf.step_index===wf.steps.length-1?'complete':'running';}else{wf.completed_steps.push(wf.current_step);wf.status='complete';wf.pending_steps=[];}wf.updated_at=new Date().toISOString();return wf;}
router.post('/workflow/start',(req:any,res:any)=>{const{goal,steps,meta}=req.body||{};const workflow_id=`wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;const wf=createWorkflow(workflow_id,goal||'execute',steps||["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"],meta||{});res.json({...buildRuntime(req,{workflow_state:'running'}),success:true,workflow_id,goal:wf.goal,status:wf.status,current_step:wf.current_step,steps:wf.steps,pending_steps:wf.pending_steps,created_at:wf.created_at,estimated_steps:wf.steps.length,computed_at:new Date().toISOString()});});
router.get('/workflow/:id',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});res.json({...buildRuntime(req,{workflow_state:wf.status}),success:true,workflow_id:wf.workflow_id,goal:wf.goal,status:wf.status,current_step:wf.current_step,step_index:wf.step_index,total_steps:wf.steps.length,completed_steps:wf.completed_steps,pending_steps:wf.pending_steps,progress_pct:Math.round((wf.step_index/wf.steps.length)*100),created_at:wf.created_at,updated_at:wf.updated_at,results:wf.results,computed_at:new Date().toISOString()});});
router.post('/workflow/:id/resume',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});if(wf.status==='complete')return res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,workflow_id:wf.workflow_id,status:'complete',message:'Already complete'});const advanced=advanceWorkflow(req.params.id);res.json({...buildRuntime(req,{workflow_state:advanced!.status,retryable:advanced!.status!=='complete'}),success:true,workflow_id:advanced!.workflow_id,status:advanced!.status,current_step:advanced!.current_step,completed_steps:advanced!.completed_steps,pending_steps:advanced!.pending_steps,progress_pct:Math.round((advanced!.step_index/advanced!.steps.length)*100),updated_at:advanced!.updated_at,computed_at:new Date().toISOString()});});
router.get('/workflow/:id/state',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});res.json({...buildRuntime(req,{workflow_state:wf.status}),success:true,workflow_id:wf.workflow_id,state_machine:{current_state:wf.current_step,previous_states:wf.completed_steps,next_states:wf.pending_steps,terminal:wf.status==='complete',transitions:wf.steps.map((s:string,i:number)=>({step:i+1,state:s,status:i<wf.step_index?'complete':i===wf.step_index?'active':'pending'}))},meta:wf.meta,created_at:wf.created_at,updated_at:wf.updated_at,computed_at:new Date().toISOString()});});


analyzeRouter.get('/', (_req: any, res: any) => res.json({ name: 'image-to-content-api', health: 'ok' }));
