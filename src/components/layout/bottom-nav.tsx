import { NavLink } from "react-router-dom"
import { Heart, Home } from "lucide-react"

import { cn } from "@/lib/utils"
import { NowPlayingBar } from "./now-playing-bar"

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/favorites", label: "Favoritos", icon: Heart, end: false },
] as const

/**
 * Bottom bar flutuante (estilo app Android): pílula fixa na parte de
 * baixo da tela para alternar entre a tela inicial e os favoritos. Com
 * áudio carregado, o player ocupa a parte de cima da mesma pílula.
 */
export function BottomNav() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:p-4 sm:pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
      {/* Degradê na base da tela (abaixo da barra): preenche o fundo do
          app com o mesmo efeito de sombra da top bar, na cor do fundo do
          app (to-background) — como um acabamento do fim da página. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-background"
      />

      <nav
        className="pointer-events-auto flex w-fit max-w-full flex-col gap-0.5 rounded-4xl bg-card/95 p-1.5 shadow-xl ring-1 ring-foreground/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80"
        aria-label="Navegação inferior"
      >
        <NowPlayingBar />

        <div className="flex items-center gap-1 self-center">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "relative flex h-10 items-center gap-1.5 rounded-3xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  isActive ? "bg-muted px-4 text-foreground" : "px-3"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-4" aria-hidden />
                  {/* Só o item ativo exibe o texto. */}
                  {isActive && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
