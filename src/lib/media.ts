import type { ArchiveFile } from "@/types/archive"

/** Tipos de mídia suportados pelo sistema de visualizadores. */
export type MediaType = "audio" | "video" | "image" | "text" | "unknown"

/** Extensões de áudio suportadas pelos navegadores (em ordem de preferência). */
const AUDIO_EXTENSIONS = [
  "mp3",
  "m4a",
  "ogg",
  "oga",
  "wav",
  "flac",
  "aac",
  "opus",
  "webm",
] as const

/** Extensões de vídeo suportadas (em ordem de preferência). */
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogv", "m4v", "mov"] as const

/** Extensões de imagem. */
const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tif",
  "tiff",
] as const

/** Extensões de documento/texto. */
const TEXT_EXTENSIONS = [
  "pdf",
  "epub",
  "djvu",
  "txt",
  "djvu.txt",
  "text",
] as const

/** Extensões de arquivos compactados (não são mídia reproduzível). */
const ARCHIVE_EXTENSIONS = [
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "z",
] as const

/** Formatos de áudio mencionados nos metadados do Internet Archive. */
const AUDIO_FORMATS = [
  "mp3",
  "ogg",
  "wav",
  "m4a",
  "flac",
  "vbr mp3",
  "apple lossless",
] as const

/** Formatos de vídeo mencionados nos metadados. */
const VIDEO_FORMATS = [
  "mp4",
  "webm",
  "h.264",
  "mpeg4",
  "mpeg-4",
  "m4v",
] as const

/** Formatos de imagem mencionados nos metadados. */
const IMAGE_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "gif",
  "webp",
  "item tile",
  "thumbnail",
] as const

/** Formatos de documento mencionados nos metadados. */
const TEXT_FORMATS = ["pdf", "epub", "djvu", "text"] as const

/** Extensão (minúscula, sem ponto) de um nome de arquivo. */
export function getFileExtension(name: string): string {
  const clean = name.split("?")[0] ?? name
  const lastDot = clean.lastIndexOf(".")
  if (lastDot < 0) {
    return clean.toLowerCase()
  }
  return clean.slice(lastDot + 1).toLowerCase()
}

function hasExtension(name: string, extensions: readonly string[]): boolean {
  const ext = getFileExtension(name)
  return extensions.some((candidate) => ext === candidate)
}

function hasFormat(
  format: string | undefined,
  formats: readonly string[]
): boolean {
  if (!format) {
    return false
  }
  const normalized = format.toLowerCase()
  return formats.some((candidate) => normalized.includes(candidate))
}

/** Verdadeiro quando o arquivo é um arquivo compactado (zip, rar…). */
export function isArchiveFile(name: string): boolean {
  return hasExtension(name, ARCHIVE_EXTENSIONS)
}

/** Agrupa os arquivos de um item por tipo de mídia. */
export function groupFilesByType(files: ArchiveFile[] | undefined): {
  audio: ArchiveFile[]
  video: ArchiveFile[]
  image: ArchiveFile[]
  text: ArchiveFile[]
} {
  const audio: ArchiveFile[] = []
  const video: ArchiveFile[] = []
  const image: ArchiveFile[] = []
  const text: ArchiveFile[] = []

  for (const file of files ?? []) {
    if (!file?.name) {
      continue
    }
    // Arquivos compactados não são mídia reproduzível: ignora.
    if (isArchiveFile(file.name)) {
      continue
    }
    if (
      hasExtension(file.name, AUDIO_EXTENSIONS) ||
      hasFormat(file.format, AUDIO_FORMATS)
    ) {
      audio.push(file)
    } else if (
      hasExtension(file.name, VIDEO_EXTENSIONS) ||
      hasFormat(file.format, VIDEO_FORMATS)
    ) {
      video.push(file)
    } else if (
      hasExtension(file.name, TEXT_EXTENSIONS) ||
      hasFormat(file.format, TEXT_FORMATS)
    ) {
      text.push(file)
    } else if (
      hasExtension(file.name, IMAGE_EXTENSIONS) ||
      hasFormat(file.format, IMAGE_FORMATS)
    ) {
      image.push(file)
    }
  }

  return { audio, video, image, text }
}

/**
 * Resolve o tipo de mídia de um item a partir do mediatype e dos
 * arquivos disponíveis. Usa os arquivos para refinar quando o
 * mediatype é ausente ou ambíguo.
 */
export function resolveMediaType(
  mediatype: string | undefined,
  files?: ArchiveFile[]
): MediaType {
  const groups = groupFilesByType(files)

  if (mediatype === "audio" || mediatype === "etree") {
    return "audio"
  }
  if (mediatype === "movies" || mediatype === "video") {
    return "video"
  }
  if (mediatype === "image") {
    return "image"
  }
  if (mediatype === "texts" || mediatype === "text") {
    return "text"
  }

  // Sem mediatype confiável, tenta inferir pelos arquivos.
  if (groups.audio.length > 0 && groups.video.length === 0) {
    return "audio"
  }
  if (groups.video.length > 0) {
    return "video"
  }
  if (groups.text.length > 0) {
    return "text"
  }
  if (groups.image.length > 0) {
    return "image"
  }

  return "unknown"
}

/** Rótulo legível de um mediatype do Internet Archive. */
export function mediaTypeLabel(mediatype: string | undefined): string {
  switch (mediatype) {
    case "audio":
    case "etree":
      return "Áudio"
    case "movies":
      return "Vídeo"
    case "image":
      return "Imagem"
    case "texts":
      return "Texto"
    case "collection":
      return "Coleção"
    case "data":
      return "Dados"
    default:
      return "Outro"
  }
}

/** Escolhe o melhor arquivo de áudio para reprodução. */
export function pickAudioFile(
  files: ArchiveFile[] | undefined
): ArchiveFile | undefined {
  const { audio } = groupFilesByType(files)
  if (audio.length === 0) {
    return undefined
  }
  return (
    audio.find((file) => hasExtension(file.name, ["mp3"])) ??
    audio.find((file) => hasExtension(file.name, ["m4a"])) ??
    audio.find((file) => hasExtension(file.name, ["ogg", "oga"])) ??
    audio.find((file) => hasExtension(file.name, ["wav"])) ??
    audio.find((file) => hasExtension(file.name, ["flac"])) ??
    audio[0]
  )
}

/** Lista de arquivos de áudio ordenada por preferência de formato. */
export function audioFilesByPreference(
  files: ArchiveFile[] | undefined
): ArchiveFile[] {
  const { audio } = groupFilesByType(files)
  const priority = [
    "mp3",
    "m4a",
    "ogg",
    "oga",
    "wav",
    "flac",
    "aac",
    "opus",
    "webm",
  ]
  return [...audio].sort((a, b) => {
    const pa = priority.indexOf(getFileExtension(a.name))
    const pb = priority.indexOf(getFileExtension(b.name))
    return (
      (pa === -1 ? priority.length : pa) - (pb === -1 ? priority.length : pb)
    )
  })
}

/** Escolhe o melhor arquivo de vídeo para reprodução. */
export function pickVideoFile(
  files: ArchiveFile[] | undefined
): ArchiveFile | undefined {
  const { video } = groupFilesByType(files)
  if (video.length === 0) {
    return undefined
  }
  // Prefere o arquivo principal (nome sem sufixos de qualidade/preview).
  const main = video.find((file) => {
    const lower = file.name.toLowerCase()
    return (
      hasExtension(file.name, ["mp4", "webm", "m4v"]) &&
      !lower.includes("_512kb") &&
      !lower.includes("_small") &&
      !lower.includes("_hi") &&
      !lower.includes("_low")
    )
  })
  return (
    main ??
    video.find((file) => hasExtension(file.name, ["mp4", "webm", "m4v"])) ??
    video[0]
  )
}

/** Escolhe a melhor imagem para exibição (exclui thumbnails geradas). */
export function pickImageFile(
  files: ArchiveFile[] | undefined,
  identifier?: string
): ArchiveFile | undefined {
  const { image } = groupFilesByType(files)
  if (image.length === 0) {
    return undefined
  }

  const real = image.filter((file) => !file.name.includes("__ia_thumb"))
  const pool = real.length > 0 ? real : image

  if (identifier) {
    const named = pool.find((file) =>
      file.name.toLowerCase().includes(identifier.toLowerCase())
    )
    if (named) {
      return named
    }
  }

  return (
    pool.find((file) => hasExtension(file.name, ["jpg", "jpeg"])) ??
    pool.find((file) => hasExtension(file.name, ["png"])) ??
    pool[0]
  )
}

/** Escolhe o arquivo PDF para visualização em iframe. */
export function pickPdfFile(
  files: ArchiveFile[] | undefined
): ArchiveFile | undefined {
  const { text } = groupFilesByType(files)
  return text.find((file) => hasExtension(file.name, ["pdf"]))
}

/** Modo de exibição de um item de texto/documento. */
export type TextSourceMode = "inline" | "pdf" | "none"

/**
 * Decide como exibir um documento: texto puro rolável (inline), PDF
 * embutido ou sem visualização (fallback). Prefere texto puro quando há
 * um arquivo .txt (exceto os gigantes autogerados de DjVu), senão PDF.
 */
export function resolveTextSource(
  files: ArchiveFile[] | undefined
): TextSourceMode {
  const { text } = groupFilesByType(files)
  if (!text || text.length === 0) {
    return "none"
  }

  const hasPlainTxt = text.some(
    (file) =>
      /\.txt$/i.test(file.name) && !/djvu\.txt$/i.test(file.name.toLowerCase())
  )
  if (hasPlainTxt) {
    return "inline"
  }

  if (text.some((file) => getFileExtension(file.name) === "pdf")) {
    return "pdf"
  }

  return "none"
}

/** Escolhe o arquivo de texto puro para exibição inline. */
export function pickInlineTextFile(
  files: ArchiveFile[] | undefined
): ArchiveFile | undefined {
  const { text } = groupFilesByType(files)
  return text.find(
    (file) =>
      /\.txt$/i.test(file.name) && !/djvu\.txt$/i.test(file.name.toLowerCase())
  )
}

/** Converte um valor string|array em texto separado por vírgula. */
export function formatList(value: string | string[] | undefined): string {
  if (!value) {
    return ""
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => entry.length > 0).join(", ")
  }
  return value
}

/** Formata um número de downloads de forma legível. */
export function formatDownloads(downloads: number | undefined): string {
  if (downloads === undefined || Number.isNaN(downloads)) {
    return ""
  }
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(
    downloads
  )
}

/** Formata um tamanho em bytes. */
export function formatBytes(bytes: number | string | undefined): string {
  if (bytes === undefined || bytes === "") {
    return ""
  }
  const value = typeof bytes === "string" ? Number(bytes) : bytes
  if (!Number.isFinite(value) || value <= 0) {
    return ""
  }
  const units = ["B", "KB", "MB", "GB", "TB"]
  let index = 0
  let size = value
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

/** Extrai o ano (4 dígitos) de um campo de data/ano. */
export function extractYear(year: string | undefined): string {
  if (!year) {
    return ""
  }
  const match = year.match(/\d{4}/)
  return match ? match[0] : year
}
