import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { HeartOff, Search, X } from "lucide-react"
import { toast } from "sonner"

import { CatalogEmpty } from "@/components/catalog/catalog-states"
import { CatalogGrid } from "@/components/catalog/catalog-grid"
import { CatalogList } from "@/components/catalog/catalog-list"
import {
  MEDIA_TYPE_FILTERS,
  MediaTypeFilterIcon,
  normalizeFavoriteType,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFavorites } from "@/hooks/use-favorites"
import { useFavoritesView } from "@/lib/catalog-view"
import { formatList } from "@/lib/media"
import { cn } from "@/lib/utils"
import type { ArchiveSearchItem } from "@/types/archive"

/**
 * Página de favoritos: busca por título/autor/ano, filtro por tipo de
 * mídia e alternância entre grade e lista (o modo vem da top bar).
 */
export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites()
  const view = useFavoritesView()
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all")

  const term = query.trim().toLowerCase()
  const hasFilters = term.length > 0 || typeFilter !== "all"

  const visible = useMemo(
    () =>
      favorites.filter((item) => {
        if (
          typeFilter !== "all" &&
          normalizeFavoriteType(item.mediatype) !== typeFilter
        ) {
          return false
        }
        if (!term) {
          return true
        }
        return [item.title, formatList(item.creator), item.year].some((value) =>
          (value ?? "").toLowerCase().includes(term)
        )
      }),
    [favorites, term, typeFilter]
  )

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Seus itens salvos para visitar depois.
        </p>
        <CatalogEmpty
          title="Você ainda não tem favoritos"
          description="Toque no coração de um item do catálogo para salvá-lo aqui. Eles ficam guardados neste dispositivo."
        >
          <Button asChild>
            <Link to="/">Explorar catálogo</Link>
          </Button>
        </CatalogEmpty>
      </div>
    )
  }

  const clearFilters = () => {
    setQuery("")
    setTypeFilter("all")
  }

  const cardAction = (item: ArchiveSearchItem) => (
    <RemoveFavoriteButton
      identifier={item.identifier}
      title={item.title}
      onRemove={removeFavorite}
      floating={view === "grid"}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de busca: largura total no celular, alinhada à esquerda e
          limitada em telas maiores. O filtro fica dentro do campo. */}
      <div className="w-full sm:max-w-md">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nos favoritos"
            aria-label="Buscar nos favoritos"
            className={cn("h-10 pl-9", query ? "pr-[4.25rem]" : "pr-11")}
          />

          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setQuery("")}
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
                  MEDIA_TYPE_FILTERS.find(
                    (option) => option.value === typeFilter
                  )?.label ?? "Todos os tipos"
                }`}
                className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
              >
                <MediaTypeFilterIcon value={typeFilter} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as MediaTypeFilter)
                }
              >
                {MEDIA_TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {value === "all" ? (
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
      </div>

      {visible.length === 0 ? (
        <CatalogEmpty
          title="Nenhum favorito encontrado"
          description="Tente outro termo de busca ou troque o filtro de tipo de mídia."
          hasFilters={hasFilters}
          onClear={clearFilters}
        />
      ) : view === "grid" ? (
        <CatalogGrid
          items={visible.map(toSearchItem)}
          cardAction={cardAction}
          className="grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        />
      ) : (
        <CatalogList
          items={visible.map(toSearchItem)}
          cardAction={cardAction}
        />
      )}
    </div>
  )
}

function RemoveFavoriteButton({
  identifier,
  title,
  onRemove,
  floating = false,
}: {
  identifier: string
  title: string
  onRemove: (identifier: string) => void
  /** Estilo flutuante sobre a miniatura (grade) em vez de inline (lista). */
  floating?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={
            floating
              ? "bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm hover:bg-background"
              : undefined
          }
          aria-label={`Remover ${title} dos favoritos`}
          onClick={() => {
            onRemove(identifier)
            toast("Removido dos favoritos", { description: title })
          }}
        >
          <HeartOff className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Remover dos favoritos</TooltipContent>
    </Tooltip>
  )
}

function toSearchItem(item: {
  identifier: string
  title: string
  mediatype?: string
  year?: string
  creator?: string
  thumbnail?: string
}): ArchiveSearchItem {
  return {
    identifier: item.identifier,
    title: item.title,
    mediatype: item.mediatype,
    year: item.year,
    creator: item.creator,
    thumbnail: item.thumbnail,
  }
}
