import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { edgeFadeMask } from "@/lib/edge-fade"
import { cn } from "@/lib/utils"

interface ScrollRowProps {
  children: ReactNode
  /** Nome acessível da fileira (usado nos rótulos das setas). */
  ariaLabel: string
  /** Espaço entre os itens, em px (o mesmo valor do gap do flex). */
  gap: number
  /** Classes do contêiner rolável (gap, padding, etc.). */
  className?: string
}

/** Quantos itens a seta avança por clique, conforme a largura da tela. */
function cardsPerPage(): number {
  if (typeof window === "undefined") {
    return 2
  }
  if (window.innerWidth < 640) {
    return 2
  }
  if (window.innerWidth < 1024) {
    return 3
  }
  return 4
}

/**
 * Rolagem horizontal com desvanecimento (em transparência, como nos seletores
 * de foto/página) e setas nas bordas sempre que houver mais itens fora da
 * área visível.
 */
export function ScrollRow({
  children,
  ariaLabel,
  gap,
  className,
}: ScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const updateEdges = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const max = el.scrollWidth - el.clientWidth
    // O `snap-start` e o padding lateral fazem o contêiner já abrir com alguns
    // pixels de rolagem; descontar o padding (com uma pequena tolerância)
    // evita mostrar seta/máscara quando ainda há só folga, sem conteúdo.
    const styles = window.getComputedStyle(el)
    const padLeft = parseFloat(styles.paddingLeft) || 0
    const padRight = parseFloat(styles.paddingRight) || 0
    const left = el.scrollLeft > padLeft + 4
    const right = el.scrollLeft < max - padRight - 4
    // Só atualiza quando algo muda, para não re-renderizar em loop.
    setEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    )
  }, [])

  useEffect(() => {
    updateEdges()
    const el = scrollRef.current
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
  }, [updateEdges, children])

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const firstItem = el.firstElementChild as HTMLElement | null
    const itemWidth = firstItem?.offsetWidth ?? 160
    el.scrollBy({
      left: direction * cardsPerPage() * (itemWidth + gap),
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        data-scroll-container
        onScroll={updateEdges}
        // A máscara desvanece a lateral em transparência, deixando aparecer o
        // que está atrás (fundo da página ou degradê do card), sem pintar uma
        // faixa opaca na cor do fundo.
        // Desvanecimento mais largo que o padrão (20px) para o corte das
        // obras nas pontas ficar bem suave.
        style={edgeFadeMask(!edges.left, !edges.right, 40)}
        className={cn(
          // O padding dá espaço para borda/sombra dos itens, que a
          // rolagem cortava nas bordas (topo e laterais).
          // `scroll-px-2` faz o snap respeitar esse padding: sem ele o
          // WebView já abre com a faixa deslocada e corta o primeiro item.
          // `overscroll-x-contain` remove o efeito de estilingue do Android
          // (o conteúdo esticava/cortava ao puxar além das pontas).
          "flex snap-x scroll-px-2 [scrollbar-width:none] flex-nowrap overflow-x-auto overscroll-x-contain px-2 py-1.5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {children}
      </div>

      {edges.left && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label={`Rolar ${ariaLabel} para a esquerda`}
          className="absolute top-1/2 left-1 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border backdrop-blur transition-colors hover:bg-background"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label={`Rolar ${ariaLabel} para a direita`}
          className="absolute top-1/2 right-1 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border backdrop-blur transition-colors hover:bg-background"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  )
}
