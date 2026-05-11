import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Liquidation Feed API",
    description: "Real-time and historical liquidation events across major DeFi lending protocols.",
    mount: "/liquidation-feed",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/recent", "/asset/:symbol", "/alert-config"],
    openapi: 'https://orbis-apis.onrender.com/liquidation-feed/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/liquidation-feed/discovery',
  });
});

export default router;
