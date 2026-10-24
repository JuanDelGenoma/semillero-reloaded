import { describe, expect, it } from 'vitest'
import {
  FIRST_SEASON,
  advanceWeek,
  chooseMessiSquad,
  currentAge,
  cutCandidates,
  decide,
  editPlayer,
  newGame,
  releasePlayers,
  scout,
  signCandidate,
  startNextSeason,
  testProspect,
  userMatches,
} from './engine'
import { SEASON_WEEKS } from './fixtures'
import { MESSI_START_WEEK, suggestedSquad } from './messi'
import { monthOf } from './national'
import type { GameState } from './types'

const playSeason = (g: GameState) => {
  let s = g
  while (!s.seasonOver) s = advanceWeek(s)
  return s
}

const seeded = (club: string, seed: number) => ({
  ...newGame(club, 'Coordinador'),
  seed,
})

describe('season structure', () => {
  it('starts in 2027 with AFA in every category and Liga Metro in 7ª, 8ª and 9ª', () => {
    const g = seeded('lanus', 1)
    expect(g.season).toBe(FIRST_SEASON)
    expect(FIRST_SEASON).toBe(2027)
    for (const cat of ['novena', 'octava', 'septima', 'sexta', 'quinta', 'cuarta'] as const)
      expect(userMatches(g, cat, 'afa')).toHaveLength(29)
    for (const cat of ['novena', 'octava', 'septima'] as const) expect(userMatches(g, cat, 'metro')).toHaveLength(15)
    for (const cat of ['sexta', 'quinta', 'cuarta'] as const) expect(userMatches(g, cat, 'metro')).toHaveLength(0)
  })

  it('plays every match, ages players by birthday without changing category', () => {
    const g = seeded('lanus', 2)
    const p = g.players.find((x) => x.birthMonth === 8)!
    const ageStart = currentAge(p, g.season, 1)
    const end = playSeason(g)
    expect(end.matches.every((m) => m.played)).toBe(true)
    const same = end.players.find((x) => x.id === p.id)
    if (same) {
      expect(currentAge(same, end.season, end.week)).toBe(ageStart + 1)
      expect(same.category).toBe(p.category)
    }
    const metroApps = end.players.reduce((s, x) => s + x.metroStats.apps, 0)
    expect(metroApps).toBeGreaterThan(15 * 3 * 7)
  })
})

describe('Liga Metro and citizenship', () => {
  it('a foreigner without citizenship plays only Liga Metro, then gets citizenship after two years', () => {
    let g = seeded('lanus', 3)
    const kid = g.players.find((p) => p.category === 'septima' && p.position === 'DC')!
    g = editPlayer(g, kid.id, {
      ...kid,
      ovr: 55,
      pot: 58,
      nationality: 'Uruguay',
      citizen: false,
    })
    const edited = g.players.find((p) => p.id === kid.id)!
    expect(edited.citizen).toBe(false)
    expect(edited.arrived).toEqual({ season: 2027, week: 1 })
    // Keep random events and the board's cuts away from him.
    const season = (s: GameState) => {
      while (!s.seasonOver) {
        s = advanceWeek(s)
        s.decisions = s.decisions.filter((d) => d.playerId !== kid.id)
      }
      return s
    }
    const next = (s: GameState) => {
      const ids = (Object.keys(s.cuts!.required) as (keyof NonNullable<GameState['cuts']>['required'])[]).flatMap((c) =>
        cutCandidates(s, c)
          .filter((p) => p.id !== kid.id)
          .slice(0, s.cuts!.required[c])
          .map((p) => p.id),
      )
      return startNextSeason(releasePlayers(s, ids).state)
    }
    g = season(g)
    const after = g.players.find((p) => p.id === kid.id)!
    expect(after.stats.apps).toBe(0)
    expect(after.metroStats.apps).toBeGreaterThan(0)
    g = season(next(g))
    expect(g.players.find((p) => p.id === kid.id)!.citizen).toBe(false)
    g = next(g)
    expect(g.players.find((p) => p.id === kid.id)!.citizen).toBe(true)
  })
})

describe('Messi Cup', () => {
  it('takes the chosen U16 squad abroad for three weeks and finishes with a champion', () => {
    let g = seeded('river', 4)
    const ids = suggestedSquad(g, 20)
    const r = chooseMessiSquad(g, ids)
    expect(r.error).toBeNull()
    g = r.state
    expect(chooseMessiSquad(g, ids.slice(0, 5)).error).not.toBeNull()
    while (g.week < MESSI_START_WEEK) g = advanceWeek(g)
    g = advanceWeek(g)
    expect(g.messiCup.status).toBe('playing')
    // Kids injured or called up before departure are replaced by the staff.
    const before = g.messiCup.squad!
    expect(before.length).toBeGreaterThanOrEqual(16)
    const travellers = g.players.filter((p) => before.includes(p.id))
    expect(travellers.every((p) => p.duty?.kind === 'messi')).toBe(true)
    // Nobody on the trip played the league that weekend.
    const week = MESSI_START_WEEK
    const mine = g.matches.filter((m) => m.week === week && (m.homeId === 'river' || m.awayId === 'river'))
    const goalsByTravellers = mine.flatMap((m) => m.goals).filter((x) => before.includes(x.scorerId))
    expect(goalsByTravellers).toHaveLength(0)
    g = advanceWeek(advanceWeek(g))
    expect(g.messiCup.status).toBe('done')
    expect(g.messiCup.champion).toBeTruthy()
    expect(g.messiCup.matches.filter((m) => m.stage === 'grupo')).toHaveLength(24)
    expect(g.messiCup.matches.some((m) => m.stage === 'final')).toBe(true)
    expect(g.messiCup.teams).toContain('barcelona')
    expect(g.messiCup.teams).toContain('intermiami')
    expect(g.messiCup.teams).toContain('newells')
    expect(g.players.filter((p) => before.includes(p.id)).every((p) => !p.duty || p.duty.kind !== 'messi')).toBe(true)
  })
})

describe('national teams', () => {
  it('calls up very good kids monthly and handles the Sudamericano and World Cups', () => {
    let g = seeded('river', 5)
    const sub15 = g.players.filter((p) => g.season - p.birthYear === 15).slice(0, 2)
    const sub17 = g.players.filter((p) => g.season - p.birthYear === 17).slice(0, 2)
    for (const p of [...sub15, ...sub17]) g = editPlayer(g, p.id, { ...p, ovr: 85, pot: 95 })
    g.national.qualified.Argentina = { sub15: true, sub17: true }
    const seen = new Set<string>()
    while (!g.seasonOver) {
      g = advanceWeek(g)
      for (const c of g.national.callUps) seen.add(c.event)
    }
    expect(seen).toContain('CONMEBOL Liga Evolución')
    expect(seen).toContain('Campeonato Sudamericano Sub 17')
    expect(seen).toContain('Entrenamientos')
    expect([...seen].some((e) => e.startsWith('Copa Mundial'))).toBe(true)
    const sudamericano = g.national.callUps.find((c) => c.event === 'Campeonato Sudamericano Sub 17')!
    expect(sudamericano.days).toBe(25)
    expect(monthOf(g.season, sudamericano.week)).toBe(3)
    for (const c of g.national.callUps.filter((x) => x.event === 'CONMEBOL Liga Evolución')) expect(c.days).toBe(5)
    for (const c of g.national.callUps.filter((x) => x.event.startsWith('Copa Mundial')))
      expect(c.days).toBeLessThanOrEqual(25)
  })

  it('foreign players outside CONMEBOL get an unspecified call-up', () => {
    let g = seeded('river', 6)
    const p = g.players.find((x) => g.season - x.birthYear === 16)!
    g = editPlayer(g, p.id, {
      ...p,
      ovr: 88,
      pot: 95,
      nationality: 'Italia',
      citizen: true,
    })
    let events: string[] = []
    while (!g.seasonOver) {
      g = advanceWeek(g)
      events = g.national.callUps.filter((c) => c.country === 'Italia').map((c) => c.event)
      if (events.length > 2) break
    }
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) expect(e === 'Convocatoria' || e.startsWith('Copa Mundial')).toBe(true)
  })
})

describe('market, scouting and events', () => {
  it('scouting returns candidates that can be tested and signed', () => {
    let g = seeded('lanus', 7)
    const funds = g.funds
    const r = scout(g, 'sudamerica', 'septima', 'DC')
    expect(r.error).toBeNull()
    g = r.state
    expect(g.funds).toBeLessThan(funds)
    while (g.prospects.length === 0) g = advanceWeek(g)
    const pr = g.prospects[0]
    expect(pr.player.position).toBe('DC')
    g = testProspect(g, pr.id).state
    expect(g.prospects[0].tested).toBe(true)
    const signed = signCandidate(g, pr.id)
    expect(signed.error).toBeNull()
    const kid = signed.state.players.find((p) => p.id === pr.player.id)!
    expect(kid.category).toBe('septima')
    expect(kid.nationality).not.toBe('Argentina')
    expect(kid.citizen).toBe(false)
  })

  it('European clubs make offers for stars, and River gets candidates from abroad', () => {
    let offers = 0
    let candidates = 0
    let events = 0
    for (let seed = 10; seed < 13; seed++) {
      let g = seeded('river', seed)
      for (const p of g.players.filter((x) => g.season - x.birthYear >= 16).slice(0, 12))
        g = editPlayer(g, p.id, { ...p, ovr: 80, pot: 92 })
      while (!g.seasonOver) {
        g = advanceWeek(g)
        for (const d of g.decisions) {
          if (d.kind === 'oferta') offers++
          else if (d.kind === 'candidato') candidates++
          else events++
          const res = decide(
            g,
            d.id,
            d.options[0].cost && d.options[0].cost > g.funds ? d.defaultOption : d.options[0].id,
          )
          expect(res.error).toBeNull()
          g = res.state
        }
      }
    }
    expect(offers).toBeGreaterThan(0)
    expect(candidates).toBeGreaterThan(0)
    expect(events).toBeGreaterThan(0)
  })

  it('accepting an offer sells the player and raises the budget', () => {
    let g = seeded('boca', 20)
    for (const p of g.players.filter((x) => g.season - x.birthYear >= 16).slice(0, 15))
      g = editPlayer(g, p.id, { ...p, ovr: 82, pot: 94 })
    while (!g.decisions.some((d) => d.kind === 'oferta') && !g.seasonOver) g = advanceWeek(g)
    const offer = g.decisions.find((d) => d.kind === 'oferta')!
    const funds = g.funds
    const r = decide(g, offer.id, 'aceptar')
    expect(r.error).toBeNull()
    expect(r.state.players.some((p) => p.id === offer.playerId)).toBe(false)
    expect(r.state.funds).toBeGreaterThan(funds)
  })
})

describe('end of season', () => {
  it('asks for releases per category before the next season', () => {
    let g = playSeason(seeded('lanus', 30))
    expect(g.cuts).not.toBeNull()
    const required = g.cuts!.required
    expect(Object.values(required).some((n) => (n ?? 0) > 0)).toBe(true)
    expect(releasePlayers(g, []).error).not.toBeNull()
    const ids = (Object.keys(required) as (keyof typeof required)[]).flatMap((c) =>
      cutCandidates(g, c)
        .slice(0, required[c])
        .map((p) => p.id),
    )
    const r = releasePlayers(g, ids)
    expect(r.error).toBeNull()
    expect(r.state.players.some((p) => ids.includes(p.id))).toBe(false)
    g = startNextSeason(r.state)
    expect(g.season).toBe(2028)
    expect(g.messiCup.status).toBe('pending')
    expect(g.matches.every((m) => !m.played)).toBe(true)
  })

  it('season weeks stay within the calendar', () => {
    expect(SEASON_WEEKS).toBe(34)
  })
})
