export type CategoryId =
  'novena' | 'octava' | 'septima' | 'sexta' | 'quinta' | 'cuarta'

export type Line = 'ARQ' | 'DEF' | 'MED' | 'DEL'

export type Position =
  'POR' | 'LD' | 'DFC' | 'LI' | 'MCD' | 'MC' | 'MCO' | 'ED' | 'EI' | 'DC'

export type Competition = 'afa' | 'metro'

export interface WeekStamp {
  season: number
  week: number
}

export interface Club {
  id: string
  name: string
  short: string
  city: string
  colors: [string, string]
  /** Strength of the youth academy, 1–100. Drives squad quality. */
  prestige: number
}

export interface SeasonStats {
  apps: number
  goals: number
  assists: number
  yellows: number
  reds: number
}

export interface Injury {
  description: string
  weeksLeft: number
}

/** Time away from the club: national team call-ups or the Messi Cup trip. */
export interface Duty {
  kind: 'seleccion' | 'messi'
  label: string
  days: number
  weeksLeft: number
  /** Announced when he comes back. */
  returnNote?: string
  /** Chance of being promoted to Reserva on return (World Cups). */
  promoteChance?: number
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  birthYear: number
  birthMonth: number
  nationality: string
  /** Argentine citizenship. Without it he may only play Liga Metro. */
  citizen: boolean
  /** Arrival of a foreign signing; citizenship comes two years later. */
  arrived: WeekStamp | null
  position: Position
  ovr: number
  pot: number
  /** Category the player is registered in. Never younger than his natural category. */
  category: CategoryId
  injury: Injury | null
  /** Pending AFA league matches of suspension. */
  suspension: number
  /** Yellow cards accumulated toward the next suspension. */
  yellowAccum: number
  stats: SeasonStats
  metroStats: SeasonStats
  /** Pending Liga Metro matches of suspension. */
  metroBan: number
  duty: Duty | null
  /** Weeks the club itself keeps him out (discipline). */
  clubBan: number
  joinedSeason: number
}

/** Lightweight player used for rival squads. */
export interface RivalPlayer {
  id: string
  name: string
  line: Line
  ovr: number
}

export interface MatchPlayer {
  id: string
  name: string
  line: Line
}

export type SubReason = 'tactical' | 'injury' | 'red'

export interface SubEvent {
  minute: number
  clubId: string
  offId: string
  offName: string
  onId: string
  onName: string
  reason: SubReason
}

export interface GoalEvent {
  minute: number
  clubId: string
  scorerId: string
  scorerName: string
  assistName?: string
}

export interface CardEvent {
  minute: number
  clubId: string
  playerId: string
  playerName: string
  type: 'yellow' | 'red'
}

export interface Match {
  id: string
  competition: Competition
  category: CategoryId
  round: number
  week: number
  homeId: string
  awayId: string
  played: boolean
  homeGoals: number
  awayGoals: number
  goals: GoalEvent[]
  cards: CardEvent[]
  injuries: { playerId: string; playerName: string; clubId: string; minute: number }[]
  homeStarters: MatchPlayer[]
  awayStarters: MatchPlayer[]
  homeBench: MatchPlayer[]
  awayBench: MatchPlayer[]
  subs: SubEvent[]
}

export interface StandingRow {
  clubId: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  pts: number
}

export interface ScorerRow {
  id: string
  name: string
  clubId: string
  goals: number
}

export interface NewsItem {
  id: string
  week: number
  season: number
  kind:
    | 'result'
    | 'injury'
    | 'suspension'
    | 'info'
    | 'promotion'
    | 'camada'
    | 'seleccion'
    | 'mercado'
    | 'evento'
    | 'messi'
    | 'captacion'
  title: string
  body: string
  read: boolean
}

export interface SeasonSummary {
  season: number
  champions: Partial<Record<CategoryId, string>>
  promoted: string[]
  newcomers: number
  metroChampions?: Partial<Record<CategoryId, string>>
  messiCup?: string
  released?: string[]
}

export type ScoutRegion = 'amba' | 'interior' | 'sudamerica'

export interface ScoutMission {
  id: string
  region: ScoutRegion
  category: CategoryId
  position: Position | null
  returns: WeekStamp
}

export interface Prospect {
  id: string
  /** The real kid. The UI only shows the scouts' estimate until he is tested. */
  player: Player
  origin: string
  estimate: [number, number]
  potEstimate: number
  tested: boolean
  /** Signing cost, in thousands of US$. */
  fee: number
  expires: WeekStamp
}

export interface DecisionOption {
  id: string
  label: string
  hint?: string
  /** Budget needed to choose it, in thousands of US$. */
  cost?: number
}

export interface Decision {
  id: string
  kind:
    | 'oferta'
    | 'estrella'
    | 'mudanza'
    | 'pension'
    | 'representante'
    | 'candidato'
  title: string
  body: string
  playerId?: string
  prospect?: Prospect
  teamId?: string
  /** Offer in millions of euros, or a cost in thousands of US$. */
  fee?: number
  options: DecisionOption[]
  defaultOption: string
  expires: WeekStamp
}

export interface CupMatch {
  id: string
  stage: 'grupo' | 'semi' | 'final'
  group?: number
  week: number
  homeId: string
  awayId: string
  played: boolean
  homeGoals: number
  awayGoals: number
  penalties?: [number, number]
  goals: GoalEvent[]
}

export interface MessiCup {
  season: number
  startWeek: number
  /** Travelling squad; null until the coordinator (or the deadline) confirms it. */
  squad: string[] | null
  teams: string[]
  groups: string[][]
  matches: CupMatch[]
  status: 'pending' | 'playing' | 'done'
  champion: string | null
  /** How far the club went, once finished. */
  result: string | null
}

export interface CallUp {
  id: string
  season: number
  week: number
  playerId: string
  playerName: string
  country: string
  band: 'Sub 15' | 'Sub 17'
  event: string
  days: number
}

export interface NationalState {
  /** Per country and band: qualified to that season's World Cup. */
  qualified: Record<string, { sub15?: boolean; sub17?: boolean }>
  callUps: CallUp[]
}

export interface Cuts {
  required: Partial<Record<CategoryId, number>>
  done: boolean
}

export interface GameState {
  seed: number
  managerName: string
  clubId: string
  season: number
  week: number
  players: Player[]
  rivals: Record<string, Partial<Record<CategoryId, RivalPlayer[]>>>
  matches: Match[]
  lineups: Partial<Record<CategoryId, (string | null)[]>>
  /** Seven substitutes per category (first slot is the backup goalkeeper). */
  benches: Partial<Record<CategoryId, (string | null)[]>>
  news: NewsItem[]
  seasonOver: boolean
  history: SeasonSummary[]
  /** Academy budget in thousands of US$. */
  funds: number
  metroClubs: string[]
  messiCup: MessiCup
  national: NationalState
  decisions: Decision[]
  prospects: Prospect[]
  missions: ScoutMission[]
  /** End-of-season release request from the board. */
  cuts: Cuts | null
  /** Players who left for Reserva mid-season (World Cup promotions). */
  promotedThisSeason: string[]
}
