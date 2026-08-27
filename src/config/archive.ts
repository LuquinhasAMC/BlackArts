/**
 * Configuração central da curadoria do BlackArts.
 *
 * Centraliza termos de busca relacionados à negritude, tipos de mídia
 * suportados, coleções sugeridas, tamanho de página, campos retornados
 * pela busca e regras de cache/timeout.
 */

export const ARCHIVE = {
  /** URL base do Internet Archive. */
  baseUrl: "https://archive.org",

  /** Endpoint de busca. */
  searchEndpoint: "https://archive.org/advancedsearch.php",

  /** Campos retornados pela busca. */
  fields: [
    "identifier",
    "title",
    "description",
    "mediatype",
    "year",
    "creator",
    "downloads",
    "item_size",
  ],

  /** Ordenação padrão dos resultados. */
  defaultSort: "downloads desc",

  /** Tamanho de página do catálogo. */
  pageSize: 24,

  /** Tempo de cache do TanStack Query (5 minutos). */
  staleTimeMs: 5 * 60 * 1000,

  /** Timeout das requisições à API. */
  requestTimeoutMs: 15_000,

  /** Retry das requisições. */
  retry: 1,
} as const

/**
 * Termos padrão de busca relacionados à negritude, diáspora africana e
 * cultura afro-brasileira. Usados apenas quando a pessoa usuária não
 * digita nada — a busca livre sempre tem prioridade.
 */
export const DEFAULT_SEARCH_TERMS = [
  "black history",
  "african american",
  "afro",
  "negritude",
  "black culture",
  "african diaspora",
  "black art",
  "black music",
  "black photography",
  "civil rights",
  "slavery history",
  "black literature",
  "afro-brazilian",
] as const

/**
 * Query padrão (OR entre os termos de curadoria), restrita a tipos de
 * mídia exibíveis no catálogo para evitar coleções na home.
 */
export const DEFAULT_QUERY = `(${DEFAULT_SEARCH_TERMS.map((term) => `"${term}"`).join(" OR ")}) AND mediatype:(audio OR movies OR image OR texts)`

/** Tipos de mídia suportados no filtro do catálogo. */
export const MEDIA_TYPE_FILTERS = [
  { value: "all", label: "Todos", mediatype: undefined },
  { value: "audio", label: "Áudio", mediatype: "audio" },
  { value: "video", label: "Vídeo", mediatype: "movies" },
  { value: "image", label: "Imagem", mediatype: "image" },
  { value: "text", label: "Texto", mediatype: "texts" },
] as const

export type MediaTypeFilterValue = (typeof MEDIA_TYPE_FILTERS)[number]["value"]

/** Categorias/coleções sugeridas (termos adicionais à busca). */
export const CATEGORY_FILTERS = [
  { value: "all", label: "Todas as categorias", terms: undefined },
  {
    value: "music",
    label: "Música",
    terms: '(music OR jazz OR blues OR soul OR gospel OR "african music")',
  },
  {
    value: "civil-rights",
    label: "Direitos civis",
    terms:
      '("civil rights" OR "black power" OR freedom OR activism OR movement)',
  },
  {
    value: "photography",
    label: "Fotografia",
    terms: "(photography OR photographs OR portraits OR visual art)",
  },
  {
    value: "literature",
    label: "Literatura",
    terms: '(literature OR poetry OR "black authors" OR fiction OR essays)',
  },
  {
    value: "history",
    label: "História",
    terms: "(history OR archive OR documents OR records)",
  },
] as const

export type CategoryFilterValue = (typeof CATEGORY_FILTERS)[number]["value"]

/** Chaves de armazenamento local. */
export const STORAGE_KEYS = {
  favorites: "blackarts:favorites:v1",
  hasSeenWelcome: "blackarts:has-seen-welcome",
} as const
