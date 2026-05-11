import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "TX Simulator API",
    description: "Simulates EVM and Solana transactions before execution to surface gas costs and revert risks.",
    mount: "/tx-simulator",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/simulate", "/batch", "/decode"],
    openapi: 'https://orbis-apis.onrender.com/tx-simulator/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/tx-simulator/discovery',
  });
});

export default router;
