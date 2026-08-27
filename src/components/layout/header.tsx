import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Top bar fixa. Na tela inicial (rota "/", sem busca ativa), enquanto a
 * página está no topo ela fica 100% transparente — o card de destaque
 * aparece por baixo. Ao rolar para baixo (ou em qualquer outra rota),
 * ganha a cor sólida do fundo (`bg-background` puro, sem transparência),
 * com um degradê transparente se estendendo abaixo da barra (efeito de
 * mistura/sombra com o conteúdo que passa por baixo).
 *
 * A transparência depende só da posição de rolagem real: qualquer
 * rolagem (> 24px de tolerância para a barra de URL/navegação do
 * celular) deixa a barra sólida. Para funcionar de forma determinística,
 * o layout reseta a rolagem ao trocar de rota — assim a tela inicial
 * sempre "nasce" no topo.
 */
export function Header() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [heroUnderBar, setHeroUnderBar] = useState(false)

  // A transparência só existe na tela inicial sem busca ativa.
  const isHomeFeed = location.pathname === "/" && !location.search

  useEffect(() => {
    // Pequena tolerância para a barra de URL/navegação do celular.
    const TOP_TOLERANCE = 24
    const HEADER_HEIGHT = 56 // h-14 (3.5rem)

    const update = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0
      setScrolled(top > TOP_TOLERANCE)

      // Rede de segurança: a transparência só faz sentido se o card de
      // destaque estiver de fato sob a barra. Se o card ainda não montou
      // (Suspense) ou já saiu da tela, mantém a cor sólida — o observer
      // e o intervalo reavaliam quando ele aparecer.
      const hero = document.querySelector("[data-featured-hero]")
      if (hero) {
        const rect = hero.getBoundingClientRect()
        setHeroUnderBar(
          rect.top <= HEADER_HEIGHT + TOP_TOLERANCE && rect.bottom > 0
        )
      }
    }

    // Estado correto no mount e a cada troca de rota.
    update()

    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update, { passive: true })

    // Reavalia quando o card de destaque monta (a home é lazy/Suspense)
    // e após o primeiro paint (restauração de rolagem tardia).
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true })
    const raf = window.requestAnimationFrame(update)

    // Fallback periódico para mudanças de layout/rota tardias.
    const interval = window.setInterval(update, 300)

    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      observer.disconnect()
      window.cancelAnimationFrame(raf)
      window.clearInterval(interval)
    }
  }, [isHomeFeed])

  const transparent = isHomeFeed && !scrolled && heroUnderBar

  return (
    <header
      className={cn(
        "relative sticky top-0 z-40 pt-safe transition-colors duration-300",
        transparent ? "bg-transparent" : "bg-background"
      )}
    >
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            // Quando a barra está transparente sobre o card de destaque,
            // os elementos ganham um fundo translúcido para continuarem
            // legíveis sobre a imagem.
            transparent &&
              "bg-background/40 pr-3 ring-1 ring-foreground/10 backdrop-blur-sm"
          )}
          aria-label="BlackArts — voltar ao catálogo"
        >
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary ring-1 ring-foreground/10">
            <img
              src="/logo.jpeg"
              alt=""
              aria-hidden
              className="size-full object-cover"
            />
          </span>
          <span className="truncate text-base font-bold tracking-tight">
            Black
            <span className="text-amber-600 dark:text-amber-400">Arts</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            asChild
            aria-label="Buscar obras"
            className={cn(
              transparent &&
                "bg-background/40 ring-1 ring-foreground/10 backdrop-blur-sm hover:bg-background/60"
            )}
          >
            <Link to="/search">
              <Search className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {/* Degradê na própria barra (não é borda): se estende abaixo dela,
          do fundo sólido até transparente, criando o efeito de mistura
          com o conteúdo que rola por baixo. Oculto quando transparente. */}
      {!transparent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent"
        />
      )}
    </header>
  )
}
