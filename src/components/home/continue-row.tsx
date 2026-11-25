import { Link } from "react-router-dom"
import { ImageOff, X } from "lucide-react"

import { MediaTypeIcon } from "@/components/catalog/media-type-icon"
import { ScrollRow } from "@/components/home/scroll-row"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCheckpoints } from "@/hooks/use-checkpoints"
import { checkpointProgress, removeCheckpoint } from "@/lib/checkpoints"

/**
 * Fileira "Continuar de onde parou": as últimas obras abertas, com o
 * progresso salvo em cada uma (página, foto, minutagem ou faixa).
 */
export function ContinueRow() {
  const checkpoints = useCheckpoints()

  if (checkpoints.length === 0) {
    return null
  }

  return (
    <section
      className="flex flex-col gap-3"
      aria-label="Continuar de onde parou"
    >
      <h2 className="px-1 text-lg font-bold tracking-tight sm:text-xl">
        Continuar de onde parou
      </h2>

      <ScrollRow
        ariaLabel="Continuar de onde parou"
        gap={12}
        className="gap-3 pb-2"
      >
        {checkpoints.map((entry) => {
          const progress = checkpointProgress(entry)
          return (
            <div
              key={entry.identifier}
              className="group relative w-40 shrink-0 snap-start sm:w-48 lg:w-52"
            >
              <Link
                to={`/item/${entry.identifier}`}
                aria-label={`Continuar ${entry.title}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-4xl bg-muted shadow-md ring-1 ring-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:ring-foreground/10"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground/50"
                >
                  <ImageOff className="size-8" />
                </div>
                <img
                  src={entry.thumbnail}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none"
                  }}
                />

                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pt-12 pb-4 text-white">
                  <div className="flex flex-col gap-1">
                    <MediaTypeIcon
                      mediatype={entry.type}
                      className="w-fit text-white/80"
                    />
                    <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
                      {entry.title}
                    </h3>
                    {progress && (
                      <p className="text-xs font-medium text-white/75 tabular-nums">
                        {progress}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Remove a obra desta fileira (não apaga favoritos nem nada
                  da obra em si). */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${entry.title} de continuar de onde parou`}
                title="Remover da lista"
                onClick={() => removeCheckpoint(entry.identifier)}
                className="absolute top-2 right-2 z-20 bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm hover:bg-background"
              >
                <X aria-hidden />
              </Button>
            </div>
          )
        })}
      </ScrollRow>

      {/* Separa esta fileira das demais do Início. */}
      <Separator className="mt-1" />
    </section>
  )
}
