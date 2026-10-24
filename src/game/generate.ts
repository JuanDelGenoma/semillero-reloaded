import { CATEGORIES, POSITION_LINE, naturalCategory } from './categories'
import { FIRST_NAMES, LAST_NAMES } from './data/names'
import { COUNTRIES, FOREIGN_NAMES, countryByName } from './data/world'
import type {
  CategoryId,
  Club,
  Line,
  Player,
  Position,
  RivalPlayer,
} from './types'
import type { Rng } from './rng'

/** Positions for a typical intake of 22 kids, plus extras for smaller groups. */
const INTAKE_POSITIONS: Position[] = [
  'POR',
  'POR',
  'POR',
  'LD',
  'LD',
  'DFC',
  'DFC',
  'DFC',
  'DFC',
  'LI',
  'LI',
  'MCD',
  'MCD',
  'MC',
  'MC',
  'MC',
  'MCO',
  'MCO',
  'ED',
  'EI',
  'DC',
  'DC',
]

/** Share of potential a kid has already reached at a given year-age. */
export const maturity = (yearAge: number) =>
  Math.min(0.95, 0.58 + Math.max(0, yearAge - 13) * 0.052)

export const emptyStats = () => ({
  apps: 0,
  goals: 0,
  assists: 0,
  yellows: 0,
  reds: 0,
})

export function randomName(rng: Rng, nationality = 'Argentina') {
  const pool = countryByName(nationality).names
  if (pool === 'es')
    return { firstName: rng.pick(FIRST_NAMES), lastName: rng.pick(LAST_NAMES) }
  const names = FOREIGN_NAMES[pool]
  return { firstName: rng.pick(names.first), lastName: rng.pick(names.last) }
}

/** Most academy kids are Argentine; a few were born in neighbouring countries but grew up here. */
function academyNationality(rng: Rng) {
  if (!rng.chance(0.05)) return 'Argentina'
  return rng.pick([
    'Paraguay',
    'Paraguay',
    'Uruguay',
    'Bolivia',
    'Perú',
    'Chile',
    'Venezuela',
    'Colombia',
  ])
}

export function makePlayer(
  rng: Rng,
  club: Club,
  birthYear: number,
  position: Position,
  season: number,
  opts: { nationality?: string; potMean?: number } = {},
): Player {
  const yearAge = season - birthYear
  const clubBoost = (club.prestige - 75) * 0.32
  let pot = Math.round(rng.normal(opts.potMean ?? 63 + clubBoost, 8.5))
  // A rare gem in every few intakes.
  if (rng.chance(0.035)) pot += rng.int(10, 18)
  pot = Math.max(42, Math.min(96, pot))
  const ovr = Math.max(
    25,
    Math.min(pot, pot * maturity(yearAge) + rng.normal(0, 2.5)),
  )
  const nationality = opts.nationality ?? academyNationality(rng)
  const { firstName, lastName } = randomName(rng, nationality)
  const cat = naturalCategory(birthYear, season) ?? 'cuarta'
  return {
    id: rng.id(),
    firstName,
    lastName,
    birthYear,
    birthMonth: rng.int(1, 12),
    nationality,
    citizen: true,
    arrived: null,
    position,
    ovr,
    pot,
    category: cat,
    injury: null,
    suspension: 0,
    yellowAccum: 0,
    stats: emptyStats(),
    metroStats: emptyStats(),
    metroBan: 0,
    duty: null,
    clubBan: 0,
    joinedSeason: season,
  }
}

export function makeIntake(
  rng: Rng,
  club: Club,
  birthYear: number,
  season: number,
  size = 22,
): Player[] {
  const positions = INTAKE_POSITIONS.slice(0, size)
  while (positions.length < size) positions.push(rng.pick(INTAKE_POSITIONS))
  return positions.map((pos) => makePlayer(rng, club, birthYear, pos, season))
}

/** Full academy for the user's club: one intake per birth year, two for cuarta. */
export function makeAcademy(rng: Rng, club: Club, season: number): Player[] {
  const players: Player[] = []
  for (const cat of CATEGORIES) {
    const oldest = season - cat.maxYearAge
    if (cat.id === 'cuarta') {
      players.push(...makeIntake(rng, club, oldest, season, 14))
      players.push(...makeIntake(rng, club, oldest + 1, season, 14))
    } else {
      players.push(...makeIntake(rng, club, oldest, season, 22))
    }
  }
  return players
}

const RIVAL_LINES: Line[] = [
  'ARQ',
  'ARQ',
  'DEF',
  'DEF',
  'DEF',
  'DEF',
  'DEF',
  'DEF',
  'MED',
  'MED',
  'MED',
  'MED',
  'MED',
  'DEL',
  'DEL',
  'DEL',
  'DEL',
]

export function makeRivalSquad(
  rng: Rng,
  club: Club,
  cat: CategoryId,
  season: number,
): RivalPlayer[] {
  const info = CATEGORIES.find((c) => c.id === cat)!
  const yearAge = info.maxYearAge - (cat === 'cuarta' ? 0.5 : 0)
  return RIVAL_LINES.map((line) => {
    const p = makePlayer(
      rng,
      club,
      season - Math.round(yearAge),
      'MC',
      season,
      { nationality: 'Argentina' },
    )
    return {
      id: p.id,
      name: `${p.firstName.split(' ')[0][0]}. ${p.lastName}`,
      line,
      ovr: Math.round(p.ovr),
    }
  })
}

export const lineOf = (p: Player) => POSITION_LINE[p.position]

export const NATIONALITIES = COUNTRIES.map((c) => c.name)
