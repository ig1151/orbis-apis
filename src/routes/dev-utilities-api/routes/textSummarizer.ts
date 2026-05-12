import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { logger } from '../logger';
import { buildRuntime } from '../../../shared/ai';

const router = Router();

const schema = Joi.object({
  text: Joi.string().min(50).max(50000).required(),
  format: Joi.string().valid('bullets', 'paragraph', 'tldr', 'headline').default('bullets'),
  max_length: Joi.number().integer().min(50).max(500).default(150),
  language: Joi.string().max(50).optional(),
});

async function callClaude(prompt: string): Promise<string> {
  
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: 'anthropic/claude-sonnet-4-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] },
    { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );
  return res.data.choices[0].message.content ?? '';
}

router.post('/summarize', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }

  const start = Date.now();
  const formatInstructions: Record<string, string> = {
    bullets: `Return a JSON object: { "summary": ["bullet point 1", "bullet point 2", "bullet point 3"], "format": "bullets" }`,
    paragraph: `Return a JSON object: { "summary": "paragraph summary", "format": "paragraph" }`,
    tldr: `Return a JSON object: { "summary": "one sentence TL;DR", "format": "tldr" }`,
    headline: `Return a JSON object: { "summary": "headline style summary under 10 words", "format": "headline" }`,
  };

  const prompt = `Summarize the following text in ${value.max_length} words or less.
${value.language ? `Respond in ${value.language}.` : ''}
${formatInstructions[value.format]}
Only return the JSON object, no markdown.

Text:
${value.text.slice(0, 8000)}`;

  try {
    const raw = await callClaude(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const wordCount = typeof parsed.summary === 'string' ? parsed.summary.split(' ').length : (parsed.summary as string[]).join(' ').split(' ').length;
    logger.info({ format: value.format, wordCount }, 'Text summarized');
    res.json({ ...parsed, word_count: wordCount, original_length: value.text.length, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    res.status(500).json({ error: 'Summarization failed', details: message });
  }
});


// ── Universal Runtime Envelope ────────────────────────────────────────────────
// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES: string[] = ["productivity:read", "productivity:generate", "productivity:execute"];
const EXECUTION_AUTHORITY: string = "low";
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id']||req.body?.agent_id||null;
  const provided_scopes = (req.headers?.['x-agent-scopes']||'').split(',').filter(Boolean);
  const trust_score = Math.min(1.0,Math.max(0.0,parseFloat(req.headers?.['x-agent-trust-score']||'1.0')||1.0));
  const sandbox_mode = req.headers?.['x-sandbox-mode']==='true'||trust_score<0.5;
  const violations: string[] = [];
  if (trust_score<0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.length===0;
  return { permitted, agent_id, scopes:provided_scopes.length>0?provided_scopes:REQUIRED_SCOPES, trust_score, execution_authority:EXECUTION_AUTHORITY, sandbox_mode, violations, audit_entry:{agent_id,timestamp:new Date().toISOString(),endpoint:req.path,method:req.method,permitted,trust_score,sandbox_mode} };
}
router.get('/events/:execution_id',(req:any,res:any)=>{const events=eventStore[req.params.execution_id]||[];res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,execution_id:req.params.execution_id,events,total:events.length,computed_at:new Date().toISOString()});});
router.get('/events/:execution_id/stream',(req:any,res:any)=>{res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('Connection','keep-alive');res.setHeader('Access-Control-Allow-Origin','*');res.flushHeaders();let index=0;const existing=eventStore[req.params.execution_id]||[];existing.forEach((evt:any)=>{res.write(`data: ${JSON.stringify(evt)}

`);index++;});const interval=setInterval(()=>{const current=eventStore[req.params.execution_id]||[];while(index<current.length){res.write(`data: ${JSON.stringify(current[index])}

`);index++;}},500);req.on('close',()=>clearInterval(interval));});
router.post('/governance/check',(req:any,res:any)=>{const gov=evaluateGovernance(req);res.json({...buildRuntime(req,{workflow_state:gov.permitted?'complete':'blocked'}),success:gov.permitted,permitted:gov.permitted,agent_id:gov.agent_id,scopes:gov.scopes,required_scopes:REQUIRED_SCOPES,trust_score:gov.trust_score,execution_authority:gov.execution_authority,sandbox_mode:gov.sandbox_mode,violations:gov.violations,audit_entry:gov.audit_entry,computed_at:new Date().toISOString()});});
router.get('/governance/scopes',(req:any,res:any)=>{res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,required_scopes:REQUIRED_SCOPES,execution_authority:EXECUTION_AUTHORITY,scope_descriptions:REQUIRED_SCOPES.reduce((acc:any,s:string)=>{acc[s]=`Permission to ${s.replace(':',' ')} on this API`;return acc;},{}),computed_at:new Date().toISOString()});});
router.post('/governance/audit',(req:any,res:any)=>{const{execution_id}=req.body||{};const events=execution_id?(eventStore[execution_id]||[]):[];const gov=evaluateGovernance(req);res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,audit_trail:events,total_events:events.length,agent_id:gov.agent_id,trust_score:gov.trust_score,sandbox_mode:gov.sandbox_mode,audit_summary:{governance_checks:events.filter((e:any)=>e.event==='governance_check').length,step_completions:events.filter((e:any)=>e.event==='step_completed').length,violations:gov.violations,permitted:gov.permitted},computed_at:new Date().toISOString()});});
// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id:string,goal:string,steps:string[],meta:any){const now=new Date().toISOString();workflowStore[id]={workflow_id:id,goal,steps,current_step:steps[0],step_index:0,status:'running',created_at:now,updated_at:now,completed_steps:[],pending_steps:steps.slice(1),results:{},meta};return workflowStore[id];}
function advanceWorkflow(id:string){const wf=workflowStore[id];if(!wf)return null;if(wf.step_index<wf.steps.length-1){wf.completed_steps.push(wf.current_step);wf.step_index+=1;wf.current_step=wf.steps[wf.step_index];wf.pending_steps=wf.steps.slice(wf.step_index+1);wf.status=wf.step_index===wf.steps.length-1?'complete':'running';}else{wf.completed_steps.push(wf.current_step);wf.status='complete';wf.pending_steps=[];}wf.updated_at=new Date().toISOString();return wf;}
router.post('/workflow/start',(req:any,res:any)=>{const{goal,steps,meta}=req.body||{};const workflow_id=`wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;const wf=createWorkflow(workflow_id,goal||'execute',steps||["validate_inputs", "generate_content", "score_quality", "apply_tone", "finalize"],meta||{});res.json({...buildRuntime(req,{workflow_state:'running'}),success:true,workflow_id,goal:wf.goal,status:wf.status,current_step:wf.current_step,steps:wf.steps,pending_steps:wf.pending_steps,created_at:wf.created_at,estimated_steps:wf.steps.length,computed_at:new Date().toISOString()});});
router.get('/workflow/:id',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});res.json({...buildRuntime(req,{workflow_state:wf.status}),success:true,workflow_id:wf.workflow_id,goal:wf.goal,status:wf.status,current_step:wf.current_step,step_index:wf.step_index,total_steps:wf.steps.length,completed_steps:wf.completed_steps,pending_steps:wf.pending_steps,progress_pct:Math.round((wf.step_index/wf.steps.length)*100),created_at:wf.created_at,updated_at:wf.updated_at,results:wf.results,computed_at:new Date().toISOString()});});
router.post('/workflow/:id/resume',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});if(wf.status==='complete')return res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,workflow_id:wf.workflow_id,status:'complete',message:'Already complete'});const advanced=advanceWorkflow(req.params.id);res.json({...buildRuntime(req,{workflow_state:advanced!.status,retryable:advanced!.status!=='complete'}),success:true,workflow_id:advanced!.workflow_id,status:advanced!.status,current_step:advanced!.current_step,completed_steps:advanced!.completed_steps,pending_steps:advanced!.pending_steps,progress_pct:Math.round((advanced!.step_index/advanced!.steps.length)*100),updated_at:advanced!.updated_at,computed_at:new Date().toISOString()});});
router.get('/workflow/:id/state',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});res.json({...buildRuntime(req,{workflow_state:wf.status}),success:true,workflow_id:wf.workflow_id,state_machine:{current_state:wf.current_step,previous_states:wf.completed_steps,next_states:wf.pending_steps,terminal:wf.status==='complete',transitions:wf.steps.map((s:string,i:number)=>({step:i+1,state:s,status:i<wf.step_index?'complete':i===wf.step_index?'active':'pending'}))},meta:wf.meta,created_at:wf.created_at,updated_at:wf.updated_at,computed_at:new Date().toISOString()});});

export default router;
