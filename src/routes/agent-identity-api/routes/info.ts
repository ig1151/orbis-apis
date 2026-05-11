import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Identity Trust API",
    description: "Issues, verifies, and manages cryptographic identities and trust scores for autonomous agents.",
    mount: "/agent-identity",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/issue", "/verify", "/revoke", "/trust/:agent_id"],
    openapi: 'https://orbis-apis.onrender.com/agent-identity/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/agent-identity/discovery',
  });
});

export default router;
