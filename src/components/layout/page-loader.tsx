import { Loader2 } from "lucide-react"

/** Indicador de carregamento de página (fallback de Suspense). */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[50svh] items-center justify-center"
      role="status"
      aria-label="Carregando"
    >
      <Loader2
        className="size-6 animate-spin text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
