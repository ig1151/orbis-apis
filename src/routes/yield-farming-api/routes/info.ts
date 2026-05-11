import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Yield Farming API",
    description: "Surfaces top yield farming opportunities across DeFi protocols with risk-adjusted APY rankings.",
    mount: "/yield-farming",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/opportunities", "/simulate", "/protocol/:name"],
    openapi: 'https://orbis-apis.onrender.com/yield-farming/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/yield-farming/discovery',
  });
});

export default router;
