import type { GameState } from '@/game/types'

export const SAVE_SLOTS = [1, 2, 3] as const

export interface SaveMeta {
  slot: number
  clubId: string
  managerName: string
  season: number
  week: number
  updatedAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'No se pudo conectar con el servidor. Probá de nuevo.')
  }
  return (res.status === 204 ? null : await res.json()) as T
}

export const listSaves = () => request<SaveMeta[]>('/api/careers')

export async function loadSave(slot: number) {
  const state = await request<GameState>(`/api/careers/${slot}`)
  if (!state || typeof state.season !== 'number' || !Array.isArray(state.players)) {
    throw new Error('La partida guardada está dañada.')
  }
  return state
}

/** Careers weigh a couple of MB as JSON, so they travel gzipped. */
export async function saveCareer(slot: number, state: GameState) {
  const body = await new Response(
    new Blob([JSON.stringify(state)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer()
  return request<{ slot: number; updatedAt: string }>(`/api/careers/${slot}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body,
  })
}

export const deleteSave = (slot: number) => request<null>(`/api/careers/${slot}`, { method: 'DELETE' })

export const formatSavedAt = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
