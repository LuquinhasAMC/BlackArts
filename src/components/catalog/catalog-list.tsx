import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ImageOff } from "lucide-react"

import { MediaTypeIcon } from "@/components/catalog/media-type-icon"
import { extractYear, formatList } from "@/lib/media"
import type { ArchiveSearchItem } from "@/types/archive"

interface CatalogListProps {
  items: ArchiveSearchItem[]
  /** Ação extra aplicada a cada linha (ex.: remover favorito). */
  cardAction?: (item: ArchiveSearchItem) => ReactNode
}

/** Lista vertical de itens: miniatura à esquerda, dados à direita. */
export function CatalogList({ items, cardAction }: CatalogListProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.identifier}>
          <CatalogListRow item={item} action={cardAction?.(item)} />
        </li>
      ))}
    </ul>
  )
}

function CatalogListRow({
  item,
  action,
}: {
  item: ArchiveSearchItem
  action?: ReactNode
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.thumbnail) && !imageFailed
  const creator = formatList(item.creator)
  const year = extractYear(item.year)

  return (
    <div className="group relative flex items-center gap-3 rounded-3xl bg-muted/40 p-2.5 ring-1 ring-foreground/5 transition-colors hover:bg-muted/60 dark:ring-foreground/10">
      <Link
        to={`/item/${item.identifier}`}
        aria-label={`Abrir ${item.title}`}
        className="flex min-w-0 flex-1 items-center gap-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-2xl bg-muted sm:w-28">
          {showImage ? (
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff
                className="size-5 text-muted-foreground/50"
                aria-hidden
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MediaTypeIcon mediatype={item.mediatype} />
            {year && <span className="text-xs">{year}</span>}
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold">
            {item.title}
          </h3>
          {creator && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {creator}
            </p>
          )}
        </div>
      </Link>

      {action && <div className="shrink-0 pr-0.5">{action}</div>}
    </div>
  )
}
