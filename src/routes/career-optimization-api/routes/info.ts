import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Career Optimization Application Intelligence API",
    description: "Scores resumes, optimizes applications, and generates personalized career strategy recommendations.",
    mount: "/career-optimization",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/score-resume", "/optimize", "/strategy"],
    openapi: 'https://orbis-apis.onrender.com/career-optimization/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/career-optimization/discovery',
  });
});

export default router;
