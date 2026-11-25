import {
  AudioLines,
  BookOpen,
  Clapperboard,
  FileQuestion,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react"

import { mediaTypeLabel } from "@/lib/media"

/** Ícone que representa cada tipo de obra. */
const TYPE_ICONS: Record<string, LucideIcon> = {
  audio: AudioLines,
  etree: AudioLines,
  movies: Clapperboard,
  video: Clapperboard,
  image: ImageIcon,
  texts: BookOpen,
  text: BookOpen,
}

/** Ícone do tipo de obra, com rótulo acessível. */
export function MediaTypeIcon({
  mediatype,
  className,
}: {
  mediatype?: string
  className?: string
}) {
  const Icon = TYPE_ICONS[mediatype ?? ""] ?? FileQuestion

  return (
    <span
      role="img"
      aria-label={mediaTypeLabel(mediatype)}
      className={className}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  )
}
