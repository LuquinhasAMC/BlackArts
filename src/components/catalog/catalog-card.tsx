import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Download, ImageOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { FavoriteButton } from "@/components/favorites/favorite-button"
import {
  extractYear,
  formatDownloads,
  formatList,
  mediaTypeLabel,
} from "@/lib/media"
import type { ArchiveSearchItem } from "@/types/archive"

interface CatalogCardProps {
  item: ArchiveSearchItem
  /** Ação opcional no canto (ex.: remover na página de favoritos). */
  action?: ReactNode
}

/** Card do catálogo: thumbnail, título, tipo, ano, criador e favorito. */
export function CatalogCard({ item, action }: CatalogCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.thumbnail) && !imageFailed
  const creator = formatList(item.creator)
  const year = extractYear(item.year)
  const downloads = formatDownloads(item.downloads)

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-4xl bg-card text-card-foreground shadow-md ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:ring-foreground/10">
      <Link
        to={`/item/${item.identifier}`}
        aria-label={`Abrir ${item.title}`}
        className="flex min-w-0 flex-1 flex-col focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {showImage ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <ImageOff
                className="size-8 text-muted-foreground/50"
                aria-hidden
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <Badge variant="secondary" className="w-fit">
            {mediaTypeLabel(item.mediatype)}
          </Badge>
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">
            {item.title}
          </h3>
          {creator && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {creator}
            </p>
          )}
          {(year || downloads) && (
            <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-xs text-muted-foreground">
              {year ? <span>{year}</span> : <span aria-hidden />}
              {downloads && (
                <span className="flex items-center gap-1">
                  <Download className="size-3" aria-hidden />
                  {downloads}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="absolute top-3 right-3 z-10">
        {action ?? (
          <FavoriteButton item={item} variant="overlay" size="icon-sm" />
        )}
      </div>
    </div>
  )
}
