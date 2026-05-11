import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Text Generation API Alias",
    description: "Alias route for text-gen providing LLM-powered text generation compatible with agent workflows.",
    mount: "/text-generation",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/generate", "/batch"],
    openapi: 'https://orbis-apis.onrender.com/text-generation/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/text-generation/discovery',
  });
});

export default router;
