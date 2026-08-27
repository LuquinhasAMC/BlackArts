import { useCallback, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react"

import { CatalogEmpty } from "@/components/catalog/catalog-states"
import { CatalogGrid } from "@/components/catalog/catalog-grid"
import { SearchToolbar } from "@/components/catalog/search-toolbar"
import { Button } from "@/components/ui/button"
import { ARCHIVE, MEDIA_TYPE_FILTERS } from "@/config/archive"
import type { MediaTypeFilterValue } from "@/config/archive"
import { CURATED_ITEMS, curatedToCatalogItem } from "@/data/curated"
import { useDebounce } from "@/hooks/use-debounce"

const VALID_TYPES = new Set<string>(
  MEDIA_TYPE_FILTERS.map((filter) => filter.value)
)

/**
 * Tela de pesquisa dedicada (rota /search): busca dentro da curadoria,
 * filtro por tipo de mídia e paginação. Tem header próprio com botão de
 * voltar e não exibe a bottom bar de navegação — como a tela do player.
 */
export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const q = searchParams.get("q") ?? ""
  const typeParam = searchParams.get("type") ?? "all"
  const mediaType: MediaTypeFilterValue = VALID_TYPES.has(typeParam)
    ? (typeParam as MediaTypeFilterValue)
    : "all"
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  // Campo de busca com debounce; a URL é a fonte de verdade.
  const [searchInput, setSearchInput] = useState(q)
  const debouncedQ = useDebounce(searchInput, 500)

  const handleBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const updateParam = useCallback(
    (key: string, value: string | null, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
          if (resetPage) {
            next.set("page", "1")
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const allItems = useMemo(() => CURATED_ITEMS.map(curatedToCatalogItem), [])

  const mediatype = MEDIA_TYPE_FILTERS.find(
    (filter) => filter.value === mediaType
  )?.mediatype

  const query = debouncedQ.trim().toLowerCase()
  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (mediatype && item.mediatype !== mediatype) {
        return false
      }
      if (query) {
        const haystack =
          `${item.title} ${item.identifier} ${item.creator ?? ""}`.toLowerCase()
        if (!haystack.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [allItems, mediatype, query])

  const pageSize = ARCHIVE.pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Header da pesquisa: voltar + título. */}
      <header className="relative shrink-0 bg-background pt-safe">
        <div className="flex h-14 items-center gap-2 px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Voltar"
          >
            <ArrowLeft aria-hidden />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="truncate text-base font-bold tracking-tight">
              Buscar obras
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "obra" : "obras"} na
              curadoria
            </p>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent"
        />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10">
          <div className="flex flex-col gap-5">
            <SearchToolbar
              query={searchInput}
              onQueryChange={setSearchInput}
              mediaType={mediaType}
              onMediaTypeChange={(value) =>
                updateParam("type", value === "all" ? null : value)
              }
              resultCount={filtered.length}
              onClear={clearFilters}
            />

            {filtered.length === 0 ? (
              <CatalogEmpty
                title="Nenhuma obra encontrada"
                description="A curadoria não tem obras com esses filtros. Tente outro termo ou remova os filtros aplicados."
              />
            ) : (
              <>
                <CatalogGrid items={pageItems} />

                <nav
                  className="flex flex-wrap items-center justify-between gap-3 pt-2"
                  aria-label="Paginação do catálogo"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() =>
                      updateParam("page", String(safePage - 1), false)
                    }
                  >
                    <ChevronLeft aria-hidden />
                    Anterior
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Página {safePage} de {totalPages} · {filtered.length}{" "}
                    {filtered.length === 1 ? "obra" : "obras"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      updateParam("page", String(safePage + 1), false)
                    }
                  >
                    Próxima
                    <ChevronRight aria-hidden />
                  </Button>
                </nav>

                <Button variant="ghost" size="sm" asChild className="w-fit">
                  <Link
                    to="/"
                    onClick={() => setSearchParams(new URLSearchParams())}
                  >
                    <Search aria-hidden />
                    Voltar à tela inicial
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
