import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "DeFi Risk API",
    description: "Assesses smart contract, liquidity, and protocol risk for DeFi positions.",
    mount: "/defi-risk",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/assess", "/protocol/:name/score", "/liquidation-risk"],
    openapi: 'https://orbis-apis.onrender.com/defi-risk/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/defi-risk/discovery',
  });
});

export default router;
