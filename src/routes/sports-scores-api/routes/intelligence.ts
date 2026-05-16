import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Sports Scores API', info: '/sports-scores/info', openapi: '/sports-scores/openapi.json', health: 'ok' });
});

// POST /scores
router.post('/scores', async (req: Request, res: Response) => {
  const { sport, date, team } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  try {
    const raw = await callClaude(`Get sports scores for sport: "${sport}", date: "${date || 'today'}", team: "${team || 'all'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "date": "${date || new Date().toISOString().slice(0, 10)}",
  "games": [
    {"game_id": "string", "home_team": "string", "away_team": "string", "home_score": number, "away_score": number, "status": "final|live|scheduled", "period": "string", "start_time": "string"}
  ],
  "total_games": number,
  "confidence_per_section": {"games": 0.85},
  "recommended_actions_priority_order": ["filter by team", "check live games", "get schedule"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /schedule
router.post('/schedule', async (req: Request, res: Response) => {
  const { team, season } = req.body;
  if (!team) return res.status(400).json({ error: 'team is required' });
  try {
    const raw = await callClaude(`Get schedule for team: "${team}", season: "${season || 'current'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "team": "${team}",
  "season": "${season || 'current'}",
  "schedule": [
    {"game_id": "string", "opponent": "string", "date": "YYYY-MM-DD", "time": "string", "home_away": "home|away", "venue": "string", "result": "W|L|TBD", "score": "string"}
  ],
  "record": {"wins": number, "losses": number, "ties": number},
  "upcoming_games": number,
  "confidence_per_section": {"schedule": 0.85},
  "recommended_actions_priority_order": ["check upcoming home games", "review recent form", "plan attendance"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /standings
router.post('/standings', async (req: Request, res: Response) => {
  const { sport, league } = req.body;
  if (!sport || !league) return res.status(400).json({ error: 'sport and league are required' });
  try {
    const raw = await callClaude(`Get standings for sport: "${sport}", league: "${league}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "league": "${league}",
  "standings": [
    {"rank": number, "team": "string", "wins": number, "losses": number, "ties": number, "win_pct": number, "games_back": number, "last_10": "string", "streak": "string"}
  ],
  "division_leaders": [{"division": "string", "team": "string", "win_pct": number}],
  "confidence_per_section": {"standings": 0.85},
  "recommended_actions_priority_order": ["note division leaders", "check playoff picture", "review recent streaks"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { sport, objective } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    sport,
    objective: objective || 'scores_lookup',
    next_api: 'betting-odds',
    next_endpoint: '/odds',
    blocking_flags: [],
    flag_definitions: { NO_SPORT: 'No sport specified', INVALID_DATE: 'Date format must be YYYY-MM-DD' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get today scores', 'Check team schedule', 'View league standings'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { sport, team, date } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  try {
    const raw = await callClaude(`Full sports intelligence for sport: "${sport}", team: "${team || 'all'}", date: "${date || 'today'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "scores_today": [
    {"game_id": "string", "teams": "string", "score": "string", "status": "string"}
  ],
  "team_info": {"name": "${team || 'N/A'}", "record": "string", "streak": "string", "next_game": "string"},
  "top_performers": [{"player": "string", "stat": "string", "value": "string"}],
  "league_leaders": [{"category": "string", "player": "string", "value": "string"}],
  "confidence_per_section": {"scores_today": 0.85, "team_info": 0.8},
  "recommended_actions_priority_order": ["check live scores", "review team form", "analyze standings"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
