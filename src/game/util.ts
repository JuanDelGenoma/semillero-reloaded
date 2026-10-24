import type { GameState, NewsItem, Player, WeekStamp } from './types'
import type { Rng } from './rng'

export const playerName = (p: Player) => `${p.firstName} ${p.lastName}`
export const shortName = (p: Player) => `${p.firstName.split(' ')[0][0]}. ${p.lastName}`
export const yearAge = (p: Player, season: number) => season - p.birthYear

export function seasonDate(season: number, week: number) {
  const d = new Date(season, 1, 7)
  d.setDate(d.getDate() + (week - 1) * 7)
  return d
}

/** Real age on the current game date. Display only: eligibility uses yearAge. */
export function currentAge(p: Player, season: number, week: number) {
  const d = seasonDate(season, week)
  return d.getFullYear() - p.birthYear - (d.getMonth() + 1 < p.birthMonth ? 1 : 0)
}

export function formatWeek(season: number, week: number) {
  return seasonDate(season, week).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  })
}

export const now = (state: GameState): WeekStamp => ({
  season: state.season,
  week: state.week,
})

/** Weeks of game time between two stamps. The off-season does not count. */
export const weeksBetween = (a: WeekStamp, b: WeekStamp, seasonWeeks: number) =>
  (b.season - a.season) * seasonWeeks + (b.week - a.week)

export const later = (s: WeekStamp, weeks: number, seasonWeeks: number): WeekStamp => {
  const total = s.week - 1 + weeks
  return {
    season: s.season + Math.floor(total / seasonWeeks),
    week: (total % seasonWeeks) + 1,
  }
}

export const reached = (state: GameState, s: WeekStamp) =>
  state.season > s.season || (state.season === s.season && state.week >= s.week)

/** Money in thousands of US$, e.g. "US$ 120 mil" or "US$ 1,2 M". */
export const money = (k: number) =>
  k >= 1000 ? `US$ ${(k / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M` : `US$ ${Math.round(k)} mil`

export const euros = (m: number) => `€ ${m.toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`

const MAX_NEWS = 200

export function addNews(state: GameState, rng: Rng, kind: NewsItem['kind'], title: string, body: string) {
  state.news.unshift({
    id: rng.id(),
    week: state.week,
    season: state.season,
    kind,
    title,
    body,
    read: false,
  })
  // The inbox only shows recent items; keep saved careers small.
  if (state.news.length > MAX_NEWS) state.news.length = MAX_NEWS
}

/** Remove a player from the club and every lineup. */
export function removePlayer(state: GameState, playerId: string) {
  state.players = state.players.filter((p) => p.id !== playerId)
  for (const k of Object.keys(state.lineups) as (keyof GameState['lineups'])[]) {
    state.lineups[k] = state.lineups[k]?.map((id) => (id === playerId ? null : id))
  }
  for (const k of Object.keys(state.benches) as (keyof GameState['benches'])[]) {
    state.benches[k] = state.benches[k]?.map((id) => (id === playerId ? null : id))
  }
  if (state.messiCup.squad) state.messiCup.squad = state.messiCup.squad.filter((id) => id !== playerId)
  state.decisions = state.decisions.filter((d) => d.playerId !== playerId)
}
