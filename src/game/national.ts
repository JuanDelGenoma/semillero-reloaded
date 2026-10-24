import { countryByName } from './data/world'
import { maturity } from './generate'
import type { Rng } from './rng'
import type { CallUp, GameState, Player } from './types'
import { addNews, playerName, removePlayer, seasonDate, yearAge } from './util'

export type Band = 'Sub 15' | 'Sub 17'
export const BANDS: Band[] = ['Sub 15', 'Sub 17']
const BAND_MAX_AGE: Record<Band, number> = { 'Sub 15': 15, 'Sub 17': 17 }
const bandKey = (b: Band) => (b === 'Sub 15' ? 'sub15' : 'sub17')

/** Months as Date#getMonth(): the season runs from February (1) to September (8). */
export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const WORLD_CUP_MONTH = 7
const SUDAMERICANO_MONTH = 3
const EVOLUCION_LAST_MONTH = 5

export const monthOf = (season: number, week: number) => seasonDate(season, week).getMonth()

/** Call-ups happen on the first weekend of every month. */
export const isWindowWeek = (season: number, week: number) =>
  week === 1 || monthOf(season, week) !== monthOf(season, week - 1)

export interface PlannedEvent {
  event: string
  days: number
  worldCup?: boolean
}

/** What a CONMEBOL national team does in a given month, before knowing whether it qualified. */
export function plannedEvent(band: Band, month: number): PlannedEvent {
  if (month === WORLD_CUP_MONTH) return { event: `Copa Mundial ${band}`, days: 25, worldCup: true }
  if (band === 'Sub 15' && month <= EVOLUCION_LAST_MONTH) return { event: 'CONMEBOL Liga Evolución', days: 5 }
  if (band === 'Sub 17' && month === SUDAMERICANO_MONTH) return { event: 'Campeonato Sudamericano Sub 17', days: 25 }
  return { event: 'Entrenamientos', days: 3 }
}

function qualifyChance(country: string) {
  if (country === 'Argentina') return 0.9
  const c = countryByName(country)
  return c.southAmerica ? 0.15 + c.strength * 0.07 : 0.1 + c.strength * 0.06
}

/** Rolled once per country, band and season, the first time it matters. */
export function isQualified(state: GameState, rng: Rng, country: string, band: Band) {
  const q = (state.national.qualified[country] ??= {})
  const key = bandKey(band)
  if (q[key] === undefined) q[key] = rng.chance(qualifyChance(country))
  return q[key]!
}

const STAGES: { reached: string; out: string; days: number }[] = [
  {
    reached: 'fase de grupos',
    out: 'quedó eliminada en la fase de grupos',
    days: 12,
  },
  {
    reached: 'octavos de final',
    out: 'quedó eliminada en octavos de final',
    days: 16,
  },
  {
    reached: 'cuartos de final',
    out: 'quedó eliminada en cuartos de final',
    days: 19,
  },
  {
    reached: 'semifinales',
    out: 'perdió en semifinales y jugó por el tercer puesto',
    days: 23,
  },
  { reached: 'final', out: 'perdió la final', days: 25 },
]

export interface WorldCupRun {
  text: string
  days: number
  semis: boolean
}

export function simulateWorldCup(rng: Rng, country: string): WorldCupRun {
  const s = countryByName(country).strength
  let stage = 0
  if (rng.chance(0.5 + s * 0.04)) {
    stage = 1
    while (stage < 4 && rng.chance(0.35 + s * 0.03)) stage++
  }
  if (stage === 4 && rng.chance(0.4 + s * 0.02)) return { text: '¡salió campeona del mundo!', days: 25, semis: true }
  return {
    text: STAGES[stage].out,
    days: STAGES[stage].days,
    semis: stage >= 3,
  }
}

function threshold(country: string, age: number) {
  const base = country === 'Argentina' ? 80 : countryByName(country).southAmerica ? 77 : 75
  return base * maturity(age)
}

const teamName = (country: string, band: Band) =>
  country === 'Argentina' ? `la Selección Argentina ${band}` : `la selección de ${country} ${band}`

/** Monthly call-ups for every nation with good enough kids at the club. */
export function nationalWindow(state: GameState, rng: Rng) {
  const month = monthOf(state.season, state.week)
  const calledNow = new Set<string>()

  if (month === EVOLUCION_LAST_MONTH + 1) {
    const ok = isQualified(state, rng, 'Argentina', 'Sub 15')
    addNews(
      state,
      rng,
      'seleccion',
      ok ? 'La Sub 15 se clasificó al Mundial' : 'La Sub 15 se quedó sin Mundial',
      ok
        ? 'Tras la CONMEBOL Liga Evolución, Argentina jugará la Copa Mundial Sub 15 en agosto.'
        : 'La Selección no consiguió la clasificación en la Liga Evolución. Habrá sólo entrenamientos en agosto.',
    )
  }

  for (const band of BANDS) {
    const pool = state.players.filter(
      (p) => yearAge(p, state.season) <= BAND_MAX_AGE[band] && !p.duty && !p.injury && !calledNow.has(p.id),
    )
    const byCountry = new Map<string, Player[]>()
    for (const p of pool) {
      if (p.ovr + rng.normal(0, 1.5) < threshold(p.nationality, yearAge(p, state.season))) continue
      byCountry.set(p.nationality, [...(byCountry.get(p.nationality) ?? []), p])
    }
    for (const [country, candidates] of byCountry) {
      const conmebol = countryByName(country).southAmerica
      let plan: PlannedEvent | null = conmebol
        ? plannedEvent(band, month)
        : month === WORLD_CUP_MONTH
          ? { event: `Copa Mundial ${band}`, days: 25, worldCup: true }
          : rng.chance(0.4)
            ? { event: 'Convocatoria', days: 5 }
            : null
      if (plan?.worldCup && !isQualified(state, rng, country, band)) {
        plan = conmebol ? { event: 'Entrenamientos', days: 3 } : null
      }
      if (!plan) continue

      const called = candidates.sort((a, b) => b.ovr - a.ovr).slice(0, 4)
      let returnNote: string | undefined
      let promoteChance: number | undefined
      let days = plan.days
      if (plan.worldCup) {
        const run = simulateWorldCup(rng, country)
        days = run.days
        promoteChance = run.semis ? 0.5 : 0.1
        returnNote = `${country} ${run.text} en la Copa Mundial ${band}.`
      } else if (plan.event.startsWith('Campeonato Sudamericano')) {
        const ok = isQualified(state, rng, country, band)
        returnNote = ok
          ? `${country} terminó el Sudamericano Sub 17 con la clasificación a la Copa Mundial Sub 17.`
          : `${country} no logró clasificarse a la Copa Mundial Sub 17 en el Sudamericano.`
      }
      // Foreign federations outside CONMEBOL don't say what the call-up is for, except the World Cup.
      const label = conmebol || plan.worldCup ? `${country} ${band} · ${plan.event}` : `${country} ${band}`
      for (const p of called) {
        calledNow.add(p.id)
        p.duty = {
          kind: 'seleccion',
          label,
          days,
          weeksLeft: Math.ceil(days / 7),
          returnNote,
          promoteChance,
        }
        state.national.callUps.unshift({
          id: rng.id(),
          season: state.season,
          week: state.week,
          playerId: p.id,
          playerName: playerName(p),
          country,
          band,
          event: conmebol || plan.worldCup ? plan.event : 'Convocatoria',
          days,
        } satisfies CallUp)
      }
      const names = called.map(playerName).join(', ')
      const purpose =
        conmebol || plan.worldCup ? ` para ${plan.event === 'Entrenamientos' ? 'entrenar' : `la ${plan.event}`}` : ''
      const away = plan.worldCup ? `hasta ${days} días según lo que avance el equipo` : `${days} días`
      addNews(
        state,
        rng,
        'seleccion',
        `Convocatoria de ${teamName(country, band)}`,
        `${names} ${called.length > 1 ? 'fueron convocados' : 'fue convocado'}${purpose}. No estarán disponibles para el club (${away}).`,
      )
    }
  }
}

/** End of week: count down time away, bring players back and roll World Cup promotions. */
export function dutyWeek(state: GameState, rng: Rng) {
  const notes = new Set<string>()
  for (const p of [...state.players]) {
    if (!p.duty) continue
    p.duty.weeksLeft--
    if (p.duty.weeksLeft > 0) continue
    const duty = p.duty
    p.duty = null
    if (duty.returnNote && !notes.has(duty.returnNote)) {
      notes.add(duty.returnNote)
      addNews(state, rng, 'seleccion', `Vuelven los convocados de ${duty.label.split(' · ')[0]}`, duty.returnNote)
    }
    if (duty.promoteChance && rng.chance(duty.promoteChance)) {
      removePlayer(state, p.id)
      state.promotedThisSeason.push(playerName(p))
      addNews(
        state,
        rng,
        'promotion',
        `${playerName(p)} sube a Reserva tras el Mundial`,
        `Su nivel en la Copa Mundial convenció al cuerpo técnico de Primera: deja las inferiores y pasa a Reserva de forma permanente.`,
      )
    }
  }
}
