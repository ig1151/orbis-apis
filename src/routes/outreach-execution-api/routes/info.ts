import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Outreach Execution API",
    description: "Generates, sequences, and tracks personalized outreach campaigns for agent-driven sales workflows.",
    mount: "/outreach-execution",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/generate", "/sequence", "/sequence/:id/stats"],
    openapi: 'https://orbis-apis.onrender.com/outreach-execution/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/outreach-execution/discovery',
  });
});

export default router;
