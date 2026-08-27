import { useRef, useState, type TouchEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Landmark,
  Library,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFirstRun } from "@/hooks/use-first-run"
import { cn } from "@/lib/utils"

/** Página de apresentação do onboarding. */
interface Slide {
  icon?: typeof Landmark
  title: string
  description: string
  /** Intensidade do degradê âmbar (mesma paleta do app). */
  glow: string
  /** Imagem ilustrativa (ex.: a logo do app no primeiro slide). */
  image?: string
}

const SLIDES: Slide[] = [
  {
    icon: Landmark,
    title: "Museu digital da negritude",
    description:
      "Reúne vídeos, músicas, fotografias, obras de arte, documentos e registros culturais da diáspora africana — a partir do acervo público do Internet Archive.",
    glow: "from-amber-500/30 to-amber-600/10",
    image: "/logo.jpeg",
  },
  {
    icon: Library,
    title: "Curadoria feita à mão",
    description:
      "Cada obra é selecionada manualmente: artistas negros, cinema negro, direitos civis, literatura, fotografia e história — tudo verificado e em um só lugar.",
    glow: "from-amber-400/30 to-amber-700/10",
  },
  {
    icon: Heart,
    title: "Salve, explore e compartilhe",
    description:
      "Favoritos, players de áudio e vídeo, visualizador de fotos com zoom, leitura de documentos e compartilhamento — tudo pensado para o seu celular.",
    glow: "from-amber-500/25 to-amber-600/15",
  },
]

/**
 * Tela de boas-vindas exibida na primeira execução: onboarding com três
 * páginas de apresentação (arraste ou use os botões) antes de começar.
 */
export default function WelcomePage() {
  const navigate = useNavigate()
  const { markWelcomeSeen } = useFirstRun()
  const [page, setPage] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const handleStart = () => {
    markWelcomeSeen()
    navigate("/", { replace: true })
  }

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      setPage(page + 1)
    } else {
      handleStart()
    }
  }

  const goPrev = () => {
    setPage(Math.max(0, page - 1))
  }

  // Arrastar horizontalmente troca de página (estilo app mobile).
  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) {
      return
    }
    const deltaX =
      (event.changedTouches[0]?.clientX ?? touchStartX.current) -
      touchStartX.current
    touchStartX.current = null

    if (Math.abs(deltaX) < 48) {
      return
    }
    if (deltaX < 0) {
      goNext()
    } else {
      goPrev()
    }
  }

  const slide = SLIDES[page]
  const isLast = page === SLIDES.length - 1
  const isFirst = page === 0

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      {/* Elementos decorativos de fundo, no estilo do app (só âmbar). */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 size-[28rem] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 size-[28rem] rounded-full bg-amber-600/10 blur-3xl" />
      </div>

      {/* Conteúdo do onboarding, com swipe horizontal. */}
      <div
        className="relative flex flex-1 flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
          {/* Ilustração da página atual. */}
          <div
            key={page}
            className="flex size-40 animate-in items-center justify-center overflow-hidden rounded-4xl bg-gradient-to-br shadow-2xl ring-1 ring-foreground/10 fade-in-0 zoom-in-95"
          >
            {slide.image ? (
              <img
                src={slide.image}
                alt=""
                aria-hidden
                className="size-full object-cover"
              />
            ) : (
              slide.icon && (
                <div
                  className={cn(
                    "flex size-32 items-center justify-center rounded-3xl bg-gradient-to-br",
                    slide.glow
                  )}
                >
                  <slide.icon className="size-16 text-amber-400" aria-hidden />
                </div>
              )
            )}
          </div>

          {/* Texto da página atual. */}
          <div
            key={`text-${page}`}
            className="flex max-w-lg animate-in flex-col items-center gap-3 text-center fade-in-0 slide-in-from-bottom-3"
          >
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Black<span className="text-amber-400">Arts</span>
            </h1>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {slide.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {slide.description}
            </p>
          </div>
        </div>

        {/* Indicadores de página + navegação. */}
        <div className="relative flex flex-col items-center gap-5 px-6 pb-[max(1.5rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
          <div className="flex items-center gap-1.5" aria-label="Página">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                aria-label={`Ir para a página ${index + 1}`}
                aria-current={index === page ? "page" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  index === page
                    ? "w-6 bg-amber-400"
                    : "w-2 bg-foreground/20 hover:bg-foreground/40"
                )}
              />
            ))}
          </div>

          <div className="flex w-full max-w-sm items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={goPrev}
              disabled={isFirst}
              className={cn(isFirst && "invisible")}
            >
              <ArrowLeft aria-hidden />
              Voltar
            </Button>

            <Button size="lg" onClick={goNext}>
              {isLast ? (
                <>
                  Começar a explorar
                  <Sparkles aria-hidden />
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
