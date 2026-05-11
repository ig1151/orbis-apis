import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Web Data Extraction Intelligence API",
    description: "Extracts structured data from web pages and dynamic content for agent workflows.",
    mount: "/agent-web-data-extraction",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/extract", "/batch", "/sitemap"],
    openapi: 'https://orbis-apis.onrender.com/agent-web-data-extraction/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/agent-web-data-extraction/discovery',
  });
});

export default router;
