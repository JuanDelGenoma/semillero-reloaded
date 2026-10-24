import { CATEGORIES, type CategoryInfo } from './categories'
import type { Competition, Match } from './types'
import type { Rng } from './rng'

export const ROUNDS = 29
/** A free weekend every six rounds keeps room for international windows. */
export const roundWeek = (round: number) => round + Math.floor((round - 1) / 6)
export const SEASON_WEEKS = roundWeek(ROUNDS) + 1

/** Liga Metro: 7ª, 8ª and 9ª, played on the weekends of odd AFA rounds. */
export const METRO_CATEGORIES = CATEGORIES.filter((c) =>
  ['novena', 'octava', 'septima'].includes(c.id),
)
export const METRO_CLUBS = 16
export const metroWeek = (round: number) => roundWeek(round * 2 - 1)

/** Single round-robin (circle method). Every category plays the same rival each round. */
export function makeFixtures(
  rng: Rng,
  clubIds: string[],
  competition: Competition = 'afa',
  categories: CategoryInfo[] = CATEGORIES,
  weekOf: (round: number) => number = roundWeek,
): Match[] {
  const ids = [...clubIds]
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  const n = ids.length
  const matches: Match[] = []
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      let home = ids[i]
      let away = ids[n - 1 - i]
      if ((r + i) % 2 === 1) [home, away] = [away, home]
      for (const cat of categories) {
        matches.push({
          id: `${competition}-${cat.id}-${r + 1}-${home}-${away}`,
          competition,
          category: cat.id,
          round: r + 1,
          week: weekOf(r + 1),
          homeId: home,
          awayId: away,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          goals: [],
          cards: [],
          injuries: [],
          homeStarters: [],
          awayStarters: [],
          homeBench: [],
          awayBench: [],
          subs: [],
        })
      }
    }
    // Rotate all but the first.
    ids.splice(1, 0, ids.pop()!)
  }
  return matches
}
