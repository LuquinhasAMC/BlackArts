import { Link } from "react-router-dom"
import { ArrowLeft, Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Página 404. */
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-4xl bg-muted">
        <Compass className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        Página não encontrada
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O conteúdo que você procura não existe ou foi movido.
      </p>
      <Button asChild>
        <Link to="/">
          <ArrowLeft aria-hidden />
          Voltar ao catálogo
        </Link>
      </Button>
    </div>
  )
}
