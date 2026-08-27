/**
 * Helpers seguros de localStorage: nunca lançam exceção e validam os
 * dados salvos para não quebrar a UI se o storage estiver corrompido
 * ou indisponível (modo privado, quota, etc.).
 */

function isStorageAvailable(): boolean {
  try {
    const testKey = "__blackarts_test__"
    window.localStorage.setItem(testKey, "1")
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/** Lê e faz parse seguro de um valor JSON do localStorage. */
export function readStorage<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Escreve um valor JSON no localStorage de forma segura. */
export function writeStorage<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) {
    return false
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Remove uma chave do localStorage de forma segura. */
export function removeStorage(key: string): void {
  if (!isStorageAvailable()) {
    return
  }
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignora falhas de storage
  }
}
