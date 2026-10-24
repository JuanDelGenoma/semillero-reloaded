import {
  CATEGORIES,
  FORMATION,
  POSITION_LINE,
  canPlayIn,
  categoryIndex,
  categoryInfo,
  naturalCategory,
  positionFit,
} from './categories'
import { CLUBS, clubById } from './data/clubs'
import { METRO_CATEGORIES, METRO_CLUBS, SEASON_WEEKS, makeFixtures, metroWeek } from './fixtures'
import { emptyStats, makeAcademy, makeIntake, makeRivalSquad } from './generate'
import {
  citizenshipCheck,
  dismissProspect,
  marketWeek,
  resolveDecision,
  signProspect,
  startMission,
  trialProspect,
} from './market'
import { BENCH_SIZE, playMatch, type Side, type SidePlayer } from './match'
import { departMessiCup, makeMessiCup, messiWeek, setMessiSquadIds } from './messi'
import { dutyWeek, isWindowWeek, nationalWindow } from './national'
import { Rng } from './rng'
import { autoBench, autoLineup, bestBench, bestEleven, eligiblePool, unavailability, type Context } from './squad'
import type {
  CategoryId,
  Competition,
  Cuts,
  GameState,
  Match,
  Player,
  Position,
  ScorerRow,
  ScoutRegion,
  StandingRow,
} from './types'
import { addNews as news, now, playerName, removePlayer, shortName, yearAge } from './util'

export { currentAge, euros, formatWeek, money, playerName, seasonDate, shortName, yearAge } from './util'
export { BENCH_SIZE, MAX_SUBS } from './match'
export {
  UNAVAILABLE_LABEL,
  autoBench,
  autoLineup,
  bestEleven,
  eligiblePool,
  lineupRating,
  pickedElsewhere,
  unavailability,
  BENCH_SHAPE,
  type Unavailability,
} from './squad'

export const FIRST_SEASON = 2027

const INJURIES: { description: string; min: number; max: number }[] = [
  { description: 'Sobrecarga muscular', min: 1, max: 1 },
  { description: 'Contractura en el gemelo', min: 1, max: 2 },
  { description: 'Esguince de tobillo', min: 2, max: 4 },
  { description: 'Desgarro en el isquiotibial', min: 3, max: 5 },
  { description: 'Golpe en la rodilla', min: 1, max: 2 },
  { description: 'Fractura de metatarsiano', min: 6, max: 9 },
  { description: 'Pubalgia', min: 3, max: 6 },
  { description: 'Rotura de ligamento cruzado', min: 22, max: 30 },
]

export const COMPETITION_NAME: Record<Competition, string> = {
  afa: 'Liga AFA',
  metro: 'Liga Metro',
}

function makeRivals(rng: Rng, userClubId: string, season: number) {
  const rivals: GameState['rivals'] = {}
  for (const club of CLUBS) {
    if (club.id === userClubId) continue
    rivals[club.id] = {}
    for (const cat of CATEGORIES) {
      rivals[club.id][cat.id] = makeRivalSquad(rng, club, cat.id, season)
    }
  }
  return rivals
}

function makeSeasonCompetitions(rng: Rng, clubId: string) {
  const others = CLUBS.filter((c) => c.id !== clubId).map((c) => c.id)
  const metroClubs = [clubId]
  while (metroClubs.length < METRO_CLUBS) metroClubs.push(others.splice(rng.int(0, others.length - 1), 1)[0])
  const matches = [
    ...makeFixtures(
      rng,
      CLUBS.map((c) => c.id),
    ),
    ...makeFixtures(rng, metroClubs, 'metro', METRO_CATEGORIES, metroWeek),
  ]
  return { metroClubs, matches }
}

export function newGame(clubId: string, managerName: string): GameState {
  const rng = new Rng(Math.floor(Math.random() * 2 ** 31))
  const club = clubById(clubId)
  const { metroClubs, matches } = makeSeasonCompetitions(rng, clubId)
  const state: GameState = {
    seed: 0,
    managerName,
    clubId,
    season: FIRST_SEASON,
    week: 1,
    players: makeAcademy(rng, club, FIRST_SEASON),
    rivals: makeRivals(rng, clubId, FIRST_SEASON),
    matches,
    lineups: {},
    benches: {},
    news: [],
    seasonOver: false,
    history: [],
    funds: 60 + club.prestige * 2,
    metroClubs,
    messiCup: makeMessiCup(rng, clubId, FIRST_SEASON),
    national: { qualified: {}, callUps: [] },
    decisions: [],
    prospects: [],
    missions: [],
    cuts: null,
    promotedThisSeason: [],
  }
  news(
    state,
    rng,
    'info',
    `Bienvenido a las inferiores de ${club.name}`,
    `La comisión directiva te confió la coordinación de las divisiones juveniles, de novena a cuarta. Armá los equipos de cada categoría y arranca la Liga AFA ${FIRST_SEASON}. Séptima, octava y novena juegan además la Liga Metro con los chicos que no suman minutos en AFA.`,
  )
  state.seed = rng.seed
  return state
}

/* ------------------------------ Standings ------------------------------- */

export function standings(state: GameState, cat: CategoryId, comp: Competition = 'afa'): StandingRow[] {
  const clubs = comp === 'afa' ? CLUBS.map((c) => c.id) : state.metroClubs
  const rows = new Map<string, StandingRow>()
  for (const id of clubs)
    rows.set(id, {
      clubId: id,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      pts: 0,
    })
  for (const m of state.matches) {
    if (m.competition !== comp || m.category !== cat || !m.played) continue
    const h = rows.get(m.homeId)!
    const a = rows.get(m.awayId)!
    h.pj++
    a.pj++
    h.gf += m.homeGoals
    h.gc += m.awayGoals
    a.gf += m.awayGoals
    a.gc += m.homeGoals
    if (m.homeGoals > m.awayGoals) {
      h.pg++
      a.pp++
      h.pts += 3
    } else if (m.homeGoals < m.awayGoals) {
      a.pg++
      h.pp++
      a.pts += 3
    } else {
      h.pe++
      a.pe++
      h.pts++
      a.pts++
    }
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || y.gf - y.gc - (x.gf - x.gc) || y.gf - x.gf)
}

export function topScorers(state: GameState, cat: CategoryId, comp: Competition = 'afa', limit = 15): ScorerRow[] {
  const map = new Map<string, ScorerRow>()
  for (const m of state.matches) {
    if (m.competition !== comp || m.category !== cat || !m.played) continue
    for (const g of m.goals) {
      const row = map.get(g.scorerId) ?? {
        id: g.scorerId,
        name: g.scorerName,
        clubId: g.clubId,
        goals: 0,
      }
      row.goals++
      map.set(g.scorerId, row)
    }
  }
  return [...map.values()].sort((a, b) => b.goals - a.goals).slice(0, limit)
}

export const hasMetro = (cat: CategoryId) => METRO_CATEGORIES.some((c) => c.id === cat)

export const userMatches = (state: GameState, cat: CategoryId, comp: Competition = 'afa') =>
  state.matches.filter(
    (m) => m.competition === comp && m.category === cat && (m.homeId === state.clubId || m.awayId === state.clubId),
  )

export const nextUserMatch = (state: GameState, cat: CategoryId, comp: Competition = 'afa') =>
  userMatches(state, cat, comp).find((m) => !m.played)

/* ------------------------------ Simulation ------------------------------ */

function rivalSide(state: GameState, clubId: string, cat: CategoryId, rng: Rng, comp: Competition): Side {
  const squad = state.rivals[clubId]?.[cat] ?? []
  // Liga Metro is played by the kids who don't start in AFA.
  const skip = comp === 'metro' ? { ARQ: 1, DEF: 3, MED: 2, DEL: 2 } : { ARQ: 0, DEF: 0, MED: 0, DEL: 0 }
  const pick = (line: keyof typeof skip, n: number) =>
    squad
      .filter((p) => p.line === line)
      .map((p) => ({ ...p, form: p.ovr + rng.normal(0, 3) }))
      .sort((a, b) => b.form - a.form)
      .slice(skip[line])
      .slice(0, n)
  const eleven = [...pick('ARQ', 1), ...pick('DEF', 4), ...pick('MED', 3), ...pick('DEL', 3)]
  const used = new Set(eleven.map((p) => p.id))
  const rest = squad.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr)
  const bench = []
  const gk = rest.find((p) => p.line === 'ARQ')
  if (gk) bench.push(gk)
  for (const p of rest) {
    if (bench.length >= BENCH_SIZE) break
    if (p.id === gk?.id) continue
    bench.push(p)
  }
  const toPlayer = (p: (typeof eleven)[number]): SidePlayer => ({
    id: p.id,
    name: p.name,
    line: p.line,
    eff: p.ovr,
  })
  return { clubId, players: eleven.map(toPlayer), bench: bench.map(toPlayer) }
}

function applyMatchToUser(state: GameState, rng: Rng, m: Match, eleven: Player[]) {
  const cat = categoryInfo(m.category)
  const afa = m.competition === 'afa'
  const stats = (p: Player) => (afa ? p.stats : p.metroStats)
  const byId = new Map(state.players.map((p) => [p.id, p]))
  const appeared = new Set(eleven.map((p) => p.id))
  for (const s of m.subs ?? []) {
    if (s.clubId === state.clubId) appeared.add(s.onId)
  }
  for (const id of appeared) {
    const p = byId.get(id)
    if (p) stats(p).apps++
  }
  for (const g of m.goals) {
    if (g.clubId !== state.clubId) continue
    const scorer = byId.get(g.scorerId)
    if (scorer) stats(scorer).goals++
    if (g.assistName) {
      const assist = eleven.find((p) => shortName(p) === g.assistName)
      if (assist) stats(assist).assists++
    }
  }
  const redCounted = new Set<string>()
  for (const c of m.cards) {
    if (c.clubId !== state.clubId) continue
    const p = byId.get(c.playerId)
    if (!p) continue
    if (c.type === 'yellow') {
      stats(p).yellows++
      if (afa) p.yellowAccum++
    } else if (!redCounted.has(p.id)) {
      redCounted.add(p.id)
      stats(p).reds++
      const doubleYellow = m.cards.some((x) => x.playerId === p.id && x.type === 'yellow')
      if (!afa) {
        p.metroBan += 1
        news(
          state,
          rng,
          'suspension',
          `${playerName(p)} fue expulsado (${cat.name}, Liga Metro)`,
          'Se pierde la próxima fecha de la Liga Metro.',
        )
        continue
      }
      if (doubleYellow) p.yellowAccum--
      const fechas = doubleYellow ? 1 : rng.int(1, 3)
      p.suspension += fechas
      news(
        state,
        rng,
        'suspension',
        `${playerName(p)} fue expulsado (${cat.name})`,
        `El Tribunal de Disciplina de AFA le dio ${fechas} ${fechas === 1 ? 'fecha' : 'fechas'} de suspensión${doubleYellow ? ' por doble amarilla' : ' por roja directa'}.`,
      )
    }
    if (afa && p.yellowAccum >= 5) {
      p.yellowAccum = 0
      p.suspension += 1
      news(
        state,
        rng,
        'suspension',
        `${playerName(p)} llegó a 5 amarillas`,
        `Se pierde la próxima fecha de la Liga AFA por acumulación de tarjetas.`,
      )
    }
  }
  for (const inj of m.injuries) {
    if (inj.clubId !== state.clubId) continue
    const p = byId.get(inj.playerId)
    if (!p) continue
    const kind = rng.weighted(INJURIES, (i) => (i.max > 20 ? 0.4 : i.max > 5 ? 1.2 : 3))
    const weeks = rng.int(kind.min, kind.max)
    p.injury = { description: kind.description, weeksLeft: weeks }
    news(
      state,
      rng,
      'injury',
      `Lesión: ${playerName(p)} (${cat.name}${afa ? '' : ', Liga Metro'})`,
      `${kind.description}. El cuerpo médico estima ${weeks} ${weeks === 1 ? 'semana' : 'semanas'} de recuperación.`,
    )
  }
}

function develop(state: GameState, rng: Rng, played: Set<string>) {
  for (const p of state.players) {
    const age = yearAge(p, state.season)
    const rate = age <= 15 ? 0.011 : age <= 17 ? 0.009 : 0.007
    let mult = played.has(p.id) ? 1.5 : 0.85
    if (p.injury) mult = 0.3
    const gain = (p.pot - p.ovr) * rate * mult + rng.normal(0, 0.12)
    p.ovr = Math.max(20, Math.min(p.pot, p.ovr + gain))
  }
}

function toSidePlayer(p: Player, line: (typeof POSITION_LINE)[Player['position']], rng: Rng, slotPos?: Player['position']): SidePlayer {
  return {
    id: p.id,
    name: shortName(p),
    line,
    eff: p.ovr * (slotPos ? positionFit(p.position, slotPos) : 1) + rng.normal(0, 2),
  }
}

/** Plays the user's match in one category and competition with the given lineup and bench. */
function playUserMatch(
  state: GameState,
  rng: Rng,
  m: Match,
  lineup: (string | null)[],
  bench: (string | null)[],
  ctx: Context,
  taken: Set<string>,
  played: Set<string>,
) {
  const eleven: Player[] = []
  const side: Side = { clubId: state.clubId, players: [], bench: [] }
  lineup.forEach((id, i) => {
    const p = state.players.find((pl) => pl.id === id)
    if (!p || unavailability(p, ctx)) return
    taken.add(p.id)
    played.add(p.id)
    eleven.push(p)
    side.players.push(toSidePlayer(p, POSITION_LINE[FORMATION[i].pos], rng, FORMATION[i].pos))
  })
  for (const id of bench) {
    const p = state.players.find((pl) => pl.id === id)
    if (!p || unavailability(p, ctx) || taken.has(p.id)) continue
    taken.add(p.id)
    side.bench.push(toSidePlayer(p, POSITION_LINE[p.position], rng))
  }
  const isHome = m.homeId === state.clubId
  const rivalId = isHome ? m.awayId : m.homeId
  const rival = rivalSide(state, rivalId, m.category, rng, m.competition)
  const squadIds = new Set([...side.players, ...side.bench].map((p) => p.id))
  playMatch(rng, m, isHome ? side : rival, isHome ? rival : side, (id) => squadIds.has(id))
  applyMatchToUser(state, rng, m, eleven)
  for (const s of m.subs ?? []) {
    if (s.clubId === state.clubId) played.add(s.onId)
  }
  const our = isHome ? m.homeGoals : m.awayGoals
  const their = isHome ? m.awayGoals : m.homeGoals
  const verb = our > their ? 'ganó' : our < their ? 'perdió' : 'empató'
  return `${categoryInfo(m.category).name}: ${verb} ${our}-${their} ${isHome ? 'vs' : 'en cancha de'} ${clubById(rivalId).name}`
}

export function advanceWeek(prev: GameState): GameState {
  if (prev.seasonOver) return prev
  const state = structuredClone(prev)
  if (!state.benches) state.benches = {}
  const rng = new Rng(state.seed)
  const week = state.week

  // Start of the week: national team windows and the Messi Cup trip.
  if (isWindowWeek(state.season, week)) nationalWindow(state, rng)
  if (week === state.messiCup.startWeek && state.messiCup.status === 'pending') departMessiCup(state, rng)

  const weekMatches = state.matches.filter((m) => m.week === week)
  const afaMatches = weekMatches.filter((m) => m.competition === 'afa')
  const metroMatches = weekMatches.filter((m) => m.competition === 'metro')
  const played = new Set<string>()
  const suspendedAtStart = state.players.filter((p) => p.suspension > 0)
  const metroBannedAtStart = state.players.filter((p) => p.metroBan > 0)
  const isMine = (m: Match) => m.homeId === state.clubId || m.awayId === state.clubId

  // Oldest categories pick first when the same kid could play twice.
  const taken = new Set<string>()
  const afaResults: string[] = []
  for (const cat of [...CATEGORIES].reverse()) {
    const m = afaMatches.find((x) => x.category === cat.id && isMine(x))
    if (!m) continue
    const pool = eligiblePool(state, cat.id)
    const preset = state.lineups[cat.id] ?? autoLineup(state, cat.id)
    // Keep the coach's picks, and cover holes from this category before borrowing younger kids.
    const own = pool.filter((p) => p.category === cat.id || preset.includes(p.id))
    const lineup = bestEleven(pool, taken, bestEleven(own, taken, preset))
    const takenAfterXi = new Set([...taken, ...lineup.filter((id): id is string => !!id)])
    const presetBench = state.benches[cat.id] ?? autoBench(state, cat.id, lineup)
    const ownBench = pool.filter((p) => p.category === cat.id || presetBench.includes(p.id))
    const bench = bestBench(pool, takenAfterXi, bestBench(ownBench, takenAfterXi, presetBench))
    afaResults.unshift(playUserMatch(state, rng, m, lineup, bench, 'afa', taken, played))
  }

  // Liga Metro: the kids who didn't play AFA this weekend, foreigners without citizenship included.
  const metroResults: string[] = []
  for (const cat of [...METRO_CATEGORIES].reverse()) {
    const m = metroMatches.find((x) => x.category === cat.id && isMine(x))
    if (!m) continue
    const pool = eligiblePool(state, cat.id, 'metro').filter((p) => !taken.has(p.id))
    const own = pool.filter((p) => p.category === cat.id)
    const lineup = bestEleven(pool, taken, bestEleven(own, taken, [], 'metro'), 'metro')
    const takenAfterXi = new Set([...taken, ...lineup.filter((id): id is string => !!id)])
    const bench = bestBench(pool, takenAfterXi, [], 'metro')
    metroResults.unshift(playUserMatch(state, rng, m, lineup, bench, 'metro', taken, played))
  }

  for (const m of weekMatches) {
    if (m.played) continue
    playMatch(
      rng,
      m,
      rivalSide(state, m.homeId, m.category, rng, m.competition),
      rivalSide(state, m.awayId, m.category, rng, m.competition),
      () => false,
    )
  }
  if (afaResults.length)
    news(state, rng, 'result', `Fecha ${afaMatches[0].round} de la Liga AFA`, afaResults.join('\n'))
  if (metroResults.length)
    news(state, rng, 'result', `Fecha ${metroMatches[0].round} de la Liga Metro`, metroResults.join('\n'))
  if (afaMatches.length) for (const p of suspendedAtStart) p.suspension = Math.max(0, p.suspension - 1)
  if (metroMatches.length) for (const p of metroBannedAtStart) p.metroBan = Math.max(0, p.metroBan - 1)

  if (state.messiCup.status === 'playing') for (const id of state.messiCup.squad ?? []) played.add(id)
  messiWeek(state, rng)

  for (const p of state.players) {
    if (p.clubBan > 0) p.clubBan--
    if (p.injury && !weekMatches.some((m) => m.injuries.some((i) => i.playerId === p.id))) {
      p.injury.weeksLeft--
      if (p.injury.weeksLeft <= 0) {
        p.injury = null
        news(state, rng, 'info', `${playerName(p)} recibió el alta médica`, 'Ya está disponible para volver a jugar.')
      }
    }
  }
  dutyWeek(state, rng)
  develop(state, rng, played)

  state.week++
  citizenshipCheck(state, rng)
  marketWeek(state, rng)

  if (state.week > SEASON_WEEKS) {
    state.week = SEASON_WEEKS
    state.seasonOver = true
    const champions: Partial<Record<CategoryId, string>> = {}
    for (const c of CATEGORIES) champions[c.id] = standings(state, c.id)[0].clubId
    const metroChampions: Partial<Record<CategoryId, string>> = {}
    for (const c of METRO_CATEGORIES) metroChampions[c.id] = standings(state, c.id, 'metro')[0].clubId
    const won = CATEGORIES.filter((c) => champions[c.id] === state.clubId).map((c) => c.name)
    const wonMetro = METRO_CATEGORIES.filter((c) => metroChampions[c.id] === state.clubId).map((c) => c.name)
    state.cuts = computeCuts(state)
    const cutTotal = Object.values(state.cuts.required).reduce((s, n) => s + (n ?? 0), 0)
    news(
      state,
      rng,
      'info',
      `Terminó la temporada ${state.season}`,
      (won.length ? `¡Campeones de la Liga AFA en ${won.join(', ')}! ` : '') +
        (wonMetro.length ? `¡Campeones de la Liga Metro en ${wonMetro.join(', ')}! ` : '') +
        `La coordinación pide descartar ${cutTotal} jugadores antes de cerrar la temporada.`,
    )
    state.history.push({
      season: state.season,
      champions,
      metroChampions,
      promoted: [],
      newcomers: 0,
    })
  }
  state.seed = rng.seed
  return state
}

/* ---------------------------- Season close ----------------------------- */

/** Players promoted to Reserva at season close: over-age for cuarta, or exceptional early. */
export function promotionCandidates(state: GameState) {
  const next = state.season + 1
  return state.players.filter((p) => {
    if (naturalCategory(p.birthYear, next) === null) return true
    const age = yearAge(p, state.season)
    return age >= 16 && age <= 18 && p.ovr >= 72
  })
}

/** Squad size the board accepts per category for next season. */
export const CATEGORY_CAP: Record<CategoryId, number> = {
  novena: 22,
  octava: 22,
  septima: 22,
  sexta: 22,
  quinta: 22,
  cuarta: 26,
}

/** Players the board may cut: not leaving for Reserva anyway. */
export function cutCandidates(state: GameState, cat: CategoryId) {
  const promoted = new Set(promotionCandidates(state).map((p) => p.id))
  return state.players.filter((p) => p.category === cat && !promoted.has(p.id)).sort((a, b) => a.ovr - b.ovr)
}

function computeCuts(state: GameState): Cuts {
  const required: Cuts['required'] = {}
  for (const c of CATEGORIES) {
    const count = cutCandidates(state, c.id).length
    required[c.id] = Math.min(Math.max(1, count - CATEGORY_CAP[c.id]), Math.max(0, count - 15))
  }
  return { required, done: false }
}

function applyCuts(state: GameState, rng: Rng, ids: string[], auto: boolean) {
  const names = ids
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p): p is Player => !!p)
    .map(playerName)
  for (const id of ids) removePlayer(state, id)
  if (state.cuts) state.cuts.done = true
  const summary = state.history.find((h) => h.season === state.season)
  if (summary) summary.released = names
  if (names.length)
    news(
      state,
      rng,
      'info',
      auto ? 'La coordinación eligió los descartes' : 'Descartes confirmados',
      `Dejan el club: ${names.join(', ')}.`,
    )
}

/** The coordinator's answer to the board's release request. */
export function releasePlayers(prev: GameState, ids: string[]): Result {
  const cuts = prev.cuts
  if (!cuts || cuts.done) return { state: prev, error: 'No hay descartes pendientes.' }
  for (const c of CATEGORIES) {
    const need = cuts.required[c.id] ?? 0
    const allowed = new Set(cutCandidates(prev, c.id).map((p) => p.id))
    const chosen = ids.filter((id) => allowed.has(id)).length
    if (chosen < need)
      return {
        state: prev,
        error: `Faltan descartes en ${c.name}: elegí ${need}.`,
      }
  }
  return act(prev, (s, rng) => applyCuts(s, rng, ids, false))
}

export function startNextSeason(prev: GameState): GameState {
  const state = structuredClone(prev)
  const rng = new Rng(state.seed)
  const club = clubById(state.clubId)
  if (state.cuts && !state.cuts.done) {
    const ids = CATEGORIES.flatMap((c) =>
      cutCandidates(state, c.id)
        .slice(0, state.cuts!.required[c.id] ?? 0)
        .map((p) => p.id),
    )
    applyCuts(state, rng, ids, true)
  }
  const promoted = promotionCandidates(state)
  const promotedIds = new Set(promoted.map((p) => p.id))
  const summary = state.history[state.history.length - 1]
  state.season++
  state.week = 1
  state.seasonOver = false
  state.players = state.players.filter((p) => !promotedIds.has(p.id))
  for (const p of state.players) {
    const natural = naturalCategory(p.birthYear, state.season)!
    if (categoryIndex(p.category) < categoryIndex(natural)) p.category = natural
    p.stats = emptyStats()
    p.metroStats = emptyStats()
    p.yellowAccum = 0
    p.suspension = 0
    p.metroBan = 0
    p.duty = null
  }
  const camada = makeIntake(rng, club, state.season - 14, state.season, 22)
  state.players.push(...camada)
  state.rivals = makeRivals(rng, state.clubId, state.season)
  const { metroClubs, matches } = makeSeasonCompetitions(rng, state.clubId)
  state.metroClubs = metroClubs
  state.matches = matches
  state.lineups = {}
  state.benches = {}
  if (summary) {
    summary.promoted = [...state.promotedThisSeason, ...promoted.map(playerName)]
    summary.newcomers = camada.length
    summary.messiCup = state.messiCup.result ?? undefined
  }
  state.messiCup = makeMessiCup(rng, state.clubId, state.season)
  state.national = { qualified: {}, callUps: [] }
  state.cuts = null
  state.promotedThisSeason = []
  state.prospects = state.prospects.filter((x) => naturalCategory(x.player.birthYear, state.season) !== null)
  for (const p of promoted) {
    const early = naturalCategory(p.birthYear, state.season) !== null
    news(
      state,
      rng,
      'promotion',
      `${playerName(p)} fue subido a Reserva`,
      early
        ? `Con apenas ${yearAge(p, state.season - 1)} años, el cuerpo técnico de Primera lo sube a Reserva de forma permanente. Un orgullo para la cantera.`
        : `Terminó su etapa en inferiores y pasa a Reserva de forma permanente.`,
    )
  }
  news(
    state,
    rng,
    'camada',
    `Llegó la camada ${state.season - 14}`,
    `${camada.length} chicos nacidos en ${state.season - 14} se suman a la novena. Mirá el plantel para conocerlos.`,
  )
  citizenshipCheck(state, rng)
  state.seed = rng.seed
  return state
}

/* ------------------------------ Coach actions ------------------------------ */

export interface Result {
  state: GameState
  error: string | null
}

/** Runs a seeded action on a copy of the state. On error the original state is kept. */
function act(prev: GameState, fn: (s: GameState, rng: Rng) => string | null | void): Result {
  const state = structuredClone(prev)
  const rng = new Rng(state.seed)
  const error = fn(state, rng) ?? null
  if (error) return { state: prev, error }
  state.seed = rng.seed
  return { state, error: null }
}

export const scout = (prev: GameState, region: ScoutRegion, cat: CategoryId, position: Position | null) =>
  act(prev, (s, rng) => startMission(s, rng, region, cat, position))
export const testProspect = (prev: GameState, id: string) => act(prev, (s) => trialProspect(s, id))
export const signCandidate = (prev: GameState, id: string) => act(prev, (s, rng) => signProspect(s, rng, id))
export const discardProspect = (prev: GameState, id: string) => act(prev, (s) => dismissProspect(s, id))
export const decide = (prev: GameState, id: string, option: string) =>
  act(prev, (s, rng) => resolveDecision(s, rng, id, option))
export const chooseMessiSquad = (prev: GameState, ids: string[]) => act(prev, (s) => setMessiSquadIds(s, ids))

export function setLineup(prev: GameState, cat: CategoryId, lineup: (string | null)[]) {
  return { ...prev, lineups: { ...prev.lineups, [cat]: lineup } }
}

/** Drop a player from lineups of categories he may no longer be picked in. */
function clearYoungerLineups(lineups: GameState['lineups'], playerId: string, cat: CategoryId) {
  const next = { ...lineups }
  for (const c of CATEGORIES) {
    if (categoryIndex(c.id) < categoryIndex(cat)) {
      next[c.id] = next[c.id]?.map((id) => (id === playerId ? null : id))
    }
  }
  return next
}

export function moveCategory(prev: GameState, playerId: string, cat: CategoryId): GameState {
  const players = prev.players.map((p) =>
    p.id === playerId && canPlayIn(p.birthYear, cat, prev.season) ? { ...p, category: cat } : p,
  )
  return {
    ...prev,
    players,
    lineups: clearYoungerLineups(prev.lineups, playerId, cat),
  }
}

export interface PlayerEdit {
  firstName: string
  lastName: string
  position: Position
  ovr: number
  pot: number
  birthYear: number
  birthMonth: number
  nationality: string
  citizen: boolean
}

/** Birth years that keep a player inside the academy this season. */
export const birthYearRange = (season: number) => ({
  min: season - categoryInfo('cuarta').maxYearAge,
  max: season - 12,
})

export function editPlayer(prev: GameState, playerId: string, edit: PlayerEdit): GameState {
  const natural = naturalCategory(edit.birthYear, prev.season)
  if (!natural) return prev
  const ovr = Math.max(1, Math.min(99, Math.round(edit.ovr)))
  const pot = Math.max(ovr, Math.min(99, Math.round(edit.pot)))
  let lineups = prev.lineups
  const players = prev.players.map((p) => {
    if (p.id !== playerId) return p
    // A new birth year may make him too old for where he is registered.
    const category = categoryIndex(p.category) < categoryIndex(natural) ? natural : p.category
    lineups = clearYoungerLineups(lineups, p.id, category)
    const argentine = edit.nationality === 'Argentina'
    const citizen = argentine || edit.citizen
    return {
      ...p,
      firstName: edit.firstName.trim() || p.firstName,
      lastName: edit.lastName.trim() || p.lastName,
      position: edit.position,
      ovr,
      pot,
      birthYear: edit.birthYear,
      birthMonth: Math.max(1, Math.min(12, Math.round(edit.birthMonth))),
      nationality: edit.nationality,
      citizen,
      arrived: citizen ? null : (p.arrived ?? now(prev)),
      category,
    }
  })
  return { ...prev, players, lineups }
}

export function markNewsRead(prev: GameState): GameState {
  return {
    ...prev,
    news: prev.news.map((n) => (n.read ? n : { ...n, read: true })),
  }
}
