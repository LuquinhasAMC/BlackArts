import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Play } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MediaTypeIcon } from "@/components/catalog/media-type-icon"
import { FavoriteButton } from "@/components/favorites/favorite-button"
import { ScrollRow } from "@/components/home/scroll-row"
import { ARCHIVE } from "@/config/archive"
import {
  buildThumbnailUrl,
  firstString,
  getItemDetails,
} from "@/lib/archive-api"
import { htmlToText } from "@/lib/html"
import { formatList } from "@/lib/media"
import { cn } from "@/lib/utils"
import { curatedToCatalogItem, type CuratedItem } from "@/data/curated"

/** Tempo que cada obra fica em destaque antes de dar lugar à próxima. */
const ROTATE_MS = 10_000

interface FeaturedHeroProps {
  /** Obras da barra "Descubra algo novo", exibidas em destaque no rodízio. */
  discover: CuratedItem[]
}

/** Elementos cuja interação própria não deve alternar a revelação. */
const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, [role='button']"

/**
 * Card de destaque solto na página (com margens e cantos arredondados).
 * O título "Descubra algo novo" fica no topo esquerdo e a barra com as
 * obras ocupa a parte inferior, dentro do card: cada obra da barra vira o
 * destaque ao ser tocada e o rodízio troca sozinho a cada 10s. O item
 * ativo recebe uma borda branca.
 *
 * A área de conteúdo tem altura fixa (a mesma de antes da barra existir);
 * a faixa da barra é somada por baixo, com fundo que se mistura ao degradê
 * do card. Como a altura é fixa, a revelação da descrição no hover não
 * redimensiona nem reflui o card.
 */
export function FeaturedHero({ discover }: FeaturedHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const [canHover, setCanHover] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false
  )

  const count = discover.length
  const item = discover[count > 0 ? activeIndex % count : 0]
  const catalogItem = item ? curatedToCatalogItem(item) : null
  const itemId = item?.id ?? ""
  const thumbnail = itemId ? buildThumbnailUrl(itemId) : ""

  // Imagem da frente e a anterior (mantida por baixo durante a troca) para
  // o destaque trocar com um fade em vez de piscar.
  const [image, setImage] = useState({
    id: itemId,
    src: thumbnail,
    prevSrc: null as string | null,
  })
  if (itemId && image.id !== itemId) {
    setImage({ id: itemId, src: thumbnail, prevSrc: image.src })
  }

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setCanHover(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  // Em telas de toque a revelação é aberta/fechada pelo clique; clicar
  // fora, pressionar Esc ou perder o foco fecha como antes.
  useEffect(() => {
    if (!revealed) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        setRevealed(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRevealed(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [revealed])

  // Rodízio automático; escolher uma obra na barra reinicia a contagem.
  useEffect(() => {
    if (count < 2) {
      return
    }
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % count)
    }, ROTATE_MS)
    return () => window.clearTimeout(timer)
  }, [activeIndex, count])

  // Mantém a obra em destaque visível na barra.
  useEffect(() => {
    const strip = cardRef.current?.querySelector<HTMLElement>(
      "[data-scroll-container]"
    )
    const current = strip?.querySelector<HTMLElement>('[data-active="true"]')
    if (!strip || !current) {
      return
    }
    const left =
      current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" })
  }, [activeIndex])

  const { data } = useQuery({
    queryKey: ["archive", "item", itemId],
    queryFn: ({ signal }) => getItemDetails(itemId, signal),
    staleTime: ARCHIVE.staleTimeMs,
    enabled: Boolean(itemId),
  })

  if (!item || !catalogItem) {
    return null
  }

  const title = item.title ?? item.id
  const creator = formatList(item.creator)
  const description = htmlToText(firstString(data?.metadata?.description))
  const tags = item.tags ?? []
  const hasReveal = Boolean(description) || tags.length > 0

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Em dispositivos com hover, a revelação é controlada pelo ponteiro.
    if (canHover) {
      return
    }
    const target = event.target as HTMLElement
    if (target.closest(INTERACTIVE_SELECTOR)) {
      return
    }
    setRevealed((current) => !current)
  }

  return (
    <section
      ref={cardRef}
      data-featured-hero
      data-revealed={revealed || undefined}
      aria-label="Obra em destaque"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setRevealed(false)
        }
      }}
      className={cn(
        "group relative -mt-4 flex flex-col overflow-hidden rounded-4xl bg-muted shadow-2xl ring-1 ring-white/15 sm:-mt-5",
        revealed && "is-revealed"
      )}
    >
      {/* Imagem de fundo cobrindo o card inteiro (inclusive a faixa). A
          anterior fica por baixo e some enquanto a nova aparece. */}
      {image.prevSrc && (
        <img
          key={image.prevSrc}
          src={image.prevSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full animate-out object-cover duration-500 fade-out-0"
        />
      )}
      <img
        key={image.id}
        src={image.src}
        alt=""
        aria-hidden
        loading="eager"
        className={cn(
          "absolute inset-0 size-full object-cover",
          image.prevSrc && "animate-in duration-500 fade-in-0"
        )}
        onError={(event) => {
          event.currentTarget.style.display = "none"
        }}
      />
      {/* Gradiente para garantir leitura do texto sobre a imagem. */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />

      {/* Área de conteúdo com a altura original do card. Hover/clique da
          revelação só atuam aqui, acima da barra de obras. */}
      <div
        className="group/content relative flex h-[calc(60svh+1.5rem)] min-h-[26rem] flex-col justify-between sm:h-[calc(60svh+2rem)]"
        onClick={handleContentClick}
      >
        {/* Intensificação do degradê (parte da animação): entra no hover/foco
            desta área e na revelação por toque. Vai além da altura do
            conteúdo e é cortada pela borda do card, então não cria recorte
            no encontro com a barra de obras. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -bottom-40 bg-gradient-to-t from-background via-background/85 to-background/30 opacity-0 transition-opacity duration-300 ease-out group-focus-within/content:opacity-100 group-hover/content:opacity-100 group-[.is-revealed]:opacity-100"
        />
        {/* Título da barra no topo esquerdo do card. */}
        <div className="relative p-5 pb-0 sm:p-8 sm:pb-0">
          <h2 className="text-sm font-bold tracking-tight text-white drop-shadow-md">
            Descubra algo novo
          </h2>
        </div>

        <div className="relative flex flex-col gap-3 p-5 pt-0 sm:p-8 sm:pt-0">
          {/* Informações da obra: entram suavemente a cada troca de destaque. */}
          <div
            key={itemId}
            className="flex animate-in flex-col gap-3 duration-300 fade-in-0 slide-in-from-bottom-1"
          >
            {/* Tipo da obra em ícone, como nos cards do catálogo. */}
            <MediaTypeIcon
              mediatype={catalogItem.mediatype}
              className="w-fit text-white/80"
            />

            {/* O encolhimento usa `scale` (e não font-size) para o texto não
              se reajustar linha a linha durante a animação. */}
            <h3 className="line-clamp-2 max-w-2xl origin-bottom-left text-3xl leading-tight font-bold tracking-tight transition-transform duration-300 ease-out group-hover/content:scale-90 group-[.is-revealed]:scale-90 sm:text-5xl">
              {title}
            </h3>

            {creator && (
              <p className="text-sm font-medium text-muted-foreground sm:text-base">
                {creator}
              </p>
            )}

            {/* Revelado no hover (desktop) ou no toque (mobile). A altura do
              card é fixa, então a abertura não redimensiona o card; a
              animação usa apenas max-height/opacidade. */}
            {hasReveal && (
              <div className="max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-300 ease-out group-focus-within/content:max-h-40 group-focus-within/content:opacity-100 group-hover/content:max-h-40 group-hover/content:opacity-100 group-[.is-revealed]:max-h-40 group-[.is-revealed]:opacity-100">
                {description && (
                  <p className="line-clamp-3 max-w-md text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="ghost">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button asChild size="lg" className="gap-2">
              <Link to={`/item/${item.id}`}>
                <Play aria-hidden />
                Abrir obra
              </Link>
            </Button>
            <FavoriteButton
              item={catalogItem}
              variant="outline"
              size="icon"
              className="size-10"
            />
          </div>
        </div>
      </div>

      {/* Faixa da barra: somada abaixo da área original. Sem fundo próprio,
          para o degradê do card continuar por trás das obras. */}
      <div className="relative px-2 pt-6 pb-3 sm:px-3 sm:pb-4">
        <ScrollRow ariaLabel="Descubra algo novo" gap={10} className="gap-2.5">
          {discover.map((discoverItem, index) => (
            <DiscoverCard
              key={discoverItem.id}
              item={discoverItem}
              active={index === activeIndex % count}
              onSelect={() => setActiveIndex(index)}
            />
          ))}
        </ScrollRow>
      </div>
    </section>
  )
}

/**
 * Card compacto de uma obra da seleção: só a imagem, com o ícone do tipo
 * no canto superior esquerdo. Ao tocar, a obra passa a ser o destaque do
 * card (não abre a obra). O item ativo ganha uma borda branca.
 */
function DiscoverCard({
  item,
  active,
  onSelect,
}: {
  item: CuratedItem
  active: boolean
  onSelect: () => void
}) {
  const catalogItem = curatedToCatalogItem(item)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Destacar ${catalogItem.title}`}
      aria-pressed={active}
      data-active={active || undefined}
      className={cn(
        "group relative aspect-[4/3] w-24 shrink-0 snap-start overflow-hidden rounded-3xl bg-muted shadow-lg ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-32",
        active && "ring-2 ring-white"
      )}
    >
      <img
        src={catalogItem.thumbnail}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-110 group-focus:scale-110 group-active:scale-110"
        onError={(event) => {
          event.currentTarget.style.display = "none"
        }}
      />
      <span className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur">
        <MediaTypeIcon mediatype={catalogItem.mediatype} />
      </span>
    </button>
  )
}
