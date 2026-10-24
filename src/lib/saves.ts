import type { GameState } from '@/game/types'
import type { Json } from '@/integrations/supabase/types'
import { supabase } from '@/integrations/supabase/client'

export const SAVE_SLOTS = [1, 2, 3] as const

export interface SaveMeta {
  slot: number
  clubId: string
  managerName: string
  season: number
  week: number
  updatedAt: string
}

const fail = (e: unknown): never => {
  console.error(e)
  throw new Error('No se pudo conectar con el servidor. Probá de nuevo.')
}

export async function listSaves(): Promise<SaveMeta[]> {
  const { data, error } = await supabase
    .from('careers')
    .select('slot, club_id, manager_name, season, week, updated_at')
    .order('slot')
  if (error) fail(error)
  return (data ?? []).map((r) => ({
    slot: r.slot,
    clubId: r.club_id,
    managerName: r.manager_name,
    season: r.season,
    week: r.week,
    updatedAt: r.updated_at,
  }))
}

export async function loadSave(slot: number) {
  const { data, error } = await supabase.from('careers').select('state').eq('slot', slot).maybeSingle()
  if (error) fail(error)
  if (!data) throw new Error('No hay ninguna carrera en esa ranura.')
  const state = data.state as unknown as GameState
  if (!state || typeof state.season !== 'number' || !Array.isArray(state.players)) {
    throw new Error('La partida guardada está dañada.')
  }
  return state
}

export async function saveCareer(slot: number, state: GameState) {
  if (!SAVE_SLOTS.includes(slot as 1)) throw new Error('Ranura inválida.')
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Tenés que iniciar sesión para guardar carreras.')
  const s = state as unknown as { clubId?: string; managerName?: string; week?: number }
  const updatedAt = new Date().toISOString()
  const { error } = await supabase.from('careers').upsert(
    {
      user_id: u.user.id,
      slot,
      club_id: String(s.clubId ?? ''),
      manager_name: String(s.managerName ?? ''),
      season: state.season,
      week: Number(s.week ?? 0),
      state: state as unknown as Json,
      updated_at: updatedAt,
    },
    { onConflict: 'user_id,slot' },
  )
  if (error) fail(error)
  return { slot, updatedAt }
}

export async function deleteSave(slot: number) {
  const { error } = await supabase.from('careers').delete().eq('slot', slot)
  if (error) fail(error)
  return null
}

export const formatSavedAt = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
