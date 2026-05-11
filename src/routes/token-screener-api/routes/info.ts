import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Token Screener API",
    description: "Screens tokens by fundamentals, on-chain metrics, and risk signals.",
    mount: "/token-screener",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/screen", "/token/:symbol", "/watchlist"],
    openapi: 'https://orbis-apis.onrender.com/token-screener/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/token-screener/discovery',
  });
});

export default router;
