import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Cross-Chain Execution Bridge Intelligence API",
    description: "Routes, quotes, and simulates cross-chain bridge transactions for agent execution.",
    mount: "/cross-chain-bridge",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/quote", "/simulate", "/status/:tx_hash"],
    openapi: 'https://orbis-apis.onrender.com/cross-chain-bridge/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/cross-chain-bridge/discovery',
  });
});

export default router;
