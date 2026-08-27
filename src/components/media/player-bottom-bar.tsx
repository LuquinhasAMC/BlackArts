import { useState, type RefObject } from "react"
import {
  AlignLeft,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  ExternalLink,
  Heart,
  Link2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  FavoriteButton,
  type FavoriteTarget,
} from "@/components/favorites/favorite-button"
import { useFavorites } from "@/hooks/use-favorites"
import { useMediaPlayback } from "@/hooks/use-media-playback"
import { AudioPlayer } from "@/components/media/audio-player"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import {
  audioFilesByPreference,
  type MediaType,
  type TextSourceMode,
} from "@/lib/media"
import { buildItemShareUrl, copyToClipboard } from "@/lib/share"
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
  favoriteTarget: FavoriteTarget
}

/**
 * Bottom bar flutuante e dinâmica: muda os controles de acordo com o
 * tipo de player (áudio = reprodução, imagem = zoom, texto =
 * navegação/copiar) e sempre oferece favoritar e menu "mais opções".
 */
export function PlayerBottomBar(props: PlayerBottomBarProps) {
  switch (props.type) {
    case "audio":
      return <AudioBar {...props} />
    case "image":
      return <ImageBar {...props} />
    case "text":
      return <TextBar {...props} />
    default:
      return <GenericBar {...props} />
  }
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

/** Barra de áudio: seleção de faixa + controles de reprodução nativos. */
function AudioBar({
  identifier,
  title,
  files,
  favoriteTarget,
  onOpenDescription,
}: {
  identifier: string
  title: string
  files?: ArchiveFile[]
  favoriteTarget: FavoriteTarget
  onOpenDescription?: () => void
}) {
  const audioFiles = audioFilesByPreference(files)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const safeIndex = Math.min(selectedIndex, Math.max(0, audioFiles.length - 1))
  const current = audioFiles.length > 0 ? audioFiles[safeIndex] : undefined
  const src = current ? buildFileUrl(identifier, current.name) : undefined
  const { attempt, failed, markFailed, retry } = useMediaPlayback(src)

  if (audioFiles.length === 0) {
    return (
      <GenericBar
        identifier={identifier}
        title={title}
        favoriteTarget={favoriteTarget}
        onOpenDescription={onOpenDescription}
      />
    )
  }

  // Após o guarda acima, `current` sempre existe.
  const activeFile = current as ArchiveFile

  if (failed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          Não foi possível carregar o áudio.
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={retry}>
            <RotateCcw aria-hidden />
            Tentar de novo
          </Button>
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

  return (
    <div className="flex w-full flex-col gap-2 p-3">
      {audioFiles.length > 1 && (
        <Select
          value={String(safeIndex)}
          onValueChange={(value) => setSelectedIndex(Number(value))}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-full"
            aria-label="Selecionar faixa de áudio"
          >
            <SelectValue placeholder="Selecionar faixa" />
          </SelectTrigger>
          <SelectContent>
            {audioFiles.map((file, index) => (
              <SelectItem key={file.name} value={String(index)}>
                {file.title || file.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {/* Em telas pequenas as ações vão para uma linha própria abaixo do
          player; em telas maiores ficam ao lado, com o player esticando. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5 sm:flex-1">
          <AudioPlayer
            key={`${activeFile.name}-${attempt}`}
            src={src}
            onError={markFailed}
          />
        </div>
        <div className="flex shrink-0 items-center justify-center gap-1">
          <DescriptionButton onClick={onOpenDescription} />
          <FavoriteButton size="icon" variant="ghost" item={favoriteTarget} />
          <MoreMenu
            identifier={identifier}
            title={title}
            favoriteTarget={favoriteTarget}
          />
        </div>
      </div>
    </div>
  )
}

/** Barra de imagem: zoom in/out, porcentagem e restaurar zoom original. */
function ImageBar({
  identifier,
  title,
  zoom = 1,
  onZoomChange,
  favoriteTarget,
  onOpenDescription,
}: {
  identifier: string
  title: string
  zoom?: number
  onZoomChange?: (zoom: number) => void
  favoriteTarget: FavoriteTarget
  onOpenDescription?: () => void
}) {
  const percent = Math.round(zoom * 100)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 p-2">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={zoom <= 1}
        onClick={() => onZoomChange?.(Math.max(1, zoom - 0.5))}
        aria-label="Diminuir zoom"
      >
        <ZoomOut aria-hidden />
      </Button>
      <span className="w-14 text-center text-sm font-medium tabular-nums">
        {percent}%
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={zoom >= 5}
        onClick={() => onZoomChange?.(Math.min(5, zoom + 0.5))}
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
      <Separator orientation="vertical" className="mx-1" />
      <DescriptionButton onClick={onOpenDescription} />
      {/* Sem espaço para o coração: favoritar fica no menu suspenso. */}
      <MoreMenu
        identifier={identifier}
        title={title}
        favoriteTarget={favoriteTarget}
        showFavorite
      />
    </div>
  )
}

/** Barra de texto: navegação (rolagem), copiar, favoritar e menu. */
function TextBar({
  identifier,
  title,
  textMode = "none",
  textContent,
  textLoading,
  textScrollRef,
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
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        disabled={textMode === "inline" && textLoading}
      >
        <Copy aria-hidden />
        {textMode === "inline" ? "Copiar" : "Copiar link"}
      </Button>
      <Separator orientation="vertical" className="mx-1" />
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
