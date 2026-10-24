import type { CategoryId, Line, Position } from './types'

export interface CategoryInfo {
  id: CategoryId
  name: string
  label: string
  /** Max "year age" (season year − birth year) to be eligible. */
  maxYearAge: number
}

/**
 * Youngest to oldest. Eligibility is decided at the start of the season:
 * in 2027 séptima takes players born 2011 or later, so a 2011 kid who turns
 * 16 in January still plays, but one born in December 2009 does not.
 */
export const CATEGORIES: CategoryInfo[] = [
  { id: 'novena', name: 'Novena', label: '9ª · Sub 14', maxYearAge: 14 },
  { id: 'octava', name: 'Octava', label: '8ª · Sub 15', maxYearAge: 15 },
  { id: 'septima', name: 'Séptima', label: '7ª · Sub 16', maxYearAge: 16 },
  { id: 'sexta', name: 'Sexta', label: '6ª · Sub 17', maxYearAge: 17 },
  { id: 'quinta', name: 'Quinta', label: '5ª · Sub 18', maxYearAge: 18 },
  { id: 'cuarta', name: 'Cuarta', label: '4ª · Sub 20', maxYearAge: 20 },
]

export const categoryIndex = (id: CategoryId) =>
  CATEGORIES.findIndex((c) => c.id === id)

export const categoryInfo = (id: CategoryId) => CATEGORIES[categoryIndex(id)]

/** Oldest birth year allowed in a category for a given season. */
export const minBirthYear = (cat: CategoryId, season: number) =>
  season - categoryInfo(cat).maxYearAge

/** The youngest category a player can be registered in. Null if too old for cuarta. */
export function naturalCategory(
  birthYear: number,
  season: number,
): CategoryId | null {
  for (const c of CATEGORIES) {
    if (birthYear >= season - c.maxYearAge) return c.id
  }
  return null
}

/** A player may play in his natural category or any older one, never a younger one. */
export function canPlayIn(birthYear: number, cat: CategoryId, season: number) {
  return birthYear >= minBirthYear(cat, season)
}

export const POSITION_LINE: Record<Position, Line> = {
  POR: 'ARQ',
  LD: 'DEF',
  DFC: 'DEF',
  LI: 'DEF',
  MCD: 'MED',
  MC: 'MED',
  MCO: 'MED',
  ED: 'DEL',
  EI: 'DEL',
  DC: 'DEL',
}

export const POSITION_NAME: Record<Position, string> = {
  POR: 'Arquero',
  LD: 'Lateral derecho',
  DFC: 'Defensor central',
  LI: 'Lateral izquierdo',
  MCD: 'Volante central',
  MC: 'Volante mixto',
  MCO: 'Enganche',
  ED: 'Extremo derecho',
  EI: 'Extremo izquierdo',
  DC: 'Centrodelantero',
}

/** 4-3-3 slots, top-to-bottom pitch coordinates in % (x across, y from own goal). */
export const FORMATION: { pos: Position; x: number; y: number }[] = [
  { pos: 'POR', x: 50, y: 7 },
  { pos: 'LD', x: 84, y: 27 },
  { pos: 'DFC', x: 62, y: 22 },
  { pos: 'DFC', x: 38, y: 22 },
  { pos: 'LI', x: 16, y: 27 },
  { pos: 'MCD', x: 50, y: 42 },
  { pos: 'MC', x: 72, y: 52 },
  { pos: 'MC', x: 28, y: 52 },
  { pos: 'ED', x: 84, y: 76 },
  { pos: 'DC', x: 50, y: 84 },
  { pos: 'EI', x: 16, y: 76 },
]

/** Fraction of a player's level he keeps when playing a given slot. */
export function positionFit(player: Position, slot: Position): number {
  if (player === slot) return 1
  const pl = POSITION_LINE[player]
  const sl = POSITION_LINE[slot]
  if (pl === 'ARQ' || sl === 'ARQ') return 0.45
  if (pl === sl) return 0.92
  if (pl === 'MED' || sl === 'MED') return 0.8
  return 0.68
}
