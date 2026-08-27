import { useEffect, useState } from "react"

/** Retorna o valor atualizado apenas após `delay` ms sem mudanças. */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeoutId)
  }, [value, delay])

  return debounced
}
