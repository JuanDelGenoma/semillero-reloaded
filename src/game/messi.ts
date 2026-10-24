import { FORMATION, POSITION_LINE, positionFit } from './categories'
import { clubById } from './data/clubs'
import { FOREIGN_TEAMS, countryByName } from './data/world'
import { randomName } from './generate'
import { playMatch, type Side } from './match'
import type { Rng } from './rng'
import { bestEleven, unavailability } from './squad'
import type { CupMatch, GameState, Line, Match, MessiCup, Player } from './types'
import { addNews, playerName, shortName, yearAge } from './util'

export const MESSI_START_WEEK = 19
export const MESSI_WEEKS = 3
/** Sub 16: year age at most 16. */
export const MESSI_MAX_AGE = 16
export const MESSI_SQUAD = { min: 16, ideal: 20, max: 22 }

const NEWELLS_STRENGTH = 52

export const teamStrength = (id: string) => FOREIGN_TEAMS.find((t) => t.id === id)?.strength ?? NEWELLS_STRENGTH

export function makeMessiCup(rng: Rng, clubId: string, season: number): MessiCup {
  const messi = FOREIGN_TEAMS.filter((t) => t.messi).map((t) => t.id)
  if (clubId !== 'newells') messi.push('newells')
  const others = FOREIGN_TEAMS.filter((t) => !t.messi).map((t) => t.id)
  while (messi.length < 15) {
    const i = rng.int(0, others.length - 1)
    messi.push(others.splice(i, 1)[0])
  }
  const teams = [clubId, ...messi]
  for (let i = teams.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[teams[i], teams[j]] = [teams[j], teams[i]]
  }
  const groups = [0, 1, 2, 3].map((g) => teams.slice(g * 4, g * 4 + 4))
  const matches: CupMatch[] = []
  const pairs = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ]
  groups.forEach((g, gi) =>
    pairs.forEach((day, d) =>
      day.forEach(([a, b]) =>
        matches.push(cupMatch(`g${gi}-${d}-${a}`, 'grupo', MESSI_START_WEEK + (d < 2 ? 0 : 1), g[a], g[b], gi)),
      ),
    ),
  )
  return {
    season,
    startWeek: MESSI_START_WEEK,
    squad: null,
    teams,
    groups,
    matches,
    status: 'pending',
    champion: null,
    result: null,
  }
}

function cupMatch(
  id: string,
  stage: CupMatch['stage'],
  week: number,
  homeId: string,
  awayId: string,
  group?: number,
): CupMatch {
  return {
    id,
    stage,
    group,
    week,
    homeId,
    awayId,
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    goals: [],
  }
}

export const messiEligible = (state: GameState) =>
  state.players.filter((p) => yearAge(p, state.season) <= MESSI_MAX_AGE)

/** Best ~20 available U16s with at least two goalkeepers. */
export function suggestedSquad(state: GameState, size = MESSI_SQUAD.ideal) {
  const pool = messiEligible(state)
    .filter((p) => !unavailability(p, 'cup'))
    .sort((a, b) => b.ovr - a.ovr)
  const keepers = pool.filter((p) => p.position === 'POR').slice(0, 2)
  const rest = pool.filter((p) => !keepers.includes(p)).slice(0, size - keepers.length)
  return [...keepers, ...rest].map((p) => p.id)
}

export function groupTable(cup: MessiCup, g: number) {
  const rows = cup.groups[g].map((id) => ({ id, pj: 0, pts: 0, gf: 0, gc: 0 }))
  for (const m of cup.matches) {
    if (m.stage !== 'grupo' || m.group !== g || !m.played) continue
    const h = rows.find((r) => r.id === m.homeId)!
    const a = rows.find((r) => r.id === m.awayId)!
    h.pj++
    a.pj++
    h.gf += m.homeGoals
    h.gc += m.awayGoals
    a.gf += m.awayGoals
    a.gc += m.homeGoals
    if (m.homeGoals > m.awayGoals) h.pts += 3
    else if (m.homeGoals < m.awayGoals) a.pts += 3
    else {
      h.pts++
      a.pts++
    }
  }
  return rows.sort((x, y) => y.pts - x.pts || y.gf - y.gc - (x.gf - x.gc) || y.gf - x.gf)
}

const LINES: Line[] = ['ARQ', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL']

function foreignSide(rng: Rng, teamId: string): Side {
  const strength = teamStrength(teamId)
  const country = countryByName(clubById(teamId).city).name
  return {
    clubId: teamId,
    players: LINES.map((line, i) => {
      const { firstName, lastName } = randomName(rng, teamId === 'newells' ? 'Argentina' : country)
      return {
        id: `${teamId}-${i}`,
        name: `${firstName[0]}. ${lastName}`,
        line,
        eff: strength + rng.normal(0, 3),
      }
    }),
  }
}

function userSide(state: GameState, rng: Rng): Side {
  const squad = state.players.filter((p) => state.messiCup.squad?.includes(p.id))
  const eleven = bestEleven(squad, new Set(), [], 'cup')
  const side: Side = { clubId: state.clubId, players: [] }
  eleven.forEach((id, i) => {
    const p = squad.find((x) => x.id === id)
    if (!p) return
    side.players.push({
      id: p.id,
      name: shortName(p),
      line: POSITION_LINE[FORMATION[i].pos],
      eff: p.ovr * positionFit(p.position, FORMATION[i].pos) + rng.normal(0, 2),
    })
  })
  return side
}

function play(state: GameState, rng: Rng, m: CupMatch) {
  const side = (id: string) => (id === state.clubId ? userSide(state, rng) : foreignSide(rng, id))
  const temp = { goals: [], cards: [], injuries: [] } as unknown as Match
  playMatch(rng, temp, side(m.homeId), side(m.awayId), (id) => state.players.some((p) => p.id === id))
  m.played = true
  m.homeGoals = temp.homeGoals
  m.awayGoals = temp.awayGoals
  m.goals = temp.goals
  if (m.stage !== 'grupo' && m.homeGoals === m.awayGoals) {
    const h = rng.int(3, 5)
    let a = rng.int(2, 5)
    if (a === h) a = rng.chance(0.5) ? h - 1 : h + 1
    m.penalties = [h, a]
  }
  for (const inj of temp.injuries) {
    const p = state.players.find((x) => x.id === inj.playerId)
    if (p && !p.injury)
      p.injury = {
        description: 'Golpe en la Messi Cup',
        weeksLeft: rng.int(1, 3),
      }
  }
}

const winner = (m: CupMatch) =>
  m.homeGoals > m.awayGoals || (m.penalties && m.penalties[0] > m.penalties[1]) ? m.homeId : m.awayId

/** Called at the start of the departure week. */
export function departMessiCup(state: GameState, rng: Rng) {
  const cup = state.messiCup
  const chosen = (cup.squad ?? []).filter((id) => {
    const p = state.players.find((x) => x.id === id)
    return p && !unavailability(p, 'cup')
  })
  const autoPicked = !cup.squad
  const dropped = (cup.squad?.length ?? 0) - chosen.length
  let squad = chosen
  if (squad.length < MESSI_SQUAD.min) {
    const fill = suggestedSquad(state, MESSI_SQUAD.ideal).filter((id) => !squad.includes(id))
    squad = [...squad, ...fill].slice(0, Math.max(MESSI_SQUAD.ideal, squad.length))
  }
  cup.squad = squad
  cup.status = 'playing'
  for (const id of squad) {
    const p = state.players.find((x) => x.id === id)!
    p.duty = {
      kind: 'messi',
      label: 'Messi Cup',
      days: 21,
      weeksLeft: MESSI_WEEKS,
    }
  }
  addNews(
    state,
    rng,
    'messi',
    'La delegación viaja a la Messi Cup',
    `${squad.length} juveniles Sub 16 viajan al exterior y no estarán disponibles para sus categorías durante tres semanas.` +
      (autoPicked ? ' Como no confirmaste la lista, la armó el cuerpo técnico.' : '') +
      (dropped > 0
        ? ` ${dropped} de los elegidos no pudieron viajar por lesión o convocatoria y fueron reemplazados.`
        : ''),
  )
}

export function messiWeek(state: GameState, rng: Rng) {
  const cup = state.messiCup
  if (cup.status !== 'playing') return
  const week = state.week
  if (week === cup.startWeek + 2) {
    const winners = cup.groups.map((_, g) => groupTable(cup, g)[0].id)
    cup.matches.push(
      cupMatch('semi-1', 'semi', week, winners[0], winners[3]),
      cupMatch('semi-2', 'semi', week, winners[1], winners[2]),
    )
  }
  for (const m of cup.matches.filter((x) => x.week === week && !x.played)) play(state, rng, m)
  if (week === cup.startWeek + 2) {
    const [s1, s2] = cup.matches.filter((m) => m.stage === 'semi')
    const final = cupMatch('final', 'final', week, winner(s1), winner(s2))
    cup.matches.push(final)
    play(state, rng, final)
    cup.champion = winner(final)
    cup.status = 'done'
    const me = state.clubId
    const g = cup.groups.findIndex((x) => x.includes(me))
    const pos = groupTable(cup, g).findIndex((r) => r.id === me) + 1
    cup.result =
      cup.champion === me
        ? 'Campeón'
        : final.homeId === me || final.awayId === me
          ? 'Subcampeón'
          : [s1, s2].some((m) => m.homeId === me || m.awayId === me)
            ? 'Semifinalista'
            : `Fase de grupos (${pos}º del grupo ${'ABCD'[g]})`
    addNews(
      state,
      rng,
      'messi',
      cup.champion === me ? '¡Campeones de la Messi Cup!' : `Messi Cup: ${cup.result.toLowerCase()}`,
      `${clubById(cup.champion).name} ganó la final ${final.homeGoals}-${final.awayGoals}${
        final.penalties ? ` (${final.penalties[0]}-${final.penalties[1]} en penales)` : ''
      } ante ${clubById(winner(final) === final.homeId ? final.awayId : final.homeId).name}. La delegación vuelve al país.`,
    )
  } else {
    const mine = cup.matches.filter((m) => m.week === week && (m.homeId === state.clubId || m.awayId === state.clubId))
    if (mine.length) {
      addNews(
        state,
        rng,
        'messi',
        'Messi Cup: fase de grupos',
        mine
          .map((m) => {
            const home = m.homeId === state.clubId
            const rival = clubById(home ? m.awayId : m.homeId).name
            return `vs ${rival}: ${home ? m.homeGoals : m.awayGoals}-${home ? m.awayGoals : m.homeGoals}`
          })
          .join('\n'),
      )
    }
  }
}

export function setMessiSquadIds(state: GameState, ids: string[]): string | null {
  if (state.messiCup.status !== 'pending') return 'La lista ya no se puede modificar.'
  if (ids.length < MESSI_SQUAD.min || ids.length > MESSI_SQUAD.max)
    return `La lista tiene que tener entre ${MESSI_SQUAD.min} y ${MESSI_SQUAD.max} jugadores.`
  const eligible = new Set(messiEligible(state).map((p: Player) => p.id))
  if (ids.some((id) => !eligible.has(id))) return 'Sólo pueden viajar jugadores Sub 16.'
  state.messiCup.squad = ids
  return null
}

export const travelerNames = (state: GameState) =>
  state.players.filter((p) => state.messiCup.squad?.includes(p.id)).map(playerName)
