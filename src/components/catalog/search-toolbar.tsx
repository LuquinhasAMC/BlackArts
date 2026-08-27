import { Search, X } from "lucide-react"

import { MEDIA_TYPE_FILTERS } from "@/config/archive"
import type { MediaTypeFilterValue } from "@/config/archive"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchToolbarProps {
  query: string
  onQueryChange: (query: string) => void
  mediaType: MediaTypeFilterValue
  onMediaTypeChange: (mediaType: MediaTypeFilterValue) => void
  resultCount?: number
  onClear?: () => void
}

/**
 * Barra de busca no estilo app mobile: campo com ícone e botão de limpar,
 * chips de filtro por tipo de mídia (roláveis) e contagem de resultados.
 */
export function SearchToolbar({
  query,
  onQueryChange,
  mediaType,
  onMediaTypeChange,
  resultCount,
  onClear,
}: SearchToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por título, artista ou autor…"
          aria-label="Buscar na curadoria"
          className="h-11 rounded-4xl pr-10 pl-10"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onQueryChange("")}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
          >
            <X aria-hidden />
          </Button>
        )}
      </div>

      {/* Chips de filtro por tipo, roláveis horizontalmente — mesmo
          padrão visual das fileiras do app. */}
      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MEDIA_TYPE_FILTERS.map((filter) => {
          const active = mediaType === filter.value
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onMediaTypeChange(filter.value)}
              aria-pressed={active}
              className={cn(
                "shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        {resultCount !== undefined ? (
          <p className="text-xs text-muted-foreground">
            {resultCount} {resultCount === 1 ? "obra" : "obras"} encontrada
            {resultCount === 1 ? "" : "s"}
          </p>
        ) : (
          <span aria-hidden />
        )}
        {onClear && (query || mediaType !== "all") && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
