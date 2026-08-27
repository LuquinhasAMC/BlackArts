import type { RefObject } from "react"
import { ExternalLink, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildDetailsUrl, buildFileUrl } from "@/lib/archive-api"
import { pickPdfFile, resolveTextSource } from "@/lib/media"
import type { ArchiveFile } from "@/types/archive"

interface TextViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
  /** Referência do contêiner rolável (controles de navegação da bottom bar). */
  textScrollRef?: RefObject<HTMLDivElement | null>
  /** Texto puro já carregado pelo stage (quando o modo é inline). */
  text?: string | null
  textLoading?: boolean
  textFailed?: boolean
}

/**
 * Área central do visualizador de documentos: texto puro rolável,
 * PDF embutido ou fallback com link para o Internet Archive.
 */
export function TextViewer({
  identifier,
  files,
  textScrollRef,
  text,
  textLoading,
  textFailed,
}: TextViewerProps) {
  const mode = resolveTextSource(files)
  const pdf = pickPdfFile(files)

  // Texto puro rolável (obras curtas e textos longos com navegação).
  if (mode === "inline") {
    if (textFailed) {
      return (
        <FallbackBox
          identifier={identifier}
          title="Não foi possível carregar o texto"
          description="O servidor de arquivos do Internet Archive pode estar lento ou bloqueado na sua rede."
        />
      )
    }

    return (
      <div
        ref={textScrollRef}
        className="max-h-[60vh] overflow-y-auto rounded-4xl bg-card p-4 ring-1 ring-border select-text sm:p-6"
        tabIndex={0}
        aria-label="Texto do documento"
      >
        {textLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Carregando texto…
          </div>
        ) : (
          <pre className="font-sans text-sm leading-relaxed break-words whitespace-pre-wrap">
            {text}
          </pre>
        )}
      </div>
    )
  }

  // PDF no visualizador nativo do navegador (iframe), em um retângulo
  // vertical (retrato) com a altura limitada até a área segura da bottom
  // bar, para não deixar a interface rolável nem o documento sob a barra.
  if (mode === "pdf" && pdf) {
    return (
      <div className="flex flex-col gap-3">
        <iframe
          src={buildFileUrl(identifier, pdf.name)}
          title={pdf.title || "Documento do item"}
          className="mx-auto aspect-[3/4] h-[calc(100dvh-17.5rem)] max-w-full rounded-4xl border border-border bg-white"
        />
        <p className="text-center text-xs text-muted-foreground">
          Se o documento não carregar, o servidor de arquivos do Internet
          Archive pode estar lento ou bloqueado na sua rede.
        </p>
      </div>
    )
  }

  return (
    <FallbackBox
      identifier={identifier}
      title="Documento sem visualização embutida"
      description="Este item está disponível em formatos (como EPUB ou DjVu) que não possuem visualizador simples embutido. Abra-o no Internet Archive."
    />
  )
}

function FallbackBox({
  identifier,
  title,
  description,
  onRetry,
}: {
  identifier: string
  title: string
  description: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-8 text-center">
      <FileText className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
        <Button asChild>
          <a
            href={buildDetailsUrl(identifier)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            Abrir no Internet Archive
          </a>
        </Button>
      </div>
    </div>
  )
}
