import { useEffect, useRef, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PDFDocumentProxy } from "pdfjs-dist"
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
import { PdfPages } from "@/components/media/pdf-pages"
import { MediaViewer } from "@/components/media/media-viewer-registry"
import { PlayerBottomBar } from "@/components/media/player-bottom-bar"
import { NowPlayingBar } from "@/components/layout/now-playing-bar"
import { useAudioPlayback } from "@/components/media/audio-playback"
import {
  getCheckpoint,
  saveCheckpoint,
  type CheckpointType,
} from "@/lib/checkpoints"
import { AudioPlaylist } from "@/components/media/audio-playlist"
import { ARCHIVE } from "@/config/archive"
import { findCuratedItem } from "@/data/curated"
import {
  ApiError,
  buildDetailsUrl,
  buildCorsFileUrl,
  buildFileUrl,
  buildThumbnailUrl,
  fetchTextFile,
  firstString,
  getItemDetails,
  normalizeCreator,
} from "@/lib/archive-api"
import {
  audioFilesByPreference,
  extractYear,
  formatList,
  imageFilesByPreference,
  mediaTypeLabel,
  pickInlineTextFile,
  pickPdfFile,
  resolveMediaType,
  resolveTextSource,
  videoFilesByPreference,
} from "@/lib/media"
import { cn } from "@/lib/utils"
import type { ArchiveFile } from "@/types/archive"

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
  // Top bar transparente no topo e sólida ao rolar, como na tela inicial.
  const [scrolled, setScrolled] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [pdfExpanded, setPdfExpanded] = useState(false)
  const [zoom, setZoom] = useState(1)
  // Galeria de imagem: controles visíveis por padrão; um toque alterna.
  const [imageChromeVisible, setImageChromeVisible] = useState(true)
  // PDF integrado: controles visíveis por padrão; um toque alterna.
  const [pdfChromeVisible, setPdfChromeVisible] = useState(true)
  // Zoom do PDF (1 = folha ajustada à largura da tela).
  const [pdfZoom, setPdfZoom] = useState(1)
  // Página atual do PDF (1-based), total e proporção da página.
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [pdfPageAspect, setPdfPageAspect] = useState(1)
  // Documento carregado pelo visualizador (miniaturas do seletor de páginas).
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [pdfPageRequest, setPdfPageRequest] = useState<{
    page: number
    nonce: number
  } | null>(null)
  // Checkpoint salvo desta obra (lido uma vez, ao abrir): restaura a página,
  // a foto/faixa atual e a minutagem de cada player.
  const [resume] = useState(() => getCheckpoint(identifier))
  const restoredPdfPageRef = useRef<number>(resume?.page ?? 0)
  // Itens com mais de uma imagem/vídeo: conteúdo selecionado.
  const [imageIndex, setImageIndex] = useState(resume?.imageIndex ?? 0)
  const [videoIndex, setVideoIndex] = useState(resume?.videoIndex ?? 0)
  const [audioIndex, setAudioIndex] = useState(resume?.audioIndex ?? 0)
  // Progresso do vídeo (para checkpoint).
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  // Mini player (áudio em reprodução) nas telas sem a barra de navegação.
  const audioPlayback = useAudioPlayback()
  const { active: audioActive } = audioPlayback
  const textScrollRef = useRef<HTMLDivElement>(null)
  // Início do toque no PDF (para diferenciar toque de rolagem).
  const pdfTapStart = useRef<{ x: number; y: number } | null>(null)
  // Timer do toque simples: um duplo toque/clique dá zoom em vez de
  // esconder e mostrar os controles duas vezes.
  const chromeTapTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (chromeTapTimer.current !== null) {
        window.clearTimeout(chromeTapTimer.current)
      }
    },
    []
  )

  const toggleChrome = (
    setVisible: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    // Segundo toque dentro da janela: é duplo toque (zoom), não alterna.
    if (chromeTapTimer.current !== null) {
      window.clearTimeout(chromeTapTimer.current)
      chromeTapTimer.current = null
      return
    }
    chromeTapTimer.current = window.setTimeout(() => {
      chromeTapTimer.current = null
      setVisible((visible) => !visible)
    }, 260)
  }

  const goBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const handleBack = goBack

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
  // Documentos em PDF abrem num palco imersivo, como a galeria de imagens.
  const isPdfStage = type === "text" && Boolean(pdfFile)
  const videoFiles = videoFilesByPreference(files)
  const audioFiles = audioFilesByPreference(files)
  const imageFiles = imageFilesByPreference(files)

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

  // Checkpoints: salva "onde parou" para a fileira da tela inicial.
  useEffect(() => {
    if (!identifier || !title) return
    saveCheckpoint({
      identifier,
      title,
      thumbnail: buildThumbnailUrl(identifier),
      type: type as CheckpointType,
    })
  }, [identifier, title, type])

  useEffect(() => {
    if (type !== "text" || !isPdfStage || pdfPage < 1) return
    saveCheckpoint({
      identifier,
      title,
      thumbnail: buildThumbnailUrl(identifier),
      type: "text",
      page: pdfPage,
      pageCount: pdfPageCount || undefined,
    })
  }, [type, isPdfStage, pdfPage, pdfPageCount, identifier, title])

  useEffect(() => {
    if (type !== "image") return
    saveCheckpoint({
      identifier,
      title,
      thumbnail: buildThumbnailUrl(identifier),
      type: "image",
      imageIndex,
      imageCount: imageFiles.length || undefined,
    })
  }, [type, imageIndex, imageFiles.length, identifier, title])

  const selectVideo = (index: number) => {
    setVideoIndex(index)
    setVideoTime(0)
    setVideoDuration(0)
    // O novo vídeo começa do zero (não herda a minutagem do anterior).
    saveCheckpoint({
      identifier,
      title,
      thumbnail: buildThumbnailUrl(identifier),
      type: "video",
      videoIndex: index,
      time: 0,
      duration: 0,
    })
  }

  useEffect(() => {
    if (type !== "video") return
    saveCheckpoint({
      identifier,
      title,
      thumbnail: buildThumbnailUrl(identifier),
      type: "video",
      videoIndex,
      time: videoTime || undefined,
      duration: videoDuration || undefined,
    })
  }, [type, videoIndex, videoTime, videoDuration, identifier, title])

  // Grava a minutagem do áudio a cada ~5s (a posição muda a cada timeupdate).
  const lastAudioCheckpoint = useRef(0)
  useEffect(() => {
    if (audioPlayback.nowPlaying?.identifier !== identifier) return
    const time = audioPlayback.currentTime
    if (
      time > 0 &&
      Math.abs(time - lastAudioCheckpoint.current) < 5 &&
      lastAudioCheckpoint.current !== 0
    ) {
      return
    }
    lastAudioCheckpoint.current = time
    saveCheckpoint({
      identifier,
      title,
      thumbnail: buildThumbnailUrl(identifier),
      type: "audio",
      audioIndex,
      time: time || undefined,
      duration: audioPlayback.duration || undefined,
    })
  }, [
    audioPlayback.nowPlaying?.identifier,
    audioPlayback.currentTime,
    audioPlayback.duration,
    audioIndex,
    identifier,
    title,
  ])

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
        scrolled={scrolled}
      />

      <main
        onScroll={(event) => {
          const next = event.currentTarget.scrollTop > 8
          setScrolled((previous) => (previous === next ? previous : next))
        }}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          // No vídeo, cada coluna do palco rola por conta própria.
          type === "video" && view === "player" && "lg:overflow-hidden"
        )}
      >
        {/* Metadados e player ficam ambos montados: alternar entre as abas
            preserva o estado do viewer (faixa, página, rolagem, zoom...). */}
        <div
          className={cn(
            "mx-auto w-full max-w-3xl px-4 pt-5 pb-56",
            view === "player" && "hidden"
          )}
        >
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
                showBadges={false}
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

        <div
          className={cn(
            "mx-auto w-full",
            // A galeria de imagem e o palco do PDF ocupam a tela toda.
            type === "image" || isPdfStage
              ? "h-full max-w-none"
              : type === "audio"
                ? "max-w-3xl px-4 pt-5 lg:h-full lg:max-w-none lg:px-0 lg:pt-0"
                : type === "video"
                  ? "max-w-3xl px-4 pt-5 lg:h-full lg:max-w-none lg:px-6 lg:pt-4"
                  : "max-w-3xl px-4 pt-5",
            // Só o player de texto usa a barra flutuante; os demais
            // controles ficam no próprio player.
            type === "image" || isPdfStage
              ? ""
              : type === "audio"
                ? "pb-10 lg:pb-0"
                : type === "video"
                  ? audioActive
                    ? "pb-28 lg:pb-0"
                    : "pb-10 lg:pb-0"
                  : "pb-56",
            view === "metadata" && "hidden"
          )}
        >
          {isPending ? (
            <LoadingState />
          ) : isError || !data ? (
            <ErrorState
              identifier={identifier}
              onBack={handleBack}
              onRetry={() => refetch()}
            />
          ) : (
            <div
              className={cn(
                "flex flex-col gap-5",
                (type === "image" || isPdfStage) && "h-full gap-0",
                type === "audio" && "lg:h-full lg:gap-0",
                type === "video" && "lg:h-full lg:gap-0"
              )}
            >
              {/* No vídeo, o visor vem primeiro e o título/autor ficam
                    abaixo dele, como no YouTube. Em telas grandes, a
                    descrição e a lista de reprodução vão para a direita. */}
              {type === "video" && (
                <VideoStage
                  identifier={identifier}
                  creator={creator}
                  videoFiles={videoFiles}
                  videoIndex={videoIndex}
                  onSelectVideo={selectVideo}
                  description={description}
                  viewer={
                    <MediaViewer
                      type={type}
                      identifier={identifier}
                      files={files}
                      mediatype={mediatype}
                      videoIndex={videoIndex}
                      zoom={zoom}
                      textScrollRef={textScrollRef}
                      text={textQuery.data ?? null}
                      textLoading={textQuery.isPending}
                      textFailed={textQuery.isError}
                      onVideoTimeUpdate={setVideoTime}
                      onVideoDurationChange={setVideoDuration}
                      onVideoReady={() => setVideoTime(0)}
                      initialTime={
                        resume?.videoIndex === videoIndex
                          ? resume.time
                          : undefined
                      }
                    />
                  }
                  header={
                    <ItemHeading
                      mediatype={mediatype}
                      title={title}
                      creator={creator}
                      year={year}
                      showBadges={false}
                    />
                  }
                  actions={
                    <PlayerBottomBar
                      type={type}
                      identifier={identifier}
                      title={title}
                      files={files}
                      mediatype={mediatype}
                      favoriteTarget={favoriteTarget}
                      onOpenDescription={
                        !showInlineDescription && description
                          ? () => setDescriptionOpen(true)
                          : undefined
                      }
                    />
                  }
                />
              )}

              {/* No player de texto o título fica no fluxo, acima dos
                    controles. Imagem e áudio exibem o título no player. */}
              {type !== "image" &&
                type !== "audio" &&
                type !== "video" &&
                !isPdfStage && (
                  <ItemHeading
                    mediatype={mediatype}
                    title={title}
                    creator={creator}
                    year={year}
                    singleLine
                    showBadges
                  />
                )}

              {type === "image" ? (
                /* Galeria do celular: foto solta sobre fundo escuro, sem
                     moldura; um toque na foto alterna título e controles. */
                <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      imageChromeVisible
                        ? "Ocultar controles"
                        : "Mostrar controles"
                    }
                    onClick={() => toggleChrome(setImageChromeVisible)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setImageChromeVisible((visible) => !visible)
                      }
                    }}
                    className="absolute inset-0 outline-none"
                  >
                    <MediaViewer
                      type={type}
                      identifier={identifier}
                      files={files}
                      mediatype={mediatype}
                      imageIndex={imageIndex}
                      zoom={zoom}
                      onZoomChange={setZoom}
                      textScrollRef={textScrollRef}
                      text={textQuery.data ?? null}
                      textLoading={textQuery.isPending}
                      textFailed={textQuery.isError}
                    />
                  </div>

                  {/* Título na parte superior, sobre degradê transparente. */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background/95 via-background/60 to-transparent px-4 pt-4 pb-12 transition-opacity duration-300",
                      !imageChromeVisible && "opacity-0"
                    )}
                  >
                    <h1 className="text-lg leading-tight font-semibold text-foreground sm:text-xl">
                      {title}
                    </h1>
                    {creator && (
                      <p className="mt-0.5 text-xs text-foreground/70">
                        {formatList(creator)}
                      </p>
                    )}
                  </div>

                  {/* Controles na barra inferior, também sobre degradê. */}
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background/95 via-background/60 to-transparent px-3 pt-12 pb-[calc(0.25rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] transition-opacity duration-300 sm:px-4",
                      !imageChromeVisible && "pointer-events-none opacity-0"
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
                      imageIndex={imageIndex}
                      onImageIndexChange={(index) => {
                        setImageIndex(index)
                        setZoom(1)
                      }}
                      favoriteTarget={favoriteTarget}
                      overlay
                      onOpenDescription={
                        !showInlineDescription && description
                          ? () => setDescriptionOpen(true)
                          : undefined
                      }
                    />
                    {/* Áudio em reprodução, abaixo dos botões. */}
                    <NowPlayingBar variant="floating" />
                  </div>
                </div>
              ) : isPdfStage && pdfFile ? (
                /* PDF integrado no mesmo estilo da galeria de imagens:
                     documento solto na tela, título no topo sobre degradê
                     e controles na barra inferior com degradê. */
                <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
                  {/* Documento integrado à interface: páginas desenhadas
                        pelo pdf.js (funciona também no WebView do app). */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      pdfChromeVisible
                        ? "Ocultar controles"
                        : "Mostrar controles"
                    }
                    onPointerDown={(event) => {
                      pdfTapStart.current = {
                        x: event.clientX,
                        y: event.clientY,
                      }
                    }}
                    onPointerUp={() => {
                      // Mantém o start para o onClick avaliar a distância.
                    }}
                    onClick={(event) => {
                      const start = pdfTapStart.current
                      if (!start) {
                        return
                      }
                      const moved = Math.hypot(
                        event.clientX - start.x,
                        event.clientY - start.y
                      )
                      // Só alterna os controles quando não foi rolagem.
                      if (moved < 8) {
                        toggleChrome(setPdfChromeVisible)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setPdfChromeVisible((visible) => !visible)
                      }
                    }}
                    className="absolute inset-0 overflow-hidden bg-background outline-none"
                  >
                    <PdfPages
                      url={buildCorsFileUrl(identifier, pdfFile.name)}
                      zoom={pdfZoom}
                      onZoomChange={setPdfZoom}
                      onPageInfo={({ count, aspect }) => {
                        setPdfPageCount(count)
                        setPdfPageAspect(aspect)
                        const saved = restoredPdfPageRef.current
                        if (saved && saved > 0 && saved <= count) {
                          restoredPdfPageRef.current = 0
                          setPdfPageRequest({ page: saved, nonce: Date.now() })
                        } else {
                          restoredPdfPageRef.current = 0
                        }
                      }}
                      currentPage={pdfPage}
                      onCurrentPageChange={setPdfPage}
                      onDocumentReady={setPdfDocument}
                      requestedPage={pdfPageRequest}
                    />
                  </div>

                  {/* Título na parte superior, sobre degradê transparente. */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background/95 via-background/60 to-transparent px-4 pt-4 pb-12 transition-opacity duration-300",
                      !pdfChromeVisible && "opacity-0"
                    )}
                  >
                    <h1 className="text-lg leading-tight font-semibold text-foreground sm:text-xl">
                      {title}
                    </h1>
                    {creator && (
                      <p className="mt-0.5 text-xs text-foreground/70">
                        {formatList(creator)}
                      </p>
                    )}
                  </div>

                  {/* Controles na barra inferior, também sobre degradê. */}
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background/95 via-background/60 to-transparent px-3 pt-12 pb-[calc(0.25rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] transition-opacity duration-300 sm:px-4",
                      !pdfChromeVisible && "pointer-events-none opacity-0"
                    )}
                  >
                    <PlayerBottomBar
                      type={type}
                      identifier={identifier}
                      title={title}
                      files={files}
                      mediatype={mediatype}
                      textMode={textMode}
                      textScrollRef={textScrollRef}
                      zoom={pdfZoom}
                      onZoomChange={setPdfZoom}
                      pdfPage={pdfPage}
                      pdfPageCount={pdfPageCount}
                      pdfPageAspect={pdfPageAspect}
                      pdfDocument={pdfDocument}
                      onPdfPageSelect={(page) =>
                        setPdfPageRequest({ page, nonce: Date.now() })
                      }
                      favoriteTarget={favoriteTarget}
                      onOpenDescription={
                        !showInlineDescription && description
                          ? () => setDescriptionOpen(true)
                          : undefined
                      }
                    />
                    {/* Áudio em reprodução, abaixo dos botões. */}
                    <NowPlayingBar variant="floating" />
                  </div>
                </div>
              ) : type !== "video" ? (
                <MediaViewer
                  type={type}
                  identifier={identifier}
                  files={files}
                  mediatype={mediatype}
                  title={title}
                  creator={creator}
                  audioIndex={audioIndex}
                  onAudioIndexChange={setAudioIndex}
                  resumeTime={
                    resume?.audioIndex === audioIndex ? resume.time : undefined
                  }
                  actions={
                    type === "audio" ? (
                      <PlayerBottomBar
                        type={type}
                        identifier={identifier}
                        title={title}
                        favoriteTarget={favoriteTarget}
                        onOpenPlaylist={() => setPlaylistOpen(true)}
                        onOpenDescription={
                          !showInlineDescription && description
                            ? () => setDescriptionOpen(true)
                            : undefined
                        }
                      />
                    ) : undefined
                  }
                  zoom={zoom}
                  onZoomChange={setZoom}
                  textScrollRef={textScrollRef}
                  text={textQuery.data ?? null}
                  textLoading={textQuery.isPending}
                  textFailed={textQuery.isError}
                />
              ) : null}
            </div>
          )}
        </div>
      </main>

      {/* Bottom bar flutuante, dinâmica por tipo de player e pelo número
          de controles que contém (o tamanho se ajusta ao conteúdo). Em
          telas pequenas, quando cheia, rola horizontalmente em vez de
          ficar cortada. */}
      {view === "player" &&
        type !== "video" &&
        type !== "image" &&
        type !== "audio" &&
        !isPdfStage &&
        !isPending &&
        !isError &&
        data && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:p-4 sm:pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
            <div
              className={cn(
                "pointer-events-auto rounded-4xl bg-card/95 shadow-xl ring-1 ring-foreground/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80",
                // Texto/desconhecido: a barra fica do tamanho do conteúdo.
                "w-fit max-w-full"
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
            {/* Áudio em reprodução, abaixo dos botões. */}
            <NowPlayingBar variant="floating" />
          </div>
        )}

      {/* Mini player flutuante nas telas sem a barra de navegação
          (metadados e player de vídeo). */}
      {!isPending &&
        !isError &&
        data &&
        (view === "metadata" || (view === "player" && type === "video")) && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:p-4 sm:pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
            <NowPlayingBar variant="floating" />
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

      {/* Lista de reprodução em modal (áudio). */}
      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent className="top-auto right-0 bottom-0 left-0 max-w-none translate-x-0 translate-y-0 rounded-t-4xl rounded-b-none sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl">
          <DialogHeader>
            <DialogTitle>Lista de reprodução</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <AudioPlaylist
              files={audioFiles}
              activeIndex={audioIndex}
              creator={creator}
              onSelect={(index) => {
                setAudioIndex(index)
                setPlaylistOpen(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

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
  scrolled,
}: {
  identifier: string
  title: string
  onBack: () => void
  view: StageView
  onViewChange: (view: StageView) => void
  metadataDisabled?: boolean
  scrolled: boolean
}) {
  return (
    <header
      className={cn(
        "relative shrink-0 pt-safe transition-[background-color] duration-200",
        scrolled ? "bg-background" : "bg-transparent"
      )}
    >
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

      {/* Degradê abaixo da barra, só quando sólida, para misturar com o
          conteúdo que rola por baixo — a mesma dinâmica da tela inicial. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
          scrolled ? "opacity-100" : "opacity-0"
        )}
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
  showBadges = true,
}: {
  mediatype?: string
  title: string
  creator: string | string[] | undefined
  year: string
  /** Mantém o título em uma única linha (com reticências) — usado nos
      players que não são vídeo; o vídeo pode quebrar linha como no YouTube. */
  singleLine?: boolean
  /** Exibe as tags de tipo/ano acima do título. */
  showBadges?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {showBadges && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{mediaTypeLabel(mediatype)}</Badge>
          {year && <Badge variant="outline">{year}</Badge>}
        </div>
      )}
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

/**
 * Palco do player de vídeo. No celular, visor, título, ações, descrição e
 * outros vídeos do item ficam empilhados. Em telas grandes, o player e os
 * controles vão para a coluna esquerda e a descrição com a lista de
 * reprodução para a direita — cada coluna rola por conta própria e as duas
 * ficam alinhadas no topo.
 */
function VideoStage({
  identifier,
  creator,
  videoFiles,
  videoIndex,
  onSelectVideo,
  description,
  viewer,
  header,
  actions,
}: {
  identifier: string
  creator: string | string[] | undefined
  videoFiles: ArchiveFile[]
  videoIndex: number
  onSelectVideo: (index: number) => void
  description?: string
  viewer: ReactNode
  header: ReactNode
  actions: ReactNode
}) {
  // Sem descrição nem lista, o player ocupa a largura toda.
  const hasSidebar = Boolean(description) || videoFiles.length > 1

  const descriptionCard = description ? (
    <div className="rounded-4xl bg-card p-4 ring-1 ring-border sm:p-5">
      <h2 className="mb-2 text-sm font-semibold">Descrição</h2>
      <Description description={description} />
    </div>
  ) : null

  const playlist =
    videoFiles.length > 1 ? (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Lista de reprodução</h2>
        <div className="flex flex-col gap-2">
          {videoFiles.map((file, index) => {
            const active = index === videoIndex
            return (
              <button
                key={file.name}
                type="button"
                onClick={() => onSelectVideo(index)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-3 rounded-3xl p-2 text-left transition-colors",
                  active ? "bg-muted ring-1 ring-border" : "hover:bg-muted/50"
                )}
              >
                <img
                  src={buildThumbnailUrl(identifier)}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-24 shrink-0 rounded-2xl bg-muted object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {file.title || file.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatList(creator) || "Internet Archive"}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    ) : null

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        hasSidebar &&
          "lg:mx-auto lg:grid lg:h-full lg:w-full lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-8 lg:overflow-hidden 2xl:max-w-6xl"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-5",
          hasSidebar && "lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1"
        )}
      >
        {/* O visor acompanha a altura da tela: em telas baixas ele encolhe
            para o título e as ações continuarem visíveis abaixo. */}
        <div className="mx-auto w-full lg:[max-width:min(100%,calc((100svh_-_20rem)*16/9),56rem)]">
          {viewer}
        </div>
        {header}
        {actions}
        {/* No celular, descrição e outros vídeos ficam no fluxo. */}
        {hasSidebar && (
          <div className="flex flex-col gap-5 lg:hidden">
            {descriptionCard}
            {playlist}
          </div>
        )}
      </div>

      {/* Em telas grandes, descrição e lista de reprodução à direita,
          com rolagem própria e alinhadas no topo. */}
      {hasSidebar && (
        <aside className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:pr-1">
          {descriptionCard}
          {playlist}
        </aside>
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
