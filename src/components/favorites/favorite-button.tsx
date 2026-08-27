import { Heart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useFavorites } from "@/hooks/use-favorites"
import { formatList } from "@/lib/media"
import { cn } from "@/lib/utils"
import type { FavoriteItem } from "@/types/favorites"

export interface FavoriteTarget {
  identifier: string
  title: string
  mediatype?: string
  year?: string
  creator?: string | string[]
  thumbnail?: string
}

interface FavoriteButtonProps {
  item: FavoriteTarget
  variant?: "default" | "outline" | "ghost" | "overlay"
  withLabel?: boolean
  size?: "default" | "sm" | "icon" | "icon-sm"
  className?: string
}

/** Botão de favoritar/desfavoritar com feedback via toast. */
export function FavoriteButton({
  item,
  variant = "default",
  withLabel = false,
  size = "default",
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(item.identifier)

  const handleClick = () => {
    const added = toggleFavorite({
      identifier: item.identifier,
      title: item.title,
      mediatype: item.mediatype,
      year: item.year,
      creator: formatList(item.creator),
      thumbnail: item.thumbnail,
    })

    if (added) {
      toast("Adicionado aos favoritos", {
        description: item.title,
      })
    } else {
      toast("Removido dos favoritos", {
        description: item.title,
      })
    }
  }

  const variantClasses =
    variant === "overlay"
      ? "bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm hover:bg-background"
      : variant === "outline"
        ? ""
        : ""

  return (
    <Button
      type="button"
      variant={variant === "overlay" ? "ghost" : variant}
      size={size}
      onClick={handleClick}
      aria-pressed={favorite}
      aria-label={
        favorite
          ? `Remover ${item.title} dos favoritos`
          : `Adicionar ${item.title} aos favoritos`
      }
      className={cn(variantClasses, className)}
    >
      <Heart
        aria-hidden
        className={cn(
          favorite && "fill-current text-destructive dark:text-destructive"
        )}
      />
      {withLabel && <span>{favorite ? "Favoritado" : "Favoritar"}</span>}
    </Button>
  )
}

/** Converte um alvo de favorito em FavoriteItem (sem addedAt). */
export function toFavoriteItem(
  item: FavoriteTarget
): Omit<FavoriteItem, "addedAt"> {
  return {
    identifier: item.identifier,
    title: item.title,
    mediatype: item.mediatype,
    year: item.year,
    creator: formatList(item.creator),
    thumbnail: item.thumbnail,
  }
}
