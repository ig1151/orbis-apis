import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Crypto Trigger Market Alert API",
    description: "Monitors on-chain and market conditions to trigger agent workflows on configurable events.",
    mount: "/crypto-trigger",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/trigger", "/triggers", "/test", "/trigger/:id"],
    openapi: 'https://orbis-apis.onrender.com/crypto-trigger/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/crypto-trigger/discovery',
  });
});

export default router;
