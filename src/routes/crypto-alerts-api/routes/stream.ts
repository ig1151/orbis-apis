import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { registerSSEClient, removeSSEClient, getSSEClientCount } from '../services/dispatcher';

const router = Router();

// GET /stream?symbols=BTC,ETH
router.get('/', (req: Request, res: Response): void => {
  const symbolsParam = req.query.symbols as string | undefined;
  const symbols = symbolsParam
    ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];

  const clientId = uuidv4();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\n');
  res.write('data: ' + JSON.stringify({
    client_id:           clientId,
    symbols_subscribed:  symbols.length > 0 ? symbols : ['ALL'],
    active_subscribers:  getSSEClientCount() + 1,
    message:             'Connected. Waiting for trigger_fired events.',
  }) + '\n\n');

  const heartbeat = setInterval(() => {
    try {
      res.write('event: heartbeat\n');
      res.write('data: ' + JSON.stringify({ ts: new Date().toISOString() }) + '\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  registerSSEClient(clientId, res, symbols);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(clientId);
  });
});

export default router;
