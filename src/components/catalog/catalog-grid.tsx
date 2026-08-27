import type { ArchiveSearchItem } from "@/types/archive"

import { CatalogCard } from "./catalog-card"

interface CatalogGridProps {
  items: ArchiveSearchItem[]
  /** Ação extra aplicada a cada card (ex.: remover favorito). */
  cardAction?: (item: ArchiveSearchItem) => React.ReactNode
}

/** Grade responsiva de cards do catálogo. */
export function CatalogGrid({ items, cardAction }: CatalogGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
