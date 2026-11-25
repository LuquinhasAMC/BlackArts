import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Download, ImageOff } from "lucide-react"

import { MediaTypeIcon } from "@/components/catalog/media-type-icon"
import { extractYear, formatDownloads, formatList } from "@/lib/media"
import type { ArchiveSearchItem } from "@/types/archive"

interface CatalogCardProps {
  item: ArchiveSearchItem
  /** Ação opcional no canto (ex.: remover na página de favoritos). */
  action?: ReactNode
}

/**
 * Card do catálogo: a imagem cobre o card inteiro e o rodapé tem um
 * degradê com o ícone do tipo e o título (até duas linhas). No hover o
 * degradê sobe e escurece, revelando autor e informações extras.
 */
export function CatalogCard({ item, action }: CatalogCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.thumbnail) && !imageFailed
  const creator = formatList(item.creator)
  const year = extractYear(item.year)
  const downloads = formatDownloads(item.downloads)
  const hasExtra = Boolean(creator || year || downloads)

  return (
    <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-4xl bg-muted shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10">
      <Link
        to={`/item/${item.identifier}`}
        aria-label={`Abrir ${item.title}`}
        className="absolute inset-0 z-10 flex flex-col justify-end focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {showImage ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <ImageOff
              className="size-8 text-muted-foreground/50"
              aria-hidden
            />
          </div>
        )}

        {/* Rodapé sobre degradê transparente. */}
        <div className="relative px-4 pt-12 pb-4 text-white">
          {/* Degradê base, sempre visível. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />
          {/* Camada extra que escurece o degradê no hover. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          />

          <div className="relative flex flex-col gap-1">
            {/* Tipo da obra em ícone, acima do título. */}
            <MediaTypeIcon
              mediatype={item.mediatype}
              className="w-fit text-white/80"
            />

            <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
              {item.title}
            </h3>

            {/* Autor e informações extras, revelados no hover. */}
            {hasExtra && (
              <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover:grid-rows-[1fr] group-hover:opacity-100">
                <div className="overflow-hidden">
                  {creator && (
                    <p className="line-clamp-1 pt-0.5 text-xs text-white/80">
                      {creator}
                    </p>
                  )}
                  {(year || downloads) && (
                    <div className="flex items-center gap-2 pt-0.5 text-[11px] text-white/60">
                      {year && <span>{year}</span>}
                      {downloads && (
                        <span className="flex items-center gap-1">
                          <Download className="size-3" aria-hidden />
                          {downloads}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>

      {action && <div className="absolute top-3 right-3 z-20">{action}</div>}
    </div>
  )
}
