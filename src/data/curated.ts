import { useCallback, useEffect, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { CURATED_DATA } from "@/config/archive"
import { buildThumbnailUrl } from "@/lib/archive-api"
import {
  DATA_FILES,
  configUrlFor,
  resolveDataUrls,
  type DataFile,
} from "@/lib/data-url"
import type { MediaType } from "@/lib/media"
import type { ArchiveSearchItem } from "@/types/archive"

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

/** Catálogo completo: obras de todos os tipos + fileiras. */
export interface CuratedCatalog {
  items: CuratedItem[]
  rows: CuratedRow[]
}

/** Mediatype do Internet Archive correspondente a cada tipo do app. */
const MEDIATYPE_BY_TYPE: Record<MediaType, string> = {
  audio: "audio",
  video: "movies",
  image: "image",
  text: "texts",
  unknown: "data",
}

const MEDIA_TYPES = new Set<string>([
  "audio",
  "video",
  "image",
  "text",
  "unknown",
])

/** Arquivos de obras, um por tipo de mídia. */
const ITEM_FILES = ["audio", "video", "image", "text"] as const

type FilePayloads = Record<DataFile, unknown[]>

/** Prefixo do registro de metadados (versão) no IndexedDB. */
const META_KEY = "__meta__"

/** Store do IndexedDB onde o catálogo fica guardado. */
const CACHE_STORE = "catalog"

interface CacheRecord {
  key: string
  data?: unknown[]
  /** Número da versão do config.json que esta cópia reflete. */
  version?: number
}

/**
 * Lê um JSON do repositório de dados como se fosse o endpoint de uma API
 * somente leitura.
 */
async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
  headers?: HeadersInit
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error("timeout")),
    CURATED_DATA.requestTimeoutMs
  )

  const onOuterAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener("abort", onOuterAbort, { once: true })

  try {
    const response = await fetch(url, { signal: controller.signal, headers })

    if (!response.ok) {
      throw new Error(`Falha ao carregar ${url} (status ${response.status})`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener("abort", onOuterAbort)
  }
}

/**
 * config.json local (`public/config.json`): o repositório de dados do fork.
 * Fica no projeto porque o app (inclusive o APK) não recebe esse endereço
 * por parâmetro; quem for fazer fork edita esse arquivo.
 */
let localConfigPromise: Promise<string> | null = null

async function loadDataBaseUrl(): Promise<string> {
  if (!localConfigPromise) {
    localConfigPromise = (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}config.json`, {
          cache: "no-cache",
        })
        if (response.ok) {
          const parsed = (await response.json()) as { dataBaseUrl?: unknown }
          if (
            typeof parsed.dataBaseUrl === "string" &&
            parsed.dataBaseUrl.trim()
          ) {
            return parsed.dataBaseUrl.trim().replace(/\/+$/, "")
          }
        }
      } catch {
        // Sem config local: usa o padrão embutido no build.
      }
      return CURATED_DATA.baseUrl
    })()
  }
  return localConfigPromise
}

interface DataSource {
  /** Versão do config.json remoto (`null` se ele não existe/está ilegível). */
  version: number | null
  files: Record<DataFile, string>
}

/**
 * Lê o config.json do repositório: versão do conteúdo e endereços dos
 * arquivos (`dataUrls`). Sem config, cai nos nomes padrão na raiz do
 * repositório — o app continua funcionando com um repositório antigo.
 */
async function fetchDataSource(signal?: AbortSignal): Promise<DataSource> {
  const baseUrl = await loadDataBaseUrl()
  let version: number | null = null
  let dataUrls: unknown

  try {
    const config = await fetchJson<{ version?: unknown; dataUrls?: unknown }>(
      `${configUrlFor(baseUrl)}?t=${Date.now()}`,
      signal
    )
    version = typeof config.version === "number" ? config.version : null
    dataUrls = config.dataUrls
  } catch {
    // Config fora do ar: procura os arquivos no caminho convencional.
  }

  return { version, files: resolveDataUrls(baseUrl, dataUrls) }
}

/**
 * Lê os cinco arquivos de uma vez (só quando é preciso baixar de novo).
 * Um arquivo ausente vira lista vazia; se nenhum responder, é erro.
 */
async function fetchAllFiles(
  files: Record<DataFile, string>,
  signal?: AbortSignal
): Promise<FilePayloads> {
  const results = await Promise.allSettled(
    DATA_FILES.map((file) => fetchJson<unknown[]>(files[file], signal))
  )

  const failed = results.filter((result) => result.status === "rejected").length
  if (failed === DATA_FILES.length) {
    throw new Error("Nenhum arquivo de dados pôde ser carregado.")
  }

  const payloads: Partial<FilePayloads> = {}
  DATA_FILES.forEach((file, index) => {
    const result = results[index]
    payloads[file] = result.status === "fulfilled" ? result.value : []
  })
  return payloads as FilePayloads
}

function isCuratedItem(value: unknown): value is CuratedItem {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<CuratedItem>
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.type === "string" &&
    MEDIA_TYPES.has(item.type)
  )
}

function isCuratedRow(value: unknown): value is CuratedRow {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<CuratedRow>
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.title === "string"
  )
}

function buildCatalog(files: Partial<FilePayloads>): CuratedCatalog {
  return {
    items: ITEM_FILES.flatMap((file) =>
      (files[file] ?? []).filter(isCuratedItem)
    ),
    rows: (files.rows ?? []).filter(isCuratedRow),
  }
}

/* ------------------------------------------------------------------ */
/* Cache local (IndexedDB)                                             */
/* ------------------------------------------------------------------ */

let cacheDbPromise: Promise<IDBDatabase | null> | null = null

/** Abre (uma vez) o banco IndexedDB do catálogo. `null` = indisponível. */
function openCacheDb(): Promise<IDBDatabase | null> {
  if (cacheDbPromise) return cacheDbPromise
  if (typeof indexedDB === "undefined") {
    cacheDbPromise = Promise.resolve(null)
    return cacheDbPromise
  }

  cacheDbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(CURATED_DATA.cacheDbName, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: "key" })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })

  return cacheDbPromise
}

/** Lê a cópia local do catálogo e a versão do repositório que ela reflete. */
async function readLocalCatalog(): Promise<{
  catalog: CuratedCatalog
  version: number | null
} | null> {
  const db = await openCacheDb()
  if (!db) return null

  try {
    const records = await new Promise<CacheRecord[]>((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE, "readonly")
      const request = transaction.objectStore(CACHE_STORE).getAll()
      request.onsuccess = () => resolve((request.result ?? []) as CacheRecord[])
      request.onerror = () => reject(request.error)
    })

    const files: Partial<FilePayloads> = {}
    for (const record of records) {
      if (record.key !== META_KEY && Array.isArray(record.data)) {
        files[record.key as DataFile] = record.data
      }
    }

    const catalog = buildCatalog(files)
    if (catalog.items.length === 0) return null

    const meta = records.find((record) => record.key === META_KEY)
    return {
      catalog,
      version: typeof meta?.version === "number" ? meta.version : null,
    }
  } catch {
    return null
  } finally {
    db.close()
  }
}

/** Grava a cópia local do catálogo (melhor esforço, nunca lança). */
async function writeLocalCatalog(
  files: FilePayloads,
  version: number | null
): Promise<void> {
  const db = await openCacheDb()
  if (!db) return

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE, "readwrite")
      const store = transaction.objectStore(CACHE_STORE)
      for (const file of DATA_FILES) {
        store.put({ key: file, data: files[file] } satisfies CacheRecord)
      }
      store.put({ key: META_KEY, version: version ?? undefined })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } catch {
    // Sem IndexedDB (modo privado, quota): o catálogo continua em memória.
  } finally {
    db.close()
  }
}

/* ------------------------------------------------------------------ */
/* Store do catálogo (compartilhado entre as telas)                    */
/* ------------------------------------------------------------------ */

type CatalogStatus = "idle" | "loading" | "ready" | "error"

interface CatalogSnapshot {
  catalog: CuratedCatalog | null
  status: CatalogStatus
  /** Versão do config.json que a cópia local reflete. */
  version: number | null
}

let snapshot: CatalogSnapshot = {
  catalog: null,
  status: "idle",
  version: null,
}

const listeners = new Set<() => void>()

function emit(patch: Partial<CatalogSnapshot>) {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener()
}

function subscribeCurated(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getCuratedSnapshot(): CatalogSnapshot {
  return snapshot
}

let loadPromise: Promise<void> | null = null

/**
 * Carrega o catálogo: usa o IndexedDB na hora e, se `checkUpdates`, faz
 * uma requisição à API para ver se o repositório mudou.
 */
async function runLoad(checkUpdates: boolean): Promise<void> {
  // 1) Cópia local: aparece na hora, mesmo offline.
  if (!snapshot.catalog) {
    const local = await readLocalCatalog()
    if (local) {
      emit({
        catalog: local.catalog,
        status: "ready",
        version: local.version,
      })
    }
  }

  // 2) Sem nada guardado: primeira carga precisa baixar os arquivos.
  if (!snapshot.catalog) {
    emit({ status: "loading" })
    try {
      const source = await fetchDataSource()
      const files = await fetchAllFiles(source.files)
      const catalog = buildCatalog(files)
      if (catalog.items.length === 0) {
        throw new Error("Catálogo vazio")
      }
      await writeLocalCatalog(files, source.version)
      emit({ catalog, status: "ready", version: source.version })
    } catch {
      emit({ status: "error" })
    }
    return
  }

  // 3) Já tem cópia local: lê a versão do config.json e só baixa se mudou.
  if (!checkUpdates) return

  const previousVersion = snapshot.version
  const source = await fetchDataSource()
  const version = source.version
  if (version === null || version === previousVersion) return

  try {
    const files = await fetchAllFiles(source.files)
    const catalog = buildCatalog(files)
    if (catalog.items.length === 0) return

    emit({ catalog, status: "ready", version })
    await writeLocalCatalog(files, version)
    // Sem versão anterior não dá para afirmar que houve mudança real
    // (a primeira sincronização é silenciosa).
    if (previousVersion !== null) {
      toast.success("Conteúdo atualizado", {
        description: "Novas obras do repositório já estão no app.",
      })
    }
  } catch {
    // Falha ao baixar a atualização: mantém a cópia local e tenta na
    // próxima entrada.
  }
}

function loadCurated({ checkUpdates = false } = {}): Promise<void> {
  if (!loadPromise) {
    loadPromise = runLoad(checkUpdates).finally(() => {
      loadPromise = null
    })
  }
  return loadPromise
}

/**
 * Força a releitura dos arquivos do repositório (usada no "puxar para
 * atualizar"). Em caso de falha, mantém o catálogo atual.
 */
export async function refreshCurated(): Promise<CuratedCatalog | null> {
  try {
    const source = await fetchDataSource()
    const files = await fetchAllFiles(source.files)
    const catalog = buildCatalog(files)
    if (catalog.items.length === 0) return snapshot.catalog

    const nextVersion = source.version ?? snapshot.version
    emit({ catalog, status: "ready", version: nextVersion })
    await writeLocalCatalog(files, nextVersion)
    return catalog
  } catch {
    return snapshot.catalog
  }
}

// Arrays vazios estáveis: evitam recriar o estado quando não há catálogo.
const EMPTY_ITEMS: CuratedItem[] = []
const EMPTY_ROWS: CuratedRow[] = []

/**
 * Catálogo curado do app, lido do IndexedDB e sincronizado com o
 * repositório público. Com `checkUpdates`, a tela inicial verifica na
 * entrada se o repositório mudou (uma requisição) e atualiza a cópia
 * local + mostra um toast quando há novidade.
 */
export function useCuratedCatalog({
  checkUpdates = false,
}: { checkUpdates?: boolean } = {}) {
  const state = useSyncExternalStore(
    subscribeCurated,
    getCuratedSnapshot,
    getCuratedSnapshot
  )

  useEffect(() => {
    void loadCurated({ checkUpdates })
  }, [checkUpdates])

  const retry = useCallback(() => loadCurated({ checkUpdates: true }), [])

  return {
    catalog: state.catalog,
    items: state.catalog?.items ?? EMPTY_ITEMS,
    rows: state.catalog?.rows ?? EMPTY_ROWS,
    isPending: state.status === "idle" || state.status === "loading",
    isError: state.status === "error",
    retry,
    refresh: refreshCurated,
  }
}

/** Busca uma obra curada pelo identificador do Internet Archive. */
export function findCuratedItem(
  items: readonly CuratedItem[],
  identifier: string
): CuratedItem | undefined {
  return items.find((item) => item.id === identifier)
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
export function itemsForRow(
  row: CuratedRow,
  items: readonly CuratedItem[]
): CuratedItem[] {
  const tagSet = new Set(row.tags ?? [])
  const typeSet = new Set(row.types ?? [])
  return items.filter((item) => {
    const byTag = item.tags?.some((tag) => tagSet.has(tag)) ?? false
    const byType = typeSet.size > 0 && typeSet.has(item.type)
    return byTag || byType
  })
}
