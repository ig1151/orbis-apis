import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
export const CHANNEL = 'crypto-alerts:trigger_fired';

let publisher:  Redis | null = null;
let subscriber: Redis | null = null;

function createClient(): Redis | null {
  if (!REDIS_URL) return null;
  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect:          false,
      maxRetriesPerRequest: 2,
      connectTimeout:       5000,
      enableOfflineQueue:   false,
    });
    client.on('error', (err) => {
      console.error('[redis-bus] error:', err.message);
    });
    client.on('connect', () => {
      console.log('[redis-bus] connected');
    });
    return client;
  } catch (err: any) {
    console.error('[redis-bus] failed to create client:', err.message);
    return null;
  }
}

export function getPublisher(): Redis | null {
  if (!publisher) publisher = createClient();
  return publisher;
}

export function getSubscriber(): Redis | null {
  if (!subscriber) subscriber = createClient();
  return subscriber;
}

// Eagerly connect both clients on module load
getPublisher();
getSubscriber();
