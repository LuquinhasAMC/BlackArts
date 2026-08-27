import type { ComponentType, RefObject } from "react"

import { resolveMediaType, type MediaType } from "@/lib/media"
import type { ArchiveFile } from "@/types/archive"

import { AudioViewer } from "./audio-viewer"
import { FallbackViewer } from "./fallback-viewer"
import { ImageViewer } from "./image-viewer"
import { TextViewer } from "./text-viewer"
import { VideoViewer } from "./video-viewer"

/** Props compartilhadas por todos os visualizadores de mídia. */
export interface MediaViewerProps {
  identifier: string
  files?: ArchiveFile[]
  mediatype?: string
  /** Tipo já resolvido (para o visualizador e a bottom bar concordarem). */
  type?: MediaType
  /** Nível de zoom (imagens). */
  zoom?: number
  /** Atualiza o zoom (imagens) — usado por gestos no visualizador. */
  onZoomChange?: (zoom: number) => void
  /** Referência do contêiner rolável de texto (controles de navegação). */
  textScrollRef?: RefObject<HTMLDivElement | null>
  /** Texto puro já carregado (documentos em modo inline). */
  text?: string | null
  textLoading?: boolean
  textFailed?: boolean
}

type ViewerComponent = ComponentType<MediaViewerProps>

/**
 * Registro de visualizadores. Para adicionar um novo tipo de mídia no
 * futuro, basta ampliar a união `MediaType` e registrar o componente
 * aqui — as telas não precisam mudar.
 */
const viewers: Record<MediaType, ViewerComponent> = {
  audio: AudioViewer,
  video: VideoViewer,
  image: ImageViewer,
  text: TextViewer,
  unknown: FallbackViewer,
}

/** Registra (ou substitui) o visualizador de um tipo de mídia. */
export function registerViewer(type: MediaType, component: ViewerComponent) {
  viewers[type] = component
}

/**
 * Visualizador principal: identifica o tipo de mídia do item e
 * renderiza o componente adequado.
 */
export function MediaViewer({
  identifier,
  files,
  mediatype,
  type: typeOverride,
  ...rest
}: MediaViewerProps) {
  const type = typeOverride ?? resolveMediaType(mediatype, files)
  const Viewer = viewers[type] ?? FallbackViewer

  return (
    <Viewer
      identifier={identifier}
      files={files}
      mediatype={mediatype}
      type={type}
      {...rest}
    />
  )
}
