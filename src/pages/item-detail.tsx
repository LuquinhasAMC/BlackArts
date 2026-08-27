import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Info, RotateCcw, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FavoriteTarget } from "@/components/favorites/favorite-button"
import { ShareButton } from "@/components/favorites/share-button"
import { Description } from "@/components/metadata/description"
import { MetadataTable } from "@/components/metadata/metadata-table"
import { MediaViewer } from "@/components/media/media-viewer-registry"
import { PlayerBottomBar } from "@/components/media/player-bottom-bar"
import { ARCHIVE } from "@/config/archive"
import { findCuratedItem } from "@/data/curated"
import {
  ApiError,
  buildDetailsUrl,
  buildFileUrl,
  buildThumbnailUrl,
  fetchTextFile,
  firstString,
  getItemDetails,
  normalizeCreator,
} from "@/lib/archive-api"
import {
  extractYear,
  formatList,
  mediaTypeLabel,
  pickInlineTextFile,
  pickPdfFile,
  resolveMediaType,
  resolveTextSource,
} from "@/lib/media"
import { cn } from "@/lib/utils"

/** Aba ativa da top bar: player ou metadados. */
type StageView = "player" | "metadata"

/** Tela de visualização de um item, no formato app para celular. */
export default function ItemDetailPage() {
  const { identifier = "" } = useParams()

  // `key` garante que todo o estado local (zoom, faixa, metadados) seja
  // reiniciado ao navegar entre itens.
  return <ItemDetailStage key={identifier} identifier={identifier} />
}

function ItemDetailStage({ identifier }: { identifier: string }) {
  const navigate = useNavigate()
  const [view, setView] = useState<StageView>("player")
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [pdfExpanded, setPdfExpanded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const textScrollRef = useRef<HTMLDivElement>(null)

  const handleBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["archive", "item", identifier],
    queryFn: ({ signal }) => getItemDetails(identifier, signal),
    staleTime: ARCHIVE.staleTimeMs,
    retry: (failureCount, error) =>
      failureCount < 1 && !(error instanceof ApiError && error.status === 404),
  })

  const metadata = data?.metadata ?? {}
  const files = data?.files ?? []
  const mediatype = firstString(metadata.mediatype)
  const title = firstString(metadata.title) ?? identifier
  const creator = normalizeCreator(metadata.creator)
  const year = extractYear(firstString(metadata.year))
  const description = firstString(metadata.description)
  const type = resolveMediaType(mediatype, files)
  const textMode = resolveTextSource(files)
  const inlineTextFile = pickInlineTextFile(files)
  const pdfFile = textMode === "pdf" ? pickPdfFile(files) : undefined

  // Texto puro carregado com TanStack Query (cache + cancelamento).
  const textQuery = useQuery({
    queryKey: ["archive", "text", identifier, inlineTextFile?.name],
    queryFn: ({ signal }) =>
      fetchTextFile(identifier, inlineTextFile?.name ?? "", signal),
    enabled: textMode === "inline" && Boolean(inlineTextFile),
    staleTime: ARCHIVE.staleTimeMs,
    retry: ARCHIVE.retry,
  })

  // Tags da curadoria local (independentes da API), exibidas nos metadados.
  const curatedTags = findCuratedItem(identifier)?.tags

  const favoriteTarget: FavoriteTarget = {
    identifier,
    title,
    mediatype,
    year,
    creator: formatList(creator),
    thumbnail: buildThumbnailUrl(identifier),
  }

  // A descrição fica inline apenas no player de vídeo (estilo YouTube);
  // nos demais players, ela abre em um modal pela bottom bar.
  const showInlineDescription = type === "video" && Boolean(description)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <StageHeader
        identifier={identifier}
        title={title}
        onBack={handleBack}
        view={view}
        onViewChange={setView}
        metadataDisabled={isPending}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        {view === "metadata" ? (
          <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-56">
            {isPending ? (
              <LoadingState />
            ) : isError || !data ? (
              <ErrorState
                identifier={identifier}
                onBack={handleBack}
                onRetry={() => refetch()}
              />
            ) : (
              <div className="flex flex-col gap-5">
                <ItemHeading
                  mediatype={mediatype}
                  title={title}
                  creator={creator}
                  year={year}
                />
                <MetadataTable
                  identifier={identifier}
                  metadata={metadata}
                  files={files}
                  tags={curatedTags}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-56">
            {isPending ? (
              <LoadingState />
            ) : isError || !data ? (
              <ErrorState
                identifier={identifier}
                onBack={handleBack}
                onRetry={() => refetch()}
              />
            ) : (
              <div className="flex flex-col gap-5">
                {/* No vídeo, o visor vem primeiro e o título/autor ficam
                    abaixo dele, como no YouTube. */}
                {type === "video" && (
                  <MediaViewer
                    type={type}
                    identifier={identifier}
                    files={files}
                    mediatype={mediatype}
                    zoom={zoom}
                    textScrollRef={textScrollRef}
                    text={textQuery.data ?? null}
                    textLoading={textQuery.isPending}
                    textFailed={textQuery.isError}
                  />
                )}

                <ItemHeading
                  mediatype={mediatype}
                  title={title}
                  creator={creator}
                  year={year}
                  singleLine={type !== "video"}
                />

                {type !== "video" && (
                  <MediaViewer
                    type={type}
                    identifier={identifier}
                    files={files}
                    mediatype={mediatype}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    textScrollRef={textScrollRef}
                    text={textQuery.data ?? null}
                    textLoading={textQuery.isPending}
                    textFailed={textQuery.isError}
                  />
                )}

                {showInlineDescription && (
                  <div className="rounded-4xl bg-card p-4 ring-1 ring-border sm:p-5">
                    <h2 className="mb-2 text-sm font-semibold">Descrição</h2>
                    <Description description={description} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom bar flutuante, dinâmica por tipo de player e pelo número
          de controles que contém (o tamanho se ajusta ao conteúdo). Em
          telas pequenas, quando cheia, rola horizontalmente em vez de
          ficar cortada. */}
      {view === "player" && !isPending && !isError && data && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:p-4 sm:pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
          <div
            className={cn(
              "pointer-events-auto rounded-4xl bg-card/95 shadow-xl ring-1 ring-foreground/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80",
              // Áudio usa a largura total para o player esticar; os demais
              // players ficam do tamanho do conteúdo e quebram linha.
              type === "audio" ? "w-full max-w-2xl" : "w-fit max-w-full"
            )}
          >
            <PlayerBottomBar
              type={type}
              identifier={identifier}
              title={title}
              files={files}
              mediatype={mediatype}
              zoom={zoom}
              onZoomChange={setZoom}
              textMode={textMode}
              textContent={textQuery.data ?? null}
              textLoading={textQuery.isPending}
              textScrollRef={textScrollRef}
              favoriteTarget={favoriteTarget}
              onOpenDescription={
                !showInlineDescription && description
                  ? () => setDescriptionOpen(true)
                  : undefined
              }
              onOpenFullscreen={
                textMode === "pdf" && pdfFile
                  ? () => setPdfExpanded(true)
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Visualizador (PDF) em toda a tela do app (não usa Fullscreen API). */}
      {pdfExpanded && pdfFile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <header className="relative shrink-0 bg-background pt-safe">
            <div className="flex h-14 items-center gap-2 px-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPdfExpanded(false)}
                aria-label="Fechar visualizador"
              >
                <X aria-hidden />
              </Button>
              <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
                {title}
              </h2>
              <ShareButton identifier={identifier} title={title} size="icon" />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent"
            />
          </header>
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <iframe
              src={buildFileUrl(identifier, pdfFile.name)}
              title={pdfFile.title || "Documento do item"}
              className="size-full rounded-4xl border border-border bg-white"
            />
          </div>
        </div>
      )}

      {/* Descrição em modal (aberta pela bottom bar nos players que não
          exibem a descrição inline). */}
      <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
        <DialogContent className="top-auto right-0 bottom-0 left-0 max-w-none translate-x-0 translate-y-0 rounded-t-4xl rounded-b-none sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl">
          <DialogHeader>
            <DialogTitle>Descrição</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            <Description description={description} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Top bar fixa: voltar (esquerda) · abas Player/Metadados (centro) ·
 * compartilhar (direita). As abas trocam o conteúdo da tela — não é modal.
 */
function StageHeader({
  identifier,
  title,
  onBack,
  view,
  onViewChange,
  metadataDisabled,
}: {
  identifier: string
  title: string
  onBack: () => void
  view: StageView
  onViewChange: (view: StageView) => void
  metadataDisabled?: boolean
}) {
  return (
    <header className="relative shrink-0 bg-background pt-safe">
      <div className="flex h-14 items-center gap-2 px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ArrowLeft aria-hidden />
        </Button>
        <Tabs
          value={view}
          onValueChange={(value) => onViewChange(value as StageView)}
          className="flex flex-1 items-center justify-center"
        >
          <TabsList className="h-9">
            <TabsTrigger value="player">Player</TabsTrigger>
            <TabsTrigger value="metadata" disabled={metadataDisabled}>
              Metadados
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ShareButton identifier={identifier} title={title} size="icon" />
      </div>

      {/* Degradê na própria barra: estende abaixo dela, do fundo sólido
          ao transparente, criando o efeito de mistura com o conteúdo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent"
      />
    </header>
  )
}

/** Cabeçalho do item: tipo, ano, título e autor(es). */
function ItemHeading({
  mediatype,
  title,
  creator,
  year,
  singleLine = false,
}: {
  mediatype?: string
  title: string
  creator: string | string[] | undefined
  year: string
  /** Mantém o título em uma única linha (com reticências) — usado nos
      players que não são vídeo; o vídeo pode quebrar linha como no YouTube. */
  singleLine?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{mediaTypeLabel(mediatype)}</Badge>
        {year && <Badge variant="outline">{year}</Badge>}
      </div>
      <h1
        className={cn(
          "text-xl leading-tight font-bold sm:text-2xl",
          singleLine && "truncate"
        )}
        title={singleLine ? title : undefined}
      >
        {title}
      </h1>
      {creator && (
        <p className="text-sm text-muted-foreground">{formatList(creator)}</p>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-7 w-3/4 max-w-md" />
        <Skeleton className="h-4 w-1/3 max-w-xs" />
      </div>
      <Skeleton className="aspect-video w-full rounded-4xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

function ErrorState({
  identifier,
  onBack,
  onRetry,
}: {
  identifier: string
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed bg-muted/30 p-8 text-center">
      <Info className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-sm font-medium">Item indisponível</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Não foi possível carregar este item. Ele pode ter sido removido do
          Internet Archive ou sua conexão pode ter falhado.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden />
          Voltar
        </Button>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Tentar novamente
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href={buildDetailsUrl(identifier)}
            target="_blank"
            rel="noreferrer"
          >
            Abrir no Internet Archive
          </a>
        </Button>
      </div>
    </div>
  )
}
