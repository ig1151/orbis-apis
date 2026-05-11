import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent DeFi Position Risk Liquidation Defense API",
    description: "Monitors active DeFi positions and executes defensive actions to prevent liquidation.",
    mount: "/defi-position-risk",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/monitor", "/defend", "/position/:wallet/:protocol"],
    openapi: 'https://orbis-apis.onrender.com/defi-position-risk/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/defi-position-risk/discovery',
  });
});

export default router;
