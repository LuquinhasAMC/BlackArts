import { useRef, useState, type TouchEvent } from "react"
import { useNavigate } from "react-router-dom"

import { useFirstRun } from "@/hooks/use-first-run"
import { buildThumbnailUrl } from "@/lib/archive-api"
import { cn } from "@/lib/utils"

/** Página de apresentação do onboarding. */
interface Slide {
  /** Obra cuja capa ilustra a etapa. */
  cover: string
  title: string
  description: string
}

const SLIDES: Slide[] = [
  {
    cover: "EsmolaCantada",
    title: "Um museu digital da negritude brasileira",
    description:
      "Obras de autores negros brasileiros e trabalhos em que a negritude é o tema central, reunidos a partir do acervo público do Internet Archive.",
  },
  {
    cover: "1974-cartola",
    title: "Música, filmes, documentos e imagens",
    description:
      "Samba, candomblé, capoeira, cinema e literatura — tudo para ouvir, ver e ler no seu tempo.",
  },
  {
    cover: "portela_202307",
    title: "Encontre, retome e compartilhe",
    description:
      "Busque por tipo de mídia, salve favoritos e continue de onde parou. O compartilhar entrega o link do site e o link da obra no Internet Archive.",
  },
]

/**
 * Tela de boas-vindas exibida na primeira execução: apresentação em três
 * etapas, com a capa de uma obra diferente em cada uma.
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
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <div
        className="flex min-h-0 flex-1 flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Capa da obra da etapa atual, no topo da tela. */}
        <div className="h-[clamp(8rem,30svh,16rem)] shrink-0 border-b border-border">
          <img
            key={slide.cover}
            src={buildThumbnailUrl(slide.cover)}
            alt=""
            aria-hidden
            className="size-full animate-in bg-muted object-cover fade-in-0"
          />
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-center gap-5 overflow-y-auto px-6 py-5">
          <div
            key={`text-${page}`}
            className="flex animate-in flex-col gap-3 fade-in-0"
          >
            <h1 className="text-xl leading-tight font-bold tracking-tight sm:text-2xl">
              {slide.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {slide.description}
            </p>
          </div>
        </div>

        {/* Indicadores de página + navegação. */}
        <div className="mx-auto flex w-full max-w-xl shrink-0 flex-col gap-4 border-t border-border px-6 pt-4 pb-[max(1.5rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
          <div className="flex items-center gap-1.5" aria-label="Página">
            {SLIDES.map((item, index) => (
              <button
                key={item.cover}
                type="button"
                onClick={() => setPage(index)}
                aria-label={`Ir para a página ${index + 1}`}
                aria-current={index === page ? "page" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  index === page
                    ? "w-6 bg-foreground"
                    : "w-1.5 bg-foreground/25 hover:bg-foreground/50"
                )}
              />
            ))}
          </div>

          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
                isFirst && "invisible"
              )}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={goNext}
              className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85"
            >
              {isLast ? "Começar a explorar" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
