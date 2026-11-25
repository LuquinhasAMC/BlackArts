import { useState } from "react"
import { Check, Copy, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buildDetailsUrl } from "@/lib/archive-api"
import { isNative } from "@/lib/capacitor"
import { buildItemShareUrl, copyToClipboard } from "@/lib/share"

interface ShareButtonProps {
  identifier: string
  title: string
  size?: "default" | "sm" | "icon" | "icon-sm"
  className?: string
}

type LinkKey = "site" | "archive"

/** Endereço público do app, usado quando a origem local não é compartilhável. */
const PUBLIC_SITE_URL = "https://blackarts.vercel.app"

/**
 * Em endereços locais (Capacitor/WebView, localhost ou IP de loopback) o
 * link do site aponta para a versão publicada, já que `localhost` não abre
 * em outro aparelho.
 */
function isLocalOrigin(): boolean {
  const { hostname } = window.location
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  )
}

/**
 * Compartilhar: botão ghost que abre um modal com os dois links da obra
 * (link do site e página no Internet Archive) para copiar.
 */
export function ShareButton({
  identifier,
  title,
  size = "default",
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<LinkKey | null>(null)

  const siteUrl =
    isNative || isLocalOrigin()
      ? `${PUBLIC_SITE_URL}/item/${encodeURIComponent(identifier)}`
      : buildItemShareUrl(identifier)
  const archiveUrl = buildDetailsUrl(identifier)

  const handleCopy = async (key: LinkKey, url: string) => {
    try {
      await copyToClipboard(url)
      setCopied(key)
      toast.success(
        key === "site" ? "Link do site copiado" : "Link do Archive copiado"
      )
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error("Não foi possível copiar o link")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={() => setOpen(true)}
        aria-label={`Compartilhar ${title}`}
        className={className}
      >
        <Share2 aria-hidden />
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <ShareLinkRow
            label="Link do site"
            url={siteUrl}
            copied={copied === "site"}
            onCopy={() => void handleCopy("site", siteUrl)}
          />
          <ShareLinkRow
            label="Internet Archive"
            url={archiveUrl}
            copied={copied === "archive"}
            onCopy={() => void handleCopy("archive", archiveUrl)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Uma linha do modal: rótulo, URL e botão de copiar. */
function ShareLinkRow({
  label,
  url,
  copied,
  onCopy,
}: {
  label: string
  url: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs break-all text-muted-foreground select-text">
          {url}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onCopy}
        aria-label={`Copiar ${label.toLowerCase()}`}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  )
}
