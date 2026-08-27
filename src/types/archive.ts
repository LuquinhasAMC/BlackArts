/**
 * Tipos relacionados à API pública do Internet Archive.
 */

/** Item normalizado retornado pela busca do Internet Archive. */
export interface ArchiveSearchItem {
  identifier: string
  title: string
  description?: string
  mediatype?: string
  year?: string
  creator?: string | string[]
  downloads?: number
  itemSize?: number
  thumbnail?: string
}

/** Resposta da busca (advancedsearch.php). */
export interface ArchiveSearchResponse {
  numFound: number
  start: number
  items: ArchiveSearchItem[]
}

/** Arquivo listado nos metadados de um item. */
export interface ArchiveFile {
  name: string
  format?: string
  size?: string | number
  length?: string | number
  title?: string
  source?: string
}

/** Metadados completos de um item (GET /metadata/{identifier}). */
export interface ArchiveMetadata {
  metadata?: Record<string, unknown>
  files?: ArchiveFile[]
  server?: string
  dir?: string
  created?: number
  d1?: string
  d2?: string
}

/** Parâmetros da busca no Internet Archive. */
export interface SearchArchiveParams {
  q: string
  mediatype?: string
  category?: string
  page?: number
  rows?: number
  sort?: string
  signal?: AbortSignal
}
