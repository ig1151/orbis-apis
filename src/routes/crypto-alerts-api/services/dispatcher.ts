import axios from 'axios';
import crypto from 'crypto';

// ── SSE client registry ───────────────────────────────────────────────────
type SSEClient = {
  id: string;
  res: any;
  symbols: string[];
  createdAt: number;
};

const sseClients: Map<string, SSEClient> = new Map();

export function registerSSEClient(id: string, res: any, symbols: string[]): void {
  sseClients.set(id, { id, res, symbols, createdAt: Date.now() });
}

export function removeSSEClient(id: string): void {
  sseClients.delete(id);
}

export function getSSEClientCount(): number {
  return sseClients.size;
}

// ── Webhook registry ──────────────────────────────────────────────────────
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

// ── Fire event — called by check-triggers when a trigger fires ────────────
export interface FiredEvent {
  trigger_id: string;
  symbol: string;
  condition_type: string;
  current_value: number | null;
  threshold: number;
  urgency: string;
  confidence: number;
  market_impact_score: number;
  recommended_action: string;
  fired_at: string;
}

export async function dispatchFiredEvent(event: FiredEvent): Promise<void> {
  const payload = JSON.stringify(event);

  // ── Push to SSE clients ─────────────────────────────────────────────────
  for (const [id, client] of sseClients) {
    const wantsAll = client.symbols.length === 0;
    const wantsSymbol = client.symbols.includes(event.symbol.toUpperCase());
    if (wantsAll || wantsSymbol) {
      try {
        client.res.write('event: trigger_fired\n');
        client.res.write('data: ' + payload + '\n\n');
      } catch {
        sseClients.delete(id);
      }
    }
  }

  // ── POST to registered webhooks ─────────────────────────────────────────
  for (const [, wh] of webhooks) {
    const wantsAll = wh.symbols.length === 0;
    const wantsSymbol = wh.symbols.includes(event.symbol.toUpperCase());
    const wantsType = wh.condition_types.length === 0 || wh.condition_types.includes(event.condition_type);
    if ((wantsAll || wantsSymbol) && wantsType) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (wh.secret) {
          const sig = crypto.createHmac('sha256', wh.secret).update(payload).digest('hex');
          headers['x-orbis-signature'] = 'sha256=' + sig;
        }
        await axios.post(wh.url, event, { headers, timeout: 5000 });
      } catch {
        // silent — don't break the loop on webhook delivery failure
      }
    }
  }
}
