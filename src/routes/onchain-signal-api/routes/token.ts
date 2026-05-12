import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTokenTransfersByContract, labelAddress, getEthPrice } from '../services/etherscan';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { TokenFlows } from '../types';
import { buildRuntime } from '../../../shared/ai';

const router = Router();

const flowsSchema = Joi.object({
  contract: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain: Joi.string().valid('ethereum', 'base', 'arbitrum', 'polygon').default('ethereum'),
  timeframe: Joi.string().valid('1h', '4h', '24h', '7d').default('24h'),
  decimals: Joi.number().min(0).max(18).default(18),
});

// GET /v1/token/flows
router.get('/flows', validate(flowsSchema), async (req: Request, res: Response): Promise<void> => {
  const { contract, chain, timeframe, decimals } = req.query as {
    contract: string;
    chain: string;
    timeframe: string;
    decimals: string;
  };

  const decimalsNum = parseInt(decimals as string);

  // Timeframe to seconds
  const timeframeMap: Record<string, number> = {
    '1h': 3600,
    '4h': 14400,
    '24h': 86400,
    '7d': 604800,
  };
  const cutoff = Math.floor(Date.now() / 1000) - timeframeMap[timeframe];

  try {
    const [transfers, ethPrice] = await Promise.all([
      getTokenTransfersByContract(contract, chain, 500),
      getEthPrice(),
    ]);

    const relevant = transfers.filter((tx: any) => parseInt(tx.timeStamp) >= cutoff);

    if (relevant.length === 0) {
      res.json({
        success: true,
        data: {
          token: 'UNKNOWN',
          contractAddress: contract,
          chain,
          timeframe,
          message: 'No transfers found in this timeframe',
          exchangeInflow: 0,
          exchangeOutflow: 0,
          netFlow: 0,
          sentiment: 'NEUTRAL',
          sentimentScore: 0,
          topMovers: [],
          summary: 'No activity detected in the specified timeframe.',
        } as TokenFlows,
      });
      return;
    }

    const tokenSymbol = relevant[0]?.tokenSymbol || 'TOKEN';
    const dec = relevant[0]?.tokenDecimal ? parseInt(relevant[0].tokenDecimal) : decimalsNum;

    let exchangeInflow = 0;
    let exchangeOutflow = 0;
    const moverMap: Record<string, { label: string | null; amount: number; direction: 'IN' | 'OUT' }> = {};

    for (const tx of relevant) {
      const amount = parseInt(tx.value) / Math.pow(10, dec);
      const fromLabel = labelAddress(tx.from);
      const toLabel = labelAddress(tx.to);

      // Inflow to exchange = distribution/selling
      if (toLabel) {
        exchangeInflow += amount;
        const key = tx.from.toLowerCase();
        moverMap[key] = {
          label: fromLabel,
          amount: (moverMap[key]?.amount || 0) + amount,
          direction: 'OUT',
        };
      }
      // Outflow from exchange = accumulation/buying
      if (fromLabel) {
        exchangeOutflow += amount;
        const key = tx.to.toLowerCase();
        moverMap[key] = {
          label: toLabel,
          amount: (moverMap[key]?.amount || 0) + amount,
          direction: 'IN',
        };
      }
    }

    const netFlow = exchangeOutflow - exchangeInflow;
    const total = exchangeInflow + exchangeOutflow;
    const sentimentScore = total > 0 ? Math.round((netFlow / total) * 100) : 0;

    let sentiment: TokenFlows['sentiment'] = 'NEUTRAL';
    if (sentimentScore >= 20) sentiment = 'ACCUMULATION';
    else if (sentimentScore <= -20) sentiment = 'SELL_PRESSURE';

    const topMovers = Object.entries(moverMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([address, data]) => ({
        address,
        label: data.label,
        amount: Math.round(data.amount),
        direction: data.direction,
      }));

    // AI summary
    const aiContext = `Token: ${tokenSymbol} on ${chain} over ${timeframe}
Exchange inflow (selling pressure): ${Math.round(exchangeInflow).toLocaleString()} tokens
Exchange outflow (buying/withdrawal): ${Math.round(exchangeOutflow).toLocaleString()} tokens
Net flow: ${Math.round(netFlow).toLocaleString()} (positive = more leaving exchanges = bullish)
Sentiment score: ${sentimentScore} (range -100 bearish to +100 bullish)
Total transfers analyzed: ${relevant.length}`;

    const summary = await callAI(
      `Analyze these onchain token flow metrics and write 2 sentences summarizing the market sentiment for traders. Be direct and specific.\n\n${aiContext}`
    );

    const result: TokenFlows = {
      token: tokenSymbol,
      contractAddress: contract,
      chain,
      timeframe,
      exchangeInflow: Math.round(exchangeInflow),
      exchangeOutflow: Math.round(exchangeOutflow),
      netFlow: Math.round(netFlow),
      sentiment,
      sentimentScore,
      topMovers,
      summary,
    };

    logger.info({ contract, chain, timeframe, sentiment, sentimentScore }, 'token/flows');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, contract, chain }, 'token/flows error');
    res.status(500).json({ error: 'Failed to analyze token flows', details: err.message });
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
