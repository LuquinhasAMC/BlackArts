import { ViewToggle } from "@/components/catalog/view-toggle"
import { setFavoritesView, useFavoritesView } from "@/lib/catalog-view"

/** Alterna entre grade e lista na top bar dos favoritos. */
export function FavoritesViewToggle() {
  const view = useFavoritesView()

  return <ViewToggle value={view} onChange={setFavoritesView} />
}
