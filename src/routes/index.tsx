import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Ambulance,
  CalendarRange,
  Globe2,
  Plane,
  Save,
  ShieldHalf,
  Sprout,
  Trophy,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Crest } from '@/components/game/crest'
import { CATEGORIES } from '@/game/categories'
import { CLUBS } from '@/game/data/clubs'
import { useGame } from '@/game/store'

export const Route = createFileRoute('/')({
  component: Home,
})

const hero = `${SITE_BASE}/img/hero.jpg`

const FEATURES = [
  {
    icon: Users,
    title: 'Seis planteles, un semillero',
    body: 'Novena, octava, séptima, sexta, quinta y cuarta. Cada categoría con su plantel y su propio equipo titular.',
  },
  {
    icon: Trophy,
    title: 'Liga AFA en cada división',
    body: 'Treinta clubes reales, fixture completo, tabla de posiciones y goleadores por categoría.',
  },
  {
    icon: Ambulance,
    title: 'Lesiones y sanciones',
    body: 'Desgarros, esguinces, rojas directas y acumulación de amarillas. El Tribunal de Disciplina no perdona.',
  },
  {
    icon: ShieldHalf,
    title: 'Jugar en una categoría mayor',
    body: 'Un pibe de sexta puede jugar en quinta, nunca al revés. La edad se define al arrancar la temporada.',
  },
  {
    icon: Sprout,
    title: 'Camadas y Reserva',
    body: 'Cada año llega una camada nueva a novena y los más grandes —o los cracks precoces— suben a Reserva.',
  },
  {
    icon: CalendarRange,
    title: 'Temporada semana a semana',
    body: 'Avanzá el calendario, mirá los resultados de toda la fecha y quién metió los goles.',
  },
]

const COMING = [
  { icon: Save, label: 'Carreras guardadas en tu cuenta' },
  { icon: Globe2, label: 'Liga Metro para 7ª, 8ª y 9ª' },
  { icon: Plane, label: 'Messi Cup en el exterior' },
  { icon: Trophy, label: 'Selecciones Sub 15 y Sub 17' },
  { icon: Users, label: 'Captación y ofertas de Europa' },
]

function Home() {
  const { game } = useGame()
  return (
    <div className="min-h-screen">
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <img
          src={hero}
          alt="Chicos de inferiores entrenando al atardecer en un predio del conurbano"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.18_0.05_262)] via-[oklch(0.18_0.05_262/0.65)] to-[oklch(0.18_0.05_262/0.2)]" />
        <div className="mx-auto flex min-h-[88vh] max-w-content flex-col justify-end px-4 pb-14 pt-24 sm:px-6">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-sm bg-[var(--celeste)] px-2.5 py-1 font-['Barlow_Condensed'] text-sm font-semibold uppercase tracking-widest text-[oklch(0.2_0.06_262)]">
            Simulador de inferiores · Fútbol argentino
          </p>
          <h1 className="text-7xl uppercase leading-[0.9] sm:text-8xl md:text-[10rem]">
            Semillero
          </h1>
          <p className="mt-5 max-w-reading text-lg text-primary-foreground/85 sm:text-xl">
            Hacete cargo de las divisiones juveniles de un club argentino. Elegí quién sale a la cancha en cada
            categoría, bancá las lesiones, cuidá a la camada nueva y formá a los próximos cracks de Primera.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[var(--celeste)] text-[oklch(0.2_0.06_262)] hover:bg-[var(--celeste)]/90">
              <Link to="/nueva">
                Nueva carrera <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/cargar">Cargar carrera</Link>
            </Button>
            {game && (
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/juego">Continuar carrera</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-content gap-3 overflow-x-auto px-4 py-4 sm:px-6" aria-label="Clubes">
          {CLUBS.map((c) => (
            <Crest key={c.id} clubId={c.id} className="size-9" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-4xl uppercase">De novena a cuarta</h2>
            <p className="mt-3 text-muted-foreground">
              Las categorías siguen el sistema de AFA. La elegibilidad se define por año de nacimiento al empezar la
              temporada: en 2027, un 2011 juega en séptima aunque cumpla 16 en enero.
            </p>
            <ol className="mt-6 divide-y rounded-md border bg-card">
              {CATEGORIES.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-['Barlow_Condensed'] text-sm uppercase tracking-wide text-muted-foreground">
                    {c.label} · nacidos {2027 - c.maxYearAge}
                    {c.id === 'cuarta' ? '–2008' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-md border bg-card p-5">
                <f.icon className="mb-3 size-6 text-[var(--tier-good)]" />
                <h3 className="text-xl uppercase">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
          <h2 className="text-3xl uppercase">Además, en el semillero</h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {COMING.map((c) => (
              <li
                key={c.label}
                className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-3 py-2 text-sm"
              >
                <c.icon className="size-4 text-[var(--celeste)]" /> {c.label}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-10 bg-[var(--celeste)] text-[oklch(0.2_0.06_262)] hover:bg-[var(--celeste)]/90">
            <Link to="/nueva">
              Elegir club <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
