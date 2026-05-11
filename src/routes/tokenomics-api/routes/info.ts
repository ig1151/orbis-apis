import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Tokenomics API",
    description: "Analyses token supply, emission schedules, vesting, and economic model health for any crypto project.",
    mount: "/tokenomics",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/analyze/:symbol", "/simulate", "/compare"],
    openapi: 'https://orbis-apis.onrender.com/tokenomics/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/tokenomics/discovery',
  });
});

export default router;
