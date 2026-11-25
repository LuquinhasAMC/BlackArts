import { useRef, useState } from "react"

import { cn } from "@/lib/utils"
import type { ArchiveFile } from "@/types/archive"

/** Formata segundos como m:ss. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00"
  }
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

/** Nome exibido de uma faixa (título do arquivo, ou o nome sem extensão). */
export function trackLabel(file: ArchiveFile): string {
  return file.title || file.name.replace(/\.[^.]+$/, "")
}

/** Barra de progresso clicável/arrastável, sem depender de input nativo. */
export function SeekBar({
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
        "group relative h-8 w-full cursor-pointer touch-none select-none",
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
