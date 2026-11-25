import { Link } from "react-router-dom"
import { Loader2, Pause, Play, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAudioPlayback } from "@/components/media/audio-playback"
import { buildThumbnailUrl } from "@/lib/archive-api"
import { cn } from "@/lib/utils"

/**
 * Linha de "tocando agora" exibida na parte de cima da barra de navegação
 * enquanto há áudio carregado. Tocar nela abre o item; os botões pausam e
 * fecham o player.
 */
export function NowPlayingBar({
  /** `inline` encaixa dentro da barra de navegação; `floating` traz a
   *  própria superfície, para telas sem a barra de navegação. */
  variant = "inline",
}: {
  variant?: "inline" | "floating"
} = {}) {
  const { nowPlaying, active, playing, loading, toggle, stop } =
    useAudioPlayback()

  // Só existe depois do primeiro play desta faixa.
  if (!nowPlaying || !active) {
    return null
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-sm items-center gap-1",
        variant === "inline"
          ? "px-1 pb-1"
          : "pointer-events-auto mx-auto rounded-4xl bg-card/95 p-1.5 pl-2 shadow-xl ring-1 ring-foreground/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80"
      )}
    >
      <Link
        to={`/item/${nowPlaying.identifier}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <img
          src={buildThumbnailUrl(nowPlaying.identifier)}
          alt=""
          loading="lazy"
          className="size-9 shrink-0 rounded-2xl bg-muted object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">
            {nowPlaying.track}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {nowPlaying.title}
          </span>
        </span>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
      >
        {loading ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : playing ? (
          <Pause aria-hidden />
        ) : (
          <Play aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={stop}
        aria-label="Fechar player"
      >
        <X aria-hidden />
      </Button>
    </div>
  )
}
