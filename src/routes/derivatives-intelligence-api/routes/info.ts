import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Derivatives Intelligence API",
    description: "Derives trading signals and risk insights from derivatives market structure and positioning data.",
    mount: "/derivatives-intelligence",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/signal", "/positioning/:symbol", "/risk-surface"],
    openapi: 'https://orbis-apis.onrender.com/derivatives-intelligence/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/derivatives-intelligence/discovery',
  });
});

export default router;
