import { useSyncExternalStore } from "react"

import { readStorage, writeStorage } from "@/lib/storage"

const STORAGE_KEY = "blackarts:search-history"

/** Quantidade máxima de buscas recentes guardadas. */
const MAX_TERMS = 8

const EMPTY: string[] = []

let cached: string[] | null = null
const listeners = new Set<() => void>()

function read(): string[] {
  if (cached) {
    return cached
  }
  const stored = readStorage<unknown>(STORAGE_KEY, [])
  cached = Array.isArray(stored)
    ? stored
        .filter((term): term is string => typeof term === "string")
        .slice(0, MAX_TERMS)
    : []
  return cached
}

function commit(next: string[]): void {
  cached = next
  writeStorage(STORAGE_KEY, next)
  for (const listener of listeners) {
    listener()
  }
}

/** Guarda um termo no topo do histórico, sem duplicar. */
export function addSearchTerm(term: string): void {
  const value = term.trim()
  if (!value) {
    return
  }
  const current = read()
  const next = [
    value,
    ...current.filter((item) => item.toLowerCase() !== value.toLowerCase()),
  ].slice(0, MAX_TERMS)
  if (
    next.length === current.length &&
    next.every((item, index) => item === current[index])
  ) {
    return
  }
  commit(next)
}

/** Remove um termo do histórico. */
export function removeSearchTerm(term: string): void {
  commit(read().filter((item) => item !== term))
}

/** Apaga todo o histórico de buscas deste dispositivo. */
export function clearSearchHistory(): void {
  commit([])
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Buscas recentes reativas, compartilhadas entre as duas colunas. */
export function useSearchHistory(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
