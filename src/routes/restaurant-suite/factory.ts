import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { callAI } from '../../shared/ai';

// Generic, spec-driven implementation for the Restaurant Agent Commerce suite.
// Each operation is backed by Claude (via the shared OpenRouter helper). The
// validated 200 response example in the spec is used as a response TEMPLATE:
// the model returns a JSON object that we deep-merge OVER the template, so the
// response is always complete and envelope-valid even if the model only fills
// part of it (or fails entirely, in which case the static example is returned).

type AnyObj = Record<string, any>;
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const ENVELOPE_KEYS = 'request_id, confidence, privacy, recommended_actions_priority_order, chain_to';

function responseExample(op: AnyObj): any {
  return op?.responses?.['200']?.content?.['application/json']?.example;
}

function newRequestId(): string {
  return 'req_' + randomUUID().replace(/-/g, '').slice(0, 16);
}

function isPlainObject(v: any): boolean {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

// Stamp a fresh request_id on envelope responses so repeated calls differ.
function stamp(obj: any): any {
  if (isPlainObject(obj) && 'request_id' in obj) return { ...obj, request_id: newRequestId() };
  return obj;
}

// Extract the first balanced top-level JSON object from a raw model reply,
// tolerating ```json fences and surrounding prose. Returns null if none parses.
function extractJsonObject(raw: string): AnyObj | null {
  if (!raw) return null;
  const text = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

// Deep-merge `over` onto a clone of `base`: model values win, template fills
// anything the model omitted; nested objects recurse, arrays are replaced.
function deepMerge(base: any, over: any): any {
  if (!isPlainObject(base)) return over;
  if (!isPlainObject(over)) return base;
  const out: AnyObj = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(over)) {
    out[k] = isPlainObject(base[k]) && isPlainObject(over[k]) ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

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

        if (example === undefined) {
          res.status(501).json({ error: 'not_implemented', operation: opId });
          return;
        }

        const sys =
          `You are the backend of the JSON API endpoint "${opId}" for the ${title}. ` +
          `You receive a caller REQUEST and a response TEMPLATE. Return a single JSON object with the SAME keys and nested structure as TEMPLATE, but with values made specific, realistic, and internally consistent with the REQUEST (e.g. use the request's location, cuisine, party size, names, and quantities). ` +
          `Preserve the envelope fields (${ENVELOPE_KEYS}). ` +
          `Output ONLY raw JSON — no markdown, no code fences, no commentary. Begin with { and end with }.` +
          (gated ? ' An approval_token was supplied: reflect a COMPLETED/EXECUTED result (set submitted/booked/placed/dispatched=true, fill confirmation ids, set the execution_gate status to approved/executed).' : '');

        const user = `REQUEST:\n${JSON.stringify(req.body ?? {})}\n\nTEMPLATE:\n${JSON.stringify(example)}`;

        try {
          const raw = await callAI([{ role: 'user', content: user }], sys, 6000);
          const parsed = extractJsonObject(raw);
          const merged = parsed ? deepMerge(example, parsed) : example;
          res.json(stamp(merged));
        } catch {
          // Upstream/model error — degrade to the validated static example.
          res.json(stamp(example));
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
