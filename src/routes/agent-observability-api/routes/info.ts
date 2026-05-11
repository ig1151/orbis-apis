import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Observability Telemetry API",
    description: "Collects, stores, and surfaces agent execution traces, spans, and performance telemetry.",
    mount: "/agent-observability",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/trace", "/trace/:trace_id", "/analyze", "/dashboard/:agent_id"],
    openapi: 'https://orbis-apis.onrender.com/agent-observability/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/agent-observability/discovery',
  });
});

export default router;
