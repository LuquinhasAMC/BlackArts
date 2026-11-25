import {
  AudioLines,
  BookOpen,
  Clapperboard,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react"

/** Opções do filtro por tipo de mídia. */
export type MediaTypeFilter = "all" | "audio" | "video" | "image" | "text"

/** Tipo normalizado de um favorito, incluindo os não reconhecidos. */
export type FavoriteMediaType = Exclude<MediaTypeFilter, "all"> | "other"

export const MEDIA_TYPE_FILTERS: {
  value: MediaTypeFilter
  label: string
  icon: LucideIcon
}[] = [
  { value: "all", label: "Todos os tipos", icon: AudioLines },
  { value: "audio", label: "Áudio", icon: AudioLines },
  { value: "video", label: "Vídeo", icon: Clapperboard },
  { value: "image", label: "Imagem", icon: ImageIcon },
  { value: "text", label: "Texto", icon: BookOpen },
]

/** Normaliza o mediatype do Internet Archive nas opções do filtro. */
export function normalizeFavoriteType(
  mediatype: string | undefined
): FavoriteMediaType {
  switch (mediatype) {
    case "audio":
    case "etree":
      return "audio"
    case "movies":
    case "video":
      return "video"
    case "image":
      return "image"
    case "texts":
    case "text":
      return "text"
    default:
      return "other"
  }
}

/**
 * Ícone de "todos os tipos": formas geométricas diferentes para indicar
 * a multiplicidade de mídias.
 */
export function AllMediaTypesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="7" cy="7" r="2.9" />
      <rect x="14.2" y="4.1" width="5.8" height="5.8" rx="1.5" />
      <path d="M7 13.5 10.6 19.9H3.4Z" />
      <path d="M17 13.5 20.5 17 17 20.5 13.5 17Z" />
    </svg>
  )
}

/** Ícone do tipo selecionado no filtro (só o ícone, sem texto). */
export function MediaTypeFilterIcon({
  value,
  className,
}: {
  value: MediaTypeFilter
  className?: string
}) {
  if (value === "all") {
    return <AllMediaTypesIcon className={className} />
  }
  const Icon =
    MEDIA_TYPE_FILTERS.find((option) => option.value === value)?.icon ??
    AudioLines
  return <Icon className={className} aria-hidden />
}
