import { useCallback, useRef, useState } from "react"
import { ExternalLink, ImageOff, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import { pickImageFile } from "@/lib/media"
import { useMediaPlayback } from "@/hooks/use-media-playback"
import { cn } from "@/lib/utils"
import type { ArchiveFile } from "@/types/archive"

interface ImageViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
  /** Nível de zoom controlado pela bottom bar (1 = original). */
  zoom?: number
  /** Atualiza o zoom (gestos no visualizador e bottom bar). */
  onZoomChange?: (zoom: number) => void
}

/** Zoom máximo e mínimo aplicados nos gestos. */
const MIN_ZOOM = 1
const MAX_ZOOM = 5
/** Zoom aplicado no duplo toque (alterna entre 1x e este valor). */
const DOUBLE_TAP_ZOOM = 2.5
/** Distância de movimento (px) para considerar um gesto de arraste. */
const PAN_THRESHOLD = 6

/**
 * Visualizador de fotos no estilo galeria do celular: a imagem ocupa a
 * área toda sobre fundo escuro (sem "caixa" visível), com gestos de
 * pinça (pinch) para dar zoom, duplo toque para alternar 1x/2.5x e
 * arrastar para navegar quando ampliada. O zoom também é controlado
 * pela bottom bar (mantém sincronia pelos props `zoom`/`onZoomChange`).
 */
export function ImageViewer({
  identifier,
  files,
  zoom = 1,
  onZoomChange,
}: ImageViewerProps) {
  const image = pickImageFile(files, identifier)
  const src = image ? buildFileUrl(identifier, image.name) : undefined
  const { attempt, failed, markFailed, retry } = useMediaPlayback(src)

  // Deslocamento (pan) aplicado quando ampliada.
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [prevZoom, setPrevZoom] = useState(zoom)

  // Ao voltar para o zoom original, reseta a posição. Ajuste de estado
  // durante o render (padrão React para derivar estado de uma prop).
  if (prevZoom !== zoom) {
    setPrevZoom(zoom)
    if (zoom <= MIN_ZOOM) {
      setOffset({ x: 0, y: 0 })
    }
  }

  // Referências para os gestos (pinça e arraste).
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    mode: "none" | "pan" | "pinch"
    startZoom: number
    startDistance: number
    startOffset: { x: number; y: number }
    startPoint: { x: number; y: number }
  }>({
    mode: "none",
    startZoom: 1,
    startDistance: 0,
    startOffset: { x: 0, y: 0 },
    startPoint: { x: 0, y: 0 },
  })

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    []
  )

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (failed || !image) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const points = [...pointers.current.values()]
    if (points.length === 2) {
      gesture.current = {
        mode: "pinch",
        startZoom: zoom,
        startDistance: distance(points[0], points[1]),
        startOffset: offset,
        startPoint: points[0],
      }
    } else {
      gesture.current = {
        mode: "pan",
        startZoom: zoom,
        startDistance: 0,
        startOffset: offset,
        startPoint: points[0],
      }
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (failed || !image || !pointers.current.has(event.pointerId)) {
      return
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.current.values()]
    const g = gesture.current

    if (g.mode === "pinch" && points.length === 2) {
      const nextDistance = distance(points[0], points[1])
      if (g.startDistance > 0) {
        const nextZoom = clampZoom(
          (nextDistance / g.startDistance) * g.startZoom
        )
        onZoomChange?.(nextZoom)
      }
      return
    }

    if (g.mode === "pan" && points.length === 1) {
      // Só arrasta a imagem quando ela está ampliada.
      if (zoom <= MIN_ZOOM) {
        return
      }
      const deltaX = points[0].x - g.startPoint.x
      const deltaY = points[0].y - g.startPoint.y
      if (
        Math.abs(deltaX) < PAN_THRESHOLD &&
        Math.abs(deltaY) < PAN_THRESHOLD
      ) {
        return
      }
      setOffset({
        x: g.startOffset.x + deltaX,
        y: g.startOffset.y + deltaY,
      })
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) {
      gesture.current.mode = "none"
    }
  }

  const handleDoubleClick = () => {
    onZoomChange?.(zoom > 1 ? MIN_ZOOM : DOUBLE_TAP_ZOOM)
  }

  if (!image || failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-8 text-center">
        <ImageOff className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">Imagem indisponível</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Não foi possível carregar a imagem. O servidor de arquivos do
            Internet Archive pode estar lento ou bloqueado na sua rede.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {image && (
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
    )
  }

  return (
    <div
      className="relative flex h-[calc(100dvh-18rem)] min-h-64 w-full touch-none items-center justify-center overflow-hidden rounded-4xl bg-black/60 ring-1 ring-white/5 select-none"
      aria-label="Imagem do item (use dois dedos para dar zoom ou arraste para navegar)"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Brilho sutil atrás da foto, estilo galeria. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_65%)]"
      />
      <div
        className="relative"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 120ms ease-out",
        }}
      >
        <img
          key={attempt}
          src={src}
          alt={image.title || image.name || "Imagem do item"}
          loading="lazy"
          onError={markFailed}
          draggable={false}
          className={cn(
            "max-h-[calc(100dvh-20rem)] w-auto max-w-full object-contain",
            zoom > 1 ? "cursor-grab" : "cursor-zoom-in"
          )}
        />
      </div>
    </div>
  )
}
