import { LayoutGrid, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CatalogView } from "@/lib/catalog-view"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "grid", label: "Visualizar em grade", icon: LayoutGrid },
  { value: "list", label: "Visualizar em lista", icon: List },
] as const

/** Alterna entre grade e lista; cada botão é um toggle (aria-pressed). */
export function ViewToggle({
  value,
  onChange,
}: {
  value: CatalogView
  onChange: (value: CatalogView) => void
}) {
  return (
    <div
      role="group"
      aria-label="Modo de visualização"
      className="flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5 ring-1 ring-foreground/5"
    >
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const active = value === option
        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full hover:bg-background/70",
              active &&
                "bg-background text-foreground shadow-sm hover:bg-background"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </Button>
        )
      })}
    </div>
  )
}
