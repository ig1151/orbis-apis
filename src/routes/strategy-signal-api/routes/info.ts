import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Strategy Signal API",
    description: "Generates trading and portfolio strategy signals from multi-factor quantitative models.",
    mount: "/strategy-signal",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/generate", "/backtest/:strategy_id", "/rank"],
    openapi: 'https://orbis-apis.onrender.com/strategy-signal/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/strategy-signal/discovery',
  });
});

export default router;
