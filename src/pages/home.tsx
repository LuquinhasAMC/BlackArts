import { useState } from "react"
import { Navigate, useSearchParams } from "react-router-dom"
import { RefreshCw } from "lucide-react"

import { CatalogError } from "@/components/catalog/catalog-states"
import { ContentRow } from "@/components/home/content-row"
import { ContinueRow } from "@/components/home/continue-row"
import { FeaturedHero } from "@/components/home/featured-hero"
import { PageLoader } from "@/components/layout/page-loader"
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import {
  itemsForRow,
  sample,
  shuffle,
  useCuratedCatalog,
  type CuratedCatalog,
  type CuratedItem,
} from "@/data/curated"
import { cn } from "@/lib/utils"

/** Quantidade de fileiras exibidas na tela inicial. */
const FEED_ROW_COUNT = 10

/** Quantidade de obras por tipo na seção "Conheça algo novo". */
const DISCOVER_PER_TYPE = 4

/**
 * Tela inicial no estilo app: card de destaque com a barra "Descubra algo
 * novo" e 10 fileiras aleatórias de conteúdo. A busca/filtros vivem na
 * rota dedicada /search.
 */
export default function HomePage() {
  const [searchParams] = useSearchParams()

  // Compatibilidade com URLs antigas (?q=...): leva para a tela de
  // pesquisa dedicada mantendo os parâmetros.
  if (searchParams.has("q") || searchParams.has("type")) {
    return <Navigate to={`/search?${searchParams.toString()}`} replace />
  }

  return <Feed />
}

/** Sorteio da tela inicial, guardado enquanto o app estiver aberto: voltar
 *  para o Início (de Favoritos, da pesquisa ou de uma obra) mantém as
 *  mesmas fileiras em vez de sortear tudo de novo. */
function buildFeed(catalog: CuratedCatalog) {
  const types = ["audio", "video", "image", "text"] as const
  const perType = types.flatMap((type) =>
    sample(
      catalog.items.filter((item) => item.type === type),
      DISCOVER_PER_TYPE
    )
  )
  const withItems = catalog.rows.filter(
    (row) => itemsForRow(row, catalog.items).length > 0
  )
  return {
    discover: shuffle(perType),
    rows: sample(withItems, FEED_ROW_COUNT).map((row) => ({
      row,
      items: shuffle(itemsForRow(row, catalog.items)),
    })),
  }
}

type FeedSnapshot = ReturnType<typeof buildFeed>

let feedSnapshot: FeedSnapshot | null = null
let feedSnapshotSource: CuratedItem[] | null = null

/** Sorteio guardado: reaproveita o snapshot enquanto o catálogo for o
 *  mesmo (o TanStack Query mantém a identidade dos dados em cache). */
function takeFeed(
  catalog?: CuratedCatalog | null,
  { fresh = false }: { fresh?: boolean } = {}
): FeedSnapshot | null {
  if (!catalog) {
    return null
  }
  if (!fresh && feedSnapshot && feedSnapshotSource === catalog.items) {
    return feedSnapshot
  }
  feedSnapshot = buildFeed(catalog)
  feedSnapshotSource = catalog.items
  return feedSnapshot
}

/** Tela inicial padrão: destaque + fileiras. */
function Feed() {
  // Entrar na tela inicial também confere no repositório (uma requisição)
  // se o conteúdo mudou; a cópia local vem do IndexedDB.
  const { catalog, isPending, isError, retry, refresh } = useCuratedCatalog({
    checkUpdates: true,
  })
  // Sorteio local (também usado depois do "puxar para atualizar", que
  // embaralha de novo). Reaproveita o cache do módulo enquanto o
  // catálogo for o mesmo.
  const [feed, setFeed] = useState<{
    source: CuratedItem[]
    value: FeedSnapshot
  } | null>(() => {
    const value = takeFeed(catalog)
    return catalog && value ? { source: catalog.items, value } : null
  })

  const currentFeed =
    catalog && feed?.source === catalog.items ? feed.value : takeFeed(catalog)

  // Puxar para baixo no topo sorteia a tela de novo (sem recarregar a página).
  const { pull, refreshing, dragging } = usePullToRefresh(
    () =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          void (async () => {
            const nextCatalog = await refresh()
            if (nextCatalog) {
              const next = takeFeed(nextCatalog, { fresh: true })
              if (next) {
                setFeed({ source: nextCatalog.items, value: next })
              }
            }
            resolve()
          })()
        }, 350)
      })
  )

  if (!catalog) {
    return isError || !isPending ? (
      <div className="pt-6">
        <CatalogError onRetry={() => void retry()} />
      </div>
    ) : (
      <PageLoader />
    )
  }

  if (!currentFeed) {
    return (
      <div className="pt-6">
        <CatalogError onRetry={() => void retry()} />
      </div>
    )
  }

  const { discover, rows } = currentFeed

  if (discover.length === 0) {
    return isError ? (
      <div className="pt-6">
        <CatalogError onRetry={() => void retry()} />
      </div>
    ) : null
  }

  return (
    <div className="relative">
      {/* Bolinha de recarregar, que desce junto com a puxada. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{
          transform: `translateY(${pull - 40}px)`,
          opacity: Math.min(1, pull / 56),
        }}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-card shadow-md ring-1 ring-border">
          <RefreshCw
            className={cn(
              "size-4 text-muted-foreground",
              refreshing && "animate-spin"
            )}
            style={
              refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }
            }
          />
        </span>
      </div>

      <div
        className="flex flex-col gap-8"
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: dragging ? "none" : "transform 240ms ease-out",
        }}
      >
        {/* Card de destaque com a barra de obras na parte inferior. */}
        <FeaturedHero discover={discover} />

        <ContinueRow />

        {rows.map(({ row, items }) => (
          <ContentRow key={row.id} title={row.title} items={items} />
        ))}

        <p className="px-1 text-center text-xs text-muted-foreground">
          BlackArts v{__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}
