import { useState } from "react"
import { AudioLines } from "lucide-react"

import { buildThumbnailUrl } from "@/lib/archive-api"
import type { ArchiveFile } from "@/types/archive"

interface AudioViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
}

/**
 * Área central do player de áudio: exibe a capa/arte do item.
 * Os controles de reprodução ficam na bottom bar flutuante.
 */
export function AudioViewer({ identifier }: AudioViewerProps) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const thumbnail = buildThumbnailUrl(identifier)

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-4xl bg-muted ring-1 ring-border">
        {thumbFailed ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/50">
            <AudioLines
              className="size-16 text-muted-foreground/40"
              aria-hidden
            />
          </div>
        ) : (
          <img
            src={thumbnail}
            alt="Capa do item de áudio"
            loading="lazy"
            onError={() => setThumbFailed(true)}
            className="size-full object-cover"
          />
        )}
      </div>
    </div>
  )
}
