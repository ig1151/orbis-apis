import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Voice Intelligence API",
    description: "Transcribes, diarizes, and extracts structured intelligence from voice recordings.",
    mount: "/voice-intelligence",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/transcribe", "/extract-insights", "/summarize"],
    openapi: 'https://orbis-apis.onrender.com/voice-intelligence/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/voice-intelligence/discovery',
  });
});

export default router;
