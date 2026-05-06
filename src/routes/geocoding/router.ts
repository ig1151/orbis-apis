import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();

const OPENCAGE_KEY = process.env.OPENCAGE_API_KEY;
const MAPBOX_KEY = process.env.MAPBOX_API_KEY;

async function geocodeOpenCage(address: string): Promise<any> {
  const r = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
    params: { q: address, key: OPENCAGE_KEY, limit: 1, no_annotations: 1 },
    timeout: 10000,
  });
  const result = r.data.results?.[0];
  if (!result) throw new Error('No results found');
  return { lat: result.geometry.lat, lng: result.geometry.lng, formatted: result.formatted, provider: 'opencage' };
}

async function geocodeMapbox(address: string): Promise<any> {
  const encoded = encodeURIComponent(address);
  const r = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`, {
    params: { access_token: MAPBOX_KEY, limit: 1 },
    timeout: 10000,
  });
  const feature = r.data.features?.[0];
  if (!feature) throw new Error('No results found');
  return { lat: feature.center[1], lng: feature.center[0], formatted: feature.place_name, provider: 'mapbox' };
}

async function reverseOpenCage(lat: number, lng: number): Promise<any> {
  const r = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
    params: { q: `${lat}+${lng}`, key: OPENCAGE_KEY, limit: 1, no_annotations: 1 },
    timeout: 10000,
  });
  const result = r.data.results?.[0];
  if (!result) throw new Error('No results found');
  return { formatted: result.formatted, components: result.components, provider: 'opencage' };
}

async function reverseMapbox(lat: number, lng: number): Promise<any> {
  const r = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`, {
    params: { access_token: MAPBOX_KEY, limit: 1 },
    timeout: 10000,
  });
  const feature = r.data.features?.[0];
  if (!feature) throw new Error('No results found');
  return { formatted: feature.place_name, provider: 'mapbox' };
}

// Geocode
router.post('/geocode', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: Joi.string().min(2).required() }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    let result: any;
    try { result = await geocodeOpenCage(value.address); }
    catch { result = await geocodeMapbox(value.address); }
    res.json({ success: true, data: result, metadata: { latency_ms: Date.now() - start } });
  } catch (err: any) { res.status(502).json({ error: 'Geocoding failed', details: err.message }); }
});

// Reverse geocode
router.post('/reverse', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    let result: any;
    try { result = await reverseOpenCage(value.lat, value.lng); }
    catch { result = await reverseMapbox(value.lat, value.lng); }
    res.json({ success: true, data: result, metadata: { latency_ms: Date.now() - start } });
  } catch (err: any) { res.status(502).json({ error: 'Reverse geocoding failed', details: err.message }); }
});

// Autocomplete
router.post('/autocomplete', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    q: Joi.string().min(2).required(),
    limit: Joi.number().integer().min(1).max(10).default(5),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    const encoded = encodeURIComponent(value.q);
    const r = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`, {
      params: { access_token: MAPBOX_KEY, limit: value.limit, autocomplete: true },
      timeout: 10000,
    });
    const results = (r.data.features || []).map((f: any) => ({ place_name: f.place_name, lat: f.center[1], lng: f.center[0] }));
    res.json({ success: true, data: results, metadata: { latency_ms: Date.now() - start } });
  } catch (err: any) { res.status(502).json({ error: 'Autocomplete failed', details: err.message }); }
});

// Distance
router.post('/distance', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    lat1: Joi.number().min(-90).max(90).required(),
    lng1: Joi.number().min(-180).max(180).required(),
    lat2: Joi.number().min(-90).max(90).required(),
    lng2: Joi.number().min(-180).max(180).required(),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  const { lat1, lng1, lat2, lng2 } = value;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  res.json({ success: true, data: { distance_km: Math.round(km * 100) / 100, distance_miles: Math.round(km * 0.621371 * 100) / 100 }, metadata: { latency_ms: Date.now() - start } });
});

// Batch geocode
router.post('/batch', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    addresses: Joi.array().items(Joi.string().min(2)).min(1).max(10).required(),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  const results = await Promise.allSettled(value.addresses.map((a: string) =>
    geocodeOpenCage(a).catch(() => geocodeMapbox(a))
  ));
  const out = results.map((r, i) => ({
    address: value.addresses[i],
    success: r.status === 'fulfilled',
    data: r.status === 'fulfilled' ? r.value : null,
    error: r.status === 'rejected' ? r.reason?.message : null,
  }));
  res.json({ success: true, data: out, metadata: { latency_ms: Date.now() - start } });
});

export default router;
