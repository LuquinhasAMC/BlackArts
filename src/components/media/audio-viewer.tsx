import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  AudioLines,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  SeekBar,
  formatTime,
  trackLabel,
} from "@/components/media/audio-player"
import { AudioPlaylist } from "@/components/media/audio-playlist"
import { useAudioPlayback } from "@/components/media/audio-playback"
import {
  buildDetailsUrl,
  buildFileUrl,
  buildThumbnailUrl,
} from "@/lib/archive-api"
import { edgeFadeMask } from "@/lib/edge-fade"
import { audioFilesByPreference, formatList } from "@/lib/media"
import { cn } from "@/lib/utils"
import type { ArchiveFile } from "@/types/archive"

interface AudioViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
  /** Título/autores exibidos como em um app de música. */
  title?: string
  creator?: string | string[]
  /** Faixa selecionada (itens com mais de um áudio). */
  audioIndex?: number
  onAudioIndexChange?: (index: number) => void
  /** Ações do item exibidas logo abaixo dos controles de reprodução. */
  actions?: ReactNode
  /** Retoma a faixa a partir desta posição (segundos). */
  resumeTime?: number
}

/**
 * Título do item em uma única linha: rola na horizontal quando não cabe e as
 * laterais desvanecem (a mesma máscara dos seletores de página/foto).
 */
function ScrollingTitle({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const updateEdges = useCallback(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const max = el.scrollWidth - el.clientWidth
    const left = el.scrollLeft > 4
    const right = el.scrollLeft < max - 4
    setEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    )
  }, [])

  useEffect(() => {
    updateEdges()
    const el = ref.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver(updateEdges)
    observer.observe(el)
    window.addEventListener("resize", updateEdges)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateEdges)
    }
  }, [updateEdges, text])

  return (
    <div
      ref={ref}
      onScroll={updateEdges}
      style={edgeFadeMask(!edges.left, !edges.right)}
      className="w-full [scrollbar-width:none] overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <h2 className="mx-auto w-max px-2 text-lg leading-tight font-bold whitespace-nowrap">
        {text}
      </h2>
    </div>
  )
}

/**
 * Player de áudio no estilo de apps de música para celular: capa grande,
 * título e autor, barra de progresso, controles de faixa e — quando o
 * item tem mais de um áudio — a lista de reprodução.
 *
 * O som em si é do player global (`useAudioPlayback`), então continua ao
 * sair da tela do item.
 */
export function AudioViewer({
  identifier,
  files,
  title,
  creator,
  audioIndex = 0,
  onAudioIndexChange,
  actions,
  resumeTime,
}: AudioViewerProps) {
  const audioFiles = audioFilesByPreference(files)
  const activeIndex = audioFiles[audioIndex] ? audioIndex : 0
  const track = audioFiles[activeIndex]
  const src = track ? buildFileUrl(identifier, track.name) : undefined

  const player = useAudioPlayback()
  const {
    nowPlaying,
    active,
    playing,
    loading,
    failed,
    currentTime,
    duration,
    load,
    toggle,
    seek,
    retry,
    setOnEnded,
  } = player

  const [thumbFailed, setThumbFailed] = useState(false)
  // Reprodução automática: ao terminar a faixa, passa para a próxima.
  const [autoplay, setAutoplay] = useState(false)
  // Se o usuário trocou a faixa enquanto tocava, a próxima deve começar.
  const autoplayNextRef = useRef(false)

  const creatorText = formatList(creator)
  const itemTitle = title ?? (track ? trackLabel(track) : "Áudio")

  // Carrega a faixa no player global (que ignora recarregar a mesma fonte,
  // preservando a reprodução ao voltar para esta tela).
  useEffect(() => {
    if (!track || !src) {
      return
    }
    const shouldAutoplay = autoplayNextRef.current
    autoplayNextRef.current = false
    load(
      {
        identifier,
        src,
        title: itemTitle,
        creator: creatorText || undefined,
        track: trackLabel(track),
      },
      shouldAutoplay ? { autoplay: true } : undefined
    )
  }, [src, track, identifier, itemTitle, creatorText, load])

  // Avanço automático ao terminar a faixa (só enquanto esta tela está
  // montada e o toggle está ligado).
  useEffect(() => {
    setOnEnded(() => {
      if (!autoplay) {
        return
      }
      const nextIndex = activeIndex + 1
      const nextFile = audioFiles[nextIndex]
      if (!nextFile) {
        return
      }
      onAudioIndexChange?.(nextIndex)
      autoplayNextRef.current = true
    })
    return () => setOnEnded(null)
  }, [autoplay, activeIndex, audioFiles, onAudioIndexChange, setOnEnded])

  const goTo = (index: number) => {
    if (index < 0 || index >= audioFiles.length || index === activeIndex) {
      return
    }
    // Se a faixa atual está tocando, inicia a próxima automaticamente.
    if (playing && nowPlaying?.src === src) {
      autoplayNextRef.current = true
    }
    onAudioIndexChange?.(index)
  }

  // Só mostra os controles desta faixa se o player estiver de fato nela.
  const isCurrent = Boolean(src) && nowPlaying?.src === src
  const busy = isCurrent && (loading || failed)

  // Retomada única da minutagem salva (só enquanto o áudio ainda não tocou).
  const appliedResume = useRef(false)
  useEffect(() => {
    appliedResume.current = false
  }, [src])
  useEffect(() => {
    if (appliedResume.current || !resumeTime || resumeTime < 1) return
    if (!isCurrent || duration <= 0 || active) return
    appliedResume.current = true
    seek(Math.min(resumeTime / duration, 0.99))
  }, [resumeTime, isCurrent, duration, active, seek])

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 lg:h-full lg:max-w-5xl lg:flex-row lg:items-stretch lg:justify-center lg:gap-8 lg:px-8 2xl:max-w-6xl">
      {/* Player (título, capa, progresso e controles): coluna da esquerda
          em telas grandes, centralizada na vertical, e coluna única no
          celular. */}
      <div className="flex w-full min-w-0 flex-col gap-5 lg:max-w-sm lg:shrink-0 lg:justify-center lg:py-6">
        {/* Título e autor, acima da capa. */}
        <div className="flex flex-col items-center gap-1 text-center">
          <ScrollingTitle text={itemTitle} />
          {creatorText && (
            <p className="line-clamp-1 px-2 text-sm text-muted-foreground">
              {creatorText}
            </p>
          )}
        </div>

        {/* Capa do álbum/item. */}
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-4xl bg-muted shadow-lg ring-1 ring-border">
          {thumbFailed ? (
            <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/50">
              <AudioLines
                className="size-16 text-muted-foreground/40"
                aria-hidden
              />
            </div>
          ) : (
            <img
              src={buildThumbnailUrl(identifier)}
              alt="Capa do item de áudio"
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="size-full object-cover"
            />
          )}
        </div>

        {track && !failed ? (
          <>
            {/* Progresso. */}
            <div className="flex flex-col gap-0.5 px-1">
              <SeekBar
                value={isCurrent ? currentTime : 0}
                max={isCurrent ? duration : 0}
                onSeek={seek}
                disabled={busy || !isCurrent || duration <= 0}
              />
              <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                <span className="shrink-0 tabular-nums">
                  {formatTime(isCurrent ? currentTime : 0)}
                </span>
                {/* Faixa atual entre as minutagens, no mesmo tamanho delas. */}
                <span className="min-w-0 flex-1 truncate text-center">
                  {trackLabel(track)}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatTime(isCurrent ? duration : 0)}
                </span>
              </div>
            </div>

            {/* Controles de reprodução. */}
            <div className="flex items-center justify-center gap-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => goTo(activeIndex - 1)}
                disabled={activeIndex <= 0}
                aria-label="Faixa anterior"
              >
                <SkipBack aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon-lg"
                className="size-16 rounded-full shadow-lg"
                onClick={toggle}
                disabled={busy}
                aria-label={isCurrent && playing ? "Pausar" : "Reproduzir"}
              >
                {isCurrent && loading ? (
                  <Loader2 className="size-6 animate-spin" aria-hidden />
                ) : isCurrent && playing ? (
                  <Pause className="size-6" aria-hidden />
                ) : (
                  <Play className="size-6" aria-hidden />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => goTo(activeIndex + 1)}
                disabled={activeIndex >= audioFiles.length - 1}
                aria-label="Próxima faixa"
              >
                <SkipForward aria-hidden />
              </Button>
              {/* Só faz sentido com mais de uma faixa no item. */}
              {audioFiles.length > 1 && (
                <Button
                  type="button"
                  variant={autoplay ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setAutoplay((value) => !value)}
                  aria-pressed={autoplay}
                  aria-label={
                    autoplay
                      ? "Desativar reprodução automática"
                      : "Ativar reprodução automática"
                  }
                  title={
                    autoplay
                      ? "Reprodução automática ativada"
                      : "Reprodução automática desativada"
                  }
                  className={cn(autoplay && "text-primary")}
                >
                  <Repeat aria-hidden />
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-6 text-center">
            <AudioLines className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">
              {failed
                ? "Não foi possível reproduzir este áudio"
                : "Nenhum arquivo de áudio disponível"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {failed && (
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcw aria-hidden />
                  Tentar novamente
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={buildDetailsUrl(identifier)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink aria-hidden />
                  Abrir no Internet Archive
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ações do item: abaixo dos controles no celular e na coluna central,
          entre o player e a lista, em telas grandes. */}
      {actions && (
        <div className="flex justify-center lg:w-24 lg:shrink-0 lg:flex-col lg:items-center lg:justify-center">
          {actions}
        </div>
      )}

      {/* Em telas grandes a lista de reprodução ocupa toda a altura do
          lado direito, sem caixa e sem divisória. */}
      {audioFiles.length > 1 && (
        <aside className="hidden lg:flex lg:h-full lg:w-96 lg:shrink-0 lg:flex-col lg:py-6">
          <h3 className="pb-2 pl-3 text-sm font-semibold">
            Lista de reprodução
          </h3>
          <AudioPlaylist
            files={audioFiles}
            activeIndex={activeIndex}
            creator={creator}
            onSelect={goTo}
            className="min-h-0 overflow-y-auto"
          />
        </aside>
      )}
    </div>
  )
}
