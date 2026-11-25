import type { ArchiveSearchItem } from "@/types/archive"
import { cn } from "@/lib/utils"

import { CatalogCard } from "./catalog-card"

interface CatalogGridProps {
  items: ArchiveSearchItem[]
  /** Ação extra aplicada a cada card (ex.: remover favorito). */
  cardAction?: (item: ArchiveSearchItem) => React.ReactNode
  /** Colunas / espaçamento alternativos (ex.: duas colunas no celular). */
  className?: string
}

/** Grade responsiva de cards do catálogo. */
export function CatalogGrid({
  items,
  cardAction,
  className,
}: CatalogGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item) => (
        <CatalogCard
          key={item.identifier}
          item={item}
          action={cardAction?.(item)}
        />
      ))}
    </div>
  )
}
