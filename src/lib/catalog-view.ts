import { useSyncExternalStore } from "react"

import { readStorage, writeStorage } from "@/lib/storage"

/** Modo de exibição das listas do catálogo. */
export type CatalogView = "grid" | "list"

/**
 * Cria um store reativo e persistido para o modo de exibição de uma tela.
 * Cada tela tem o seu (favoritos, pesquisa) para a preferência não vazar
 * de uma para a outra.
 */
function createViewStore(storageKey: string) {
  let cached: CatalogView | null = null
  const listeners = new Set<() => void>()

  function get(): CatalogView {
    if (cached) {
      return cached
    }
    cached =
      readStorage<string>(storageKey, "grid") === "list" ? "list" : "grid"
    return cached
  }

  function set(view: CatalogView): void {
    if (get() === view) {
      return
    }
    cached = view
    writeStorage(storageKey, view)
    for (const listener of listeners) {
      listener()
    }
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function use(): CatalogView {
    return useSyncExternalStore(subscribe, get, () => "grid" as const)
  }

  return { get, set, use }
}

const favoritesStore = createViewStore("blackarts:favorites-view")
const searchStore = createViewStore("blackarts:search-view")

/** Modo de exibição dos favoritos (padrão: grade). */
export function useFavoritesView(): CatalogView {
  return favoritesStore.use()
}

/** Troca o modo de exibição dos favoritos. */
export function setFavoritesView(view: CatalogView): void {
  favoritesStore.set(view)
}

/** Modo de exibição dos resultados da pesquisa (padrão: grade). */
export function useSearchView(): CatalogView {
  return searchStore.use()
}

/** Troca o modo de exibição dos resultados da pesquisa. */
export function setSearchView(view: CatalogView): void {
  searchStore.set(view)
}
