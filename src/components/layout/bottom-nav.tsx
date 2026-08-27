import { NavLink } from "react-router-dom"
import { Heart, Home } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useFavorites } from "@/hooks/use-favorites"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/favorites", label: "Favoritos", icon: Heart, end: false },
] as const

/**
 * Bottom bar flutuante (estilo app Android): pílula fixa na parte de
 * baixo da tela para alternar entre a tela inicial e os favoritos.
 */
export function BottomNav() {
  const { favorites } = useFavorites()

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:p-4 sm:pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]"
      aria-label="Navegação inferior"
    >
      {/* Degradê na base da tela (abaixo da barra): preenche o fundo do
          app com o mesmo efeito de sombra da top bar, na cor do fundo do
          app (to-background) — como um acabamento do fim da página. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-background"
      />
      <div className="pointer-events-auto flex w-fit items-center gap-1 rounded-4xl bg-card/95 p-1.5 shadow-xl ring-1 ring-foreground/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 items-center gap-1.5 rounded-3xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isActive && "bg-muted text-foreground"
              )
            }
          >
            <item.icon className="size-4" aria-hidden />
            <span>{item.label}</span>
            {item.to === "/favorites" && favorites.length > 0 && (
              <Badge
                variant="secondary"
                className="h-4.5 min-w-4.5 px-1 text-[10px] tabular-nums"
              >
                {favorites.length}
              </Badge>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
