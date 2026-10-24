import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  advanceWeek,
  chooseMessiSquad,
  decide,
  discardProspect,
  editPlayer,
  markNewsRead,
  moveCategory,
  newGame,
  releasePlayers,
  scout,
  setLineup,
  signCandidate,
  startNextSeason,
  testProspect,
  type PlayerEdit,
  type Result,
} from './engine'
import type { CategoryId, GameState, Position, ScoutRegion } from './types'

interface GameContextValue {
  game: GameState | null
  /** Save slot the career was loaded from or last saved to. */
  slot: number | null
  setSlot: (slot: number | null) => void
  /** Last state written to (or read from) the cloud; compared by reference to detect unsaved changes. */
  savedGame: GameState | null
  markSaved: (state: GameState, slot: number) => void
  load: (state: GameState, slot: number) => void
  category: CategoryId
  setCategory: (c: CategoryId) => void
  start: (clubId: string, managerName: string) => void
  advance: (weeks?: number) => void
  nextSeason: () => void
  saveLineup: (cat: CategoryId, lineup: (string | null)[]) => void
  registerIn: (playerId: string, cat: CategoryId) => void
  readNews: () => void
  updatePlayer: (playerId: string, edit: PlayerEdit) => void
  /** These return an error message, or null when the action went through. */
  resolve: (decisionId: string, option: string) => string | null
  sendScouts: (region: ScoutRegion, cat: CategoryId, position: Position | null) => string | null
  trial: (prospectId: string) => string | null
  sign: (prospectId: string) => string | null
  dismiss: (prospectId: string) => string | null
  setMessiSquad: (ids: string[]) => string | null
  release: (ids: string[]) => string | null
}

const GameContext = createContext<GameContextValue | null>(null)

/**
 * The career lives in memory for now; saving careers to the cloud is on the roadmap.
 */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null)
  const [slot, setSlot] = useState<number | null>(null)
  const [savedGame, setSavedGame] = useState<GameState | null>(null)
  const [category, setCategory] = useState<CategoryId>('septima')

  const update = useCallback((fn: (g: GameState) => GameState) => setGame((g) => (g ? fn(g) : g)), [])

  const value = useMemo<GameContextValue>(() => {
    const run = (fn: (g: GameState) => Result) => {
      if (!game) return 'No hay una carrera activa'
      const r = fn(game)
      if (!r.error) setGame(r.state)
      return r.error
    }
    return {
      game,
      slot,
      setSlot,
      savedGame,
      markSaved: (state, s) => {
        setSavedGame(state)
        setSlot(s)
      },
      load: (state, s) => {
        setGame(state)
        setSavedGame(state)
        setSlot(s)
      },
      category,
      setCategory,
      start: (clubId, managerName) => {
        setGame(newGame(clubId, managerName))
        setSlot(null)
        setSavedGame(null)
      },
      advance: (weeks = 1) =>
        update((g) => {
          let s = g
          for (let i = 0; i < weeks && !s.seasonOver; i++) s = advanceWeek(s)
          return s
        }),
      nextSeason: () => update(startNextSeason),
      saveLineup: (cat, lineup) => update((g) => setLineup(g, cat, lineup)),
      registerIn: (playerId, cat) => update((g) => moveCategory(g, playerId, cat)),
      readNews: () => update(markNewsRead),
      updatePlayer: (playerId, edit) => update((g) => editPlayer(g, playerId, edit)),
      resolve: (id, option) => run((g) => decide(g, id, option)),
      sendScouts: (region, cat, position) => run((g) => scout(g, region, cat, position)),
      trial: (id) => run((g) => testProspect(g, id)),
      sign: (id) => run((g) => signCandidate(g, id)),
      dismiss: (id) => run((g) => discardProspect(g, id)),
      setMessiSquad: (ids) => run((g) => chooseMessiSquad(g, ids)),
      release: (ids) => run((g) => releasePlayers(g, ids)),
    }
  }, [game, slot, savedGame, category, update])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}

/** For screens that only render once a career exists (guarded by the /juego layout). */
export function useActiveGame() {
  const ctx = useGame()
  if (!ctx.game) throw new Error('No hay una carrera activa')
  return { ...ctx, game: ctx.game }
}
