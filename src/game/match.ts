import type { CardEvent, GoalEvent, Line, Match, MatchPlayer, SubEvent, SubReason } from './types'
import type { Rng } from './rng'

export const BENCH_SIZE = 7
export const MAX_SUBS = 5

export interface SidePlayer {
  id: string
  name: string
  line: Line
  eff: number
}

export interface Side {
  clubId: string
  /** The eleven on the pitch at kick-off. */
  players: SidePlayer[]
  bench: SidePlayer[]
}

const SCORE_WEIGHT: Record<Line, number> = { ARQ: 0.02, DEF: 1, MED: 2.6, DEL: 6 }
const ASSIST_WEIGHT: Record<Line, number> = { ARQ: 0.1, DEF: 1.4, MED: 4, DEL: 2.6 }

const isGk = (p: { line: Line }) => p.line === 'ARQ'

const lite = (p: SidePlayer): MatchPlayer => ({ id: p.id, name: p.name, line: p.line })

export function sideStrength(side: Side) {
  if (side.players.length === 0) return 20
  const total = side.players.reduce((s, p) => s + p.eff * (p.line === 'ARQ' ? 1.6 : 1), 0)
  const weights = side.players.reduce((s, p) => s + (p.line === 'ARQ' ? 1.6 : 1), 0)
  const shortHanded = Math.max(0, 11 - side.players.length) * 4
  return total / weights - shortHanded
}

function goalsFor(rng: Rng, attack: number, defence: number, home: boolean) {
  const diff = attack - defence + (home ? 1.5 : -1.5)
  const lambda = Math.max(0.15, 1.3 * Math.exp(diff / 10.5))
  return Math.min(9, rng.poisson(lambda))
}

function pickReplacement(bench: SidePlayer[], line: Line): SidePlayer | undefined {
  const pool = bench.filter((p) => !isGk(p))
  if (!pool.length) return undefined
  const same = pool.filter((p) => p.line === line)
  return [...(same.length ? same : pool)].sort((a, b) => b.eff - a.eff)[0]
}

/** Who is on the pitch at `minute` (inclusive of a sub at that minute). */
export function rosterAt(
  side: Side,
  subs: SubEvent[],
  reds: { playerId: string; minute: number }[],
  injuries: { playerId: string; minute: number }[],
  minute: number,
): SidePlayer[] {
  const byId = new Map([...side.players, ...side.bench].map((p) => [p.id, p]))
  let on = [...side.players]
  const events: { minute: number; order: number; apply: () => void }[] = []
  for (const r of reds) {
    events.push({
      minute: r.minute,
      order: 0,
      apply: () => {
        on = on.filter((p) => p.id !== r.playerId)
      },
    })
  }
  for (const i of injuries) {
    events.push({
      minute: i.minute,
      order: 1,
      apply: () => {
        on = on.filter((p) => p.id !== i.playerId)
      },
    })
  }
  for (const s of subs) {
    if (s.clubId !== side.clubId) continue
    events.push({
      minute: s.minute,
      order: 2,
      apply: () => {
        on = on.filter((p) => p.id !== s.offId)
        const incoming = byId.get(s.onId)
        if (incoming) on.push(incoming)
      },
    })
  }
  events.sort((a, b) => a.minute - b.minute || a.order - b.order)
  for (const e of events) {
    if (e.minute > minute) break
    e.apply()
  }
  return on
}

/**
 * Up to five changes. The backup goalkeeper only comes on if the starter is
 * injured or sent off.
 */
export function planSubs(
  rng: Rng,
  side: Side,
  injuries: { playerId: string; minute: number }[],
  reds: { playerId: string; minute: number }[],
): SubEvent[] {
  const unused = [...side.bench]
  const stillOn = new Set(side.players.map((p) => p.id))
  const byId = new Map([...side.players, ...side.bench].map((p) => [p.id, p]))
  const backupGk = unused.find(isGk)
  const subs: SubEvent[] = []
  const forcedIds = new Set([...injuries, ...reds].map((x) => x.playerId))

  const take = (offId: string, on: SidePlayer, minute: number, reason: SubReason) => {
    if (subs.length >= MAX_SUBS) return false
    if (!stillOn.has(offId)) return false
    const oi = unused.findIndex((p) => p.id === on.id)
    if (oi < 0) return false
    const off = byId.get(offId)
    if (!off) return false
    stillOn.delete(offId)
    stillOn.add(on.id)
    unused.splice(oi, 1)
    subs.push({
      minute,
      clubId: side.clubId,
      offId: off.id,
      offName: off.name,
      onId: on.id,
      onName: on.name,
      reason,
    })
    return true
  }

  const forced = [
    ...injuries.map((i) => ({ ...i, kind: 'injury' as const })),
    ...reds.map((r) => ({ ...r, kind: 'red' as const })),
  ].sort((a, b) => a.minute - b.minute)

  for (const f of forced) {
    const p = byId.get(f.playerId)
    if (!p || !stillOn.has(p.id)) continue
    if (f.kind === 'red') {
      stillOn.delete(p.id)
      if (isGk(p) && backupGk && unused.some((x) => x.id === backupGk.id)) {
        const victim = [...stillOn]
          .map((id) => byId.get(id)!)
          .filter((x) => x && !isGk(x))
          .sort((a, b) => a.eff - b.eff)[0]
        if (victim) take(victim.id, backupGk, f.minute, 'red')
      }
      continue
    }
    if (isGk(p)) {
      if (backupGk && unused.some((x) => x.id === backupGk.id)) {
        if (!take(p.id, backupGk, f.minute, 'injury')) stillOn.delete(p.id)
      } else stillOn.delete(p.id)
      continue
    }
    const on = pickReplacement(unused, p.line)
    if (!on || !take(p.id, on, f.minute, 'injury')) stillOn.delete(p.id)
  }

  const usedMinutes = new Set(subs.map((s) => s.minute))
  while (subs.length < MAX_SUBS) {
    const offPool = [...stillOn]
      .map((id) => byId.get(id)!)
      .filter((p) => p && !isGk(p) && !forcedIds.has(p.id))
    const on = pickReplacement(unused, rng.pick(['DEF', 'MED', 'DEL'] as const))
    if (!offPool.length || !on) break
    const same = offPool.filter((p) => p.line === on.line)
    const off = rng.pick(same.length ? same : offPool)
    let minute = rng.int(55, 88)
    for (let n = 0; n < 20 && usedMinutes.has(minute); n++) minute = rng.int(55, 88)
    usedMinutes.add(minute)
    if (!take(off.id, on, minute, 'tactical')) break
  }

  return subs.sort((a, b) => a.minute - b.minute)
}

function cardEvents(rng: Rng, players: SidePlayer[], clubId: string, fromMinute = 1): CardEvent[] {
  const cards: CardEvent[] = []
  const span = Math.max(1, 91 - fromMinute)
  const scale = span / 90
  for (const p of players) {
    const base = (p.line === 'DEF' ? 0.09 : p.line === 'MED' ? 0.075 : 0.04) * scale
    if (rng.chance(0.005 * scale)) {
      cards.push({
        minute: rng.int(fromMinute, 90),
        clubId,
        playerId: p.id,
        playerName: p.name,
        type: 'red',
      })
    } else if (rng.chance(base)) {
      const minute = rng.int(fromMinute, Math.min(90, fromMinute + span - 2))
      cards.push({ minute, clubId, playerId: p.id, playerName: p.name, type: 'yellow' })
      if (rng.chance(0.06)) {
        cards.push({
          minute: rng.int(Math.min(90, minute + 1), 90),
          clubId,
          playerId: p.id,
          playerName: p.name,
          type: 'red',
        })
      }
    }
  }
  return cards
}

function injuryEvents(
  rng: Rng,
  players: SidePlayer[],
  clubId: string,
  injuryRisk: (id: string) => boolean,
): { playerId: string; playerName: string; clubId: string; minute: number }[] {
  const injuries = []
  for (const p of players) {
    if (injuryRisk(p.id) && rng.chance(0.022)) {
      injuries.push({
        playerId: p.id,
        playerName: p.name,
        clubId,
        minute: rng.int(8, 84),
      })
    }
  }
  return injuries
}

function goalEvents(rng: Rng, onPitch: SidePlayer[], clubId: string, count: number): GoalEvent[] {
  const events: GoalEvent[] = []
  if (!onPitch.length) return events
  for (let i = 0; i < count; i++) {
    const minute = rng.int(1, 90)
    const pitch = onPitch
    const scorer = rng.weighted(pitch, (p) => SCORE_WEIGHT[p.line] * (p.eff / 50) ** 2)
    let assistName: string | undefined
    if (rng.chance(0.7) && pitch.length > 1) {
      const others = pitch.filter((p) => p.id !== scorer.id)
      assistName = rng.weighted(others, (p) => ASSIST_WEIGHT[p.line] * (p.eff / 50) ** 2).name
    }
    events.push({
      minute,
      clubId,
      scorerId: scorer.id,
      scorerName: scorer.name,
      assistName,
    })
  }
  return events
}

export function playMatch(rng: Rng, match: Match, home: Side, away: Side, injuryRisk: (id: string) => boolean) {
  const homeBench = home.bench ?? []
  const awayBench = away.bench ?? []
  home = { ...home, bench: homeBench }
  away = { ...away, bench: awayBench }

  match.homeStarters = home.players.map(lite)
  match.awayStarters = away.players.map(lite)
  match.homeBench = homeBench.map(lite)
  match.awayBench = awayBench.map(lite)

  const homeInj = injuryEvents(rng, home.players, home.clubId, injuryRisk)
  const awayInj = injuryEvents(rng, away.players, away.clubId, injuryRisk)
  let homeCards = cardEvents(rng, home.players, home.clubId)
  let awayCards = cardEvents(rng, away.players, away.clubId)

  const redsOf = (cards: CardEvent[]) =>
    cards.filter((c) => c.type === 'red').map((c) => ({ playerId: c.playerId, minute: c.minute }))

  const homeSubs = planSubs(rng, home, homeInj, redsOf(homeCards))
  const awaySubs = planSubs(rng, away, awayInj, redsOf(awayCards))
  match.subs = [...homeSubs, ...awaySubs].sort((a, b) => a.minute - b.minute)

  for (const s of homeSubs) {
    const p = homeBench.find((x) => x.id === s.onId)
    if (p) homeCards.push(...cardEvents(rng, [p], home.clubId, s.minute + 1))
  }
  for (const s of awaySubs) {
    const p = awayBench.find((x) => x.id === s.onId)
    if (p) awayCards.push(...cardEvents(rng, [p], away.clubId, s.minute + 1))
  }

  const validCard = (c: CardEvent, side: Side, subs: SubEvent[], inj: typeof homeInj) => {
    const left = [
      ...subs.filter((s) => s.clubId === side.clubId).map((s) => ({ id: s.offId, minute: s.minute })),
      ...inj.map((i) => ({ id: i.playerId, minute: i.minute })),
    ]
    const cameOn = subs.find((s) => s.clubId === side.clubId && s.onId === c.playerId)
    if (cameOn && c.minute < cameOn.minute) return false
    const departed = left.find((x) => x.id === c.playerId)
    if (departed && c.minute > departed.minute) return false
    const started = side.players.some((p) => p.id === c.playerId)
    return started || !!cameOn
  }
  match.cards = [
    ...homeCards.filter((c) => validCard(c, home, homeSubs, homeInj)),
    ...awayCards.filter((c) => validCard(c, away, awaySubs, awayInj)),
  ].sort((a, b) => a.minute - b.minute)

  match.injuries = [...homeInj, ...awayInj].sort((a, b) => a.minute - b.minute)

  const sh = sideStrength(home) + rng.normal(0, 2.5)
  const sa = sideStrength(away) + rng.normal(0, 2.5)
  const hg = home.players.length ? goalsFor(rng, sh, sa, true) : 0
  const ag = away.players.length ? goalsFor(rng, sa, sh, false) : 0
  match.played = true
  match.homeGoals = hg
  match.awayGoals = ag

  const redsFor = (clubId: string) =>
    match.cards.filter((c) => c.type === 'red' && c.clubId === clubId).map((c) => ({ playerId: c.playerId, minute: c.minute }))

  const score = (side: Side, subs: SubEvent[], inj: typeof homeInj, n: number) => {
    const events: GoalEvent[] = []
    const reds = redsFor(side.clubId)
    for (let i = 0; i < n; i++) {
      const minute = rng.int(1, 90)
      const pitch = rosterAt(side, subs, reds, inj, minute)
      if (!pitch.length) continue
      events.push(...goalEvents(rng, pitch, side.clubId, 1).map((g) => ({ ...g, minute })))
    }
    return events
  }

  match.goals = [...score(home, homeSubs, homeInj, hg), ...score(away, awaySubs, awayInj, ag)].sort(
    (a, b) => a.minute - b.minute,
  )
}
