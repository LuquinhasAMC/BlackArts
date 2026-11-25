import { useCallback, useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { edgeFadeMask } from "@/lib/edge-fade"
import { smoothScrollBy, smoothScrollTo } from "@/lib/smooth-scroll"
import { cn } from "@/lib/utils"

interface PdfPageStripProps {
  /** Documento PDF já carregado pelo visualizador (null enquanto carrega). */
  pdf: PDFDocumentProxy | null
  pageCount: number
  /** Proporção (largura/altura) da primeira página, usada como reserva. */
  aspect: number
  /** Página atual (1-based), destacada e mantida visível. */
  currentPage: number
  onSelect: (page: number) => void
}

/** Altura da miniatura (px). A largura vem da proporção real da página. */
const THUMB_HEIGHT = 64

/**
 * Seletor de páginas do PDF: uma faixa horizontal com a miniatura de cada
 * página (mesma proporção da original), a numeração embaixo, destaque da
 * página atual e rolagem automática até ela.
 *
 * As miniaturas são desenhadas sob demanda (IntersectionObserver com a
 * faixa como raiz), então um documento de centenas de páginas só ocupa
 * memória com as folhas próximas da área visível.
 */
export function PdfPageStrip({
  pdf,
  pageCount,
  aspect,
  currentPage,
  onSelect,
}: PdfPageStripProps) {
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

  // Rola a faixa (não o documento) em uma "página" de itens.
  const scrollByPage = (direction: -1 | 1) => {
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
  }, [updateEdges, pageCount])

  // Mantém a página atual visível na faixa (rolagem própria, sem mexer na
  // página do navegador).
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) {
      return
    }
    const active = strip.querySelector<HTMLElement>(
      `[data-page-thumb="${currentPage}"]`
    )
    if (!active) {
      return
    }
    const target =
      active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2
    smoothScrollTo(strip, Math.max(0, target))
    updateEdges()
  }, [currentPage, pageCount, updateEdges])

  // Desenha as miniaturas conforme elas entram na faixa.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip || !pdf) {
      return
    }
    let cancelled = false
    const buttons = Array.from(
      strip.querySelectorAll<HTMLElement>("[data-page-thumb]")
    )

    // Documento recarregado: descarta as miniaturas anteriores.
    for (const button of buttons) {
      button.querySelector("[data-thumb-slot]")?.replaceChildren()
      delete button.dataset.thumbReady
      delete button.dataset.thumbLoading
    }

    const renderThumb = async (button: HTMLElement, pageNumber: number) => {
      if (button.dataset.thumbReady === "1") {
        return
      }
      button.dataset.thumbLoading = "1"
      const slot = button.querySelector<HTMLElement>("[data-thumb-slot]")
      const frame = button.querySelector<HTMLElement>("[data-thumb-frame]")
      try {
        const page = await pdf.getPage(pageNumber)
        if (cancelled) {
          return
        }
        if (!slot || !frame) {
          return
        }
        const base = page.getViewport({ scale: 1 })
        // Ajusta o formato da miniatura ao da página (páginas em paisagem
        // não ficam achatadas).
        frame.style.aspectRatio = `${base.width} / ${base.height}`
        const width = slot.clientWidth
        if (!width) {
          return
        }
        const scale = width / base.width
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(base.width * scale * dpr))
        canvas.height = Math.max(1, Math.round(base.height * scale * dpr))
        canvas.className = "block size-full bg-white"
        const context = canvas.getContext("2d")
        if (!context) {
          return
        }
        await page.render({
          canvasContext: context,
          viewport: page.getViewport({ scale: scale * dpr }),
        }).promise
        if (cancelled) {
          return
        }
        slot.replaceChildren(canvas)
        button.dataset.thumbReady = "1"
      } catch (error) {
        // Miniatura é só apoio visual: a folha branca continua servindo.
        // Ao desmontar/trocar de documento o render é cancelado, então não
        // vale avisar (o erro seria só o worker encerrado).
        if (!cancelled) {
          console.warn("Falha ao gerar miniatura da página", pageNumber, error)
        }
      } finally {
        delete button.dataset.thumbLoading
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          const button = entry.target as HTMLElement
          observer.unobserve(button)
          void renderThumb(button, Number(button.dataset.pageThumb))
        }
      },
      // Pré-carrega as miniaturas das laterais antes de aparecerem.
      { root: strip, rootMargin: "0px 320px" }
    )

    for (const button of buttons) {
      observer.observe(button)
    }

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [pdf, pageCount])

  return (
    <div className="flex items-center gap-0.5 px-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => scrollByPage(-1)}
        disabled={edges.start}
        // Sem conteúdo para rolar: a seta some (o espaço fica reservado
        // para a faixa não mudar de largura e a rolagem não pular).
        className={cn(edges.start && "invisible")}
        aria-label="Rolar as páginas para a esquerda"
      >
        <ChevronLeft aria-hidden />
      </Button>
      <div
        ref={stripRef}
        onScroll={updateEdges}
        // Sem barra de rolagem: a faixa rola no toque/roda/setas sem a
        // barra do navegador cobrindo as miniaturas. A máscara desvanece a
        // lateral que ainda tem páginas, em vez de cortar a miniatura.
        style={edgeFadeMask(edges.start, edges.end)}
        className="relative flex min-w-0 flex-1 [scrollbar-width:none] items-start gap-2 overflow-x-auto overscroll-x-contain px-1 pt-2 pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: pageCount }, (_, index) => {
          const page = index + 1
          const active = page === currentPage
          return (
            <button
              key={page}
              type="button"
              data-page-thumb={page}
              onClick={() => onSelect(page)}
              aria-label={`Ir para a página ${page} de ${pageCount}`}
              aria-current={active ? "page" : undefined}
              className="flex shrink-0 flex-col items-center gap-1 outline-none"
            >
              <span
                data-thumb-frame
                className={cn(
                  // Só a página atual ganha moldura: as demais são a própria
                  // folha (sem anel branco em volta), em opacidade reduzida.
                  "relative block overflow-hidden rounded-sm bg-white transition-[box-shadow,opacity]",
                  active
                    ? "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background"
                    : "opacity-65 hover:opacity-100"
                )}
                style={{
                  height: THUMB_HEIGHT,
                  aspectRatio: String(aspect || 1),
                }}
              >
                <span data-thumb-slot className="block size-full" />
              </span>
              <span
                className={cn(
                  "text-[10px] leading-none tabular-nums",
                  active
                    ? "font-semibold text-foreground"
                    : "text-foreground/60"
                )}
              >
                {page}
              </span>
            </button>
          )
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => scrollByPage(1)}
        disabled={edges.end}
        className={cn(edges.end && "invisible")}
        aria-label="Rolar as páginas para a direita"
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  )
}
