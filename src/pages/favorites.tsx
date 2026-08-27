import { useState } from "react"
import { Link } from "react-router-dom"
import { HeartOff, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { CatalogEmpty } from "@/components/catalog/catalog-states"
import { CatalogGrid } from "@/components/catalog/catalog-grid"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFavorites } from "@/hooks/use-favorites"
import type { ArchiveSearchItem } from "@/types/archive"

/** Página de favoritos com remoção e estado vazio amigável. */
export default function FavoritesPage() {
  const { favorites, removeFavorite, clearFavorites } = useFavorites()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Favoritos
          </h1>
          <p className="text-sm text-muted-foreground">
            Seus itens salvos para visitar depois.
          </p>
        </div>
        <CatalogEmpty
          title="Você ainda não tem favoritos"
          description="Toque no coração de um item do catálogo para salvá-lo aqui. Eles ficam guardados neste dispositivo."
        >
          <Button asChild>
            <Link to="/">Explorar catálogo</Link>
          </Button>
        </CatalogEmpty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Favoritos
          </h1>
          <p className="text-sm text-muted-foreground">
            {favorites.length}{" "}
            {favorites.length === 1 ? "item salvo" : "itens salvos"} neste
            dispositivo.
          </p>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 aria-hidden />
              Limpar todos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Limpar favoritos?</DialogTitle>
              <DialogDescription>
                Esta ação remove todos os itens salvos deste dispositivo e não
                pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <Button
                variant="destructive"
                onClick={() => {
                  clearFavorites()
                  setConfirmOpen(false)
                  toast("Favoritos removidos")
                }}
              >
                <Trash2 aria-hidden />
                Limpar favoritos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <CatalogGrid
        items={favorites.map(toSearchItem)}
        cardAction={(item) => (
          <RemoveFavoriteButton
            identifier={item.identifier}
            title={item.title}
            onRemove={removeFavorite}
          />
        )}
      />
    </div>
  )
}

function RemoveFavoriteButton({
  identifier,
  title,
  onRemove,
}: {
  identifier: string
  title: string
  onRemove: (identifier: string) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm hover:bg-background"
          aria-label={`Remover ${title} dos favoritos`}
          onClick={() => {
            onRemove(identifier)
            toast("Removido dos favoritos", { description: title })
          }}
        >
          <HeartOff className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Remover dos favoritos</TooltipContent>
    </Tooltip>
  )
}

function toSearchItem(item: {
  identifier: string
  title: string
  mediatype?: string
  year?: string
  creator?: string
  thumbnail?: string
}): ArchiveSearchItem {
  return {
    identifier: item.identifier,
    title: item.title,
    mediatype: item.mediatype,
    year: item.year,
    creator: item.creator,
    thumbnail: item.thumbnail,
  }
}
