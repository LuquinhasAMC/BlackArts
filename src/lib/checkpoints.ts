import { readStorage, writeStorage } from "./storage"

/** Tipo de mídia de uma obra (mesma união usada pelos visualizadores). */
export type CheckpointType = "audio" | "video" | "image" | "text" | "unknown"

/**
 * Onde o usuário parou em uma obra. Cada tipo guarda o que faz sentido:
 * documento (página), imagem (índice), vídeo (minutagem + vídeo) e áudio
 * (minutagem + faixa da lista de reprodução).
 */
export interface Checkpoint {
  identifier: string
  title: string
  thumbnail: string
  type: CheckpointType
  /** Momento da última visita/progresso (usado para ordenar a fileira). */
  updatedAt: number
  /** Documento: página atual (1-based). */
  page?: number
  pageCount?: number
  /** Galeria: imagem atual. */
  imageIndex?: number
  imageCount?: number
  /** Vídeo: arquivo atual e posição. */
  videoIndex?: number
  /** Áudio/vídeo: posição em segundos. */
  time?: number
  duration?: number
  /** Áudio: faixa atual da lista de reprodução. */
  audioIndex?: number
}

const STORAGE_KEY = "blackarts:checkpoints"
/** Quantas obras a fileira "Continuar de onde parou" mantém. */
const MAX_CHECKPOINTS = 24

let cached: Checkpoint[] | null = null
const listeners = new Set<() => void>()

function isCheckpoint(value: unknown): value is Checkpoint {
  if (!value || typeof value !== "object") {
    return false
  }
  const entry = value as Partial<Checkpoint>
  return (
    typeof entry.identifier === "string" &&
    typeof entry.title === "string" &&
    typeof entry.updatedAt === "number"
  )
}

/** Lista de obras vistas, da mais recente para a mais antiga. */
export function getCheckpoints(): Checkpoint[] {
  if (cached) {
    return cached
  }
  const stored = readStorage<unknown>(STORAGE_KEY, [])
  cached = Array.isArray(stored)
    ? stored
        .filter(isCheckpoint)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CHECKPOINTS)
    : []
  return cached
}

/** Checkpoint de uma obra (ou null se ela nunca foi aberta). */
export function getCheckpoint(identifier: string): Checkpoint | null {
  return (
    getCheckpoints().find((entry) => entry.identifier === identifier) ?? null
  )
}

/** Notifica os inscritos (hook) quando a lista muda. */
export function subscribeCheckpoints(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      ;(result as Record<string, unknown>)[key] = item
    }
  }
  return result
}

/**
 * Salva (ou atualiza) o checkpoint de uma obra. Campos ausentes são
 * preservados: atualizar a página de um documento não apaga a minutagem
 * que outro player tivesse gravado, e voltar ao item não perde o progresso.
 */
export function saveCheckpoint(
  entry: Omit<Checkpoint, "updatedAt"> & { updatedAt?: number }
): void {
  const previous = getCheckpoint(entry.identifier)
  const next: Checkpoint = {
    ...previous,
    ...withoutUndefined(entry),
    updatedAt: entry.updatedAt ?? Date.now(),
  } as Checkpoint

  const list = getCheckpoints().filter(
    (item) => item.identifier !== entry.identifier
  )
  cached = [next, ...list]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CHECKPOINTS)
  writeStorage(STORAGE_KEY, cached)
  for (const listener of listeners) {
    listener()
  }
}

/** Remove uma obra da fileira "Continuar de onde parou". */
export function removeCheckpoint(identifier: string): void {
  const list = getCheckpoints()
  if (!list.some((entry) => entry.identifier === identifier)) {
    return
  }
  cached = list.filter((entry) => entry.identifier !== identifier)
  writeStorage(STORAGE_KEY, cached)
  for (const listener of listeners) {
    listener()
  }
}

/** Formata segundos como m:ss (ou h:mm:ss em obras longas). */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00"
  }
  const total = Math.floor(seconds)
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const pad = (value: number) => String(value).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Rótulo curto do progresso, exibido no card da fileira. */
export function checkpointProgress(entry: Checkpoint): string | null {
  if (entry.type === "text" && entry.page) {
    return entry.pageCount
      ? `Página ${entry.page} de ${entry.pageCount}`
      : `Página ${entry.page}`
  }
  if (entry.type === "image" && entry.imageIndex !== undefined) {
    const current = entry.imageIndex + 1
    return entry.imageCount
      ? `Foto ${current} de ${entry.imageCount}`
      : `Foto ${current}`
  }
  if (
    (entry.type === "audio" || entry.type === "video") &&
    entry.time !== undefined &&
    entry.time > 1
  ) {
    return entry.duration
      ? `${formatClock(entry.time)} de ${formatClock(entry.duration)}`
      : formatClock(entry.time)
  }
  return null
}
