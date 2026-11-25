import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink, ImageOff, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import { imageFilesByPreference } from "@/lib/media"
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
  /** Índice da imagem exibida (itens com mais de uma imagem). */
  imageIndex?: number
}

/** Zoom mínimo (40%) e máximo aplicados nos gestos. */
const MIN_ZOOM = 1
const MAX_ZOOM = 5
/** Zoom aplicado no duplo toque (alterna entre 1x e este valor). */
const DOUBLE_TAP_ZOOM = 2.5
/** Distância de movimento (px) para considerar um gesto de arraste. */
const PAN_THRESHOLD = 6
/** Folga do dedo: no toque, o tremor natural não pode cancelar o duplo toque. */
const TOUCH_PAN_SLOP = 16
/** Intervalo máximo entre dois toques para contar como duplo toque (ms). */
const DOUBLE_TAP_DELAY = 320

/**
 * Visualizador de fotos no estilo galeria do celular: a imagem ocupa a
 * área toda sobre fundo escuro (sem "caixa" visível), com gestos de
 * pinça (pinch) para dar zoom, duplo toque/clique para alternar
 * 100%/250% e arrastar para navegar quando ampliada. Ctrl + roda do
 * mouse também dá zoom. O zoom também é controlado pela bottom bar
 * (mantém sincronia pelos props `zoom`/`onZoomChange`).
 */
export function ImageViewer({
  identifier,
  files,
  zoom = 1,
  onZoomChange,
  imageIndex = 0,
}: ImageViewerProps) {
  const images = imageFilesByPreference(files)
  const image = images[imageIndex] ?? images[0]
  const src = image ? buildFileUrl(identifier, image.name) : undefined
  const { attempt, failed, markFailed, retry } = useMediaPlayback(src)

  // Deslocamento (pan) aplicado quando ampliada.
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [prevZoom, setPrevZoom] = useState(zoom)
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLImageElement>(null)
  // Camada que recebe o transform (o zoom da pinça é escrito direto nela).
  const wrapperRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const onZoomChangeRef = useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange

  // Último toque (para reconhecer o duplo toque em telas sensíveis).
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)

  // Arraste/pinça sem a transição do CSS (senão a imagem "flutua" atrás do
  // dedo no celular) e uma atualização de posição por frame.
  const [isGesturing, setIsGesturing] = useState(false)
  const panFrame = useRef<number | null>(null)
  const panPoint = useRef<{ x: number; y: number } | null>(null)
  const panMetrics = useRef<{
    rootW: number
    rootH: number
    contentW: number
    contentH: number
  } | null>(null)

  // Medidas fixas da pinça: evita ler o DOM a cada movimento do dedo.
  const pinchMetrics = useRef<{
    rootW: number
    rootH: number
    baseW: number
    baseH: number
  } | null>(null)
  // Zoom/posição aplicados no DOM durante a pinça, confirmados no fim.
  const pinchPreview = useRef<{
    zoom: number
    offset: { x: number; y: number }
  } | null>(null)

  // Referências para os gestos (pinça e arraste).
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    mode: "none" | "pan" | "pinch"
    moved: boolean
    slop: number
    startZoom: number
    startDistance: number
    startOffset: { x: number; y: number }
    startPoint: { x: number; y: number }
  }>({
    mode: "none",
    moved: false,
    slop: PAN_THRESHOLD,
    startZoom: 1,
    startDistance: 0,
    startOffset: { x: 0, y: 0 },
    startPoint: { x: 0, y: 0 },
  })

  // Ao mudar o zoom, escala o deslocamento na mesma proporção para manter
  // o ponto visível; o clamp mantém a imagem dentro da área.
  if (prevZoom !== zoom) {
    setPrevZoom(zoom)
    const ratio = prevZoom > 0 ? zoom / prevZoom : 1
    setOffset((current) =>
      clampOffset({ x: current.x * ratio, y: current.y * ratio }, zoom)
    )
  }

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    []
  )

  /**
   * Aplica um zoom já limitado. Atualiza a ref na hora para que eventos
   * seguidos (roda/gesto) partam do valor mais recente, e não do último
   * render — senão passos rápidos eram perdidos.
   */
  const applyZoom = useCallback(
    (value: number) => {
      const next = clampZoom(value)
      zoomRef.current = next
      onZoomChangeRef.current?.(next)
    },
    [clampZoom]
  )

  /** Mede a área visível e a imagem (com zoom), usado no clamp do pan. */
  function readMetrics(zoomValue: number) {
    const root = rootRef.current
    const frame = frameRef.current
    if (!root || !frame) {
      return null
    }
    return {
      rootW: root.clientWidth,
      rootH: root.clientHeight,
      contentW: frame.offsetWidth * zoomValue,
      contentH: frame.offsetHeight * zoomValue,
    }
  }

  /** Medidas sem o zoom (a imagem em 100%), base do clamp durante a pinça. */
  function readBaseMetrics() {
    const root = rootRef.current
    const frame = frameRef.current
    if (!root || !frame) {
      return null
    }
    return {
      rootW: root.clientWidth,
      rootH: root.clientHeight,
      baseW: frame.offsetWidth,
      baseH: frame.offsetHeight,
    }
  }

  /** Escreve posição e escala direto na camada, sem passar por re-render. */
  function writeTransform(
    zoomValue: number,
    offsetValue: { x: number; y: number }
  ) {
    const wrapper = wrapperRef.current
    if (wrapper) {
      wrapper.style.transform = `translate3d(${offsetValue.x}px, ${offsetValue.y}px, 0) scale(${zoomValue})`
    }
  }

  /** Mantém a imagem dentro dos limites da área visível. */
  function clampOffset(
    offsetValue: { x: number; y: number },
    zoomValue: number,
    cached?: {
      rootW: number
      rootH: number
      contentW: number
      contentH: number
    } | null
  ) {
    const metrics = cached ?? readMetrics(zoomValue)
    if (!metrics) {
      return offsetValue
    }
    const { contentW, contentH, rootW, rootH } = metrics

    // Origem no centro da imagem: o limite é simétrico nos dois eixos.
    const maxX = Math.max(0, (contentW - rootW) / 2)
    const maxY = Math.max(0, (contentH - rootH) / 2)

    return {
      x: Math.min(maxX, Math.max(-maxX, offsetValue.x)),
      y: Math.min(maxY, Math.max(-maxY, offsetValue.y)),
    }
  }

  /** Alterna entre 100% e o zoom do duplo clique/toque. */
  const toggleZoom = useCallback(() => {
    const next = zoomRef.current > 1 ? 1 : DOUBLE_TAP_ZOOM
    window.getSelection()?.removeAllRanges()
    zoomRef.current = next
    onZoomChangeRef.current?.(next)
  }, [])

  // Ctrl/Cmd + roda do mouse dá zoom; a roda simples navega quando ampliada.
  // Listener nativo (passive:false) para poder bloquear a rolagem da página.
  useEffect(() => {
    const el = rootRef.current
    if (!el) {
      return
    }
    const handler = (event: WheelEvent) => {
      if (!image || failed) {
        return
      }
      event.preventDefault()

      if (event.ctrlKey || event.metaKey) {
        const current = zoomRef.current
        const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2
        const next = Math.round(current * factor * 100) / 100
        if (clampZoom(next) !== current) {
          applyZoom(next)
        }
        return
      }

      if (zoomRef.current <= 1) {
        return
      }
      setOffset((current) =>
        clampOffset(
          {
            x: current.x - event.deltaX,
            y: current.y - event.deltaY,
          },
          zoomRef.current
        )
      )
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => {
      el.removeEventListener("wheel", handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, failed])

  useEffect(
    () => () => {
      if (panFrame.current !== null) {
        cancelAnimationFrame(panFrame.current)
      }
    },
    []
  )

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (failed || !image) {
      return
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ignora: alguns navegadores/ponteiros sintéticos não permitem captura.
    }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    const points = [...pointers.current.values()]
    const slop = event.pointerType === "mouse" ? PAN_THRESHOLD : TOUCH_PAN_SLOP
    if (points.length === 2) {
      gesture.current = {
        mode: "pinch",
        moved: true,
        slop,
        startZoom: zoomRef.current,
        startDistance: distance(points[0], points[1]),
        startOffset: offset,
        startPoint: points[0],
      }
      pinchMetrics.current = readBaseMetrics()
      pinchPreview.current = null
      setIsGesturing(true)
    } else {
      gesture.current = {
        mode: "pan",
        moved: false,
        slop,
        startZoom: zoomRef.current,
        startDistance: 0,
        startOffset: offset,
        startPoint: points[0],
      }
      // Medidas fixas durante o arraste: evita relayout a cada movimento.
      panMetrics.current = readMetrics(zoomRef.current)
      panPoint.current = null
      setIsGesturing(true)
    }
  }

  /** Aplica a posição do último movimento, uma vez por frame. */
  const flushPan = () => {
    panFrame.current = null
    const point = panPoint.current
    const g = gesture.current
    if (!point || g.mode !== "pan" || g.startZoom <= 1) {
      return
    }
    panPoint.current = null
    const deltaX = point.x - g.startPoint.x
    const deltaY = point.y - g.startPoint.y
    if (Math.abs(deltaX) < g.slop && Math.abs(deltaY) < g.slop) {
      return
    }
    g.moved = true
    setOffset(
      clampOffset(
        {
          x: g.startOffset.x + deltaX,
          y: g.startOffset.y + deltaY,
        },
        g.startZoom,
        panMetrics.current
      )
    )
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (failed || !image || !pointers.current.has(event.pointerId)) {
      return
    }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    const points = [...pointers.current.values()]
    const g = gesture.current

    if (g.mode === "pinch" && points.length === 2) {
      const nextDistance = distance(points[0], points[1])
      if (g.startDistance > 0) {
        const nextZoom = clampZoom(
          (nextDistance / g.startDistance) * g.startZoom
        )
        const ratio = g.startZoom > 0 ? nextZoom / g.startZoom : 1
        const base = pinchMetrics.current
        // A posição acompanha a escala (mesma conta do estado); com as
        // medidas do início do gesto, nenhuma leitura de layout é feita.
        const nextOffset = clampOffset(
          { x: g.startOffset.x * ratio, y: g.startOffset.y * ratio },
          nextZoom,
          base
            ? {
                rootW: base.rootW,
                rootH: base.rootH,
                contentW: base.baseW * nextZoom,
                contentH: base.baseH * nextZoom,
              }
            : null
        )
        pinchPreview.current = { zoom: nextZoom, offset: nextOffset }
        // Sem re-render por movimento: no WebView do app isso custava mais
        // que a própria rasterização da imagem.
        writeTransform(nextZoom, nextOffset)
      }
      return
    }

    if (g.mode === "pan" && points.length === 1) {
      // Com dois dedos fora da pinça, não arrasta.
      if (pointers.current.size > 1) {
        return
      }
      panPoint.current = points[0]
      if (panFrame.current === null) {
        panFrame.current = requestAnimationFrame(flushPan)
      }
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    // Não perde o último trecho do arraste.
    if (panFrame.current !== null) {
      cancelAnimationFrame(panFrame.current)
      flushPan()
    }
    const wasPinch = gesture.current.mode === "pinch"
    pointers.current.delete(event.pointerId)
    const wasTap = !gesture.current.moved && gesture.current.mode === "pan"
    if (pointers.current.size === 0) {
      gesture.current.mode = "none"
      setIsGesturing(false)

      // Fim da pinça: o zoom que foi escrito no DOM volta para o estado de
      // uma vez só. A posição se ajusta pela mesma proporção já aplicada,
      // então não há salto visual.
      const preview = wasPinch ? pinchPreview.current : null
      pinchPreview.current = null
      pinchMetrics.current = null
      if (preview) {
        writeTransform(preview.zoom, preview.offset)
        if (Math.abs(preview.zoom - zoomRef.current) > 0.001) {
          zoomRef.current = preview.zoom
          onZoomChangeRef.current?.(preview.zoom)
        }
      }
    }

    // Duplo clique/toque alterna 100%/250%. Tratado só aqui (e não no
    // `dblclick`, que no Android dispara depois do toque e desfazia o gesto).
    if (wasTap) {
      const now = Date.now()
      const previous = lastTap.current
      if (
        previous &&
        now - previous.time < DOUBLE_TAP_DELAY &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 30
      ) {
        lastTap.current = null
        toggleZoom()
      } else {
        lastTap.current = { time: now, x: event.clientX, y: event.clientY }
      }
    }
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
      ref={rootRef}
      className="relative flex h-full min-h-64 w-full touch-none items-center justify-center overflow-hidden select-none"
      aria-label="Imagem do item (dê dois cliques ou toques para ampliar e voltar, use dois dedos ou Ctrl com a roda para o zoom, arraste para navegar)"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={wrapperRef}
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isGesturing ? "none" : "transform 120ms ease-out",
          // Camada própria só durante o gesto: evita o custo de compor a
          // imagem gigante a cada frame fora dele.
          willChange: isGesturing ? "transform" : undefined,
        }}
      >
        <img
          ref={frameRef}
          key={`${image.name}-${attempt}`}
          src={src}
          alt={image.title || image.name || "Imagem do item"}
          decoding="async"
          onError={markFailed}
          draggable={false}
          className={cn(
            "max-h-full w-auto max-w-full object-contain",
            zoom > 1 ? "cursor-grab" : "cursor-zoom-in"
          )}
        />
      </div>
    </div>
  )
}
