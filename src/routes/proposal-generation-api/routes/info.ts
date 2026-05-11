import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Proposal Generation API",
    description: "Generates structured business proposals, RFP responses, and SOW documents from briefs.",
    mount: "/proposal-generation",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/generate", "/rfp-response", "/review"],
    openapi: 'https://orbis-apis.onrender.com/proposal-generation/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/proposal-generation/discovery',
  });
});

export default router;
