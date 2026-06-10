import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

// ---- ESPN sport/league mapping -------------------------------------------
// Map a user-supplied sport/league hint to ESPN's {sportPath, league} pair.
const LEAGUE_MAP: Record<string, { sportPath: string; league: string }> = {
  nba: { sportPath: 'basketball', league: 'nba' },
  wnba: { sportPath: 'basketball', league: 'wnba' },
  ncaab: { sportPath: 'basketball', league: 'mens-college-basketball' },
  'mens-college-basketball': { sportPath: 'basketball', league: 'mens-college-basketball' },
  nfl: { sportPath: 'football', league: 'nfl' },
  ncaaf: { sportPath: 'football', league: 'college-football' },
  'college-football': { sportPath: 'football', league: 'college-football' },
  mlb: { sportPath: 'baseball', league: 'mlb' },
  nhl: { sportPath: 'hockey', league: 'nhl' },
  mls: { sportPath: 'soccer', league: 'usa.1' },
  epl: { sportPath: 'soccer', league: 'eng.1' },
  'premier-league': { sportPath: 'soccer', league: 'eng.1' },
  'premier league': { sportPath: 'soccer', league: 'eng.1' },
  laliga: { sportPath: 'soccer', league: 'esp.1' },
  'la-liga': { sportPath: 'soccer', league: 'esp.1' },
  'la liga': { sportPath: 'soccer', league: 'esp.1' },
  ucl: { sportPath: 'soccer', league: 'uefa.champions' },
  'champions-league': { sportPath: 'soccer', league: 'uefa.champions' },
};

const SUPPORTED_LEAGUES = ['nba', 'wnba', 'ncaab', 'nfl', 'ncaaf', 'mlb', 'nhl', 'mls', 'epl/premier-league', 'laliga', 'ucl'];

function resolveLeague(sport?: string, league?: string): { sportPath: string; league: string } | null {
  // Prefer the most specific hint: an explicit league wins, else fall back to sport.
  const candidates = [league, sport].filter(Boolean).map((s) => String(s).trim().toLowerCase());
  for (const c of candidates) {
    if (LEAGUE_MAP[c]) return LEAGUE_MAP[c];
  }
  // Bare-sport fallbacks (e.g. sport:"basketball" with no league → default to NBA).
  const sportOnly = (sport || '').trim().toLowerCase();
  if (sportOnly === 'basketball') return LEAGUE_MAP.nba;
  if (sportOnly === 'football') return LEAGUE_MAP.nfl;
  if (sportOnly === 'baseball') return LEAGUE_MAP.mlb;
  if (sportOnly === 'hockey') return LEAGUE_MAP.nhl;
  if (sportOnly === 'soccer') return LEAGUE_MAP.epl;
  return null;
}

// ---- Bounded HTTP helper --------------------------------------------------
// 15s timeout + up to 2 retries on 429/5xx/timeout. Never throws indefinitely;
// callers convert thrown errors to 200 success:false envelopes.
async function httpGet(url: string): Promise<any> {
  const MAX_RETRIES = 2;
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { Accept: 'application/json', 'User-Agent': 'orbis-sports-scores/1.0' },
      });
      return res.data;
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable = !status || status === 429 || status >= 500 || e?.code === 'ECONNABORTED';
      if (attempt < MAX_RETRIES && retryable) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
}

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';

function mapState(state?: string): string {
  if (state === 'in') return 'live';
  if (state === 'post') return 'final';
  return 'scheduled';
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Map one ESPN scoreboard event → existing games[] item shape.
function mapEvent(ev: any) {
  const comp = (ev?.competitions || [])[0] || {};
  const competitors = comp.competitors || [];
  const home = competitors.find((c: any) => c.homeAway === 'home') || {};
  const away = competitors.find((c: any) => c.homeAway === 'away') || {};
  const type = ev?.status?.type || comp?.status?.type || {};
  return {
    game_id: String(ev?.id ?? ''),
    home_team: home?.team?.displayName ?? home?.team?.abbreviation ?? null,
    away_team: away?.team?.displayName ?? away?.team?.abbreviation ?? null,
    home_score: num(home?.score),
    away_score: num(away?.score),
    status: mapState(type?.state),
    period: type?.shortDetail ?? null,
    time_remaining: type?.shortDetail ?? null,
    start_time: ev?.date ?? null,
    venue: comp?.venue?.fullName ?? null,
  };
}

function unsupportedSport(res: Response, sport: any, league: any) {
  return res.status(200).json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: false,
    error: 'unsupported_sport',
    detail: `sport/league not recognized: sport="${sport ?? ''}", league="${league ?? ''}"`,
    supported_leagues: SUPPORTED_LEAGUES,
  });
}

function upstreamError(res: Response, e: any) {
  return res.status(200).json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: false,
    error: 'upstream_unavailable',
    detail: e?.message || 'ESPN request failed',
    retryable: true,
  });
}

// ---- GET / ----------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Sports Scores API', info: '/sports-scores/info', openapi: '/sports-scores/openapi.json', health: 'ok' });
});

// ---- POST /live-scores ----------------------------------------------------
router.post('/live-scores', async (req: Request, res: Response) => {
  const { sport, league, date } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  const lk = resolveLeague(sport, league);
  if (!lk) return unsupportedSport(res, sport, league);
  try {
    let url = `${ESPN}/${lk.sportPath}/${lk.league}/scoreboard`;
    if (date) url += `?dates=${String(date).replace(/-/g, '')}`; // ESPN wants YYYYMMDD
    const data = await httpGet(url);
    const events = Array.isArray(data?.events) ? data.events : [];
    const games = events.map(mapEvent);
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      sport,
      league: league || lk.league,
      games,
      total_games: games.length,
      data_notes: games.length === 0 ? ['No games found for this sport/league/date'] : [],
      source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 60,
      cache_recommended: true,
      recommended_next_api: 'sports-scores',
      recommended_next_endpoint: '/game-details',
      automation_safe: true,
      confidence_per_section: { games: games.length ? 0.95 : 0.5 },
      recommended_actions_priority_order: ['monitor live games', 'get game details', 'check predictions'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// ---- POST /game-details ---------------------------------------------------
router.post('/game-details', async (req: Request, res: Response) => {
  const { game_id, sport, league } = req.body;
  if (!game_id) return res.status(400).json({ error: 'game_id is required' });
  // ESPN summary requires a sport/league path. Default to NBA if not given.
  const lk = resolveLeague(sport, league) || LEAGUE_MAP.nba;
  try {
    const data = await httpGet(`${ESPN}/${lk.sportPath}/${lk.league}/summary?event=${encodeURIComponent(String(game_id))}`);
    const notes: string[] = [];

    const headerComp = (data?.header?.competitions || [])[0] || {};
    const competitors = headerComp.competitors || [];
    const home = competitors.find((c: any) => c.homeAway === 'home') || {};
    const away = competitors.find((c: any) => c.homeAway === 'away') || {};
    const type = headerComp?.status?.type || {};

    // Boxscore team stats (real, if present) → keyed home/away.
    const bxTeams = Array.isArray(data?.boxscore?.teams) ? data.boxscore.teams : [];
    function statsFor(side: 'home' | 'away') {
      const t = bxTeams.find((x: any) => x.homeAway === side);
      if (!t || !Array.isArray(t.statistics)) return null;
      const out: Record<string, any> = {};
      for (const s of t.statistics) {
        if (s?.name) out[s.name] = s.displayValue ?? s.value ?? null;
      }
      return Object.keys(out).length ? out : null;
    }
    const teamStatsHome = statsFor('home');
    const teamStatsAway = statsFor('away');
    if (!bxTeams.length) notes.push('ESPN did not return boxscore team_stats for this game');

    // Scoring plays: ESPN's summary uses `scoringPlays` only for some sports.
    const scoringPlaysRaw = Array.isArray(data?.scoringPlays) ? data.scoringPlays : [];
    const scoring_events = scoringPlaysRaw.map((p: any) => ({
      time: p?.clock?.displayValue ?? null,
      team: p?.team?.displayName ?? p?.team?.abbreviation ?? null,
      player: null, // ESPN scoringPlays do not include a single scorer field reliably
      event_type: p?.type?.text ?? p?.scoringType?.displayName ?? null,
      score_after: (p?.homeScore !== undefined && p?.awayScore !== undefined) ? `${p.homeScore}-${p.awayScore}` : null,
    }));
    if (!scoringPlaysRaw.length) notes.push('ESPN did not return scoring_events for this sport/game');

    const attendance = num(data?.gameInfo?.attendance);
    if (attendance === null) notes.push('attendance not provided by ESPN');

    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      game_id: String(game_id),
      details: {
        home_team: home?.team?.displayName ?? home?.team?.abbreviation ?? null,
        away_team: away?.team?.displayName ?? away?.team?.abbreviation ?? null,
        home_score: num(home?.score),
        away_score: num(away?.score),
        status: mapState(type?.state),
        period: type?.shortDetail ?? null,
        time_remaining: type?.shortDetail ?? null,
        venue: data?.gameInfo?.venue?.fullName ?? headerComp?.venue?.fullName ?? null,
        attendance,
        officials: Array.isArray(data?.gameInfo?.officials)
          ? data.gameInfo.officials.map((o: any) => o?.displayName ?? o?.fullName).filter(Boolean)
          : null,
        scoring_events,
        team_stats: { home: teamStatsHome, away: teamStatsAway },
      },
      data_notes: notes,
      source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 60,
      cache_recommended: true,
      recommended_next_api: 'sports-scores',
      recommended_next_endpoint: '/game-prediction',
      automation_safe: true,
      confidence_per_section: { details: 0.95 },
      recommended_actions_priority_order: ['check team_stats', 'review scoring_events', 'get prediction'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 404 || status === 400) {
      return res.status(200).json({
        trace_id: traceId(),
        computed_at: new Date().toISOString(),
        success: false,
        error: 'game_not_found',
        detail: `No game found for game_id="${game_id}" in ${lk.league}`,
        retryable: false,
      });
    }
    return upstreamError(res, e);
  }
});

// ---- POST /team-stats -----------------------------------------------------
router.post('/team-stats', async (req: Request, res: Response) => {
  const { team, sport, league, season } = req.body;
  if (!team || !sport) return res.status(400).json({ error: 'team and sport are required' });
  const lk = resolveLeague(sport, league);
  if (!lk) return unsupportedSport(res, sport, league);
  try {
    // Try a direct team lookup (abbreviation/id) first, else fall back to the
    // full teams list and match by abbreviation / displayName / name.
    let teamObj: any = null;
    const directKey = String(team).trim();
    try {
      const direct = await httpGet(`${ESPN}/${lk.sportPath}/${lk.league}/teams/${encodeURIComponent(directKey)}`);
      teamObj = direct?.team ?? null;
    } catch { /* fall through to list match */ }

    if (!teamObj) {
      const list = await httpGet(`${ESPN}/${lk.sportPath}/${lk.league}/teams`);
      const entries = list?.sports?.[0]?.leagues?.[0]?.teams || [];
      const needle = directKey.toLowerCase();
      const match = entries.find((e: any) => {
        const t = e.team || {};
        return [t.abbreviation, t.displayName, t.name, t.shortDisplayName, t.location, t.nickname]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase() === needle);
      }) || entries.find((e: any) => {
        const t = e.team || {};
        return [t.displayName, t.name, t.location].filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(needle));
      });
      teamObj = match?.team ?? null;
    }

    if (!teamObj) {
      return res.status(200).json({
        trace_id: traceId(),
        computed_at: new Date().toISOString(),
        success: false,
        error: 'team_not_found',
        detail: `No team matched "${team}" in ${lk.league}`,
        retryable: false,
      });
    }

    const notes: string[] = [];
    const recItems = teamObj?.record?.items || [];
    const overall = recItems.find((r: any) => r.type === 'total') || recItems[0] || {};
    const statMap: Record<string, number | null> = {};
    for (const s of overall.stats || []) {
      if (s?.name) statMap[s.name] = num(s.value);
    }
    const homeRec = recItems.find((r: any) => r.type === 'home');
    const awayRec = recItems.find((r: any) => r.type === 'road' || r.type === 'away');

    const wins = statMap.wins ?? null;
    const losses = statMap.losses ?? null;
    const ties = statMap.ties ?? null;
    const winPct = statMap.winPercent ?? statMap.leagueWinPercent ?? null;

    notes.push('top_performers not exposed by ESPN teams endpoint');
    if (statMap.streak === undefined && !overall.summary) notes.push('current_streak not provided');

    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      team: teamObj?.displayName ?? team,
      sport,
      season: season || 'current',
      stats: {
        wins,
        losses,
        draws: ties,
        win_rate: winPct,
        points_scored_avg: statMap.avgPointsFor ?? null,
        points_allowed_avg: statMap.avgPointsAgainst ?? null,
        home_record: homeRec?.summary ?? null,
        away_record: awayRec?.summary ?? null,
        current_streak: statMap.streak !== undefined && statMap.streak !== null
          ? (statMap.streak > 0 ? `W${statMap.streak}` : statMap.streak < 0 ? `L${Math.abs(statMap.streak)}` : null)
          : null,
        record_summary: overall.summary ?? null,
        standing_summary: teamObj?.standingSummary ?? null,
        top_performers: null,
      },
      data_notes: notes,
      source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'sports-scores',
      recommended_next_endpoint: '/game-prediction',
      automation_safe: true,
      confidence_per_section: { stats: 0.85 },
      recommended_actions_priority_order: ['check win_rate', 'review record_summary', 'compare vs opponent'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// ---- POST /execution-gate -------------------------------------------------
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { sport, objective } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  const lk = resolveLeague(sport, req.body?.league);
  const blocking_flags = lk ? [] : ['UNSUPPORTED_SPORT'];
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: blocking_flags.length === 0,
    sport,
    objective: objective || 'scores_monitoring',
    model: 'none',
    provider: 'espn',
    next_api: 'sports-scores',
    next_endpoint: '/live-scores',
    blocking_flags,
    flag_definitions: {
      NO_SPORT: 'sport is required',
      UNSUPPORTED_SPORT: `sport/league not in supported set: ${SUPPORTED_LEAGUES.join(', ')}`,
      INVALID_DATE: 'date must be in YYYY-MM-DD format',
    },
    source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'sports-scores',
    recommended_next_endpoint: '/live-scores',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get live scores', 'Fetch game details', 'Check predictions'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- POST /sports-intelligence (ONE-CALL) ---------------------------------
router.post('/sports-intelligence', async (req: Request, res: Response) => {
  const { sport, league, context } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  const lk = resolveLeague(sport, league);
  if (!lk) return unsupportedSport(res, sport, league);
  try {
    const data = await httpGet(`${ESPN}/${lk.sportPath}/${lk.league}/scoreboard`);
    const events = Array.isArray(data?.events) ? data.events : [];
    const games = events.map(mapEvent);
    const liveCount = games.filter((g: any) => g.status === 'live').length;
    const finalCount = games.filter((g: any) => g.status === 'final').length;
    const scheduledCount = games.filter((g: any) => g.status === 'scheduled').length;

    const live_games = games.map((g: any) => ({
      game_id: g.game_id,
      home_team: g.home_team,
      away_team: g.away_team,
      score: g.home_score !== null && g.away_score !== null ? `${g.home_score}-${g.away_score}` : null,
      status: g.status,
    }));

    // Deterministic scoring/findings derived purely from the real scoreboard.
    const overall_score = games.length === 0 ? 0 : Math.round((liveCount * 1.0 + finalCount * 0.5 + scheduledCount * 0.25) / games.length * 100) / 100;
    const key_findings: string[] = [];
    if (liveCount) key_findings.push(`${liveCount} game(s) currently live`);
    if (finalCount) key_findings.push(`${finalCount} game(s) final`);
    if (scheduledCount) key_findings.push(`${scheduledCount} game(s) scheduled`);
    if (!games.length) key_findings.push('No games on the scoreboard for this league right now');

    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      sport,
      league: league || lk.league,
      context: context || 'general',
      overall_score,
      summary: games.length
        ? `${games.length} game(s) on ${lk.league} scoreboard: ${liveCount} live, ${finalCount} final, ${scheduledCount} scheduled.`
        : `No ${lk.league} games found.`,
      key_findings,
      live_games,
      top_performers_today: null, // not derivable from scoreboard without per-game summaries
      standings_snapshot: null, // requires standings endpoint; not fabricated here
      notable_injuries: null, // available only per-game via /game-details summary
      data_notes: [
        'top_performers_today, standings_snapshot and notable_injuries are null: not available from the scoreboard feed without additional per-game/standings calls; not fabricated',
      ],
      source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 300,
      cache_recommended: true,
      recommended_next_api: 'betting-odds',
      recommended_next_endpoint: '/odds',
      automation_safe: true,
      confidence_per_section: { live_games: games.length ? 0.9 : 0.5, overall_score: 0.85 },
      recommended_actions_priority_order: ['monitor live_games', 'get game details', 'review standings'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// ---- POST /game-prediction ------------------------------------------------
// Uses ESPN's real `predictor` (win probability) when available. If the game
// id isn't known, falls back to a transparent heuristic from each team's real
// win-loss record. Never fabricates a precise ESPN probability.
router.post('/game-prediction', async (req: Request, res: Response) => {
  const { home_team, away_team, sport, league, game_id, game_date } = req.body;
  if (!home_team || !away_team || !sport) return res.status(400).json({ error: 'home_team, away_team, and sport are required' });
  const lk = resolveLeague(sport, league);
  if (!lk) return unsupportedSport(res, sport, league);

  const base = {
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    home_team,
    away_team,
    sport,
    league: league || lk.league,
  };
  const tail = {
    source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
    cache_ttl_seconds: 3600,
    cache_recommended: true,
    recommended_next_api: 'betting-odds',
    recommended_next_endpoint: '/arbitrage',
    automation_safe: true,
    privacy: { data_stored: false, retention: 'none' },
  };

  try {
    // ---- Path A: ESPN's real predictor via the game summary ----
    if (game_id) {
      try {
        const data = await httpGet(`${ESPN}/${lk.sportPath}/${lk.league}/summary?event=${encodeURIComponent(String(game_id))}`);
        const pred = data?.predictor;
        const headerComp = (data?.header?.competitions || [])[0] || {};
        const competitors = headerComp.competitors || [];
        const homeId = competitors.find((c: any) => c.homeAway === 'home')?.team?.id;
        const awayId = competitors.find((c: any) => c.homeAway === 'away')?.team?.id;
        if (pred?.homeTeam?.gameProjection !== undefined && pred?.awayTeam?.gameProjection !== undefined) {
          const homeP = num(pred.homeTeam.gameProjection);
          const awayP = num(pred.awayTeam.gameProjection);
          const homeProb = homeP !== null ? homeP / 100 : null;
          const awayProb = awayP !== null ? awayP / 100 : null;
          // Align ESPN predictor ids to home/away (defensive; usually matches order).
          const aligned = (pred.homeTeam.id === String(homeId) || pred.awayTeam.id === String(awayId));
          return res.json({
            ...base,
            prediction: {
              winner: homeProb !== null && awayProb !== null ? (homeProb >= awayProb ? 'home' : 'away') : null,
              win_probability: { home: homeProb, away: awayProb, draw: null },
              predicted_score: null, // ESPN predictor does not return a score line
              confidence: homeProb !== null && awayProb !== null ? Math.max(homeProb, awayProb) : null,
            },
            method: 'espn_predictor',
            method_note: aligned
              ? "Win probabilities are ESPN's real Matchup Predictor gameProjection values."
              : "ESPN predictor used; team-id alignment to home/away could not be fully confirmed.",
            team_momentum: null,
            key_factors: null,
            injury_impact: null,
            data_notes: ['predicted_score, team_momentum, key_factors and injury_impact are null: not provided by ESPN predictor; not fabricated'],
            confidence_per_section: { prediction: 0.85 },
            recommended_actions_priority_order: ['review win_probability', 'compare with betting odds', 'check game details'],
            ...tail,
          });
        }
      } catch { /* fall through to heuristic */ }
    }

    // ---- Path B: transparent heuristic from real team records ----
    async function recordFor(name: string): Promise<{ wins: number | null; losses: number | null; winPct: number | null; resolved: string | null }> {
      try {
        let teamObj: any = null;
        try {
          const direct = await httpGet(`${ESPN}/${lk!.sportPath}/${lk!.league}/teams/${encodeURIComponent(name)}`);
          teamObj = direct?.team ?? null;
        } catch { /* try list */ }
        if (!teamObj) {
          const list = await httpGet(`${ESPN}/${lk!.sportPath}/${lk!.league}/teams`);
          const entries = list?.sports?.[0]?.leagues?.[0]?.teams || [];
          const needle = name.toLowerCase();
          const match = entries.find((e: any) => {
            const t = e.team || {};
            return [t.abbreviation, t.displayName, t.name, t.shortDisplayName, t.location, t.nickname]
              .filter(Boolean).some((v: string) => String(v).toLowerCase() === needle);
          }) || entries.find((e: any) => {
            const t = e.team || {};
            return [t.displayName, t.name, t.location].filter(Boolean)
              .some((v: string) => String(v).toLowerCase().includes(needle));
          });
          teamObj = match?.team ?? null;
        }
        if (!teamObj) return { wins: null, losses: null, winPct: null, resolved: null };
        const overall = (teamObj.record?.items || []).find((r: any) => r.type === 'total') || (teamObj.record?.items || [])[0] || {};
        const sm: Record<string, number | null> = {};
        for (const s of overall.stats || []) if (s?.name) sm[s.name] = num(s.value);
        return {
          wins: sm.wins ?? null,
          losses: sm.losses ?? null,
          winPct: sm.winPercent ?? sm.leagueWinPercent ?? null,
          resolved: teamObj.displayName ?? null,
        };
      } catch {
        return { wins: null, losses: null, winPct: null, resolved: null };
      }
    }

    const [homeRec, awayRec] = await Promise.all([recordFor(String(home_team)), recordFor(String(away_team))]);

    const hPct = homeRec.winPct ?? (homeRec.wins !== null && homeRec.losses !== null && (homeRec.wins + homeRec.losses) > 0 ? homeRec.wins / (homeRec.wins + homeRec.losses) : null);
    const aPct = awayRec.winPct ?? (awayRec.wins !== null && awayRec.losses !== null && (awayRec.wins + awayRec.losses) > 0 ? awayRec.wins / (awayRec.wins + awayRec.losses) : null);

    let winProbHome: number | null = null;
    let winProbAway: number | null = null;
    if (hPct !== null && aPct !== null) {
      const sum = hPct + aPct;
      if (sum > 0) {
        winProbHome = Math.round((hPct / sum) * 1000) / 1000;
        winProbAway = Math.round((aPct / sum) * 1000) / 1000;
      }
    }

    const notes: string[] = [];
    if (winProbHome === null) notes.push('Could not resolve real win-loss records for both teams; win_probability is null (not fabricated)');
    if (!game_id) notes.push('No game_id supplied, so ESPN predictor was unavailable; used heuristic from real season records');
    notes.push('predicted_score, team_momentum, key_factors and injury_impact are null: not derivable from records alone; not fabricated');

    return res.json({
      ...base,
      prediction: {
        winner: winProbHome !== null && winProbAway !== null ? (winProbHome >= winProbAway ? 'home' : 'away') : null,
        win_probability: { home: winProbHome, away: winProbAway, draw: null },
        predicted_score: null,
        confidence: winProbHome !== null && winProbAway !== null ? Math.max(winProbHome, winProbAway) : null,
      },
      method: 'heuristic_from_records',
      method_note: 'Win probability is a HEURISTIC derived from each team\'s real ESPN season win percentage (normalized), NOT an ESPN-published prediction.',
      inputs: {
        home: { resolved_team: homeRec.resolved, wins: homeRec.wins, losses: homeRec.losses, win_pct: hPct },
        away: { resolved_team: awayRec.resolved, wins: awayRec.wins, losses: awayRec.losses, win_pct: aPct },
      },
      team_momentum: null,
      key_factors: null,
      injury_impact: null,
      data_notes: notes,
      confidence_per_section: { prediction: winProbHome !== null ? 0.5 : 0.2 },
      recommended_actions_priority_order: ['treat as heuristic only', 'compare with betting odds', 'pass game_id for ESPN predictor'],
      ...tail,
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// ---- POST /batch ----------------------------------------------------------
// Accepts multiple {sport, league} entries and returns a real scoreboard for
// each (capped at 5). Backward-compatible with a legacy {games:[{game_id}]}
// payload by treating it as a single error note rather than 500-ing.
router.post('/batch', async (req: Request, res: Response) => {
  const MAX = 5;
  let requests: Array<{ sport?: string; league?: string }> = [];
  if (Array.isArray(req.body?.requests)) requests = req.body.requests;
  else if (Array.isArray(req.body?.games)) {
    // Legacy shape: array of {game_id}. We can't infer sport/league from a bare
    // id, so surface a clear note instead of fabricating.
    return res.status(200).json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: false,
      error: 'unsupported_batch_shape',
      detail: 'Provide requests:[{sport,league}] to fetch real scoreboards. Bare game_id batches are not supported (sport/league cannot be inferred from an id).',
      retryable: false,
    });
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    return res.status(400).json({ error: 'requests array is required (each: {sport, league})' });
  }
  if (requests.length > MAX) return res.status(400).json({ error: `Maximum ${MAX} requests per batch` });

  try {
    const results = await Promise.all(requests.map(async (r) => {
      const lk = resolveLeague(r.sport, r.league);
      if (!lk) {
        return { sport: r.sport ?? null, league: r.league ?? null, success: false, error: 'unsupported_sport', supported_leagues: SUPPORTED_LEAGUES, games: [], total_games: 0 };
      }
      try {
        const data = await httpGet(`${ESPN}/${lk.sportPath}/${lk.league}/scoreboard`);
        const events = Array.isArray(data?.events) ? data.events : [];
        const games = events.map(mapEvent);
        return { sport: r.sport ?? null, league: r.league || lk.league, success: true, games, total_games: games.length };
      } catch (e: any) {
        return { sport: r.sport ?? null, league: r.league ?? null, success: false, error: 'upstream_unavailable', detail: e?.message || 'ESPN request failed', retryable: true, games: [], total_games: 0 };
      }
    }));

    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: requests.length,
      results,
      source_provenance: { provider: 'espn', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 60,
      cache_recommended: true,
      recommended_next_api: 'sports-scores',
      recommended_next_endpoint: '/game-details',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

export default router;
