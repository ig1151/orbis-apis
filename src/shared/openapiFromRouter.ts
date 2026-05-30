import { Router, Request, Response } from 'express';

/**
 * Builds an agent-callable OpenAPI 3.1 spec router by introspecting an existing
 * Express router's registered routes. Used to back-fill /openapi.json for APIs
 * that were mounted without a spec endpoint (so agents can discover + call them).
 *
 * Paths are taken verbatim from the router stack, so the spec never drifts from
 * the actual code. The router is mounted by the dispatcher at /:slug/openapi.json,
 * so it only needs to answer GET '/'.
 */
export interface OpenapiMeta {
  slug: string;
  title: string;
  description?: string;
  version?: string;
}

interface RouteInfo { path: string; methods: string[]; }

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function extractRoutes(router: any): RouteInfo[] {
  const out: RouteInfo[] = [];
  const walk = (stack: any[]): void => {
    for (const layer of stack || []) {
      if (layer && layer.route) {
        const paths: string[] = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        const methods = Object.keys(layer.route.methods || {})
          .filter((m) => HTTP_METHODS.includes(m));
        for (const p of paths) {
          if (typeof p === 'string' && methods.length) out.push({ path: p || '/', methods });
        }
      } else if (layer && layer.handle && Array.isArray(layer.handle.stack)) {
        // one level of nested router; relative paths still belong under the slug
        walk(layer.handle.stack);
      }
    }
  };
  walk(router && router.stack);
  return out;
}

function toOpenapiPath(p: string): string {
  const normalized = p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function operationId(method: string, path: string, used: Set<string>): string {
  const base = `${method}_${path.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'root'}`;
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}_${n++}`;
  used.add(id);
  return id;
}

export function buildSpec(baseRouter: any, meta: OpenapiMeta): Record<string, unknown> {
  const routes = extractRoutes(baseRouter);
  const paths: Record<string, any> = {};
  const usedIds = new Set<string>();

  for (const r of routes) {
    const oapiPath = toOpenapiPath(r.path);
    paths[oapiPath] = paths[oapiPath] || {};
    for (const method of r.methods) {
      const op: any = {
        operationId: operationId(method, oapiPath, usedIds),
        summary: `${method.toUpperCase()} ${oapiPath}`,
        responses: {
          '200': {
            description: 'Successful response',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      };
      if (['post', 'put', 'patch'].includes(method)) {
        op.requestBody = {
          required: false,
          content: { 'application/json': { schema: { type: 'object' } } },
        };
      }
      paths[oapiPath][method] = op;
    }
  }

  // Guarantee at least one callable path so the spec is always agent-usable.
  if (Object.keys(paths).length === 0) {
    paths['/'] = {
      get: {
        operationId: 'discovery',
        summary: 'API discovery',
        responses: { '200': { description: 'Discovery info' } },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: meta.title,
      version: meta.version || '1.0.0',
      description: meta.description || meta.title,
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: `https://orbis-apis.onrender.com/${meta.slug}` }],
    paths,
  };
}

export function openapiRouterFromRouter(baseRouter: any, meta: OpenapiMeta): Router {
  const router = Router();
  let cached: Record<string, unknown> | null = null;
  router.get('/', (_req: Request, res: Response) => {
    if (!cached) cached = buildSpec(baseRouter, meta);
    res.json(cached);
  });
  return router;
}
