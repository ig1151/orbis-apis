import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api: "Agent Product Data Extraction Commerce Intelligence API",
    description: "Extracts and structures product data from e-commerce pages and marketplace listings.",
    mount: "/product-data",
    version: '1.0.0',
    status: 'live',
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    endpoints: ["/extract", "/compare", "/monitor"],
    openapi: 'https://orbis-apis.onrender.com/product-data/openapi.json',
    discovery: 'https://orbis-apis.onrender.com/product-data/discovery',
  });
});

export default router;
