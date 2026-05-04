import axios from 'axios';
import crypto from 'crypto';
import { getPublisher, getSubscriber, CHANNEL } from './redis-bus';

// ── SSE client registry (per-instance) ───────────────────────────────────
type SSEClient = {
  id: string;
  res: any;
  symbols: string[];
};

const sseClients: Map<string, SSEClient> = new Map();

export function registerSSEClient(id: string, res: any, symbols: string[]): void {
  sseClients.set(id, { id, res, symbols });
}

export function removeSSEClient(id: string): void {
  sseClients.delete(id);
}

export function getSSEClientCount(): number {
  return sseClients.size;
}

// ── Webhook registry (per-instance, in-memory) ────────────────────────────
type WebhookEntry = {
  id: string;
  url: string;
  secret?: string;
  symbols: string[];
  condition_types: string[];
  createdAt: number;
};

const webhooks: Map<string, WebhookEntry> = new Map();

export function registerWebhook(entry: WebhookEntry): void {
  webhooks.set(entry.id, entry);
}

export function removeWebhook(id: string): boolean {
  return webhooks.delete(id);
}

export function getWebhook(id: string): WebhookEntry | null {
  return webhooks.get(id) ?? null;
}

export function listWebhooks(): WebhookEntry[] {
  return Array.from(webhooks.values());
}

// ── Push event to local SSE clients ──────────────────────────────────────
function pushToSSEClients(event: FiredEvent): void {
  const payload = JSON.stringify(event);
  for (const [id, client] of sseClients) {
    const wantsAll    = client.symbols.length === 0;
    const wantsSymbol = client.symbols.includes(event.symbol.toUpperCase());
    if (wantsAll || wantsSymbol) {
      try {
        client.res.write('event: trigger_fired\n');
        client.res.write('data: ' + payload + '\n\n');
        if (typeof client.res.flush === 'function') client.res.flush();
      } catch {
        sseClients.delete(id);
      }
    }
  }
}

// ── Dispatch webhooks ─────────────────────────────────────────────────────
async function pushToWebhooks(event: FiredEvent): Promise<void> {
  const payload = JSON.stringify(event);
  for (const [, wh] of webhooks) {
    const wantsAll    = wh.symbols.length === 0;
    const wantsSymbol = wh.symbols.includes(event.symbol.toUpperCase());
    const wantsType   = wh.condition_types.length === 0 || wh.condition_types.includes(event.condition_type);
    if ((wantsAll || wantsSymbol) && wantsType) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (wh.secret) {
          const sig = crypto.createHmac('sha256', wh.secret).update(payload).digest('hex');
          headers['x-orbis-signature'] = 'sha256=' + sig;
        }
        await axios.post(wh.url, event, { headers, timeout: 5000 });
      } catch {
        // silent
      }
    }
  }
}

// ── Subscribe to Redis channel once on startup ────────────────────────────
let subscribed = false;

function ensureSubscribed(): void {
  if (subscribed) return;
  const sub = getSubscriber();
  if (!sub) return;
  subscribed = true;
  sub.subscribe(CHANNEL).then(() => {
    console.log('[dispatcher] subscribed to channel:', CHANNEL);
  }).catch((err: any) => {
    console.error('[dispatcher] subscribe failed:', err.message);
  });
  sub.on('message', (_channel: string, message: string) => {
    try {
      const event: FiredEvent = JSON.parse(message);
      console.log('[dispatcher] received from Redis:', event.symbol, 'clients:', sseClients.size);
      pushToSSEClients(event);
      pushToWebhooks(event).catch(() => {});
    } catch (err: any) {
      console.error('[dispatcher] parse error:', err.message);
    }
  });
}

// ── Subscribe eagerly on module load ─────────────────────────────────────
ensureSubscribed();

// ── Public interface ──────────────────────────────────────────────────────
export interface FiredEvent {
  trigger_id:          string;
  symbol:              string;
  condition_type:      string;
  current_value:       number | null;
  threshold:           number;
  urgency:             string;
  confidence:          number;
  market_impact_score: number;
  recommended_action:  string;
  fired_at:            string;
}

export async function dispatchFiredEvent(event: FiredEvent): Promise<void> {
  ensureSubscribed();
  const pub = getPublisher();
  if (pub) {
    // Publish to Redis — all instances receive via subscriber
    try {
      await pub.publish(CHANNEL, JSON.stringify(event));
    } catch {
      // Redis unavailable — fall back to in-process only
      pushToSSEClients(event);
      await pushToWebhooks(event);
    }
  } else {
    // No Redis — in-process only
    pushToSSEClients(event);
    await pushToWebhooks(event);
  }
}
