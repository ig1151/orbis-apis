import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { registerSSEClient, removeSSEClient, getSSEClientCount } from '../services/dispatcher';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  const symbolsParam = req.query.symbols as string | undefined;
  const symbols = symbolsParam
    ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];

  const clientId = uuidv4();

  res.socket?.setNoDelay(true);
  res.setHeader('Content-Type',      'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control',     'no-cache, no-transform');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.status(200);
  res.flushHeaders();

  function send(event: string, data: object): void {
    const chunk = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
    res.write(chunk);
    // Force flush if available
    if (typeof (res as any).flush === 'function') (res as any).flush();
  }

  send('connected', {
    client_id:          clientId,
    symbols_subscribed: symbols.length > 0 ? symbols : ['ALL'],
    active_subscribers: getSSEClientCount() + 1,
    message:            'Connected. Waiting for trigger_fired events.',
  });

  const heartbeat = setInterval(() => {
    try {
      send('heartbeat', { ts: new Date().toISOString() });
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  registerSSEClient(clientId, res, symbols);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(clientId);
  });
});

export default router;
