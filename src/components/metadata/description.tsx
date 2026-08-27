import { useState } from "react"

import { sanitizeHtml } from "@/lib/html"
import { cn } from "@/lib/utils"

interface DescriptionProps {
  description?: string
  className?: string
}

const COLLAPSE_THRESHOLD = 280

/** Descrição com truncamento expansível para textos longos. */
export function Description({ description, className }: DescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  if (!description) {
    return null
  }

  const isLong = description.length > COLLAPSE_THRESHOLD
  // Sanitiza uma única vez por render: o texto puro vira <br>, e o HTML
  // do Internet Archive é limpo e formatado.
  const html = sanitizeHtml(description)

  return (
    <div className={className}>
      <div
        className={cn(
          "text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_b]:text-foreground [&_br]:content-none [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base [&_li]:my-0.5 [&_ol]:my-2 [&_p]:my-2 [&_strong]:text-foreground [&_ul]:my-2",
          !expanded && isLong && "line-clamp-4"
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  )
}
