import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Intelligence Extraction Monitoring API",
    description: "Extracts structured intelligence signals from unstructured text sources.",
    mount: "/intelligence-extraction",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/extract", "/monitor", "/batch"],
    openapi: 'https://orbis-apis.onrender.com/intelligence-extraction/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/intelligence-extraction/discovery',
  });
});

export default router;
