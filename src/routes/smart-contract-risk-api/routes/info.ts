import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Smart Contract Risk Due Diligence API",
    description: "Performs automated due diligence on smart contracts including audit history and vulnerability patterns.",
    mount: "/smart-contract-risk",
    version: '1.0.0',
    status: 'live',
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/analyze", "/compare", "/report/:address"],
    openapi: 'https://orbis-apis.onrender.com/smart-contract-risk/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/smart-contract-risk/discovery',
  });
});

export default router;
