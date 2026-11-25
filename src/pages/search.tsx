import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { CatalogEmpty } from "@/components/catalog/catalog-states"
import { CatalogGrid } from "@/components/catalog/catalog-grid"
import { CatalogList } from "@/components/catalog/catalog-list"
import { ViewToggle } from "@/components/catalog/view-toggle"
import {
  MEDIA_TYPE_FILTERS,
  normalizeFavoriteType,
  type MediaTypeFilter,
} from "@/components/favorites/media-type-filter"
import { NowPlayingBar } from "@/components/layout/now-playing-bar"
import { SearchField } from "@/components/search/search-field"
import { SearchHistory } from "@/components/search/search-history"
import { useAudioPlayback } from "@/components/media/audio-playback"
import { Button } from "@/components/ui/button"
import { CURATED_ITEMS, curatedToCatalogItem, sample } from "@/data/curated"
import { useDebounce } from "@/hooks/use-debounce"
import { setSearchView, useSearchView } from "@/lib/catalog-view"
import {
  addSearchTerm,
  clearSearchHistory,
  removeSearchTerm,
  useSearchHistory,
} from "@/lib/search-history"
import { cn } from "@/lib/utils"

/** Obras sorteadas quando ainda não há uma busca feita. */
const RECOMMENDATION_COUNT = 15

const VALID_TYPES = new Set<string>(
  MEDIA_TYPE_FILTERS.map((filter) => filter.value)
)

/**
 * Tela de pesquisa dedicada (rota /search). Barra com filtro de tipo e
 * histórico do lado esquerdo; resultados (ou recomendações aleatórias)
 * do lado direito. Em telas grandes cada coluna rola por conta própria;
 * no celular a barra de busca fica fixa no topo enquanto o conteúdo rola.
 */
export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Mini player de áudio (esta tela não tem a barra de navegação).
  const { active: audioActive } = useAudioPlayback()
  const view = useSearchView()
  const history = useSearchHistory()

  const q = searchParams.get("q") ?? ""
  const typeParam = searchParams.get("type") ?? "all"
  const mediaType: MediaTypeFilter = VALID_TYPES.has(typeParam)
    ? (typeParam as MediaTypeFilter)
    : "all"

  // Campo de busca com debounce; o texto digitado filtra ao vivo.
  const [searchInput, setSearchInput] = useState(q)
  const debouncedQ = useDebounce(searchInput, 500)
  const [historyOpen, setHistoryOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // A URL acompanha o texto da busca, para voltar/avançar manter o termo.
  useEffect(() => {
    const term = debouncedQ.trim()
    setSearchParams(
      (prev) => {
        if ((prev.get("q") ?? "") === term) {
          return prev
        }
        const next = new URLSearchParams(prev)
        if (term) {
          next.set("q", term)
        } else {
          next.delete("q")
        }
        return next
      },
      { replace: true }
    )
  }, [debouncedQ, setSearchParams])

  const handleBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const handleTypeChange = useCallback(
    (value: MediaTypeFilter) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === "all") {
            next.delete("type")
          } else {
            next.set("type", value)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const allItems = useMemo(() => CURATED_ITEMS.map(curatedToCatalogItem), [])

  // Sorteio guardado na montagem: o filtro de tipo não interfere nele.
  const [recommendations] = useState(() =>
    sample(allItems, RECOMMENDATION_COUNT)
  )

  const term = debouncedQ.trim().toLowerCase()
  const searching = term.length > 0

  const results = useMemo(() => {
    if (!searching) {
      return []
    }
    return allItems.filter((item) => {
      if (
        mediaType !== "all" &&
        normalizeFavoriteType(item.mediatype) !== mediaType
      ) {
        return false
      }
      const haystack =
        `${item.title} ${item.identifier} ${item.creator ?? ""}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [allItems, mediaType, searching, term])

  const clearFilters = () => {
    setSearchInput("")
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("q")
        next.delete("type")
        return next
      },
      { replace: true }
    )
  }

  const submitSearch = () => {
    addSearchTerm(searchInput)
    setHistoryOpen(false)
    inputRef.current?.blur()
  }

  const selectTerm = (value: string) => {
    setSearchInput(value)
    addSearchTerm(value)
    setHistoryOpen(false)
    inputRef.current?.blur()
  }

  const historyProps = {
    terms: history,
    onSelect: selectTerm,
    onRemove: removeSearchTerm,
    onClear: clearSearchHistory,
  }

  const items = searching ? results : recommendations

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Top bar: voltar, título e alternância grade/lista. */}
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
          <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
            Buscar obras
          </h1>
          <ViewToggle value={view} onChange={setSearchView} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent"
        />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div
          className={cn(
            "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-4 sm:px-6 lg:grid lg:h-full lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-stretch lg:gap-8 lg:pt-6 lg:pb-0",
            audioActive
              ? "pb-[calc(7rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]"
              : "pb-10"
          )}
        >
          {/* Coluna esquerda: busca e histórico, com rolagem própria. */}
          <div className="contents lg:flex lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-col lg:gap-4 lg:overflow-hidden">
            <div
              className="sticky top-0 z-20 -mx-4 bg-background px-4 pt-1 pb-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:shrink-0 lg:p-0"
              onFocusCapture={() => setHistoryOpen(true)}
              onBlurCapture={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setHistoryOpen(false)
                }
              }}
            >
              <SearchField
                value={searchInput}
                onValueChange={setSearchInput}
                mediaType={mediaType}
                onMediaTypeChange={handleTypeChange}
                onSubmit={submitSearch}
                inputRef={inputRef}
              />

              {/* No celular o histórico só aparece com o campo em foco. */}
              {historyOpen && history.length > 0 && (
                <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 flex max-h-[60vh] flex-col rounded-3xl border bg-popover p-2 shadow-lg lg:hidden">
                  <SearchHistory {...historyProps} />
                </div>
              )}
            </div>

            <SearchHistory
              {...historyProps}
              className="hidden lg:flex lg:min-h-0 lg:flex-1"
            />
          </div>

          {/* Coluna direita: resultados ou recomendações, com rolagem própria. */}
          <div
            className={cn(
              "flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1",
              audioActive
                ? "lg:pb-[calc(5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]"
                : "lg:pb-6"
            )}
          >
            <h2 className="text-sm font-semibold">
              {searching
                ? `Resultados para “${debouncedQ.trim()}”`
                : "Recomendações"}
            </h2>

            {searching && items.length === 0 ? (
              <CatalogEmpty
                title="Nenhuma obra encontrada"
                description="A curadoria não tem obras com esses filtros. Tente outro termo ou remova os filtros aplicados."
                hasFilters
                onClear={clearFilters}
              />
            ) : view === "grid" ? (
              <CatalogGrid
                items={items}
                className="grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-3"
              />
            ) : (
              <CatalogList items={items} />
            )}
          </div>
        </div>
      </main>

      {/* Mini player de áudio, flutuando na base da tela. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:p-4 sm:pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
        <NowPlayingBar variant="floating" />
      </div>
    </div>
  )
}
