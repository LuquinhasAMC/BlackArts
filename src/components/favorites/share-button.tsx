import { useState } from "react"
import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { buildItemShareUrl, shareItem } from "@/lib/share"
import { cn } from "@/lib/utils"

interface ShareButtonProps {
  identifier: string
  title: string
  text?: string
  withLabel?: boolean
  variant?: "default" | "outline"
  size?: "default" | "sm" | "icon" | "icon-sm"
  className?: string
}

/** Compartilha um item via Web Share API, com fallback de copiar link. */
export function ShareButton({
  identifier,
  title,
  text,
  withLabel = false,
  variant = "outline",
  size = "default",
  className,
}: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    try {
      const result = await shareItem({
        title,
        text: text || title,
        url: buildItemShareUrl(identifier),
      })
      if (result === "copied") {
        toast.success("Link copiado para a área de transferência")
      } else if (result === "shared") {
        toast.success("Conteúdo compartilhado")
      }
    } catch {
      toast.error("Não foi possível compartilhar este item")
    } finally {
      setSharing(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={sharing}
      aria-label={`Compartilhar ${title}`}
      className={cn(className)}
    >
      <Share2 aria-hidden />
      {withLabel && <span>Compartilhar</span>}
    </Button>
  )
}
