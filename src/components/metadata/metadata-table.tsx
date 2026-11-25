import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { Description } from "@/components/metadata/description"
import { Badge } from "@/components/ui/badge"
import { buildDetailsUrl } from "@/lib/archive-api"
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

/** Rótulo de seção, discreto como no restante do app. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground">{children}</h2>
  )
}

/** Metadados de um item: descrição em card próprio e detalhes em lista. */
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

  // A descrição sai da lista: fica em um card com texto expandível.
  const description = formatMetadataValue(byKey.get("description"))

  const rows: Row[] = []
  for (const key of sortedKeys) {
    // Descrição fica em card próprio e o tipo já aparece no título.
    if (key === "description" || key === "mediatype") {
      continue
    }
    const value = formatMetadataValue(byKey.get(key))
    if (!value) {
      continue
    }
    rows.push({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
    })
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
    rows.push({
      label: "Arquivos",
      value: `${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}`,
    })
  }

  rows.push({
    label: "Fonte",
    value: (
      <a
        href={buildDetailsUrl(identifier)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
      >
        Internet Archive
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    ),
  })

  return (
    <div className="flex flex-col gap-4">
      {description && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Descrição</SectionLabel>
          <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <Description description={description} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <SectionLabel>Detalhes</SectionLabel>
        <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
          <dl className="divide-y divide-border/60">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-0.5 px-4 py-3.5 sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:items-baseline sm:gap-4"
              >
                <dt className="min-w-0 text-xs font-semibold text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="min-w-0 text-sm leading-relaxed font-medium [overflow-wrap:anywhere] break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
