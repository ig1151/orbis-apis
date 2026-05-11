import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Real-Time Monitor API",
    description: "Generic real-time event monitoring with configurable triggers, webhooks, and agent-callable alerts.",
    mount: "/real-time-monitor",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/monitor", "/monitors", "/monitor/:id/events", "/monitor/:id"],
    openapi: 'https://orbis-apis.onrender.com/real-time-monitor/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/real-time-monitor/discovery',
  });
});

export default router;
