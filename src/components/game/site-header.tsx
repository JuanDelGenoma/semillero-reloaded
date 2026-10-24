import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Header for the pages outside a career: club selection, account and saved careers. */
export function SiteHeader() {
  return (
    <header className="border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-content items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="font-display text-2xl uppercase">
          Semillero
        </Link>
        <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 hover:text-white">
          <Link to="/">
            <ArrowLeft /> Volver
          </Link>
        </Button>
      </div>
    </header>
  )
}
