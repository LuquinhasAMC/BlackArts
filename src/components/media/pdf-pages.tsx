import { useCallback, useEffect, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { FileText, Loader2 } from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// O worker é embutido no bundle e servido por um blob. No app (Capacitor) os
// arquivos vêm do servidor local do WebView; quando o worker não sobe por lá,
// o pdf.js cai silenciosamente num "fake worker" na thread principal, que é
// justamente o que trava o celular (a tela roda bem no navegador).
import workerCode from "pdfjs-dist/build/pdf.worker.min.mjs?raw"

pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
  new Blob([workerCode], { type: "text/javascript" })
)

interface PdfPagesProps {
  /** URL do PDF (arquivo do Internet Archive). */
  url: string
  /** Nível de zoom controlado pela bottom bar (1 = original). */
  zoom?: number
  /** Atualiza o zoom (gestos no visualizador e bottom bar). */
  onZoomChange?: (zoom: number) => void
  /** Informa quantidade de páginas e proporção (largura/altura) da primeira. */
  onPageInfo?: (info: { count: number; aspect: number }) => void
  /** Página atual (1-based), reportada conforme a rolagem. */
  currentPage?: number
  onCurrentPageChange?: (page: number) => void
  /** Documento carregado (usado pelas miniaturas do seletor de páginas). */
  onDocumentReady?: (pdf: PDFDocumentProxy | null) => void
  /** Pedido de rolagem até uma página (nonce evita ignorar repetição). */
  requestedPage?: { page: number; nonce: number } | null
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 4
const DOUBLE_TAP_ZOOM = 2
const PAN_THRESHOLD = 6
const TOUCH_PAN_SLOP = 16
const DOUBLE_TAP_DELAY = 320
const RENDER_MARGIN = 500
const TEXT_MARGIN = 120
const PAGE_GAP = 8

// Cada página vira um canvas com DPR vezes mais pixels. Em telas 3x isso são
// ~2.4 milhões de pixels por página (+ a cópia rasterizada no zoom): no
// navegador passa, no WebView do app estoura memória/rasterização e a pinça
// trava. 2x continua nítido para texto e corta mais da metade do trabalho.
const MAX_PIXEL_RATIO = 2

type Status = "loading" | "ready" | "error"

export function PdfPages({
  url,
  zoom = 1,
  onZoomChange,
  onPageInfo,
  currentPage: _currentPage,
  onCurrentPageChange,
  onDocumentReady,
  requestedPage,
}: PdfPagesProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [liveZoom, setLiveZoom] = useState(zoom)
  const [prevZoomProp, setPrevZoomProp] = useState(zoom)
  const [status, setStatus] = useState<Status>("loading")
  const [numPages, setNumPages] = useState(0)
  const [pageAspect, setPageAspect] = useState(0.75)
  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set())
  const [textPages, setTextPages] = useState<Set<number>>(() => new Set())
  const [containerWidth, setContainerWidth] = useState(0)
  const containerWidthRef = useRef(0)
  containerWidthRef.current = containerWidth
  const pageAspectRef = useRef(0.75)
  pageAspectRef.current = pageAspect

  const rootRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const offsetRef = useRef({ x: 0, y: 0 })
  const statusRef = useRef(status)
  statusRef.current = status
  const numPagesRef = useRef(numPages)
  numPagesRef.current = numPages
  const onZoomChangeRef = useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange
  const onPageInfoRef = useRef(onPageInfo)
  onPageInfoRef.current = onPageInfo
  const onCurrentPageChangeRef = useRef(onCurrentPageChange)
  onCurrentPageChangeRef.current = onCurrentPageChange
  const onDocumentReadyRef = useRef(onDocumentReady)
  onDocumentReadyRef.current = onDocumentReady
  const lastReportedPage = useRef(1)
  const lastRequestNonce = useRef<number | null>(null)
  const pagePosCache = useRef<
    { page: number; top: number; bottom: number }[] | null
  >(null)
  const contentSize = useRef<{ w: number; h: number } | null>(null)
  const [isGesturing, setIsGesturing] = useState(false)
  const isGesturingRef = useRef(false)
  const panFrame = useRef<number | null>(null)
  const panPoint = useRef<{ x: number; y: number } | null>(null)
  const panMetrics = useRef<{
    rootW: number
    rootH: number
    contentW: number
    contentH: number
  } | null>(null)
  // Inércia ao soltar o dedo: sem isso o documento para "seco" e não dá
  // para dar um fling vertical para rolar rápido.
  const momentumFrame = useRef<number | null>(null)
  const velocity = useRef({ x: 0, y: 0 })
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null)

  const pointers = useRef<
    Map<number, { x: number; y: number; target: EventTarget | null }>
  >(new Map())
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
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const visibleTimer = useRef<number | null>(null)
  const scheduleVisibleUpdateRef = useRef<() => void>(() => {})

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    []
  )

  const readMetrics = useCallback((zoomValue: number) => {
    const root = rootRef.current
    const pages = pagesRef.current
    if (!root || !pages) return null
    const baseW = contentSize.current?.w ?? pages.offsetWidth
    const baseH = contentSize.current?.h ?? pages.offsetHeight
    return {
      rootW: root.clientWidth,
      rootH: root.clientHeight,
      contentW: baseW * zoomValue,
      contentH: baseH * zoomValue,
    }
  }, [])

  const clampOffset = useCallback(
    (
      offsetValue: { x: number; y: number },
      zoomValue: number,
      cached?: {
        rootW: number
        rootH: number
        contentW: number
        contentH: number
      } | null
    ) => {
      const metrics = cached ?? readMetrics(zoomValue)
      if (!metrics) return offsetValue
      const { rootW, rootH, contentW, contentH } = metrics
      let x = offsetValue.x
      let y = offsetValue.y
      if (contentW <= rootW) {
        x = 0
      } else {
        const limitX = (contentW - rootW) / 2
        x = Math.min(limitX, Math.max(-limitX, x))
      }
      if (contentH <= rootH) {
        y = 0
      } else {
        y = Math.min(0, Math.max(rootH - contentH, y))
      }
      return { x, y }
    },
    [readMetrics]
  )

  const setTransformDirect = useCallback(
    (ox: number, oy: number, z: number, gesturing: boolean) => {
      const el = transformRef.current
      if (!el) return
      el.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${z})`
      el.style.transition = gesturing ? "none" : "transform 120ms ease-out"
    },
    []
  )

  // Fim da inércia: chamado ao tocar de novo, ao trocar de documento e quando
  // o fling perde velocidade. Fica aqui (e não junto dos outros gestos) porque
  // o efeito de reset do documento usa esta função.
  const stopMomentum = useCallback(() => {
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current)
      momentumFrame.current = null
    }
    velocity.current = { x: 0, y: 0 }
  }, [])

  const applyZoom = useCallback(
    (value: number) => {
      const next = clampZoom(value)
      const prev = zoomRef.current
      if (Math.abs(next - prev) < 0.001) return
      const ratio = prev > 0 ? next / prev : 1
      const nextOffset = clampOffset(
        { x: offsetRef.current.x * ratio, y: offsetRef.current.y * ratio },
        next
      )
      zoomRef.current = next
      offsetRef.current = nextOffset
      if (isGesturingRef.current) {
        setTransformDirect(nextOffset.x, nextOffset.y, next, true)
        scheduleVisibleUpdateRef.current()
        return
      }
      setLiveZoom(next)
      setOffset(nextOffset)
      onZoomChangeRef.current?.(next)
    },
    [clampZoom, clampOffset, setTransformDirect]
  )

  const toggleZoom = useCallback(() => {
    const current = zoomRef.current
    const next = Math.abs(current - 1) < 0.01 ? DOUBLE_TAP_ZOOM : 1
    window.getSelection()?.removeAllRanges()
    applyZoom(next)
  }, [applyZoom])

  // Sync external zoom prop
  if (prevZoomProp !== zoom) {
    setPrevZoomProp(zoom)
    if (Math.abs(zoom - zoomRef.current) > 0.001) {
      const ratio = zoomRef.current > 0 ? zoom / zoomRef.current : 1
      const nextOffset = clampOffset(
        { x: offsetRef.current.x * ratio, y: offsetRef.current.y * ratio },
        zoom
      )
      zoomRef.current = zoom
      offsetRef.current = nextOffset
      setLiveZoom(zoom)
      setOffset(nextOffset)
    }
  }

  // Reset on URL change
  useEffect(() => {
    stopMomentum()
    setStatus("loading")
    setNumPages(0)
    setVisiblePages(new Set())
    setTextPages(new Set())
    offsetRef.current = { x: 0, y: 0 }
    setOffset({ x: 0, y: 0 })
    contentSize.current = null
    pagePosCache.current = null
    lastReportedPage.current = 1
    lastRequestNonce.current = null
    onDocumentReadyRef.current?.(null)
  }, [url, stopMomentum])

  // Measure container width for react-pdf Page
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const update = () => {
      const w = root.clientWidth
      setContainerWidth((prev) => (prev === w ? prev : w))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // Cache content size
  useEffect(() => {
    const pages = pagesRef.current
    if (!pages || status !== "ready") return
    const measure = () => {
      contentSize.current = { w: pages.offsetWidth, h: pages.offsetHeight }
      pagePosCache.current = null
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(pages)
    return () => ro.disconnect()
  }, [status, numPages])

  const updateVisiblePages = useCallback(() => {
    const root = rootRef.current
    const total = numPagesRef.current
    const pageW = Math.max(200, containerWidthRef.current - 16)
    const aspect = pageAspectRef.current
    if (!root || statusRef.current !== "ready" || total < 1 || aspect <= 0)
      return
    const pageH = pageW / aspect
    const gap = PAGE_GAP
    const padTop = 16
    const z = zoomRef.current
    const oy = offsetRef.current.y
    const rootH = root.clientHeight
    // Viewport in content coords
    const viewTop = (-oy - RENDER_MARGIN) / z
    const viewBottom = (-oy + rootH + RENDER_MARGIN) / z
    const textTop = (-oy - TEXT_MARGIN) / z
    const textBottom = (-oy + rootH + TEXT_MARGIN) / z

    const firstVisible = Math.max(
      1,
      Math.floor((viewTop - padTop) / (pageH + gap)) + 1
    )
    const lastVisible = Math.min(
      total,
      Math.ceil((viewBottom - padTop) / (pageH + gap)) + 1
    )
    const firstText = Math.max(
      1,
      Math.floor((textTop - padTop) / (pageH + gap)) + 1
    )
    const lastText = Math.min(
      total,
      Math.ceil((textBottom - padTop) / (pageH + gap)) + 1
    )

    // Renderiza um pouco além da janela visível para reduzir remontagens e
    // o aparecimento da página anterior durante a rolagem rápida.
    const renderFirst = Math.max(1, firstVisible - 1)
    const renderLast = Math.min(total, lastVisible + 1)

    const nextVisible = new Set<number>()
    for (let p = renderFirst; p <= renderLast; p += 1) nextVisible.add(p)
    const nextText = new Set<number>()
    for (let p = firstText; p <= lastText; p += 1) nextText.add(p)

    setVisiblePages((prev) => {
      if (
        prev.size === nextVisible.size &&
        [...prev].every((p) => nextVisible.has(p))
      )
        return prev
      return nextVisible
    })
    // Não desmonta a camada de texto durante gestos: cancelar uma renderização
    // em andamento gera AbortException e derruba o desempenho no celular.
    if (isGesturingRef.current) return
    // A camada de texto é “pegajosa”: uma vez montada numa página, permanece
    // enquanto a página estiver montada (só sai junto com o <Page />), para
    // não cancelar/reiniciar a renderização do texto a cada rolagem.
    setTextPages((prev) => {
      const next = new Set<number>()
      for (const p of prev) if (nextVisible.has(p)) next.add(p)
      for (const p of nextText) next.add(p)
      if (prev.size === next.size && [...prev].every((p) => next.has(p)))
        return prev
      return next
    })
  }, [])

  const scheduleVisibleUpdate = useCallback(() => {
    if (visibleTimer.current !== null) return
    visibleTimer.current = window.setTimeout(() => {
      visibleTimer.current = null
      updateVisiblePages()
    }, 140)
  }, [updateVisiblePages])
  scheduleVisibleUpdateRef.current = scheduleVisibleUpdate

  // Update visible pages on scroll/zoom/resize
  useEffect(() => {
    if (status !== "ready") return
    updateVisiblePages()
    const onResize = () => scheduleVisibleUpdate()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [status, updateVisiblePages, scheduleVisibleUpdate])

  useEffect(() => {
    if (status !== "ready") return
    scheduleVisibleUpdate()
  }, [offset, liveZoom, status, scheduleVisibleUpdate])

  // Report current page
  useEffect(() => {
    if (status !== "ready" || numPages < 1) return
    const root = rootRef.current
    if (!root) return
    const pageW = Math.max(200, containerWidthRef.current - 16)
    const aspect = pageAspectRef.current
    if (aspect <= 0) return
    const pageH = pageW / aspect
    const gap = PAGE_GAP
    const padTop = 16
    const viewportCenter = (-offset.y + root.clientHeight / 2) / liveZoom
    const current = Math.min(
      numPages,
      Math.max(
        1,
        Math.round((viewportCenter - padTop - pageH / 2) / (pageH + gap)) + 1
      )
    )
    if (current !== lastReportedPage.current) {
      lastReportedPage.current = current
      onCurrentPageChangeRef.current?.(current)
    }
  }, [offset.y, liveZoom, status, numPages])

  // Scroll to requested page
  useEffect(() => {
    if (!requestedPage || status !== "ready") return
    if (requestedPage.nonce === lastRequestNonce.current) return
    lastRequestNonce.current = requestedPage.nonce
    const pageW = Math.max(200, containerWidthRef.current - 16)
    const aspect = pageAspectRef.current
    if (aspect <= 0) return
    const pageH = pageW / aspect
    const gap = PAGE_GAP
    const padTop = 16
    const pageTop = padTop + (requestedPage.page - 1) * (pageH + gap)
    const margin = 16
    const targetY = -(pageTop - margin) * liveZoom
    const next = clampOffset({ x: offsetRef.current.x, y: targetY }, liveZoom)
    offsetRef.current = next
    setOffset(next)
  }, [requestedPage, status, liveZoom, clampOffset])

  // Wheel handler
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let wheelCommit: number | null = null
    const commitWheel = () => {
      wheelCommit = null
      setLiveZoom(zoomRef.current)
      setOffset({ ...offsetRef.current })
      onZoomChangeRef.current?.(zoomRef.current)
      scheduleVisibleUpdateRef.current()
    }
    const handler = (event: WheelEvent) => {
      if (statusRef.current !== "ready") return
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        const current = zoomRef.current
        const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2
        const clamped = clampZoom(Math.round(current * factor * 100) / 100)
        if (clamped !== current) {
          const ratio = current > 0 ? clamped / current : 1
          const nextOffset = clampOffset(
            { x: offsetRef.current.x * ratio, y: offsetRef.current.y * ratio },
            clamped
          )
          zoomRef.current = clamped
          offsetRef.current = nextOffset
          setTransformDirect(nextOffset.x, nextOffset.y, clamped, false)
          scheduleVisibleUpdateRef.current()
          if (wheelCommit !== null) window.clearTimeout(wheelCommit)
          wheelCommit = window.setTimeout(commitWheel, 140)
        }
        return
      }
      const next = clampOffset(
        { x: offsetRef.current.x, y: offsetRef.current.y - event.deltaY },
        zoomRef.current
      )
      offsetRef.current = next
      setTransformDirect(next.x, next.y, zoomRef.current, false)
      scheduleVisibleUpdateRef.current()
      if (wheelCommit !== null) window.clearTimeout(wheelCommit)
      wheelCommit = window.setTimeout(commitWheel, 140)
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => {
      if (wheelCommit !== null) window.clearTimeout(wheelCommit)
      el.removeEventListener("wheel", handler)
    }
  }, [clampZoom, clampOffset, setTransformDirect, scheduleVisibleUpdate])

  useEffect(
    () => () => {
      if (panFrame.current !== null) cancelAnimationFrame(panFrame.current)
      if (momentumFrame.current !== null)
        cancelAnimationFrame(momentumFrame.current)
      if (visibleTimer.current !== null)
        window.clearTimeout(visibleTimer.current)
    },
    []
  )

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const isOnText = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest(".textLayer"))

  const commitGesture = useCallback(() => {
    const finalZoom = zoomRef.current
    const finalOffset = { ...offsetRef.current }
    rootRef.current?.removeAttribute("data-pinching")
    setLiveZoom(finalZoom)
    setOffset(finalOffset)
    setIsGesturing(false)
    onZoomChangeRef.current?.(finalZoom)
    scheduleVisibleUpdate()
  }, [scheduleVisibleUpdate])

  const startMomentum = useCallback(() => {
    // Só cancela um fling anterior — a velocidade medida no arraste é
    // justamente o que a inércia precisa (stopMomentum() a zeraria).
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current)
      momentumFrame.current = null
    }
    const metrics = readMetrics(zoomRef.current)
    let lastT = performance.now()
    const friction = 0.0018 // maior = para mais rápido
    const minSpeed = 0.04 // px/ms; abaixo disso encerra

    const step = (now: number) => {
      const dt = Math.min(now - lastT, 48)
      lastT = now
      const v = velocity.current
      const decay = Math.exp(-friction * dt)
      v.x *= decay
      v.y *= decay
      if (Math.hypot(v.x, v.y) < minSpeed) {
        momentumFrame.current = null
        isGesturingRef.current = false
        commitGesture()
        return
      }
      const current = offsetRef.current
      const next = clampOffset(
        { x: current.x + v.x * dt, y: current.y + v.y * dt },
        zoomRef.current,
        metrics
      )
      // Chegou na ponta do documento: encerra como um scroll nativo.
      if (next.x === current.x && next.y === current.y) {
        momentumFrame.current = null
        isGesturingRef.current = false
        commitGesture()
        return
      }
      offsetRef.current = next
      setTransformDirect(next.x, next.y, zoomRef.current, true)
      scheduleVisibleUpdate()
      momentumFrame.current = requestAnimationFrame(step)
    }
    isGesturingRef.current = true
    setIsGesturing(true)
    momentumFrame.current = requestAnimationFrame(step)
  }, [
    readMetrics,
    clampOffset,
    setTransformDirect,
    scheduleVisibleUpdate,
    commitGesture,
  ])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (status !== "ready") return
    if (event.pointerType === "mouse" && isOnText(event.target)) return
    // Interrompe a inércia de um fling anterior ao tocar de novo.
    stopMomentum()
    lastMove.current = null
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      target: event.target,
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
        startOffset: { ...offsetRef.current },
        startPoint: points[0],
      }
      isGesturingRef.current = true
      setIsGesturing(true)
      // O texto sai da rasterização enquanto a pinça roda (ver globals.css).
      rootRef.current?.setAttribute("data-pinching", "true")
    } else {
      gesture.current = {
        mode: "pan",
        moved: false,
        slop,
        startZoom: zoomRef.current,
        startDistance: 0,
        startOffset: { ...offsetRef.current },
        startPoint: points[0],
      }
      panMetrics.current = readMetrics(zoomRef.current)
      panPoint.current = null
    }
  }

  const flushPan = () => {
    panFrame.current = null
    const point = panPoint.current
    const g = gesture.current
    if (!point || g.mode !== "pan") return
    panPoint.current = null
    let deltaX = point.x - g.startPoint.x
    let deltaY = point.y - g.startPoint.y
    if (!g.moved) {
      if (Math.abs(deltaX) < g.slop && Math.abs(deltaY) < g.slop) return
      g.moved = true
      // Desconta o slop do início: o documento começa a andar de onde o dedo
      // cruzou o limiar, sem o pulo seco dos primeiros 16px.
      g.startPoint = {
        x:
          g.startPoint.x +
          Math.sign(deltaX) * Math.min(Math.abs(deltaX), g.slop),
        y:
          g.startPoint.y +
          Math.sign(deltaY) * Math.min(Math.abs(deltaY), g.slop),
      }
      deltaX = point.x - g.startPoint.x
      deltaY = point.y - g.startPoint.y
      if (!isGesturingRef.current) {
        isGesturingRef.current = true
        setIsGesturing(true)
      }
    }
    const nextOffset = clampOffset(
      { x: g.startOffset.x + deltaX, y: g.startOffset.y + deltaY },
      g.startZoom,
      panMetrics.current
    )
    offsetRef.current = nextOffset
    setTransformDirect(nextOffset.x, nextOffset.y, g.startZoom, true)
    scheduleVisibleUpdate()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (status !== "ready" || !pointers.current.has(event.pointerId)) return
    const prev = pointers.current.get(event.pointerId)
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      target: prev?.target ?? event.target,
    })
    const points = [...pointers.current.values()]
    const g = gesture.current
    if (g.mode === "pinch" && points.length === 2) {
      const nextDistance = distance(points[0], points[1])
      if (g.startDistance > 0) {
        applyZoom((nextDistance / g.startDistance) * g.startZoom)
      }
      return
    }
    if (g.mode === "pan" && points.length === 1) {
      if (pointers.current.size > 1) return
      const p = points[0]
      // Velocidade para a inércia ao soltar (fling).
      const now = performance.now()
      const last = lastMove.current
      if (last) {
        const dt = now - last.t
        if (dt > 0 && dt < 120) {
          const vx = (p.x - last.x) / dt
          const vy = (p.y - last.y) / dt
          // Suaviza para não herdar um pico isolado.
          const v = velocity.current
          const a = dt > 40 ? 0.55 : 0.35
          v.x = v.x * (1 - a) + vx * a
          v.y = v.y * (1 - a) + vy * a
        }
      }
      lastMove.current = { x: p.x, y: p.y, t: now }
      panPoint.current = p
      if (panFrame.current === null) {
        panFrame.current = requestAnimationFrame(flushPan)
      }
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panFrame.current !== null) {
      cancelAnimationFrame(panFrame.current)
      flushPan()
    }
    pointers.current.delete(event.pointerId)
    const wasTap = !gesture.current.moved && gesture.current.mode === "pan"
    const wasPan = gesture.current.moved && gesture.current.mode === "pan"
    if (pointers.current.size === 0) {
      gesture.current.mode = "none"
      if (isGesturingRef.current) {
        // Fling: mantém a rolagem depois que o dedo sai, como um scroll
        // nativo. Só no arraste (pan) — pinch termina seco.
        const v = velocity.current
        const speed = Math.hypot(v.x, v.y)
        const recent = lastMove.current
          ? performance.now() - lastMove.current.t < 110
          : false
        if (wasPan && recent && speed > 0.12) {
          // startMomentum cuida do fim do gesto ao desacelerar.
          startMomentum()
        } else {
          velocity.current = { x: 0, y: 0 }
          isGesturingRef.current = false
          commitGesture()
        }
      }
    }
    // Double tap
    if (wasTap && pointers.current.size === 0) {
      const now = Date.now()
      const last = lastTap.current
      if (
        last &&
        now - last.time < DOUBLE_TAP_DELAY &&
        distance({ x: event.clientX, y: event.clientY }, last) < 40
      ) {
        lastTap.current = null
        toggleZoom()
        return
      }
      lastTap.current = { time: now, x: event.clientX, y: event.clientY }
    }
  }

  const onDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages)
      setStatus("ready")
      onDocumentReadyRef.current?.(pdf)
      // Get first page aspect
      void pdf.getPage(1).then((page) => {
        const viewport = page.getViewport({ scale: 1 })
        const aspect = viewport.width / viewport.height
        setPageAspect(aspect)
        onPageInfoRef.current?.({ count: pdf.numPages, aspect })
      })
      window.setTimeout(() => updateVisiblePages(), 50)
    },
    [updateVisiblePages]
  )

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Falha ao carregar PDF", error)
    setStatus("error")
  }, [])

  const pageWidth = Math.max(200, containerWidth - 16)
  const pixelRatio = Math.min(
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    MAX_PIXEL_RATIO
  )
  const pageHeight = pageWidth / (pageAspect > 0 ? pageAspect : 0.75)
  // Só as páginas da janela existem no DOM; os espaçadores mantêm a altura
  // total do documento (e portanto a rolagem/posição de cada página).
  const renderedPages = [...visiblePages].sort((a, b) => a - b)
  const firstRendered = renderedPages[0] ?? 0
  const lastRendered = renderedPages[renderedPages.length - 1] ?? 0
  const rowHeight = pageHeight + PAGE_GAP
  // Espaçadores consideram apenas as páginas visíveis (janela estreita) para
  // manter a posição do scroll correta; as páginas do buffer ficam dentro.
  const spacerTop = firstRendered
    ? Math.max(0, (firstRendered - 1) * rowHeight - PAGE_GAP)
    : Math.max(0, numPages * rowHeight - PAGE_GAP)
  const spacerBottom = lastRendered
    ? Math.max(0, (numPages - lastRendered) * rowHeight - PAGE_GAP)
    : 0

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-64 w-full touch-none overflow-hidden"
      aria-label="Documento PDF do item (dê dois cliques ou toques para ampliar e voltar, use dois dedos ou Ctrl com a roda para o zoom, arraste para navegar)"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={transformRef}
        className="flex min-h-full w-full justify-center"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${liveZoom})`,
          transformOrigin: "top center",
          transition: isGesturing ? "none" : "transform 120ms ease-out",
          // Durante o gesto a camada fica promovida e é reutilizada como textura:
          // re-rasterizar as páginas a cada frame de pinça é o que engasga no app.
          willChange: isGesturing ? "transform" : "auto",
        }}
      >
        <div
          ref={pagesRef}
          className="relative flex w-full max-w-4xl flex-col items-center gap-2 px-2 py-4"
        >
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
            className="flex w-full flex-col items-center gap-2"
          >
            {spacerTop > 0 ? (
              // Chaves estáveis: sem elas o React reaproveita os nós por
              // posição quando o espaçador aparece/some, e o canvas de uma
              // página pode acabar exibindo a anterior durante a rolagem.
              <div
                key="spacer-top"
                aria-hidden
                className="w-full flex-shrink-0"
                style={{ height: spacerTop }}
              />
            ) : null}
            {renderedPages.map((pageNumber) => (
              <div
                key={`page-${pageNumber}`}
                data-page={String(pageNumber)}
                className="relative w-full flex-shrink-0 bg-white shadow-sm"
                style={{ aspectRatio: String(pageAspect) }}
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth}
                  devicePixelRatio={pixelRatio}
                  renderTextLayer={textPages.has(pageNumber)}
                  renderAnnotationLayer={false}
                  loading={
                    <div className="flex h-full w-full items-center justify-center bg-white">
                      <Loader2
                        className="size-5 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  }
                  className="w-full [&>canvas]:!h-auto [&>canvas]:!w-full"
                />
              </div>
            ))}
            {spacerBottom > 0 ? (
              <div
                key="spacer-bottom"
                aria-hidden
                className="w-full flex-shrink-0"
                style={{ height: spacerBottom }}
              />
            ) : null}
          </Document>
        </div>
      </div>

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Carregando documento…
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <FileText className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Não foi possível exibir o PDF</p>
          <p className="max-w-md text-sm text-muted-foreground">
            O servidor de arquivos do Internet Archive pode estar lento ou
            bloqueado na sua rede.
          </p>
        </div>
      )}
    </div>
  )
}
