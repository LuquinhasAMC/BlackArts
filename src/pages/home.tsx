import { useState } from "react"
import { Navigate, useSearchParams } from "react-router-dom"

import { ContentRow } from "@/components/home/content-row"
import { FeaturedHero } from "@/components/home/featured-hero"
import {
  CURATED_ITEMS,
  CURATED_ROWS,
  itemsForRow,
  sample,
  shuffle,
} from "@/data/curated"

/** Quantidade de fileiras exibidas na tela inicial. */
const FEED_ROW_COUNT = 10

/** Quantidade de obras por tipo na seção "Conheça algo novo". */
const DISCOVER_PER_TYPE = 4

/**
 * Tela inicial no estilo app: obra em destaque cobrindo a tela, uma
 * seleção mágica ("Conheça algo novo") e 10 fileiras aleatórias de
 * conteúdo. A busca/filtros vivem na rota dedicada /search.
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

/** Tela inicial padrão: destaque + seleção mágica + fileiras. */
function Feed() {
  // Sorteios calculados uma única vez por visita (estado inicial).
  const [featured] = useState(() => sample(CURATED_ITEMS, 1)[0])
  const [discover] = useState(() => {
    const types = ["audio", "video", "image", "text"] as const
    const perType = types.flatMap((type) =>
      sample(
        CURATED_ITEMS.filter((item) => item.type === type),
        DISCOVER_PER_TYPE
      )
    )
    return shuffle(perType)
  })
  const [rows] = useState(() => {
    // Só fileiras com pelo menos uma obra, em ordem aleatória.
    const withItems = CURATED_ROWS.filter((row) => itemsForRow(row).length > 0)
    return sample(withItems, FEED_ROW_COUNT).map((row) => ({
      row,
      items: shuffle(itemsForRow(row)),
    }))
  })

  if (!featured) {
    return null
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Card gigante de destaque com a seleção mágica embutida. Ele sobe
          sob o header transparente para começar no topo da tela. */}
      <div className="-mt-20 sm:-mt-[5.5rem]">
        <FeaturedHero item={featured} discover={discover} />
      </div>

      {rows.map(({ row, items }) => (
        <ContentRow key={row.id} title={row.title} items={items} />
      ))}

      <p className="px-1 text-xs text-muted-foreground">
        As obras e fileiras mudam a cada visita. Toque em uma obra para abrir o
        player.
      </p>
    </div>
  )
}
