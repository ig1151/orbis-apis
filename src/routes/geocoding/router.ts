import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();

const OPENCAGE_KEY = process.env.OPENCAGE_API_KEY;
const MAPBOX_KEY = process.env.MAPBOX_API_KEY;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function geocodeOpenCage(address: string): Promise<any> {
  const r = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
    params: { q: address, key: OPENCAGE_KEY, limit: 1, no_annotations: 1 },
    timeout: 10000,
  });
  const result = r.data.results?.[0];
  if (!result) throw new Error('No results found');
  return { lat: result.geometry.lat, lng: result.geometry.lng, formatted: result.formatted, confidence: result.confidence, components: result.components, provider: 'opencage' };
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

async function geocode(address: string): Promise<any> {
  try { return await geocodeOpenCage(address); }
  catch { return await geocodeMapbox(address); }
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

// POST /geocode
router.post('/geocode', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: Joi.string().min(2).required() }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    const result = await geocode(value.address);
    res.json({ success: true, data: result, metadata: { latency_ms: Date.now() - start } });
  } catch (err: any) { res.status(502).json({ error: 'Geocoding failed', details: err.message }); }
});

// POST /reverse
router.post('/reverse', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ lat: Joi.number().min(-90).max(90).required(), lng: Joi.number().min(-180).max(180).required() }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    let result: any;
    try { result = await reverseOpenCage(value.lat, value.lng); }
    catch { result = await reverseMapbox(value.lat, value.lng); }
    res.json({ success: true, data: result, metadata: { latency_ms: Date.now() - start } });
  } catch (err: any) { res.status(502).json({ error: 'Reverse geocoding failed', details: err.message }); }
});

// POST /autocomplete
router.post('/autocomplete', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ q: Joi.string().min(2).required(), limit: Joi.number().integer().min(1).max(10).default(5) }).validate(req.body);
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

// POST /distance
router.post('/distance', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    lat1: Joi.number().min(-90).max(90).required(), lng1: Joi.number().min(-180).max(180).required(),
    lat2: Joi.number().min(-90).max(90).required(), lng2: Joi.number().min(-180).max(180).required(),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  const { lat1, lng1, lat2, lng2 } = value;
  const km = haversine(lat1, lng1, lat2, lng2);
  res.json({ success: true, data: { distance_km: Math.round(km * 100) / 100, distance_miles: Math.round(km * 0.621371 * 100) / 100 }, metadata: { latency_ms: Date.now() - start } });
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ addresses: Joi.array().items(Joi.string().min(2)).min(1).max(10).required() }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  const results = await Promise.allSettled(value.addresses.map((a: string) => geocode(a)));
  const out = results.map((r, i) => ({
    address: value.addresses[i],
    success: r.status === 'fulfilled',
    data: r.status === 'fulfilled' ? r.value : null,
    error: r.status === 'rejected' ? r.reason?.message : null,
  }));
  res.json({ success: true, data: out, metadata: { latency_ms: Date.now() - start } });
});

// POST /validate-address
router.post('/validate-address', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: Joi.string().min(2).required() }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    const result = await geocodeOpenCage(value.address);
    const confidence = result.confidence || 0;
    const components = result.components || {};
    const hasStreet = !!(components.road || components.street);
    const hasCity = !!(components.city || components.town || components.village);
    const hasCountry = !!components.country;
    const valid = confidence >= 7 && hasCountry;
    const deliverable = confidence >= 8 && hasStreet && hasCity;
    res.json({
      success: true,
      data: {
        valid,
        deliverable,
        confidence,
        formatted: result.formatted,
        lat: result.lat,
        lng: result.lng,
        components,
        issues: [
          ...(!hasStreet ? ['missing street'] : []),
          ...(!hasCity ? ['missing city'] : []),
          ...(!hasCountry ? ['missing country'] : []),
          ...(confidence < 7 ? ['low geocoding confidence'] : []),
        ],
      },
      execution_ready: deliverable,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0015 },
    });
  } catch (err: any) { res.status(502).json({ error: 'Validation failed', details: err.message }); }
});

// POST /rank-locations
router.post('/rank-locations', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    origin: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() }).required(),
    locations: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    })).min(1).max(20).required(),
    sort_by: Joi.string().valid('distance', 'name').default('distance'),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  const { origin, locations, sort_by } = value;
  const ranked = locations.map((loc: any) => {
    const km = haversine(origin.lat, origin.lng, loc.lat, loc.lng);
    return { ...loc, distance_km: Math.round(km * 100) / 100, distance_miles: Math.round(km * 0.621371 * 100) / 100 };
  });
  if (sort_by === 'distance') ranked.sort((a: any, b: any) => a.distance_km - b.distance_km);
  else ranked.sort((a: any, b: any) => a.name.localeCompare(b.name));
  ranked.forEach((loc: any, i: number) => { loc.rank = i + 1; });
  res.json({ success: true, data: { origin, ranked, nearest: ranked[0], farthest: ranked[ranked.length - 1] }, metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0025 } });
});

// POST /route-distance
router.post('/route-distance', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    stops: Joi.array().items(Joi.object({
      name: Joi.string().optional(),
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    })).min(2).max(20).required(),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  const { stops } = value;
  let totalKm = 0;
  const legs: any[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const km = haversine(stops[i].lat, stops[i].lng, stops[i+1].lat, stops[i+1].lng);
    totalKm += km;
    legs.push({
      from: stops[i].name || `Stop ${i+1}`,
      to: stops[i+1].name || `Stop ${i+2}`,
      distance_km: Math.round(km * 100) / 100,
      distance_miles: Math.round(km * 0.621371 * 100) / 100,
    });
  }
  res.json({
    success: true,
    data: {
      total_stops: stops.length,
      total_km: Math.round(totalKm * 100) / 100,
      total_miles: Math.round(totalKm * 0.621371 * 100) / 100,
      legs,
    },
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0015 },
  });
});

// POST /normalize-location
router.post('/normalize-location', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: Joi.string().min(2).required() }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    const result = await geocodeOpenCage(value.address);
    const c = result.components || {};
    const normalized = {
      street_number: c.house_number || null,
      street: c.road || c.street || null,
      city: c.city || c.town || c.village || null,
      state: c.state || c.region || null,
      state_code: c.state_code || null,
      postal_code: c.postcode || null,
      country: c.country || null,
      country_code: c.country_code?.toUpperCase() || null,
      formatted: result.formatted,
      lat: result.lat,
      lng: result.lng,
    };
    res.json({ success: true, data: normalized, metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0015 } });
  } catch (err: any) { res.status(502).json({ error: 'Normalization failed', details: err.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    address: Joi.string().min(2).required(),
    intended_action: Joi.string().optional(),
    min_confidence: Joi.number().min(0).max(10).default(7),
    require_deliverable: Joi.boolean().default(true),
  }).validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  try {
    const result = await geocodeOpenCage(value.address);
    const confidence = result.confidence || 0;
    const c = result.components || {};
    const hasStreet = !!(c.road || c.street);
    const hasCity = !!(c.city || c.town || c.village);
    const deliverable = confidence >= 8 && hasStreet && hasCity;
    const meetsConfidence = confidence >= value.min_confidence;
    const execute = meetsConfidence && (!value.require_deliverable || deliverable);
    const blocking_reasons = [
      ...(!meetsConfidence ? [`confidence ${confidence} below threshold ${value.min_confidence}`] : []),
      ...(value.require_deliverable && !deliverable ? ['address not deliverable'] : []),
    ];
    res.json({
      success: true,
      execution_ready: execute,
      data: {
        execute,
        confidence,
        deliverable,
        formatted: result.formatted,
        lat: result.lat,
        lng: result.lng,
        blocking_reasons,
        intended_action: value.intended_action || null,
        recommendation: execute ? 'proceed' : 'abort',
      },
      next_api: execute ? 'action' : null,
      next_endpoint: execute ? '/action/execute' : null,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.003 },
    });
  } catch (err: any) { res.status(502).json({ error: 'Execution gate failed', details: err.message }); }
});

export default router;
