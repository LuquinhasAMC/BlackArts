import { AudioLines } from "lucide-react"

import { formatTime, trackLabel } from "@/components/media/audio-player"
import { formatList } from "@/lib/media"
import { cn } from "@/lib/utils"
import type { ArchiveFile } from "@/types/archive"

interface AudioPlaylistProps {
  files: ArchiveFile[]
  activeIndex: number
  creator?: string | string[]
  onSelect: (index: number) => void
  className?: string
}

/**
 * Lista de faixas de um item de áudio: mesma marcação usada no modal (telas
 * pequenas) e na coluna exposta ao lado do player (telas grandes).
 */
export function AudioPlaylist({
  files,
  activeIndex,
  creator,
  onSelect,
  className,
}: AudioPlaylistProps) {
  const creatorText = formatList(creator)

  return (
    <ul className={cn("flex flex-col", className)}>
      {files.map((file, index) => {
        const active = index === activeIndex
        const length = Number(file.length)
        return (
          <li key={file.name}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors",
                active ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <span className="flex w-5 shrink-0 items-center justify-center text-xs text-muted-foreground tabular-nums">
                {active ? (
                  <AudioLines className="size-4 text-foreground" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {trackLabel(file)}
                </span>
                {creatorText && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {creatorText}
                  </span>
                )}
              </span>
              {Number.isFinite(length) && length > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatTime(length)}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
