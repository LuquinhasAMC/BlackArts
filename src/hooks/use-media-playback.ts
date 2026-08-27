import { useCallback, useState } from "react"

/**
 * Estado de reprodução de mídia: detecta falha de carregamento,
 * permite "tentar novamente" (remonta o elemento via `attempt`) e
 * reinicia quando a fonte muda (ex.: troca de faixa).
 */
export function useMediaPlayback(source: string | undefined) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Troca de fonte (nova faixa/arquivo) reseta o estado de erro,
  // ajustando o estado durante a renderização (padrão recomendado).
  const [prevSource, setPrevSource] = useState(source)
  if (prevSource !== source) {
    setPrevSource(source)
    setFailed(false)
    setLoaded(false)
  }

  const retry = useCallback(() => {
    setFailed(false)
    setLoaded(false)
    setAttempt((current) => current + 1)
  }, [])

  const markFailed = useCallback(() => setFailed(true), [])
  const markLoaded = useCallback(() => setLoaded(true), [])

  return {
    attempt,
    failed,
    loaded,
    markFailed,
    markLoaded,
    retry,
  }
}
