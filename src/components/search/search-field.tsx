import { Search, X } from "lucide-react"

import {
  MEDIA_TYPE_FILTERS,
  MediaTypeFilterIcon,
  type MediaTypeFilter,
} from "@/components/favorites/media-type-filter"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchFieldProps {
  value: string
  onValueChange: (value: string) => void
  mediaType: MediaTypeFilter
  onMediaTypeChange: (value: MediaTypeFilter) => void
  /** Enter no campo (também guarda o termo no histórico). */
  onSubmit?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
}

/**
 * Barra de busca com o seletor de tipo dentro do campo — o mesmo modelo
 * usado na tela de favoritos.
 */
export function SearchField({
  value,
  onValueChange,
  mediaType,
  onMediaTypeChange,
  onSubmit,
  inputRef,
  className,
}: SearchFieldProps) {
  const clear = () => {
    onValueChange("")
    inputRef?.current?.focus()
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onSubmit?.()
          }
        }}
        placeholder="Buscar por título, artista ou autor…"
        aria-label="Buscar na curadoria"
        className={cn("h-10 pl-9", value ? "pr-[4.25rem]" : "pr-11")}
      />

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={clear}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-9 -translate-y-1/2 rounded-full text-muted-foreground"
        >
          <X aria-hidden />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Filtrar por tipo: ${
              MEDIA_TYPE_FILTERS.find((option) => option.value === mediaType)
                ?.label ?? "Todos os tipos"
            }`}
            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
          >
            <MediaTypeFilterIcon value={mediaType} className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={mediaType}
            onValueChange={(value) =>
              onMediaTypeChange(value as MediaTypeFilter)
            }
          >
            {MEDIA_TYPE_FILTERS.map(({ value: option, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {option === "all" ? (
                  <MediaTypeFilterIcon value="all" className="size-4" />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
