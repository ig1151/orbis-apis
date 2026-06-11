import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, num, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Live-but-bounded WebSocket connectivity tester. Opens a real ws://wss://
// connection, measures the handshake, optionally sends an echo message, and
// reports the result — always within a tight timeout (≤5s), always as HTTP 200
// with connected:true/false (never a 5xx, never a hang). Includes an SSRF guard
// that refuses loopback/private/link-local hosts. The ONLY batch-A API that does
// real network I/O; everything else is pure compute.

const router = Router();
const DEFAULT_TIMEOUT = 5000;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 5000;

export interface ProbeResult {
  url: string; secure: boolean; connected: boolean; handshake_ms: number | null;
  echo_requested: boolean; echo_received: boolean; echo_ok: boolean | null;
  close_code: number | null; error_message: string | null; timeout_ms: number;
}

// Defensive SSRF guard: never let an agent use this to probe internal services.
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '0.0.0.0' || h === '::1' || h === '::') return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true;            // this-host / loopback / private-A
    if (a === 192 && b === 168) return true;                       // private-C
    if (a === 172 && b >= 16 && b <= 31) return true;              // private-B
    if (a === 169 && b === 254) return true;                       // link-local incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true;             // CGNAT
  }
  if (h.includes(':')) { // IPv6 ULA / link-local / loopback
    if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true;
  }
  return false;
}

/** Open a real WebSocket, bounded by timeoutMs. Never throws; always resolves. */
export function probe(url: string, echoMessage: string | undefined, timeoutMs: number, secure: boolean): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const base: ProbeResult = { url, secure, connected: false, handshake_ms: null, echo_requested: echoMessage !== undefined, echo_received: false, echo_ok: echoMessage !== undefined ? false : null, close_code: null, error_message: null, timeout_ms: timeoutMs };
    let settled = false;
    let ws: WebSocket | undefined;
    const done = (patch: Partial<ProbeResult>) => {
      if (settled) return; settled = true;
      clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
      resolve({ ...base, ...patch });
    };
    const timer = setTimeout(() => done({ connected: base.handshake_ms !== null, error_message: `Timed out after ${timeoutMs}ms` }), timeoutMs);

    if (typeof WebSocket === 'undefined') return done({ error_message: 'WebSocket runtime unavailable.' });
    try { ws = new WebSocket(url); } catch (e) { return done({ error_message: 'Invalid WebSocket URL: ' + ((e as Error)?.message ?? String(e)) }); }

    ws.addEventListener('open', () => {
      base.handshake_ms = Date.now() - start;
      if (echoMessage !== undefined) { try { ws!.send(echoMessage); } catch (e) { done({ connected: true, error_message: 'Connected but send failed: ' + ((e as Error)?.message ?? String(e)) }); } }
      else done({ connected: true });
    });
    ws.addEventListener('message', (ev: MessageEvent) => {
      const data = typeof ev.data === 'string' ? ev.data : ((ev.data as { toString?: () => string })?.toString?.() ?? '');
      done({ connected: true, echo_received: true, echo_ok: data === echoMessage });
    });
    ws.addEventListener('error', () => {
      done({ connected: base.handshake_ms !== null, error_message: base.handshake_ms !== null ? 'Errored after handshake.' : 'Connection failed (handshake error or host unreachable).' });
    });
    ws.addEventListener('close', (ev: { code?: number }) => {
      done({ connected: base.handshake_ms !== null, close_code: typeof ev.code === 'number' ? ev.code : null, error_message: base.handshake_ms !== null ? null : 'Closed before the connection opened.' });
    });
  });
}

const CONF = { confidence_score: 0.9, confidence_per_section: { connectivity: 1, stability: 0.7 } };

function validate(body: any): { error: string } | { url: string; secure: boolean; echo: string | undefined; timeout: number } {
  const url = str(body?.url);
  if (url === undefined) return { error: 'Provide "url" (ws:// or wss://).' };
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { error: 'Invalid URL.' }; }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return { error: 'URL must use the ws:// or wss:// scheme.' };
  if (isBlockedHost(parsed.hostname)) return { error: 'Refusing to connect to a loopback/private/link-local host (SSRF protection).' };
  const echo = str(body?.echo_message);
  const timeout = clamp(Math.round(num(body?.timeout_ms) ?? DEFAULT_TIMEOUT), MIN_TIMEOUT, MAX_TIMEOUT);
  return { url, secure: parsed.protocol === 'wss:', echo, timeout };
}

function actions(r: ProbeResult): string[] {
  if (!r.connected) return [`Could not establish a WebSocket connection${r.error_message ? `: ${r.error_message}` : '.'}`, 'Verify the URL, scheme (ws/wss), TLS, and that the server accepts WebSocket upgrades.'];
  const out = [`Connected in ${r.handshake_ms}ms over ${r.secure ? 'wss (TLS)' : 'ws (plaintext)'}.`];
  if (r.echo_requested) out.push(r.echo_ok ? 'Echo round-trip verified (server returned the same payload).' : r.echo_received ? 'Server replied, but the payload did not match what was sent.' : 'No echo reply within the timeout — the server may not echo.');
  if (!r.secure) out.push('Plaintext ws:// — prefer wss:// in production to encrypt the channel.');
  return out;
}

const CHAIN_TO = [
  { api: 'ssl-certificate', reason: 'For wss:// endpoints, inspect the TLS certificate of the host.' },
  { api: 'dns-lookup', reason: 'Resolve and verify the host before connecting.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'WebSocket Tester API', version: '1.0.0',
    description: 'Live WebSocket connectivity tester. Opens a real ws://wss:// connection within a tight timeout (≤5s), measures the handshake, optionally verifies an echo round-trip, and always returns HTTP 200 with connected:true/false (never a 5xx, never a hang). Refuses loopback/private/link-local hosts (SSRF protection).',
    openapi_url: 'https://orbis-apis.onrender.com/websocket-tester/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/test', summary: 'Connect, measure handshake, optional echo check', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL connectivity test + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/test', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/test', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const v = validate(req.body);
  if ('error' in v) return fail(res, t0, 400, 'invalid_request', v.error);
  const r = await probe(v.url, v.echo, v.timeout, v.secure);
  respond(res, t0, {
    ...r, ...CONF,
    recommended_actions_priority_order: actions(r), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const v = validate(req.body);
  if ('error' in v) return fail(res, t0, 400, 'invalid_request', v.error);
  const r = await probe(v.url, v.echo, v.timeout, v.secure);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: r.connected ? `Handshake completed in ${r.handshake_ms}ms${r.echo_requested ? `; echo ${r.echo_ok ? 'verified' : r.echo_received ? 'mismatched' : 'not received'}` : ''}.` : `Connection did not open${r.error_message ? `: ${r.error_message}` : ''}.`,
      key_factors: [`Connected: ${r.connected}.`, `Handshake: ${r.handshake_ms ?? 'n/a'}ms.`, `Scheme: ${r.secure ? 'wss' : 'ws'}.`],
      invalidators: ['A single live observation — transient network conditions, server load, or restarts can change the result.', 'A successful handshake does not validate application-level auth or subprotocol behavior.', `Bounded by a ${r.timeout_ms}ms timeout; a slow-but-reachable server may report as unreachable.`],
    },
    ...CONF,
    recommended_actions_priority_order: actions(r), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
