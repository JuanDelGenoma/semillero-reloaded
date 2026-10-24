import type { CardEvent, GoalEvent, Line, Match } from './types'
import type { Rng } from './rng'

export interface Side {
  clubId: string
  /** The eleven on the pitch with their effective level for the slot they occupy. */
  players: { id: string; name: string; line: Line; eff: number }[]
}

const SCORE_WEIGHT: Record<Line, number> = { ARQ: 0.02, DEF: 1, MED: 2.6, DEL: 6 }
const ASSIST_WEIGHT: Record<Line, number> = { ARQ: 0.1, DEF: 1.4, MED: 4, DEL: 2.6 }

export function sideStrength(side: Side) {
  if (side.players.length === 0) return 20
  const total = side.players.reduce(
    (s, p) => s + p.eff * (p.line === 'ARQ' ? 1.6 : 1),
    0,
  )
  const weights = side.players.reduce((s, p) => s + (p.line === 'ARQ' ? 1.6 : 1), 0)
  // Missing players hurt a lot.
  const shortHanded = Math.max(0, 11 - side.players.length) * 4
  return total / weights - shortHanded
}

function goalsFor(rng: Rng, attack: number, defence: number, home: boolean) {
  const diff = attack - defence + (home ? 1.5 : -1.5)
  const lambda = Math.max(0.15, 1.3 * Math.exp(diff / 10.5))
  return Math.min(9, rng.poisson(lambda))
}

function goalEvents(rng: Rng, side: Side, count: number): GoalEvent[] {
  const events: GoalEvent[] = []
  for (let i = 0; i < count; i++) {
    const scorer = rng.weighted(side.players, (p) => SCORE_WEIGHT[p.line] * (p.eff / 50) ** 2)
    let assistName: string | undefined
    if (rng.chance(0.7) && side.players.length > 1) {
      const others = side.players.filter((p) => p.id !== scorer.id)
      assistName = rng.weighted(others, (p) => ASSIST_WEIGHT[p.line] * (p.eff / 50) ** 2).name
    }
    events.push({
      minute: rng.int(1, 90),
      clubId: side.clubId,
      scorerId: scorer.id,
      scorerName: scorer.name,
      assistName,
    })
  }
  return events
}

function cardEvents(rng: Rng, side: Side): CardEvent[] {
  const cards: CardEvent[] = []
  for (const p of side.players) {
    const base = p.line === 'DEF' ? 0.09 : p.line === 'MED' ? 0.075 : 0.04
    if (rng.chance(0.005)) {
      cards.push({ minute: rng.int(10, 90), clubId: side.clubId, playerId: p.id, playerName: p.name, type: 'red' })
    } else if (rng.chance(base)) {
      const minute = rng.int(1, 88)
      cards.push({ minute, clubId: side.clubId, playerId: p.id, playerName: p.name, type: 'yellow' })
      if (rng.chance(0.06)) {
        cards.push({ minute: rng.int(minute + 1, 90), clubId: side.clubId, playerId: p.id, playerName: p.name, type: 'red' })
      }
    }
  }
  return cards
}

export function playMatch(rng: Rng, match: Match, home: Side, away: Side, injuryRisk: (id: string) => boolean) {
  const sh = sideStrength(home) + rng.normal(0, 2.5)
  const sa = sideStrength(away) + rng.normal(0, 2.5)
  // A side with nobody available can't score.
  const hg = home.players.length ? goalsFor(rng, sh, sa, true) : 0
  const ag = away.players.length ? goalsFor(rng, sa, sh, false) : 0
  match.played = true
  match.homeGoals = hg
  match.awayGoals = ag
  match.goals = [...goalEvents(rng, home, hg), ...goalEvents(rng, away, ag)].sort(
    (a, b) => a.minute - b.minute,
  )
  match.cards = [...cardEvents(rng, home), ...cardEvents(rng, away)].sort(
    (a, b) => a.minute - b.minute,
  )
  match.injuries = []
  for (const side of [home, away]) {
    for (const p of side.players) {
      if (injuryRisk(p.id) && rng.chance(0.022)) {
        match.injuries.push({ playerId: p.id, playerName: p.name, clubId: side.clubId })
      }
    }
  }
}
