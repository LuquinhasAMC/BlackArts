import { Link } from "react-router-dom"
import { Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/favorites/favorite-button"
import { buildThumbnailUrl } from "@/lib/archive-api"
import { extractYear, formatList, mediaTypeLabel } from "@/lib/media"
import { curatedToCatalogItem, type CuratedItem } from "@/data/curated"

interface FeaturedHeroProps {
  /** Obra em destaque (capa do card). */
  item: CuratedItem
  /** Seleção mágica exibida dentro do card. */
  discover: CuratedItem[]
}

/**
 * Card gigante de destaque que cobre a tela toda: obra em destaque na
 * imagem de fundo e, dentro do próprio card, a seleção "Conheça algo
 * novo" (rolagem horizontal). O padding inferior reserva espaço para a
 * bottom bar de navegação não ficar sobre o card.
 */
export function FeaturedHero({ item, discover }: FeaturedHeroProps) {
  const catalogItem = curatedToCatalogItem(item)
  const title = item.title ?? item.id
  const creator = formatList(item.creator)
  const year = extractYear(item.year)
  const thumbnail = buildThumbnailUrl(item.id)

  return (
    <section
      data-featured-hero
      aria-label="Obra em destaque"
      className="relative -mx-4 flex min-h-svh flex-col justify-end overflow-hidden rounded-none bg-muted sm:-mx-6 sm:rounded-4xl"
    >
      {/* Imagem de fundo cobrindo o card inteiro. */}
      <img
        src={thumbnail}
        alt=""
        aria-hidden
        loading="eager"
        className="absolute inset-0 size-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none"
        }}
      />
      {/* Gradiente para garantir leitura do texto sobre a imagem. */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />

      <div className="relative flex flex-col gap-6 p-5 pb-6 sm:p-8 sm:pb-8">
        {/* Informações da obra em destaque. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {mediaTypeLabel(catalogItem.mediatype)}
            </Badge>
            {year && <Badge variant="outline">{year}</Badge>}
          </div>

          <h2 className="max-w-2xl truncate text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
            {title}
          </h2>

          {creator && (
            <p className="text-sm font-medium text-muted-foreground sm:text-base">
              {creator}
            </p>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="ghost">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button asChild size="lg" className="gap-2">
              <Link to={`/item/${item.id}`}>
                <Play aria-hidden />
                Abrir obra
              </Link>
            </Button>
            <FavoriteButton
              item={catalogItem}
              variant="outline"
              size="default"
              withLabel
            />
          </div>
        </div>

        {/* Seleção mágica no fundo do card: a bottom bar de navegação
            fica sobre a borda inferior desta faixa (com a sombra do
            degradê), nunca sobre as informações da obra. */}
        <div className="flex flex-col gap-2.5 pb-1">
          <h3 className="px-1 text-sm font-bold tracking-tight">
            Conheça algo novo
          </h3>
          <div className="flex flex-nowrap gap-2.5 overflow-x-auto pb-1 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {discover.map((discoverItem) => (
              <DiscoverCard
                key={discoverItem.id}
                item={discoverItem}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Card compacto de uma obra da seleção mágica (rolagem horizontal). */
function DiscoverCard({ item }: { item: CuratedItem }) {
  const catalogItem = curatedToCatalogItem(item)

  return (
    <Link
      to={`/item/${item.id}`}
      className="group w-28 shrink-0 snap-start overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-foreground/10 transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-36"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={catalogItem.thumbnail}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.style.display = "none"
          }}
        />
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-[11px] leading-snug font-medium sm:text-xs">
          {catalogItem.title}
        </p>
      </div>
    </Link>
  )
}
