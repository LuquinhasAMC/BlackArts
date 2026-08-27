import { CatalogCard } from "@/components/catalog/catalog-card"
import { curatedToCatalogItem, type CuratedItem } from "@/data/curated"

interface ContentRowProps {
  title: string
  items: CuratedItem[]
}

/**
 * Fileira de conteúdo no estilo Netflix: título + rolagem horizontal de
 * cards. As obras aparecem na ordem recebida (já embaralhada pelo chamador).
 */
export function ContentRow({ title, items }: ContentRowProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="px-1 text-lg font-bold tracking-tight sm:text-xl">
        {title}
      </h2>
      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div
            key={item.id}
            className="w-40 shrink-0 snap-start sm:w-48 lg:w-52"
          >
            <CatalogCard item={curatedToCatalogItem(item)} />
          </div>
        ))}
      </div>
    </section>
  )
}
