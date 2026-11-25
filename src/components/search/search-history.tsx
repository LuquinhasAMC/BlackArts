import { Clock, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchHistoryProps {
  terms: string[]
  onSelect: (term: string) => void
  onRemove: (term: string) => void
  onClear: () => void
  className?: string
}

/** Buscas recentes: tocar num termo refaz a busca. */
export function SearchHistory({
  terms,
  onSelect,
  onRemove,
  onClear,
  className,
}: SearchHistoryProps) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-1", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <p className="text-sm font-medium">Buscas recentes</p>
        {terms.length > 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            aria-label="Limpar histórico"
            title="Limpar histórico"
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>

      {terms.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">
          Nenhuma busca recente.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {terms.map((term) => (
            <li
              key={term}
              className="flex items-center gap-2 rounded-2xl px-1 transition-colors hover:bg-muted/60"
            >
              <Clock
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => onSelect(term)}
                className="min-w-0 flex-1 truncate py-2 text-left text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {term}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${term} do histórico`}
                onClick={() => onRemove(term)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
