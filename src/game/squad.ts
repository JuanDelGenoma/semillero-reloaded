import { CATEGORIES, FORMATION, canPlayIn, categoryIndex, positionFit } from './categories'
import type { CategoryId, GameState, Player } from './types'

/** 'cup' is the Messi Cup: the travelling squad plays it while on duty. */
export type Context = 'afa' | 'metro' | 'cup'

export type Unavailability = 'lesionado' | 'suspendido' | 'seleccion' | 'messi' | 'sancion' | 'ciudadania' | null

export function unavailability(p: Player, ctx: Context = 'afa'): Unavailability {
  if (p.injury) return 'lesionado'
  if (p.clubBan > 0) return 'sancion'
  if (p.duty && !(ctx === 'cup' && p.duty.kind === 'messi')) return p.duty.kind
  if (ctx === 'afa' && p.suspension > 0) return 'suspendido'
  if (ctx === 'metro' && p.metroBan > 0) return 'suspendido'
  if (ctx === 'afa' && !p.citizen) return 'ciudadania'
  return null
}

export const UNAVAILABLE_LABEL: Record<Exclude<Unavailability, null>, string> = {
  lesionado: 'Lesionado',
  suspendido: 'Suspendido',
  seleccion: 'En la selección',
  messi: 'En la Messi Cup',
  sancion: 'Sancionado por el club',
  ciudadania: 'Sin ciudadanía (sólo Liga Metro)',
}

/** Players who may be picked for a category's AFA team: registered there or younger, age-eligible and citizens. */
export function eligiblePool(state: GameState, cat: CategoryId, ctx: Context = 'afa') {
  const ci = categoryIndex(cat)
  return state.players.filter(
    (p) => categoryIndex(p.category) <= ci && canPlayIn(p.birthYear, cat, state.season) && (ctx !== 'afa' || p.citizen),
  )
}

/** Which other category's lineup a player is currently picked in, if any. */
export function pickedElsewhere(state: GameState, playerId: string, cat: CategoryId) {
  for (const c of CATEGORIES) {
    if (c.id === cat) continue
    if (state.lineups[c.id]?.includes(playerId)) return c.id
  }
  return null
}

/** Greedy best eleven for the 4-3-3, respecting who is already taken. */
export function bestEleven(
  pool: Player[],
  taken: Set<string> = new Set(),
  preset: (string | null)[] = [],
  ctx: Context = 'afa',
): (string | null)[] {
  const used = new Set(taken)
  const byId = new Map(pool.map((p) => [p.id, p]))
  const slots: (string | null)[] = FORMATION.map((_, i) => {
    const id = preset[i]
    const p = id ? byId.get(id) : undefined
    if (id && p && !unavailability(p, ctx) && !used.has(id)) {
      used.add(id)
      return id
    }
    return null
  })
  // Fill the most specific slots first: goalkeeper, then by best available fit.
  const order = FORMATION.map((_, i) => i).sort((a, b) =>
    FORMATION[a].pos === 'POR' ? -1 : FORMATION[b].pos === 'POR' ? 1 : 0,
  )
  // First pass only natural positions, then anyone who fits.
  for (const exact of [true, false]) {
    for (const i of order) {
      if (slots[i]) continue
      const slot = FORMATION[i].pos
      let best: Player | null = null
      let bestScore = -1
      for (const p of pool) {
        if (used.has(p.id) || unavailability(p, ctx)) continue
        if (exact && p.position !== slot) continue
        const score = p.ovr * positionFit(p.position, slot)
        if (score > bestScore) {
          best = p
          bestScore = score
        }
      }
      if (best) {
        slots[i] = best.id
        used.add(best.id)
      }
    }
  }
  return slots
}

export function autoLineup(state: GameState, cat: CategoryId) {
  const taken = new Set<string>()
  for (const c of CATEGORIES) {
    if (c.id === cat) continue
    for (const id of state.lineups[c.id] ?? []) if (id) taken.add(id)
  }
  // Prefer players registered in this category; borrow from below only to fill gaps.
  const own = eligiblePool(state, cat).filter((p) => p.category === cat)
  const first = bestEleven(own, taken)
  return bestEleven(eligiblePool(state, cat), taken, first)
}

export function lineupRating(state: GameState, lineup: (string | null)[]) {
  const effs = FORMATION.map((slot, i) => {
    const p = state.players.find((pl) => pl.id === lineup[i])
    return p ? p.ovr * positionFit(p.position, slot.pos) : 0
  })
  return effs.reduce((s, e) => s + e, 0) / 11
}
