import { ExternalLink, FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildDetailsUrl } from "@/lib/archive-api"

interface FallbackViewerProps {
  identifier: string
  mediatype?: string
}

/** Exibido quando não é possível reproduzir/visualizar o conteúdo. */
export function FallbackViewer({ identifier }: FallbackViewerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-10 text-center">
      <FileQuestion className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">Pré-visualização indisponível</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível encontrar um arquivo compatível para exibir este
        conteúdo no navegador.
      </p>
      <Button asChild>
        <a href={buildDetailsUrl(identifier)} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden />
          Abrir no Internet Archive
        </a>
      </Button>
    </div>
  )
}
