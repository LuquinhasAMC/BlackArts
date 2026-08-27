import type { MediaType } from "@/lib/media"
import { buildThumbnailUrl } from "@/lib/archive-api"
import type { ArchiveSearchItem } from "@/types/archive"

import audioItems from "./audio.json"
import imageItems from "./image.json"
import rowsJson from "./rows.json"
import textItems from "./text.json"
import videoItems from "./video.json"

/**
 * Obra curada: estrutura mínima (`id`, `type`, `url`) + metadados de
 * exibição opcionais. Estas são as ÚNICAS obras exibidas no catálogo.
 */
export interface CuratedItem {
  id: string
  type: MediaType
  url: string
  title?: string
  creator?: string
  year?: string
  /** Tags temáticas — podem se repetir entre obras do mesmo tema. */
  tags?: string[]
}

/**
 * Fileira do catálogo (estilo Netflix): um título e um filtro por
 * tags e/ou tipos de mídia. Obras entram na fileira quando a tag
 * coincide ou o tipo corresponde.
 */
export interface CuratedRow {
  id: string
  title: string
  tags?: string[]
  types?: MediaType[]
}

/** Mediatype do Internet Archive correspondente a cada tipo do app. */
const MEDIATYPE_BY_TYPE: Record<MediaType, string> = {
  audio: "audio",
  video: "movies",
  image: "image",
  text: "texts",
  unknown: "data",
}

/** Todas as obras curadas, na ordem das bases (áudio, vídeo, imagem, texto). */
export const CURATED_ITEMS: CuratedItem[] = [
  ...(audioItems as CuratedItem[]),
  ...(videoItems as CuratedItem[]),
  ...(imageItems as CuratedItem[]),
  ...(textItems as CuratedItem[]),
]

/** Todas as fileiras (Netflix) definidas em rows.json. */
export const CURATED_ROWS: CuratedRow[] = rowsJson as CuratedRow[]

/** Índice por identificador para consultas rápidas. */
const BY_ID = new Map(CURATED_ITEMS.map((item) => [item.id, item]))

/** Busca uma obra curada pelo identificador do Internet Archive. */
export function findCuratedItem(
  identifier: string
): CuratedItem | undefined {
  return BY_ID.get(identifier)
}

/** Converte um item curado no formato usado pelos cards do catálogo. */
export function curatedToCatalogItem(item: CuratedItem): ArchiveSearchItem {
  return {
    identifier: item.id,
    title: item.title ?? item.id,
    mediatype: MEDIATYPE_BY_TYPE[item.type],
    year: item.year,
    creator: item.creator,
    thumbnail: buildThumbnailUrl(item.id),
  }
}

/** Embaralha uma cópia do array (Fisher–Yates). */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Retorna `count` itens aleatórios (sem repetir), em ordem aleatória. */
export function sample<T>(items: readonly T[], count: number): T[] {
  return shuffle(items).slice(0, Math.max(0, count))
}

/** Obras que entram em uma fileira (tag coincide OU tipo corresponde). */
export function itemsForRow(row: CuratedRow): CuratedItem[] {
  const tagSet = new Set(row.tags ?? [])
  const typeSet = new Set(row.types ?? [])
  return CURATED_ITEMS.filter((item) => {
    const byTag = item.tags?.some((tag) => tagSet.has(tag)) ?? false
    const byType = typeSet.size > 0 && typeSet.has(item.type)
    return byTag || byType
  })
}
