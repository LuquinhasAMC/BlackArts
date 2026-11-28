import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Search } from "lucide-react"

import { FavoritesViewToggle } from "@/components/favorites/favorites-view-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DownloadAppButton } from "./download-app-button"
import { UpdateAppButton } from "./update-app-button"

/** Título exibido na barra de acordo com a rota. */
const PAGE_TITLES: Record<string, string> = {
  "/": "Início",
  "/favorites": "Favoritos",
}

/**
 * Top bar fixa: transparente quando a página está no topo e sólida após
 * rolar. Mostra o título da tela atual e, fora dos favoritos, o atalho
 * para a pesquisa.
 */
export function Header() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? "BlackArts"
  // A pesquisa tem seu próprio acesso; aqui ela não aparece nos favoritos.
  const showSearch = pathname !== "/favorites"
  const [scrolled, setScrolled] = useState(() =>
    typeof window !== "undefined" ? window.scrollY > 8 : false
  )

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 pt-safe transition-[background-color] duration-200",
        scrolled ? "bg-background" : "bg-transparent"
      )}
    >
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        <h1 className="min-w-0 truncate text-base font-bold tracking-tight">
          {title}
        </h1>

        {/* À direita: atualizar/baixar o app e, fora dos favoritos, a pesquisa. */}
        <div className="ml-auto flex items-center gap-1">
          <UpdateAppButton />
          <DownloadAppButton />

          {showSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              asChild
              aria-label="Buscar obras"
            >
              <Link to="/search">
                <Search className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            /* Nos favoritos, a direita da barra alterna grade/lista. */
            <FavoritesViewToggle />
          )}
        </div>
      </div>

      {/* Degradê abaixo da barra quando sólida, para misturar com o
          conteúdo que rola por baixo. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
          scrolled ? "opacity-100" : "opacity-0"
        )}
      />
    </header>
  )
}
