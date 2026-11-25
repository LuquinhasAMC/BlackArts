import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import {
  AlignLeft,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Heart,
  Link2,
  ListMusic,
  Maximize2,
  MoreHorizontal,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { PdfPageStrip } from "@/components/media/pdf-page-strip"
import {
  FavoriteButton,
  type FavoriteTarget,
} from "@/components/favorites/favorite-button"
import { useFavorites } from "@/hooks/use-favorites"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import {
  imageFilesByPreference,
  type MediaType,
  type TextSourceMode,
} from "@/lib/media"
import { edgeFadeMask } from "@/lib/edge-fade"
import { buildItemShareUrl, copyToClipboard } from "@/lib/share"
import { smoothScrollBy, smoothScrollTo } from "@/lib/smooth-scroll"
import { cn } from "@/lib/utils"
import type { ArchiveFile } from "@/types/archive"

interface PlayerBottomBarProps {
  type: MediaType
  identifier: string
  title: string
  files?: ArchiveFile[]
  mediatype?: string
  /** Abre a descrição em um modal (tipos que não exibem descrição inline). */
  onOpenDescription?: () => void
  /** Controles de zoom (imagens). */
  zoom?: number
  onZoomChange?: (zoom: number) => void
  /** Modo e conteúdo do texto (documentos). */
  textMode?: TextSourceMode
  textContent?: string | null
  textLoading?: boolean
  textScrollRef?: RefObject<HTMLDivElement | null>
  /** Abre o visualizador (PDF) em toda a tela do app. */
  onOpenFullscreen?: () => void
  /** Paginação do PDF (seletor de páginas na barra inferior). */
  pdfPage?: number
  pdfPageCount?: number
  pdfPageAspect?: number
  /** Documento carregado pelo visualizador, usado nas miniaturas. */
  pdfDocument?: PDFDocumentProxy | null
  onPdfPageSelect?: (page: number) => void
  /** Estilo claro para sobreposição escura (galeria de imagens). */
  overlay?: boolean
  /** Imagem selecionada (itens com mais de uma imagem). */
  imageIndex?: number
  onImageIndexChange?: (index: number) => void
  /** Abre a lista de reprodução em um modal (áudio). */
  onOpenPlaylist?: () => void
  favoriteTarget: FavoriteTarget
}

/**
 * Barra de controles de cada player. Cada tipo de mídia tem a sua
 * própria barra — não há mais um padrão único compartilhado.
 */
export function PlayerBottomBar(props: PlayerBottomBarProps) {
  switch (props.type) {
    case "video":
      return <ActionsBar {...props} />
    case "audio":
      return <ActionsBar {...props} centered withMenu withPlaylist />
    case "image":
      return <ImageBar {...props} />
    case "text":
      return <TextBar {...props} />
    default:
      return <GenericBar {...props} />
  }
}

/**
 * Ação em formato de pílula: ícone sobre um fundo arredondado e o
 * rótulo logo abaixo. Usada na barra do player de vídeo.
 */
const PILL_ACTION_CLASS =
  "group flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-3xl py-1 text-center outline-none"
const PILL_ICON_CLASS =
  "flex h-11 w-14 items-center justify-center rounded-full bg-muted ring-1 ring-border transition-colors group-hover:bg-accent group-hover:text-accent-foreground group-focus-visible:ring-3 group-focus-visible:ring-ring/30 [&_svg]:size-5"
const PILL_LABEL_CLASS =
  "w-full truncate text-[11px] leading-tight font-medium text-muted-foreground transition-colors group-hover:text-foreground"

function PillAction({
  icon,
  label,
  onClick,
  href,
  className,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  href?: string
  className?: string
}) {
  const content = (
    <>
      <span className={PILL_ICON_CLASS}>{icon}</span>
      <span className={PILL_LABEL_CLASS}>{label}</span>
    </>
  )
  const classes = cn(PILL_ACTION_CLASS, className)

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  )
}

/** Menu "mais opções" no formato de pílula (player de áudio). */
function PillMenu({
  detailsUrl,
  onCopyLink,
}: {
  detailsUrl: string
  onCopyLink: () => Promise<void>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={PILL_ACTION_CLASS}
          aria-label="Mais opções"
        >
          <span className={PILL_ICON_CLASS}>
            <MoreHorizontal aria-hidden />
          </span>
          <span className={PILL_LABEL_CLASS}>Menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem asChild>
          <a href={detailsUrl} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
            Abrir no Internet Archive
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void onCopyLink()}>
          <Link2 aria-hidden />
          Copiar link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Ações do item em pílulas (vídeo e áudio): todas enfileiradas na
 * horizontal, incluindo as que antes ficavam no menu "mais opções".
 */
function ActionsBar({
  identifier,
  title,
  favoriteTarget,
  onOpenDescription,
  onOpenPlaylist,
  centered = false,
  withMenu = false,
  withPlaylist = false,
}: {
  identifier: string
  title: string
  favoriteTarget: FavoriteTarget
  onOpenDescription?: () => void
  onOpenPlaylist?: () => void
  centered?: boolean
  /** Mantém as opções secundárias dentro do menu suspenso. */
  withMenu?: boolean
  /** Inclui o botão que abre a lista de reprodução. */
  withPlaylist?: boolean
}) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(favoriteTarget.identifier)

  const handleFavorite = () => {
    const added = toggleFavorite({
      ...favoriteTarget,
      creator: favoriteTarget.creator
        ? String(favoriteTarget.creator)
        : undefined,
    })
    if (added) {
      toast("Adicionado aos favoritos", { description: title })
    } else {
      toast("Removido dos favoritos", { description: title })
    }
  }

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(buildItemShareUrl(identifier))
      toast.success("Link copiado para a área de transferência")
    } catch {
      toast.error("Não foi possível copiar o link")
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-1 sm:gap-2",
        centered && "justify-center"
      )}
    >
      <PillAction
        icon={
          <Heart
            aria-hidden
            className={cn(
              favorite && "fill-current text-destructive dark:text-destructive"
            )}
          />
        }
        label={favorite ? "Favoritado" : "Favoritar"}
        onClick={handleFavorite}
      />
      {withPlaylist && (
        <PillAction
          icon={<ListMusic aria-hidden />}
          label="Lista"
          onClick={onOpenPlaylist}
          // Em telas grandes a lista fica exposta ao lado do player.
          className="lg:hidden"
        />
      )}
      {!withMenu && (
        <>
          <PillAction
            icon={<Link2 aria-hidden />}
            label="Copiar link"
            onClick={handleCopyLink}
          />
          <PillAction
            icon={<ExternalLink aria-hidden />}
            label="Archive.org"
            href={buildDetailsUrl(identifier)}
          />
        </>
      )}
      {onOpenDescription && (
        <PillAction
          icon={<AlignLeft aria-hidden />}
          label="Descrição"
          onClick={onOpenDescription}
        />
      )}
      {withMenu && (
        <PillMenu
          detailsUrl={buildDetailsUrl(identifier)}
          onCopyLink={handleCopyLink}
        />
      )}
    </div>
  )
}

/** Botão que abre a descrição em um modal (só aparece quando há handler). */
function DescriptionButton({ onClick }: { onClick?: () => void }) {
  if (!onClick) {
    return null
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label="Ver descrição"
    >
      <AlignLeft aria-hidden />
    </Button>
  )
}

/** Menu "mais opções" com ações genéricas (favoritar, IA, copiar link). */
function MoreMenu({
  identifier,
  title,
  favoriteTarget,
  showFavorite = false,
}: {
  identifier: string
  title: string
  favoriteTarget: FavoriteTarget
  showFavorite?: boolean
}) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(favoriteTarget.identifier)

  const handleFavorite = () => {
    const added = toggleFavorite({
      ...favoriteTarget,
      creator: favoriteTarget.creator
        ? String(favoriteTarget.creator)
        : undefined,
    })
    if (added) {
      toast("Adicionado aos favoritos", { description: title })
    } else {
      toast("Removido dos favoritos", { description: title })
    }
  }

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(buildItemShareUrl(identifier))
      toast.success("Link copiado para a área de transferência")
    } catch {
      toast.error("Não foi possível copiar o link")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mais opções"
        >
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showFavorite && (
          <DropdownMenuItem onSelect={handleFavorite}>
            <Heart
              className={cn(
                favorite &&
                  "fill-current text-destructive dark:text-destructive"
              )}
              aria-hidden
            />
            {favorite ? "Remover dos favoritos" : "Favoritar"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a
            href={buildDetailsUrl(identifier)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            Abrir no Internet Archive
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleCopyLink}>
          <Link2 aria-hidden />
          Copiar link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Barra genérica: descrição + favoritar + menu (vídeo, tipo desconhecido). */
function GenericBar({
  identifier,
  title,
  favoriteTarget,
  onOpenDescription,
}: {
  identifier: string
  title: string
  favoriteTarget: FavoriteTarget
  onOpenDescription?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 p-2">
      <DescriptionButton onClick={onOpenDescription} />
      <FavoriteButton size="icon" variant="ghost" item={favoriteTarget} />
      <MoreMenu
        identifier={identifier}
        title={title}
        favoriteTarget={favoriteTarget}
      />
    </div>
  )
}

/** Limites de zoom de cada visualizador (devem casar com os componentes). */
const IMAGE_MIN_ZOOM = 1
const IMAGE_MAX_ZOOM = 5
const PDF_MIN_ZOOM = 0.4
const PDF_MAX_ZOOM = 4

/** Barra de imagem: zoom in/out, porcentagem e restaurar zoom original. */
function ImageBar({
  identifier,
  title,
  files,
  zoom = 1,
  onZoomChange,
  favoriteTarget,
  onOpenDescription,
  overlay = false,
  imageIndex = 0,
  onImageIndexChange,
}: {
  identifier: string
  title: string
  files?: ArchiveFile[]
  zoom?: number
  onZoomChange?: (zoom: number) => void
  favoriteTarget: FavoriteTarget
  onOpenDescription?: () => void
  overlay?: boolean
  imageIndex?: number
  onImageIndexChange?: (index: number) => void
}) {
  const percent = Math.round(zoom * 100)
  const images = imageFilesByPreference(files)
  const activeIndex = images[imageIndex] ? imageIndex : 0
  const stripRef = useRef<HTMLDivElement>(null)
  // Pontas da faixa: desabilita a seta que não tem mais para onde rolar.
  const [edges, setEdges] = useState({ start: true, end: true })

  const updateEdges = useCallback(() => {
    const strip = stripRef.current
    if (!strip) {
      return
    }
    const start = strip.scrollLeft <= 1
    const end = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1
    setEdges((previous) =>
      previous.start === start && previous.end === end
        ? previous
        : { start, end }
    )
  }, [])

  // Rola a faixa de imagens (não o visualizador) em uma "página" de itens.
  const scrollStrip = (direction: -1 | 1) => {
    const strip = stripRef.current
    if (!strip) {
      return
    }
    smoothScrollBy(strip, direction * Math.max(120, strip.clientWidth * 0.8))
  }

  useEffect(() => {
    updateEdges()
    window.addEventListener("resize", updateEdges)
    return () => window.removeEventListener("resize", updateEdges)
  }, [updateEdges, images.length])

  // Mantém a imagem atual centralizada na faixa, como no seletor de páginas.
  useEffect(() => {
    const strip = stripRef.current
    const active = strip?.querySelector<HTMLElement>(
      `[data-image-thumb="${activeIndex}"]`
    )
    if (!strip || !active) {
      return
    }
    const target =
      active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2
    smoothScrollTo(strip, Math.max(0, target))
    updateEdges()
  }, [activeIndex, images.length, updateEdges])

  return (
    <div className="flex flex-col">
      {/* Listagem horizontal das imagens do item, com miniaturas
          quadradas e moldura só na selecionada. */}
      {images.length > 1 && (
        <div
          className={cn(
            "flex items-center gap-0.5 px-1",
            overlay && "text-foreground [&_button:hover]:bg-foreground/10"
          )}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scrollStrip(-1)}
            disabled={edges.start}
            // Sem conteúdo para rolar: a seta some (o espaço fica reservado
            // para a faixa não mudar de largura e a rolagem não pular).
            className={cn(edges.start && "invisible")}
            aria-label="Rolar as imagens para a esquerda"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <div
            ref={stripRef}
            onScroll={updateEdges}
            // A lateral que ainda tem imagens desvanece, em vez de cortar
            // a miniatura na régua.
            style={edgeFadeMask(edges.start, edges.end)}
            className="relative flex min-w-0 flex-1 [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-1 pt-2 pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((file, index) => (
              <button
                key={file.name}
                type="button"
                data-image-thumb={index}
                onClick={() => onImageIndexChange?.(index)}
                aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                aria-pressed={index === activeIndex}
                className={cn(
                  // Mesma moldura do seletor de páginas do PDF: anel
                  // destacado com respiro apenas na imagem atual.
                  "size-14 shrink-0 overflow-hidden rounded-xl transition-[box-shadow,opacity]",
                  index === activeIndex
                    ? "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={buildFileUrl(identifier, file.name)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scrollStrip(1)}
            disabled={edges.end}
            className={cn(edges.end && "invisible")}
            aria-label="Rolar as imagens para a direita"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-1 p-2",
          // Sobre o degradê do fundo da aplicação, tudo usa a cor do texto.
          overlay &&
            "text-foreground [&_button]:text-foreground [&_button:hover]:bg-foreground/10 [&_button:hover]:text-foreground"
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={zoom <= IMAGE_MIN_ZOOM}
          onClick={() => onZoomChange?.(Math.max(IMAGE_MIN_ZOOM, zoom - 0.25))}
          aria-label="Diminuir zoom"
        >
          <ZoomOut aria-hidden />
        </Button>
        <span
          className={cn(
            "w-14 text-center text-sm font-medium tabular-nums",
            overlay && "text-foreground"
          )}
        >
          {percent}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={zoom >= IMAGE_MAX_ZOOM}
          onClick={() => onZoomChange?.(Math.min(IMAGE_MAX_ZOOM, zoom + 0.25))}
          aria-label="Aumentar zoom"
        >
          <ZoomIn aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onZoomChange?.(1)}
          aria-label="Restaurar zoom original"
        >
          <RotateCcw aria-hidden />
        </Button>
        <Separator
          orientation="vertical"
          className={cn("mx-1", overlay && "bg-foreground/20")}
        />
        <DescriptionButton onClick={onOpenDescription} />
        <FavoriteButton size="icon-sm" variant="ghost" item={favoriteTarget} />
        <MoreMenu
          identifier={identifier}
          title={title}
          favoriteTarget={favoriteTarget}
        />
      </div>
    </div>
  )
}

/**
 * Barra de texto: navegação (rolagem), copiar, favoritar e menu. No modo
 * PDF, os controles de zoom ocupam o lugar do botão de copiar link.
 */
function TextBar({
  identifier,
  title,
  textMode = "none",
  textContent,
  textLoading,
  textScrollRef,
  zoom = 1,
  onZoomChange,
  pdfPage = 1,
  pdfPageCount = 0,
  pdfPageAspect = 1,
  pdfDocument,
  onPdfPageSelect,
  favoriteTarget,
  onOpenDescription,
  onOpenFullscreen,
}: {
  identifier: string
  title: string
  textMode?: TextSourceMode
  textContent?: string | null
  textLoading?: boolean
  textScrollRef?: RefObject<HTMLDivElement | null>
  zoom?: number
  onZoomChange?: (zoom: number) => void
  pdfPage?: number
  pdfPageCount?: number
  pdfPageAspect?: number
  pdfDocument?: PDFDocumentProxy | null
  onPdfPageSelect?: (page: number) => void
  favoriteTarget: FavoriteTarget
  onOpenDescription?: () => void
  onOpenFullscreen?: () => void
}) {
  const scrollTo = (top: boolean) => {
    const el = textScrollRef?.current
    if (el) {
      el.scrollTo({ top: top ? 0 : el.scrollHeight, behavior: "smooth" })
    }
  }

  const handleCopy = async () => {
    try {
      if (textMode === "inline" && textContent) {
        await copyToClipboard(textContent)
        toast.success("Texto copiado")
      } else {
        await copyToClipboard(buildItemShareUrl(identifier))
        toast.success("Link copiado")
      }
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <div className="flex flex-col">
      {/* Seletor de páginas do PDF: miniaturas na proporção de cada
          página, numeração embaixo, destaque e rolagem até a atual. */}
      {textMode === "pdf" && pdfPageCount > 1 && (
        <PdfPageStrip
          pdf={pdfDocument ?? null}
          pageCount={pdfPageCount}
          aspect={pdfPageAspect}
          currentPage={pdfPage}
          onSelect={(page) => onPdfPageSelect?.(page)}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-1 p-2">
        {textMode === "inline" && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => scrollTo(true)}
              aria-label="Ir para o início do texto"
            >
              <ArrowUpToLine aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => scrollTo(false)}
              aria-label="Ir para o fim do texto"
            >
              <ArrowDownToLine aria-hidden />
            </Button>
          </>
        )}
        {textMode === "pdf" && onOpenFullscreen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenFullscreen}
            aria-label="Abrir o documento em tela inteira"
          >
            <Maximize2 aria-hidden />
          </Button>
        )}
        {textMode === "pdf" ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={zoom <= PDF_MIN_ZOOM}
              onClick={() =>
                onZoomChange?.(Math.max(PDF_MIN_ZOOM, zoom - 0.25))
              }
              aria-label="Diminuir zoom"
            >
              <ZoomOut aria-hidden />
            </Button>
            <span className="w-12 text-center text-sm font-medium tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={zoom >= PDF_MAX_ZOOM}
              onClick={() =>
                onZoomChange?.(Math.min(PDF_MAX_ZOOM, zoom + 0.25))
              }
              aria-label="Aumentar zoom"
            >
              <ZoomIn aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onZoomChange?.(1)}
              aria-label="Ajustar à largura da tela"
            >
              <RotateCcw aria-hidden />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={textMode === "inline" && textLoading}
          >
            <Copy aria-hidden />
            {textMode === "inline" ? "Copiar" : "Copiar link"}
          </Button>
        )}
        <Separator orientation="vertical" className="mx-1" />
        <DescriptionButton onClick={onOpenDescription} />
        <FavoriteButton size="icon" variant="ghost" item={favoriteTarget} />
        <MoreMenu
          identifier={identifier}
          title={title}
          favoriteTarget={favoriteTarget}
        />
      </div>
    </div>
  )
}
