import { CATEGORIES, categoryInfo, naturalCategory } from './categories'
import { CLUBS, clubById } from './data/clubs'
import { COUNTRIES, EUROPEAN_CLUBS } from './data/world'
import { SEASON_WEEKS } from './fixtures'
import { makePlayer, maturity } from './generate'
import type { Rng } from './rng'
import type { CategoryId, Decision, GameState, Player, Position, Prospect, ScoutMission, ScoutRegion } from './types'
import { addNews, euros, later, money, now, playerName, reached, removePlayer, yearAge } from './util'

export const SCOUT_REGIONS: Record<ScoutRegion, { label: string; cost: number; weeks: number; description: string }> = {
  amba: {
    label: 'Buenos Aires y conurbano',
    cost: 6,
    weeks: 2,
    description: 'Ligas barriales y baby fútbol del AMBA. Barato y rápido.',
  },
  interior: {
    label: 'Interior del país',
    cost: 12,
    weeks: 3,
    description: 'Ligas regionales de Córdoba, Santa Fe, Tucumán, Mendoza y más.',
  },
  sudamerica: {
    label: 'Resto de Sudamérica',
    cost: 30,
    weeks: 4,
    description: 'Chicos de países vecinos. Necesitan dos años en el país para la ciudadanía.',
  },
}

export const MAX_MISSIONS = 2

const AMBA_ORIGINS = [
  'Liga de Lomas de Zamora',
  'Baby fútbol de Merlo',
  'Club de barrio de Quilmes',
  'Liga de Pilar',
  'Escuelita de Lanús Oeste',
  'Liga de La Matanza',
  'Club de barrio de Florencio Varela',
  'Liga de Tigre',
]
const INTERIOR_ORIGINS = [
  'Liga Cordobesa',
  'Liga Rosarina',
  'Liga Tucumana',
  'Liga Mendocina',
  'Liga Salteña',
  'Liga Santafesina',
  'Liga Chaqueña',
  'Liga Marplatense',
  'Liga Correntina',
  'Liga Neuquina',
]
const SA_COUNTRIES = COUNTRIES.filter((c) => c.southAmerica && c.name !== 'Argentina').map((c) => c.name)
const WORLD_COUNTRIES = COUNTRIES.filter((c) => c.name !== 'Argentina').map((c) => c.name)

/** Pseudo-club used only to generate outside kids. */
const OUTSIDE = {
  id: 'outside',
  name: '',
  short: '',
  city: '',
  colors: ['#000', '#fff'] as [string, string],
  prestige: 75,
}
const POSITIONS: Position[] = ['POR', 'LD', 'DFC', 'LI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC']

function birthYearFor(rng: Rng, cat: CategoryId, season: number) {
  const max = categoryInfo(cat).maxYearAge
  return season - max + (cat === 'cuarta' ? rng.int(0, 1) : 0)
}

function makeProspect(
  rng: Rng,
  state: GameState,
  opts: {
    cat: CategoryId
    position: Position
    nationality: string
    potMean: number
    origin: string
    fee: number
  },
): Prospect {
  const player = makePlayer(rng, OUTSIDE, birthYearFor(rng, opts.cat, state.season), opts.position, state.season, {
    nationality: opts.nationality,
    potMean: opts.potMean,
  })
  const err = rng.int(3, 7)
  const centre = player.ovr + rng.normal(0, 2.5)
  return {
    id: rng.id(),
    player,
    origin: opts.origin,
    estimate: [Math.round(centre - err), Math.round(centre + err)],
    potEstimate: Math.round(player.pot + rng.normal(0, 5)),
    tested: false,
    fee: opts.fee,
    expires: later(now(state), 6, SEASON_WEEKS),
  }
}

/* ------------------------------- Scouting ------------------------------- */

export function startMission(
  state: GameState,
  rng: Rng,
  region: ScoutRegion,
  cat: CategoryId,
  position: Position | null,
) {
  const r = SCOUT_REGIONS[region]
  if (state.missions.length >= MAX_MISSIONS) return `Ya tenés ${MAX_MISSIONS} ojeadores en viaje.`
  if (state.funds < r.cost) return 'No alcanza el presupuesto para esta misión.'
  state.funds -= r.cost
  const mission: ScoutMission = {
    id: rng.id(),
    region,
    category: cat,
    position,
    returns: later(now(state), r.weeks, SEASON_WEEKS),
  }
  state.missions.push(mission)
  return null
}

function completeMission(state: GameState, rng: Rng, m: ScoutMission) {
  const boost = (clubById(state.clubId).prestige - 75) * 0.15
  const count = rng.int(3, 5)
  for (let i = 0; i < count; i++) {
    const position = m.position ?? rng.pick(POSITIONS)
    const prospect =
      m.region === 'amba'
        ? makeProspect(rng, state, {
            cat: m.category,
            position,
            nationality: 'Argentina',
            potMean: 64 + boost,
            origin: rng.pick(AMBA_ORIGINS),
            fee: rng.int(2, 8),
          })
        : m.region === 'interior'
          ? makeProspect(rng, state, {
              cat: m.category,
              position,
              nationality: 'Argentina',
              potMean: 64 + boost,
              origin: rng.pick(INTERIOR_ORIGINS),
              fee: rng.int(4, 12),
            })
          : (() => {
              const nationality = rng.pick(SA_COUNTRIES)
              return makeProspect(rng, state, {
                cat: m.category,
                position,
                nationality,
                potMean: 67 + boost,
                origin: `Club juvenil de ${nationality}`,
                fee: rng.int(15, 35),
              })
            })()
    state.prospects.push(prospect)
  }
  addNews(
    state,
    rng,
    'captacion',
    `Volvieron los ojeadores de ${SCOUT_REGIONS[m.region].label}`,
    `Recomiendan ${count} chicos para ${categoryInfo(m.category).name}. Revisalos en Captación antes de que se los lleve otro club.`,
  )
}

export function trialProspect(state: GameState, id: string) {
  const p = state.prospects.find((x) => x.id === id)
  if (!p) return 'El candidato ya no está disponible.'
  p.tested = true
  p.estimate = [Math.round(p.player.ovr), Math.round(p.player.ovr)]
  p.potEstimate = p.player.pot
  return null
}

function addSigning(state: GameState, player: Player) {
  const cat = naturalCategory(player.birthYear, state.season)
  if (!cat) return 'Es demasiado grande para las inferiores.'
  player.category = cat
  player.joinedSeason = state.season
  player.citizen = player.nationality === 'Argentina'
  player.arrived = player.citizen ? null : now(state)
  state.players.push(player)
  return null
}

export function signProspect(state: GameState, rng: Rng, id: string) {
  const p = state.prospects.find((x) => x.id === id)
  if (!p) return 'El candidato ya no está disponible.'
  if (state.funds < p.fee) return 'No alcanza el presupuesto para ficharlo.'
  const err = addSigning(state, p.player)
  if (err) return err
  state.funds -= p.fee
  state.prospects = state.prospects.filter((x) => x.id !== id)
  addNews(
    state,
    rng,
    'captacion',
    `Fichaste a ${playerName(p.player)}`,
    `Llega desde ${p.origin} a ${categoryInfo(p.player.category).name}.` +
      (p.player.citizen
        ? ''
        : ' Como es extranjero, sólo podrá jugar la Liga Metro hasta obtener la ciudadanía en dos años.'),
  )
  return null
}

export function dismissProspect(state: GameState, id: string) {
  state.prospects = state.prospects.filter((x) => x.id !== id)
}

/* ------------------------------- Decisions ------------------------------ */

function decision(state: GameState, rng: Rng, d: Omit<Decision, 'id' | 'expires'>, weeks = 2) {
  state.decisions.push({
    ...d,
    id: rng.id(),
    expires: later(now(state), weeks, SEASON_WEEKS),
  })
}

/** Market value of a kid in millions of euros. */
function offerValue(rng: Rng, p: Player) {
  const v = Math.max(0.5, (p.pot - 70) * 0.6 + (p.ovr - 55) * 0.15) * (0.8 + rng.next() * 0.5)
  return Math.round(Math.min(25, v) * 10) / 10
}

function europeanOffer(state: GameState, rng: Rng) {
  const pending = new Set(state.decisions.map((d) => d.playerId))
  const stars = state.players.filter(
    (p) => !pending.has(p.id) && yearAge(p, state.season) >= 15 && p.ovr >= 76 * maturity(yearAge(p, state.season)),
  )
  const target = stars.find(() => rng.chance(0.03))
  if (!target) return
  const team = rng.pick(EUROPEAN_CLUBS)
  const fee = offerValue(rng, target)
  decision(state, rng, {
    kind: 'oferta',
    title: `${team.name} quiere llevarse a ${playerName(target)}`,
    body: `Ofrecen ${euros(fee)} por el juvenil de ${categoryInfo(target.category).name}. Si rechazás, su entorno podría negociar por su cuenta y llevárselo igual a cambio sólo de los derechos de formación.`,
    playerId: target.id,
    teamId: team.id,
    fee,
    options: [
      {
        id: 'aceptar',
        label: 'Aceptar la oferta',
        hint: `La cantera recibe ${money(fee * 100)}`,
      },
      {
        id: 'negociar',
        label: 'Pedir más dinero',
        hint: 'Pueden mejorarla, retirarse o ir directo a la familia',
      },
      { id: 'rechazar', label: 'Rechazar' },
    ],
    defaultOption: 'rechazar',
  })
}

function worldCandidate(state: GameState, rng: Rng) {
  const big = state.clubId === 'river' || state.clubId === 'boca'
  if (!rng.chance(big ? 0.06 : 0.004)) return
  const nationality = rng.pick(WORLD_COUNTRIES)
  const cat = rng.pick(CATEGORIES.slice(0, 5)).id
  const prospect = makeProspect(rng, state, {
    cat,
    position: rng.pick(POSITIONS),
    nationality,
    potMean: big ? 74 : 70,
    origin: `Academia de ${nationality}`,
    fee: rng.int(25, 60),
  })
  decision(state, rng, {
    kind: 'candidato',
    title: `Un candidato de ${nationality} quiere probarse`,
    body: `${playerName(prospect.player)} (${prospect.player.position}, ${categoryInfo(cat).name}) viajó para sumarse a las inferiores. Los ojeadores lo ven entre ${prospect.estimate[0]} y ${prospect.estimate[1]} de nivel. Sin ciudadanía, sólo podría jugar Liga Metro durante dos años.`,
    prospect,
    fee: prospect.fee,
    options: [
      {
        id: 'fichar',
        label: 'Ficharlo',
        hint: money(prospect.fee),
        cost: prospect.fee,
      },
      {
        id: 'prueba',
        label: 'Sumarlo a la lista de candidatos',
        hint: 'Lo podés probar en Captación',
      },
      { id: 'rechazar', label: 'Rechazar' },
    ],
    defaultOption: 'prueba',
  })
}

function randomEvent(state: GameState, rng: Rng) {
  if (state.decisions.length >= 5 || !rng.chance(0.1) || state.players.length < 30) return
  const pick = (filter: (p: Player) => boolean = () => true) => {
    const pool = state.players.filter((p) => filter(p) && !state.decisions.some((d) => d.playerId === p.id))
    return pool.length ? rng.pick(pool) : null
  }
  const kind = rng.weighted(
    ['estrella', 'mudanza', 'pension', 'estiron', 'nostalgia', 'sponsor', 'representante'] as const,
    (k) =>
      ({
        estrella: 2,
        mudanza: 2,
        pension: 2,
        estiron: 2,
        nostalgia: 1.5,
        sponsor: 1,
        representante: 1.5,
      })[k],
  )
  if (kind === 'estrella') {
    const from = rng.pick(CLUBS.filter((c) => c.id !== state.clubId))
    const cat = rng.pick(CATEGORIES.slice(0, 5)).id
    const prospect = makeProspect(rng, state, {
      cat,
      position: rng.pick(POSITIONS),
      nationality: 'Argentina',
      potMean: 80,
      origin: `las inferiores de ${from.name}`,
      fee: rng.int(20, 50),
    })
    Object.assign(prospect, {
      tested: true,
      estimate: [Math.round(prospect.player.ovr), Math.round(prospect.player.ovr)],
      potEstimate: prospect.player.pot,
    })
    decision(state, rng, {
      kind: 'estrella',
      title: `Una figura de ${from.name} se ofrece`,
      body: `${playerName(prospect.player)}, ${prospect.player.position} de ${categoryInfo(cat).name}, se peleó con su club y quiere sumarse a tu cantera. Nivel ${Math.round(prospect.player.ovr)}, con mucho potencial.`,
      prospect,
      fee: prospect.fee,
      options: [
        {
          id: 'fichar',
          label: 'Ficharlo',
          hint: money(prospect.fee),
          cost: prospect.fee,
        },
        { id: 'rechazar', label: 'No, gracias' },
      ],
      defaultOption: 'rechazar',
    })
  } else if (kind === 'mudanza') {
    const p = pick()
    if (!p) return
    decision(state, rng, {
      kind: 'mudanza',
      title: `La familia de ${playerName(p)} se muda`,
      body: `Por trabajo, los padres se van a vivir lejos y quieren llevárselo. Podés ofrecerle un lugar en la pensión del club para que se quede.`,
      playerId: p.id,
      fee: 10,
      options: [
        {
          id: 'pension',
          label: 'Ofrecerle la pensión',
          hint: `${money(10)} · puede que igual se vaya`,
          cost: 10,
        },
        { id: 'dejar', label: 'Dejarlo ir' },
      ],
      defaultOption: 'dejar',
    })
  } else if (kind === 'pension') {
    const p = pick((x) => yearAge(x, state.season) >= 15)
    if (!p) return
    decision(state, rng, {
      kind: 'pension',
      title: `Problemas en la pensión con ${playerName(p)}`,
      body: `Los encargados de la pensión denuncian que no cumple los horarios, falta a la escuela y se pelea con sus compañeros.`,
      playerId: p.id,
      options: [
        {
          id: 'charla',
          label: 'Hablar con él y darle otra chance',
          hint: 'Puede funcionar… o no',
        },
        {
          id: 'sancion',
          label: 'Sancionarlo dos semanas',
          hint: 'No juega en ese tiempo',
        },
        { id: 'liberar', label: 'Dejarlo libre' },
      ],
      defaultOption: 'charla',
    })
  } else if (kind === 'representante') {
    const p = pick((x) => x.pot >= 70)
    if (!p) return
    const rival = rng.pick(CLUBS.filter((c) => c.id !== state.clubId))
    decision(state, rng, {
      kind: 'representante',
      title: `Un representante quiere llevarse a ${playerName(p)}`,
      body: `Le prometió a la familia un lugar en ${rival.name}. Para retenerlo hay que mejorarle la beca de estudio y vivienda.`,
      playerId: p.id,
      teamId: rival.id,
      fee: 15,
      options: [
        {
          id: 'retener',
          label: 'Mejorarle la beca',
          hint: money(15),
          cost: 15,
        },
        { id: 'dejar', label: 'Dejarlo ir' },
      ],
      defaultOption: 'dejar',
    })
  } else if (kind === 'estiron') {
    const p = pick((x) => yearAge(x, state.season) <= 16 && x.ovr < x.pot - 2)
    if (!p) return
    const gain = rng.int(2, 4)
    p.ovr = Math.min(p.pot, p.ovr + gain)
    addNews(
      state,
      rng,
      'evento',
      `Pegó el estirón: ${playerName(p)}`,
      `Creció varios centímetros en pocos meses y se lo ve más fuerte. Sube ${gain} puntos de nivel.`,
    )
  } else if (kind === 'nostalgia') {
    const p = pick((x) => !x.citizen || x.nationality !== 'Argentina' || x.joinedSeason === state.season)
    if (!p) return
    const loss = rng.int(1, 3)
    p.ovr = Math.max(20, p.ovr - loss)
    addNews(
      state,
      rng,
      'evento',
      `${playerName(p)} extraña su casa`,
      `Le está costando la adaptación lejos de su familia y bajó su rendimiento (−${loss} de nivel).`,
    )
  } else {
    const amount = rng.int(10, 40)
    state.funds += amount
    addNews(
      state,
      rng,
      'evento',
      'Una empresa apadrina las inferiores',
      `Un sponsor local donó ${money(amount)} para la cantera.`,
    )
  }
}

function leave(state: GameState, rng: Rng, p: Player, title: string, body: string) {
  removePlayer(state, p.id)
  addNews(state, rng, 'mercado', title, body)
}

function applyDecision(state: GameState, rng: Rng, d: Decision, option: string) {
  state.decisions = state.decisions.filter((x) => x.id !== d.id)
  const p = d.playerId ? state.players.find((x) => x.id === d.playerId) : undefined
  const team = d.teamId ? clubById(d.teamId).name : ''
  switch (d.kind) {
    case 'oferta': {
      if (!p) return
      const fee = d.fee ?? 1
      const steal = () => {
        const comp = Math.round(fee * 20)
        state.funds += comp
        leave(
          state,
          rng,
          p,
          `${team} se llevó a ${playerName(p)}`,
          `La familia firmó con ${team} por su cuenta. El club sólo cobra ${money(comp)} por derechos de formación.`,
        )
      }
      if (option === 'aceptar') {
        state.funds += fee * 100
        leave(
          state,
          rng,
          p,
          `${playerName(p)} fue vendido a ${team}`,
          `Se va por ${euros(fee)}. La cantera recibe ${money(fee * 100)} para su presupuesto.`,
        )
      } else if (option === 'negociar') {
        const r = rng.next()
        if (r < 0.45) {
          const better = Math.round(fee * 13) / 10
          decision(
            state,
            rng,
            {
              ...d,
              title: `${team} mejoró la oferta por ${playerName(p)}`,
              body: `Ahora ofrecen ${euros(better)}. Es su última palabra.`,
              fee: better,
              options: [
                {
                  id: 'aceptar',
                  label: 'Aceptar',
                  hint: `La cantera recibe ${money(better * 100)}`,
                },
                { id: 'rechazar', label: 'Rechazar' },
              ],
            },
            1,
          )
        } else if (r < 0.75) {
          addNews(
            state,
            rng,
            'mercado',
            `${team} se retiró`,
            `No quisieron subir la oferta por ${playerName(p)}. Se queda en el club.`,
          )
        } else steal()
      } else if (rng.chance(0.2)) steal()
      else
        addNews(
          state,
          rng,
          'mercado',
          `${playerName(p)} se queda`,
          `Rechazaste la oferta de ${team} y el chico sigue en el club.`,
        )
      return
    }
    case 'estrella':
    case 'candidato': {
      const pr = d.prospect
      if (!pr) return
      if (option === 'fichar') {
        if (state.funds < pr.fee) {
          state.prospects.push(pr)
          return
        }
        state.prospects.push(pr)
        signProspect(state, rng, pr.id)
      } else if (option === 'prueba') {
        state.prospects.push({
          ...pr,
          expires: later(now(state), 6, SEASON_WEEKS),
        })
      }
      return
    }
    case 'mudanza': {
      if (!p) return
      if (option === 'pension' && state.funds >= 10) {
        state.funds -= 10
        if (rng.chance(0.6)) {
          addNews(
            state,
            rng,
            'evento',
            `${playerName(p)} se queda en la pensión`,
            'Su familia aceptó y seguirá en el club.',
          )
          return
        }
      }
      leave(state, rng, p, `${playerName(p)} deja el club`, 'Su familia se mudó y se lo llevó con ellos.')
      return
    }
    case 'pension': {
      if (!p) return
      if (option === 'sancion') {
        p.clubBan = 2
        addNews(state, rng, 'evento', `${playerName(p)} sancionado`, 'No jugará en las próximas dos semanas.')
      } else if (option === 'liberar') {
        leave(state, rng, p, `${playerName(p)} quedó libre`, 'El club decidió no contar más con él.')
      } else if (rng.chance(0.5)) {
        addNews(
          state,
          rng,
          'evento',
          `${playerName(p)} cambió de actitud`,
          'La charla funcionó: volvió a entrenar con ganas.',
        )
      } else {
        p.ovr = Math.max(20, p.ovr - 2)
        p.clubBan = 1
        addNews(
          state,
          rng,
          'evento',
          `${playerName(p)} volvió a las andadas`,
          'Otra vez problemas en la pensión: queda una semana afuera y bajó su nivel.',
        )
      }
      return
    }
    case 'representante': {
      if (!p) return
      if (option === 'retener' && state.funds >= 15) {
        state.funds -= 15
        addNews(state, rng, 'evento', `${playerName(p)} renovó su beca`, 'Se queda en el club.')
      } else {
        leave(state, rng, p, `${playerName(p)} se fue a ${team}`, 'Su representante lo llevó a otro club.')
      }
    }
  }
}

export function resolveDecision(state: GameState, rng: Rng, id: string, option: string) {
  const d = state.decisions.find((x) => x.id === id)
  if (!d) return 'La decisión ya no está pendiente.'
  const opt = d.options.find((o) => o.id === option)
  if (!opt) return 'Opción inválida.'
  if (opt.cost && state.funds < opt.cost) return 'No alcanza el presupuesto.'
  applyDecision(state, rng, d, option)
  return null
}

/** Weekly market tick, after the matches. */
export function marketWeek(state: GameState, rng: Rng) {
  for (const m of state.missions.filter((x) => reached(state, x.returns))) {
    state.missions = state.missions.filter((x) => x !== m)
    completeMission(state, rng, m)
  }
  for (const d of state.decisions.filter((x) => reached(state, x.expires)))
    applyDecision(state, rng, d, d.defaultOption)
  const expired = state.prospects.filter((x) => reached(state, x.expires))
  if (expired.length) {
    state.prospects = state.prospects.filter((x) => !expired.includes(x))
    addNews(
      state,
      rng,
      'captacion',
      'Candidatos perdidos',
      `${expired.map((x) => playerName(x.player)).join(', ')} firmaron en otros clubes.`,
    )
  }
  europeanOffer(state, rng)
  worldCandidate(state, rng)
  randomEvent(state, rng)
}

/** Foreign signings become citizens after two years in the country. */
export function citizenshipCheck(state: GameState, rng: Rng) {
  for (const p of state.players) {
    if (p.citizen || !p.arrived) continue
    if (reached(state, { season: p.arrived.season + 2, week: p.arrived.week })) {
      p.citizen = true
      addNews(
        state,
        rng,
        'info',
        `${playerName(p)} obtuvo la ciudadanía argentina`,
        'Cumplió dos años en el país y ya puede jugar la Liga AFA.',
      )
    }
  }
}

export const citizenshipDate = (p: Player) =>
  p.arrived ? { season: p.arrived.season + 2, week: p.arrived.week } : null
