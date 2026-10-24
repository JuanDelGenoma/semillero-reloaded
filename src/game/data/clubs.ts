import { FOREIGN_TEAMS } from './world'
import type { Club } from '../types'

/** The 30 clubs of the Liga Profesional, whose academies play the AFA youth leagues. */
export const CLUBS: Club[] = [
  { id: 'river', name: 'River Plate', short: 'RIV', city: 'Núñez, CABA', colors: ['#ffffff', '#d4122a'], prestige: 97 },
  { id: 'boca', name: 'Boca Juniors', short: 'BOC', city: 'La Boca, CABA', colors: ['#0b3d91', '#f5c400'], prestige: 95 },
  { id: 'argentinos', name: 'Argentinos Juniors', short: 'ARG', city: 'La Paternal, CABA', colors: ['#d0112b', '#ffffff'], prestige: 90 },
  { id: 'velez', name: 'Vélez Sarsfield', short: 'VEL', city: 'Liniers, CABA', colors: ['#ffffff', '#1d3b8f'], prestige: 88 },
  { id: 'racing', name: 'Racing Club', short: 'RAC', city: 'Avellaneda', colors: ['#6cb4e4', '#ffffff'], prestige: 88 },
  { id: 'newells', name: "Newell's Old Boys", short: 'NOB', city: 'Rosario', colors: ['#d0102b', '#111111'], prestige: 87 },
  { id: 'independiente', name: 'Independiente', short: 'IND', city: 'Avellaneda', colors: ['#c8102e', '#ffffff'], prestige: 85 },
  { id: 'lanus', name: 'Lanús', short: 'LAN', city: 'Lanús', colors: ['#7a1f2b', '#ffffff'], prestige: 85 },
  { id: 'sanlorenzo', name: 'San Lorenzo', short: 'SLO', city: 'Boedo, CABA', colors: ['#0f2a6b', '#c8102e'], prestige: 84 },
  { id: 'estudiantes', name: 'Estudiantes de La Plata', short: 'EST', city: 'La Plata', colors: ['#d50f25', '#ffffff'], prestige: 83 },
  { id: 'central', name: 'Rosario Central', short: 'CEN', city: 'Rosario', colors: ['#00338d', '#ffd100'], prestige: 83 },
  { id: 'talleres', name: 'Talleres', short: 'TAL', city: 'Córdoba', colors: ['#002f6c', '#ffffff'], prestige: 81 },
  { id: 'banfield', name: 'Banfield', short: 'BAN', city: 'Banfield', colors: ['#00843d', '#ffffff'], prestige: 80 },
  { id: 'huracan', name: 'Huracán', short: 'HUR', city: 'Parque Patricios, CABA', colors: ['#ffffff', '#d50f25'], prestige: 76 },
  { id: 'gimnasia', name: 'Gimnasia y Esgrima La Plata', short: 'GEL', city: 'La Plata', colors: ['#ffffff', '#002b5c'], prestige: 76 },
  { id: 'defensa', name: 'Defensa y Justicia', short: 'DYJ', city: 'Florencio Varela', colors: ['#ffd400', '#00843d'], prestige: 74 },
  { id: 'belgrano', name: 'Belgrano', short: 'BEL', city: 'Córdoba', colors: ['#5fb3e6', '#ffffff'], prestige: 74 },
  { id: 'tigre', name: 'Tigre', short: 'TIG', city: 'Victoria', colors: ['#0a2d6e', '#d50f25'], prestige: 72 },
  { id: 'platense', name: 'Platense', short: 'PLA', city: 'Vicente López', colors: ['#5a3a22', '#ffffff'], prestige: 70 },
  { id: 'union', name: 'Unión', short: 'UNI', city: 'Santa Fe', colors: ['#d50f25', '#ffffff'], prestige: 70 },
  { id: 'instituto', name: 'Instituto', short: 'INS', city: 'Córdoba', colors: ['#d50f25', '#ffffff'], prestige: 69 },
  { id: 'atltucuman', name: 'Atlético Tucumán', short: 'ATU', city: 'San Miguel de Tucumán', colors: ['#7ec8ef', '#ffffff'], prestige: 68 },
  { id: 'sarmiento', name: 'Sarmiento', short: 'SAR', city: 'Junín', colors: ['#00843d', '#ffffff'], prestige: 65 },
  { id: 'aldosivi', name: 'Aldosivi', short: 'ALD', city: 'Mar del Plata', colors: ['#00833e', '#ffd400'], prestige: 64 },
  { id: 'barracas', name: 'Barracas Central', short: 'BAR', city: 'Barracas, CABA', colors: ['#d50f25', '#ffffff'], prestige: 62 },
  { id: 'indriv', name: 'Independiente Rivadavia', short: 'IRM', city: 'Mendoza', colors: ['#1d3f95', '#ffffff'], prestige: 63 },
  { id: 'gimmendoza', name: 'Gimnasia y Esgrima de Mendoza', short: 'GYM', city: 'Mendoza', colors: ['#ffffff', '#111111'], prestige: 60 },
  { id: 'ccordoba', name: 'Central Córdoba', short: 'CCO', city: 'Santiago del Estero', colors: ['#111111', '#ffffff'], prestige: 60 },
  { id: 'riestra', name: 'Deportivo Riestra', short: 'RIE', city: 'Bajo Flores, CABA', colors: ['#111111', '#ffffff'], prestige: 58 },
  { id: 'estrc', name: 'Estudiantes de Río Cuarto', short: 'ERC', city: 'Río Cuarto', colors: ['#7ec8ef', '#ffffff'], prestige: 58 },
]

/** Any team in the game: league clubs and foreign academies. */
export const clubById = (id: string): Club => {
  const club = CLUBS.find((c) => c.id === id) ?? FOREIGN_TEAMS.find((c) => c.id === id)
  if (!club) throw new Error(`Club desconocido: ${id}`)
  return club
}
