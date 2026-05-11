import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Derivatives API",
    description: "Fetches live derivatives market data including futures, options, funding rates, and open interest.",
    mount: "/derivatives",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/futures/:symbol", "/options/:symbol", "/funding-rates"],
    openapi: 'https://orbis-apis.onrender.com/derivatives/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/derivatives/discovery',
  });
});

export default router;
