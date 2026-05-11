import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Market Stress API",
    description: "Computes composite market stress indices using volatility and liquidity signals.",
    mount: "/market-stress",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/index", "/scenario", "/history"],
    openapi: 'https://orbis-apis.onrender.com/market-stress/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/market-stress/discovery',
  });
});

export default router;
