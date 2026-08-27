import * as React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { STORAGE_KEYS } from "@/config/archive"
import { readStorage, writeStorage } from "@/lib/storage"
import type { FavoriteItem } from "@/types/favorites"

const FAVORITES_STORAGE_KEY = STORAGE_KEYS.favorites

/** Limite de favoritos para não estourar o localStorage. */
const MAX_FAVORITES = 500

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.identifier === "string" &&
    candidate.identifier.length > 0 &&
    typeof candidate.title === "string"
  )
}

/** Lê e valida os favoritos salvos, descartando entradas inválidas. */
function loadFavorites(): FavoriteItem[] {
  const stored = readStorage<unknown>(FAVORITES_STORAGE_KEY, [])
  if (!Array.isArray(stored)) {
    return []
  }
  const seen = new Set<string>()
  const favorites: FavoriteItem[] = []
  for (const entry of stored) {
    if (!isFavoriteItem(entry)) {
      continue
    }
    if (seen.has(entry.identifier)) {
      continue
    }
    seen.add(entry.identifier)
    favorites.push(entry)
    if (favorites.length >= MAX_FAVORITES) {
      break
    }
  }
  return favorites
}

interface FavoritesContextValue {
  favorites: FavoriteItem[]
  isFavorite: (identifier: string) => boolean
  addFavorite: (item: Omit<FavoriteItem, "addedAt">) => void
  removeFavorite: (identifier: string) => void
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => boolean
  clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined
)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(loadFavorites)

  // Persiste a cada mudança.
  useEffect(() => {
    writeStorage(FAVORITES_STORAGE_KEY, favorites)
  }, [favorites])

  const isFavorite = useCallback(
    (identifier: string) =>
      favorites.some((item) => item.identifier === identifier),
    [favorites]
  )

  const addFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((current) => {
      if (current.some((entry) => entry.identifier === item.identifier)) {
        return current
      }
      const next: FavoriteItem[] = [
        { ...item, addedAt: new Date().toISOString() },
        ...current,
      ]
      return next.slice(0, MAX_FAVORITES)
    })
  }, [])

  const removeFavorite = useCallback((identifier: string) => {
    setFavorites((current) =>
      current.filter((entry) => entry.identifier !== identifier)
    )
  }, [])

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItem, "addedAt">): boolean => {
      const alreadyFavorite = isFavorite(item.identifier)
      if (alreadyFavorite) {
        removeFavorite(item.identifier)
      } else {
        addFavorite(item)
      }
      return !alreadyFavorite
    },
    [addFavorite, isFavorite, removeFavorite]
  )

  const clearFavorites = useCallback(() => {
    setFavorites([])
  }, [])

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      clearFavorites,
    }),
    [
      favorites,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      clearFavorites,
    ]
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

/** Acessa o estado compartilhado de favoritos. */
export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error(
      "useFavorites deve ser usado dentro de um FavoritesProvider"
    )
  }
  return context
}
