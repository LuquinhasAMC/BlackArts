import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { PROJECT_LINKS } from "@/config/links"
import { isNative } from "@/lib/capacitor"

/** Tempo para levar o ponteiro do botão até o popover sem fechá-lo. */
const HOVER_CLOSE_DELAY_MS = 140

const POPOVER_ID = "download-app-popover"

/** Mouse/trackpad: nesses dispositivos o botão mostra o QR code em vez de
 *  baixar o APK, que é destinado ao celular. */
function useCanHover() {
  const [canHover, setCanHover] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false
  )

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setCanHover(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return canHover
}

/**
 * Download do app Android na top bar.
 *
 * - Desktop: o popover abre no hover e fecha ao sair do botão/popover.
 *   Um clique fixa o popover; clicar de novo no botão fecha. Fixado, ele
 *   continua aberto mesmo sem hover e também fecha ao clicar fora ou
 *   quando o botão/popover perde o foco.
 * - Celular/tablet: o clique baixa o APK da última release diretamente.
 * - App nativo: fica oculto, pois o download não faz sentido.
 */
export function DownloadAppButton() {
  const canHover = useCanHover()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const pinnedRef = useRef(false)
  const closeTimer = useRef<number | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    pinnedRef.current = pinned
  }, [pinned])

  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current)
      }
    },
    []
  )

  if (isNative) {
    return null
  }

  if (!canHover) {
    return (
      <Button asChild>
        <a href={PROJECT_LINKS.androidApk}>
          <Download aria-hidden />
          Download app
        </a>
      </Button>
    )
  }

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null
      if (!pinnedRef.current) {
        setOpen(false)
      }
    }, HOVER_CLOSE_DELAY_MS)
  }

  const handlePointerEnter = () => {
    cancelClose()
    setOpen(true)
  }

  const handleClick = () => {
    cancelClose()

    // Primeiro clique fixa o popover (não fecha mais ao sair do hover).
    // Clicar de novo no botão fecha.
    if (pinned) {
      setPinned(false)
      setOpen(false)
      return
    }

    setPinned(true)
    setOpen(true)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true)
      return
    }

    // Fechado por clique fora, Esc ou perda de foco.
    cancelClose()
    setPinned(false)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor ref={anchorRef} role="none">
        <Button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? POPOVER_ID : undefined}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={() => {
            if (!pinnedRef.current) {
              scheduleClose()
            }
          }}
          onClick={handleClick}
        >
          <Download aria-hidden />
          Download app
        </Button>
      </PopoverAnchor>

      <PopoverContent
        id={POPOVER_ID}
        align="end"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={() => {
          if (!pinnedRef.current) {
            scheduleClose()
          }
        }}
        onInteractOutside={(event) => {
          // Clique no próprio botão não fecha pelo Popover: o onClick do
          // botão decide entre fixar e fechar.
          if (anchorRef.current?.contains(event.target as Node)) {
            event.preventDefault()
          }
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold">Baixe o app Android</p>
          <div className="rounded-xl bg-white p-2.5">
            <QRCodeSVG
              value={PROJECT_LINKS.androidApk}
              size={180}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              title="QR code para baixar o app Android"
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Aponte a câmera do celular para o QR code.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
