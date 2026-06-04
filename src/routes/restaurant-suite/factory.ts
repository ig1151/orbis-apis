import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { callAIJson } from '../../shared/ai';

// Generic, spec-driven implementation for the Restaurant Agent Commerce suite.
// Each operation is backed by Claude (via the shared OpenRouter helper): the
// validated 200 response example in the spec is used as a response template
// that the model tailors to the caller's request. Any model/parse failure
// degrades gracefully to the static (schema-valid) example, so the endpoint
// always returns a well-formed response.

type AnyObj = Record<string, any>;
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function responseExample(op: AnyObj): any {
  return op?.responses?.['200']?.content?.['application/json']?.example;
}

function newRequestId(): string {
  return 'req_' + randomUUID().replace(/-/g, '').slice(0, 16);
}

// Stamp a fresh request_id on envelope responses so repeated calls differ.
function stamp(obj: any): any {
  if (obj && typeof obj === 'object' && !Array.isArray(obj) && 'request_id' in obj) {
    return { ...obj, request_id: newRequestId() };
  }
  return obj;
}

const ENVELOPE_KEYS = 'request_id, confidence, privacy, recommended_actions_priority_order, chain_to';

export function buildApiRouter(spec: AnyObj): Router {
  const router = Router();
  const title: string = spec?.info?.title || 'Restaurant API';
  const paths: AnyObj = spec?.paths || {};

  for (const [routePath, ops] of Object.entries<AnyObj>(paths)) {
    for (const method of HTTP_METHODS) {
      const op = ops?.[method];
      if (!op) continue;

      const example = responseExample(op);
      const gated = op['x-execution-gate'] === true;
      const isDiscovery = routePath === '/' && method === 'get';
      const opId: string = op.operationId || `${method.toUpperCase()} ${routePath}`;

      const handler = async (req: Request, res: Response): Promise<void> => {
        // Discovery is free and deterministic — never calls the model.
        if (isDiscovery) {
          res.json(stamp(example) ?? { service: title, version: spec?.info?.version });
          return;
        }

        // Execution gate: with no human approval_token, perform NO action and
        // return the pending_approval template unchanged (money/bookings held).
        if (gated && !(req.body && req.body.approval_token)) {
          res.json(stamp(example));
          return;
        }

        const sys = example
          ? `You implement the "${title}" endpoint (${opId}). Produce a realistic, useful response by filling the provided response_template with values tailored to the caller's request. Return ONLY a JSON object with EXACTLY the same keys and nested structure as response_template — do not add, rename, or remove any keys. Preserve the envelope fields (${ENVELOPE_KEYS}). Numbers must be plausible and internally consistent.${gated ? ' An approval_token was supplied, so reflect a COMPLETED/EXECUTED status (set submitted/booked/placed=true, fill confirmation ids, and set the gate status to approved/executed).' : ''}`
          : `You implement the "${title}" endpoint (${opId}). Return ONLY a JSON object response tailored to the caller's request, including the envelope fields (${ENVELOPE_KEYS}).`;

        try {
          const result = await callAIJson(
            JSON.stringify({ request: req.body ?? {}, response_template: example ?? null }),
            sys,
            4000,
            example, // fallback merged in by parseAIJson if the model output is unparseable
          );
          res.json(stamp(result));
        } catch {
          // Upstream/model error — degrade to the validated static example.
          if (example !== undefined) res.json(stamp(example));
          else res.status(502).json({ error: 'upstream_ai_unavailable', operation: opId });
        }
      };

      (router as any)[method](routePath, handler);
    }
  }

  return router;
}

export function buildOpenapiRouter(spec: AnyObj): Router {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => {
    res.json(spec);
  });
  return router;
}
