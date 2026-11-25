import { useEffect, useRef } from "react"
import { ExternalLink, Film, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import { videoFilesByPreference } from "@/lib/media"
import { useMediaPlayback } from "@/hooks/use-media-playback"
import type { ArchiveFile } from "@/types/archive"

interface VideoViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
  /** Índice do vídeo exibido (itens com mais de um vídeo). */
  videoIndex?: number
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onReady?: () => void
  onVideoTimeUpdate?: (time: number) => void
  onVideoDurationChange?: (duration: number) => void
  onVideoReady?: () => void
  /** Retoma a partir daqui (segundos) ao carregar o vídeo. */
  initialTime?: number
}

/** Área central do player de vídeo: elemento nativo com tratamento de falhas. */
export function VideoViewer({
  identifier,
  files,
  videoIndex = 0,
  onTimeUpdate,
  onDurationChange,
  onReady,
  onVideoTimeUpdate,
  onVideoDurationChange,
  onVideoReady,
  initialTime,
}: VideoViewerProps) {
  const videos = videoFilesByPreference(files)
  const video = videos[videoIndex] ?? videos[0]
  const src = video ? buildFileUrl(identifier, video.name) : undefined
  const { attempt, failed, markFailed, markLoaded, retry } =
    useMediaPlayback(src)
  // Retomada única da minutagem salva (por vídeo).
  const appliedResume = useRef(false)
  const lastReport = useRef(0)
  useEffect(() => {
    appliedResume.current = false
    lastReport.current = 0
  }, [src])

  if (!video || failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-8 text-center">
        <Film className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            {failed
              ? "Não foi possível reproduzir este vídeo"
              : "Nenhum arquivo de vídeo disponível"}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            O arquivo pode estar em formato não suportado, ou o servidor de
            arquivos do Internet Archive pode estar lento ou bloqueado na sua
            rede.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={retry}>
            <RotateCcw aria-hidden />
            Tentar novamente
          </Button>
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
    )
  }

  return (
    <video
      key={`${video.name}-${attempt}`}
      controls
      preload="metadata"
      className="aspect-video w-full rounded-4xl bg-black"
      src={src}
      onError={markFailed}
      onLoadedMetadata={(e) => {
        markLoaded()
        const media = e.currentTarget
        const d = media.duration || 0
        onDurationChange?.(d)
        onVideoDurationChange?.(d)
        onReady?.()
        onVideoReady?.()
        if (!appliedResume.current && initialTime && initialTime > 1) {
          appliedResume.current = true
          media.currentTime = Math.min(initialTime, Math.max(0, d - 1))
        }
      }}
      onTimeUpdate={(e) => {
        const time = e.currentTarget.currentTime
        if (Math.abs(time - lastReport.current) < 5) return
        lastReport.current = time
        onTimeUpdate?.(time)
        onVideoTimeUpdate?.(time)
      }}
    >
      Seu navegador não suporta reprodução de vídeo.
    </video>
  )
}
