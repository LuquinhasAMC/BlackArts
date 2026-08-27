import { useRef, useState } from "react"
import { Loader2, Pause, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  src?: string
  /** Chamado quando o áudio falha ao carregar. */
  onError?: () => void
  /** Chamado quando os metadados do áudio são carregados. */
  onLoaded?: () => void
  className?: string
}

/** Formata segundos como m:ss. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00"
  }
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

/**
 * Player de áudio próprio, sem os controles nativos do navegador.
 * O elemento `<audio>` fica oculto e é controlado imperativamente.
 */
export function AudioPlayer({
  src,
  onError,
  onLoaded,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || failed) {
      return
    }
    if (audio.paused) {
      void audio.play().catch(() => setFailed(true))
    } else {
      audio.pause()
    }
  }

  const seekByRatio = (ratio: number) => {
    const audio = audioRef.current
    if (!audio || duration <= 0) {
      return
    }
    const next = Math.min(Math.max(ratio, 0), 1) * duration
    audio.currentTime = next
    setCurrentTime(next)
  }

  const busy = loading || failed

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2",
        className
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0)
          setLoading(false)
          onLoaded?.()
        }}
        onCanPlay={() => setLoading(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setFailed(true)
          setLoading(false)
          onError?.()
        }}
      >
        Seu navegador não suporta reprodução de áudio.
      </audio>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={togglePlay}
        disabled={busy}
        aria-label={playing ? "Pausar" : "Reproduzir"}
        className="shrink-0"
      >
        {loading ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : playing ? (
          <Pause aria-hidden />
        ) : (
          <Play aria-hidden />
        )}
      </Button>

      <SeekBar
        value={currentTime}
        max={duration}
        onSeek={seekByRatio}
        disabled={busy || duration <= 0}
      />

      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}

/** Barra de progresso clicável/arrastável, sem depender de input nativo. */
function SeekBar({
  value,
  max,
  onSeek,
  disabled,
}: {
  value: number
  max: number
  onSeek: (ratio: number) => void
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0

  const seekFromClientX = (clientX: number) => {
    const track = trackRef.current
    if (!track || track.getBoundingClientRect().width <= 0) {
      return
    }
    const rect = track.getBoundingClientRect()
    const next = (clientX - rect.left) / rect.width
    onSeek(Math.min(Math.max(next, 0), 1))
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Posição da reprodução"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "group relative h-8 min-w-24 flex-1 cursor-pointer touch-none select-none",
        disabled && "cursor-default opacity-60"
      )}
      onPointerDown={(event) => {
        if (disabled) {
          return
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
        seekFromClientX(event.clientX)
      }}
      onPointerMove={(event) => {
        if (dragging) {
          seekFromClientX(event.clientX)
        }
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        if (disabled) {
          return
        }
        if (event.key === "ArrowRight") {
          event.preventDefault()
          onSeek(ratio + 0.05)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          onSeek(ratio - 0.05)
        }
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
      <div
        className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: `${ratio * 100}%` }}
      />
      <div
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow transition-transform group-hover:scale-125"
        style={{ left: `${ratio * 100}%` }}
      />
    </div>
  )
}
