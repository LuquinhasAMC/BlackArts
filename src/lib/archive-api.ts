import { ARCHIVE, DEFAULT_QUERY } from "@/config/archive"
import type {
  ArchiveMetadata,
  ArchiveSearchItem,
  ArchiveSearchResponse,
  SearchArchiveParams,
} from "@/types/archive"

/** Erro de API com status HTTP (quando disponível). */
export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** Pega o primeiro valor string de um campo que pode vir como string, array ou número. */
export function firstString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.length > 0 ? value : undefined
  }
  if (typeof value === "number") {
    return String(value)
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.length > 0) {
        return entry
      }
    }
  }
  return undefined
}

/** Normaliza o campo creator, que pode vir como string ou array. */
export function normalizeCreator(
  value: unknown
): string | string[] | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value
  }
  if (Array.isArray(value)) {
    const creators = value.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0
    )
    return creators.length > 0 ? creators : undefined
  }
  return undefined
}

/** Normaliza um documento bruto da busca em um item do catálogo. */
function normalizeSearchDoc(doc: Record<string, unknown>): ArchiveSearchItem {
  const identifier = firstString(doc.identifier) ?? ""

  return {
    identifier,
    title: firstString(doc.title) ?? identifier,
    description: firstString(doc.description),
    mediatype: firstString(doc.mediatype),
    year: firstString(doc.year),
    creator: normalizeCreator(doc.creator),
    downloads: typeof doc.downloads === "number" ? doc.downloads : undefined,
    itemSize: typeof doc.item_size === "number" ? doc.item_size : undefined,
    thumbnail: identifier ? buildThumbnailUrl(identifier) : undefined,
  }
}

/** Busca JSON com timeout e suporte a cancelamento via AbortSignal. */
async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error("timeout")),
    ARCHIVE.requestTimeoutMs
  )

  const onOuterAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener("abort", onOuterAbort, { once: true })

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new ApiError(
        `A API do Internet Archive respondeu com status ${response.status}`,
        response.status
      )
    }

    return await response.json()
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener("abort", onOuterAbort)
  }
}

/**
 * Busca itens no Internet Archive (advancedsearch.php).
 * Retorna os itens normalizados, total de resultados e posição inicial.
 */
export async function searchArchiveItems(
  params: SearchArchiveParams
): Promise<ArchiveSearchResponse> {
  const page = Math.max(1, params.page ?? 1)
  const rows = params.rows ?? ARCHIVE.pageSize
  const query = buildSearchQuery(params.q, params.category)

  const url = new URL(ARCHIVE.searchEndpoint)
  url.searchParams.set("q", query)
  url.searchParams.set("output", "json")
  url.searchParams.set("page", String(page))
  url.searchParams.set("rows", String(rows))
  url.searchParams.set("sort[]", params.sort ?? ARCHIVE.defaultSort)
  if (params.mediatype) {
    url.searchParams.set("mediatype", params.mediatype)
  }
  for (const field of ARCHIVE.fields) {
    url.searchParams.append("fl[]", field)
  }

  const data = (await fetchJson(url.toString(), params.signal)) as {
    response?: { numFound?: number; start?: number; docs?: unknown[] }
    error?: string
  }

  if (data.error) {
    throw new Error(data.error)
  }

  const response = data.response
  if (!response || !Array.isArray(response.docs)) {
    throw new Error("Resposta inválida da API do Internet Archive")
  }

  return {
    numFound: response.numFound ?? 0,
    start: response.start ?? 0,
    items: response.docs.map((doc) =>
      normalizeSearchDoc((doc ?? {}) as Record<string, unknown>)
    ),
  }
}

/**
 * Monta a query da busca: prioriza o texto livre da pessoa usuária e
 * usa a curadoria padrão apenas quando não há pesquisa digitada.
 * Termos de categoria são combinados com "AND" quando selecionados.
 */
export function buildSearchQuery(q: string, categoryTerms?: string): string {
  const base = q.trim() ? `(${q.trim()})` : DEFAULT_QUERY
  if (categoryTerms) {
    return `${base} AND ${categoryTerms}`
  }
  return base
}

/** Busca os metadados completos de um item. */
export async function getItemDetails(
  identifier: string,
  signal?: AbortSignal
): Promise<ArchiveMetadata> {
  const url = `${ARCHIVE.baseUrl}/metadata/${encodeURIComponent(identifier)}`
  const data = (await fetchJson(url, signal)) as ArchiveMetadata & {
    error?: string
  }

  if (data.error) {
    throw new Error(data.error)
  }
  if (!data.metadata) {
    throw new Error("Item não encontrado no Internet Archive")
  }

  return {
    metadata: data.metadata ?? {},
    files: Array.isArray(data.files) ? data.files : [],
    server: data.server,
    dir: data.dir,
    created: data.created,
    d1: data.d1,
    d2: data.d2,
  }
}

/** URL de download de um arquivo de um item. */
export function buildFileUrl(identifier: string, fileName: string): string {
  return `${ARCHIVE.baseUrl}/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`
}

/** Busca o conteúdo de um arquivo de texto puro de um item. */
export async function fetchTextFile(
  identifier: string,
  fileName: string,
  signal?: AbortSignal
): Promise<string> {
  const url = buildFileUrl(identifier, fileName)
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error("timeout")),
    ARCHIVE.requestTimeoutMs
  )

  const onOuterAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener("abort", onOuterAbort, { once: true })

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new ApiError(
        `Falha ao carregar o texto (status ${response.status})`,
        response.status
      )
    }
    return await response.text()
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener("abort", onOuterAbort)
  }
}

/** URL da thumbnail/capa de um item. */
export function buildThumbnailUrl(identifier: string): string {
  return `${ARCHIVE.baseUrl}/services/img/${encodeURIComponent(identifier)}`
}

/** URL da página de detalhes do item no Internet Archive. */
export function buildDetailsUrl(identifier: string): string {
  return `${ARCHIVE.baseUrl}/details/${encodeURIComponent(identifier)}`
}

/** URL do player embutido do Internet Archive (fallback para alguns tipos). */
export function buildEmbedUrl(identifier: string): string {
  return `${ARCHIVE.baseUrl}/embed/${encodeURIComponent(identifier)}`
}
