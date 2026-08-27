import { ExternalLink, Film, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import { pickVideoFile } from "@/lib/media"
import { useMediaPlayback } from "@/hooks/use-media-playback"
import type { ArchiveFile } from "@/types/archive"

interface VideoViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
}

/** Área central do player de vídeo: elemento nativo com tratamento de falhas. */
export function VideoViewer({ identifier, files }: VideoViewerProps) {
  const video = pickVideoFile(files)
  const src = video ? buildFileUrl(identifier, video.name) : undefined
  const { attempt, failed, markFailed, markLoaded, retry } =
    useMediaPlayback(src)

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
      onLoadedMetadata={markLoaded}
    >
      Seu navegador não suporta reprodução de vídeo.
    </video>
  )
}
