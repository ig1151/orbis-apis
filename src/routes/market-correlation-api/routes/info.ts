import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Market Correlation API",
    description: "Calculates statistical correlations between crypto assets and macro indicators.",
    mount: "/market-correlation",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/analyze", "/heatmap/:base", "/shift-detect"],
    openapi: 'https://orbis-apis.onrender.com/market-correlation/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/market-correlation/discovery',
  });
});

export default router;
