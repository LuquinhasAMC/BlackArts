import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { sanitizeHtml } from "@/lib/html"
import { firstString } from "@/lib/archive-api"
import { buildDetailsUrl } from "@/lib/archive-api"
import { mediaTypeLabel } from "@/lib/media"
import type { ArchiveFile } from "@/types/archive"

interface MetadataTableProps {
  identifier: string
  metadata?: Record<string, unknown>
  files?: ArchiveFile[]
  /** Tags temáticas da curadoria (mostradas como chips). */
  tags?: string[]
}

/** Campos exibidos primeiro, em ordem. */
const PREFERRED_ORDER = [
  "title",
  "creator",
  "date",
  "year",
  "mediatype",
  "collection",
  "subject",
  "language",
  "description",
  "publisher",
]

/** Converte um valor de metadado em texto legível (apenas quando seguro). */
function formatMetadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    const parts = value
      .filter((entry) => typeof entry === "string" || typeof entry === "number")
      .map(String)
    if (parts.length === value.length && parts.length > 0) {
      return parts.join(", ")
    }
    return ""
  }
  return ""
}

interface Row {
  label: string
  value: ReactNode
}

/** Tabela organizada de metadados de um item. */
export function MetadataTable({
  identifier,
  metadata,
  files,
  tags,
}: MetadataTableProps) {
  const entries = Object.entries(metadata ?? {})
  const byKey = new Map(entries)

  const sortedKeys = [
    ...PREFERRED_ORDER.filter((key) => byKey.has(key)),
    ...entries
      .map(([key]) => key)
      .filter((key) => !PREFERRED_ORDER.includes(key))
      .sort(),
  ]

  const rows: Row[] = []
  for (const key of sortedKeys) {
    const value = formatMetadataValue(byKey.get(key))
    if (!value) {
      continue
    }
    const label = key.charAt(0).toUpperCase() + key.slice(1)
    // A descrição da API vem em HTML: formata com a mesma sanitização
    // usada no player de vídeo, para não exibir as tags cruas.
    const rendered =
      key === "description" ? (
        <div
          className="[&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_b]:text-foreground [&_li]:my-0.5 [&_ol]:my-2 [&_p]:my-2 [&_strong]:text-foreground [&_ul]:my-2"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        />
      ) : (
        value
      )
    rows.push({ label, value: rendered })
  }

  // Rótulo legível do tipo de mídia.
  const rawMediatype = firstString(byKey.get("mediatype"))
  if (rawMediatype) {
    const row = rows.find((entry) => entry.label === "Mediatype")
    if (row) {
      row.label = "Tipo"
      row.value = mediaTypeLabel(rawMediatype)
    } else {
      rows.unshift({ label: "Tipo", value: mediaTypeLabel(rawMediatype) })
    }
  }

  if (Array.isArray(tags) && tags.length > 0) {
    rows.unshift({
      label: "Tags",
      value: (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    })
  }

  if (Array.isArray(files) && files.length > 0) {
    rows.push({ label: "Arquivos", value: `${files.length} arquivo(s)` })
  }

  rows.push({
    label: "Fonte",
    value: (
      <a
        href={buildDetailsUrl(identifier)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
      >
        Internet Archive
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    ),
  })

  // Sem limitador de altura: a página já rola e a tabela cresce com o
  // conteúdo (o antigo `max-h` cortava descrições longas).
  return (
    <div className="rounded-4xl border border-border bg-card">
      <dl className="divide-y divide-border/70">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(9rem,12rem)_1fr] sm:gap-4"
          >
            <dt className="min-w-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="min-w-0 text-sm [overflow-wrap:anywhere] break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
