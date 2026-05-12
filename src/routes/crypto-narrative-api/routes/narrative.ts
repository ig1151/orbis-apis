import { Router, Request, Response } from 'express';
import { tavilySearch } from '../services/tavily';
import { getCoinsByCategory } from '../services/coingecko';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { NarrativeDetail } from '../types';
import { buildRuntime } from '../../../shared/ai';

const router = Router();

const NARRATIVE_TO_CATEGORY: Record<string, string> = {
  'ai-tokens': 'artificial-intelligence',
  'rwa': 'real-world-assets-rwa',
  'depin': 'depin',
  'defi': 'decentralized-finance-defi',
  'layer-2': 'layer-2',
  'base-ecosystem': 'base-ecosystem',
  'solana-ecosystem': 'solana-ecosystem',
  'memecoins': 'meme-token',
  'gaming': 'gaming',
  'nft': 'non-fungible-tokens-nft',
  'liquid-staking': 'liquid-staking-tokens',
  'restaking': 'restaking',
  'btc-ecosystem': 'bitcoin-ecosystem',
  'zkvm': 'zero-knowledge-zk',
};

// GET /v1/narrative/:name
router.get('/:name', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;
  const slug = name.toLowerCase();

  try {
    // Search for recent news on this narrative
    const [searchResults, searchResults2] = await Promise.all([
      tavilySearch(`crypto ${slug.replace(/-/g, ' ')} narrative 2026 market`, 5),
      tavilySearch(`${slug.replace(/-/g, ' ')} tokens price catalyst`, 3),
    ]);

    const allResults = [...searchResults, ...searchResults2];
    const searchContext = allResults.map((r) => `${r.title}: ${r.content}`).join('\n\n').slice(0, 3000);
    const sources = allResults.map((r) => r.url).slice(0, 5);

    // Get top tokens in this category
    const categoryId = NARRATIVE_TO_CATEGORY[slug];
    const topCoins = categoryId ? await getCoinsByCategory(categoryId, 5) : [];
    const topTokens = topCoins.map((c) => c.symbol);

    const aiPrompt = `You are a crypto market analyst. Provide a deep-dive analysis of the "${slug.replace(/-/g, ' ')}" narrative in crypto.

Recent news and context:
${searchContext}

Top tokens in this category: ${topTokens.join(', ') || 'unknown'}

Respond ONLY in this JSON format (no markdown):
{
  "name": "string (proper name)",
  "description": "string (2 sentences)",
  "momentumScore": number (0-100),
  "trend": "SURGING|RISING|STABLE|DECLINING|FADING",
  "catalysts": ["string", "string", "string"],
  "topTokens": ["SYMBOL", "SYMBOL", "SYMBOL"],
  "searchVolumeTrend": "UP|FLAT|DOWN",
  "summary": "string (3 sentences — current state of narrative)",
  "bullCase": "string (2 sentences)",
  "bearCase": "string (2 sentences)",
  "keyRisks": ["string", "string"],
  "relatedNarratives": ["string", "string"]
}`;

    const aiResponse = await callAI(aiPrompt);

    let parsed: any;
    try {
      const cleaned = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        name: slug,
        description: 'Unable to parse narrative data',
        momentumScore: 0,
        trend: 'STABLE',
        catalysts: [],
        topTokens,
        searchVolumeTrend: 'FLAT',
        summary: aiResponse.slice(0, 300),
        bullCase: '',
        bearCase: '',
        keyRisks: [],
        relatedNarratives: [],
      };
    }

    const result: NarrativeDetail = {
      ...parsed,
      slug,
      timeframe: '7d',
      sources,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ slug, momentumScore: result.momentumScore, trend: result.trend }, 'narrative detail');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, slug }, 'narrative detail error');
    res.status(500).json({ error: 'Failed to analyze narrative', details: err.message });
  }
});


// ── Universal Runtime Envelope ────────────────────────────────────────────────
// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES: string[] = ["market:read", "market:signal", "market:analyze"];
const EXECUTION_AUTHORITY: string = "medium";
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
router.post('/workflow/start',(req:any,res:any)=>{const{goal,steps,meta}=req.body||{};const workflow_id=`wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;const wf=createWorkflow(workflow_id,goal||'execute',steps||["validate_inputs", "fetch_market_data", "compute_signals", "rank_outputs", "finalize"],meta||{});res.json({...buildRuntime(req,{workflow_state:'running'}),success:true,workflow_id,goal:wf.goal,status:wf.status,current_step:wf.current_step,steps:wf.steps,pending_steps:wf.pending_steps,created_at:wf.created_at,estimated_steps:wf.steps.length,computed_at:new Date().toISOString()});});
router.get('/workflow/:id',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});res.json({...buildRuntime(req,{workflow_state:wf.status}),success:true,workflow_id:wf.workflow_id,goal:wf.goal,status:wf.status,current_step:wf.current_step,step_index:wf.step_index,total_steps:wf.steps.length,completed_steps:wf.completed_steps,pending_steps:wf.pending_steps,progress_pct:Math.round((wf.step_index/wf.steps.length)*100),created_at:wf.created_at,updated_at:wf.updated_at,results:wf.results,computed_at:new Date().toISOString()});});
router.post('/workflow/:id/resume',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});if(wf.status==='complete')return res.json({...buildRuntime(req,{workflow_state:'complete'}),success:true,workflow_id:wf.workflow_id,status:'complete',message:'Already complete'});const advanced=advanceWorkflow(req.params.id);res.json({...buildRuntime(req,{workflow_state:advanced!.status,retryable:advanced!.status!=='complete'}),success:true,workflow_id:advanced!.workflow_id,status:advanced!.status,current_step:advanced!.current_step,completed_steps:advanced!.completed_steps,pending_steps:advanced!.pending_steps,progress_pct:Math.round((advanced!.step_index/advanced!.steps.length)*100),updated_at:advanced!.updated_at,computed_at:new Date().toISOString()});});
router.get('/workflow/:id/state',(req:any,res:any)=>{const wf=workflowStore[req.params.id];if(!wf)return res.status(404).json({success:false,error:'Workflow not found'});res.json({...buildRuntime(req,{workflow_state:wf.status}),success:true,workflow_id:wf.workflow_id,state_machine:{current_state:wf.current_step,previous_states:wf.completed_steps,next_states:wf.pending_steps,terminal:wf.status==='complete',transitions:wf.steps.map((s:string,i:number)=>({step:i+1,state:s,status:i<wf.step_index?'complete':i===wf.step_index?'active':'pending'}))},meta:wf.meta,created_at:wf.created_at,updated_at:wf.updated_at,computed_at:new Date().toISOString()});});

export default router;
