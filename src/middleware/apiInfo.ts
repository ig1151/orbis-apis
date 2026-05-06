import { Router, Request, Response } from 'express';

export interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params?: Record<string, string>;
}

export interface ApiInfoConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  endpoints: EndpointDef[];
  loop_type?: string;
  monetization_grade?: string;
  primary_use_case?: string;
  pricing?: Record<string, number>;
}

const BASE_URL = 'https://orbis-apis.onrender.com';
const WEBSITE = 'https://orbis-apis.onrender.com';

export function createApiInfoRouter(config: ApiInfoConfig): Router {
  const router = Router();
  const baseUrl = `${BASE_URL}/${config.slug}`;
  const docsUrl = `${baseUrl}/docs`;
  const openapiUrl = `${baseUrl}/openapi.json`;

  router.get('/', (req: Request, res: Response, next: any) => {
    // If query params present, pass to actual route handlers
    if (Object.keys(req.query).length > 0 && !req.query.v && !req.query.cacheBust) { return next('router'); }
    res.json({
      name: config.name,
      version: config.version,
      description: config.description,
      category: config.category,
      baseUrl,
      website: WEBSITE,
      docs: docsUrl,
      openapi: openapiUrl,
      endpoints: config.endpoints.map(e => ({
        method: e.method,
        url: `${baseUrl}${e.path}`,
        description: e.description,
        ...(e.params ? { params: e.params } : {}),
      })),
    });
  });

  router.get('/docs', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.name} Docs</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css" />
  <style>
    body { margin: 0; background: #0a0a0a; }
    .topbar { background: #111 !important; border-bottom: 1px solid #333; }
    .topbar-wrapper img { display: none; }
    .topbar-wrapper a::after { content: '${config.name}'; color: #fff; font-size: 1.1rem; font-weight: 700; font-family: monospace; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${openapiUrl}',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
    });
  </script>
</body>
</html>`);
  });

  router.get('/openapi.json', (_req: Request, res: Response) => {
    const paths: Record<string, any> = {};
    for (const ep of config.endpoints) {
      const method = ep.method.toLowerCase();
      if (!paths[ep.path]) paths[ep.path] = {};
      paths[ep.path][method] = {
        summary: ep.description,
        tags: [config.name],
        parameters: ep.method === 'GET' && ep.params
          ? Object.entries(ep.params).map(([name, desc]) => ({
              name, in: 'query', description: desc, schema: { type: 'string' },
            }))
          : [],
        ...((['POST', 'PUT', 'PATCH'].includes(ep.method)) ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: ep.description,
                  ...(ep.params ? {
                    properties: Object.fromEntries(
                      Object.entries(ep.params).map(([name, desc]) => [
                        name, { type: 'string', description: String(desc) }
                      ])
                    )
                  } : {})
                }
              }
            }
          }
        } : {}),
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '500': { description: 'Server Error' },
        },
      };
    }
    res.json({
      openapi: '3.0.0',
      info: { title: config.name, version: config.version, description: config.description },
      servers: [{ url: baseUrl, description: 'Production' }],
      externalDocs: { url: docsUrl, description: 'Interactive Docs' },
      paths,
    });
  });

  return router;
}
