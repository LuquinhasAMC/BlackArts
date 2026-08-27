import { CircleAlert, RefreshCw, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/** Grade de skeletons exibida durante o carregamento. */
export function CatalogLoading({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-label="Carregando catálogo"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-4xl bg-card shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Estado de erro com botão de tentar novamente. */
export function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-10 text-center">
      <CircleAlert className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-sm font-medium">
          Não foi possível carregar o catálogo
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Verifique sua conexão com a internet e tente novamente.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw aria-hidden />
        Tentar novamente
      </Button>
    </div>
  )
}

/** Estado vazio quando não há resultados. */
export function CatalogEmpty({
  onClear,
  hasFilters = false,
  title = "Nenhum resultado encontrado",
  description = "Tente outro termo de busca ou remova os filtros aplicados.",
  children,
}: {
  onClear?: () => void
  hasFilters?: boolean
  title?: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {hasFilters && onClear && (
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
      {children}
    </div>
  )
}
