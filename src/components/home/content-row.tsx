import { CatalogCard } from "@/components/catalog/catalog-card"
import { ScrollRow } from "@/components/home/scroll-row"
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
      <ScrollRow ariaLabel={title} gap={12} className="gap-3 pb-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="w-40 shrink-0 snap-start sm:w-48 lg:w-52"
          >
            <CatalogCard item={curatedToCatalogItem(item)} />
          </div>
        ))}
      </ScrollRow>
    </section>
  )
}
