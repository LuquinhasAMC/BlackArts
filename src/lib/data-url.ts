/**
 * Localizações dos arquivos de dados do catálogo.
 *
 * O app lê o `config.json` do repositório de dados; o campo `dataUrls` desse
 * arquivo decide de onde cada JSON vem. Quando o campo não existe (ou o
 * config.json não está acessível), os arquivos são procurados na raiz do
 * repositório, como antes.
 */

export const DATA_FILES = ["audio", "video", "image", "text", "rows"] as const

export type DataFile = (typeof DATA_FILES)[number]

/** Converte um link /blob/ do GitHub no /raw/ equivalente. */
export function toRawUrl(url: string): string {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^?#]+)(.*)$/i
  )
  if (!match) return url
  const [, owner, repo, rest, suffix] = match
  return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}${suffix}`
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

/**
 * Resolve o endereço de cada arquivo: `dataUrls` do config.json quando for
 * uma string válida; senão o arquivo na raiz do repositório.
 */
export function resolveDataUrls(
  baseUrl: string,
  dataUrls: unknown
): Record<DataFile, string> {
  const base = normalizeBaseUrl(baseUrl)
  const record =
    dataUrls && typeof dataUrls === "object"
      ? (dataUrls as Record<string, unknown>)
      : {}

  return Object.fromEntries(
    DATA_FILES.map((file) => {
      const value = record[file]
      const url =
        typeof value === "string" && value.trim()
          ? toRawUrl(value.trim())
          : `${base}/${file}.json`
      return [file, url]
    })
  ) as Record<DataFile, string>
}

/** Endereço do config.json no repositório. */
export function configUrlFor(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/config.json`
}
