const STORAGE_KEY = "blackarts:scroll-positions"

/** Posições de rolagem por rota (por sessão do app). */
function readPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

/** Posição lembrada de uma rota (0 quando nunca foi visitada). */
export function readScrollPosition(pathname: string): number {
  return readPositions()[pathname] ?? 0
}

/** Guarda a posição atual da rota (para voltar a ela depois). */
export function rememberScrollPosition(pathname: string, y: number) {
  try {
    const positions = readPositions()
    positions[pathname] = Math.max(0, Math.round(y))
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  } catch {
    // Sem sessionStorage: a rolagem apenas não é lembrada.
  }
}
